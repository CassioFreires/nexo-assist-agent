// O agent do Nexo Assist: instruções + o loop de conversa com a LLM (tool calling).
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { config } from "../config/env.js";
import { adicionarMensagem, listarMensagens, transferirParaAnalista } from "../services/conversa.service.js";
import { criarResultadoVazio, executarFerramenta, ferramentas, registrarPasso } from "./ferramentas.js";
import type { Conversa, Mensagem } from "../types.js";

const MODELO = config.llm.modelo;
const CONFIANCA_MINIMA = config.confiancaMinima; // abaixo disso o agent chama um analista
const MENSAGENS_NO_CONTEXTO = config.mensagensNoContexto;
const MAXIMO_DE_VOLTAS = config.maximoDeVoltasDoAgente;

const cliente = new OpenAI({
  apiKey: config.llm.apiKey,
  baseURL: config.llm.baseUrl,
});

// As regras do service desk (Anexo A) que a LLM precisa seguir
function montarInstrucoes(nomeDoFuncionario: string): string {
  return `Você é o Nexo Assist, agente de atendimento do service desk de TI da Nexo. Fale em português, de forma curta e clara.
Você está conversando com ${nomeDoFuncionario}. Agora é ${new Date().toLocaleString("pt-BR")}.

COMO AGIR
1. Dúvida: use buscarNaCentralDeAjuda. Se o artigo resolver, responda com ele e NÃO abra chamado.
2. Perguntas sobre chamados ("como está meu chamado?", "está atrasado?"): use consultarMeusChamados e responda com o status e se está vencido.
3. Abrir chamado: ANTES, use consultarMeusChamados para ver se já existe chamado aberto sobre o mesmo problema.
   - Se existir, NÃO duplique: use prepararRascunho com acao "atualizar".
   - Se existir um resolvido há até 7 dias sobre o mesmo problema, use acao "reabrir".
   - Senão, use acao "criar".
4. Se faltar informação para o chamado (o que aconteceu, quem é afetado, se há compromisso hoje), PERGUNTE antes de montar o rascunho, uma pergunta por vez, e use sugerirOpcoes quando houver respostas curtas possíveis.
5. Você nunca cria nem atualiza chamado sozinho. Depois de prepararRascunho, mostre um resumo e peça para o funcionário confirmar no botão "Confirmar".
6. Chame chamarAnalista quando: o funcionário pedir um analista, o caso for crítico (algo parado para uma equipe ou para a empresa), o chamado estiver vencido, ou você não tiver segurança sobre o que fazer. Depois de transferir, avise que um analista vai continuar e não faça mais nada.
7. Só assuntos de TI. RH, financeiro e facilities: diga que não é com você e indique procurar a área responsável.
8. Privacidade: você só tem acesso aos chamados de ${nomeDoFuncionario}. Nunca fale de chamados de outras pessoas.

TIPO: "INC" (incidente) quando algo parou ou não funciona. "REQ" (requisição) quando é pedido de acesso, equipamento ou software.
CATEGORIA: Acesso, Rede e VPN, Hardware, Software, E-mail ou Outros.
PRIORIDADE (impacto + urgência):
- Crítica: algo parado para uma equipe ou para a empresa (prazo 1 hora)
- Alta: impede uma pessoa de trabalhar, ou há compromisso no mesmo dia (4 horas úteis)
- Média: atrapalha, mas há alternativa (3 dias úteis)
- Baixa: pedidos e melhorias sem urgência (5 dias úteis)

TRANSPARÊNCIA: toda ferramenta pede "entendeu", "confianca" (0 a 1) e "porque". Preencha com honestidade.
Use confianca baixa (menor que 0.6) quando não tiver certeza do que o funcionário quer ou do que fazer.`;
}

// O servidor já salvou a mensagem do funcionário. Aqui geramos e salvamos a resposta do agent.
export async function responder(conversa: Conversa, nomeDoFuncionario: string): Promise<Mensagem> {
  const resultado = criarResultadoVazio();

  // Monta o que será enviado à LLM: instruções + últimas mensagens da conversa
  const mensagens: ChatCompletionMessageParam[] = [];
  mensagens.push({ role: "system", content: montarInstrucoes(nomeDoFuncionario) });

  const recentes = listarMensagens(conversa.id).slice(-MENSAGENS_NO_CONTEXTO);
  for (const mensagem of recentes) {
    if (mensagem.autor === "usuario") {
      mensagens.push({ role: "user", content: mensagem.texto });
    } else {
      mensagens.push({ role: "assistant", content: mensagem.texto });
    }
  }

  let texto = "";
  let deuErro = false;
  try {
    // Loop: a LLM pede ferramenta -> executamos -> devolvemos -> ela continua, até dar o texto final
    for (let volta = 1; volta <= MAXIMO_DE_VOLTAS; volta++) {
      const resposta = await cliente.chat.completions.create({
        model: MODELO,
        messages: mensagens,
        tools: ferramentas,
      });
      const mensagemDaLLM = resposta.choices[0]?.message;
      if (!mensagemDaLLM) {
        break;
      }

      // Sem pedido de ferramenta: esta é a resposta final
      if (!mensagemDaLLM.tool_calls || mensagemDaLLM.tool_calls.length === 0) {
        texto = mensagemDaLLM.content ?? "";
        break;
      }

      mensagens.push(mensagemDaLLM);
      for (const pedido of mensagemDaLLM.tool_calls) {
        if (pedido.type !== "function") {
          continue;
        }
        const retorno = await executarFerramenta(pedido.function.name, pedido.function.arguments, conversa, resultado);
        mensagens.push({ role: "tool", tool_call_id: pedido.id, content: JSON.stringify(retorno) });
      }
    }
  } catch (erro) {
    console.error("Erro ao chamar a LLM:", erro);
    // Erro técnico não é "falta de segurança": registramos o passo sem mexer na regra de confiança
    resultado.passos.push({ acao: "Falhou ao gerar a resposta", entendeu: "Erro ao chamar a LLM", confianca: 0, porque: String(erro) });
    deuErro = true;
    texto = "Tive um problema para responder agora. Quer tentar de novo ou falar com um analista?";
    resultado.opcoes = ["Tentar de novo", "Falar com um analista"];
  }

  // Regra: se o agent ficou com pouca segurança em algum passo, um analista assume
  const temPassos = resultado.passos.length > 0;
  if (!deuErro && !resultado.transferiu && temPassos && resultado.menorConfianca < CONFIANCA_MINIMA) {
    const ultimoPasso = resultado.passos[resultado.passos.length - 1]!;
    transferirParaAnalista(conversa, "sem segurança", ultimoPasso.entendeu, resultado.menorConfianca);
    registrarPasso(
      resultado,
      "Transferiu para um analista (sem segurança)",
      ultimoPasso.entendeu,
      resultado.menorConfianca,
      "A confiança ficou abaixo de " + CONFIANCA_MINIMA + ".",
    );
    texto = texto + "\n\nNão tenho segurança para resolver isso sozinho, então vou chamar um analista para continuar.";
    resultado.opcoes = [];
  }

  if (texto.trim() === "") {
    texto = "Pode me contar um pouco mais sobre o que você precisa?";
  }

  return adicionarMensagem(conversa, "agente", texto, resultado.chamadosIds, resultado.opcoes, resultado.passos);
}

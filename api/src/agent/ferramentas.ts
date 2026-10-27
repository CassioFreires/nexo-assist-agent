// As ferramentas do agent: a "bula" que a LLM lê + o código que executa cada uma.
// Toda ferramenta recebe o funcionário logado pela CONVERSA (nunca por argumento da LLM),
// então a LLM nunca consegue ver chamado de outra pessoa.
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { buscarChamado, listarChamados, transferirChamado } from "../services/chamado.service.js";
import { transferirParaAnalista } from "../services/conversa.service.js";
import { buscarArtigos } from "../services/kb.service.js";
import { calcularPrazo, estaVencido, podeReabrir, textoDoPrazo } from "../services/prazos.service.js";
import type { Categoria, Conversa, Passo, Prioridade, Tipo } from "../types.js";

// O que as ferramentas vão preenchendo durante UMA resposta do agent
export interface Resultado {
  passos: Passo[]; // ações mostradas acima da resposta (transparência)
  chamadosIds: string[]; // chamados que viram cards na mensagem
  opcoes: string[]; // botões de resposta rápida
  transferiu: boolean; // true se a conversa foi para um analista
  menorConfianca: number; // a menor confiança entre os passos (0 a 1)
}

export function criarResultadoVazio(): Resultado {
  return { passos: [], chamadosIds: [], opcoes: [], transferiu: false, menorConfianca: 1 };
}

export function registrarPasso(resultado: Resultado, acao: string, entendeu: string, confianca: number, porque: string) {
  resultado.passos.push({ acao: acao, entendeu: entendeu, confianca: confianca, porque: porque });
  if (confianca < resultado.menorConfianca) {
    resultado.menorConfianca = confianca;
  }
}

// ---------- A bula: o que a LLM enxerga ----------
// As 3 últimas propriedades (entendeu, confianca, porque) se repetem de propósito:
// é assim que cada resposta mostra o que o agent entendeu e por quê.

export const ferramentas: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "buscarNaCentralDeAjuda",
      description: "Procura artigos da central de ajuda de TI que respondem a dúvida do funcionário.",
      parameters: {
        type: "object",
        properties: {
          pergunta: { type: "string", description: "Palavras-chave da dúvida" },
          entendeu: { type: "string", description: "O que você entendeu que o funcionário quer" },
          confianca: { type: "number", description: "Sua segurança, de 0 a 1" },
          porque: { type: "string", description: "Por que escolheu esta ação" },
        },
        required: ["pergunta", "entendeu", "confianca", "porque"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultarMeusChamados",
      description: "Lista os chamados do funcionário (status, prioridade, prazo e se está vencido).",
      parameters: {
        type: "object",
        properties: {
          somenteAbertos: { type: "boolean", description: "true para listar só os não resolvidos" },
          entendeu: { type: "string", description: "O que você entendeu que o funcionário quer" },
          confianca: { type: "number", description: "Sua segurança, de 0 a 1" },
          porque: { type: "string", description: "Por que escolheu esta ação" },
        },
        required: ["somenteAbertos", "entendeu", "confianca", "porque"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepararRascunho",
      description:
        "Monta o rascunho de um chamado (criar, atualizar ou reabrir) para o funcionário confirmar. NÃO cria nada ainda.",
      parameters: {
        type: "object",
        properties: {
          acao: { type: "string", enum: ["criar", "atualizar", "reabrir"] },
          chamadoId: { type: "string", description: "ID do chamado existente (ex: INC-20311). Vazio se acao for criar" },
          tipo: { type: "string", enum: ["INC", "REQ"] },
          titulo: { type: "string", description: "Título curto do chamado" },
          descricao: {
            type: "string",
            description: "Descrição completa, para o analista não precisar perguntar de novo. Se atualizar, só a informação nova",
          },
          categoria: { type: "string", enum: ["Acesso", "Rede e VPN", "Hardware", "Software", "E-mail", "Outros"] },
          prioridade: { type: "string", enum: ["Crítica", "Alta", "Média", "Baixa"] },
          afetado: { type: "string", description: "Quem é afetado (nome da pessoa ou equipe)" },
          entendeu: { type: "string", description: "O que você entendeu que o funcionário quer" },
          confianca: { type: "number", description: "Sua segurança, de 0 a 1" },
          porque: { type: "string", description: "Por que escolheu o tipo, a categoria e a prioridade" },
        },
        required: [
          "acao", "chamadoId", "tipo", "titulo", "descricao", "categoria",
          "prioridade", "afetado", "entendeu", "confianca", "porque",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "chamarAnalista",
      description: "Transfere a conversa para um analista humano. Depois disso você para de responder.",
      parameters: {
        type: "object",
        properties: {
          motivo: { type: "string", enum: ["pedido do funcionário", "caso crítico", "chamado vencido", "sem segurança"] },
          resumo: { type: "string", description: "Resumo do caso, para o analista não precisar perguntar tudo de novo" },
          chamadoId: { type: "string", description: "ID do chamado relacionado. Vazio se não houver" },
          entendeu: { type: "string", description: "O que você entendeu que o funcionário quer" },
          confianca: { type: "number", description: "Sua segurança, de 0 a 1" },
          porque: { type: "string", description: "Por que escolheu esta ação" },
        },
        required: ["motivo", "resumo", "chamadoId", "entendeu", "confianca", "porque"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sugerirOpcoes",
      description: "Mostra botões de resposta rápida (use ao fazer uma pergunta com respostas curtas).",
      parameters: {
        type: "object",
        properties: {
          opcoes: { type: "array", items: { type: "string" }, description: "De 2 a 4 opções curtas" },
        },
        required: ["opcoes"],
      },
    },
  },
];

// ---------- Argumentos que a LLM manda para cada ferramenta ----------

interface ArgumentosBuscarAjuda {
  pergunta: string;
  entendeu: string;
  confianca: number;
  porque: string;
}

interface ArgumentosConsultar {
  somenteAbertos: boolean;
  entendeu: string;
  confianca: number;
  porque: string;
}

interface ArgumentosRascunho {
  acao: "criar" | "atualizar" | "reabrir";
  chamadoId: string;
  tipo: Tipo;
  titulo: string;
  descricao: string;
  categoria: Categoria;
  prioridade: Prioridade;
  afetado: string;
  entendeu: string;
  confianca: number;
  porque: string;
}

interface ArgumentosAnalista {
  motivo: string;
  resumo: string;
  chamadoId: string;
  entendeu: string;
  confianca: number;
  porque: string;
}

interface ArgumentosOpcoes {
  opcoes: string[];
}

// ---------- O código que executa cada ferramenta ----------

function executarBuscarAjuda(args: ArgumentosBuscarAjuda, resultado: Resultado) {
  registrarPasso(resultado, "Consultou a central de ajuda", args.entendeu, args.confianca, args.porque);

  const achados = buscarArtigos(args.pergunta);
  if (achados.length === 0) {
    return { mensagem: "Nenhum artigo encontrado." };
  }
  const artigos = [];
  for (const achado of achados) {
    artigos.push({ id: achado.artigo.id, titulo: achado.artigo.titulo, texto: achado.artigo.texto });
  }
  return { artigos: artigos };
}

async function executarConsultar(args: ArgumentosConsultar, conversa: Conversa, resultado: Resultado) {
  try {
    const chamados = await listarChamados(conversa.funcionarioEmail);
    const lista = [];
    for (const chamado of chamados) {
      if (args.somenteAbertos && chamado.status === "Resolvido") {
        continue; // pula os resolvidos
      }
      let prazoAte = "";
      if (chamado.status !== "Resolvido") {
        prazoAte = calcularPrazo(chamado).toISOString();
      }
      lista.push({
        id: chamado.id,
        titulo: chamado.titulo,
        descricao: chamado.descricao,
        categoria: chamado.categoria,
        prioridade: chamado.prioridade,
        status: chamado.status,
        atualizadoEm: chamado.atualizadoEm,
        prazoAte: prazoAte,
        vencido: estaVencido(chamado),
        podeReabrir: podeReabrir(chamado),
      });
      resultado.chamadosIds.push(chamado.id);
    }
    registrarPasso(resultado, "Consultou seus chamados", args.entendeu, args.confianca, args.porque);
    return { chamados: lista };
  } catch (erro) {
    // o sistema legado pode estar fora do ar
    // sistema fora do ar não é falta de segurança do agent, então não entra na regra de confiança
    resultado.passos.push({ acao: "Falhou ao consultar chamados", entendeu: args.entendeu, confianca: 0, porque: String(erro) });
    return { erro: "O sistema de chamados está indisponível agora. Peça para tentar de novo em instantes." };
  }
}

async function executarRascunho(args: ArgumentosRascunho, conversa: Conversa, resultado: Resultado) {
  // Atualizar e reabrir só valem para chamados que existem E são deste funcionário
  if (args.acao !== "criar") {
    const chamado = await buscarChamado(conversa.funcionarioEmail, args.chamadoId);
    if (!chamado) {
      return { erro: "Chamado não encontrado entre os chamados deste funcionário." };
    }
    if (args.acao === "reabrir" && !podeReabrir(chamado)) {
      return { erro: "Este chamado não pode ser reaberto (não está resolvido ou passou de 7 dias)." };
    }
    if (args.acao === "atualizar" && chamado.status === "Resolvido") {
      return { erro: "Este chamado já está resolvido. Use a acao reabrir." };
    }
  }

  // Só guardamos o rascunho. Quem cria o chamado é o botão "Confirmar", não a LLM.
  conversa.rascunho = {
    acao: args.acao,
    chamadoId: args.chamadoId,
    tipo: args.tipo,
    titulo: args.titulo,
    descricao: args.descricao,
    categoria: args.categoria,
    prioridade: args.prioridade,
    afetado: args.afetado,
  };

  registrarPasso(resultado, "Montou o rascunho do chamado", args.entendeu, args.confianca, args.porque);
  registrarPasso(
    resultado,
    "Classificou a prioridade: " + args.prioridade,
    args.titulo,
    args.confianca,
    "Prazo de " + textoDoPrazo(args.prioridade) + ". " + args.porque,
  );
  return {
    mensagem: "Rascunho salvo. Mostre um resumo e peça para o funcionário confirmar no botão Confirmar.",
    prazo: textoDoPrazo(args.prioridade),
  };
}

async function executarAnalista(args: ArgumentosAnalista, conversa: Conversa, resultado: Resultado) {
  if (args.chamadoId !== "") {
    try {
      await transferirChamado(conversa.funcionarioEmail, args.chamadoId, args.resumo);
    } catch (erro) {
      // se não deu para marcar o chamado, a conversa ainda é transferida
    }
  }
  transferirParaAnalista(conversa, args.motivo, args.resumo, args.confianca);
  resultado.transferiu = true;
  registrarPasso(resultado, "Transferiu para um analista (" + args.motivo + ")", args.entendeu, args.confianca, args.porque);
  return { mensagem: "Conversa transferida. Avise o funcionário que um analista vai continuar o atendimento." };
}

function executarOpcoes(args: ArgumentosOpcoes, resultado: Resultado) {
  resultado.opcoes = args.opcoes;
  return { mensagem: "Opções mostradas." };
}

// Recebe o nome da ferramenta que a LLM pediu e chama a função certa
export async function executarFerramenta(nome: string, argumentosEmTexto: string, conversa: Conversa, resultado: Resultado) {
  const argumentos = JSON.parse(argumentosEmTexto); // chega como texto JSON

  if (nome === "buscarNaCentralDeAjuda") return executarBuscarAjuda(argumentos, resultado);
  if (nome === "consultarMeusChamados") return executarConsultar(argumentos, conversa, resultado);
  if (nome === "prepararRascunho") return executarRascunho(argumentos, conversa, resultado);
  if (nome === "chamarAnalista") return executarAnalista(argumentos, conversa, resultado);
  if (nome === "sugerirOpcoes") return executarOpcoes(argumentos, resultado);

  return { erro: "Ferramenta desconhecida: " + nome };
}

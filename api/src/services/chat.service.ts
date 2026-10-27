// Service do chat do funcionário: enviar mensagem, confirmar ou cancelar o rascunho.
import { responder } from "../agent/agente.js";
import { config } from "../config/env.js";
import { ErroDeNegocio } from "../config/erros.js";
import type { Chamado, ChamadoParaTela, Conversa, Funcionario } from "../types.js";
import * as chamadoService from "./chamado.service.js";
import * as conversaService from "./conversa.service.js";
import { textoDoPrazo } from "./prazos.service.js";

// Tudo que a tela do chat precisa: conversa, mensagens e chamados do funcionário
async function montarEstado(conversa: Conversa) {
  const chamados: ChamadoParaTela[] = [];
  try {
    const lista = await chamadoService.listarChamados(conversa.funcionarioEmail);
    for (const chamado of lista) {
      chamados.push(chamadoService.chamadoParaTela(chamado));
    }
  } catch (erro) {
    // sistema de chamados fora do ar: o chat continua funcionando, sem os cards
  }
  return {
    conversa: conversa,
    mensagens: conversaService.listarMensagens(conversa.id),
    chamados: chamados,
    limiteDeMensagens: config.limiteDeMensagens,
  };
}

// Abre (ou retoma) a conversa do funcionário
export async function abrirChat(pessoa: Funcionario) {
  const conversa = conversaService.abrirConversa(pessoa.email);
  return montarEstado(conversa);
}

// Começa uma conversa nova (usado quando bate o limite de mensagens)
export async function comecarConversaNova(pessoa: Funcionario) {
  conversaService.encerrarConversa(conversaService.abrirConversa(pessoa.email));
  const conversaNova = conversaService.abrirConversa(pessoa.email);
  return montarEstado(conversaNova);
}

export async function enviarMensagem(pessoa: Funcionario, textoRecebido: string) {
  const texto = textoRecebido.trim();
  if (texto === "" || texto.length > 1000) {
    throw new ErroDeNegocio("Escreva uma mensagem de até 1000 caracteres.", 400);
  }

  const conversa = conversaService.abrirConversa(pessoa.email);
  if (conversaService.atingiuLimiteDeMensagens(conversa)) {
    throw new ErroDeNegocio("Você atingiu o limite de " + config.limiteDeMensagens + " mensagens desta conversa.", 429);
  }

  conversaService.adicionarMensagem(conversa, "usuario", texto);

  // Só o agent responde quando a conversa está com ele.
  // Se está aguardando ou com um analista, a mensagem fica salva e o agent NÃO responde.
  if (conversa.estado === "agente") {
    await responder(conversa, pessoa.nome);
  }

  return montarEstado(conversa);
}

// Botão "Confirmar": cria, atualiza ou reabre o chamado do rascunho (sem usar a LLM)
export async function confirmarRascunho(pessoa: Funcionario) {
  const conversa = conversaService.abrirConversa(pessoa.email);
  const rascunho = conversa.rascunho;
  if (!rascunho) {
    throw new ErroDeNegocio("Não há rascunho para confirmar.", 400);
  }

  let chamado: Chamado;
  let textoDaResposta = "";
  let acaoFeita = "";

  try {
    if (rascunho.acao === "criar") {
      chamado = await chamadoService.criarChamado(pessoa.email, rascunho);
      acaoFeita = "Criou o chamado " + chamado.id;
      textoDaResposta =
        "Pronto! Abri o chamado " + chamado.id + ". Prioridade " + chamado.prioridade +
        ", primeira resposta em até " + textoDoPrazo(chamado.prioridade) + ".";
    } else if (rascunho.acao === "atualizar") {
      chamado = await chamadoService.atualizarChamado(pessoa.email, rascunho.chamadoId, rascunho.descricao);
      acaoFeita = "Atualizou o chamado " + chamado.id;
      textoDaResposta = "Pronto! Acrescentei essa informação ao chamado " + chamado.id + ".";
    } else {
      chamado = await chamadoService.reabrirChamado(pessoa.email, rascunho.chamadoId, rascunho.descricao);
      acaoFeita = "Reabriu o chamado " + chamado.id;
      textoDaResposta = "Pronto! Reabri o chamado " + chamado.id + ".";
    }
  } catch (erro) {
    // ex: sistema de chamados fora do ar. O rascunho continua guardado para tentar de novo.
    const mensagemDeErro = erro instanceof Error ? erro.message : "Erro ao salvar o chamado.";
    throw new ErroDeNegocio(mensagemDeErro, 503);
  }

  conversa.rascunho = null;
  conversaService.adicionarMensagem(conversa, "agente", textoDaResposta, [chamado.id], [], [
    { acao: acaoFeita, entendeu: rascunho.titulo, confianca: 1, porque: "O funcionário confirmou o rascunho." },
  ]);
  return montarEstado(conversa);
}

// Botão "Cancelar" do rascunho
export async function cancelarRascunho(pessoa: Funcionario) {
  const conversa = conversaService.abrirConversa(pessoa.email);
  conversa.rascunho = null;
  conversaService.adicionarMensagem(conversa, "agente", "Tudo bem, cancelei o rascunho. Posso ajudar em mais alguma coisa?");
  return montarEstado(conversa);
}

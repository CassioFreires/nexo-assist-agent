// Service do console do analista: ver conversas, assumir, responder, devolver ao agent e encerrar.
import { ErroDeNegocio } from "../config/erros.js";
import type { Conversa, Funcionario } from "../types.js";
import { buscarFuncionarioPorEmail } from "./auth.service.js";
import * as chamadoService from "./chamado.service.js";
import * as conversaService from "./conversa.service.js";

function buscarConversaOuErro(id: string): Conversa {
  const conversa = conversaService.buscarConversa(id);
  if (!conversa) {
    throw new ErroDeNegocio("Conversa não encontrada.", 404);
  }
  return conversa;
}

function nomeDoFuncionario(email: string): string {
  const funcionario = buscarFuncionarioPorEmail(email);
  if (funcionario) {
    return funcionario.nome;
  }
  return email;
}

// Lista de conversas (a tela filtra por "Para você", "Com o agent" e "Minhas")
export function listarConversas() {
  const lista = [];
  for (const conversa of conversaService.listarTodasAsConversas()) {
    const mensagens = conversaService.listarMensagens(conversa.id);
    const ultima = mensagens[mensagens.length - 1];
    lista.push({
      conversa: conversa,
      nomeDoFuncionario: nomeDoFuncionario(conversa.funcionarioEmail),
      ultimaMensagem: ultima ? ultima.texto : "",
      ultimaMensagemEm: ultima ? ultima.criadaEm : conversa.atualizadaEm,
    });
  }
  return { conversas: lista };
}

// Uma conversa: histórico completo + chamados do funcionário
export function detalharConversa(id: string) {
  const conversa = buscarConversaOuErro(id);
  const chamados = [];
  for (const chamado of chamadoService.listarParaAnalista(conversa.funcionarioEmail)) {
    chamados.push(chamadoService.chamadoParaTela(chamado));
  }
  return {
    conversa: conversa,
    nomeDoFuncionario: nomeDoFuncionario(conversa.funcionarioEmail),
    mensagens: conversaService.listarMensagens(conversa.id),
    chamados: chamados,
  };
}

// Analista assume: o agent fica pausado
export function assumirConversa(id: string, analista: Funcionario) {
  const conversa = buscarConversaOuErro(id);
  if (conversa.estado === "com_analista" && conversa.analistaEmail !== analista.email) {
    throw new ErroDeNegocio("Outro analista já está atendendo esta conversa.", 409);
  }
  if (conversa.estado === "encerrada") {
    throw new ErroDeNegocio("Esta conversa está encerrada.", 409);
  }
  conversaService.assumirConversa(conversa, analista.email);
  conversaService.adicionarMensagem(conversa, "analista", analista.nome + " assumiu o atendimento.");
  return { conversa: conversa };
}

// Analista responde ao funcionário (só depois de assumir)
export function responderAoFuncionario(id: string, analista: Funcionario, textoRecebido: string) {
  const conversa = buscarConversaOuErro(id);
  if (conversa.estado !== "com_analista" || conversa.analistaEmail !== analista.email) {
    throw new ErroDeNegocio("Assuma a conversa antes de responder.", 409);
  }
  const texto = textoRecebido.trim();
  if (texto === "") {
    throw new ErroDeNegocio("Escreva uma mensagem.", 400);
  }
  conversaService.adicionarMensagem(conversa, "analista", texto);
  return { mensagens: conversaService.listarMensagens(conversa.id) };
}

// Analista devolve a conversa ao agent
export function devolverConversa(id: string) {
  const conversa = buscarConversaOuErro(id);
  conversaService.devolverParaAgente(conversa);
  conversaService.adicionarMensagem(conversa, "analista", "Devolvi o atendimento ao Nexo Assist. Se precisar, é só chamar de novo.");
  return { conversa: conversa };
}

// Analista encerra a conversa
export function encerrarConversa(id: string) {
  const conversa = buscarConversaOuErro(id);
  conversaService.adicionarMensagem(conversa, "analista", "Atendimento encerrado. Obrigado!");
  conversaService.encerrarConversa(conversa);
  return { conversa: conversa };
}

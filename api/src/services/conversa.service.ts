// Service de conversas: quem está respondendo (agent ou analista) e o histórico do chat.
import { randomUUID } from "node:crypto";
import { config } from "../config/env.js";
import * as conversaRepository from "../repositories/conversa.repository.js";
import * as mensagemRepository from "../repositories/mensagem.repository.js";
import type { Conversa, Mensagem, Passo } from "../types.js";

// ---------- Funcionário ----------

// Volta para a conversa em aberto do funcionário; se não tiver nenhuma, cria uma nova
export function abrirConversa(email: string): Conversa {
  const existente = conversaRepository.buscarAbertaDoFuncionario(email);
  if (existente) {
    return existente;
  }

  const conversa: Conversa = {
    id: randomUUID(),
    funcionarioEmail: email,
    estado: "agente",
    analistaEmail: "",
    motivoTransferencia: "",
    resumoTransferencia: "",
    confiancaTransferencia: 0,
    rascunho: null,
    qtdMensagens: 0,
    atualizadaEm: new Date().toISOString(),
  };
  conversaRepository.inserir(conversa);
  return conversa;
}

export function listarMensagens(conversaId: string): Mensagem[] {
  return mensagemRepository.listarDaConversa(conversaId);
}

// Salva a mensagem e já grava a conversa (contador de mensagens, rascunho, hora da última atividade)
export function adicionarMensagem(
  conversa: Conversa,
  autor: "usuario" | "agente" | "analista",
  texto: string,
  chamadosIds: string[] = [],
  opcoes: string[] = [],
  passos: Passo[] = [],
): Mensagem {
  const mensagem: Mensagem = {
    id: randomUUID(),
    conversaId: conversa.id,
    autor: autor,
    texto: texto,
    chamadosIds: chamadosIds,
    opcoes: opcoes,
    passos: passos,
    criadaEm: new Date().toISOString(),
  };
  mensagemRepository.inserir(mensagem);

  if (autor === "usuario") {
    conversa.qtdMensagens = conversa.qtdMensagens + 1;
  }
  conversa.atualizadaEm = mensagem.criadaEm;
  conversaRepository.salvar(conversa);
  return mensagem;
}

export function atingiuLimiteDeMensagens(conversa: Conversa): boolean {
  return conversa.qtdMensagens >= config.limiteDeMensagens;
}

// ---------- Transferência para o analista ----------

// A partir daqui o agent para de responder (o chat.service confere o estado antes de chamar o agent)
export function transferirParaAnalista(conversa: Conversa, motivo: string, resumo: string, confianca: number) {
  conversa.estado = "aguardando_analista";
  conversa.motivoTransferencia = motivo;
  conversa.resumoTransferencia = resumo;
  conversa.confiancaTransferencia = confianca;
  conversa.rascunho = null;
  conversa.atualizadaEm = new Date().toISOString();
  conversaRepository.salvar(conversa);
}

// ---------- Analista ----------

export function listarTodasAsConversas(): Conversa[] {
  return conversaRepository.listarTodas();
}

export function buscarConversa(id: string): Conversa | undefined {
  return conversaRepository.buscarPorId(id);
}

// Analista assume: o agent fica pausado
export function assumirConversa(conversa: Conversa, analistaEmail: string) {
  conversa.estado = "com_analista";
  conversa.analistaEmail = analistaEmail;
  conversa.atualizadaEm = new Date().toISOString();
  conversaRepository.salvar(conversa);
}

// Analista devolve: o agent volta a responder
export function devolverParaAgente(conversa: Conversa) {
  conversa.estado = "agente";
  conversa.analistaEmail = "";
  conversa.atualizadaEm = new Date().toISOString();
  conversaRepository.salvar(conversa);
}

export function encerrarConversa(conversa: Conversa) {
  conversa.estado = "encerrada";
  conversa.atualizadaEm = new Date().toISOString();
  conversaRepository.salvar(conversa);
}

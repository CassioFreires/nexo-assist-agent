// Service de chamados: o "sistema legado" SIMULADO. O agent só conversa com ele por aqui.
// Privacidade: toda função recebe o e-mail do funcionário e só enxerga os chamados dele.
import { config } from "../config/env.js";
import * as chamadoRepository from "../repositories/chamado.repository.js";
import type { Chamado, ChamadoParaTela, Rascunho } from "../types.js";
import { calcularPrazo, estaAberto, estaVencido, podeReabrir, textoDoPrazo } from "./prazos.service.js";

// ---------- Sistema fora do ar ----------
// De vez em quando o sistema legado "cai" por alguns segundos.

let sistemaForaDoArAte = 0; // hora em que o sistema volta (em milissegundos)

function esperar(milissegundos: number) {
  return new Promise((resolver) => setTimeout(resolver, milissegundos));
}

async function esperarSistemaVoltar() {
  // 5% de chance de o sistema "cair" por 2 segundos
  if (config.sistemaDeChamadosInstavel && Math.random() < 0.05) {
    sistemaForaDoArAte = Date.now() + 2000;
  }

  // tenta 3 vezes, esperando 1 segundo entre elas
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    if (Date.now() >= sistemaForaDoArAte) {
      return; // sistema está no ar
    }
    await esperar(1000);
  }
  throw new Error("O sistema de chamados está indisponível no momento.");
}

// ---------- Consultas ----------

export async function listarChamados(email: string): Promise<Chamado[]> {
  await esperarSistemaVoltar();
  return chamadoRepository.listarDoDono(email);
}

// Devolve undefined se o chamado não existe OU se é de outro funcionário
export async function buscarChamado(email: string, id: string): Promise<Chamado | undefined> {
  await esperarSistemaVoltar();
  return chamadoRepository.buscarDoDono(id, email);
}

// Console do analista: chamados de um funcionário (o analista pode ver os de qualquer um)
export function listarParaAnalista(email: string): Chamado[] {
  return chamadoRepository.listarDoDono(email);
}

// Chamado + dados calculados pelas regras de prazo, para a tela mostrar "vencido", prazo etc.
export function chamadoParaTela(chamado: Chamado): ChamadoParaTela {
  let venceEm = "";
  if (estaAberto(chamado)) {
    venceEm = calcularPrazo(chamado).toISOString();
  }
  return {
    chamado: chamado,
    vencido: estaVencido(chamado),
    venceEm: venceEm,
    podeReabrir: podeReabrir(chamado),
    prazoTexto: textoDoPrazo(chamado.prioridade),
  };
}

// ---------- Criar, atualizar, reabrir e transferir ----------

export async function criarChamado(email: string, rascunho: Rascunho): Promise<Chamado> {
  await esperarSistemaVoltar();
  const agora = new Date().toISOString();
  const numero = chamadoRepository.maiorNumeroDoTipo(rascunho.tipo) + 1;
  const chamado: Chamado = {
    id: rascunho.tipo + "-" + numero,
    tipo: rascunho.tipo,
    titulo: rascunho.titulo,
    descricao: rascunho.descricao,
    categoria: rascunho.categoria,
    prioridade: rascunho.prioridade,
    status: "Aberto",
    donoEmail: email,
    afetado: rascunho.afetado,
    criadoEm: agora,
    atualizadoEm: agora,
    resolvidoEm: "",
    historico: ["Chamado aberto pelo Nexo Assist."],
  };
  chamadoRepository.inserir(chamado);
  return chamado;
}

// Complementa um chamado aberto com novas informações
export async function atualizarChamado(email: string, id: string, informacao: string): Promise<Chamado> {
  const chamado = await buscarChamado(email, id);
  if (!chamado) {
    throw new Error("Chamado não encontrado.");
  }
  if (!estaAberto(chamado)) {
    throw new Error("Este chamado já foi resolvido. Para continuar, é preciso reabri-lo.");
  }
  chamado.descricao = chamado.descricao + "\n\nAtualização: " + informacao;
  chamado.historico.push("Funcionário complementou: " + informacao);
  chamado.atualizadoEm = new Date().toISOString();
  chamadoRepository.salvar(chamado);
  return chamado;
}

// Reabre um chamado resolvido há até 7 dias
export async function reabrirChamado(email: string, id: string, motivo: string): Promise<Chamado> {
  const chamado = await buscarChamado(email, id);
  if (!chamado) {
    throw new Error("Chamado não encontrado.");
  }
  if (!podeReabrir(chamado)) {
    throw new Error("Este chamado não pode ser reaberto (resolvido há mais de 7 dias).");
  }
  chamado.status = "Aberto";
  chamado.resolvidoEm = "";
  chamado.historico.push("Reaberto: " + motivo);
  chamado.atualizadoEm = new Date().toISOString();
  chamadoRepository.salvar(chamado);
  return chamado;
}

// Marca o chamado como "Aguardando analista"
export async function transferirChamado(email: string, id: string, resumo: string): Promise<Chamado> {
  const chamado = await buscarChamado(email, id);
  if (!chamado) {
    throw new Error("Chamado não encontrado.");
  }
  chamado.status = "Aguardando analista";
  chamado.historico.push("Transferido para analista: " + resumo);
  chamado.atualizadoEm = new Date().toISOString();
  chamadoRepository.salvar(chamado);
  return chamado;
}

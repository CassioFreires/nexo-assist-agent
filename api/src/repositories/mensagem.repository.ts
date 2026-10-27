// Repository de mensagens: só conversa com o banco (SQL). Nenhuma regra de negócio aqui.
import { db, type Linha } from "../config/database.js";
import type { Mensagem } from "../types.js";

function paraMensagem(linha: Linha): Mensagem {
  return {
    id: linha.id,
    conversaId: linha.conversaId,
    autor: linha.autor,
    texto: linha.texto,
    chamadosIds: JSON.parse(linha.chamadosIds),
    opcoes: JSON.parse(linha.opcoes),
    passos: JSON.parse(linha.passos),
    criadaEm: linha.criadaEm,
  };
}

export function inserir(mensagem: Mensagem) {
  db.prepare(
    `INSERT INTO mensagens (id, conversaId, autor, texto, chamadosIds, opcoes, passos, criadaEm)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    mensagem.id,
    mensagem.conversaId,
    mensagem.autor,
    mensagem.texto,
    JSON.stringify(mensagem.chamadosIds),
    JSON.stringify(mensagem.opcoes),
    JSON.stringify(mensagem.passos),
    mensagem.criadaEm,
  );
}

// Mensagens da conversa, da mais antiga para a mais nova
export function listarDaConversa(conversaId: string): Mensagem[] {
  const linhas = db.prepare("SELECT * FROM mensagens WHERE conversaId = ? ORDER BY rowid").all(conversaId);
  const mensagens: Mensagem[] = [];
  for (const linha of linhas) {
    mensagens.push(paraMensagem(linha));
  }
  return mensagens;
}

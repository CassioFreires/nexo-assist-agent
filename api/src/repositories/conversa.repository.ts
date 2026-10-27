// Repository de conversas: só conversa com o banco (SQL). Nenhuma regra de negócio aqui.
import { db, type Linha } from "../config/database.js";
import type { Conversa } from "../types.js";

// Transforma uma linha do banco em uma Conversa (o rascunho fica guardado como texto JSON)
function paraConversa(linha: Linha): Conversa {
  let rascunho = null;
  if (linha.rascunho !== "") {
    rascunho = JSON.parse(linha.rascunho);
  }
  return {
    id: linha.id,
    funcionarioEmail: linha.funcionarioEmail,
    estado: linha.estado,
    analistaEmail: linha.analistaEmail,
    motivoTransferencia: linha.motivoTransferencia,
    resumoTransferencia: linha.resumoTransferencia,
    confiancaTransferencia: linha.confiancaTransferencia,
    rascunho: rascunho,
    qtdMensagens: linha.qtdMensagens,
    atualizadaEm: linha.atualizadaEm,
  };
}

export function inserir(conversa: Conversa) {
  db.prepare(
    `INSERT INTO conversas (id, funcionarioEmail, estado, analistaEmail, motivoTransferencia,
                            resumoTransferencia, confiancaTransferencia, rascunho, qtdMensagens, atualizadaEm)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    conversa.id,
    conversa.funcionarioEmail,
    conversa.estado,
    conversa.analistaEmail,
    conversa.motivoTransferencia,
    conversa.resumoTransferencia,
    conversa.confiancaTransferencia,
    "",
    conversa.qtdMensagens,
    conversa.atualizadaEm,
  );
}

// Grava no banco todas as alterações feitas na conversa
export function salvar(conversa: Conversa) {
  let rascunhoEmTexto = "";
  if (conversa.rascunho) {
    rascunhoEmTexto = JSON.stringify(conversa.rascunho);
  }
  db.prepare(
    `UPDATE conversas
     SET estado = ?, analistaEmail = ?, motivoTransferencia = ?, resumoTransferencia = ?,
         confiancaTransferencia = ?, rascunho = ?, qtdMensagens = ?, atualizadaEm = ?
     WHERE id = ?`,
  ).run(
    conversa.estado,
    conversa.analistaEmail,
    conversa.motivoTransferencia,
    conversa.resumoTransferencia,
    conversa.confiancaTransferencia,
    rascunhoEmTexto,
    conversa.qtdMensagens,
    conversa.atualizadaEm,
    conversa.id,
  );
}

// A conversa não encerrada mais recente do funcionário
export function buscarAbertaDoFuncionario(email: string): Conversa | undefined {
  const linha = db
    .prepare("SELECT * FROM conversas WHERE funcionarioEmail = ? AND estado != 'encerrada' ORDER BY atualizadaEm DESC LIMIT 1")
    .get(email);
  if (!linha) {
    return undefined;
  }
  return paraConversa(linha);
}

export function buscarPorId(id: string): Conversa | undefined {
  const linha = db.prepare("SELECT * FROM conversas WHERE id = ?").get(id);
  if (!linha) {
    return undefined;
  }
  return paraConversa(linha);
}

export function listarTodas(): Conversa[] {
  const linhas = db.prepare("SELECT * FROM conversas ORDER BY atualizadaEm DESC").all();
  const conversas: Conversa[] = [];
  for (const linha of linhas) {
    conversas.push(paraConversa(linha));
  }
  return conversas;
}

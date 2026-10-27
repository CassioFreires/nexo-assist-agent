// Repository de chamados: só conversa com o banco (SQL). Nenhuma regra de negócio aqui.
import { db, type Linha } from "../config/database.js";
import type { Chamado, Tipo } from "../types.js";

// Transforma uma linha do banco em um Chamado
function paraChamado(linha: Linha): Chamado {
  return {
    id: linha.id,
    tipo: linha.tipo,
    titulo: linha.titulo,
    descricao: linha.descricao,
    categoria: linha.categoria,
    prioridade: linha.prioridade,
    status: linha.status,
    donoEmail: linha.donoEmail,
    afetado: linha.afetado,
    criadoEm: linha.criadoEm,
    atualizadoEm: linha.atualizadoEm,
    resolvidoEm: linha.resolvidoEm,
    historico: JSON.parse(linha.historico),
  };
}

export function inserir(chamado: Chamado) {
  db.prepare(
    `INSERT INTO chamados (id, tipo, titulo, descricao, categoria, prioridade, status, donoEmail,
                           afetado, criadoEm, atualizadoEm, resolvidoEm, historico)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    chamado.id,
    chamado.tipo,
    chamado.titulo,
    chamado.descricao,
    chamado.categoria,
    chamado.prioridade,
    chamado.status,
    chamado.donoEmail,
    chamado.afetado,
    chamado.criadoEm,
    chamado.atualizadoEm,
    chamado.resolvidoEm,
    JSON.stringify(chamado.historico),
  );
}

// Grava no banco as alterações feitas em um chamado
export function salvar(chamado: Chamado) {
  db.prepare(
    `UPDATE chamados
     SET status = ?, descricao = ?, atualizadoEm = ?, resolvidoEm = ?, historico = ?
     WHERE id = ?`,
  ).run(chamado.status, chamado.descricao, chamado.atualizadoEm, chamado.resolvidoEm, JSON.stringify(chamado.historico), chamado.id);
}

// Devolve undefined se o chamado não existe OU se é de outro funcionário
export function buscarDoDono(id: string, donoEmail: string): Chamado | undefined {
  const linha = db.prepare("SELECT * FROM chamados WHERE id = ? AND donoEmail = ?").get(id, donoEmail);
  if (!linha) {
    return undefined;
  }
  return paraChamado(linha);
}

export function listarDoDono(donoEmail: string): Chamado[] {
  const linhas = db.prepare("SELECT * FROM chamados WHERE donoEmail = ?").all(donoEmail);
  const chamados: Chamado[] = [];
  for (const linha of linhas) {
    chamados.push(paraChamado(linha));
  }
  return chamados;
}

// Maior número já usado para o tipo (ex: INC-20311 -> 20311). Zero se não houver nenhum.
export function maiorNumeroDoTipo(tipo: Tipo): number {
  let maiorNumero = 0;
  const linhas = db.prepare("SELECT id FROM chamados WHERE tipo = ?").all(tipo);
  for (const linha of linhas) {
    const numero = Number(String(linha.id).slice(4));
    if (numero > maiorNumero) {
      maiorNumero = numero;
    }
  }
  return maiorNumero;
}

export function contar(): number {
  const linha = db.prepare("SELECT COUNT(*) AS total FROM chamados").get();
  return linha ? Number(linha.total) : 0;
}

// Conexão com o SQLite (arquivo data/nexo.db) e criação das tabelas.
// O Node já traz o SQLite embutido. Ao reiniciar, o arquivo continua lá e nada se perde.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { config } from "./env.js";

if (config.arquivoDoBanco !== ":memory:") {
  fs.mkdirSync(path.dirname(config.arquivoDoBanco), { recursive: true });
}

export const db = new DatabaseSync(config.arquivoDoBanco);

// Uma linha vinda do banco (as colunas têm os mesmos nomes dos tipos em types.ts)
export type Linha = Record<string, any>;

// Listas e objetos (historico, rascunho, passos...) ficam como texto JSON
db.exec(`
  CREATE TABLE IF NOT EXISTS chamados (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL,
    prioridade TEXT NOT NULL,
    status TEXT NOT NULL,
    donoEmail TEXT NOT NULL,
    afetado TEXT NOT NULL,
    criadoEm TEXT NOT NULL,
    atualizadoEm TEXT NOT NULL,
    resolvidoEm TEXT NOT NULL,
    historico TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversas (
    id TEXT PRIMARY KEY,
    funcionarioEmail TEXT NOT NULL,
    estado TEXT NOT NULL,
    analistaEmail TEXT NOT NULL,
    motivoTransferencia TEXT NOT NULL,
    resumoTransferencia TEXT NOT NULL,
    confiancaTransferencia REAL NOT NULL,
    rascunho TEXT NOT NULL,
    qtdMensagens INTEGER NOT NULL,
    atualizadaEm TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mensagens (
    id TEXT PRIMARY KEY,
    conversaId TEXT NOT NULL,
    autor TEXT NOT NULL,
    texto TEXT NOT NULL,
    chamadosIds TEXT NOT NULL,
    opcoes TEXT NOT NULL,
    passos TEXT NOT NULL,
    criadaEm TEXT NOT NULL
  );
`);

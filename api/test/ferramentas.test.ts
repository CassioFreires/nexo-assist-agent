import { expect, test } from "vitest";
import { abrirConversa } from "../src/services/conversa.service.js";
import { criarResultadoVazio, executarFerramenta } from "../src/agent/ferramentas.js";

import { semearBanco } from "../src/data/seed.js";

semearBanco(); // o banco dos testes começa vazio

test("consultarMeusChamados só devolve chamados da conversa logada", async () => {
  const conversa = abrirConversa("carla.mendes@nexo.com");
  const resultado = criarResultadoVazio();
  const argumentos = JSON.stringify({ somenteAbertos: false, entendeu: "x", confianca: 0.9, porque: "y" });

  const retorno: any = await executarFerramenta("consultarMeusChamados", argumentos, conversa, resultado);

  expect(retorno.chamados.length).toBe(1);
  expect(retorno.chamados[0].id).toBe("REQ-10501");
  expect(resultado.passos[0]?.acao).toBe("Consultou seus chamados");
});

test("rascunho para atualizar chamado de outro funcionário é recusado", async () => {
  const conversa = abrirConversa("bruno.tavares@nexo.com");
  const resultado = criarResultadoVazio();
  const argumentos = JSON.stringify({
    acao: "atualizar",
    chamadoId: "INC-20311", // é da Ana
    tipo: "INC",
    titulo: "x",
    descricao: "x",
    categoria: "Hardware",
    prioridade: "Média",
    afetado: "Bruno",
    entendeu: "x",
    confianca: 0.9,
    porque: "y",
  });

  const retorno: any = await executarFerramenta("prepararRascunho", argumentos, conversa, resultado);

  expect(retorno.erro).toBeDefined();
  expect(conversa.rascunho).toBeNull();
});

test("rascunho de chamado novo é guardado e mostra o prazo da prioridade", async () => {
  const conversa = abrirConversa("diego.ramos@nexo.com");
  const resultado = criarResultadoVazio();
  const argumentos = JSON.stringify({
    acao: "criar",
    chamadoId: "",
    tipo: "INC",
    titulo: "Sem internet",
    descricao: "Equipe inteira sem internet",
    categoria: "Rede e VPN",
    prioridade: "Crítica",
    afetado: "Equipe de vendas",
    entendeu: "x",
    confianca: 0.9,
    porque: "equipe parada",
  });

  const retorno: any = await executarFerramenta("prepararRascunho", argumentos, conversa, resultado);

  expect(retorno.prazo).toBe("1 hora");
  expect(conversa.rascunho?.titulo).toBe("Sem internet");
});

test("chamarAnalista passa a conversa para aguardando_analista", async () => {
  const conversa = abrirConversa("ana.souza@nexo.com");
  const resultado = criarResultadoVazio();
  const argumentos = JSON.stringify({
    motivo: "pedido do funcionário",
    resumo: "Quer falar com alguém",
    chamadoId: "",
    entendeu: "x",
    confianca: 0.95,
    porque: "pediu",
  });

  await executarFerramenta("chamarAnalista", argumentos, conversa, resultado);

  expect(conversa.estado).toBe("aguardando_analista");
  expect(resultado.transferiu).toBe(true);
});

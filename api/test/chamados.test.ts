import { expect, test } from "vitest";
import { buscarChamado, criarChamado, listarChamados, reabrirChamado } from "../src/services/chamado.service.js";
import { estaVencido, podeReabrir } from "../src/services/prazos.service.js";

import { semearBanco } from "../src/data/seed.js";

semearBanco(); // o banco dos testes começa vazio

const ana = "ana.souza@nexo.com";
const bruno = "bruno.tavares@nexo.com";

test("funcionário só vê os próprios chamados", async () => {
  const chamados = await listarChamados(ana);
  expect(chamados.length).toBeGreaterThan(0);
  for (const chamado of chamados) {
    expect(chamado.donoEmail).toBe(ana);
  }
});

test("chamado de outro funcionário não é encontrado", async () => {
  const chamadoDaAnaVistoPeloBruno = await buscarChamado(bruno, "INC-20311");
  expect(chamadoDaAnaVistoPeloBruno).toBeUndefined();
});

test("chamado Média sem atualização há 6 dias está vencido", async () => {
  const chamado = await buscarChamado(ana, "INC-20311");
  expect(estaVencido(chamado!)).toBe(true);
});

test("chamado resolvido há 4 dias pode reabrir", async () => {
  const chamado = await buscarChamado(ana, "INC-20150");
  expect(podeReabrir(chamado!)).toBe(true);
});

test("chamado resolvido há 15 dias não pode reabrir", async () => {
  await expect(reabrirChamado("diego.ramos@nexo.com", "INC-20120", "voltou")).rejects.toThrow();
});

test("chamado novo recebe o próximo número e fica com o dono certo", async () => {
  const novo = await criarChamado(bruno, {
    acao: "criar",
    chamadoId: "",
    tipo: "INC",
    titulo: "Teclado com defeito",
    descricao: "Algumas teclas não funcionam.",
    categoria: "Hardware",
    prioridade: "Média",
    afetado: "Bruno Tavares",
  });
  expect(novo.id).toBe("INC-20399");
  expect(novo.donoEmail).toBe(bruno);
});

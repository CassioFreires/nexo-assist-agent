import { expect, test } from "vitest";
import { app } from "../src/app.js";

// Faz login e devolve o token
async function entrar(email: string): Promise<string> {
  const resposta = await app.request("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, senha: "qualquer" }),
  });
  const dados: any = await resposta.json();
  return dados.token;
}

function chamar(caminho: string, token: string, metodo = "GET", corpo?: object) {
  return app.request(caminho, {
    method: metodo,
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
}

test("login recusa e-mail desconhecido", async () => {
  const resposta = await app.request("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "intruso@fora.com", senha: "123" }),
  });
  expect(resposta.status).toBe(401);
});

test("sem login não acessa o chat", async () => {
  const resposta = await app.request("/api/conversa");
  expect(resposta.status).toBe(401);
});

test("cada funcionário só recebe os próprios chamados", async () => {
  const token = await entrar("carla.mendes@nexo.com");
  const resposta = await chamar("/api/conversa", token);
  const dados: any = await resposta.json();
  expect(dados.chamados.length).toBe(1);
  expect(dados.chamados[0].chamado.donoEmail).toBe("carla.mendes@nexo.com");
});

test("funcionário não acessa o console do analista", async () => {
  const token = await entrar("ana.souza@nexo.com");
  const resposta = await chamar("/api/analista/conversas", token);
  expect(resposta.status).toBe(401);
});

test("confirmar sem rascunho dá erro", async () => {
  const token = await entrar("diego.ramos@nexo.com");
  const resposta = await chamar("/api/rascunho/confirmar", token, "POST");
  expect(resposta.status).toBe(400);
});

test("conversa transferida: analista assume, responde e devolve; agent não responde enquanto isso", async () => {
  const tokenFuncionario = await entrar("bruno.tavares@nexo.com");
  const tokenAnalista = await entrar("rafael.lima@nexo.com");

  // deixa a conversa do Bruno "aguardando analista" (simula a transferência feita pelo agent)
  const { abrirConversa, transferirParaAnalista, listarMensagens } = await import("../src/services/conversa.service.js");
  const conversa = abrirConversa("bruno.tavares@nexo.com");
  transferirParaAnalista(conversa, "pedido do funcionário", "Quer falar com alguém", 0.9);

  // funcionário escreve: a mensagem é salva, mas o agent NÃO responde (não há chamada à LLM)
  await chamar("/api/mensagem", tokenFuncionario, "POST", { texto: "Alguém aí?" });
  const mensagens = listarMensagens(conversa.id);
  expect(mensagens.length).toBe(1);
  expect(mensagens[0]?.autor).toBe("usuario");

  // analista só responde depois de assumir
  const semAssumir = await chamar("/api/analista/conversas/" + conversa.id + "/mensagem", tokenAnalista, "POST", { texto: "Oi" });
  expect(semAssumir.status).toBe(409);

  await chamar("/api/analista/conversas/" + conversa.id + "/assumir", tokenAnalista, "POST");
  const respondeu = await chamar("/api/analista/conversas/" + conversa.id + "/mensagem", tokenAnalista, "POST", { texto: "Oi Bruno!" });
  expect(respondeu.status).toBe(200);

  // devolve ao agent
  const devolveu: any = await (await chamar("/api/analista/conversas/" + conversa.id + "/devolver", tokenAnalista, "POST")).json();
  expect(devolveu.conversa.estado).toBe("agente");
});

test("limite de 30 mensagens por conversa", async () => {
  const token = await entrar("ana.souza@nexo.com");
  const { abrirConversa } = await import("../src/services/conversa.service.js");
  const conversaRepository = await import("../src/repositories/conversa.repository.js");
  const conversa = abrirConversa("ana.souza@nexo.com");
  conversa.qtdMensagens = 30;
  conversa.estado = "com_analista"; // assim o agent não é chamado neste teste
  conversaRepository.salvar(conversa);

  const resposta = await chamar("/api/mensagem", token, "POST", { texto: "mais uma" });
  expect(resposta.status).toBe(429);
});

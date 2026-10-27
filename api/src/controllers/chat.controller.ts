// Controller do chat do funcionário: lê a requisição, chama o service e devolve a resposta.
import type { Context } from "hono";
import { exigirFuncionario } from "../middlewares/auth.js";
import * as chatService from "../services/chat.service.js";

export async function abrirConversa(c: Context) {
  const pessoa = exigirFuncionario(c);
  return c.json(await chatService.abrirChat(pessoa));
}

export async function novaConversa(c: Context) {
  const pessoa = exigirFuncionario(c);
  return c.json(await chatService.comecarConversaNova(pessoa));
}

export async function enviarMensagem(c: Context) {
  const pessoa = exigirFuncionario(c);
  const corpo: { texto?: string } = await c.req.json().catch(() => ({}));
  return c.json(await chatService.enviarMensagem(pessoa, corpo.texto ?? ""));
}

export async function confirmarRascunho(c: Context) {
  const pessoa = exigirFuncionario(c);
  return c.json(await chatService.confirmarRascunho(pessoa));
}

export async function cancelarRascunho(c: Context) {
  const pessoa = exigirFuncionario(c);
  return c.json(await chatService.cancelarRascunho(pessoa));
}

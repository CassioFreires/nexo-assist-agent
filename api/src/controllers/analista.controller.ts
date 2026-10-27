// Controller do console do analista: lê a requisição, chama o service e devolve a resposta.
import type { Context } from "hono";
import { exigirAnalista } from "../middlewares/auth.js";
import * as analistaService from "../services/analista.service.js";

export function listarConversas(c: Context) {
  exigirAnalista(c);
  return c.json(analistaService.listarConversas());
}

export function detalharConversa(c: Context) {
  exigirAnalista(c);
  return c.json(analistaService.detalharConversa(c.req.param("id") ?? ""));
}

export function assumirConversa(c: Context) {
  const analista = exigirAnalista(c);
  return c.json(analistaService.assumirConversa(c.req.param("id") ?? "", analista));
}

export async function responderAoFuncionario(c: Context) {
  const analista = exigirAnalista(c);
  const corpo: { texto?: string } = await c.req.json().catch(() => ({}));
  return c.json(analistaService.responderAoFuncionario(c.req.param("id") ?? "", analista, corpo.texto ?? ""));
}

export function devolverConversa(c: Context) {
  exigirAnalista(c);
  return c.json(analistaService.devolverConversa(c.req.param("id") ?? ""));
}

export function encerrarConversa(c: Context) {
  exigirAnalista(c);
  return c.json(analistaService.encerrarConversa(c.req.param("id") ?? ""));
}

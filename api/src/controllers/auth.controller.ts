// Controller de login: lê a requisição, chama o service e devolve a resposta.
import type { Context } from "hono";
import * as authService from "../services/auth.service.js";

export async function login(c: Context) {
  const corpo: { email?: string; senha?: string } = await c.req.json().catch(() => ({}));
  const resposta = authService.login(corpo.email ?? "", corpo.senha ?? "");
  return c.json(resposta);
}

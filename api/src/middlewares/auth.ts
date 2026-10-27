// Descobre quem está logado pelo cabeçalho "Authorization: Bearer <token>".
// Cada controller chama exigirFuncionario ou exigirAnalista no começo.
import type { Context } from "hono";
import { ErroDeNegocio } from "../config/erros.js";
import { buscarPessoaPeloToken } from "../services/auth.service.js";
import type { Funcionario } from "../types.js";

function pegarPessoaLogada(c: Context): Funcionario | undefined {
  const cabecalho = c.req.header("Authorization") ?? "";
  const token = cabecalho.replace("Bearer ", "");
  return buscarPessoaPeloToken(token);
}

export function exigirFuncionario(c: Context): Funcionario {
  const pessoa = pegarPessoaLogada(c);
  if (!pessoa || pessoa.papel !== "funcionario") {
    throw new ErroDeNegocio("Faça login como funcionário.", 401);
  }
  return pessoa;
}

export function exigirAnalista(c: Context): Funcionario {
  const pessoa = pegarPessoaLogada(c);
  if (!pessoa || pessoa.papel !== "analista") {
    throw new ErroDeNegocio("Acesso só para analistas.", 401);
  }
  return pessoa;
}

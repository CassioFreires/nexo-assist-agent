// Service de login. Qualquer senha vale, desde que o e-mail seja de uma pessoa de exemplo.
// Sessões ficam na memória: ao reiniciar o servidor é preciso entrar de novo
// (conversas e chamados continuam salvos no banco).
import { randomUUID } from "node:crypto";
import { FUNCIONARIOS } from "../data/dados.js";
import { ErroDeNegocio } from "../config/erros.js";
import type { Funcionario } from "../types.js";

const sessoes = new Map<string, Funcionario>(); // token -> pessoa logada

export function buscarFuncionarioPorEmail(email: string): Funcionario | undefined {
  for (const funcionario of FUNCIONARIOS) {
    if (funcionario.email === email.trim().toLowerCase()) {
      return funcionario;
    }
  }
  return undefined;
}

export function login(email: string, senha: string) {
  const funcionario = buscarFuncionarioPorEmail(email);
  if (!funcionario || senha === "") {
    throw new ErroDeNegocio("E-mail ou senha inválidos.", 401);
  }
  const token = randomUUID();
  sessoes.set(token, funcionario);
  return { token: token, funcionario: funcionario };
}

export function buscarPessoaPeloToken(token: string): Funcionario | undefined {
  return sessoes.get(token);
}

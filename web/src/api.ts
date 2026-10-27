// Tudo que a tela pede ao servidor fica aqui. Cada função é uma chamada à API.
import type { DetalheDaConversa, EstadoDoChat, Funcionario, ItemDaLista } from "./tipos";

// ---------- Sessão (fica no navegador até fechar a aba) ----------

export function lerSessao(): { token: string; pessoa: Funcionario } | null {
  const texto = sessionStorage.getItem("sessao");
  if (!texto) {
    return null;
  }
  return JSON.parse(texto);
}

export function guardarSessao(token: string, pessoa: Funcionario) {
  sessionStorage.setItem("sessao", JSON.stringify({ token: token, pessoa: pessoa }));
}

export function limparSessao() {
  sessionStorage.removeItem("sessao");
}

// ---------- Chamada base ----------

async function chamar(caminho: string, metodo = "GET", corpo?: object): Promise<any> {
  const sessao = lerSessao();
  const resposta = await fetch("/api" + caminho, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + (sessao ? sessao.token : ""),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    // sessão perdida (ex: servidor reiniciou): volta para o login
    if (resposta.status === 401 && sessao) {
      limparSessao();
      window.location.reload();
    }
    throw new Error(dados.erro ?? "Não foi possível completar a ação.");
  }
  return dados;
}

// ---------- Login ----------

export async function entrar(email: string, senha: string): Promise<{ token: string; funcionario: Funcionario }> {
  return chamar("/login", "POST", { email: email, senha: senha });
}

// ---------- Chat do funcionário ----------

export async function abrirConversa(): Promise<EstadoDoChat> {
  return chamar("/conversa");
}

export async function novaConversa(): Promise<EstadoDoChat> {
  return chamar("/conversa/nova", "POST");
}

export async function enviarMensagem(texto: string): Promise<EstadoDoChat> {
  return chamar("/mensagem", "POST", { texto: texto });
}

export async function confirmarRascunho(): Promise<EstadoDoChat> {
  return chamar("/rascunho/confirmar", "POST");
}

export async function cancelarRascunho(): Promise<EstadoDoChat> {
  return chamar("/rascunho/cancelar", "POST");
}

// ---------- Console do analista ----------

export async function listarConversas(): Promise<ItemDaLista[]> {
  const dados = await chamar("/analista/conversas");
  return dados.conversas;
}

export async function detalharConversa(id: string): Promise<DetalheDaConversa> {
  return chamar("/analista/conversas/" + id);
}

export async function assumirConversa(id: string): Promise<void> {
  await chamar("/analista/conversas/" + id + "/assumir", "POST");
}

export async function responderComoAnalista(id: string, texto: string): Promise<void> {
  await chamar("/analista/conversas/" + id + "/mensagem", "POST", { texto: texto });
}

export async function devolverAoAgente(id: string): Promise<void> {
  await chamar("/analista/conversas/" + id + "/devolver", "POST");
}

export async function encerrarConversa(id: string): Promise<void> {
  await chamar("/analista/conversas/" + id + "/encerrar", "POST");
}

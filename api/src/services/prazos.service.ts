// Regras de prazo do Anexo A.
// Expediente do service desk: segunda a sexta, das 8h às 18h.
import type { Chamado, Prioridade } from "../types.js";

// Texto do prazo, para mostrar ao funcionário
export function textoDoPrazo(prioridade: Prioridade): string {
  if (prioridade === "Crítica") return "1 hora";
  if (prioridade === "Alta") return "4 horas úteis";
  if (prioridade === "Média") return "3 dias úteis";
  return "5 dias úteis"; // Baixa
}

function ehDiaUtil(data: Date): boolean {
  const diaDaSemana = data.getDay(); // 0 = domingo, 6 = sábado
  return diaDaSemana !== 0 && diaDaSemana !== 6;
}

function ehHorarioDeExpediente(data: Date): boolean {
  const hora = data.getHours();
  return ehDiaUtil(data) && hora >= 8 && hora < 18;
}

function somarHoras(inicio: Date, horas: number): Date {
  const data = new Date(inicio);
  data.setHours(data.getHours() + horas);
  return data;
}

// Anda 1 hora por vez e só conta a hora se for dia útil, entre 8h e 18h
function somarHorasUteis(inicio: Date, horas: number): Date {
  const data = new Date(inicio);
  let horasQueFaltam = horas;
  while (horasQueFaltam > 0) {
    if (ehHorarioDeExpediente(data)) {
      horasQueFaltam = horasQueFaltam - 1;
    }
    data.setHours(data.getHours() + 1);
  }
  return data;
}

// Anda 1 dia por vez e só conta se for dia útil
function somarDiasUteis(inicio: Date, dias: number): Date {
  const data = new Date(inicio);
  let diasQueFaltam = dias;
  while (diasQueFaltam > 0) {
    data.setDate(data.getDate() + 1);
    if (ehDiaUtil(data)) {
      diasQueFaltam = diasQueFaltam - 1;
    }
  }
  return data;
}

// Data limite para a próxima resposta/atualização, contada a partir da última atualização
export function calcularPrazo(chamado: Chamado): Date {
  const ultimaAtualizacao = new Date(chamado.atualizadoEm);
  if (chamado.prioridade === "Crítica") return somarHoras(ultimaAtualizacao, 1);
  if (chamado.prioridade === "Alta") return somarHorasUteis(ultimaAtualizacao, 4);
  if (chamado.prioridade === "Média") return somarDiasUteis(ultimaAtualizacao, 3);
  return somarDiasUteis(ultimaAtualizacao, 5); // Baixa
}

export function estaAberto(chamado: Chamado): boolean {
  return chamado.status !== "Resolvido";
}

// Vencido = ainda aberto e já passou do prazo
export function estaVencido(chamado: Chamado): boolean {
  if (!estaAberto(chamado)) return false;
  return new Date() > calcularPrazo(chamado);
}

// Chamado resolvido há até 7 dias pode ser reaberto
export function podeReabrir(chamado: Chamado): boolean {
  if (chamado.status !== "Resolvido") return false;
  if (chamado.resolvidoEm === "") return false;

  const milissegundosPorDia = 24 * 60 * 60 * 1000;
  const resolvidoHa = Date.now() - new Date(chamado.resolvidoEm).getTime();
  const diasDesdeResolvido = resolvidoHa / milissegundosPorDia;
  return diasDesdeResolvido <= 7;
}

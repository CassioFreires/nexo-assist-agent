// Funções pequenas de apoio para a tela.

export function formatarHora(dataIso: string): string {
  return new Date(dataIso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatarDataEHora(dataIso: string): string {
  return new Date(dataIso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "Ana Souza" vira "AS"
export function iniciais(nome: string): string {
  const partes = nome.trim().split(" ");
  const primeira = partes[0] ?? "";
  const ultima = partes[partes.length - 1] ?? "";
  return (primeira.charAt(0) + ultima.charAt(0)).toUpperCase();
}

// Confiança de 0 a 1 vira "85%"
export function formatarConfianca(confianca: number): string {
  return Math.round(confianca * 100) + "%";
}

// Cor da confiança: verde (alta), amarelo (média), vermelho (baixa)
export function classeDaConfianca(confianca: number): string {
  if (confianca >= 0.8) return "confianca-alta";
  if (confianca >= 0.6) return "confianca-media";
  return "confianca-baixa";
}

// Central de ajuda: busca artigos por palavras-chave (não usa o modelo, então não gera custo).
import { ARTIGOS } from "../data/dados.js";

// Deixa em minúsculo e sem acento, para "Conexão" casar com "conexao"
function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function separarPalavras(texto: string): string[] {
  const palavras: string[] = [];
  for (const palavra of normalizar(texto).split(/[^a-z0-9]+/)) {
    if (palavra.length > 2) {
      palavras.push(palavra);
    }
  }
  return palavras;
}

// Devolve os artigos que mais combinam com a pergunta (no máximo 3)
export function buscarArtigos(pergunta: string) {
  const palavrasDaPergunta = separarPalavras(pergunta);
  const achados = [];

  for (const artigo of ARTIGOS) {
    let pontos = 0;
    for (const palavra of palavrasDaPergunta) {
      if (artigo.palavras.includes(palavra)) {
        pontos = pontos + 3; // palavra-chave do artigo vale mais
      }
      if (separarPalavras(artigo.titulo).includes(palavra)) {
        pontos = pontos + 2;
      }
    }
    if (pontos >= 3) {
      achados.push({ artigo: artigo, pontos: pontos });
    }
  }

  achados.sort((a, b) => b.pontos - a.pontos); // maiores pontuações primeiro
  return achados.slice(0, 3);
}

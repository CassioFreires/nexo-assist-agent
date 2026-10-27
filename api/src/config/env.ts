// Configuração em um só lugar. Os valores vêm do arquivo .env (veja .env.example).
export const config = {
  porta: Number(process.env.PORT ?? 3001),
  origemPermitida: process.env.WEB_ORIGIN ?? "*", // endereço da tela (CORS)
  pastaDaTela: process.env.WEB_DIST ?? "../web/dist", // tela compilada (relativa à pasta api/)

  arquivoDoBanco: process.env.DB_FILE ?? "data/nexo.db", // ":memory:" = banco temporário (testes)
  sistemaDeChamadosInstavel: process.env.SISTEMA_INSTAVEL !== "false", // simula o legado caindo

  // Sem chave o servidor ainda sobe; o erro aparece só ao conversar
  llm: {
    apiKey: process.env.LLM_API_KEY ?? "sem-chave",
    baseUrl: process.env.LLM_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai/",
    modelo: process.env.LLM_MODELO ?? "gemini-2.5-flash",
  },

  limiteDeMensagens: 30, // do funcionário, por conversa
  confiancaMinima: 0.6, // abaixo disso o agent chama um analista
  mensagensNoContexto: 10, // só as últimas mensagens vão para a LLM (economiza custo)
  maximoDeVoltasDoAgente: 6, // quantas vezes a LLM pode pedir ferramentas por resposta
};

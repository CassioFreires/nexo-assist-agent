// Monta a aplicação: CORS, tratamento de erros e as rotas. (Quem sobe o servidor é o server.ts.)
import { Hono } from "hono";
import { cors } from "hono/cors";
import { config } from "./config/env.js";
import { ErroDeNegocio } from "./config/erros.js";
import { semearBanco } from "./data/seed.js";
import { analistaRoutes } from "./routes/analista.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { chatRoutes } from "./routes/chat.routes.js";

semearBanco(); // cadastra os chamados de exemplo se o banco estiver vazio

export const app = new Hono();

app.use("/api/*", cors({ origin: config.origemPermitida }));

app.route("/api", authRoutes);
app.route("/api", chatRoutes);
app.route("/api", analistaRoutes);

// Qualquer erro vira uma resposta JSON { erro: "..." }
app.onError((erro, c) => {
  if (erro instanceof ErroDeNegocio) {
    return new Response(JSON.stringify({ erro: erro.message }), {
      status: erro.status,
      headers: { "Content-Type": "application/json" },
    });
  }
  console.error("Erro inesperado:", erro);
  return c.json({ erro: "Erro interno. Tente novamente." }, 500);
});

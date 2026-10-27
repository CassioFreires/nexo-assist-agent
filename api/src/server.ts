// Sobe o servidor HTTP. Se a tela já foi compilada (npm run build), a API também entrega a tela.
import fs from "node:fs";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { app } from "./app.js";
import { config } from "./config/env.js";

if (fs.existsSync(config.pastaDaTela)) {
  app.use("/*", serveStatic({ root: config.pastaDaTela }));
}

serve({ fetch: app.fetch, port: config.porta });
console.log("Nexo Assist API rodando em http://localhost:" + config.porta);

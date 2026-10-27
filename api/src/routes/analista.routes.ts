// Rotas do console do analista
import { Hono } from "hono";
import {
  assumirConversa,
  detalharConversa,
  devolverConversa,
  encerrarConversa,
  listarConversas,
  responderAoFuncionario,
} from "../controllers/analista.controller.js";

export const analistaRoutes = new Hono();

analistaRoutes.get("/analista/conversas", listarConversas);
analistaRoutes.get("/analista/conversas/:id", detalharConversa);
analistaRoutes.post("/analista/conversas/:id/assumir", assumirConversa);
analistaRoutes.post("/analista/conversas/:id/mensagem", responderAoFuncionario);
analistaRoutes.post("/analista/conversas/:id/devolver", devolverConversa);
analistaRoutes.post("/analista/conversas/:id/encerrar", encerrarConversa);

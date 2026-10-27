// Rotas do chat do funcionário
import { Hono } from "hono";
import {
  abrirConversa,
  cancelarRascunho,
  confirmarRascunho,
  enviarMensagem,
  novaConversa,
} from "../controllers/chat.controller.js";

export const chatRoutes = new Hono();

chatRoutes.get("/conversa", abrirConversa);
chatRoutes.post("/conversa/nova", novaConversa);
chatRoutes.post("/mensagem", enviarMensagem);
chatRoutes.post("/rascunho/confirmar", confirmarRascunho);
chatRoutes.post("/rascunho/cancelar", cancelarRascunho);

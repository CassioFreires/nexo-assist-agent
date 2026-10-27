// Rotas de login
import { Hono } from "hono";
import { login } from "../controllers/auth.controller.js";

export const authRoutes = new Hono();

authRoutes.post("/login", login);

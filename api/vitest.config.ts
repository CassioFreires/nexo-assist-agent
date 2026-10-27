import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // nos testes: banco só na memória e sistema de chamados sem quedas aleatórias
    env: { DB_FILE: ":memory:", SISTEMA_INSTAVEL: "false" },
  },
});

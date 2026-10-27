# Nexo Assist: um único container com a API e a tela (porta 3001).
FROM node:24-slim

WORKDIR /app

# 1) Instala as dependências (esta camada só refaz quando os package.json mudam)
COPY package.json package-lock.json ./
COPY api/package.json api/
COPY web/package.json web/
RUN npm install --no-audit --no-fund

# 2) Copia o código e compila a tela
COPY . .
RUN npm run build

# 3) Sobe a API, que também entrega a tela compilada
ENV PORT=3001
ENV DB_FILE=/data/nexo.db
EXPOSE 3001
WORKDIR /app/api
CMD ["npx", "tsx", "src/server.ts"]

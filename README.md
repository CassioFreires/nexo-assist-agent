# Nexo Assist

Agente de atendimento de um service desk de TI, em formato de chat. O funcionário descreve o problema com as próprias palavras e o agente consulta a central de ajuda e os chamados dele, abre ou complementa chamados (sempre com confirmação) e chama um analista quando precisa.

O projeto tem três partes:

- **Chat do funcionário**: conversa com o agente, cards de chamado, rascunho para confirmar e opções rápidas.
- **Console do analista**: lista de conversas com filtros, assumir o atendimento (o agente fica pausado), devolver ao agente ou encerrar.
- **Transparência**: acima de cada resposta o agente mostra o que fez ("Consultou seus chamados", "Classificou a prioridade"). Clicando em uma ação aparece o que ele entendeu, a confiança e o porquê.

## Como rodar (3 passos)

Precisa do [Docker](https://docs.docker.com/get-docker/) instalado.

```bash
git clone https://github.com/CassioFreires/nexo-assist-agent.git
cd nexo-assist-agent
cp .env.example .env        # no Windows (PowerShell): copy .env.example .env
```

Abra o arquivo `.env` e **cole a sua chave da LLM** em `LLM_API_KEY`. Depois:

```bash
docker compose up --build
```

Abra **http://localhost:3001**.

> **A chave é obrigatória.** Sem ela a tela abre normalmente, mas o agente responde "Tive um problema para responder agora", porque não consegue falar com o modelo.
> Para gerar uma chave gratuita do Gemini: https://aistudio.google.com/apikey

### Contas de exemplo

Qualquer senha vale. Na tela de login há botões que preenchem os dados.

| E-mail | Perfil | O que tem |
|---|---|---|
| ana.souza@nexo.com | Funcionária | chamado vencido (INC-20311), um aprovado e um resolvido há 4 dias (pode reabrir) |
| bruno.tavares@nexo.com | Funcionário | chamado de VPN em andamento |
| carla.mendes@nexo.com | Funcionária | pedido de acesso ao SAP |
| diego.ramos@nexo.com | Funcionário | só um chamado antigo resolvido (não reabre) |
| rafael.lima@nexo.com | **Analista** | entra no console do analista |

Dica para ver o fluxo completo: abra uma janela anônima, entre como Ana e peça "falar com um analista"; na janela normal, entre como Rafael e assuma a conversa.

## Qual modelo é usado

**Gemini 2.5 Flash** (`gemini-2.5-flash`), acessado pelo endereço compatível com o SDK da OpenAI.

Por que esse modelo: é rápido e barato, e suporta chamada de ferramentas (*tool calling*), que é o que o agente usa para decidir o que fazer. Isso importa porque cada mensagem pode virar até 6 chamadas ao modelo, então latência e custo pesam.

Para trocar de modelo ou de provedor, edite o `.env` (nenhum código muda):

```
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODELO=llama-3.3-70b-versatile
```

Qualquer provedor com API compatível com a da OpenAI e suporte a ferramentas funciona.

## Rodar sem Docker (para desenvolver)

Precisa de Node.js 24 ou mais novo (o projeto usa o SQLite embutido do Node).

```bash
npm install
cp .env.example .env     # e cole a chave
npm run dev:api          # terminal 1: API em http://localhost:3001
npm run dev:web          # terminal 2: tela em http://localhost:5173
```

Outros comandos: `npm test` (testes), `npm run typecheck` (tipos), `npm run build` (compila a tela).

## Arquitetura

```
 Tela (React)  ──►  Rotas ──► Controllers ──► Services ──► Repositories ──► SQLite
                                                 │
                                                 └──► Agente (LLM + ferramentas)
```

```
api/src/
  routes/        liga cada URL ao controller
  controllers/   lê a requisição e devolve a resposta (sem regra de negócio)
  services/      regras: chamados, conversas, chat, analista, prazos, central de ajuda
  repositories/  só SQL
  agent/         agente.ts (instruções e loop com a LLM) e ferramentas.ts
  config/        variáveis de ambiente, banco, erros
  data/          dados de exemplo
web/src/
  telas/         Login, Chat, Console
  componentes/   Balão, Passos (transparência), cards, rascunho
```

Decisões:

- **Camadas**: cada camada tem uma responsabilidade. Trocar o banco mexe só nos repositories; trocar o modelo mexe só no `.env`.
- **Serviço de chamados separado do agente**: `chamado.service.ts` simula o sistema legado, inclusive ficando fora do ar por alguns segundos (com 3 tentativas). O agente só o acessa pelas ferramentas.
- **SQLite**: conversas, mensagens, chamados e o estado de cada conversa (com o agente ou com um analista) sobrevivem a um reinício. No Docker ficam no volume `nexo-data`.
- **Um container só**: a API entrega também a tela compilada. Uma porta, um comando.

## Como o agente decide o que fazer

A cada mensagem, o código envia à LLM as instruções (as regras do service desk), as últimas 10 mensagens e a lista de ferramentas. A LLM **não executa nada**: ela só pede uma ferramenta; o nosso código executa e devolve o resultado, até a LLM escrever a resposta final (máximo de 6 voltas).

| Ferramenta | Para quê |
|---|---|
| `buscarNaCentralDeAjuda` | responder dúvidas sem abrir chamado |
| `consultarMeusChamados` | status, prazo e se está vencido |
| `prepararRascunho` | montar o chamado (tipo, categoria, prioridade, afetado) para confirmação |
| `chamarAnalista` | transferir a conversa com um resumo do caso |
| `sugerirOpcoes` | botões de resposta rápida |

Em toda ferramenta a LLM também informa **o que entendeu, a confiança (0 a 1) e o porquê**. Cada uma vira um passo salvo na mensagem e exibido na tela.

Regras que o **código** garante, sem depender do prompt:

- **Privacidade**: o e-mail do funcionário vem da sessão, nunca de um argumento da LLM. Ela não consegue pedir chamados de outra pessoa. Atualizar ou reabrir só funciona em chamado do próprio funcionário.
- **Confirmação antes de agir**: o agente só monta o rascunho. Criar, atualizar ou reabrir acontece no botão "Confirmar", em uma rota que não usa a LLM.
- **Transferência por falta de segurança**: se a confiança de algum passo fica abaixo de 0,6, a conversa vai para um analista.
- **Agente pausado**: com a conversa aguardando ou com um analista, o servidor nem chama a LLM.
- **Limite de 30 mensagens** por conversa.
- **Prazos e reabertura**: prioridade Crítica 1 hora; Alta 4 horas úteis; Média 3 dias úteis; Baixa 5 dias úteis (expediente de segunda a sexta, 8h às 18h). Resolvido há até 7 dias pode ser reaberto.
- **Falhas**: se a LLM ou o sistema de chamados falham, a conversa continua e o usuário recebe uma mensagem clara. Falha técnica não transfere para analista.

Custo por conversa: busca na central de ajuda e confirmação de rascunho não usam a LLM; só as últimas 10 mensagens são enviadas ao modelo.

## Como a qualidade foi garantida

`npm test` roda testes automatizados das regras que não dependem do modelo: prazos e vencimento, reabertura em 7 dias, privacidade entre funcionários (no serviço, nas ferramentas e nas rotas HTTP), login e permissões, limite de mensagens, agente pausado durante o atendimento do analista e o fluxo assumir, responder e devolver.

O que **não** é coberto por teste automático é a decisão do próprio modelo (qual ferramenta escolher, qual prioridade atribuir). Isso exige a chave e foi pensado para ser conferido pela tela de transparência.

## Trade-offs

- **Agente escrito à mão com o SDK da OpenAI, e não com Mastra ou LangGraph.js.** O loop de chamada de ferramentas tem cerca de 30 linhas e fica fácil de ler e explicar. Em troca, não há as facilidades de um framework (memória, observabilidade, avaliações).
- **Resposta inteira em vez de streaming.** O texto aparece "digitando" na tela, mas o servidor devolve a resposta completa. Streaming com chamada de ferramentas aumentaria bastante a complexidade.
- **Sessões em memória.** Ao reiniciar o servidor é preciso entrar de novo (conversas e chamados continuam salvos).
- **Login de demonstração**: aceita qualquer senha para as contas de exemplo. Não serve para produção.
- **Busca na central de ajuda por palavras-chave**, sem embeddings. É simples, previsível e de custo zero, mas não entende sinônimos.
- **Atualização por consulta periódica (4 a 5 segundos)** em vez de WebSocket.

## O que faria com mais tempo

- Streaming da resposta e dos passos do agente em tempo real.
- Conjunto de conversas de teste para avaliar a decisão do modelo (ferramenta escolhida, prioridade, duplicidade) a cada mudança no prompt.
- Autenticação real e sessões persistentes.
- Busca semântica na central de ajuda.
- Limite de uso por usuário e proteção contra abuso, para um deploy público.

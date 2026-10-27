// Tipos usados pela tela. Os tipos de dados vêm direto da API, para os dois lados sempre combinarem.
import type { ChamadoParaTela, Conversa, Funcionario, Mensagem } from "../../api/src/types";

export type { ChamadoParaTela, Conversa, Funcionario, Mensagem };
export type { Chamado, Passo, Rascunho } from "../../api/src/types";

// Resposta das rotas do chat do funcionário
export interface EstadoDoChat {
  conversa: Conversa;
  mensagens: Mensagem[];
  chamados: ChamadoParaTela[];
  limiteDeMensagens: number;
}

// Um item da lista de conversas do analista
export interface ItemDaLista {
  conversa: Conversa;
  nomeDoFuncionario: string;
  ultimaMensagem: string;
  ultimaMensagemEm: string;
}

// Uma conversa aberta no console do analista
export interface DetalheDaConversa {
  conversa: Conversa;
  nomeDoFuncionario: string;
  mensagens: Mensagem[];
  chamados: ChamadoParaTela[];
}

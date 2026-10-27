// Tipos do Nexo Assist. Datas sempre como texto ISO (ex: "2026-10-27T14:00:00.000Z").

export type Tipo = "INC" | "REQ"; // incidente | requisição
export type Categoria = "Acesso" | "Rede e VPN" | "Hardware" | "Software" | "E-mail" | "Outros";
export type Prioridade = "Crítica" | "Alta" | "Média" | "Baixa";
export type Status = "Aberto" | "Em andamento" | "Aguardando analista" | "Aprovado" | "Resolvido";

export interface Chamado {
  id: string; // ex: INC-20311
  tipo: Tipo;
  titulo: string;
  descricao: string;
  categoria: Categoria;
  prioridade: Prioridade;
  status: Status;
  donoEmail: string; // só o dono pode ver este chamado
  afetado: string; // quem é afetado
  criadoEm: string;
  atualizadoEm: string;
  resolvidoEm: string; // vazio "" se ainda não foi resolvido
  historico: string[]; // anotações, uma por linha
}

// Rascunho mostrado ao funcionário; só vira chamado depois da confirmação
export interface Rascunho {
  acao: "criar" | "atualizar" | "reabrir";
  chamadoId: string; // vazio "" quando acao = criar
  tipo: Tipo;
  titulo: string;
  descricao: string;
  categoria: Categoria;
  prioridade: Prioridade;
  afetado: string;
}

export interface Conversa {
  id: string;
  funcionarioEmail: string;
  // quem está respondendo agora
  estado: "agente" | "aguardando_analista" | "com_analista" | "encerrada";
  analistaEmail: string; // vazio "" se nenhum analista assumiu
  motivoTransferencia: string;
  resumoTransferencia: string;
  confiancaTransferencia: number; // 0 a 1
  rascunho: Rascunho | null; // rascunho esperando confirmação
  qtdMensagens: number; // mensagens do funcionário (limite de 30)
  atualizadaEm: string;
}

// O que o agent fez em uma resposta (parte mais importante: transparência)
export interface Passo {
  acao: string; // ex: "Consultou seus chamados"
  entendeu: string; // o que o agent entendeu do funcionário
  confianca: number; // 0 a 1
  porque: string; // por que tomou essa ação
}

export interface Mensagem {
  id: string;
  conversaId: string;
  autor: "usuario" | "agente" | "analista";
  texto: string;
  chamadosIds: string[]; // cards de chamado que aparecem na mensagem
  opcoes: string[]; // opções rápidas
  passos: Passo[]; // ações do agent
  criadaEm: string;
}

export interface Funcionario {
  email: string;
  nome: string;
  papel: "funcionario" | "analista";
}

// Chamado + dados calculados pelas regras de prazo, prontos para a tela
export interface ChamadoParaTela {
  chamado: Chamado;
  vencido: boolean;
  venceEm: string; // vazio "" se o chamado já foi resolvido
  podeReabrir: boolean;
  prazoTexto: string; // ex: "4 horas úteis"
}

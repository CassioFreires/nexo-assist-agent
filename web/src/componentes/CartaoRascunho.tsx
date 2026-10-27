// Rascunho do chamado: o funcionário confere os dados e só então confirma (ou cancela).
import type { Rascunho } from "../tipos";

interface Props {
  rascunho: Rascunho;
  ocupado: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

const TITULO_DA_ACAO = {
  criar: "Novo chamado",
  atualizar: "Atualizar chamado",
  reabrir: "Reabrir chamado",
};

export function CartaoRascunho({ rascunho, ocupado, aoConfirmar, aoCancelar }: Props) {
  const textoDoBotao = rascunho.acao === "criar" ? "Confirmar e abrir" : "Confirmar";

  return (
    <div className="rascunho">
      <div className="rascunho-topo">
        <span className="rascunho-titulo">Rascunho · {TITULO_DA_ACAO[rascunho.acao]}</span>
        {rascunho.chamadoId !== "" && <span className="cartao-id">{rascunho.chamadoId}</span>}
      </div>

      <div className="rascunho-campos">
        <div className="rascunho-campo rascunho-largo">
          <span className="passo-rotulo">Título</span>
          <strong>{rascunho.titulo}</strong>
        </div>
        <div className="rascunho-campo">
          <span className="passo-rotulo">Tipo</span>
          <span>{rascunho.tipo === "INC" ? "Incidente (INC)" : "Requisição (REQ)"}</span>
        </div>
        <div className="rascunho-campo">
          <span className="passo-rotulo">Categoria</span>
          <span>{rascunho.categoria}</span>
        </div>
        <div className="rascunho-campo">
          <span className="passo-rotulo">Prioridade</span>
          <span className={"selo prioridade-" + rascunho.prioridade}>{rascunho.prioridade}</span>
        </div>
        <div className="rascunho-campo">
          <span className="passo-rotulo">Afetado</span>
          <span>{rascunho.afetado}</span>
        </div>
        <div className="rascunho-campo rascunho-largo">
          <span className="passo-rotulo">Descrição</span>
          <span>{rascunho.descricao}</span>
        </div>
      </div>

      <div className="rascunho-botoes">
        <button className="botao botao-primario" disabled={ocupado} onClick={aoConfirmar}>
          {textoDoBotao}
        </button>
        <button className="botao botao-secundario" disabled={ocupado} onClick={aoCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

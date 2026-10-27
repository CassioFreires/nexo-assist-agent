// Card de um chamado: número, título, status, prioridade e se está vencido.
import type { ChamadoParaTela } from "../tipos";
import { formatarDataEHora } from "../utils";

interface Props {
  item: ChamadoParaTela;
  aoSelecionar?: (item: ChamadoParaTela) => void; // se existir, o card vira clicável
}

export function CartaoChamado({ item, aoSelecionar }: Props) {
  const chamado = item.chamado;
  const clicavel = aoSelecionar !== undefined;

  function clicar() {
    if (aoSelecionar) {
      aoSelecionar(item);
    }
  }

  return (
    <div className={"cartao " + (clicavel ? "cartao-clicavel" : "")} onClick={clicar}>
      <div className="cartao-topo">
        <span className="cartao-id">{chamado.id}</span>
        <span className={"selo prioridade-" + chamado.prioridade}>{chamado.prioridade}</span>
      </div>
      <div className="cartao-titulo">{chamado.titulo}</div>
      <div className="cartao-rodape">
        <span className="selo selo-status">{chamado.status}</span>
        {item.vencido && <span className="selo selo-vencido">Prazo vencido</span>}
        {!item.vencido && item.venceEm !== "" && (
          <span className="cartao-prazo">Resposta até {formatarDataEHora(item.venceEm)}</span>
        )}
        {item.podeReabrir && <span className="cartao-prazo">Pode ser reaberto</span>}
      </div>
    </div>
  );
}

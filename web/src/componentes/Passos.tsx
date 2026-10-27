// Mostra o que o agent fez em uma resposta (a parte mais importante do desafio: transparência).
// Acima da resposta aparecem as ações como "etiquetas". Clicando numa etiqueta abre o detalhe:
// o que o agent entendeu, qual ação tomou, com que confiança e por quê.
import { useState } from "react";
import type { Passo } from "../tipos";
import { classeDaConfianca, formatarConfianca } from "../utils";

interface Props {
  passos: Passo[];
}

export function Passos({ passos }: Props) {
  const [aberto, setAberto] = useState(-1); // posição do passo aberto (-1 = nenhum)

  if (passos.length === 0) {
    return null;
  }

  function alternar(posicao: number) {
    if (aberto === posicao) {
      setAberto(-1);
    } else {
      setAberto(posicao);
    }
  }

  const passoAberto = passos[aberto];

  return (
    <div className="passos">
      <div className="passos-etiquetas">
        {passos.map((passo, posicao) => (
          <button
            key={posicao}
            className={"etiqueta " + (aberto === posicao ? "etiqueta-aberta" : "")}
            onClick={() => alternar(posicao)}
            title="Ver detalhes desta ação"
          >
            <span className={"ponto " + classeDaConfianca(passo.confianca)}></span>
            {passo.acao}
          </button>
        ))}
      </div>

      {passoAberto && (
        <div className="passo-detalhe">
          <div className="passo-linha">
            <span className="passo-rotulo">Ação</span>
            <span>{passoAberto.acao}</span>
          </div>
          <div className="passo-linha">
            <span className="passo-rotulo">O que entendi</span>
            <span>{passoAberto.entendeu}</span>
          </div>
          <div className="passo-linha">
            <span className="passo-rotulo">Confiança</span>
            <span className="confianca">
              <span className="barra">
                <span
                  className={"barra-cheia " + classeDaConfianca(passoAberto.confianca)}
                  style={{ width: formatarConfianca(passoAberto.confianca) }}
                ></span>
              </span>
              {formatarConfianca(passoAberto.confianca)}
            </span>
          </div>
          <div className="passo-linha">
            <span className="passo-rotulo">Por quê</span>
            <span>{passoAberto.porque}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Uma mensagem do chat: ações do agent (acima), balão de texto, cards de chamado e opções rápidas.
import { useEffect, useState } from "react";
import type { ChamadoParaTela, Mensagem } from "../tipos";
import { formatarHora } from "../utils";
import { CartaoChamado } from "./CartaoChamado";
import { Passos } from "./Passos";

interface Props {
  mensagem: Mensagem;
  chamados: ChamadoParaTela[]; // todos os chamados do funcionário (para montar os cards)
  ladoDoUsuario: "usuario" | "analista"; // quem fica no lado direito (quem está usando a tela)
  animar?: boolean; // true = o texto aparece aos poucos, como se estivesse sendo digitado
  aoEscolherOpcao?: (texto: string) => void;
  aoSelecionarChamado?: (item: ChamadoParaTela) => void;
}

// Mostra o texto aparecendo aos poucos
function TextoDigitando({ texto, animar }: { texto: string; animar: boolean }) {
  const [quantidade, setQuantidade] = useState(animar ? 0 : texto.length);

  useEffect(() => {
    if (!animar) {
      return;
    }
    const intervalo = setInterval(() => {
      setQuantidade((atual) => {
        if (atual >= texto.length) {
          clearInterval(intervalo);
          return atual;
        }
        return atual + 2;
      });
    }, 15);
    return () => clearInterval(intervalo);
  }, [texto, animar]);

  return <>{texto.slice(0, quantidade)}</>;
}

export function Balao({ mensagem, chamados, ladoDoUsuario, animar, aoEscolherOpcao, aoSelecionarChamado }: Props) {
  const souEu = mensagem.autor === ladoDoUsuario;

  // Cards: só os chamados citados nesta mensagem
  const cartoes: ChamadoParaTela[] = [];
  for (const item of chamados) {
    if (mensagem.chamadosIds.includes(item.chamado.id)) {
      cartoes.push(item);
    }
  }

  let nomeDoAutor = "";
  if (mensagem.autor === "agente") nomeDoAutor = "Nexo Assist";
  if (mensagem.autor === "analista") nomeDoAutor = "Analista";
  if (mensagem.autor === "usuario") nomeDoAutor = "Funcionário"; // só aparece no console do analista

  return (
    <div className={"mensagem " + (souEu ? "mensagem-minha" : "mensagem-outro")}>
      {!souEu && <div className="mensagem-autor">{nomeDoAutor}</div>}

      <Passos passos={mensagem.passos} />

      <div className={"balao " + (souEu ? "balao-meu" : "balao-outro balao-" + mensagem.autor)}>
        <TextoDigitando texto={mensagem.texto} animar={animar === true} />
      </div>

      {cartoes.length > 0 && (
        <div className="cartoes">
          {cartoes.map((item) => (
            <CartaoChamado key={item.chamado.id} item={item} aoSelecionar={aoSelecionarChamado} />
          ))}
        </div>
      )}

      {mensagem.opcoes.length > 0 && aoEscolherOpcao && (
        <div className="opcoes">
          {mensagem.opcoes.map((opcao) => (
            <button key={opcao} className="opcao" onClick={() => aoEscolherOpcao(opcao)}>
              {opcao}
            </button>
          ))}
        </div>
      )}

      <div className="mensagem-hora">{formatarHora(mensagem.criadaEm)}</div>
    </div>
  );
}

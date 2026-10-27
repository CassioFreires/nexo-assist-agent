// Telas 2 e 3: chat do funcionário com o Nexo Assist.
import { useEffect, useRef, useState } from "react";
import {
  abrirConversa,
  cancelarRascunho,
  confirmarRascunho,
  enviarMensagem,
  novaConversa,
} from "../api";
import { Balao } from "../componentes/Balao";
import { CartaoRascunho } from "../componentes/CartaoRascunho";
import { Logo } from "../componentes/Logo";
import type { ChamadoParaTela, EstadoDoChat, Funcionario } from "../tipos";

interface Props {
  pessoa: Funcionario;
  sair: () => void;
}

const SUGESTOES = ["Como está meu chamado?", "Meu notebook está lento", "Preciso de acesso a um sistema", "Falar com um analista"];

export function Chat({ pessoa, sair }: Props) {
  const [estado, setEstado] = useState<EstadoDoChat | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false); // true enquanto espera a resposta
  const [erro, setErro] = useState("");
  const [idParaAnimar, setIdParaAnimar] = useState(""); // mensagem nova do agent aparece "digitando"
  const fimDaConversa = useRef<HTMLDivElement>(null);

  // Ao abrir a tela, carrega (ou retoma) a conversa
  useEffect(() => {
    abrirConversa()
      .then(setEstado)
      .catch((e) => setErro(e.message));
  }, []);

  // Se a conversa está com um analista, busca novas mensagens a cada 4 segundos
  useEffect(() => {
    if (!estado || estado.conversa.estado === "agente") {
      return;
    }
    const intervalo = setInterval(() => {
      abrirConversa().then(setEstado).catch(() => {});
    }, 4000);
    return () => clearInterval(intervalo);
  }, [estado]);

  // Rola até a última mensagem
  useEffect(() => {
    fimDaConversa.current?.scrollIntoView({ behavior: "smooth" });
  }, [estado?.mensagens.length, enviando]);

  // Guarda o novo estado e marca a última mensagem do agent para aparecer "digitando"
  function receberEstado(novo: EstadoDoChat) {
    const ultima = novo.mensagens[novo.mensagens.length - 1];
    const antes = estado ? estado.mensagens.length : 0;
    if (ultima && ultima.autor === "agente" && novo.mensagens.length > antes) {
      setIdParaAnimar(ultima.id);
    }
    setEstado(novo);
  }

  async function enviar(textoParaEnviar: string) {
    const conteudo = textoParaEnviar.trim();
    if (conteudo === "" || enviando || !estado) {
      return;
    }
    setErro("");
    setTexto("");
    setEnviando(true);

    // Mostra a mensagem do funcionário na hora, antes de o servidor responder
    const mensagemProvisoria = {
      id: "provisoria",
      conversaId: estado.conversa.id,
      autor: "usuario" as const,
      texto: conteudo,
      chamadosIds: [],
      opcoes: [],
      passos: [],
      criadaEm: new Date().toISOString(),
    };
    setEstado({
      conversa: estado.conversa,
      mensagens: estado.mensagens.concat([mensagemProvisoria]),
      chamados: estado.chamados,
      limiteDeMensagens: estado.limiteDeMensagens,
    });

    try {
      receberEstado(await enviarMensagem(conteudo));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao enviar a mensagem.");
      setEstado(estado); // desfaz a mensagem provisória
      setTexto(conteudo);
    }
    setEnviando(false);
  }

  async function executar(acao: () => Promise<EstadoDoChat>) {
    setErro("");
    setEnviando(true);
    try {
      receberEstado(await acao());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao executar a ação.");
    }
    setEnviando(false);
  }

  // Clicar em um card de chamado: o funcionário "seleciona" o chamado e continua a conversa sobre ele
  function selecionarChamado(item: ChamadoParaTela) {
    enviar("Quero falar sobre o chamado " + item.chamado.id + " (" + item.chamado.titulo + ")");
  }

  if (!estado) {
    return (
      <div className="chat-tela">
        <div className="carregando">{erro !== "" ? erro : "Carregando conversa..."}</div>
      </div>
    );
  }

  const conversa = estado.conversa;
  const atingiuLimite = conversa.qtdMensagens >= estado.limiteDeMensagens;
  const ultimaMensagem = estado.mensagens[estado.mensagens.length - 1];

  return (
    <div className="chat-tela">
      <header className="chat-topo">
        <div className="chat-topo-esquerda">
          <Logo />
          <div>
            <div className="chat-titulo">Nexo Assist</div>
            <div className="chat-subtitulo">Service desk de TI</div>
          </div>
        </div>
        <div className="chat-topo-direita">
          <span className="contador" title="Mensagens enviadas nesta conversa">
            {conversa.qtdMensagens}/{estado.limiteDeMensagens} mensagens
          </span>
          <span className="chat-usuario">{pessoa.nome}</span>
          <button className="botao botao-secundario botao-pequeno" onClick={sair}>
            Sair
          </button>
        </div>
      </header>

      {conversa.estado === "aguardando_analista" && (
        <div className="faixa faixa-aviso">
          Sua conversa foi transferida e está aguardando um analista. O Nexo Assist não vai responder até lá.
          {conversa.resumoTransferencia !== "" && <span> Resumo enviado: {conversa.resumoTransferencia}</span>}
        </div>
      )}
      {conversa.estado === "com_analista" && (
        <div className="faixa faixa-ok">Um analista está atendendo você agora.</div>
      )}

      <main className="chat-mensagens">
        <div className="chat-coluna">
          {estado.mensagens.length === 0 && (
            <div className="boas-vindas">
              <h2>Olá, {pessoa.nome.split(" ")[0]}! 👋</h2>
              <p>Sou o Nexo Assist. Descreva o que está acontecendo com suas palavras. Posso:</p>
              <ul>
                <li>responder dúvidas de TI com a central de ajuda;</li>
                <li>consultar seus chamados e dizer se algum está atrasado;</li>
                <li>abrir ou complementar um chamado (você confirma antes);</li>
                <li>chamar um analista quando for preciso.</li>
              </ul>
              <div className="opcoes">
                {SUGESTOES.map((sugestao) => (
                  <button key={sugestao} className="opcao" onClick={() => enviar(sugestao)}>
                    {sugestao}
                  </button>
                ))}
              </div>
            </div>
          )}

          {estado.mensagens.map((mensagem) => (
            <Balao
              key={mensagem.id}
              mensagem={mensagem}
              chamados={estado.chamados}
              ladoDoUsuario="usuario"
              animar={mensagem.id === idParaAnimar}
              // opções rápidas só na última mensagem e se o agent ainda estiver respondendo
              aoEscolherOpcao={mensagem === ultimaMensagem && conversa.estado === "agente" ? enviar : undefined}
              aoSelecionarChamado={conversa.estado === "agente" ? selecionarChamado : undefined}
            />
          ))}

          {enviando && (
            <div className="mensagem mensagem-outro">
              <div className="mensagem-autor">Nexo Assist</div>
              <div className="balao balao-outro digitando">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          {conversa.rascunho && !enviando && (
            <CartaoRascunho
              rascunho={conversa.rascunho}
              ocupado={enviando}
              aoConfirmar={() => executar(confirmarRascunho)}
              aoCancelar={() => executar(cancelarRascunho)}
            />
          )}

          <div ref={fimDaConversa}></div>
        </div>
      </main>

      <footer className="chat-rodape">
        <div className="chat-coluna">
          {erro !== "" && <div className="erro">{erro}</div>}

          {atingiuLimite ? (
            <div className="limite">
              <span>Você atingiu o limite de {estado.limiteDeMensagens} mensagens desta conversa.</span>
              <button className="botao botao-primario" onClick={() => executar(novaConversa)}>
                Começar nova conversa
              </button>
            </div>
          ) : (
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                enviar(texto);
              }}
            >
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={
                  conversa.estado === "aguardando_analista" ? "Escreva para o analista..." : "Escreva sua mensagem..."
                }
                maxLength={1000}
                disabled={enviando}
              />
              <button className="botao botao-primario" type="submit" disabled={enviando || texto.trim() === ""}>
                Enviar
              </button>
            </form>
          )}
        </div>
      </footer>
    </div>
  );
}

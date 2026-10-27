// Telas 4 e 5: console do analista (lista de conversas, atendimento e chamados do funcionário).
import { useEffect, useRef, useState } from "react";
import {
  assumirConversa,
  detalharConversa,
  devolverAoAgente,
  encerrarConversa,
  listarConversas,
  responderComoAnalista,
} from "../api";
import { Balao } from "../componentes/Balao";
import { CartaoChamado } from "../componentes/CartaoChamado";
import { Logo } from "../componentes/Logo";
import type { DetalheDaConversa, Funcionario, ItemDaLista } from "../tipos";
import { formatarConfianca, formatarHora, iniciais } from "../utils";

interface Props {
  pessoa: Funcionario;
  sair: () => void;
}

type Filtro = "todas" | "para_voce" | "com_agente" | "minhas";

// Etiqueta colorida de cada conversa na lista
function etiquetaDaConversa(item: ItemDaLista, meuEmail: string): { texto: string; cor: string } {
  const conversa = item.conversa;
  if (conversa.estado === "aguardando_analista") {
    if (conversa.motivoTransferencia === "sem segurança") {
      return { texto: "Agent pediu ajuda · confiança " + formatarConfianca(conversa.confiancaTransferencia), cor: "amarelo" };
    }
    return { texto: "Transferida · " + conversa.motivoTransferencia, cor: "vermelho" };
  }
  if (conversa.estado === "com_analista") {
    if (conversa.analistaEmail === meuEmail) {
      return { texto: "Você está atendendo", cor: "azul" };
    }
    return { texto: "Com outro analista", cor: "cinza" };
  }
  if (conversa.estado === "encerrada") {
    return { texto: "Encerrada", cor: "cinza" };
  }
  return { texto: "Agent atendendo", cor: "verde" };
}

export function Console({ pessoa, sair }: Props) {
  const [lista, setLista] = useState<ItemDaLista[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busca, setBusca] = useState("");
  const [selecionadaId, setSelecionadaId] = useState("");
  const [detalhe, setDetalhe] = useState<DetalheDaConversa | null>(null);
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const fimDaConversa = useRef<HTMLDivElement>(null);

  async function carregarLista() {
    try {
      setLista(await listarConversas());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar as conversas.");
    }
  }

  async function carregarDetalhe(id: string) {
    try {
      setDetalhe(await detalharConversa(id));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar a conversa.");
    }
  }

  // A lista se atualiza sozinha a cada 5 segundos
  useEffect(() => {
    carregarLista();
    const intervalo = setInterval(carregarLista, 5000);
    return () => clearInterval(intervalo);
  }, []);

  // A conversa aberta se atualiza sozinha a cada 4 segundos
  useEffect(() => {
    if (selecionadaId === "") {
      return;
    }
    carregarDetalhe(selecionadaId);
    const intervalo = setInterval(() => carregarDetalhe(selecionadaId), 4000);
    return () => clearInterval(intervalo);
  }, [selecionadaId]);

  useEffect(() => {
    fimDaConversa.current?.scrollIntoView({ behavior: "smooth" });
  }, [detalhe?.mensagens.length]);

  // Executa uma ação do analista (assumir, devolver...) e recarrega a tela
  async function executar(acao: () => Promise<void>) {
    setErro("");
    setOcupado(true);
    try {
      await acao();
      await carregarLista();
      await carregarDetalhe(selecionadaId);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao executar a ação.");
    }
    setOcupado(false);
  }

  async function enviarResposta() {
    const conteudo = texto.trim();
    if (conteudo === "") {
      return;
    }
    setTexto("");
    await executar(() => responderComoAnalista(selecionadaId, conteudo));
  }

  // ---------- Filtros ----------

  function passaNoFiltro(item: ItemDaLista, qual: Filtro): boolean {
    const estado = item.conversa.estado;
    if (qual === "para_voce") return estado === "aguardando_analista";
    if (qual === "com_agente") return estado === "agente";
    if (qual === "minhas") return estado === "com_analista" && item.conversa.analistaEmail === pessoa.email;
    return true;
  }

  function contar(qual: Filtro): number {
    let total = 0;
    for (const item of lista) {
      if (passaNoFiltro(item, qual)) {
        total = total + 1;
      }
    }
    return total;
  }

  // Aplica filtro e busca; as que precisam do analista aparecem primeiro
  const visiveis: ItemDaLista[] = [];
  for (const item of lista) {
    const textoDaBusca = (item.nomeDoFuncionario + " " + item.ultimaMensagem).toLowerCase();
    if (passaNoFiltro(item, filtro) && textoDaBusca.includes(busca.toLowerCase())) {
      visiveis.push(item);
    }
  }
  visiveis.sort((a, b) => {
    const aPrecisa = a.conversa.estado === "aguardando_analista" ? 0 : 1;
    const bPrecisa = b.conversa.estado === "aguardando_analista" ? 0 : 1;
    return aPrecisa - bPrecisa;
  });

  const paraVoce = contar("para_voce");
  const conversa = detalhe ? detalhe.conversa : null;
  const souEuAtendendo = conversa !== null && conversa.estado === "com_analista" && conversa.analistaEmail === pessoa.email;
  const podeAssumir = conversa !== null && (conversa.estado === "aguardando_analista" || conversa.estado === "agente");

  return (
    <div className="console">
      {/* Barra lateral */}
      <nav className="rail">
        <div className="rail-logo">
          <Logo />
        </div>
        <div className="rail-item rail-ativo" title="Conversas">
          💬
          {paraVoce > 0 && <span className="rail-badge">{paraVoce}</span>}
        </div>
        <div className="rail-espaco"></div>
        <button className="rail-eu" onClick={sair} title={"Sair (" + pessoa.nome + ")"}>
          {iniciais(pessoa.nome)}
        </button>
      </nav>

      {/* Lista de conversas */}
      <section className="lista">
        <div className="lista-topo">
          <div className="lista-titulo-linha">
            <h2>Conversas</h2>
            <span className="disponivel">
              <span className="ponto confianca-alta"></span>Disponível
            </span>
          </div>
          <input
            className="busca"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar conversa"
          />
          <div className="filtros">
            <button className={"filtro " + (filtro === "todas" ? "filtro-ativo" : "")} onClick={() => setFiltro("todas")}>
              Todas
            </button>
            <button className={"filtro " + (filtro === "para_voce" ? "filtro-ativo" : "")} onClick={() => setFiltro("para_voce")}>
              Para você <b>{contar("para_voce")}</b>
            </button>
            <button className={"filtro " + (filtro === "com_agente" ? "filtro-ativo" : "")} onClick={() => setFiltro("com_agente")}>
              Com o agent <b>{contar("com_agente")}</b>
            </button>
            <button className={"filtro " + (filtro === "minhas" ? "filtro-ativo" : "")} onClick={() => setFiltro("minhas")}>
              Minhas <b>{contar("minhas")}</b>
            </button>
          </div>
        </div>

        <div className="lista-itens">
          {visiveis.length === 0 && <div className="vazio">Nenhuma conversa aqui.</div>}
          {visiveis.map((item) => {
            const etiqueta = etiquetaDaConversa(item, pessoa.email);
            return (
              <div
                key={item.conversa.id}
                className={"lista-item " + (item.conversa.id === selecionadaId ? "lista-item-ativo" : "")}
                onClick={() => setSelecionadaId(item.conversa.id)}
              >
                <div className="avatar">{iniciais(item.nomeDoFuncionario)}</div>
                <div className="lista-item-texto">
                  <div className="lista-item-linha">
                    <strong>{item.nomeDoFuncionario}</strong>
                    <span className="hora">{formatarHora(item.ultimaMensagemEm)}</span>
                  </div>
                  <div className="lista-item-ultima">{item.ultimaMensagem || "Sem mensagens"}</div>
                  <div className={"tag tag-" + etiqueta.cor}>
                    <span className="ponto"></span>
                    {etiqueta.texto}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Conversa aberta */}
      <section className="atendimento">
        {!detalhe || !conversa ? (
          <div className="vazio vazio-grande">Selecione uma conversa para ver o histórico.</div>
        ) : (
          <>
            <header className="atendimento-topo">
              <div className="avatar">{iniciais(detalhe.nomeDoFuncionario)}</div>
              <div className="atendimento-nome">
                <strong>{detalhe.nomeDoFuncionario}</strong>
                <span>{conversa.funcionarioEmail}</span>
              </div>
              <div className="atendimento-botoes">
                {podeAssumir && (
                  <button className="botao botao-primario" disabled={ocupado} onClick={() => executar(() => assumirConversa(selecionadaId))}>
                    Assumir atendimento
                  </button>
                )}
                {souEuAtendendo && (
                  <>
                    <button className="botao botao-secundario" disabled={ocupado} onClick={() => executar(() => devolverAoAgente(selecionadaId))}>
                      Devolver ao agent
                    </button>
                    <button className="botao botao-perigo" disabled={ocupado} onClick={() => executar(() => encerrarConversa(selecionadaId))}>
                      Encerrar
                    </button>
                  </>
                )}
              </div>
            </header>

            {conversa.estado === "com_analista" && (
              <div className="faixa faixa-ok">
                Agent pausado: {conversa.analistaEmail === pessoa.email ? "você está atendendo" : "outro analista está atendendo"}.
              </div>
            )}
            {conversa.estado === "aguardando_analista" && (
              <div className="faixa faixa-aviso">Aguardando atendente. O agent não responde até um analista assumir.</div>
            )}

            <div className="atendimento-mensagens">
              {detalhe.mensagens.map((mensagem) => (
                <Balao key={mensagem.id} mensagem={mensagem} chamados={detalhe.chamados} ladoDoUsuario="analista" />
              ))}
              <div ref={fimDaConversa}></div>
            </div>

            <footer className="atendimento-rodape">
              {erro !== "" && <div className="erro">{erro}</div>}
              {souEuAtendendo ? (
                <form
                  className="composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    enviarResposta();
                  }}
                >
                  <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Responder ao funcionário..." disabled={ocupado} />
                  <button className="botao botao-primario" type="submit" disabled={ocupado || texto.trim() === ""}>
                    Enviar
                  </button>
                </form>
              ) : (
                <div className="dica">
                  {conversa.estado === "encerrada" ? "Conversa encerrada." : "Assuma o atendimento para responder."}
                </div>
              )}
            </footer>
          </>
        )}
      </section>

      {/* Painel do funcionário */}
      {detalhe && conversa && (
        <aside className="painel">
          {conversa.motivoTransferencia !== "" && (
            <div className="painel-bloco">
              <h3>Resumo da transferência</h3>
              <div className="passo-linha">
                <span className="passo-rotulo">Motivo</span>
                <span>{conversa.motivoTransferencia}</span>
              </div>
              <div className="passo-linha">
                <span className="passo-rotulo">Confiança do agent</span>
                <span>{formatarConfianca(conversa.confiancaTransferencia)}</span>
              </div>
              <div className="passo-linha">
                <span className="passo-rotulo">Resumo do caso</span>
                <span>{conversa.resumoTransferencia}</span>
              </div>
            </div>
          )}

          <div className="painel-bloco">
            <h3>Chamados de {detalhe.nomeDoFuncionario.split(" ")[0]}</h3>
            {detalhe.chamados.length === 0 && <div className="dica">Nenhum chamado.</div>}
            {detalhe.chamados.map((item) => (
              <CartaoChamado key={item.chamado.id} item={item} />
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}

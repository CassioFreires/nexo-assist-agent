// Tela 1: login com e-mail corporativo e senha (qualquer senha vale para os e-mails de exemplo).
import { useState } from "react";
import { entrar } from "../api";
import { Logo } from "../componentes/Logo";
import type { Funcionario } from "../tipos";

interface Props {
  aoEntrar: (token: string, pessoa: Funcionario) => void;
}

const CONTAS_DE_EXEMPLO = [
  { nome: "Ana Souza", email: "ana.souza@nexo.com", detalhe: "tem chamado vencido" },
  { nome: "Bruno Tavares", email: "bruno.tavares@nexo.com", detalhe: "VPN" },
  { nome: "Carla Mendes", email: "carla.mendes@nexo.com", detalhe: "acesso SAP" },
  { nome: "Diego Ramos", email: "diego.ramos@nexo.com", detalhe: "sem chamados abertos" },
  { nome: "Rafael Lima", email: "rafael.lima@nexo.com", detalhe: "analista (console)" },
];

export function Login({ aoEntrar }: Props) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const resposta = await entrar(email, senha);
      aoEntrar(resposta.token, resposta.funcionario);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível entrar.");
    }
    setCarregando(false);
  }

  return (
    <div className="login">
      <div className="login-apresentacao">
        <div className="login-marca">
          <Logo tamanho={30} />
          <span>Nexo Assist</span>
        </div>
        <h1>Seu service desk de TI, sem fila.</h1>
        <p>
          Converse com o Nexo Assist para tirar dúvidas, consultar seus chamados, abrir ou complementar um chamado e
          falar com um analista quando precisar.
        </p>
        <ul>
          <li>Respostas na hora, com a central de ajuda</li>
          <li>Chamados completos, com prioridade e prazo</li>
          <li>Você vê o que o agent fez e por quê</li>
        </ul>
      </div>

      <div className="login-formulario">
        <form onSubmit={enviar}>
          <h2>Entrar</h2>
          <label>
            E-mail corporativo
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome.sobrenome@nexo.com"
              autoFocus
            />
          </label>
          <label>
            Senha
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Qualquer senha" />
          </label>
          {erro !== "" && <div className="erro">{erro}</div>}
          <button className="botao botao-primario botao-grande" type="submit" disabled={carregando || email === "" || senha === ""}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="login-exemplos">
          <div className="login-exemplos-titulo">Contas de exemplo (clique para preencher)</div>
          {CONTAS_DE_EXEMPLO.map((conta) => (
            <button
              key={conta.email}
              type="button"
              className="login-conta"
              onClick={() => {
                setEmail(conta.email);
                setSenha("123456");
              }}
            >
              <strong>{conta.nome}</strong>
              <span>{conta.detalhe}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

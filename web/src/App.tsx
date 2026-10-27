// Decide qual tela mostrar: login, chat do funcionário ou console do analista.
import { useState } from "react";
import { guardarSessao, lerSessao, limparSessao } from "./api";
import { Chat } from "./telas/Chat";
import { Console } from "./telas/Console";
import { Login } from "./telas/Login";
import type { Funcionario } from "./tipos";

export function App() {
  const sessaoSalva = lerSessao();
  const [pessoa, setPessoa] = useState<Funcionario | null>(sessaoSalva ? sessaoSalva.pessoa : null);

  function aoEntrar(token: string, pessoaLogada: Funcionario) {
    guardarSessao(token, pessoaLogada);
    setPessoa(pessoaLogada);
  }

  function sair() {
    limparSessao();
    setPessoa(null);
  }

  if (!pessoa) {
    return <Login aoEntrar={aoEntrar} />;
  }
  if (pessoa.papel === "analista") {
    return <Console pessoa={pessoa} sair={sair} />;
  }
  return <Chat pessoa={pessoa} sair={sair} />;
}

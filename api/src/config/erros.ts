// Erro com o código HTTP que deve ser devolvido (ex: 404 não encontrado, 409 conflito).
// Os services lançam este erro e o app.ts transforma em resposta JSON.
export class ErroDeNegocio extends Error {
  status: number;

  constructor(mensagem: string, status: number) {
    super(mensagem);
    this.status = status;
  }
}

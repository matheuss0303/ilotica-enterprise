import { useEffect, useState } from "react";
import api from "../services/api";

function Vendas() {
  const [aba, setAba] = useState("novo");
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);

  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("PIX");

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const clientesResposta = await api.get("/clientes");
    const produtosResposta = await api.get("/produtos");
    const vendasResposta = await api.get("/vendas");

    setClientes(clientesResposta.data);
    setProdutos(produtosResposta.data);
    setVendas(vendasResposta.data);
  }

  function selecionarProduto(nomeProduto) {
    setProduto(nomeProduto);

    const produtoEncontrado = produtos.find((item) => item.nome === nomeProduto);

    if (produtoEncontrado) {
      setValorTotal(produtoEncontrado.precoVenda);
    }
  }

  async function registrarVenda() {
    if (!cliente || !produto || !valorTotal) {
      alert("Preencha todos os campos.");
      return;
    }

    await api.post("/vendas", {
      cliente,
      produto,
      valorTotal,
      formaPagamento,
      status: "Orçamento",
    });

    setCliente("");
    setProduto("");
    setValorTotal("");

    await carregarDados();
    setAba("pedidos");
  }

  async function alterarStatus(id, status) {
    await api.put(`/vendas/${id}/status`, { status });
    carregarDados();
  }

  async function excluirVenda(id) {
    await api.delete(`/vendas/${id}`);
    carregarDados();
  }

  function enviarWhatsApp(venda) {
    const clienteEncontrado = clientes.find(
      (cliente) => cliente.nome === venda.cliente
    );

    const numero =
      clienteEncontrado?.whatsapp || clienteEncontrado?.telefone || "";

    const numeroLimpo = numero.replace(/\D/g, "");

    const mensagem = `Olá ${venda.cliente}! Seu pedido na iLótica está pronto para retirada. Aguardamos sua visita!`;

    const url = numeroLimpo
      ? `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`
      : `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");
  }

  function corStatus(status) {
    switch (status) {
      case "Orçamento":
        return "#f59e0b";
      case "Aguardando Pagamento":
        return "#ef4444";
      case "Em Produção":
        return "#3b82f6";
      case "Pronto para Retirada":
        return "#10b981";
      case "Entregue":
        return "#64748b";
      default:
        return "#64748b";
    }
  }

  function limparFiltros() {
    setBusca("");
    setFiltroStatus("Todos");
    setDataInicio("");
    setDataFim("");
  }

  function dataVendaParaISO(dataBR) {
    if (!dataBR) return "";
    const partes = dataBR.split("/");
    if (partes.length !== 3) return "";
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
  }

  const vendasFiltradas = vendas.filter((venda) => {
    const texto = busca.toLowerCase();

    const bateBusca =
      (venda.cliente || "").toLowerCase().includes(texto) ||
      (venda.produto || "").toLowerCase().includes(texto) ||
      (venda.formaPagamento || "").toLowerCase().includes(texto);

    const bateStatus =
      filtroStatus === "Todos" || venda.status === filtroStatus;

    const dataISO = dataVendaParaISO(venda.data);

    const bateDataInicio = !dataInicio || dataISO >= dataInicio;
    const bateDataFim = !dataFim || dataISO <= dataFim;

    return bateBusca && bateStatus && bateDataInicio && bateDataFim;
  });

  const totalFiltrado = vendasFiltradas.reduce(
    (total, venda) => total + Number(venda.valorTotal),
    0
  );

  const emProducao = vendasFiltradas.filter(
    (venda) => venda.status === "Em Produção"
  ).length;

  const prontos = vendasFiltradas.filter(
    (venda) => venda.status === "Pronto para Retirada"
  ).length;

  const entregues = vendasFiltradas.filter(
    (venda) => venda.status === "Entregue"
  ).length;

  return (
    <section className="page">
      <h1>Pedidos e Vendas</h1>
      <p>Gestão comercial, filtros e acompanhamento dos pedidos da iLótica.</p>

      <div className="abas-internas">
        <button
          className={aba === "novo" ? "aba-ativa" : ""}
          onClick={() => setAba("novo")}
        >
          Novo Pedido
        </button>

        <button
          className={aba === "filtros" ? "aba-ativa" : ""}
          onClick={() => setAba("filtros")}
        >
          Filtros
        </button>

        <button
          className={aba === "pedidos" ? "aba-ativa" : ""}
          onClick={() => setAba("pedidos")}
        >
          Pedidos
        </button>
      </div>

      {aba === "novo" && (
        <form className="form">
          <select value={cliente} onChange={(e) => setCliente(e.target.value)}>
            <option value="">Selecione o cliente</option>

            {clientes.map((item) => (
              <option key={item.id} value={item.nome}>
                {item.nome}
              </option>
            ))}
          </select>

          <select
            value={produto}
            onChange={(e) => selecionarProduto(e.target.value)}
          >
            <option value="">Selecione o produto</option>

            {produtos.map((item) => (
              <option
                key={item.id}
                value={item.nome}
                disabled={item.estoque <= 0}
              >
                {item.nome} | Estoque: {item.estoque}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
            placeholder="Valor"
          />

          <select
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value)}
          >
            <option value="PIX">PIX</option>
            <option value="Cartão">Cartão</option>
            <option value="Dinheiro">Dinheiro</option>
          </select>

          <button type="button" onClick={registrarVenda}>
            Criar Pedido
          </button>
        </form>
      )}

      {aba === "filtros" && (
        <>
          <div className="painel-filtros">
            <h2>Filtros de Pedidos</h2>

            <div className="filtros-grid">
              <input
                type="text"
                placeholder="Buscar por cliente, produto ou pagamento..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />

              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
              >
                <option value="Todos">Todos os status</option>
                <option value="Orçamento">Orçamento</option>
                <option value="Aguardando Pagamento">
                  Aguardando Pagamento
                </option>
                <option value="Em Produção">Em Produção</option>
                <option value="Pronto para Retirada">Pronto para Retirada</option>
                <option value="Entregue">Entregue</option>
              </select>

              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />

              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />

              <button type="button" onClick={limparFiltros}>
                Limpar Filtros
              </button>
            </div>
          </div>

          <section className="cards cards-menores">
            <div className="card">
              <span>Total Filtrado</span>
              <strong>R$ {totalFiltrado.toFixed(2)}</strong>
            </div>

            <div className="card">
              <span>Pedidos Encontrados</span>
              <strong>{vendasFiltradas.length}</strong>
            </div>

            <div className="card">
              <span>Em Produção</span>
              <strong>{emProducao}</strong>
            </div>

            <div className="card">
              <span>Prontos</span>
              <strong>{prontos}</strong>
            </div>

            <div className="card">
              <span>Entregues</span>
              <strong>{entregues}</strong>
            </div>
          </section>
        </>
      )}

      {aba === "pedidos" && (
        <div className="lista">
          <h2>Pedidos</h2>

          {vendasFiltradas.length === 0 ? (
            <p>Nenhum pedido encontrado para os filtros selecionados.</p>
          ) : (
            vendasFiltradas.map((venda) => (
              <div className="item pedido-card" key={venda.id}>
                <strong>{venda.cliente}</strong>
                <span>Produto: {venda.produto}</span>
                <span>Valor: R$ {Number(venda.valorTotal).toFixed(2)}</span>
                <span>Pagamento: {venda.formaPagamento}</span>
                <span>Data: {venda.data}</span>

                <span
                  style={{
                    fontWeight: "bold",
                    color: corStatus(venda.status),
                  }}
                >
                  Status: {venda.status}
                </span>

                <select
                  value={venda.status}
                  onChange={(e) => alterarStatus(venda.id, e.target.value)}
                >
                  <option>Orçamento</option>
                  <option>Aguardando Pagamento</option>
                  <option>Em Produção</option>
                  <option>Pronto para Retirada</option>
                  <option>Entregue</option>
                </select>

                {venda.status === "Pronto para Retirada" && (
                  <button type="button" onClick={() => enviarWhatsApp(venda)}>
                    Enviar WhatsApp
                  </button>
                )}

                <button type="button" onClick={() => excluirVenda(venda.id)}>
                  Excluir
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

export default Vendas;
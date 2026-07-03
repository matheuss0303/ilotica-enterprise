import { useEffect, useState } from "react";
import api from "../services/api";
import jsPDF from "jspdf";
import logo from "../assets/logo-ilotica.png";

function Vendas({ usuarioLogado }) {
  const [aba, setAba] = useState("novo");
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);

  const [cliente, setCliente] = useState("");
  const [produto, setProduto] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [desconto, setDesconto] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("PIX");
  const [quantidadeParcelas, setQuantidadeParcelas] = useState("1"); // Novo estado

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

  const valorFinal = Math.max(
    Number(valorTotal || 0) - Number(desconto || 0),
    0
  );

  const valorRestante = Math.max(
    valorFinal - Number(valorPago || 0),
    0
  );

  async function registrarVenda() {
    if (!cliente || !produto || !valorTotal) {
      alert("Preencha cliente, produto e valor.");
      return;
    }

    // Encontra o objeto do cliente selecionado para pegar o ID dele
    const clienteObjeto = clientes.find((c) => c.nome === cliente);

    if (formaPagamento === "Parcelamento" && !clienteObjeto) {
      alert("Erro ao identificar o ID do cliente para gerar o parcelamento.");
      return;
    }

    try {
      // 1. Registra a Venda Geral
      await api.post("/vendas", {
        cliente,
        produto,
        valorTotal: valorFinal,
        desconto: Number(desconto) || 0,
        valorPago: Number(valorPago) || 0,
        valorRestante,
        formaPagamento,
        status: valorRestante > 0 ? "Aguardando Pagamento" : "Orçamento",
        usuario: usuarioLogado?.nome || "Não identificado",
      });

      // 2. Se for Parcelamento, registra automaticamente no financeiro do cliente
      if (formaPagamento === "Parcelamento") {
        await api.post("/parcelamentos", {
          cliente_id: clienteObjeto.id,
          descricao: `Compra de ${produto}`,
          valor_total: valorFinal,
          entrada: Number(valorPago) || 0,
          quantidade_parcelas: Number(quantidadeParcelas) || 1,
        });
      }

      // Limpa os campos do formulário
      setCliente("");
      setProduto("");
      setValorTotal("");
      setDesconto("");
      setValorPago("");
      setFormaPagamento("PIX");
      setQuantidadeParcelas("1");

      alert("Pedido e fluxo financeiro criados com sucesso!");
      await carregarDados();
      setAba("pedidos");
    } catch (erro) {
      console.error("Erro ao registrar venda/parcelamento:", erro);
      alert("Ocorreu um erro ao processar a venda.");
    }
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

    const message = `Olá ${venda.cliente}! Seu pedido na iLótica está pronto para retirada. Aguardamos sua visita!`;

    const url = numeroLimpo
      ? `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

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
      (venda.formaPagamento || "").toLowerCase().includes(texto) ||
      (venda.usuario || "").toLowerCase().includes(texto);

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

  function gerarComprovante(venda) {
    const pdf = new jsPDF();

    pdf.addImage(logo, "PNG", 75, 8, 60, 28);

    pdf.setFontSize(16);
    pdf.text("COMPROVANTE DE VENDA", 105, 45, { align: "center" });

    pdf.setFontSize(11);
    pdf.text(`Data: ${venda.data}`, 20, 62);
    pdf.text(`Cliente: ${venda.cliente}`, 20, 74);
    pdf.text(`Produto: ${venda.produto}`, 20, 86);

    pdf.line(20, 96, 190, 96);

    pdf.text(`Valor final: R$ ${Number(venda.valorTotal).toFixed(2)}`, 20, 110);
    pdf.text(`Desconto: R$ ${Number(venda.desconto || 0).toFixed(2)}`, 20, 122);
    pdf.text(`Valor pago: R$ ${Number(venda.valorPago || 0).toFixed(2)}`, 20, 134);
    pdf.text(
      `Valor restante: R$ ${Number(venda.valorRestante || 0).toFixed(2)}`,
      20,
      146
    );

    pdf.text(`Forma de pagamento: ${venda.formaPagamento}`, 20, 170);
    pdf.text(`Status: ${venda.status}`, 20, 182);
    pdf.text(`Vendedor: ${venda.usuario || "Não identificado"}`, 20, 194);

    pdf.save(`comprovante-${venda.cliente}.pdf`);
  }

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
            placeholder="Valor original"
          />

          <input
            type="number"
            value={desconto}
            onChange={(e) => setDesconto(e.target.value)}
            placeholder="Desconto"
          />

          <input
            type="number"
            value={valorPago}
            onChange={(e) => setValorPago(e.target.value)}
            placeholder="Valor pago (Entrada)"
          />

          <select
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value)}
          >
            <option value="PIX">PIX</option>
            <option value="Cartão">Cartão</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Parcelamento">Parcelamento</option>
          </select>

          {/* Campo dinâmico que aparece se a opção for Parcelamento */}
          {formaPagamento === "Parcelamento" && (
            <input
              type="number"
              min="1"
              value={quantidadeParcelas}
              onChange={(e) => setQuantidadeParcelas(e.target.value)}
              placeholder="Quantidade de Parcelas"
              required
            />
          )}

          <div className="resumo-venda">
            <span>Valor final: R$ {valorFinal.toFixed(2)}</span>
            <span>Valor pago: R$ {Number(valorPago || 0).toFixed(2)}</span>
            {formaPagamento === "Parcelamento" && (
              <span>
                Valor por parcela: R$ {(valorRestante / (Number(quantidadeParcelas) || 1)).toFixed(2)}
              </span>
            )}
            <strong>Restante: R$ {valorRestante.toFixed(2)}</strong>
          </div>

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
                placeholder="Buscar por cliente, produto, pagamento ou vendedor..."
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
                <span>Valor final: R$ {Number(venda.valorTotal).toFixed(2)}</span>
                <span>Desconto: R$ {Number(venda.desconto || 0).toFixed(2)}</span>
                <span>Valor pago: R$ {Number(venda.valorPago || 0).toFixed(2)}</span>
                <span>
                  Restante: R$ {Number(venda.valorRestante || 0).toFixed(2)}
                </span>
                <span>Pagamento: {venda.formaPagamento}</span>
                <span>Data: {venda.data}</span>

                <span>Vendedor: {venda.usuario || "Não identificado"}</span>

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

                <button type="button" onClick={() => gerarComprovante(venda)}>
                  Gerar Comprovante
                </button>
                
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
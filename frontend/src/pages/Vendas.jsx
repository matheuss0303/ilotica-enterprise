import { useEffect, useState } from "react";
import api from "../services/api";
import jsPDF from "jspdf";
import logo from "../assets/logo-ilotica.png";

function Vendas({ usuarioLogado }) {
  const [aba, setAba] = useState("novo");
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);

  // Estados do Pedido Geral
  const [cliente, setCliente] = useState("");
  const [carrinho, setCarrinho] = useState([]);
  const [desconto, setDesconto] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("PIX");
  const [quantidadeParcelas, setQuantidadeParcelas] = useState("1");

  // Estado para armazenar os vencimentos customizados das parcelas
  const [vencimentos, setVencimentos] = useState([]);

  // Estados auxiliares para a seleção de itens individuais antes de ir ao carrinho
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState("");
  const [quantidadeItem, setQuantidadeItem] = useState(1);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  // Monitora a quantidade de parcelas para gerar as datas automaticamente
  useEffect(() => {
    const qtd = Number(quantidadeParcelas) || 0;
    setTimeout(() => {
      if (formaPagamento === "Parcelamento" && qtd > 0) {
        const datasPadrao = [];
        for (let i = 1; i <= qtd; i++) {
          const data = new Date();
          data.setDate(data.getDate() + 30 * i);
          datasPadrao.push(data.toISOString().split("T")[0]);
        }
        setVencimentos(datasPadrao);
      } else {
        setVencimentos([]);
      }
    }, 0);
  }, [quantidadeParcelas, formaPagamento]);

  const handleDataChange = (index, novaData) => {
    const novasDatas = [...vencimentos];
    novasDatas[index] = novaData;
    setVencimentos(novasDatas);
  };

  async function carregarDados() {
    try {
      const clientesResposta = await api.get("/clientes");
      const produtosResposta = await api.get("/produtos");
      const vendasResposta = await api.get("/vendas");

      setClientes(clientesResposta.data);
      setProdutos(produtosResposta.data);
      setVendas(vendasResposta.data);
    } catch (erro) {
      console.error("Erro ao carregar dados:", erro);
    }
  }

  function adicionarAoCarrinho() {
    if (!produtoSelecionadoId) {
      alert("Selecione um produto antes de adicionar.");
      return;
    }

    const itemEncontrado = produtos.find((p) => String(p.id) === String(produtoSelecionadoId));
    if (!itemEncontrado) return;

    if (quantidadeItem > itemEncontrado.estoque) {
      alert(`Quantidade selecionada maior que o estoque disponível (${itemEncontrado.estoque}).`);
      return;
    }

    const ehLente = itemEncontrado.nome.toLowerCase().includes("lente");

    // Para evitar agrupar lentes diferentes em uma única linha, não acumulamos se for lente
    const itemExistenteIndex = ehLente ? -1 : carrinho.findIndex((c) => String(c.id) === String(itemEncontrado.id));

    if (itemExistenteIndex > -1) {
      const novoCarrinho = [...carrinho];
      const novaQtd = novoCarrinho[itemExistenteIndex].quantidade + quantidadeItem;
      if (novaQtd > itemEncontrado.estoque) {
        alert(`Somatório excede o estoque disponível (${itemEncontrado.estoque}).`);
        return;
      }
      novoCarrinho[itemExistenteIndex].quantidade = novaQtd;
      setCarrinho(novoCarrinho);
    } else {
      setCarrinho([
        ...carrinho,
        {
          id: itemEncontrado.id,
          nome: itemEncontrado.nome,
          precoVenda: Number(itemEncontrado.precoVenda),
          quantidade: quantidadeItem,
          ehLente: ehLente,
          descricaoCustomizada: ehLente ? "" : itemEncontrado.nome,
        },
      ]);
    }

    setProdutoSelecionadoId("");
    setQuantidadeItem(1);
  }

  function removerDoCarrinho(indexItem) {
    setCarrinho(carrinho.filter((_, index) => index !== indexItem));
  }

  // Funções para manipular a edição na linha do carrinho
  function atualizarPrecoItem(index, valor) {
    const novoCarrinho = [...carrinho];
    novoCarrinho[index].precoVenda = Number(valor) || 0;
    setCarrinho(novoCarrinho);
  }

  function atualizarDescricaoItem(index, texto) {
    const novoCarrinho = [...carrinho];
    novoCarrinho[index].descricaoCustomizada = texto;
    setCarrinho(novoCarrinho);
  }

  const valorTotalBruto = carrinho.reduce(
    (total, item) => total + item.precoVenda * item.quantidade,
    0
  );

  const valorFinal = Math.max(valorTotalBruto - Number(desconto || 0), 0);
  const valorRestante = Math.max(valorFinal - Number(valorPago || 0), 0);

  async function registrarVenda() {
    if (!cliente) {
      alert("Selecione um cliente.");
      return;
    }
    if (carrinho.length === 0) {
      alert("Adicione pelo menos um produto ao carrinho.");
      return;
    }

    const clienteObjeto = clientes.find((c) => c.nome === cliente);
    if (formaPagamento === "Parcelamento" && !clienteObjeto) {
      alert("Erro ao identificar o ID do cliente para gerar o parcelamento.");
      return;
    }

    // Se o item for uma lente e possuir descrição personalizada, grava ela na string de produtos
    const stringProdutos = carrinho.map((c) => {
      const nomeExibicao = c.ehLente && c.descricaoCustomizada ? `Lente (${c.descricaoCustomizada})` : c.nome;
      return `${nomeExibicao} (x${c.quantidade})`;
    }).join(", ");

    const hoje = new Date();
    const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;

    try {
      await api.post("/vendas", {
        cliente,
        produto: stringProdutos,
        valorTotal: valorFinal,
        desconto: Number(desconto) || 0,
        valorPago: Number(valorPago) || 0,
        valorRestante,
        formaPagamento,
        status: valorRestante > 0 ? "Aguardando Pagamento" : "Orçamento",
        usuario: usuarioLogado?.nome || "Não identificado",
        data: dataFormatada,
        itens: carrinho,
      });

      if (formaPagamento === "Parcelamento") {
        await api.post("/parcelamentos", {
          cliente_id: clienteObjeto.id,
          descricao: `Compra de: ${stringProdutos}`,
          valor_total: valorFinal,
          entrada: Number(valorPago) || 0,
          quantidade_parcelas: Number(quantidadeParcelas) || 1,
          vencimentos: vencimentos,
        });
      }

      setCliente("");
      setCarrinho([]);
      setDesconto("");
      setValorPago("");
      setFormaPagamento("PIX");
      setQuantidadeParcelas("1");
      setVencimentos([]);

      alert("Pedido e fluxo financeiro criados com sucesso!");
      await carregarDados();
      setAba("pedidos");
    } catch (erro) {
      console.error("Erro detalhado retornado pelo backend:", erro.response?.data || erro);
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
    const clienteEncontrado = clientes.find((c) => c.nome === venda.cliente);
    const numero = clienteEncontrado?.whatsapp || clienteEncontrado?.telefone || "";
    const numeroLimpo = numero.replace(/\D/g, "");

    const message = `Olá ${venda.cliente}! Seu pedido na iLótica está pronto para retirada. Aguardamos sua visita!`;
    const url = numeroLimpo
      ? `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank");
  }

  function corStatus(status) {
    switch (status) {
      case "Orçamento": return "#f59e0b";
      case "Aguardando Pagamento": return "#ef4444";
      case "Em Produção": return "#3b82f6";
      case "Pronto para Retirada": return "#10b981";
      case "Entregue": return "#64748b";
      default: return "#64748b";
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

    const bateStatus = filtroStatus === "Todos" || venda.status === filtroStatus;
    const dataISO = dataVendaParaISO(venda.data);
    const bateDataInicio = !dataInicio || dataISO >= dataInicio;
    const bateDataFim = !dataFim || dataISO <= dataFim;

    return bateBusca && bateStatus && bateDataInicio && bateDataFim;
  });

  const totalFiltrado = vendasFiltradas.reduce((total, v) => total + Number(v.valorTotal), 0);
  const emProducao = vendasFiltradas.filter((v) => v.status === "Em Produção").length;
  const prontos = vendasFiltradas.filter((v) => v.status === "Pronto para Retirada").length;
  const entregues = vendasFiltradas.filter((v) => v.status === "Entregue").length;

  function gerarComprovante(venda) {
    const pdf = new jsPDF();
    pdf.addImage(logo, "PNG", 75, 8, 60, 28);
    pdf.setFontSize(16);
    pdf.text("COMPROVANTE DE VENDA", 105, 45, { align: "center" });

    pdf.setFontSize(11);
    pdf.text(`Data: ${venda.data}`, 20, 62);
    pdf.text(`Cliente: ${venda.cliente}`, 20, 74);
    pdf.setFontSize(10);
    pdf.text(`Produtos: ${venda.produto}`, 20, 86, { maxWidth: 170 });

    pdf.line(20, 98, 190, 98);

    pdf.setFontSize(11);
    pdf.text(`Valor final: R$ ${Number(venda.valorTotal).toFixed(2)}`, 20, 112);
    pdf.text(`Desconto: R$ ${Number(venda.desconto || 0).toFixed(2)}`, 20, 124);
    pdf.text(`Valor pago: R$ ${Number(venda.valorPago || 0).toFixed(2)}`, 20, 136);
    pdf.text(`Valor restante: R$ ${Number(venda.valorRestante || 0).toFixed(2)}`, 20, 148);

    pdf.text(`Forma de pagamento: ${venda.formaPagamento}`, 20, 172);
    pdf.text(`Status: ${venda.status}`, 20, 184);
    pdf.text(`Vendedor: ${venda.usuario || "Não identificado"}`, 20, 196);

    pdf.save(`comprovante-${venda.cliente}.pdf`);
  }

  return (
    <section className="page">
      <h1>Pedidos e Vendas</h1>
      <p>Gestão comercial, filtros e acompanhamento dos pedidos da iLótica.</p>

      <div className="abas-internas">
        <button className={aba === "novo" ? "aba-ativa" : ""} onClick={() => setAba("novo")}>
          Novo Pedido
        </button>
        <button className={aba === "filtros" ? "aba-ativa" : ""} onClick={() => setAba("filtros")}>
          Filtros
        </button>
        <button className={aba === "pedidos" ? "aba-ativa" : ""} onClick={() => setAba("pedidos")}>
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

          <div style={{ gridColumn: "span 2", display: "flex", gap: "10px", alignItems: "center" }}>
            <select
              style={{ flex: 2, marginBottom: 0 }}
              value={produtoSelecionadoId}
              onChange={(e) => setProdutoSelecionadoId(e.target.value)}
            >
              <option value="">Selecione um produto para adicionar...</option>
              {produtos.map((item) => (
                <option key={item.id} value={item.id} disabled={item.estoque <= 0}>
                  {item.nome} | Valor: R$ {Number(item.precoVenda).toFixed(2)} (Estoque: {item.estoque})
                </option>
              ))}
            </select>

            <input
              style={{ flex: 0.5, marginBottom: 0, minWidth: "70px" }}
              type="number"
              min="1"
              value={quantidadeItem}
              onChange={(e) => setQuantidadeItem(Math.max(1, Number(e.target.value)))}
              placeholder="Qtd"
            />

            <button
              type="button"
              style={{ flex: 0.8, whiteSpace: "nowrap", background: "#2563eb", color: "#fff", padding: "0 14px" }}
              onClick={adicionarAoCarrinho}
            >
              ＋ Adicionar Item
            </button>
          </div>

          {carrinho.length > 0 && (
            <div style={{ gridColumn: "span 2", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px", borderRadius: "6px", margin: "5px 0 15px 0" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#0f172a" }}>🛒 Produtos Adicionados</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {carrinho.map((item, idx) => (
                  <div key={idx} style={{ background: "#fff", padding: "12px", borderRadius: "6px", border: "1px solid #edf2f7" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: item.ehLente ? "8px" : "0" }}>
                      <div>
                        <span style={{ fontWeight: "600" }}>{item.nome}</span>
                        {!item.ehLente && (
                          <small style={{ color: "#64748b", marginLeft: "10px" }}>
                            ({item.quantidade}x R$ {item.precoVenda.toFixed(2)})
                          </small>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                        {item.ehLente ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "13px", color: "#475569" }}>R$</span>
                            <input 
                              type="number"
                              value={item.precoVenda}
                              onChange={(e) => atualizarPrecoItem(idx, e.target.value)}
                              style={{ width: "90px", padding: "4px 6px", marginBottom: 0, fontSize: "14px", fontWeight: "bold", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                            />
                          </div>
                        ) : (
                          <span style={{ fontWeight: "bold" }}>R$ {(item.precoVenda * item.quantidade).toFixed(2)}</span>
                        )}
                        <button
                          type="button"
                          style={{ padding: "4px 8px", background: "#ef4444", color: "#fff", fontSize: "12px", width: "auto" }}
                          onClick={() => removerDoCarrinho(idx)}
                        >
                          Remover
                        </button>
                      </div>
                    </div>

                    {/* Campo customizado que só abre se o item for Lente */}
                    {item.ehLente && (
                      <input 
                        type="text"
                        placeholder="Informe o Laboratório, Marca, Grau ou Tratamentos da Lente..."
                        value={item.descricaoCustomizada}
                        onChange={(e) => atualizarDescricaoItem(idx, e.target.value)}
                        style={{ width: "100%", padding: "6px 10px", marginTop: "4px", marginBottom: 0, fontSize: "13px", border: "1px solid #2563eb", borderRadius: "4px", background: "#f0f9ff" }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <input
            type="text"
            value={carrinho.length > 0 ? `Valor Bruto Total: R$ ${valorTotalBruto.toFixed(2)}` : "Carrinho Vazio"}
            disabled
            placeholder="Valor original"
            style={{ fontWeight: "bold", background: "#f1f5f9" }}
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

          <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
            <option value="PIX">PIX</option>
            <option value="Cartão">Cartão</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Parcelamento">Parcelamento</option>
          </select>

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

          {formaPagamento === "Parcelamento" && vencimentos.length > 0 && (
            <div style={{ gridColumn: "span 2", background: "#f8fafc", border: "1px solid #cbd5e1", padding: "15px", borderRadius: "6px", margin: "10px 0" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#1e293b" }}>📅 Ajustar Datas de Vencimento</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
                {vencimentos.map((data, index) => (
                  <div key={index} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "bold", color: "#475569" }}>
                      {index + 1}ª Parcela:
                    </label>
                    <input
                      type="date"
                      value={data}
                      onChange={(e) => handleDataChange(index, e.target.value)}
                      style={{ padding: "6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    />
                  </div>
                ))}
              </div>
            </div>
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

              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                <option value="Todos">Todos os status</option>
                <option value="Orçamento">Orçamento</option>
                <option value="Aguardando Pagamento">Aguardando Pagamento</option>
                <option value="Em Produção">Em Produção</option>
                <option value="Pronto para Retirada">Pronto para Retirada</option>
                <option value="Entregue">Entregue</option>
              </select>

              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />

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
                <span>Produtos: {venda.produto}</span>
                <span>Valor final: R$ {Number(venda.valorTotal).toFixed(2)}</span>
                <span>Desconto: R$ {Number(venda.desconto || 0).toFixed(2)}</span>
                <span>Valor pago: R$ {Number(venda.valorPago || 0).toFixed(2)}</span>
                <span>Restante: R$ {Number(venda.valorRestante || 0).toFixed(2)}</span>
                <span>Pagamento: {venda.formaPagamento}</span>
                <span>Data: {venda.data}</span>
                <span>Vendedor: {venda.usuario || "Não identificado"}</span>

                <span style={{ fontWeight: "bold", color: corStatus(venda.status) }}>
                  Status: {venda.status}
                </span>

                <select value={venda.status} onChange={(e) => alterarStatus(venda.id, e.target.value)}>
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
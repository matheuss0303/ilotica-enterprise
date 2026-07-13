import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import api from "../services/api";
import logo from "../assets/logo-ilotica.png";

function Financeiro() {
  const [aba, setAba] = useState("resumo");
  const [vendas, setVendas] = useState([]);
  
  // Estados para controle de Devedores e Parcelas
  const [devedores, setDevedores] = useState([]);
  const [parcelasDetalhes, setParcelasDetalhes] = useState([]);
  const [parcelamentoSelecionado, setParcelamentoSelecionado] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);

  // 🆕 NOVOS ESTADOS: Controlam qual parcela foi clicada e o valor customizado digitado
  const [parcelaIdSelecionada, setParcelaIdSelecionada] = useState("");
  const [valorPagoEditavel, setValorPagoEditavel] = useState("");

  const [mesSelecionado, setMesSelecionado] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    buscarVendas();
    buscarDevedores();
  }, []);

  async function buscarVendas() {
    try {
      const resposta = await api.get("/vendas");
      setVendas(resposta.data);
    } catch (erro) {
      console.error("Erro ao buscar vendas:", erro);
    }
  }

  async function buscarDevedores() {
    try {
      const resposta = await api.get("/financeiro/devedores");
      setDevedores(resposta.data);
    } catch (erro) {
      console.error("Erro ao buscar devedores:", erro);
    }
  }

  async function abrirDetalhesParcelas(parcelamento) {
    try {
      const resposta = await api.get(`/parcelamentos/detalhes/${parcelamento.id}`);
      setParcelasDetalhes(resposta.data);
      setParcelamentoSelecionado(parcelamento);
      
      // 🆕 Pré-seleciona automaticamente a primeira parcela que não estiver paga
      const proximaPendente = resposta.data.find(p => p.status !== "Pago");
      if (proximaPendente) {
        setParcelaIdSelecionada(proximaPendente.id);
        setValorPagoEditavel(proximaPendente.valor);
      } else {
        setParcelaIdSelecionada("");
        setValorPagoEditavel("");
      }

      setModalAberto(true);
    } catch (erro) {
      console.error("Erro ao buscar detalhes das parcelas:", erro);
    }
  }

  // 🆕 Função modificada para enviar a parcela exata e o valor que você editou
  async function confirmarPagamentoParcela() {
    if (!parcelamentoSelecionado || !parcelaIdSelecionada) {
      alert("Por favor, selecione uma parcela para dar baixa.");
      return;
    }

    try {
      const resposta = await api.put(`/parcelamentos/${parcelamentoSelecionado.id}/pagar-parcela`, {
        usuario: "Financeiro",
        parcelaId: parcelaIdSelecionada,      // Envia qual parcela está recebendo
        valorPago: Number(valorPagoEditavel)   // Envia o valor customizado (ex: 70.00)
      });

      alert(resposta.data.mensagem);

      buscarDevedores();
      
      if (resposta.data.dados?.status === "Quitado") {
        setModalAberto(false);
      } else {
        const atualizadas = await api.get(`/parcelamentos/detalhes/${parcelamentoSelecionado.id}`);
        setParcelasDetalhes(atualizadas.data);

        // Define a próxima pendente como selecionada após a atualização
        const proxima = atualizadas.data.find(p => p.status !== "Pago");
        if (proxima) {
          setParcelaIdSelecionada(proxima.id);
          setValorPagoEditavel(proxima.valor);
        } else {
          setParcelaIdSelecionada("");
          setValorPagoEditavel("");
        }
      }
    } catch (erro) {
      alert(erro.response?.data?.mensagem || "Erro ao processar o pagamento.");
    }
  }

  // 🆕 Função para quando você clicar em cima de uma linha de parcela pendente
  function selecionarLinhaParcela(parc) {
    if (parc.status === "Pago") return;
    setParcelaIdSelecionada(parc.id);
    setValorPagoEditavel(parc.valor); // Alimenta o input com o valor padrão dela para você editar
  }

  function dataBRParaISO(dataBR) {
    if (!dataBR) return "";
    const partes = dataBR.split("/");
    if (partes.length !== 3) return "";
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
  }

  function limparFiltrosRelatorio() {
    setMesSelecionado("");
    setDataInicio("");
    setDataFim("");
  }

  const vendasFiltradasRelatorio = vendas.filter((venda) => {
    const dataISO = dataBRParaISO(venda.data);
    if (!dataISO) return false;

    if (mesSelecionado) {
      return dataISO.startsWith(mesSelecionado);
    }

    const bateDataInicio = !dataInicio || dataISO >= dataInicio;
    const bateDataFim = !dataFim || dataISO <= dataFim;

    return bateDataInicio && bateDataFim;
  });

  const faturamentoTotal = vendas.reduce((total, venda) => total + Number(venda.valorTotal), 0);
  const totalPedidos = vendas.length;
  const ticketMedio = totalPedidos > 0 ? faturamentoTotal / totalPedidos : 0;

  const pix = vendas.filter((venda) => venda.formaPagamento === "PIX").reduce((total, venda) => total + Number(venda.valorTotal), 0);
  const cartao = vendas.filter((venda) => venda.formaPagamento === "Cartão").reduce((total, venda) => total + Number(venda.valorTotal), 0);
  const dinheiro = vendas.filter((venda) => venda.formaPagamento === "Dinheiro").reduce((total, venda) => total + Number(venda.valorTotal), 0);

  const faturamentoFiltrado = vendasFiltradasRelatorio.reduce((total, venda) => total + Number(venda.valorTotal), 0);
  const totalPedidosFiltrado = vendasFiltradasRelatorio.length;
  const ticketMedioFiltrado = totalPedidosFiltrado > 0 ? faturamentoFiltrado / totalPedidosFiltrado : 0;

  const pixFiltrado = vendasFiltradasRelatorio.filter((venda) => venda.formaPagamento === "PIX").reduce((total, venda) => total + Number(venda.valorTotal), 0);
  const cartaoFiltrado = vendasFiltradasRelatorio.filter((venda) => venda.formaPagamento === "Cartão").reduce((total, venda) => total + Number(venda.valorTotal), 0);
  const dinheiroFiltrado = vendasFiltradasRelatorio.filter((venda) => venda.formaPagamento === "Dinheiro").reduce((total, venda) => total + Number(venda.valorTotal), 0);

  function gerarPDF() {
    const pdf = new jsPDF();

    pdf.addImage(logo, "PNG", 75, 8, 60, 28);
    pdf.setFontSize(14);
    pdf.text("RELATÓRIO FINANCEIRO", 105, 45, { align: "center" });

    pdf.setFontSize(10);
    pdf.text(`Data de emissão: ${new Date().toLocaleDateString("pt-BR")}`, 15, 60);

    if (mesSelecionado) {
      const [ano, mes] = mesSelecionado.split("-");
      pdf.text(`Período: ${mes}/${ano}`, 15, 68);
    } else if (dataInicio || dataFim) {
      pdf.text(`Período: ${dataInicio || "Início"} até ${dataFim || "Hoje"}`, 15, 68);
    } else {
      pdf.text("Período: Todas as vendas", 15, 68);
    }

    pdf.text(`Faturamento Total: R$ ${faturamentoFiltrado.toFixed(2)}`, 15, 82);
    pdf.text(`Total de Pedidos: ${totalPedidosFiltrado}`, 15, 92);
    pdf.text(`Ticket Médio: R$ ${ticketMedioFiltrado.toFixed(2)}`, 15, 102);

    pdf.text(`PIX: R$ ${pixFiltrado.toFixed(2)}`, 15, 122);
    pdf.text(`Cartão: R$ ${cartaoFiltrado.toFixed(2)}`, 15, 132);
    pdf.text(`Dinheiro: R$ ${dinheiroFiltrado.toFixed(2)}`, 15, 142);

    pdf.setFontSize(12);
    pdf.text("Vendas", 15, 160);

    let y = 170;
    vendasFiltradasRelatorio.forEach((venda) => {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
      pdf.setFontSize(9);
      pdf.text(`Cliente: ${venda.cliente} | Produto: ${venda.produto}`, 15, y);
      pdf.text(`Valor: R$ ${Number(venda.valorTotal).toFixed(2)} | Pagamento: ${venda.formaPagamento} | Data: ${venda.data}`, 15, y + 6);
      pdf.text(`Status: ${venda.status} | Vendedor: ${venda.usuario || "Não identificado"}`, 15, y + 12);
      y += 22;
    });

    pdf.save("relatorio-financeiro-il-otica.pdf");
  }

  return (
    <section className="page">
      <h1>Financeiro</h1>
      <p>Controle financeiro e relatórios da IL Ótica.</p>

      <div className="abas-internas">
        <button className={aba === "resumo" ? "aba-ativa" : ""} onClick={() => setAba("resumo")}>Resumo</button>
        <button className={aba === "pagamentos" ? "aba-ativa" : ""} onClick={() => setAba("pagamentos")}>Pagamentos</button>
        <button className={aba === "devedores" ? "aba-ativa" : ""} onClick={() => setAba("devedores")}>Contas a Receber</button>
        <button className={aba === "relatorio" ? "aba-ativa" : ""} onClick={() => setAba("relatorio")}>Relatório</button>
      </div>

      {aba === "resumo" && (
        <section className="cards">
          <div className="card"><span>Faturamento Total</span><strong>R$ {faturamentoTotal.toFixed(2)}</strong></div>
          <div className="card"><span>Total de Pedidos</span><strong>{totalPedidos}</strong></div>
          <div className="card"><span>Ticket Médio</span><strong>R$ {ticketMedio.toFixed(2)}</strong></div>
        </section>
      )}

      {aba === "pagamentos" && (
        <section className="cards">
          <div className="card"><span>PIX</span><strong>R$ {pix.toFixed(2)}</strong></div>
          <div className="card"><span>Cartão</span><strong>R$ {cartao.toFixed(2)}</strong></div>
          <div className="card"><span>Dinheiro</span><strong>R$ {dinheiro.toFixed(2)}</strong></div>
        </section>
      )}

      {aba === "devedores" && (
        <div className="lista">
          <h2>Contas com Parcelas em Aberto 🔴</h2>
          {devedores.length === 0 ? (
            <p>Nenhum cliente inadimplente ou com parcelamento em aberto.</p>
          ) : (
            devedores.map((p) => (
              <div className="item" key={p.id} style={{ borderLeft: "5px solid #ef4444" }}>
                <strong>{p.cliente_nome}</strong>
                <span>📞 Contato: {p.cliente_telefone || "Não cadastrado"}</span>
                <span>📝 Descrição: {p.descricao || "Venda via Carnê / Parcelamento"}</span>
                
                <div style={{ margin: "8px 0", fontSize: "14px" }}>
                  <span>Valor do Plano: <strong>R$ {Number(p.valor_total).toFixed(2)}</strong></span> |{" "}
                  <span>Restante: <strong style={{ color: "#ef4444" }}>R$ {Number(p.valor_restante).toFixed(2)}</strong></span>
                </div>

                <div style={{ fontSize: "13px", color: "#64748b" }}>
                  <span>Parcelas Pagas: {p.parcelas_pagas} de {p.quantidade_parcelas}</span> |{" "}
                  <span>Valor da Parcela: R$ {Number(p.valor_parcela).toFixed(2)}</span>
                </div>

                <button 
                  type="button" 
                  style={{ marginTop: "12px", background: "#0f172a", color: "#fff" }}
                  onClick={() => abrirDetalhesParcelas(p)}
                >
                  Ver Parcelas e Dar Baixa
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {aba === "relatorio" && (
        <div className="lista">
          <h2>Relatório de Vendas</h2>
          <div className="painel-filtros">
            <h3>Filtrar relatório</h3>
            <div className="filtros-grid">
              <input type="month" value={mesSelecionado} onChange={(e) => { setMesSelecionado(e.target.value); setDataInicio(""); setDataFim(""); }} />
              <input type="date" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setMesSelecionado(""); }} />
              <input type="date" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setMesSelecionado(""); }} />
              <button type="button" onClick={limparFiltrosRelatorio}>Limpar Filtros</button>
              <button type="button" onClick={gerarPDF}>Exportar Relatório PDF</button>
            </div>
          </div>

          <section className="cards cards-menores">
            <div className="card"><span>Faturamento Filtrado</span><strong>R$ {faturamentoFiltrado.toFixed(2)}</strong></div>
            <div className="card"><span>Pedidos no Período</span><strong>{totalPedidosFiltrado}</strong></div>
            <div className="card"><span>Ticket Médio</span><strong>R$ {ticketMedioFiltrado.toFixed(2)}</strong></div>
            <div className="card"><span>PIX</span><strong>R$ {pixFiltrado.toFixed(2)}</strong></div>
            <div className="card"><span>Cartão</span><strong>R$ {cartaoFiltrado.toFixed(2)}</strong></div>
            <div className="card"><span>Dinheiro</span><strong>R$ {dinheiroFiltrado.toFixed(2)}</strong></div>
          </section>

          {vendasFiltradasRelatorio.length === 0 ? (
            <p>Nenhuma venda encontrada para o período selecionado.</p>
          ) : (
            vendasFiltradasRelatorio.map((venda) => (
              <div className="item" key={venda.id}>
                <strong>{venda.cliente}</strong>
                <span>Produto: {venda.produto}</span>
                <span>Valor: R$ {Number(venda.valorTotal).toFixed(2)}</span>
                <span>Pagamento: {venda.formaPagamento}</span>
                <span>Status: {venda.status}</span>
                <span>Vendedor: {venda.usuario || "Não identificado"}</span>
                <small>Data: {venda.data}</small>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL DE HISTÓRICO ATUALIZADO COM ENTRADA DE VALOR EDITÁVEL */}
      {modalAberto && parcelamentoSelecionado && (
        <div className="modal-overlay" style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
        }}>
          <div className="modal-content" style={{
            background: "#fff", padding: "24px", borderRadius: "8px", width: "90%", maxWidth: "550px", maxHeight: "85vh", overflowY: "auto"
          }}>
            <h3>Histórico de Parcelas</h3>
            <p>Cliente: <strong>{parcelamentoSelecionado.cliente_nome}</strong></p>
            <p style={{ fontSize: "14px", margin: "-8px 0 16px 0", color: "#64748b" }}>
              Restante do Plano: R$ {Number(parcelamentoSelecionado.valor_restante).toFixed(2)}
            </p>

            {/* Listagem das Parcelas Interativas */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
              {parcelasDetalhes.map((parc) => {
                const estaSelecionada = parcelaIdSelecionada === parc.id;
                return (
                  <div 
                    key={parc.id} 
                    onClick={() => selecionarLinhaParcela(parc)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px", borderRadius: "6px", 
                      background: parc.status === "Pago" ? "#f0fdf4" : (estaSelecionada ? "#eff6ff" : "#fef2f2"),
                      border: parc.status === "Pago" ? "1px solid #bbf7d0" : (estaSelecionada ? "2px solid #3b82f6" : "1px solid #fecaca"),
                      cursor: parc.status === "Pago" ? "default" : "pointer"
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: "bold" }}>
                        {estaSelecionada ? "🔵 " : ""}Parcela {parc.numero}
                      </span>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Vencimento: {parc.vencimento.split("-").reverse().join("/")}
                        {parc.data_pagamento && ` | Pago em: ${parc.data_pagamento.split("-").reverse().join("/")}`}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontWeight: "600" }}>R$ {Number(parc.valor).toFixed(2)}</span>
                      <span style={{
                        fontSize: "11px", fontWeight: "700", padding: "2px 6px", borderRadius: "4px",
                        background: parc.status === "Pago" ? "#22c55e" : "#ef4444", color: "#fff"
                      }}>
                        {parc.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 🆕 CAMPO DE EDIÇÃO DO VALOR RECEBIDO */}
            {parcelaIdSelecionada && (
              <div style={{
                background: "#f0f9ff", padding: "16px", borderRadius: "8px", 
                marginBottom: "20px", border: "1px solid #bae6fd"
              }}>
                <label style={{ fontSize: "14px", fontWeight: "700", color: "#0369a1", display: "block", marginBottom: "6px" }}>
                  💰 VALOR RECEBIDO DESTA PARCELA (R$):
                </label>
                <input 
                  type="number"
                  step="0.01"
                  style={{
                    width: "100%", padding: "10px", borderRadius: "6px", 
                    border: "2px solid #0284c7", fontSize: "18px", fontWeight: "bold",
                    color: "#0f172a", background: "#ffffff"
                  }}
                  value={valorPagoEditavel}
                  onChange={(e) => setValorPagoEditavel(e.target.value)} // Libera a digitação (ex: de 50 para 70)
                />
                <small style={{ color: "#0284c7", marginTop: "6px", display: "block", fontWeight: "500" }}>
                  💡 Clique em cima de qualquer parcela da lista para selecioná-la e altere o valor acima se o cliente pagou a mais ou a menos.
                </small>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "end" }}>
              <button 
                type="button" 
                style={{ background: "#94a3b8", color: "#fff" }} 
                onClick={() => setModalAberto(false)}
              >
                Fechar
              </button>
              
              {parcelamentoSelecionado.valor_restante > 0 && parcelaIdSelecionada && (
                <button 
                  type="button" 
                  style={{ background: "#22c55e", color: "#fff", fontWeight: "bold" }}
                  onClick={confirmarPagamentoParcela}
                >
                  Confirmar Recebimento
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Financeiro;
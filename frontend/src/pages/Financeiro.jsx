import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import api from "../services/api";
import logo from "../assets/logo-ilotica.png";

function Financeiro() {
  const [aba, setAba] = useState("resumo");
  const [vendas, setVendas] = useState([]);

  const [mesSelecionado, setMesSelecionado] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    buscarVendas();
  }, []);

  async function buscarVendas() {
    const resposta = await api.get("/vendas");
    setVendas(resposta.data);
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

  const faturamentoTotal = vendas.reduce(
    (total, venda) => total + Number(venda.valorTotal),
    0
  );

  const totalPedidos = vendas.length;
  const ticketMedio = totalPedidos > 0 ? faturamentoTotal / totalPedidos : 0;

  const pix = vendas
    .filter((venda) => venda.formaPagamento === "PIX")
    .reduce((total, venda) => total + Number(venda.valorTotal), 0);

  const cartao = vendas
    .filter((venda) => venda.formaPagamento === "Cartão")
    .reduce((total, venda) => total + Number(venda.valorTotal), 0);

  const dinheiro = vendas
    .filter((venda) => venda.formaPagamento === "Dinheiro")
    .reduce((total, venda) => total + Number(venda.valorTotal), 0);

  const faturamentoFiltrado = vendasFiltradasRelatorio.reduce(
    (total, venda) => total + Number(venda.valorTotal),
    0
  );

  const totalPedidosFiltrado = vendasFiltradasRelatorio.length;

  const ticketMedioFiltrado =
    totalPedidosFiltrado > 0
      ? faturamentoFiltrado / totalPedidosFiltrado
      : 0;

  const pixFiltrado = vendasFiltradasRelatorio
    .filter((venda) => venda.formaPagamento === "PIX")
    .reduce((total, venda) => total + Number(venda.valorTotal), 0);

  const cartaoFiltrado = vendasFiltradasRelatorio
    .filter((venda) => venda.formaPagamento === "Cartão")
    .reduce((total, venda) => total + Number(venda.valorTotal), 0);

  const dinheiroFiltrado = vendasFiltradasRelatorio
    .filter((venda) => venda.formaPagamento === "Dinheiro")
    .reduce((total, venda) => total + Number(venda.valorTotal), 0);

  function gerarPDF() {
    const pdf = new jsPDF();

    pdf.addImage(logo, "PNG", 75, 8, 60, 28);

    pdf.setFontSize(14);
    pdf.text("RELATÓRIO FINANCEIRO", 105, 45, { align: "center" });

    pdf.setFontSize(10);
    pdf.text(
      `Data de emissão: ${new Date().toLocaleDateString("pt-BR")}`,
      15,
      60
    );

    if (mesSelecionado) {
      const [ano, mes] = mesSelecionado.split("-");
      pdf.text(`Período: ${mes}/${ano}`, 15, 68);
    } else if (dataInicio || dataFim) {
      pdf.text(
        `Período: ${dataInicio || "Início"} até ${dataFim || "Hoje"}`,
        15,
        68
      );
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

      pdf.text(
        `Cliente: ${venda.cliente} | Produto: ${venda.produto}`,
        15,
        y
      );

      pdf.text(
        `Valor: R$ ${Number(venda.valorTotal).toFixed(2)} | Pagamento: ${
          venda.formaPagamento
        } | Data: ${venda.data}`,
        15,
        y + 6
      );

      pdf.text(
        `Status: ${venda.status} | Vendedor: ${
          venda.usuario || "Não identificado"
        }`,
        15,
        y + 12
      );

      y += 22;
    });

    pdf.save("relatorio-financeiro-il-otica.pdf");
  }

  return (
    <section className="page">
      <h1>Financeiro</h1>
      <p>Controle financeiro e relatórios da IL Ótica.</p>

      <div className="abas-internas">
        <button
          className={aba === "resumo" ? "aba-ativa" : ""}
          onClick={() => setAba("resumo")}
        >
          Resumo
        </button>

        <button
          className={aba === "pagamentos" ? "aba-ativa" : ""}
          onClick={() => setAba("pagamentos")}
        >
          Pagamentos
        </button>

        <button
          className={aba === "relatorio" ? "aba-ativa" : ""}
          onClick={() => setAba("relatorio")}
        >
          Relatório
        </button>
      </div>

      {aba === "resumo" && (
        <section className="cards">
          <div className="card">
            <span>Faturamento Total</span>
            <strong>R$ {faturamentoTotal.toFixed(2)}</strong>
          </div>

          <div className="card">
            <span>Total de Pedidos</span>
            <strong>{totalPedidos}</strong>
          </div>

          <div className="card">
            <span>Ticket Médio</span>
            <strong>R$ {ticketMedio.toFixed(2)}</strong>
          </div>
        </section>
      )}

      {aba === "pagamentos" && (
        <section className="cards">
          <div className="card">
            <span>PIX</span>
            <strong>R$ {pix.toFixed(2)}</strong>
          </div>

          <div className="card">
            <span>Cartão</span>
            <strong>R$ {cartao.toFixed(2)}</strong>
          </div>

          <div className="card">
            <span>Dinheiro</span>
            <strong>R$ {dinheiro.toFixed(2)}</strong>
          </div>
        </section>
      )}

      {aba === "relatorio" && (
        <div className="lista">
          <h2>Relatório de Vendas</h2>

          <div className="painel-filtros">
            <h3>Filtrar relatório</h3>

            <div className="filtros-grid">
              <input
                type="month"
                value={mesSelecionado}
                onChange={(e) => {
                  setMesSelecionado(e.target.value);
                  setDataInicio("");
                  setDataFim("");
                }}
              />

              <input
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  setMesSelecionado("");
                }}
              />

              <input
                type="date"
                value={dataFim}
                onChange={(e) => {
                  setDataFim(e.target.value);
                  setMesSelecionado("");
                }}
              />

              <button type="button" onClick={limparFiltrosRelatorio}>
                Limpar Filtros
              </button>

              <button type="button" onClick={gerarPDF}>
                Exportar Relatório PDF
              </button>
            </div>
          </div>

          <section className="cards cards-menores">
            <div className="card">
              <span>Faturamento Filtrado</span>
              <strong>R$ {faturamentoFiltrado.toFixed(2)}</strong>
            </div>

            <div className="card">
              <span>Pedidos no Período</span>
              <strong>{totalPedidosFiltrado}</strong>
            </div>

            <div className="card">
              <span>Ticket Médio</span>
              <strong>R$ {ticketMedioFiltrado.toFixed(2)}</strong>
            </div>

            <div className="card">
              <span>PIX</span>
              <strong>R$ {pixFiltrado.toFixed(2)}</strong>
            </div>

            <div className="card">
              <span>Cartão</span>
              <strong>R$ {cartaoFiltrado.toFixed(2)}</strong>
            </div>

            <div className="card">
              <span>Dinheiro</span>
              <strong>R$ {dinheiroFiltrado.toFixed(2)}</strong>
            </div>
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
                <span>
                  Vendedor: {venda.usuario || "Não identificado"}
                </span>
                <small>Data: {venda.data}</small>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

export default Financeiro;
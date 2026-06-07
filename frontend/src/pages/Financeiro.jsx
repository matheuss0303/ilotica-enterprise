import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import api from "../services/api";
import logo from "../assets/logo-ilotica.png";

function Financeiro() {
  const [aba, setAba] = useState("resumo");
  const [vendas, setVendas] = useState([]);

  useEffect(() => {
    buscarVendas();
  }, []);

  async function buscarVendas() {
    const resposta = await api.get("/vendas");
    setVendas(resposta.data);
  }

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

  function gerarPDF() {
    const pdf = new jsPDF();

    pdf.addImage(logo, "PNG", 75, 8, 60, 28);

    pdf.setFontSize(14);
    pdf.text("RELATÓRIO FINANCEIRO", 105, 45, { align: "center" });

    pdf.setFontSize(10);
    pdf.text(`Data de emissão: ${new Date().toLocaleDateString("pt-BR")}`, 15, 60);

    pdf.text(`Faturamento Total: R$ ${faturamentoTotal.toFixed(2)}`, 15, 75);
    pdf.text(`Total de Pedidos: ${totalPedidos}`, 15, 85);
    pdf.text(`Ticket Médio: R$ ${ticketMedio.toFixed(2)}`, 15, 95);

    pdf.text(`PIX: R$ ${pix.toFixed(2)}`, 15, 115);
    pdf.text(`Cartão: R$ ${cartao.toFixed(2)}`, 15, 125);
    pdf.text(`Dinheiro: R$ ${dinheiro.toFixed(2)}`, 15, 135);

    pdf.setFontSize(12);
    pdf.text("Vendas", 15, 155);

    let y = 165;

    vendas.forEach((venda) => {
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

      y += 16;
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

          <button type="button" onClick={gerarPDF}>
            Exportar Relatório PDF
          </button>

          {vendas.length === 0 ? (
            <p>Nenhuma venda registrada.</p>
          ) : (
            vendas.map((venda) => (
              <div className="item" key={venda.id}>
                <strong>{venda.cliente}</strong>
                <span>Produto: {venda.produto}</span>
                <span>Valor: R$ {Number(venda.valorTotal).toFixed(2)}</span>
                <span>Pagamento: {venda.formaPagamento}</span>
                <span>Status: {venda.status}</span>
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
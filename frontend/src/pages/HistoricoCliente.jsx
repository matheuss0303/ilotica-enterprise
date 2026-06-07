import jsPDF from "jspdf";
import logo from "../assets/logo-ilotica.png";

function HistoricoCliente({ historico, voltar }) {
  function criarTabelaPDF(pdf, titulo, x, y, exame, tipo) {
    pdf.setLineWidth(0.3);
    pdf.rect(x, y, 180, 36);

    pdf.line(x, y + 9, x + 180, y + 9);
    pdf.line(x, y + 18, x + 180, y + 18);
    pdf.line(x, y + 27, x + 180, y + 27);

    pdf.line(x + 30, y, x + 30, y + 36);
    pdf.line(x + 70, y, x + 70, y + 36);
    pdf.line(x + 110, y, x + 110, y + 36);
    pdf.line(x + 145, y, x + 145, y + 36);

    pdf.setFontSize(9);
    pdf.text(titulo, x + 10, y + 6);
    pdf.text("Esférico", x + 40, y + 6);
    pdf.text("Cilíndrico", x + 78, y + 6);
    pdf.text("Eixo", x + 122, y + 6);
    pdf.text("D.N.P", x + 155, y + 6);

    pdf.text("OD", x + 10, y + 15);
    pdf.text(exame[`${tipo}_od_esferico`] || "-", x + 40, y + 15);
    pdf.text(exame[`${tipo}_od_cilindrico`] || "-", x + 78, y + 15);
    pdf.text(exame[`${tipo}_od_eixo`] || "-", x + 122, y + 15);
    pdf.text(exame[`${tipo}_od_dnp`] || "-", x + 155, y + 15);

    pdf.text("OE", x + 10, y + 24);
    pdf.text(exame[`${tipo}_oe_esferico`] || "-", x + 40, y + 24);
    pdf.text(exame[`${tipo}_oe_cilindrico`] || "-", x + 78, y + 24);
    pdf.text(exame[`${tipo}_oe_eixo`] || "-", x + 122, y + 24);
    pdf.text(exame[`${tipo}_oe_dnp`] || "-", x + 155, y + 24);
  }

  function gerarPDF(exame) {
    const pdf = new jsPDF();
    const numeroOS = String(exame.id).padStart(4, "0");

    pdf.addImage(logo, "PNG", 75, 8, 60, 28);

    pdf.setFontSize(10);
    pdf.text(`O.S Nº ${numeroOS}`, 160, 18);

    pdf.setFontSize(12);
    pdf.text("RECEITA OFTALMOLÓGICA", 105, 42, { align: "center" });

    criarTabelaPDF(pdf, "Longe", 15, 52, exame, "longe");
    criarTabelaPDF(pdf, "Perto", 15, 98, exame, "perto");

    pdf.setFontSize(10);

    pdf.text(`ADIÇÃO: ${exame.adicao || ""}`, 15, 150);
    pdf.text(`MÉDICO: ${exame.medico || ""}`, 105, 150);

    pdf.text(`CLIENTE: ${historico.cliente.nome}`, 15, 166);
    pdf.text(`TIPO DE LENTE: ${exame.tipo_lente || ""}`, 15, 182);
    pdf.text(`DATA: ${exame.data || ""}`, 15, 198);

    pdf.text("OBSERVAÇÕES:", 15, 216);
    pdf.text(exame.observacoes || "Sem observações.", 15, 225, {
      maxWidth: 175,
    });

    pdf.save(`OS-${numeroOS}-${historico.cliente.nome}.pdf`);
  }

  if (!historico || !historico.cliente) {
    return (
      <section className="page">
        <h1>Histórico do Cliente</h1>
        <p>Cliente não encontrado.</p>
        <button type="button" onClick={voltar}>
          Voltar
        </button>
      </section>
    );
  }

  return (
    <section className="page">
      <button type="button" onClick={voltar}>
        Voltar
      </button>

      <h1>{historico.cliente.nome}</h1>

      <p>Telefone: {historico.cliente.telefone}</p>
      <p>WhatsApp: {historico.cliente.whatsapp || "Não informado"}</p>
      <p>CPF: {historico.cliente.cpf || "Não informado"}</p>
      <p>Total gasto: R$ {Number(historico.totalGasto).toFixed(2)}</p>

      <div className="lista">
        <h2>Compras</h2>

        {historico.vendas.length === 0 ? (
          <p>Nenhuma compra registrada.</p>
        ) : (
          historico.vendas.map((venda) => (
            <div className="item" key={venda.id}>
              <strong>{venda.produto}</strong>
              <span>Valor: R$ {Number(venda.valorTotal).toFixed(2)}</span>
              <span>Pagamento: {venda.formaPagamento}</span>
              <span>Status: {venda.status}</span>
              <span>Data: {venda.data}</span>
            </div>
          ))
        )}
      </div>

      <div className="lista">
        <h2>Receitas / O.S.</h2>

        {historico.exames.length === 0 ? (
          <p>Nenhuma receita cadastrada.</p>
        ) : (
          historico.exames.map((exame) => (
            <div className="item pedido-card" key={exame.id}>
              <strong>
                O.S Nº {String(exame.id).padStart(4, "0")} - {exame.data}
              </strong>

              <span>Médico: {exame.medico || "Não informado"}</span>
              <span>Tipo de lente: {exame.tipo_lente || "Não informado"}</span>
              <span>Adição: {exame.adicao || "Não informada"}</span>

              <span>
                Longe OD: {exame.longe_od_esferico || "-"} /{" "}
                {exame.longe_od_cilindrico || "-"} /{" "}
                {exame.longe_od_eixo || "-"} / DNP{" "}
                {exame.longe_od_dnp || "-"}
              </span>

              <span>
                Longe OE: {exame.longe_oe_esferico || "-"} /{" "}
                {exame.longe_oe_cilindrico || "-"} /{" "}
                {exame.longe_oe_eixo || "-"} / DNP{" "}
                {exame.longe_oe_dnp || "-"}
              </span>

              <span>
                Perto OD: {exame.perto_od_esferico || "-"} /{" "}
                {exame.perto_od_cilindrico || "-"} /{" "}
                {exame.perto_od_eixo || "-"} / DNP{" "}
                {exame.perto_od_dnp || "-"}
              </span>

              <span>
                Perto OE: {exame.perto_oe_esferico || "-"} /{" "}
                {exame.perto_oe_cilindrico || "-"} /{" "}
                {exame.perto_oe_eixo || "-"} / DNP{" "}
                {exame.perto_oe_dnp || "-"}
              </span>

              <small>{exame.observacoes || "Sem observações"}</small>

              <button type="button" onClick={() => gerarPDF(exame)}>
                Gerar PDF / O.S.
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default HistoricoCliente;
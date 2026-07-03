import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import logo from "../assets/logo-ilotica.png";
import api from "../services/api";

function HistoricoCliente({ historico, voltar }) {
  const [parcelamentos, setParcelamentos] = useState([]);

  useEffect(() => {
    if (historico?.cliente?.id) {
      buscarParcelamentos();
    }
  }, [historico]);

  async function buscarParcelamentos() {
    try {
      const resposta = await api.get(`/parcelamentos/${historico.cliente.id}`);
      
      // Busca os detalhes das parcelas para cada parcelamento mestre
      const parcelamentosComDetalhes = await Promise.all(
        resposta.data.map(async (p) => {
          try {
            const detalhes = await api.get(`/parcelamentos/detalhes/${p.id}`);
            return { ...p, parcelasDetalhes: detalhes.data };
          } catch {
            return { ...p, parcelasDetalhes: [] };
          }
        })
      );

      setParcelamentos(parcelamentosComDetalhes);
    } catch (erro) {
      console.error("Erro ao buscar parcelamentos:", erro);
    }
  }

  async function pagarParcela(parcelamentoId) {
    try {
      await api.put(`/parcelamentos/${parcelamentoId}/pagar-parcela`, {
        usuario: "Sistema"
      });

      buscarParcelamentos();
      alert("Parcela recebida com sucesso!");
    } catch (erro) {
      console.error("Erro ao pagar parcela:", erro);
      alert(erro.response?.data?.mensagem || "Erro ao receber parcela.");
    }
  }

  // ==========================================
  // GERAR CARNÊ DE PARCELAS (PDF)
  // ==========================================
  function gerarCarnePDF(parcelamento) {
    const pdf = new jsPDF();
    const parcelas = parcelamento.parcelasDetalhes || [];

    if (parcelas.length === 0) {
      alert("Nenhuma parcela encontrada para gerar o carnê.");
      return;
    }

    let yOffset = 10;
    
    parcelas.forEach((parcela, index) => {
      // Cria uma nova página a cada 3 parcelas para não estourar a folha
      if (index > 0 && index % 3 === 0) {
        pdf.addPage();
        yOffset = 10;
      }

      // Moldura da lâmina do carnê
      pdf.setLineWidth(0.5);
      pdf.setDrawColor(0);
      pdf.rect(10, yOffset, 190, 75);

      // Linha pontilhada de canhoto/corte
      pdf.setLineDash([2, 2], 0);
      pdf.line(65, yOffset, 65, yOffset + 75);
      pdf.setLineDash([]); // Volta a linha normal

      // --- CANHOTO (Lado Esquerdo) ---
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("IL ÓTICA", 15, yOffset + 8);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(`Parcela: ${parcela.numero}/${parcelamento.quantidade_parcelas}`, 15, yOffset + 18);
      pdf.text(`Venc: ${parcela.vencimento.split("-").reverse().join("/")}`, 15, yOffset + 25);
      pdf.text(`Valor: R$ ${Number(parcela.valor).toFixed(2)}`, 15, yOffset + 32);
      pdf.text(`Status: ${parcela.status}`, 15, yOffset + 39);
      pdf.text("Recebido por: ___________", 15, yOffset + 52);
      pdf.text("Data: ____/____/_______", 15, yOffset + 60);

      // --- VIA DO CLIENTE (Lado Direito) ---
      try {
        pdf.addImage(logo, "PNG", 70, yOffset + 4, 30, 14);
      } catch (e) {
        pdf.setFontSize(12);
        pdf.text("IL ÓTICA", 70, yOffset + 10);
      }

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(`PARCELA N° ${parcela.numero}/${parcelamento.quantidade_parcelas}`, 140, yOffset + 10);
      
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Cliente: ${historico.cliente.nome}`, 70, yOffset + 24);
      pdf.text(`CPF: ${historico.cliente.cpf || "Não informado"}`, 70, yOffset + 30);
      pdf.text(`Descrição: ${parcelamento.descricao || "Venda"}`, 70, yOffset + 36);

      // Caixa de Destaque de Valores no Canto Direito
      pdf.rect(135, yOffset + 18, 60, 24);
      pdf.setFont("helvetica", "bold");
      pdf.text(`VENCIMENTO: ${parcela.vencimento.split("-").reverse().join("/")}`, 138, yOffset + 25);
      pdf.text(`VALOR: R$ ${Number(parcela.valor).toFixed(2)}`, 138, yOffset + 35);
      
      // Linha de assinatura
      pdf.setFont("helvetica", "normal");
      pdf.line(85, yOffset + 62, 180, yOffset + 62);
      pdf.setFontSize(7);
      pdf.text("Assinatura do Emitente / IL Ótica", 115, yOffset + 66);

      // Espaçamento entre os carnês na mesma página
      yOffset += 85;
    });

    pdf.save(`Carne-${parcelamento.id}-${historico.cliente.nome}.pdf`);
  }

  // ==========================================
  // CONFIGURAÇÕES DA CRIAÇÃO DO PDF DE EXAME
  // ==========================================
  function criarTabelaPDF(pdf, titulo, x, y, examen, tipo) {
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
    pdf.text(examen[`${tipo}_od_esferico`] || "-", x + 40, y + 15);
    pdf.text(examen[`${tipo}_od_cilindrico`] || "-", x + 78, y + 15);
    pdf.text(examen[`${tipo}_od_eixo`] || "-", x + 122, y + 15);
    pdf.text(examen[`${tipo}_od_dnp`] || "-", x + 155, y + 15);

    pdf.text("OE", x + 10, y + 24);
    pdf.text(examen[`${tipo}_oe_esferico`] || "-", x + 40, y + 24);
    pdf.text(examen[`${tipo}_oe_cilindrico`] || "-", x + 78, y + 24);
    pdf.text(examen[`${tipo}_oe_eixo`] || "-", x + 122, y + 24);
    pdf.text(examen[`${tipo}_oe_dnp`] || "-", x + 155, y + 24);
  }

  function gerarPDF(exame) {
    const pdf = new jsPDF();
    const numeroOS = String(exame.id).padStart(4, "0");

    try {
      pdf.addImage(logo, "PNG", 75, 8, 60, 28);
    } catch {
      // Fallback caso a logo não carregue
    }

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
        <button type="button" onClick={voltar}>Voltar</button>
      </section>
    );
  }

  return (
    <section className="page">
      <button type="button" onClick={voltar}>Voltar</button>

      <h1>{historico.cliente.nome}</h1>
      <p>Telefone: {historico.cliente.telefone}</p>
      <p>WhatsApp: {historico.cliente.whatsapp || "Não informado"}</p>
      <p>CPF: {historico.cliente.cpf || "Não informado"}</p>
      <p>Total gasto: R$ {Number(historico.totalGasto).toFixed(2)}</p>

      {/* SEÇÃO DE COMPRAS */}
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

      {/* SEÇÃO DE EXAMES / O.S. */}
      <div className="lista">
        <h2>Receitas / O.S.</h2>
        {historico.exames.length === 0 ? (
          <p>Nenhuma receita cadastrada.</p>
        ) : (
          historico.exames.map((exame) => (
            <div className="item pedido-card" key={exame.id}>
              <strong>O.S Nº {String(exame.id).padStart(4, "0")} - {exame.data}</strong>
              <span>Médico: {exame.medico || "Não informado"}</span>
              <span>Tipo de lente: {exame.tipo_lente || "Não informado"}</span>
              <span>Adição: {exame.adicao || "Não informada"}</span>
              <span>Longe OD: {exame.longe_od_esferico || "-"} / {exame.longe_od_cilindrico || "-"} / {exame.longe_od_eixo || "-"} / DNP {exame.longe_od_dnp || "-"}</span>
              <span>Longe OE: {exame.longe_oe_esferico || "-"} / {exame.longe_oe_cilindrico || "-"} / {exame.longe_oe_eixo || "-"} / DNP {exame.longe_oe_dnp || "-"}</span>
              <span>Perto OD: {exame.perto_od_esferico || "-"} / {exame.perto_od_cilindrico || "-"} / {exame.perto_od_eixo || "-"} / DNP {exame.perto_od_dnp || "-"}</span>
              <span>Perto OE: {exame.perto_oe_esferico || "-"} / {exame.perto_oe_cilindrico || "-"} / {exame.perto_oe_eixo || "-"} / DNP {exame.perto_oe_dnp || "-"}</span>
              <small>{exame.observacoes || "Sem observações"}</small>
              <button type="button" onClick={() => gerarPDF(exame)}>Gerar PDF / O.S.</button>
            </div>
          ))
        )}
      </div>

      {/* SEÇÃO DO FINANCEIRO / PARCELAMENTOS */}
      <div className="lista">
        <h2>Financeiro / Parcelamentos</h2>
        {parcelamentos.length === 0 ? (
          <p>Este cliente não possui parcelamentos</p>
        ) : (
          parcelamentos.map((item) => (
            <div className="item" key={item.id} style={{ borderLeft: "5px solid #007bff", paddingLeft: "15px", marginBottom: "20px" }}>
              <strong>{item.descricao}</strong>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px", margin: "10px 0" }}>
                <span>Valor total: R$ {Number(item.valor_total).toFixed(2)}</span>
                <span>Entrada: R$ {Number(item.entrada).toFixed(2)}</span>
                <span>Restante: R$ {Number(item.valor_restante).toFixed(2)}</span>
                <span>Parcelas: {item.quantidade_parcelas}</span>
                <span>Valor da parcela: R$ {Number(item.valor_parcela).toFixed(2)}</span>
                <span>Pagas: {item.parcelas_pagas}</span>
                <span>Status: <b style={{ color: item.status === "Quitado" ? "green" : "orange" }}>{item.status}</b></span>
              </div>

              {/* LISTAGEM INDIVIDUAL DE PARCELAS */}
              <div style={{ background: "#f8f9fa", padding: "10px", borderRadius: "5px", margin: "10px 0" }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>Detalhamento das Parcelas</h4>
                {item.parcelasDetalhes && item.parcelasDetalhes.length > 0 ? (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "13px" }}>
                    {item.parcelasDetalhes.map((p) => (
                      <li key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #eee" }}>
                        <span>Parcela {p.numero}</span>
                        <span>Venc: {p.vencimento.split("-").reverse().join("/")}</span>
                        <span>R$ {Number(p.valor).toFixed(2)}</span>
                        <span style={{ fontWeight: "bold", color: p.status === "Pago" ? "green" : "red" }}>{p.status}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>Nenhuma parcela gerada para este registro antigo.</p>
                )}
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  type="button" 
                  onClick={() => pagarParcela(item.id)}
                  disabled={item.status === "Quitado"}
                  style={{
                    backgroundColor: item.status === "Quitado" ? "#ccc" : "#28a745",
                    color: "#fff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    cursor: item.status === "Quitado" ? "not-allowed" : "pointer",
                    fontWeight: "bold"
                  }}
                >
                  {item.status === "Quitado" ? "Totalmente Pago" : "Receber próxima parcela"}
                </button>

                <button 
                  type="button" 
                  onClick={() => gerarCarnePDF(item)}
                  style={{
                    backgroundColor: "#17a2b8",
                    color: "#fff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "bold"
                  }}
                >
                  Imprimir Carnê
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default HistoricoCliente;
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import api from "../services/api";
import logo from "../assets/logo-ilotica.png";

function Exames() {
  const [aba, setAba] = useState("nova");
  const [exames, setExames] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState("");

  const [cliente, setCliente] = useState("");
  const [data, setData] = useState("");

  const [longeOdEsferico, setLongeOdEsferico] = useState("");
  const [longeOdCilindrico, setLongeOdCilindrico] = useState("");
  const [longeOdEixo, setLongeOdEixo] = useState("");
  const [longeOdDnp, setLongeOdDnp] = useState("");

  const [longeOeEsferico, setLongeOeEsferico] = useState("");
  const [longeOeCilindrico, setLongeOeCilindrico] = useState("");
  const [longeOeEixo, setLongeOeEixo] = useState("");
  const [longeOeDnp, setLongeOeDnp] = useState("");

  const [pertoOdEsferico, setPertoOdEsferico] = useState("");
  const [pertoOdCilindrico, setPertoOdCilindrico] = useState("");
  const [pertoOdEixo, setPertoOdEixo] = useState("");
  const [pertoOdDnp, setPertoOdDnp] = useState("");

  const [pertoOeEsferico, setPertoOeEsferico] = useState("");
  const [pertoOeCilindrico, setPertoOeCilindrico] = useState("");
  const [pertoOeEixo, setPertoOeEixo] = useState("");
  const [pertoOeDnp, setPertoOeDnp] = useState("");

  const [adicao, setAdicao] = useState("");
  const [medico, setMedico] = useState("");
  const [tipoLente, setTipoLente] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const examesResposta = await api.get("/exames");
    const clientesResposta = await api.get("/clientes");

    setExames(examesResposta.data);
    setClientes(clientesResposta.data);
  }

  function limparFormulario() {
    setCliente("");
    setData("");

    setLongeOdEsferico("");
    setLongeOdCilindrico("");
    setLongeOdEixo("");
    setLongeOdDnp("");

    setLongeOeEsferico("");
    setLongeOeCilindrico("");
    setLongeOeEixo("");
    setLongeOeDnp("");

    setPertoOdEsferico("");
    setPertoOdCilindrico("");
    setPertoOdEixo("");
    setPertoOdDnp("");

    setPertoOeEsferico("");
    setPertoOeCilindrico("");
    setPertoOeEixo("");
    setPertoOeDnp("");

    setAdicao("");
    setMedico("");
    setTipoLente("");
    setObservacoes("");
  }

  async function salvarExame() {
    if (!cliente || !data) {
      alert("Selecione o cliente e informe a data.");
      return;
    }

    await api.post("/exames", {
      cliente,
      data,

      longe_od_esferico: longeOdEsferico,
      longe_od_cilindrico: longeOdCilindrico,
      longe_od_eixo: longeOdEixo,
      longe_od_dnp: longeOdDnp,

      longe_oe_esferico: longeOeEsferico,
      longe_oe_cilindrico: longeOeCilindrico,
      longe_oe_eixo: longeOeEixo,
      longe_oe_dnp: longeOeDnp,

      perto_od_esferico: pertoOdEsferico,
      perto_od_cilindrico: pertoOdCilindrico,
      perto_od_eixo: pertoOdEixo,
      perto_od_dnp: pertoOdDnp,

      perto_oe_esferico: pertoOeEsferico,
      perto_oe_cilindrico: pertoOeCilindrico,
      perto_oe_eixo: pertoOeEixo,
      perto_oe_dnp: pertoOeDnp,

      adicao,
      medico,
      tipo_lente: tipoLente,
      observacoes,
    });

    limparFormulario();
    await carregarDados();
    setAba("receitas");
  }

  async function alterarStatusOS(id, novoStatus) {
  try {
    await api.put(`/exames/${id}/status`, {
      status_os: novoStatus,
    });

    await carregarDados();
  } catch (error) {
    console.error(error);
    alert("Erro ao alterar status da O.S.");
  }
}

async function excluirExame(id) {
  await api.delete(`/exames/${id}`);
  carregarDados();
}

function enviarWhatsApp(exame) {
  const clienteEncontrado = clientes.find(
    (c) => c.nome === exame.cliente
  );

  if (!clienteEncontrado) {
    alert("Cliente não encontrado.");
    return;
  }

  const numero = (
    clienteEncontrado.whatsapp ||
    clienteEncontrado.telefone ||
    ""
  ).replace(/\D/g, "");

  const mensagem = `
Olá ${clienteEncontrado.nome}!

Sua O.S Nº ${String(exame.id).padStart(4, "0")} já está pronta para retirada.

📍 IL Ótica
Rua João de Brito Lima Moura, 123

⏰ Segunda a Sábado
09:00 às 18:00

📞 (83) 98639-7545
`;

  const url = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;

  window.open(url, "_blank");
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

    pdf.text(`CLIENTE: ${exame.cliente}`, 15, 166);
    pdf.text(`TIPO DE LENTE: ${exame.tipo_lente || ""}`, 15, 182);
    pdf.text(`DATA: ${exame.data}`, 15, 198);

    pdf.text("OBSERVAÇÕES:", 15, 216);
    pdf.text(exame.observacoes || "Sem observações.", 15, 225, {
      maxWidth: 175,
    });

    pdf.save(`OS-${numeroOS}-${exame.cliente}.pdf`);
  }

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

  function abrirWhatsAppRetorno(clienteNome) {
    const clienteEncontrado = clientes.find((item) => item.nome === clienteNome);
    const numero = clienteEncontrado?.whatsapp || clienteEncontrado?.telefone || "";
    const numeroLimpo = numero.replace(/\D/g, "");

    const mensagem = `Olá ${clienteNome}! 👓 Percebemos que já faz algum tempo desde sua última avaliação visual. A equipe da IL Ótica está à disposição para uma nova consulta e atualização da sua receita.`;

    const url = numeroLimpo
      ? `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`
      : `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");
  }

  function calcularMesesDesde(dataExame) {
    if (!dataExame) return 0;

    const hoje = new Date();
    const dataExameObj = new Date(dataExame);

    const anos = hoje.getFullYear() - dataExameObj.getFullYear();
    const meses = hoje.getMonth() - dataExameObj.getMonth();

    return anos * 12 + meses;
  }

  const examesFiltrados = exames.filter((exame) => {
    const texto = busca.toLowerCase();

    return (
      (exame.cliente || "").toLowerCase().includes(texto) ||
      (exame.data || "").toLowerCase().includes(texto) ||
      (exame.medico || "").toLowerCase().includes(texto) ||
      (exame.tipo_lente || "").toLowerCase().includes(texto)
    );
  });

  const clientesComRetorno = clientes
    .map((clienteItem) => {
      const examesCliente = exames
        .filter((exame) => exame.cliente === clienteItem.nome)
        .sort((a, b) => new Date(b.data) - new Date(a.data));

      const ultimoExame = examesCliente[0];

      if (!ultimoExame) {
        return {
          cliente: clienteItem,
          ultimoExame: null,
          meses: null,
          precisaRetorno: true,
        };
      }

      const meses = calcularMesesDesde(ultimoExame.data);

      return {
        cliente: clienteItem,
        ultimoExame,
        meses,
        precisaRetorno: meses >= 12,
      };
    })
    .filter((item) => item.precisaRetorno);

  const previewExame = {
    id: exames.length + 1,
    cliente,
    data,

    longe_od_esferico: longeOdEsferico,
    longe_od_cilindrico: longeOdCilindrico,
    longe_od_eixo: longeOdEixo,
    longe_od_dnp: longeOdDnp,

    longe_oe_esferico: longeOeEsferico,
    longe_oe_cilindrico: longeOeCilindrico,
    longe_oe_eixo: longeOeEixo,
    longe_oe_dnp: longeOeDnp,

    perto_od_esferico: pertoOdEsferico,
    perto_od_cilindrico: pertoOdCilindrico,
    perto_od_eixo: pertoOdEixo,
    perto_od_dnp: pertoOdDnp,

    perto_oe_esferico: pertoOeEsferico,
    perto_oe_cilindrico: pertoOeCilindrico,
    perto_oe_eixo: pertoOeEixo,
    perto_oe_dnp: pertoOeDnp,

    adicao,
    medico,
    tipo_lente: tipoLente,
    observacoes,
  };

  return (
    <section className="page exames-page">
      <h1>Receita Oftalmológica</h1>
      <p>Modelo profissional com O.S automática, tabela de grau e preview.</p>

      <div className="abas-internas">
        <button
          className={aba === "nova" ? "aba-ativa" : ""}
          onClick={() => setAba("nova")}
        >
          Nova Receita
        </button>

        <button
          className={aba === "receitas" ? "aba-ativa" : ""}
          onClick={() => setAba("receitas")}
        >
          Receitas Cadastradas
        </button>

        <button
          className={aba === "retorno" ? "aba-ativa" : ""}
          onClick={() => setAba("retorno")}
        >
          Retorno de Clientes
        </button>
      </div>

      {aba === "nova" && (
        <div className="exame-layout">
          <div className="exame-form-card">
            <h2>Nova O.S / Receita</h2>

            <form className="form">
              <select value={cliente} onChange={(e) => setCliente(e.target.value)}>
                <option value="">Selecione o cliente</option>

                {clientes.map((item) => (
                  <option key={item.id} value={item.nome}>
                    {item.nome} - {item.telefone}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />

              <TabelaInputs
                titulo="Longe"
                odEsferico={longeOdEsferico}
                setOdEsferico={setLongeOdEsferico}
                odCilindrico={longeOdCilindrico}
                setOdCilindrico={setLongeOdCilindrico}
                odEixo={longeOdEixo}
                setOdEixo={setLongeOdEixo}
                odDnp={longeOdDnp}
                setOdDnp={setLongeOdDnp}
                oeEsferico={longeOeEsferico}
                setOeEsferico={setLongeOeEsferico}
                oeCilindrico={longeOeCilindrico}
                setOeCilindrico={setLongeOeCilindrico}
                oeEixo={longeOeEixo}
                setOeEixo={setLongeOeEixo}
                oeDnp={longeOeDnp}
                setOeDnp={setLongeOeDnp}
              />

              <TabelaInputs
                titulo="Perto"
                odEsferico={pertoOdEsferico}
                setOdEsferico={setPertoOdEsferico}
                odCilindrico={pertoOdCilindrico}
                setOdCilindrico={setPertoOdCilindrico}
                odEixo={pertoOdEixo}
                setOdEixo={setPertoOdEixo}
                odDnp={pertoOdDnp}
                setOdDnp={setPertoOdDnp}
                oeEsferico={pertoOeEsferico}
                setOeEsferico={setPertoOeEsferico}
                oeCilindrico={pertoOeCilindrico}
                setOeCilindrico={setPertoOeCilindrico}
                oeEixo={pertoOeEixo}
                setOeEixo={setPertoOeEixo}
                oeDnp={pertoOeDnp}
                setOeDnp={setPertoOeDnp}
              />

              <div className="exame-extra-grid">
                <input
                  placeholder="Adição"
                  value={adicao}
                  onChange={(e) => setAdicao(e.target.value)}
                />

                <input
                  placeholder="Médico"
                  value={medico}
                  onChange={(e) => setMedico(e.target.value)}
                />

                <input
                  placeholder="Tipo de lente"
                  value={tipoLente}
                  onChange={(e) => setTipoLente(e.target.value)}
                />
              </div>

              <textarea
                placeholder="Observações"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />

              <button type="button" onClick={salvarExame}>
                Salvar Receita
              </button>
            </form>
          </div>

          <PreviewOS exame={previewExame} logo={logo} />
        </div>
      )}

      {aba === "receitas" && (
        <>
          <input
            className="campo-busca"
            type="text"
            placeholder="Buscar por cliente, data, médico ou tipo de lente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <div className="lista">
            <h2>Receitas Cadastradas</h2>

            {examesFiltrados.length === 0 ? (
              <p>Nenhuma receita encontrada.</p>
            ) : (
              examesFiltrados.map((exame) => (
                <div className="item pedido-card" key={exame.id}>
                  <strong>
                    O.S Nº {String(exame.id).padStart(4, "0")} - {exame.cliente}
                  </strong>

                  <span>Data: {exame.data}</span>
                  <span>Médico: {exame.medico || "Não informado"}</span>
                  <span>Tipo de lente: {exame.tipo_lente || "Não informado"}</span>
                  <div className="status-os-area">
  <span
    className={`status-os ${
      exame.status_os === "Pronto para Retirada"
        ? "status-pronto"
        : exame.status_os === "Em Produção"
        ? "status-producao"
        : exame.status_os === "Entregue"
        ? "status-entregue"
        : "status-aguardando"
    }`}
  >
    {exame.status_os || "Aguardando Lente"}
  </span>

  <select
    value={exame.status_os || "Aguardando Lente"}
    onChange={(e) =>
      alterarStatusOS(exame.id, e.target.value)
    }
  >
    <option>Aguardando Lente</option>
    <option>Em Produção</option>
    <option>Pronto para Retirada</option>
    <option>Entregue</option>
  </select>
</div>

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

                  <button type="button" onClick={() => gerarPDF(exame)}>
                    Gerar PDF / O.S
                  </button>

                  {exame.status_os === "Pronto para Retirada" && (
                    <button
                      type="button"
                      className="btn-whatsapp"
                      onClick={() => enviarWhatsApp(exame)}
                    >
                      📱 Avisar Cliente
                      </button>
                  )}
                  
                  <button type="button" onClick={() => excluirExame(exame.id)}>
                    Excluir
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {aba === "retorno" && (
        <div className="lista">
          <h2>Retorno de Clientes</h2>
          <p>Clientes sem exame recente ou há 12 meses ou mais sem retorno.</p>

          {clientesComRetorno.length === 0 ? (
            <p>Nenhum cliente pendente de retorno.</p>
          ) : (
            clientesComRetorno.map((item) => (
              <div className="item pedido-card" key={item.cliente.id}>
                <strong>{item.cliente.nome}</strong>
                <span>Telefone: {item.cliente.telefone}</span>
                <span>WhatsApp: {item.cliente.whatsapp || "Não informado"}</span>

                {item.ultimoExame ? (
                  <>
                    <span>Último exame: {item.ultimoExame.data}</span>
                    <span>Tempo sem retorno: {item.meses} meses</span>
                  </>
                ) : (
                  <span>Cliente ainda não possui receita cadastrada.</span>
                )}

                <button
                  type="button"
                  onClick={() => abrirWhatsAppRetorno(item.cliente.nome)}
                >
                  Enviar WhatsApp de Retorno
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

function TabelaInputs({
  titulo,
  odEsferico,
  setOdEsferico,
  odCilindrico,
  setOdCilindrico,
  odEixo,
  setOdEixo,
  odDnp,
  setOdDnp,
  oeEsferico,
  setOeEsferico,
  oeCilindrico,
  setOeCilindrico,
  oeEixo,
  setOeEixo,
  oeDnp,
  setOeDnp,
}) {
  return (
    <div className="receita-tabela-card">
      <h3>{titulo}</h3>

      <div className="receita-grid receita-header">
        <span></span>
        <span>Esférico</span>
        <span>Cilíndrico</span>
        <span>Eixo</span>
        <span>D.N.P</span>
      </div>

      <div className="receita-grid">
        <strong>OD</strong>
        <input value={odEsferico} onChange={(e) => setOdEsferico(e.target.value)} />
        <input value={odCilindrico} onChange={(e) => setOdCilindrico(e.target.value)} />
        <input value={odEixo} onChange={(e) => setOdEixo(e.target.value)} />
        <input value={odDnp} onChange={(e) => setOdDnp(e.target.value)} />
      </div>

      <div className="receita-grid">
        <strong>OE</strong>
        <input value={oeEsferico} onChange={(e) => setOeEsferico(e.target.value)} />
        <input value={oeCilindrico} onChange={(e) => setOeCilindrico(e.target.value)} />
        <input value={oeEixo} onChange={(e) => setOeEixo(e.target.value)} />
        <input value={oeDnp} onChange={(e) => setOeDnp(e.target.value)} />
      </div>
    </div>
  );
}

function PreviewOS({ exame, logo }) {
  const numeroOS = String(exame.id).padStart(4, "0");

  return (
    <aside className="os-preview">
      <div className="os-preview-papel">
        <div className="os-topo">
          <img src={logo} alt="Logo IL Ótica" />
          <strong>O.S Nº {numeroOS}</strong>
        </div>

        <h3>Receita Oftalmológica</h3>

        <PreviewTabela titulo="Longe" exame={exame} tipo="longe" />
        <PreviewTabela titulo="Perto" exame={exame} tipo="perto" />

        <div className="os-info">
          <span>ADIÇÃO: {exame.adicao || "________"}</span>
          <span>MÉDICO: {exame.medico || "________"}</span>
          <span>CLIENTE: {exame.cliente || "________"}</span>
          <span>TIPO DE LENTE: {exame.tipo_lente || "________"}</span>
          <span>DATA: {exame.data || "____/____/____"}</span>
        </div>
      </div>
    </aside>
  );
}

function PreviewTabela({ titulo, exame, tipo }) {
  return (
    <div className="preview-tabela">
      <div className="preview-grid preview-header">
        <span>{titulo}</span>
        <span>Esférico</span>
        <span>Cilíndrico</span>
        <span>Eixo</span>
        <span>D.N.P</span>
      </div>

      <div className="preview-grid">
        <strong>OD</strong>
        <span>{exame[`${tipo}_od_esferico`] || "-"}</span>
        <span>{exame[`${tipo}_od_cilindrico`] || "-"}</span>
        <span>{exame[`${tipo}_od_eixo`] || "-"}</span>
        <span>{exame[`${tipo}_od_dnp`] || "-"}</span>
      </div>

      <div className="preview-grid">
        <strong>OE</strong>
        <span>{exame[`${tipo}_oe_esferico`] || "-"}</span>
        <span>{exame[`${tipo}_oe_cilindrico`] || "-"}</span>
        <span>{exame[`${tipo}_oe_eixo`] || "-"}</span>
        <span>{exame[`${tipo}_oe_dnp`] || "-"}</span>
      </div>
    </div>
  );
}

export default Exames;
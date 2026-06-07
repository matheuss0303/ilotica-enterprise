import { useEffect, useState } from "react";
import api from "../services/api";

function Agenda() {
  const [aba, setAba] = useState("novo");
  const [agendamentos, setAgendamentos] = useState([]);
  const [clientes, setClientes] = useState([]);

  const [cliente, setCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    const respostaAgenda = await api.get("/agenda");
    const respostaClientes = await api.get("/clientes");

    setAgendamentos(respostaAgenda.data);
    setClientes(respostaClientes.data);
  }

  function selecionarCliente(nomeCliente) {
    setCliente(nomeCliente);

    const clienteEncontrado = clientes.find(
      (item) => item.nome === nomeCliente
    );

    if (clienteEncontrado) {
      setTelefone(clienteEncontrado.whatsapp || clienteEncontrado.telefone || "");
    }
  }

  async function salvarAgendamento() {
    if (!cliente || !data || !hora) {
      alert("Preencha cliente, data e hora.");
      return;
    }

    await api.post("/agenda", {
      cliente,
      telefone,
      data,
      hora,
      observacoes,
    });

    setCliente("");
    setTelefone("");
    setData("");
    setHora("");
    setObservacoes("");

    await carregarDados();
    setAba("todos");
  }

  async function alterarStatus(id, status) {
    await api.put(`/agenda/${id}/status`, { status });
    carregarDados();
  }

  async function excluir(id) {
    await api.delete(`/agenda/${id}`);
    carregarDados();
  }

  function enviarWhatsApp(item) {
    const numero = (item.telefone || "").replace(/\D/g, "");

    if (!numero) {
      alert("Este agendamento não possui telefone cadastrado.");
      return;
    }

    const mensagem = `Olá ${item.cliente}! 👓 Passando para confirmar seu exame na IL Ótica no dia ${formatarData(
      item.data
    )} às ${item.hora}. Endereço: Rua João de Brito Lima Moura N 123.`;

    const url = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");
  }

  function formatarData(dataISO) {
    if (!dataISO) return "";
    const partes = dataISO.split("-");
    if (partes.length !== 3) return dataISO;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  function classeStatus(status) {
    switch (status) {
      case "Confirmado":
        return "status-pronto";
      case "Atendido":
        return "status-entregue";
      case "Cancelado":
        return "status-aguardando";
      default:
        return "status-producao";
    }
  }

  const hojeISO = new Date().toISOString().slice(0, 10);
  const agendaHoje = agendamentos.filter((item) => item.data === hojeISO);

  return (
    <section className="page">
      <h1>Agenda de Exames</h1>
      <p>Organize os horários de atendimento e confirme exames por WhatsApp.</p>

      <div className="abas-internas">
        <button
          className={aba === "novo" ? "aba-ativa" : ""}
          onClick={() => setAba("novo")}
        >
          Novo Agendamento
        </button>

        <button
          className={aba === "hoje" ? "aba-ativa" : ""}
          onClick={() => setAba("hoje")}
        >
          Agenda do Dia
        </button>

        <button
          className={aba === "todos" ? "aba-ativa" : ""}
          onClick={() => setAba("todos")}
        >
          Todos
        </button>
      </div>

      {aba === "novo" && (
        <div className="config-card">
          <h2>Novo Agendamento</h2>

          <div className="form">
            <select value={cliente} onChange={(e) => selecionarCliente(e.target.value)}>
              <option value="">Selecione o cliente</option>

              {clientes.map((item) => (
                <option key={item.id} value={item.nome}>
                  {item.nome} - {item.telefone}
                </option>
              ))}
            </select>

            <input
              placeholder="Telefone / WhatsApp"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />

            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />

            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
            />

            <textarea
              placeholder="Observações"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />

            <button type="button" onClick={salvarAgendamento}>
              Agendar Exame
            </button>
          </div>
        </div>
      )}

      {aba === "hoje" && (
        <div className="lista">
          <h2>Agenda do Dia</h2>

          {agendaHoje.length === 0 ? (
            <p>Nenhum exame agendado para hoje.</p>
          ) : (
            agendaHoje.map((item) => (
              <CardAgendamento
                key={item.id}
                item={item}
                alterarStatus={alterarStatus}
                excluir={excluir}
                enviarWhatsApp={enviarWhatsApp}
                formatarData={formatarData}
                classeStatus={classeStatus}
              />
            ))
          )}
        </div>
      )}

      {aba === "todos" && (
        <div className="lista">
          <h2>Todos os Agendamentos</h2>

          {agendamentos.length === 0 ? (
            <p>Nenhum agendamento cadastrado.</p>
          ) : (
            agendamentos.map((item) => (
              <CardAgendamento
                key={item.id}
                item={item}
                alterarStatus={alterarStatus}
                excluir={excluir}
                enviarWhatsApp={enviarWhatsApp}
                formatarData={formatarData}
                classeStatus={classeStatus}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}

function CardAgendamento({
  item,
  alterarStatus,
  excluir,
  enviarWhatsApp,
  formatarData,
  classeStatus,
}) {
  return (
    <div className="item pedido-card">
      <strong>
        {item.hora} - {item.cliente}
      </strong>

      <span>Telefone: {item.telefone || "Não informado"}</span>
      <span>Data: {formatarData(item.data)}</span>

      <span className={`status-os ${classeStatus(item.status)}`}>
        {item.status}
      </span>

      <small>{item.observacoes || "Sem observações"}</small>

      <select
        value={item.status}
        onChange={(e) => alterarStatus(item.id, e.target.value)}
      >
        <option>Agendado</option>
        <option>Confirmado</option>
        <option>Atendido</option>
        <option>Cancelado</option>
      </select>

      <button type="button" onClick={() => enviarWhatsApp(item)}>
        Confirmar WhatsApp
      </button>

      <button type="button" onClick={() => excluir(item.id)}>
        Excluir
      </button>
    </div>
  );
}

export default Agenda;
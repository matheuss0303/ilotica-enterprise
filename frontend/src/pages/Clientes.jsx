import { useEffect, useState } from "react";
import api from "../services/api";
import HistoricoCliente from "./HistoricoCliente";

function Clientes({ usuarioLogado }) {
  const [aba, setAba] = useState("novo");
  const [clientes, setClientes] = useState([]);
  const [historico, setHistorico] = useState(null);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [endereco, setEndereco] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [foto, setFoto] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    buscarClientes();
  }, []);

  async function buscarClientes() {
    const resposta = await api.get("/clientes");
    setClientes(resposta.data);
  }

  function limparFormulario() {
    setNome("");
    setTelefone("");
    setWhatsapp("");
    setCpf("");
    setNascimento("");
    setEndereco("");
    setObservacoes("");
    setFoto("");
    setEditandoId(null);
  }

  function selecionarFoto(event) {
    const arquivo = event.target.files[0];

    if (!arquivo) return;

    const leitor = new FileReader();

    leitor.onloadend = () => {
      setFoto(leitor.result);
    };

    leitor.readAsDataURL(arquivo);
  }

  async function salvarCliente() {
    if (!nome || !telefone) {
      alert("Preencha nome e telefone.");
      return;
    }

    const dados = {
      nome,
      telefone,
      whatsapp,
      cpf,
      nascimento,
      endereco,
      observacoes,
      foto,
      criadoPor: usuarioLogado?.nome || "Não identificado",
    };

    if (editandoId) {
      await api.put(`/clientes/${editandoId}`, dados);
    } else {
      await api.post("/clientes", dados);
    }

    limparFormulario();
    buscarClientes();
    setAba("lista");
  }

  async function excluirCliente(id) {
    await api.delete(`/clientes/${id}`);
    buscarClientes();
  }

  function abrirWhatsApp(cliente) {
    const numero = cliente.whatsapp || cliente.telefone || "";
    const numeroLimpo = numero.replace(/\D/g, "");

    const mensagem = `Olá ${cliente.nome}! Aqui é a equipe da IL Ótica. Como podemos ajudar você hoje? 👓`;

    const url = numeroLimpo
      ? `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`
      : `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");
  }

  function editarCliente(cliente) {
    setEditandoId(cliente.id);
    setNome(cliente.nome || "");
    setTelefone(cliente.telefone || "");
    setWhatsapp(cliente.whatsapp || "");
    setCpf(cliente.cpf || "");
    setNascimento(cliente.nascimento || "");
    setEndereco(cliente.endereco || "");
    setObservacoes(cliente.observacoes || "");
    setFoto(cliente.foto || "");
    setAba("novo");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function verHistorico(idCliente) {
  try {
    const resposta = await api.get(`/clientes/${idCliente}/historico`);

    setHistorico(resposta.data);
    setMostrarHistorico(true);
    setAba("historico");
  } catch (error) {
    alert("Erro ao carregar histórico do cliente.");
  }
}

  const clientesFiltrados = clientes.filter((cliente) => {
    const textoBusca = busca.toLowerCase();

    return (
      (cliente.nome || "").toLowerCase().includes(textoBusca) ||
      (cliente.telefone || "").toLowerCase().includes(textoBusca) ||
      (cliente.whatsapp || "").toLowerCase().includes(textoBusca) ||
      (cliente.cpf || "").toLowerCase().includes(textoBusca)
    );
  });

  return (
    <section className="page">
      <h1>Clientes</h1>
      <p>Cadastro, relacionamento e histórico dos clientes da IL Ótica.</p>

      <div className="abas-internas">
        <button
          className={aba === "novo" ? "aba-ativa" : ""}
          onClick={() => setAba("novo")}
        >
          Novo / Editar Cliente
        </button>

        <button
          className={aba === "lista" ? "aba-ativa" : ""}
          onClick={() => setAba("lista")}
        >
          Lista de Clientes
        </button>

        <button
          className={aba === "historico" ? "aba-ativa" : ""}
          onClick={() => setAba("historico")}
        >
          Histórico
        </button>
      </div>

      {aba === "novo" && (
        <form className="form">
          <input
            placeholder="Nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <input
            placeholder="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />

          <input
            placeholder="WhatsApp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />

          <input
            placeholder="CPF"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
          />

          <input
            type="date"
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
          />

          <input
            placeholder="Endereço"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
          />

          <div className="foto-cliente-box">
            <label>Foto do Cliente</label>

            {foto ? (
              <img src={foto} alt="Foto do cliente" />
            ) : (
              <div className="foto-placeholder">Sem foto</div>
            )}

            <label className="upload-foto">
              📷 Escolher Foto

              <input
              type="file"
              accept="image/*"
              onChange={selecionarFoto}
            />
            </label>

    
          </div>

          <textarea
            placeholder="Observações sobre o cliente"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />

          <button type="button" onClick={salvarCliente}>
            {editandoId ? "Atualizar Cliente" : "Salvar Cliente"}
          </button>

          {editandoId && (
            <button type="button" onClick={limparFormulario}>
              Cancelar Edição
            </button>
          )}
        </form>
      )}

      {aba === "lista" && (
        <>
          <input
            className="campo-busca"
            placeholder="Buscar por nome, telefone, WhatsApp ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <div className="lista">
            <h2>Clientes cadastrados</h2>

            {clientesFiltrados.length === 0 ? (
              <p>Nenhum cliente encontrado.</p>
            ) : (
              clientesFiltrados.map((cliente) => (
                <div className="item cliente-card" key={cliente.id}>
                  <div className="cliente-foto-lista">
                    {cliente.foto ? (
                      <img src={cliente.foto} alt={cliente.nome} />
                    ) : (
                      <span>{cliente.nome?.charAt(0)?.toUpperCase()}</span>
                    )}
                  </div>

                  <strong>{cliente.nome}</strong>
                  <span>Telefone: {cliente.telefone}</span>
                  <span>WhatsApp: {cliente.whatsapp || "Não informado"}</span>
                  <span>CPF: {cliente.cpf || "Não informado"}</span>
                  <span>
                    Nascimento: {cliente.nascimento || "Não informado"}
                  </span>
                  <span>Endereço: {cliente.endereco || "Não informado"}</span>
                  <small>{cliente.observacoes || "Sem observações"}</small>
                  <small>
                    cadastrado por: {cliente.criadoPor || "Sistema"}
                  </small>

                  <button type="button" onClick={() => editarCliente(cliente)}>
                    Editar
                  </button>

                  <button type="button" onClick={() => abrirWhatsApp(cliente)}>
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => verHistorico(cliente.id)}
                  >
                    Ver Histórico
                  </button>

                  <button type="button" onClick={() => excluirCliente(cliente.id)}>
                    Excluir
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {aba === "historico" && (
        <>
          {!mostrarHistorico ? (
            <div className="lista">
              <h2>Histórico do Cliente</h2>
              <p>
                Para visualizar o histórico, vá em <strong>Lista de Clientes</strong>{" "}
                e clique em <strong>Ver Histórico</strong> no cliente desejado.
              </p>
            </div>
          ) : (
            <HistoricoCliente
              historico={historico}
              voltar={() => {
                setMostrarHistorico(false);
                setHistorico(null);
                setAba("lista");
              }}
            />
          )}
        </>
      )}
    </section>
  );
}

export default Clientes;
import { useEffect, useState } from "react";
import api from "../services/api";

function Configuracoes({ usuarioLogado }) {
  const [aba, setAba] = useState("backup");
  const [usuarios, setUsuarios] = useState([]);
  const [logs, setLogs] = useState([]);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [tipo, setTipo] = useState("admin");

  const [nomeLoja, setNomeLoja] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefoneLoja, setTelefoneLoja] = useState("");
  const [enderecoLoja, setEnderecoLoja] = useState("");
  const [instagram, setInstagram] = useState("");
  const [horario, setHorario] = useState("");

  const isAdmin = usuarioLogado?.tipo === "admin";

  useEffect(() => {
    buscarUsuarios();
    buscarLoja();
    buscarLogs();
  }, []);

  async function buscarUsuarios() {
    const resposta = await api.get("/usuarios");
    setUsuarios(resposta.data);
  }

  async function buscarLogs() {
    const resposta = await api.get("/logs");
    setLogs(resposta.data);
  }

  async function registrarLog(acao) {
    await api.post("/logs", {
      usuario: usuarioLogado?.nome || "Sistema",
      acao,
    });

    buscarLogs();
  }

  async function buscarLoja() {
    const resposta = await api.get("/loja");

    setNomeLoja(resposta.data.nome || "");
    setCnpj(resposta.data.cnpj || "");
    setTelefoneLoja(resposta.data.telefone || "");
    setEnderecoLoja(resposta.data.endereco || "");
    setInstagram(resposta.data.instagram || "");
    setHorario(resposta.data.horario || "");
  }

  async function salvarLoja() {
    await api.put("/loja", {
      nome: nomeLoja,
      cnpj,
      telefone: telefoneLoja,
      endereco: enderecoLoja,
      instagram,
      horario,
    });

    await registrarLog("Atualizou os dados da loja");

    alert("Dados da loja atualizados com sucesso.");
  }

  async function criarUsuario() {
    if (!nome || !email || !senha) {
      alert("Preencha nome, e-mail e senha.");
      return;
    }

    try {
      await api.post("/usuarios", {
        nome,
        email,
        senha,
        tipo,
      });

      await registrarLog(`Criou o usuário ${nome}`);

      setNome("");
      setEmail("");
      setSenha("");
      setTipo("admin");

      buscarUsuarios();
    } catch (error) {
      alert(error.response?.data?.mensagem || "Erro ao criar usuário.");
    }
  }

  async function excluirUsuario(id, nomeUsuario) {
    await api.delete(`/usuarios/${id}`, {
      data: { usuarioLogadoId: usuarioLogado.id }
    });
    
    await registrarLog(`Excluiu o usuário ${nomeUsuario}`);
    buscarUsuarios();
  }

  return (
    <section className="page">
      <h1>Configurações</h1>
      <p>Gerencie preferências, backup, usuários, dados e logs da IL Ótica.</p>

      <div className="config-layout">
        <aside className="config-menu">
          <button
            className={aba === "backup" ? "config-ativo" : ""}
            onClick={() => setAba("backup")}
          >
            Backup
          </button>

          {isAdmin && (
            <button
              className={aba === "usuarios" ? "config-ativo" : ""}
              onClick={() => setAba("usuarios")}
            >
              Usuários
            </button>
          )}

          <button
            className={aba === "loja" ? "config-ativo" : ""}
            onClick={() => setAba("loja")}
          >
            Dados da Loja
          </button>

          <button
            className={aba === "mensagens" ? "config-ativo" : ""}
            onClick={() => setAba("mensagens")}
          >
            Mensagens Padrão
          </button>

          <button
            className={aba === "logs" ? "config-ativo" : ""}
            onClick={() => setAba("logs")}
          >
            Logs do Sistema
          </button>
        </aside>

        <div className="config-conteudo">
          {aba === "backup" && (
            <div className="config-card">
              <h2>Backup do Sistema</h2>
              <p>
                Baixe uma cópia segura do banco de dados da IL Ótica.
              </p>

              <a
                className="botao-link"
                href={`${import.meta.env.VITE_API_URL}/backup`}
                download
                onClick={() => registrarLog("Realizou backup do sistema")}
              >
                Fazer Backup
              </a>
            </div>
          )}

          {aba === "usuarios" && isAdmin && (
            <>
              <div className="config-card">
                <h2>Criar Usuário</h2>
                <p>Cadastre novos acessos para o sistema.</p>

                <form className="form">
                  <input
                    placeholder="Nome do usuário"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />

                  <input
                    type="email"
                    placeholder="E-mail de acesso"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <input
                    type="password"
                    placeholder="Senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />

                  <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                    <option value="admin">Administrador</option>
                    <option value="funcionario">Funcionário</option>
                    <option value="suporte">Suporte</option>
                  </select>

                  <button type="button" onClick={criarUsuario}>
                    Criar Usuário
                  </button>
                </form>
              </div>

              <div className="lista">
                <h2>Usuários cadastrados</h2>

                {usuarios.length === 0 ? (
                  <p>Nenhum usuário cadastrado.</p>
                ) : (
                  usuarios.map((usuario) => (
                    <div className="item" key={usuario.id}>
                      <strong>{usuario.nome}</strong>
                      <span>E-mail: {usuario.email}</span>
                      <span>Tipo: {usuario.tipo}</span>

                      <button
                        type="button"
                        onClick={() => excluirUsuario(usuario.id, usuario.nome)}
                      >
                        Excluir
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {aba === "loja" && (
            <div className="config-card">
              <h2>Dados da Loja</h2>
              <p>Edite as informações principais da IL Ótica.</p>

              <form className="form">
                <input
                  placeholder="Nome da Loja"
                  value={nomeLoja}
                  onChange={(e) => setNomeLoja(e.target.value)}
                />

                <input
                  placeholder="CNPJ"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                />

                <input
                  placeholder="Telefone"
                  value={telefoneLoja}
                  onChange={(e) => setTelefoneLoja(e.target.value)}
                />

                <input
                  placeholder="Endereço"
                  value={enderecoLoja}
                  onChange={(e) => setEnderecoLoja(e.target.value)}
                />

                <input
                  placeholder="Instagram"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />

                <input
                  placeholder="Horário de Funcionamento"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                />

                <button type="button" onClick={salvarLoja}>
                  Salvar Dados da Loja
                </button>
              </form>
            </div>
          )}

          {aba === "mensagens" && (
            <div className="config-card">
              <h2>Mensagens Padrão</h2>
              <p>Em breve você poderá personalizar mensagens do WhatsApp.</p>

              <div className="info-box">
                <strong>Ideias para essa aba:</strong>
                <span>Mensagem de aniversário</span>
                <span>Mensagem de pedido pronto</span>
                <span>Mensagem de retorno de exame</span>
                <span>Mensagem promocional</span>
              </div>
            </div>
          )}

          {aba === "logs" && (
            <div className="config-card">
              <h2>Logs do Sistema</h2>
              <p>Todas as ações registradas no sistema.</p>

              <div className="lista">
                {logs.length === 0 ? (
                  <p>Nenhum log registrado.</p>
                ) : (
                  logs.map((log) => (
                    <div className="item" key={log.id}>
                      <strong>{log.usuario}</strong>
                      <span>{log.acao}</span>
                      <small>
                        {log.data} às {log.hora}
                      </small>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Configuracoes;
import logo from "../assets/logo-ilotica.png";

function Sidebar({
  pagina,
  setPagina,
  usuarioLogado,
  podeVerFinanceiro,
  podeVerConfiguracoes,
  sair,
}) {
  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-logo">
          <img src={logo} alt="Logo IL Ótica" />
        </div>

        <nav>
          <button
            className={pagina === "dashboard" ? "ativo" : ""}
            onClick={() => setPagina("dashboard")}
          >
            Dashboard
          </button>

          <button
            className={pagina === "clientes" ? "ativo" : ""}
            onClick={() => setPagina("clientes")}
          >
            Clientes
          </button>

          <button
            className={pagina === "exames" ? "ativo" : ""}
            onClick={() => setPagina("exames")}
          >
            Exames
          </button>

          <button
            className={pagina === "agenda" ? "ativo" : ""}
            onClick={() => setPagina("agenda")}
          >
            Agenda
          </button>

          <button
            className={pagina === "produtos" ? "ativo" : ""}
            onClick={() => setPagina("produtos")}
          >
            Produtos
          </button>

          <button
            className={pagina === "vendas" ? "ativo" : ""}
            onClick={() => setPagina("vendas")}
          >
            Vendas
          </button>

          {podeVerConfiguracoes && (
            <button
              className={pagina === "configuracoes" ? "ativo" : ""}
              onClick={() => setPagina("configuracoes")}
            >
              Configurações
            </button>
          )}

          {podeVerFinanceiro && (
            <button
              className={pagina === "financeiro" ? "ativo" : ""}
              onClick={() => setPagina("financeiro")}
            >
              Financeiro
            </button>
          )}
        </nav>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">
          {usuarioLogado?.nome?.charAt(0)?.toUpperCase()}
        </div>

        <div className="user-info">
          <strong>{usuarioLogado.nome}</strong>
          <span>
            {usuarioLogado.tipo === "admin"
              ? "Administrador"
              : usuarioLogado.tipo === "suporte"
              ? "Suporte"
              : "Funcionário"}
          </span>
        </div>

        <button type="button" onClick={sair}>
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
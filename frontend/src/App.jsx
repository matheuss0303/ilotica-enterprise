import { useState } from "react";
import "./App.css";

import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Exames from "./pages/Exames";
import Produtos from "./pages/Produtos";
import Vendas from "./pages/Vendas";
import Login from "./pages/Login";
import Configuracoes from "./pages/Configuracoes";
import Financeiro from "./pages/Financeiro";
import Agenda from "./pages/Agenda";
import CriarSenha from "./pages/CriarSenha";

function App() {
  const [pagina, setPagina] = useState("dashboard");
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  const rotaAtual = window.location.pathname;

  if (rotaAtual === "/criar-senha") {
    return <CriarSenha />;
  }

  if (!usuarioLogado) {
    return <Login setUsuarioLogado={setUsuarioLogado} />;
  }

  const tipoUsuario = usuarioLogado.tipo;

  const podeVerFinanceiro = tipoUsuario === "admin";
  const podeVerConfiguracoes =
    tipoUsuario === "admin" || tipoUsuario === "suporte";

  function sair() {
    setUsuarioLogado(null);
    setPagina("dashboard");
  }

  return (
    <div className="app">
      <Sidebar
        pagina={pagina}
        setPagina={setPagina}
        usuarioLogado={usuarioLogado}
        podeVerFinanceiro={podeVerFinanceiro}
        podeVerConfiguracoes={podeVerConfiguracoes}
        sair={sair}
      />

      <main className="content">
        {pagina === "dashboard" && <Dashboard usuarioLogado={usuarioLogado} />}
        {pagina === "clientes" && <Clientes usuarioLogado={usuarioLogado} />}
        {pagina === "agenda" && <Agenda usuarioLogado={usuarioLogado} />}
        {pagina === "exames" && <Exames usuarioLogado={usuarioLogado} />}
        {pagina === "produtos" && <Produtos />}
        {pagina === "vendas" && <Vendas usuarioLogado={usuarioLogado} />}

        {pagina === "financeiro" &&
          (podeVerFinanceiro ? <Financeiro /> : <AcessoNegado />)}

        {pagina === "configuracoes" &&
          (podeVerConfiguracoes ? (
            <Configuracoes usuarioLogado={usuarioLogado} />
          ) : (
            <AcessoNegado />
          ))}
      </main>
    </div>
  );
}

function AcessoNegado() {
  return (
    <section className="page">
      <h1>Acesso negado</h1>
      <p>Seu perfil de usuário não tem permissão para acessar esta área.</p>
    </section>
  );
}

export default App;
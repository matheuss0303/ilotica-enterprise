import { useState } from "react";
import api from "../services/api";
import logo from "../assets/logo-ilotica.png";

function Login({ setUsuarioLogado }) {
  const [modo, setModo] = useState("login");

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  async function entrar() {
    if (!email || !senha) {
      alert("Preencha e-mail e senha.");
      return;
    }

    try {
      const resposta = await api.post("/login", {
        email,
        senha,
      });

      setUsuarioLogado(resposta.data.usuario);
    } catch (error) {
      alert(error.response?.data?.mensagem || "Erro ao fazer login.");
    }
  }

  async function enviarCodigo() {
    if (!emailRecuperacao) {
      alert("Informe seu e-mail.");
      return;
    }

    try {
      await api.post("/enviar-codigo-recuperacao", {
        email: emailRecuperacao,
      });

      alert("Código enviado para seu e-mail.");
      setModo("codigo");
    } catch (error) {
      alert(error.response?.data?.mensagem || "Erro ao enviar código.");
    }
  }

  async function alterarSenha() {
    if (!codigo || !novaSenha || !confirmarSenha) {
      alert("Preencha todos os campos.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      alert("As senhas não conferem.");
      return;
    }

    if (novaSenha.length < 6) {
      alert("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    try {
      await api.post("/recuperar-senha", {
        email: emailRecuperacao,
        codigo,
        novaSenha,
      });

      alert("Senha alterada com sucesso. Faça login com a nova senha.");

      setModo("login");
      setEmail(emailRecuperacao);
      setSenha("");
      setEmailRecuperacao("");
      setCodigo("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (error) {
      alert(error.response?.data?.mensagem || "Erro ao alterar senha.");
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <img src={logo} alt="IL Ótica" className="login-big-logo" />

        <h1>IL Ótica</h1>

        <h2>Sistema Inteligente de Gestão</h2>

        <p>
          Plataforma profissional para gerenciamento de clientes, exames,
          vendas, financeiro, estoque e produção óptica.
        </p>

        <div className="login-features">
          <span>✓ Controle de O.S</span>
          <span>✓ Agenda Inteligente</span>
          <span>✓ Financeiro Completo</span>
          <span>✓ Dashboard Executivo</span>
          <span>✓ Controle de Estoque</span>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card-premium">
          {modo === "login" && (
            <>
              <h3>Bem-vindo</h3>
              <p>Acesse sua conta para continuar</p>

              <input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder="Sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />

              <button type="button" onClick={entrar}>
                Entrar no Sistema
              </button>

              <button
                type="button"
                className="login-link-button"
                onClick={() => setModo("recuperar")}
              >
                Esqueci minha senha
              </button>
            </>
          )}

          {modo === "recuperar" && (
            <>
              <h3>Recuperar senha</h3>
              <p>Digite seu e-mail para receber o código de segurança.</p>

              <input
                type="email"
                placeholder="E-mail cadastrado"
                value={emailRecuperacao}
                onChange={(e) => setEmailRecuperacao(e.target.value)}
              />

              <button type="button" onClick={enviarCodigo}>
                Enviar Código
              </button>

              <button
                type="button"
                className="login-link-button"
                onClick={() => setModo("login")}
              >
                Voltar para o login
              </button>
            </>
          )}

          {modo === "codigo" && (
            <>
              <h3>Código de verificação</h3>
              <p>Digite o código recebido no e-mail e crie uma nova senha.</p>

              <input
                type="text"
                placeholder="Código de 6 dígitos"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />

              <input
                type="password"
                placeholder="Nova senha"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />

              <input
                type="password"
                placeholder="Confirmar nova senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
              />

              <button type="button" onClick={alterarSenha}>
                Alterar Senha
              </button>

              <button
                type="button"
                className="login-link-button"
                onClick={() => setModo("recuperar")}
              >
                Reenviar código
              </button>
            </>
          )}

          <div className="login-footer">
            <small>IL Ótica © 2026</small>
            <small>Versão Enterprise</small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
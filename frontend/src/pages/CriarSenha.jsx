import { useEffect, useState } from "react";
import api from "../services/api";
import logo from "../assets/logo-ilotica.png";

function CriarSenha() {
  const [token, setToken] = useState("");
  const [usuario, setUsuario] = useState(null);
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenUrl = params.get("token");

    if (!tokenUrl) {
      setErro("Token não encontrado.");
      return;
    }

    setToken(tokenUrl);
    validarToken(tokenUrl);
  }, []);

  async function validarToken(tokenUrl) {
    try {
      const resposta = await api.get(`/validar-convite/${tokenUrl}`);
      setUsuario(resposta.data);
    } catch (error) {
      setErro(error.response?.data?.mensagem || "Convite inválido.");
    }
  }

  async function criarSenha() {
    if (!senha || !confirmarSenha) {
      alert("Preencha todos os campos.");
      return;
    }

    if (senha !== confirmarSenha) {
      alert("As senhas não conferem.");
      return;
    }

    if (senha.length < 6) {
      alert("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    try {
      await api.post("/criar-senha", {
        token,
        senha,
      });

      setSucesso(true);
    } catch (error) {
      alert(error.response?.data?.mensagem || "Erro ao criar senha.");
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <img src={logo} alt="IL Ótica" className="login-big-logo" />

        <h1>IL Ótica</h1>
        <h2>Criação de acesso</h2>

        <p>
          Defina sua senha para acessar o sistema de gestão da IL Ótica.
        </p>

        <div className="login-features">
          <span>✓ Convite seguro por e-mail</span>
          <span>✓ Senha criptografada</span>
          <span>✓ Acesso individual por usuário</span>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card-premium">
          {erro && (
            <>
              <h3>Convite inválido</h3>
              <p>{erro}</p>

              <button type="button" onClick={() => (window.location.href = "/")}>
                Voltar para login
              </button>
            </>
          )}

          {!erro && !sucesso && usuario && (
            <>
              <h3>Criar senha</h3>
              <p>
                Olá, <strong>{usuario.nome}</strong>. Crie sua senha para
                acessar o sistema.
              </p>

              <input
                type="password"
                placeholder="Nova senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />

              <input
                type="password"
                placeholder="Confirmar senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
              />

              <button type="button" onClick={criarSenha}>
                Criar Senha
              </button>
            </>
          )}

          {sucesso && (
            <>
              <h3>Senha criada!</h3>
              <p>Agora você já pode acessar o sistema com seu e-mail e senha.</p>

              <button type="button" onClick={() => (window.location.href = "/")}>
                Ir para o login
              </button>
            </>
          )}

          <div className="login-footer">
            <small>IL Ótica © 2026</small>
            <small>Convite Seguro</small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CriarSenha;
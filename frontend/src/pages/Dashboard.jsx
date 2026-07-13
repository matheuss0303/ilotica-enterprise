import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "../services/api";

function Dashboard({ usuarioLogado }) {
  const [aba, setAba] = useState("resumo");
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [exames, setExames] = useState([]);
  const [totalDevedores, setTotalDevedores] = useState(0); 
  const podeVerFinanceiro = usuarioLogado?.tipo === "admin";

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      const clientesResposta = await api.get("/clientes");
      const produtosResposta = await api.get("/produtos");
      const vendasResposta = await api.get("/vendas");
      const examesResposta = await api.get("/exames");
      
      const devedoresResposta = await api.get("/dashboard/devedores-contador");

      setClientes(clientesResposta.data);
      setProdutos(produtosResposta.data);
      setVendas(vendasResposta.data);
      setExames(examesResposta.data);
      setTotalDevedores(devedoresResposta.data.total);
    } catch (erro) {
      console.error("Erro ao carregar os dados do dashboard:", erro);
    }
  }

  function enviarAniversarioWhatsApp(cliente) {
    const numero = cliente.whatsapp || cliente.telefone || "";
    const numeroLimpo = numero.replace(/\D/g, "");

    const mensagem = `Olá ${cliente.nome}! 🎉 A equipe da IL Ótica deseja um feliz aniversário, com muita saúde, felicidade e sucesso. Que seu dia seja especial! 👓🎂`;

    const url = numeroLimpo
      ? `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`
      : `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");
  }

  const hoje = new Date();
  const mesHoje = String(hoje.getMonth() + 1).padStart(2, "0");
  const diaHoje = String(hoje.getDate()).padStart(2, "0");

  const aniversariantes = clientes.filter((cliente) => {
    if (!cliente.nascimento) return false;
    const partes = cliente.nascimento.split("-");
    return partes[1] === mesHoje && partes[2] === diaHoje;
  });

  const estoqueBaixo = produtos.filter(
    (produto) =>
      Number(produto.estoque || 0) <= Number(produto.estoque_minimo || 5)
  );

  const osAguardando = exames.filter(
    (exame) => (exame.status_os || "Aguardando Lente") === "Aguardando Lente"
  ).length;

  const osProducao = exames.filter(
    (exame) => exame.status_os === "Em Produção"
  ).length;

  const osProntas = exames.filter(
    (exame) => exame.status_os === "Pronto para Retirada"
  ).length;

  const osEntregues = exames.filter(
    (exame) => exame.status_os === "Entregue"
  ).length;

  const vendasPorPagamento = ["PIX", "Cartão", "Dinheiro"].map((forma) => ({
    name: forma,
    value: vendas.filter((venda) => venda.formaPagamento === forma).length,
  }));

  const dadosResumo = [
    { nome: "Clientes", total: clientes.length },
    { nome: "Produtos", total: produtos.length },
    { nome: "Vendas", total: vendas.length },
    { nome: "Exames", total: exames.length },
  ];

  const ultimasVendas = vendas.slice(0, 5);

  return (
    <section className="page">
      <h1>Dashboard</h1>
      <p>Resumo operacional e produtivo da IL Ótica.</p>

      <div className="abas-internas">
        <button
          className={aba === "resumo" ? "aba-ativa" : ""}
          onClick={() => setAba("resumo")}
        >
          Resumo
        </button>

        <button
          className={aba === "aniversariantes" ? "aba-ativa" : ""}
          onClick={() => setAba("aniversariantes")}
        >
          Aniversariantes
        </button>

        <button
          className={aba === "graficos" ? "aba-ativa" : ""}
          onClick={() => setAba("graficos")}
        >
          Gráficos
        </button>

        <button
          className={aba === "pedidos" ? "aba-ativa" : ""}
          onClick={() => setAba("pedidos")}
        >
          Últimos Pedidos
        </button>

        <button
          className={aba === "producao" ? "aba-ativa" : ""}
          onClick={() => setAba("producao")}
        >
          Produção da Ótica
        </button>

        <button
          className={aba === "estoque" ? "aba-ativa" : ""}
          onClick={() => setAba("estoque")}
        >
          Estoque
        </button>
      </div>

      {aba === "resumo" && (
        <section className="cards">

          {podeVerFinanceiro && (
            <>
              {/* Mantido apenas o controle de inadimplência no bloco financeiro do painel */}
              <div className="card">
                <span>🔴 Clientes Inadimplentes</span>
                <strong>{totalDevedores}</strong>
              </div>
            </>
          )}

          <div className="card">
            <span>Clientes</span>
            <strong>{clientes.length}</strong>
          </div>

          <div className="card">
            <span>Produtos</span>
            <strong>{produtos.length}</strong>
          </div>

          <div className="card">
            <span>Exames / O.S</span>
            <strong>{exames.length}</strong>
          </div>

          <div className="card">
            <span>🟡 Aguardando Lente</span>
            <strong>{osAguardando}</strong>
          </div>

          <div className="card">
            <span>🔵 Em Produção</span>
            <strong>{osProducao}</strong>
          </div>

          <div className="card">
            <span>🟢 Pronto p/ Retirada</span>
            <strong>{osProntas}</strong>
          </div>

          <div className="card">
            <span>⚫ Entregues</span>
            <strong>{osEntregues}</strong>
          </div>

          <div className="card">
            <span>Estoque Crítico</span>
            <strong>{estoqueBaixo.length}</strong>
          </div>

          <div className="card">
            <span>Aniversariantes Hoje</span>
            <strong>{aniversariantes.length}</strong>
          </div>
        </section>
      )}

      {aba === "aniversariantes" && (
        <div className="lista">
          <h2>Aniversariantes do Dia 🎉</h2>

          {aniversariantes.length === 0 ? (
            <p>Nenhum cliente fazendo aniversário hoje.</p>
          ) : (
            aniversariantes.map((cliente) => (
              <div className="item" key={cliente.id}>
                <strong>{cliente.nome}</strong>
                <span>Telefone: {cliente.telefone}</span>
                <span>WhatsApp: {cliente.whatsapp || "Não informado"}</span>
                <span>Nascimento: {cliente.nascimento}</span>

                <button
                  type="button"
                  onClick={() => enviarAniversarioWhatsApp(cliente)}
                >
                  Enviar Feliz Aniversário
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {aba === "graficos" && (
        <section className="graficos">
          <div className="grafico-card">
            <h2>Resumo Geral</h2>

            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dadosResumo}>
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grafico-card">
            <h2>Vendas por Pagamento</h2>

            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={vendasPorPagamento}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  <Cell fill="#2563eb" />
                  <Cell fill="#0f172a" />
                  <Cell fill="#94a3b8" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {aba === "pedidos" && (
        <div className="lista">
          <h2>Últimos Pedidos</h2>

          {ultimasVendas.length === 0 ? (
            <p>Nenhum pedido registrado ainda.</p>
          ) : (
            ultimasVendas.map((venda) => (
              <div className="item" key={venda.id}>
                <strong>{venda.cliente}</strong>
                <span>Produto: {venda.produto}</span>
                {podeVerFinanceiro && <span>Valor: R$ {Number(venda.valorTotal).toFixed(2)}</span>}              
                <span>Pagamento: {venda.formaPagamento}</span>
                <span>Status: {venda.status}</span>
                <small>Data: {venda.data}</small>
              </div>
            ))
          )}
        </div>
      )}

      {aba === "producao" && (
        <div className="lista">
          <h2>Produção da Ótica</h2>

          {["Aguardando Lente", "Em Produção", "Pronto para Retirada", "Entregue"].map(
            (status) => {
              const examesPorStatus = exames.filter(
                (exame) =>
                  (exame.status_os || "Aguardando Lente") === status
              );

              return (
                <div className="producao-bloco" key={status}>
                  <h3>{status}</h3>

                  {examesPorStatus.length === 0 ? (
                    <p>Nenhuma O.S neste status.</p>
                  ) : (
                    examesPorStatus.map((exame) => (
                      <div className="item pedido-card" key={exame.id}>
                        <strong>
                          O.S Nº {String(exame.id).padStart(4, "0")} -{" "}
                          {exame.cliente}
                        </strong>

                        <span>Data: {exame.data}</span>
                        <span>Médico: {exame.medico || "Não informado"}</span>
                        <span>
                          Tipo de lente: {exame.tipo_lente || "Não informado"}
                        </span>
                        <span>Status: {exame.status_os || "Aguardando Lente"}</span>
                      </div>
                    ))
                  )}
                </div>
              );
            }
          )}
        </div>
      )}

      {aba === "estoque" && (
        <div className="lista">
          <h2>Produtos com Estoque Crítico</h2>

          {estoqueBaixo.length === 0 ? (
            <p>Nenhum produto com estoque crítico.</p>
          ) : (
            estoqueBaixo.map((produto) => (
              <div className="item pedido-card" key={produto.id}>
                <strong>{produto.nome}</strong>
                <span>Marca: {produto.marca || "Não informada"}</span>
                <span>Categoria: {produto.categoria}</span>
                <span>Estoque Atual: {produto.estoque}</span>
                <span>Estoque Mínimo: {produto.estoque_minimo || 5}</span>
                <span style={{ color: "red", fontWeight: "bold" }}>
                  🔴 Estoque Crítico
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

export default Dashboard;
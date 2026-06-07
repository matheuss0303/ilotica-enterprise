import { useEffect, useState } from "react";
import api from "../services/api";

function Produtos() {
  const [aba, setAba] = useState("cadastro");
  const [produtos, setProdutos] = useState([]);
  const [editandoId, setEditandoId] = useState(null);

  const [nome, setNome] = useState("");
  const [marca, setMarca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [precoCusto, setPrecoCusto] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [estoque, setEstoque] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState(5);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    buscarProdutos();
  }, []);

  async function buscarProdutos() {
    const resposta = await api.get("/produtos");
    setProdutos(resposta.data);
  }

  function limparFormulario() {
    setNome("");
    setMarca("");
    setCategoria("");
    setPrecoCusto("");
    setPrecoVenda("");
    setEstoque("");
    setEstoqueMinimo(5);
    setEditandoId(null);
  }

  async function salvarProduto() {
    if (!nome || !categoria || !precoVenda || estoque === "") {
      alert("Preencha nome, categoria, preço de venda e estoque.");
      return;
    }

    const dados = {
      nome,
      marca,
      categoria,
      precoCusto,
      precoVenda,
      estoque,
      estoque_minimo: estoqueMinimo,
    };

    if (editandoId) {
      await api.put(`/produtos/${editandoId}`, dados);
    } else {
      await api.post("/produtos", dados);
    }

    limparFormulario();
    buscarProdutos();
    setAba("lista");
  }

  async function excluirProduto(id) {
    await api.delete(`/produtos/${id}`);
    buscarProdutos();
  }

  function editarProduto(produto) {
    setEditandoId(produto.id);
    setNome(produto.nome || "");
    setMarca(produto.marca || "");
    setCategoria(produto.categoria || "");
    setPrecoCusto(produto.precoCusto || "");
    setPrecoVenda(produto.precoVenda || "");
    setEstoque(produto.estoque || "");
    setEstoqueMinimo(produto.estoque_minimo || 5);
    setAba("cadastro");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function statusEstoque(produto) {
    const atual = Number(produto.estoque || 0);
    const minimo = Number(produto.estoque_minimo || 5);

    if (atual <= 0) return "🔴 Sem estoque";
    if (atual <= minimo) return "🟠 Estoque crítico";
    return "🟢 Estoque normal";
  }

  const produtosFiltrados = produtos.filter((produto) => {
    const textoBusca = busca.toLowerCase();

    return (
      (produto.nome || "").toLowerCase().includes(textoBusca) ||
      (produto.marca || "").toLowerCase().includes(textoBusca) ||
      (produto.categoria || "").toLowerCase().includes(textoBusca)
    );
  });

  const estoqueBaixo = produtos.filter(
    (produto) =>
      Number(produto.estoque || 0) <= Number(produto.estoque_minimo || 5)
  );

  return (
    <section className="page">
      <h1>Produtos</h1>
      <p>Controle profissional de produtos, preços e estoque inteligente.</p>

      <div className="abas-internas">
        <button
          className={aba === "cadastro" ? "aba-ativa" : ""}
          onClick={() => setAba("cadastro")}
        >
          Cadastrar / Editar
        </button>

        <button
          className={aba === "lista" ? "aba-ativa" : ""}
          onClick={() => setAba("lista")}
        >
          Lista de Produtos
        </button>

        <button
          className={aba === "estoque" ? "aba-ativa" : ""}
          onClick={() => setAba("estoque")}
        >
          Estoque Inteligente
        </button>
      </div>

      {aba === "cadastro" && (
        <form className="form">
          <input
            type="text"
            placeholder="Nome do produto"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <input
            type="text"
            placeholder="Marca"
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
          />

          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Selecione a categoria</option>
            <option value="Armação">Armação</option>
            <option value="Lente">Lente</option>
            <option value="Acessório">Acessório</option>
          </select>

          <input
            type="number"
            placeholder="Preço de custo"
            value={precoCusto}
            onChange={(e) => setPrecoCusto(e.target.value)}
          />

          <input
            type="number"
            placeholder="Preço de venda"
            value={precoVenda}
            onChange={(e) => setPrecoVenda(e.target.value)}
          />

          <input
            type="number"
            placeholder="Quantidade em estoque"
            value={estoque}
            onChange={(e) => setEstoque(e.target.value)}
          />

          <input
            type="number"
            placeholder="Estoque mínimo"
            value={estoqueMinimo}
            onChange={(e) => setEstoqueMinimo(e.target.value)}
          />

          <button type="button" onClick={salvarProduto}>
            {editandoId ? "Atualizar Produto" : "Salvar Produto"}
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
            type="text"
            placeholder="Buscar produto por nome, marca ou categoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <div className="lista">
            <h2>Produtos cadastrados</h2>

            {produtosFiltrados.length === 0 ? (
              <p>Nenhum produto encontrado.</p>
            ) : (
              produtosFiltrados.map((produto) => (
                <div className="item" key={produto.id}>
                  <strong>{produto.nome}</strong>
                  <span>Marca: {produto.marca || "Não informada"}</span>
                  <span>Categoria: {produto.categoria}</span>
                  <span>
                    Preço de Custo: R$ {Number(produto.precoCusto || 0).toFixed(2)}
                  </span>
                  <span>
                    Preço de Venda: R$ {Number(produto.precoVenda || 0).toFixed(2)}
                  </span>
                  <span>Estoque Atual: {produto.estoque}</span>
                  <span>Estoque Mínimo: {produto.estoque_minimo || 5}</span>
                  <span>{statusEstoque(produto)}</span>

                  <button type="button" onClick={() => editarProduto(produto)}>
                    Editar
                  </button>

                  <button type="button" onClick={() => excluirProduto(produto.id)}>
                    Excluir
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {aba === "estoque" && (
        <div className="lista">
          <h2>Estoque Inteligente</h2>
          <p>Produtos com estoque atual menor ou igual ao estoque mínimo.</p>

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
                  {statusEstoque(produto)}
                </span>

                <button type="button" onClick={() => editarProduto(produto)}>
                  Atualizar Estoque
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

export default Produtos;
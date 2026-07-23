const express = require("express");
const cors = require("cors");
const conectarBanco = require("./database");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

require("dotenv").config();

const app = express();

app.use(cors({
  origin: "https://ilotica-enterprise.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.options("/(.*)", cors());

app.use(express.json({ limit: "50mb" }));

let db;

let tokensRecuperacao = {};

const transpotador = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_REMETENTE, 
    pass: process.env.EMAIL_PASSWORD,     
  },
});

async function iniciarServidor() {
  db = await conectarBanco();

  try {
    await db.run("ALTER TABLE parcelas ADD COLUMN data_pagamento TEXT").catch(() => {});
    await db.run("ALTER TABLE parcelas ADD COLUMN valor_pago REAL").catch(() => {});
  } catch (e) {
    console.log("Colunas já existentes ou prontas.");
  }

  // ROTA RAIZ
  app.get("/", (req, res) => {
    res.json({
      sistema: "IL Ótica",
      status: "online",
      banco: "SQLite/PostgreSQL conectado",
    });
  });

  // ==========================================
  // CLIENTES
  // ==========================================
  app.get("/clientes", async (req, res) => {
    const clientes = await db.all("SELECT * FROM clientes ORDER BY id DESC");
    res.json(clientes);
  });

  app.post("/clientes", async (req, res) => {
    const {
      nome,
      telefone,
      whatsapp,
      cpf,
      nascimento,
      endereco,
      observacoes,
      foto,
      criadoPor,
    } = req.body;

    const resultado = await db.run(
      `INSERT INTO clientes
      (
        nome,
        telefone,
        whatsapp,
        cpf,
        nascimento,
        endereco,
        observacoes,
        foto,
        criadoPor
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nome,
        telefone,
        whatsapp,
        cpf,
        nascimento,
        endereco,
        observacoes,
        foto,
        criadoPor,
      ]
    );

    const agora = new Date();

    await db.run(
      "INSERT INTO logs (usuario, acao, data, hora) VALUES (?, ?, ?, ?)",
      [
        criadoPor || "Sistema",
        `Criou o cliente ${nome}`,
        agora.toLocaleDateString("pt-BR"),
        agora.toLocaleTimeString("pt-BR"),
      ]
    );

    res.json({
      id: resultado.lastID,
      mensagem: "Cliente cadastrado com sucesso.",
    });
  });

  app.put("/clientes/:id", async (req, res) => {
    const { id } = req.params;
    const {
      nome,
      telefone,
      whatsapp,
      cpf,
      nascimento,
      endereco,
      observacoes,
      foto,
    } = req.body;

    await db.run(
      `UPDATE clientes SET
        nome = ?,
        telefone = ?,
        whatsapp = ?,
        cpf = ?,
        nascimento = ?,
        endereco = ?,
        observacoes = ?,
        foto = ?
      WHERE id = ?`,
      [
        nome,
        telefone,
        whatsapp,
        cpf,
        nascimento,
        endereco,
        observacoes,
        foto,
        id,
      ]
    );

    res.json({ mensagem: "Cliente updated com sucesso." });
  });

  app.delete("/clientes/:id", async (req, res) => {
    await db.run("DELETE FROM clientes WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Cliente removido com sucesso." });
  });

  // HISTÓRICO DO CLIENTE POR ID
  app.get("/clientes/:id/historico", async (req, res) => {
    const { id } = req.params;

    const cliente = await db.get("SELECT * FROM clientes WHERE id = ?", [id]);

    if (!cliente) {
      return res.status(404).json({
        mensagem: "Cliente não encontrado.",
      });
    }

    const vendas = await db.all(
      "SELECT * FROM vendas WHERE cliente = ? ORDER BY id DESC",
      [cliente.nome]
    );

    const exames = await db.all(
      "SELECT * FROM exames WHERE cliente = ? ORDER BY id DESC",
      [cliente.nome]
    );

    const totalGasto = vendas.reduce(
      (total, venda) => total + Number(venda.valorTotal),
      0
    );

    res.json({
      cliente,
      vendas,
      exames,
      totalGasto,
    });
  });

  // ==========================================
  // PARCELAMENTOS
  // ==========================================
  app.get("/parcelamentos/:clienteId", async (req, res) => {
    try {
      const { clienteId } = req.params;

      const parcelamentos = await db.all(
        `SELECT * FROM parcelamentos
         WHERE cliente_id = ?
         ORDER BY id DESC`,
        [clienteId]
      );

      res.json(parcelamentos);
    } catch (erro) {
      console.error(erro);
      res.status(500).json({
        mensagem: "Erro ao buscar parcelamentos.",
      });
    }
  });

  app.get("/parcelamentos/detalhes/:parcelamentoId", async (req, res) => {
    try {
      const { parcelamentoId } = req.params;
      const parcelas = await db.all(
        `SELECT * FROM parcelas WHERE parcelamento_id = ? ORDER BY numero ASC`,
        [parcelamentoId]
      );
      res.json(parcelas);
    } catch (erro) {
      console.error(erro);
      res.status(500).json({ mensagem: "Erro ao buscar detalhes das parcelas." });
    }
  });

  app.get("/financeiro/devedores", async (req, res) => {
    try {
      const devedores = await db.all(
        `SELECT p.*, c.nome AS cliente_nome, c.telefone AS cliente_telefone 
         FROM parcelamentos p
         JOIN clientes c ON p.cliente_id = c.id
         WHERE p.status = 'Aberto'
         ORDER BY p.id DESC`
      );
      res.json(devedores);
    } catch (erro) {
      console.error(erro);
      res.status(500).json({ mensagem: "Erro ao buscar a lista de devedores." });
    }
  });

  app.get("/dashboard/devedores-contador", async (req, res) => {
    try {
      const resultado = await db.get(
        `SELECT COUNT(DISTINCT cliente_id) AS total FROM parcelamentos WHERE status = 'Aberto'`
      );
      res.json({ total: resultado ? resultado.total : 0 });
    } catch (erro) {
      console.error(erro);
      res.status(500).json({ mensagem: "Erro ao contar devedores do dashboard." });
    }
  });

  app.post("/parcelamentos", async (req, res) => {
    try {
      const {
        cliente_id,
        descricao,
        valor_total,
        entrada,
        quantidade_parcelas,
        vencimentos,
      } = req.body;

      if (!cliente_id || !valor_total || !quantidade_parcelas) {
        return res.status(400).json({ mensagem: "Dados obrigatórios não fornecidos." });
      }

      const valorEntrada = Number(entrada) || 0;
      const valorTotal = Number(valor_total);
      const valorRestante = valorTotal - valorEntrada;
      const qtdParcelas = Number(quantidade_parcelas);
      const valorParcela = valorRestante / qtdParcelas;

      const resultado = await db.run(
        `INSERT INTO parcelamentos
        (cliente_id, descricao, valor_total, entrada, valor_restante, quantidade_parcelas, parcelas_pagas, valor_parcela, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cliente_id, descricao, valorTotal, valorEntrada, valorRestante, qtdParcelas, 0, valorParcela, "Aberto"]
      );

      const parcelamentoId = resultado.lastID;

      for (let i = 1; i <= qtdParcelas; i++) {
        let vencimentoFormatado;
        
        if (vencimentos && vencimentos[i - 1]) {
          vencimentoFormatado = vencimentos[i - 1];
        } else {
          const dataVencimento = new Date();
          dataVencimento.setDate(dataVencimento.getDate() + (30 * i));
          vencimentoFormatado = dataVencimento.toISOString().split('T')[0];
        }

        await db.run(
          `INSERT INTO parcelas (parcelamento_id, numero, valor, vencimento, status)
           VALUES (?, ?, ?, ?, ?)`,
          [parcelamentoId, i, valorParcela, vencimentoFormatado, "Aberta"]
        );
      }

      res.status(201).json({ id: parcelamentoId, mensagem: "Parcelamento gerado com sucesso." });
    } catch (erro) {
      console.error("Erro ao criar parcelamento:", erro);
      res.status(500).json({ mensagem: "Erro interno ao gerar parcelamento." });
    }
  });

  // ==========================================
  // PRODUTOS
  // ==========================================
  app.get("/produtos", async (req, res) => {
    const produtos = await db.all("SELECT * FROM produtos ORDER BY id DESC");
    res.json(produtos);
  });

  app.post("/produtos", async (req, res) => {
    const {
      nome,
      marca,
      categoria,
      precoCusto,
      precoVenda,
      estoque,
      estoque_minimo,
    } = req.body;

    if (!nome || !categoria || !precoVenda || estoque === "") {
      return res.status(400).json({
        mensagem: "Nome, categoria, preço de venda e estoque são obrigatórios.",
      });
    }

    const resultado = await db.run(
      `INSERT INTO produtos 
      (nome, marca, categoria, precoCusto, precoVenda, estoque, estoque_minimo)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nome,
        marca || "",
        categoria,
        Number(precoCusto) || 0,
        Number(precoVenda),
        Number(estoque),
        Number(estoque_minimo) || 5,
      ]
    );

    res.status(201).json({ id: resultado.lastID });
  });

  app.put("/produtos/:id", async (req, res) => {
    const { id } = req.params;
    const {
      nome,
      marca,
      categoria,
      precoCusto,
      precoVenda,
      estoque,
      estoque_minimo,
    } = req.body;

    await db.run(
      `UPDATE produtos SET
        nome = ?,
        marca = ?,
        categoria = ?,
        precoCusto = ?,
        precoVenda = ?,
        estoque = ?,
        estoque_minimo = ?
      WHERE id = ?`,
      [
        nome,
        marca || "",
        categoria,
        Number(precoCusto) || 0,
        Number(precoVenda),
        Number(estoque),
        Number(estoque_minimo) || 5,
        id,
      ]
    );

    res.json({ mensagem: "Produto updated com sucesso." });
  });

  app.delete("/produtos/:id", async (req, res) => {
    await db.run("DELETE FROM produtos WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Produto removido com sucesso." });
  });

  // ==========================================
  // VENDAS
  // ==========================================
  app.get("/vendas", async (req, res) => {
    const vendas = await db.all("SELECT * FROM vendas ORDER BY id DESC");
    res.json(vendas);
  });

  app.post("/vendas", async (req, res) => {
    try {
      const {
        cliente,
        produto,
        valorTotal,
        desconto,
        valorPago,
        valorRestante,
        formaPagamento,
        status,
        usuario,
        itens, 
      } = req.body;

      if (!cliente || !valorTotal || !formaPagamento) {
        return res.status(400).json({
          mensagem: "Preencha os campos obrigatórios.",
        });
      }

      if (itens && Array.isArray(itens) && itens.length > 0) {
        for (const item of itens) {
          if (item.id) {
            await db.run(
              "UPDATE produtos SET estoque = CASE WHEN (estoque - ?) < 0 THEN 0 ELSE (estoque - ?) END WHERE id = ?",
              [Number(item.quantidade), Number(item.quantidade), item.id]
            );
          }
        }
      } else if (produto) {
        const produtoEncontrado = await db.get(
          "SELECT id FROM produtos WHERE nome = ?",
          [produto]
        );
        if (produtoEncontrado) {
          await db.run(
            "UPDATE produtos SET estoque = CASE WHEN (estoque - 1) < 0 THEN 0 ELSE (estoque - 1) END WHERE id = ?",
            [produtoEncontrado.id]
          );
        }
      }

      const data = new Date().toLocaleDateString("pt-BR");

      const resultado = await db.run(
        `INSERT INTO vendas 
        (cliente, produto, valorTotal, desconto, valorPago, valorRestante, formaPagamento, status, data, usuario)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cliente,
          produto || "Itens Múltiplos",
          Number(valorTotal),
          Number(desconto) || 0,
          Number(valorPago) || 0,
          Number(valorRestante) || 0,
          formaPagamento,
          status || "Orçamento",
          data,
          usuario || "Não identificado",
        ]
      );

      const agora = new Date();
      const datalog = agora.toLocaleDateString("pt-BR");
      const horalog = agora.toLocaleTimeString("pt-BR");

      await db.run(
        "INSERT INTO logs (usuario, acao, data, hora) VALUES (?, ?, ?, ?)",
        [
          usuario || "Sistema",
          `Registrou venda para ${cliente} - Valor: R$ ${Number(valorTotal).toFixed(2)}`,
          datalog,
          horalog
        ]
      );

      res.status(201).json({ id: resultado.lastID });

    } catch (erro) {
      console.error("Erro interno na rota de vendas:", erro);
      res.status(500).json({ mensagem: "Erro interno no servidor ao computar a venda." });
    }
  });

  app.put("/vendas/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    await db.run("UPDATE vendas SET status = ? WHERE id = ?", [status, id]);
    res.json({ mensagem: "Status updated com sucesso." });
  });

  app.delete("/vendas/:id", async (req, res) => {
    await db.run("DELETE FROM vendas WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Venda removida com sucesso." });
  });

  // ==========================================
  // EXAMES / O.S.
  // ==========================================
  app.get("/exames", async (req, res) => {
    const exames = await db.all("SELECT * FROM exames ORDER BY id DESC");
    res.json(exames);
  });

  app.post("/exames", async (req, res) => {
    const {
      cliente,
      data,
      criadoPor,
      longe_od_esferico,
      longe_od_cilindrico,
      longe_od_eixo,
      longe_od_dnp,
      longe_oe_esferico,
      longe_oe_cilindrico,
      longe_oe_eixo,
      longe_oe_dnp,
      perto_od_esferico,
      perto_od_cilindrico,
      perto_od_eixo,
      perto_od_dnp,
      perto_oe_esferico,
      perto_oe_cilindrico,
      perto_oe_eixo,
      perto_oe_dnp,
      adicao,
      altura,
      medico,
      tipo_lente,
      observacoes,
    } = req.body;

    if (!cliente || !data) {
      return res.status(400).json({
        mensagem: "Cliente e data são obrigatórios.",
      });
    }

    const resultadoBanco = await db.run(
      `INSERT INTO exames (
        cliente, data, criadoPor, status_os,
        longe_od_esferico, longe_od_cilindrico, longe_od_eixo, longe_od_dnp,
        longe_oe_esferico, longe_oe_cilindrico, longe_oe_eixo, longe_oe_dnp,
        perto_od_esferico, perto_od_cilindrico, perto_od_eixo, perto_od_dnp,
        perto_oe_esferico, perto_oe_cilindrico, perto_oe_eixo, perto_oe_dnp,
        adicao, altura, medico, tipo_lente, observacoes
      )
      VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )`,
      [
        cliente,
        data,
        criadoPor || "Sistema",
        "Aguardando Lente",
        longe_od_esferico || "",
        longe_od_cilindrico || "",
        longe_od_eixo || "",
        longe_od_dnp || "",
        longe_oe_esferico || "",
        longe_oe_cilindrico || "",
        longe_oe_eixo || "",
        longe_oe_dnp || "",
        perto_od_esferico || "",
        perto_od_cilindrico || "",
        perto_od_eixo || "",
        perto_od_dnp || "",
        perto_oe_esferico || "",
        perto_oe_cilindrico || "",
        perto_oe_eixo || "",
        perto_oe_dnp || "",
        adicao || "",
        altura || "",
        medico || "",
        tipo_lente || "",
        observacoes || "",
      ]
    );

    const agora = new Date();

    await db.run(
      "INSERT INTO logs (usuario, acao, data, hora) VALUES (?, ?, ?, ?)",
      [
        criadoPor || "Sistema",
        `Cadastrou exame/O.S para ${cliente}`,
        agora.toLocaleDateString("pt-BR"),
        agora.toLocaleTimeString("pt-BR"),
      ]
    );

    res.status(201).json({
      id: resultadoBanco.lastID,
      cliente,
      data,
      mensagem: "Receita cadastrada com sucesso.",  
    });
  });

  // ==========================================
  // ROTAS DE EXAMES (ATUALIZAÇÃO, STATUS E EXCLUSÃO)
  // ==========================================

  app.put("/exames/:id", async (req, res) => {
    const { id } = req.params;
    const {
      cliente,
      data,
      longe_od_esferico,
      longe_od_cilindrico,
      longe_od_eixo,
      longe_od_dnp,
      longe_oe_esferico,
      longe_oe_cilindrico,
      longe_oe_eixo,
      longe_oe_dnp,
      perto_od_esferico,
      perto_od_cilindrico,
      perto_od_eixo,
      perto_od_dnp,
      perto_oe_esferico,
      perto_oe_cilindrico,
      perto_oe_eixo,
      perto_oe_dnp,
      adicao,
      altura,
      medico,
      tipo_lente,
      observacoes,
      criadoPor, // Sincronizado com o frontend para identificar o usuário logado
    } = req.body;

    if (!cliente || !data) {
      return res.status(400).json({
        mensagem: "Cliente e data são obrigatórios.",
      });
    }

    try {
      // 1. Atualiza os dados da receita/O.S.
      await db.run(
        `UPDATE exames SET
          cliente = ?, data = ?,
          longe_od_esferico = ?, longe_od_cilindrico = ?, longe_od_eixo = ?, longe_od_dnp = ?,
          longe_oe_esferico = ?, longe_oe_cilindrico = ?, longe_oe_eixo = ?, longe_oe_dnp = ?,
          perto_od_esferico = ?, perto_od_cilindrico = ?, perto_od_eixo = ?, perto_od_dnp = ?,
          perto_oe_esferico = ?, perto_oe_cilindrico = ?, perto_oe_eixo = ?, perto_oe_dnp = ?,
          adicao = ?, altura = ?, medico = ?, tipo_lente = ?, observacoes = ?
        WHERE id = ?`,
        [
          cliente, data,
          longe_od_esferico || "", longe_od_cilindrico || "", longe_od_eixo || "", longe_od_dnp || "",
          longe_oe_esferico || "", longe_oe_cilindrico || "", longe_oe_eixo || "", longe_oe_dnp || "",
          perto_od_esferico || "", perto_od_cilindrico || "", perto_od_eixo || "", perto_od_dnp || "",
          perto_oe_esferico || "", perto_oe_cilindrico || "", perto_oe_eixo || "", perto_oe_dnp || "",
          adicao || "", altura || "", medico || "", tipo_lente || "", observacoes || "",
          id
        ]
      );

      // 2. Registra a edição no histórico de logs
      const agora = new Date();
      await db.run(
        "INSERT INTO logs (usuario, acao, data, hora) VALUES (?, ?, ?, ?)",
        [
          criadoPor || "Sistema",
          `Editou a receita/O.S Nº ${id} do cliente ${cliente}`,
          agora.toLocaleDateString("pt-BR"),
          agora.toLocaleTimeString("pt-BR"),
        ]
      );

      res.json({ mensagem: "Receita atualizada com sucesso!" });
    } catch (erro) {
      console.error("Erro ao atualizar exame:", erro);
      res.status(500).json({ mensagem: "Erro ao atualizar a receita." });
    }
  });

  app.put("/exames/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status_os } = req.body;

    try {
      await db.run("UPDATE exames SET status_os = ? WHERE id = ?", [status_os, id]);
      res.json({ mensagem: "Status da O.S atualizado com sucesso." });
    } catch (erro) {
      console.error("Erro ao atualizar status:", erro);
      res.status(500).json({ mensagem: "Erro ao atualizar status da O.S." });
    }
  });

  app.delete("/exames/:id", async (req, res) => {
    const { id } = req.params;
    
    try {
      await db.run("DELETE FROM exames WHERE id = ?", [id]);
      res.json({ mensagem: "Exame removido com sucesso." });
    } catch (erro) {
      console.error("Erro ao deletar exame:", erro);
      res.status(500).json({ mensagem: "Erro ao excluir a receita." });
    }
  });

  // ==========================================
  // USUÁRIOS
  // ==========================================
  app.get("/usuarios", async (req, res) => {
    const usuarios = await db.all(
      "SELECT id, nome, email, tipo FROM usuarios ORDER BY id DESC"
    );
    res.json(usuarios);
  });

  app.post("/usuarios", async (req, res) => {
    const { nome, email, senha, tipo } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        mensagem: "Nome, e-mail e senha são obrigatórios.",
      });
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!emailValido) {
      return res.status(400).json({
        mensagem: "Informe um e-mail válido.",
      });
    }

    const emailFormatado = email.toLowerCase().trim();
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    try {
      const resultado = await db.run(
        `INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)`,
        [nome, emailFormatado, senhaCriptografada, tipo || "funcionario"]
      );

      res.status(201).json({
        id: resultado.lastID,
        nome,
        email: emailFormatado,
        tipo: tipo || "funcionario",
        mensagem: "Usuário criado com sucesso.",
      });
    } catch (error) {
      res.status(400).json({
        mensagem: "Este e-mail já está cadastrado.",
      });
    }
  });

  app.delete("/usuarios/:id", async (req, res) => {
    const { id } = req.params;
    const { usuarioLogadoId } = req.body;

    if (Number(id) === Number(usuarioLogadoId)) {
      return res.status(400).json({
        mensagem: "Você não pode deletar seu próprio usuário.",
      });
    }

    await db.run("DELETE FROM usuarios WHERE id = ?", [id]);
    res.json({ mensagem: "Usuário removido com sucesso." });
  });

  // ==========================================
  // LOGIN
  // ==========================================
  app.post("/login", async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        mensagem: "Informe e-mail e senha.",
      });
    }

    const emailFormatado = email.toLowerCase().trim();
    const usuario = await db.get("SELECT * FROM usuarios WHERE email = ?", [emailFormatado]);

    if (!usuario) {
      return res.status(401).json({
        mensagem: "E-mail ou senha inválidos.",
      });
    }

    let senhaCorreta = false;

    if (usuario.senha.startsWith("$2a$") || usuario.senha.startsWith("$2b$")) {
      senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    } else {
      senhaCorreta = usuario.senha === senha;

      if (senhaCorreta) {
        const senhaNovaCriptografada = await bcrypt.hash(senha, 10);
        await db.run("UPDATE usuarios SET senha = ? WHERE id = ?", [
          senhaNovaCriptografada,
          usuario.id,
        ]);
      }
    }

    if (!senhaCorreta) {
      return res.status(401).json({
        mensagem: "E-mail ou senha inválidos.",
      });
    }

    res.json({
      mensagem: "Login realizado com sucesso.",
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
      },
    });
  });

  // ==========================================
  // RECOVERY ROUTE 1: Envia o código por e-mail
  // ==========================================
  app.post("/esqueci-senha", async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ mensagem: "O e-mail é obrigatório." });
    }

    const emailFormatado = email.toLowerCase().trim();
    const usuario = await db.get("SELECT * FROM usuarios WHERE email = ?", [emailFormatado]);

    if (!usuario) {
      return res.status(404).json({ mensagem: "E-mail não cadastrado no sistema." });
    }

    const token = crypto.randomBytes(3).toString("hex").toUpperCase(); 
    const expiracao = Date.now() + 15 * 60 * 1000; 

    tokensRecuperacao[emailFormatado] = { token, expiracao };

    const opcoesEmail = {
      from: `"IL Ótica" <${process.env.EMAIL_REMETENTE}>`,
      to: emailFormatado,
      subject: "Recuperação de Senha - IL Ótica",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Recuperação de Senha - IL Ótica</h2>
          <p>Olá, <strong>${usuario.nome}</strong>,</p>
          <p>Você solicitou a recuperação de acesso ao sistema. Use o código abaixo para redefinir sua senha:</p>
          <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; border-radius: 4px; margin: 20px 0;">
            ${token}
          </div>
          <p style="color: #777; font-size: 12px;">Este código é válido por 15 minutes. Se você não solicitou isso, ignore este e-mail.</p>
        </div>
      `,
    };

    try {
      await transpotador.sendMail(opcoesEmail);
      res.json({ mensagem: "Código de recuperação enviado para o e-mail informado." });
    } catch (erro) {
      console.error("Erro ao enviar e-mail:", erro);
      res.status(500).json({ mensagem: "Erro ao enviar o e-mail de recuperação." });
    }
  });

  // ==========================================
  // RECOVERY ROUTE 2: Altera a senha real no Banco
  // ==========================================
  app.post("/redefinir-senha", async (req, res) => {
    const { email, token, novaSenha } = req.body;

    if (!email || !token || !novaSenha) {
      return res.status(400).json({ mensagem: "Preencha todos os campos obrigatórios." });
    }

    const emailFormatado = email.toLowerCase().trim();
    const registro = tokensRecuperacao[emailFormatado];

    if (!registro || registro.token !== token.toUpperCase()) {
      return res.status(400).json({ mensagem: "Código de validação inválido." });
    }

    if (Date.now() > registro.expiracao) {
      delete tokensRecuperacao[emailFormatado];
      return res.status(400).json({ message: "Este código já expirou. Solicite um novo." });
    }

    // CORREÇÃO: Busca o usuário correspondente no banco primeiro para pegar o ID correto
    const usuarioNoBanco = await db.get("SELECT id FROM usuarios WHERE email = ?", [emailFormatado]);
    if (!usuarioNoBanco) {
      return res.status(404).json({ mensagem: "Usuário não encontrado." });
    }

    const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

    // Atualiza no banco de dados SQLite usando o ID do usuário localizado
    await db.run("UPDATE usuarios SET senha = ? WHERE id = ?", [
      senhaCriptografada,
      usuarioNoBanco.id,
    ]);

    delete tokensRecuperacao[emailFormatado];

    const agora = new Date();
    await db.run(
      "INSERT INTO logs (usuario, acao, data, hora) VALUES (?, ?, ?, ?)",
      [
        "Sistema",
        `O usuário ${emailFormatado} redefiniu a senha de acesso`,
        agora.toLocaleDateString("pt-BR"),
        agora.toLocaleTimeString("pt-BR"),
      ]
    );

    res.json({ mensagem: "Senha alterada com sucesso! Você já pode fazer login." });
  });

  // ==========================================
  // LOJA
  // ==========================================
  app.get("/loja", async (req, res) => {
    const loja = await db.get("SELECT * FROM loja WHERE id = 1");
    res.json(loja);
  });

  app.put("/loja", async (req, res) => {
    const { nome, cnpj, telefone, endereco, instagram, horario } = req.body;

    await db.run(
      `UPDATE loja SET
        nome = ?, cnpj = ?, telefone = ?, endereco = ?, instagram = ?, horario = ?
      WHERE id = 1`,
      [nome, cnpj, telefone, endereco, instagram, horario]
    );

    res.json({ mensagem: "Dados da loja updated." });
  });

  // ==========================================
  // BACKUP
  // ==========================================
  app.get("/backup", (req, res) => {
    const caminhoBanco = "./ilotica.db";

    res.download(caminhoBanco, "backup-ilotica.db", (erro) => {
      if (erro) {
        res.status(500).json({
          mensagem: "Erro ao gerar backup.",
        });
      }
    });
  });

  // ==========================================
  // BACKUP
  // ==========================================
  app.get("/backup", (req, res) => {
    const caminhoBanco = "./ilotica.db";

    res.download(caminhoBanco, "backup-ilotica.db", (erro) => {
      if (erro) {
        res.status(500).json({
          mensagem: "Erro ao gerar backup.",
        });
      }
    });
  });

  // ==========================================
  // LOGS
  // ==========================================
  app.get("/logs", async (req, res) => {
    const logs = await db.all("SELECT * FROM logs ORDER BY id DESC");
    res.json(logs);
  });

  app.post("/logs", async (req, res) => {
    const { usuario, acao } = req.body;

    const agora = new Date();
    const data = agora.toLocaleDateString("pt-BR");
    const hora = agora.toLocaleTimeString("pt-BR");

    await db.run(
      "INSERT INTO logs (usuario, acao, data, hora) VALUES (?, ?, ?, ?)",
      [usuario || "Sistema", acao, data, hora]
    );

    res.status(201).json({ mensagem: "Log registrado com sucesso." });
  });

  // ==========================================
  // AGENDA
  // ==========================================
  app.get("/agenda", async (req, res) => {
    const agenda = await db.all("SELECT * FROM agenda ORDER BY data ASC, hora ASC");
    res.json(agenda);
  });

  app.post("/agenda", async (req, res) => {
    const { cliente, telefone, data, hora, observacoes, status } = req.body;

    if (!cliente || !data || !hora) {
      return res.status(400).json({
        mensagem: "Cliente, data e hora são obrigatórios.",
      });
    }

    const resultado = await db.run(
      `INSERT INTO agenda
      (cliente, telefone, data, hora, observacoes, status)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [cliente, telefone || "", data, hora, observacoes || "", status || "Agendado"]
    );

    res.status(201).json({
      id: resultado.lastID,
      mensagem: "Agendamento criado com sucesso.",
    });
  });

  app.put("/agenda/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    await db.run("UPDATE agenda SET status = ? WHERE id = ?", [status, id]);
    res.json({ mensagem: "Status do agendamento updated." });
  });

  app.delete("/agenda/:id", async (req, res) => {
    await db.run("DELETE FROM agenda WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Agendamento removido com sucesso." });
  });

  // ==========================================
  // RECEBER PARCELA (Dar baixa)
  // ==========================================
  app.put("/parcelamentos/:id/pagar-parcela", async (req, res) => {
    const { id } = req.params; 
    const { parcelaId, valorPago, usuario } = req.body; 

    try {
      if (!parcelaId || valorPago === undefined) {
        return res.status(400).json({ mensagem: "Parcela ID e valor pago são obrigatórios." });
      }

      const parcelaAtual = await db.get("SELECT * FROM parcelas WHERE id = ?", [parcelaId]);
      
      if (!parcelaAtual) {
        return res.status(404).json({ mensagem: "Parcela não encontrada no banco de dados." });
      }

      const valorOriginalDaParcela = Number(parcelaAtual.valor) || 0;
      const valorEntreguePeloCliente = Number(valorPago) || 0;
      const dataHoje = new Date().toISOString().split("T")[0]; 

      // 1. Marca a parcela atual como paga
      await db.run(
        "UPDATE parcelas SET status = 'Pago', data_pagamento = ?, valor_pago = ? WHERE id = ?",
        [dataHoje, valorEntreguePeloCliente, parcelaId]
      );

      // 2. Trata diferença se o valor for maior ou menor
      if (valorEntreguePeloCliente > valorOriginalDaParcela) {
        const diferenca = valorEntreguePeloCliente - valorOriginalDaParcela;
        const proximaParcela = await db.get(
          "SELECT * FROM parcelas WHERE parcelamento_id = ? AND status != 'Pago' ORDER BY numero ASC LIMIT 1",
          [id]
        );
        if (proximaParcela) {
          await db.run(
            "UPDATE parcelas SET valor = CASE WHEN (valor - ?) < 0 THEN 0 ELSE (valor - ?) END WHERE id = ?",
            [diferenca, diferenca, proximaParcela.id]
          );
        }
      } else if (valorEntreguePeloCliente < valorOriginalDaParcela) {
        const diferenca = valorOriginalDaParcela - valorEntreguePeloCliente;
        const proximaParcela = await db.get(
          "SELECT * FROM parcelas WHERE parcelamento_id = ? AND status != 'Pago' ORDER BY numero ASC LIMIT 1",
          [id]
        );
        if (proximaParcela) {
          await db.run(
            "UPDATE parcelas SET valor = valor + ? WHERE id = ?",
            [diferenca, proximaParcela.id]
          );
        }
      }

      // 3. Atualiza as parcelas pagas e verifica se concluiu o parcelamento
      await db.run(
        "UPDATE parcelamentos SET parcelas_pagas = parcelas_pagas + 1 WHERE id = ?",
        [id]
      );

      const parcelasRestantes = await db.all(
        "SELECT id FROM parcelas WHERE parcelamento_id = ? AND status != 'Pago'",
        [id]
      );

      if (parcelasRestantes.length === 0) {
        await db.run(
          "UPDATE parcelamentos SET status = 'Quitado' WHERE id = ?",
          [id]
        );
      }

      // 4. Grava o log da operação
      const agora = new Date();
      await db.run(
        "INSERT INTO logs (usuario, acao, data, hora) VALUES (?, ?, ?, ?)",
        [
          usuario || "Sistema",
          `Recebeu o pagamento da parcela Nº ${parcelaAtual.numero} (R$ ${valorEntreguePeloCliente.toFixed(2)}) do parcelamento Nº ${id}`,
          agora.toLocaleDateString("pt-BR"),
          agora.toLocaleTimeString("pt-BR")
        ]
      );

      res.json({ mensagem: "Pagamento registrado com sucesso!" });
    } catch (erro) {
      console.error("Erro ao dar baixa na parcela:", erro);
      res.status(500).json({ mensagem: "Erro ao processar o pagamento da parcela." });
    }
  });

  // ==========================================
  // INICIALIZAÇÃO DA PORTA
  // ==========================================
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log("Servidor rodando na porta", PORT);
  });
}

iniciarServidor();
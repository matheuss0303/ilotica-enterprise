const express = require("express");
const cors = require("cors");
const conectarBanco = require("./database");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

let db;

async function iniciarServidor() {
  db = await conectarBanco();

  app.get("/", (req, res) => {
    res.json({
      sistema: "IL Ótica",
      status: "online",
      banco: "SQLite conectado",
    });
  });

  app.get("/", (req, res) => {
  res.json({
    sistema: "IL Ótica",
    status: "online",
    banco: "SQLite conectado",
  });
});

  // CLIENTES
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

  // PRODUTOS
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

    res.json({ mensagem: "Produto atualizado com sucesso." });
  });

  app.delete("/produtos/:id", async (req, res) => {
    await db.run("DELETE FROM produtos WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Produto removido com sucesso." });
  });

  // Atualizar cliente

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

    res.json({ mensagem: "Cliente atualizado com sucesso." });
  });

  // Excluir cliente
app.delete("/clientes/:id", async (req, res) => {
  await db.run(
    "DELETE FROM clientes WHERE id = ?",
    [req.params.id]
  );

  res.json({
    mensagem: "Cliente removido com sucesso."
  });
});

  // VENDAS
  app.get("/vendas", async (req, res) => {
    const vendas = await db.all("SELECT * FROM vendas ORDER BY id DESC");
    res.json(vendas);
  });

  app.post("/vendas", async (req, res) => {
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
    } = req.body;

    if (!cliente || !produto || !valorTotal || !formaPagamento) {
      return res.status(400).json({
        mensagem: "Preencha os campos obrigatórios.",
      });
    }

    const produtoEncontrado = await db.get(
      "SELECT * FROM produtos WHERE nome = ?",
      [produto]
    );

    if (!produtoEncontrado) {
      return res.status(404).json({
        mensagem: "Produto não encontrado.",
      });
    }

    if (produtoEncontrado.estoque <= 0) {
      return res.status(400).json({
        mensagem: "Produto sem estoque.",
      });
    }

    const data = new Date().toLocaleDateString("pt-BR");

    const resultado = await db.run(
      `INSERT INTO vendas 
      (cliente, produto, valorTotal, desconto, valorPago, valorRestante, formaPagamento, status, data, usuario)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cliente,
        produto,
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

    await db.run("UPDATE produtos SET estoque = estoque - 1 WHERE id = ?", [
      produtoEncontrado.id,
    ]);

      const agora = new Date();
      const datalog = agora.toLocaleDateString("pt-BR");
      const horalog = agora.toLocaleTimeString("pt-BR");

      await db.run(
        "INSERT INTO logs (usuario, acao, data, hora) VALUES (?, ?, ?, ?)",
        [
          usuario || "Sistema",
          `Registrou venda para ${cliente} - Produto: ${produto} - Valor: R$ ${Number(valorTotal).toFixed(2)}`,
          datalog,
          horalog
        ]
      );




    res.status(201).json({ id: resultado.lastID });
  });

  app.put("/vendas/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    await db.run("UPDATE vendas SET status = ? WHERE id = ?", [status, id]);

    res.json({ mensagem: "Status atualizado com sucesso." });
  });

  app.delete("/vendas/:id", async (req, res) => {
    await db.run("DELETE FROM vendas WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Venda removida com sucesso." });
  });

  // EXAMES
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
      cliente,
      data,
      criadoPor,
      status_os,
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
      observacoes
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

app.put("/exames/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status_os } = req.body;

  await db.run("UPDATE exames SET status_os = ? WHERE id = ?", [
    status_os,
    id,
  ]);

  res.json({
    mensagem: "Status da O.S atualizado com sucesso.",
  });
});

app.delete("/exames/:id", async (req, res) => {
  const { id } = req.params;

  await db.run("DELETE FROM exames WHERE id = ?", [id]);

  res.json({
    mensagem: "Exame removido com sucesso.",
  });
});

  // USUÁRIOS
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
      `INSERT INTO usuarios
      (nome, email, senha, tipo)
      VALUES (?, ?, ?, ?)`,
      [
        nome,
        emailFormatado,
        senhaCriptografada,
        tipo || "funcionario",
      ]
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

  // LOGIN
app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({
      mensagem: "Informe e-mail e senha.",
    });
  }

  const emailFormatado = email.toLowerCase().trim();

  const usuario = await db.get(
    "SELECT * FROM usuarios WHERE email = ?",
    [emailFormatado]
  );

  if (!usuario) {
    return res.status(401).json({
      mensagem: "E-mail ou senha inválidos.",
    });
  }

  let senhaCorreta = false;

  if (
    usuario.senha.startsWith("$2a$") ||
    usuario.senha.startsWith("$2b$")
  ) {
    senhaCorreta = await bcrypt.compare(senha, usuario.senha);
  } else {
    senhaCorreta = usuario.senha === senha;

    if (senhaCorreta) {
      const senhaNovaCriptografada = await bcrypt.hash(senha, 10);

      await db.run(
        "UPDATE usuarios SET senha = ? WHERE id = ?",
        [senhaNovaCriptografada, usuario.id]
      );
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

// LOJA

app.get("/loja", async (req, res) => {
  const loja = await db.get(
    "SELECT * FROM loja WHERE id = 1"
  );

  res.json(loja);
});

app.put("/loja", async (req, res) => {
  const {
    nome,
    cnpj,
    telefone,
    endereco,
    instagram,
    horario,
  } = req.body;

  await db.run(
    `UPDATE loja SET
      nome = ?,
      cnpj = ?,
      telefone = ?,
      endereco = ?,
      instagram = ?,
      horario = ?
    WHERE id = 1`,
    [
      nome,
      cnpj,
      telefone,
      endereco,
      instagram,
      horario,
    ]
  );

  res.json({
    mensagem: "Dados da loja atualizados."
  });
});

  // BACKUP
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

  // LOGS
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

    res.status(201).json({
      mensagem: "Log registrado com sucesso.",
    });
  });

  // AGENDA
  app.get("/agenda", async (req, res) => {
    const agenda = await db.all(
      "SELECT * FROM agenda ORDER BY data ASC, hora ASC"
    );
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
      [
        cliente,
        telefone || "",
        data,
        hora,
        observacoes || "",
        status || "Agendado",
      ]
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

    res.json({
      mensagem: "Status do agendamento atualizado.",
    });
  });

  app.delete("/agenda/:id", async (req, res) => {
    await db.run("DELETE FROM agenda WHERE id = ?", [req.params.id]);

    res.json({
      mensagem: "Agendamento removido com sucesso.",
    });
  });



// DELETAR USUÁRIO
app.delete("/usuarios/:id", async (req, res) => {
  const { id } = req.params;
  const { usuarioLogadoId } = req.body;

  if  (Number(id) === Number(usuarioLogadoId)) {
    return res.status(400).json({
      mensagem: "Você não pode deletar seu próprio usuário.",
    });
  }

  await db.run("DELETE FROM usuarios WHERE id = ?", [id]);

  res.json({
    mensagem: "Usuário removido com sucesso.",
  });
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


  const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} com PostgreSQL`);
});
}

iniciarServidor();
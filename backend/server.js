const express = require("express");
const cors = require("cors");
const conectarBanco = require("./database");
const bcrypt = require("bcryptjs");

const app = express();

require("dotenv").config();
const nodemailer = require("nodemailer");

app.use(cors());
app.use(express.json());

let db;

async function iniciarServidor() {
  db = await conectarBanco();
  const transportadorEmail = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const codigosRecuperacao = {};

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
    const { nome, telefone, whatsapp, cpf, nascimento, endereco, observacoes } =
      req.body;

    if (!nome || !telefone) {
      return res.status(400).json({
        mensagem: "Nome e telefone são obrigatórios.",
      });
    }

    const resultado = await db.run(
      `INSERT INTO clientes 
      (nome, telefone, whatsapp, cpf, nascimento, endereco, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nome,
        telefone,
        whatsapp || "",
        cpf || "",
        nascimento || "",
        endereco || "",
        observacoes || "",
      ]
    );

    res.status(201).json({ id: resultado.lastID });
  });

  app.put("/clientes/:id", async (req, res) => {
    const { id } = req.params;
    const { nome, telefone, whatsapp, cpf, nascimento, endereco, observacoes } =
      req.body;

    await db.run(
      `UPDATE clientes SET
        nome = ?,
        telefone = ?,
        whatsapp = ?,
        cpf = ?,
        nascimento = ?,
        endereco = ?,
        observacoes = ?
      WHERE id = ?`,
      [
        nome,
        telefone,
        whatsapp || "",
        cpf || "",
        nascimento || "",
        endereco || "",
        observacoes || "",
        id,
      ]
    );

    res.json({ mensagem: "Cliente atualizado com sucesso." });
  });

  app.delete("/clientes/:id", async (req, res) => {
    await db.run("DELETE FROM clientes WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Cliente removido com sucesso." });
  });

  app.get("/clientes/:nome/historico", async (req, res) => {
    const { nome } = req.params;

    const cliente = await db.get("SELECT * FROM clientes WHERE nome = ?", [
      nome,
    ]);

    const vendas = await db.all(
      "SELECT * FROM vendas WHERE cliente = ? ORDER BY id DESC",
      [nome]
    );

    const exames = await db.all(
      "SELECT * FROM exames WHERE cliente = ? ORDER BY id DESC",
      [nome]
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
    const { nome, marca, categoria, precoCusto, precoVenda, estoque, estoque_minimo } = req.body;

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

  // VENDAS
  app.get("/vendas", async (req, res) => {
    const vendas = await db.all("SELECT * FROM vendas ORDER BY id DESC");
    res.json(vendas);
  });

  app.post("/vendas", async (req, res) => {
    const { cliente, produto, valorTotal, formaPagamento, status } = req.body;

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
      (cliente, produto, valorTotal, formaPagamento, status, data)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        cliente,
        produto,
        Number(valorTotal),
        formaPagamento,
        status || "Orçamento",
        data,
      ]
    );

    await db.run("UPDATE produtos SET estoque = estoque - 1 WHERE id = ?", [
      produtoEncontrado.id,
    ]);

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
    medico,
    tipo_lente,
    observacoes
  )
  VALUES (
    ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?
  )`,
  [
    cliente,
    data,
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
    medico || "",
    tipo_lente || "",
    observacoes || "",
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

  await db.run(
    "UPDATE exames SET status_os = ? WHERE id = ?",
    [status_os, id]
  );

  res.json({
    mensagem: "Status da O.S atualizado com sucesso.",
  });
});

  app.delete("/exames/:id", async (req, res) => {
    await db.run("DELETE FROM exames WHERE id = ?", [req.params.id]);
    res.json({ mensagem: "Exame removido com sucesso." });
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
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const senhaCriptografada = await bcrypt.hash(senha, 10);

if (!emailValido) {
  return res.status(400).json({
    mensagem: "Informe um e-mail válido.",
  });
}

    if (!nome || !email || !senha) {
      return res.status(400).json({
        mensagem: "Nome, e-mail e senha são obrigatórios.",
      });
    }

    try {
      const resultado = await db.run(
  "INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)",
  [
    nome,
    email.toLowerCase().trim(),
    senhaCriptografada,
    tipo || "admin",
  ]
);

      res.status(201).json({
        id: resultado.lastID,
        nome,
        email,
        tipo: tipo || "admin",
      });
    } catch (error) {
      res.status(400).json({
        mensagem: "Este e-mail já está cadastrado.",
      });
    }
  });

  app.delete("/usuarios/:id", async (req, res) => {
    await db.run("DELETE FROM usuarios WHERE id = ?", [req.params.id]);

    res.json({
      mensagem: "Usuário removido com sucesso.",
    });
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
    senhaCorreta = await bcrypt.compare(
      senha,
      usuario.senha
    );
  } else {
    senhaCorreta = usuario.senha === senha;

    if (senhaCorreta) {
      const senhaNovaCriptografada = await bcrypt.hash(
        senha,
        10
      );

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

  // DADOS DA LOJA
  app.get("/loja", async (req, res) => {
    const loja = await db.get("SELECT * FROM loja WHERE id = 1");
    res.json(loja);
  });

  app.put("/loja", async (req, res) => {
    const { nome, cnpj, telefone, endereco, instagram, horario } = req.body;

    await db.run(
      `UPDATE loja SET
        nome = ?,
        cnpj = ?,
        telefone = ?,
        endereco = ?,
        instagram = ?,
        horario = ?
      WHERE id = 1`,
      [nome, cnpj, telefone, endereco, instagram, horario]
    );

    res.json({
      mensagem: "Dados da loja atualizados com sucesso.",
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
  const { id } = req.params;

  await db.run("DELETE FROM agenda WHERE id = ?", [id]);

  res.json({
    mensagem: "Agendamento removido com sucesso.",
  });
});

app.post("/enviar-codigo-recuperacao", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      mensagem: "Informe o e-mail.",
    });
  }

  const emailFormatado = email.toLowerCase().trim();

  const usuario = await db.get("SELECT * FROM usuarios WHERE email = ?", [
    emailFormatado,
  ]);

  if (!usuario) {
    return res.status(404).json({
      mensagem: "E-mail não encontrado.",
    });
  }

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();

  codigosRecuperacao[emailFormatado] = {
    codigo,
    expiraEm: Date.now() + 10 * 60 * 1000,
  };

  await transportadorEmail.sendMail({
    from: `"IL Ótica Sistema" <${process.env.EMAIL_USER}>`,
    to: emailFormatado,
    subject: "Código de recuperação de senha - IL Ótica",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>IL Ótica</h2>
        <p>Você solicitou a recuperação de senha do sistema.</p>
        <p>Seu código de verificação é:</p>
        <h1 style="letter-spacing: 4px;">${codigo}</h1>
        <p>Este código expira em 10 minutos.</p>
        <p>Se você não solicitou esta alteração, ignore este e-mail.</p>
      </div>
    `,
  });

  res.json({
    mensagem: "Código enviado para o e-mail.",
  });
});

app.post("/recuperar-senha", async (req, res) => {
  const { email, codigo, novaSenha } = req.body;

  if (!email || !codigo || !novaSenha) {
    return res.status(400).json({
      mensagem: "Informe e-mail, código e nova senha.",
    });
  }

  const emailFormatado = email.toLowerCase().trim();
  const recuperacao = codigosRecuperacao[emailFormatado];

  if (!recuperacao) {
    return res.status(400).json({
      mensagem: "Código não solicitado ou expirado.",
    });
  }

  if (Date.now() > recuperacao.expiraEm) {
    delete codigosRecuperacao[emailFormatado];

    return res.status(400).json({
      mensagem: "Código expirado. Solicite um novo código.",
    });
  }

  if (recuperacao.codigo !== codigo) {
    return res.status(400).json({
      mensagem: "Código inválido.",
    });
  }

  const senhaCriptografada = await bcrypt.hash(
  novaSenha,
  10
);

await db.run(
  "UPDATE usuarios SET senha = ? WHERE email = ?",
  [senhaCriptografada, emailFormatado]
);

  delete codigosRecuperacao[emailFormatado];

  res.json({
    mensagem: "Senha alterada com sucesso.",
  });
});
app.post("/teste-email", async (req, res) => {
  const { email } = req.body;

  try {
    await transportadorEmail.sendMail({
      from: `"IL Ótica Sistema" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Teste de envio - IL Ótica",
      html: `
        <h2>IL Ótica</h2>
        <p>Este é um teste de envio de e-mail pelo sistema.</p>
        <p>Se você recebeu este e-mail, a configuração funcionou.</p>
      `,
    });

    res.json({
      mensagem: "E-mail enviado com sucesso.",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      mensagem: "Erro ao enviar e-mail.",
    });
  }
});

  app.listen(3000, () => {
    console.log("🚀 Servidor rodando na porta 3000 com SQLite");
  });
}

iniciarServidor();
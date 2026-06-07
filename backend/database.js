const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function conectarBanco() {
  const db = await open({
    filename: "./ilotica.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL,
      whatsapp TEXT,
      cpf TEXT,
      nascimento TEXT,
      endereco TEXT,
      observacoes TEXT
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      marca TEXT,
      categoria TEXT NOT NULL,
      precoCusto REAL DEFAULT 0,
      precoVenda REAL NOT NULL,
      estoque INTEGER NOT NULL,
      estoque_minimo INTEGER DEFAULT 5
    );

    CREATE TABLE IF NOT EXISTS vendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente TEXT NOT NULL,
      produto TEXT NOT NULL,
      valorTotal REAL NOT NULL,
      formaPagamento TEXT NOT NULL,
      status TEXT DEFAULT 'Orçamento',
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS exames (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente TEXT NOT NULL,
      data TEXT NOT NULL,
      status_os TEXT DEFAULT 'Aguardando Lente',

      longe_od_esferico TEXT,
      longe_od_cilindrico TEXT,
      longe_od_eixo TEXT,
      longe_od_dnp TEXT,

      longe_oe_esferico TEXT,
      longe_oe_cilindrico TEXT,
      longe_oe_eixo TEXT,
      longe_oe_dnp TEXT,

      perto_od_esferico TEXT,
      perto_od_cilindrico TEXT,
      perto_od_eixo TEXT,
      perto_od_dnp TEXT,

      perto_oe_esferico TEXT,
      perto_oe_cilindrico TEXT,
      perto_oe_eixo TEXT,
      perto_oe_dnp TEXT,

      adicao TEXT,
      medico TEXT,
      tipo_lente TEXT,
      observacoes TEXT
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      tipo TEXT DEFAULT 'admin'
    );

    CREATE TABLE IF NOT EXISTS loja (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      cnpj TEXT,
      telefone TEXT,
      endereco TEXT,
      instagram TEXT,
      horario TEXT
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario TEXT,
      acao TEXT NOT NULL,
      data TEXT NOT NULL,
      hora TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agenda (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente TEXT NOT NULL,
      telefone TEXT,
      data TEXT NOT NULL,
      hora TEXT NOT NULL,
      observacoes TEXT,
      status TEXT DEFAULT 'Agendado'
    );
  `);

  async function adicionarColuna(tabela, coluna, tipo) {
    try {
      await db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${tipo}`);
    } catch (error) {}
  }

  await adicionarColuna("produtos", "estoque_minimo", "INTEGER DEFAULT 5");

  await adicionarColuna("exames", "status_os", "TEXT DEFAULT 'Aguardando Lente'");
  await adicionarColuna("exames", "longe_od_esferico", "TEXT");
  await adicionarColuna("exames", "longe_od_cilindrico", "TEXT");
  await adicionarColuna("exames", "longe_od_eixo", "TEXT");
  await adicionarColuna("exames", "longe_od_dnp", "TEXT");
  await adicionarColuna("exames", "longe_oe_esferico", "TEXT");
  await adicionarColuna("exames", "longe_oe_cilindrico", "TEXT");
  await adicionarColuna("exames", "longe_oe_eixo", "TEXT");
  await adicionarColuna("exames", "longe_oe_dnp", "TEXT");
  await adicionarColuna("exames", "perto_od_esferico", "TEXT");
  await adicionarColuna("exames", "perto_od_cilindrico", "TEXT");
  await adicionarColuna("exames", "perto_od_eixo", "TEXT");
  await adicionarColuna("exames", "perto_od_dnp", "TEXT");
  await adicionarColuna("exames", "perto_oe_esferico", "TEXT");
  await adicionarColuna("exames", "perto_oe_cilindrico", "TEXT");
  await adicionarColuna("exames", "perto_oe_eixo", "TEXT");
  await adicionarColuna("exames", "perto_oe_dnp", "TEXT");
  await adicionarColuna("exames", "adicao", "TEXT");
  await adicionarColuna("exames", "medico", "TEXT");
  await adicionarColuna("exames", "tipo_lente", "TEXT");

  const usuarioPadrao = await db.get("SELECT * FROM usuarios WHERE email = ?", [
    "dono@ilotica.com",
  ]);

  if (!usuarioPadrao) {
    await db.run(
      "INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)",
      ["Dono", "dono@ilotica.com", "123456", "admin"]
    );

    await db.run(
      "INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)",
      ["Dona", "dona@ilotica.com", "123456", "admin"]
    );
  }

  const lojaPadrao = await db.get("SELECT * FROM loja WHERE id = 1");

  if (!lojaPadrao) {
    await db.run(
      `INSERT INTO loja (id, nome, cnpj, telefone, endereco, instagram, horario)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        1,
        "IL Ótica",
        "59.882.541/0001-33",
        "83 98639-7545",
        "Rua João de Brito Lima Moura N 123",
        "@il.otica",
        "Segunda a Sábado, das 9:00 às 18:00",
      ]
    );
  }

  return db;
}

module.exports = conectarBanco;
const { Pool } = require("pg");

function converterParametros(sql) {
  let contador = 0;
  return sql.replace(/\?/g, () => {
    contador += 1;
    return `$${contador}`;
  });
}

function ajustarLinha(row) {
  if (!row) return row;

  return {
    ...row,

    precoCusto: row.precocusto ?? row.precoCusto,
    precoVenda: row.precovenda ?? row.precoVenda,

    valorTotal: row.valortotal ?? row.valorTotal,
    valorPago: row.valorpago ?? row.valorPago,
    valorRestante: row.valorrestante ?? row.valorRestante,

    criadoPor: row.criadopor ?? row.criadoPor,

    // 🆕 Ajustes para as tabelas de parcelamento mapearem perfeitamente no Frontend:
    cliente_id: row.cliente_id ?? row.cliente_id,
    valor_total: row.valor_total ?? row.valor_total,
    valor_restante: row.valor_restante ?? row.valor_restante,
    quantidade_parcelas: row.quantidade_parcelas ?? row.quantidade_parcelas,
    parcelas_pagas: row.parcelas_pagas ?? row.parcelas_pagas,
    valor_parcela: row.valor_parcela ?? row.valor_parcela,
    data_pagamento: row.data_pagamento ?? row.data_pagamento,
    forma_pagamento: row.forma_pagamento ?? row.forma_pagamento,
  };
}

async function conectarBanco() {
  const dbUrl = process.env.DATABASE_URL || "";
  const isLocal = dbUrl.includes("127.0.0.1") || dbUrl.includes("localhost");

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });

  const db = {
    async run(sql, params = []) {
      let query = converterParametros(sql.trim());

      if (
        query.toLowerCase().startsWith("insert") &&
        !query.toLowerCase().includes("returning")
      ) {
        query += " RETURNING id";
      }

      const resultado = await pool.query(query, params);

      return {
        lastID: resultado.rows?.[0]?.id,
        changes: resultado.rowCount,
      };
    },

    async get(sql, params = []) {
      const query = converterParametros(sql);
      const resultado = await pool.query(query, params);
      return ajustarLinha(resultado.rows[0]);
    },

    async all(sql, params = []) {
      const query = converterParametros(sql);
      const resultado = await pool.query(query, params);
      return resultado.rows.map(ajustarLinha);
    },

    async exec(sql) {
      return pool.query(sql);
    },
  };

  await db.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL,
      whatsapp TEXT,
      cpf TEXT,
      nascimento TEXT,
      endereco TEXT,
      observacoes TEXT,
      foto TEXT,
      criadopor TEXT
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      marca TEXT,
      categoria TEXT NOT NULL,
      precocusto REAL DEFAULT 0,
      precovenda REAL NOT NULL,
      estoque INTEGER NOT NULL,
      estoque_minimo INTEGER DEFAULT 5
    );

    CREATE TABLE IF NOT EXISTS vendas (
      id SERIAL PRIMARY KEY,
      cliente TEXT NOT NULL,
      produto TEXT NOT NULL,
      valortotal REAL NOT NULL,
      desconto REAL DEFAULT 0,
      valorpago REAL DEFAULT 0,
      valorrestante REAL DEFAULT 0,
      formapagamento TEXT NOT NULL,
      status TEXT DEFAULT 'Orçamento',
      data TEXT,
      usuario TEXT
    );

    CREATE TABLE IF NOT EXISTS exames (
      id SERIAL PRIMARY KEY,
      cliente TEXT NOT NULL,
      data TEXT NOT NULL,
      criadopor TEXT,
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
      altura TEXT,
      medico TEXT,
      tipo_lente TEXT,
      observacoes TEXT
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      tipo TEXT DEFAULT 'admin',
      email_confirmado INTEGER DEFAULT 1,
      token_confirmacao TEXT,
      token_expira_em BIGINT,
      primeiro_acesso INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS loja (
      id SERIAL PRIMARY KEY,
      nome TEXT,
      cnpj TEXT,
      telefone TEXT,
      endereco TEXT,
      instagram TEXT,
      horario TEXT
    );

    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      usuario TEXT,
      acao TEXT NOT NULL,
      data TEXT NOT NULL,
      hora TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agenda (
      id SERIAL PRIMARY KEY,
      cliente TEXT NOT NULL,
      telefone TEXT,
      data TEXT NOT NULL,
      hora TEXT NOT NULL,
      observacoes TEXT,
      status TEXT DEFAULT 'Agendado'
    );

    CREATE TABLE IF NOT EXISTS parcelamentos (
      id SERIAL PRIMARY KEY,
      cliente_id INTEGER NOT NULL,
      descricao TEXT,
      valor_total NUMERIC(10,2) NOT NULL,
      entrada NUMERIC(10,2) DEFAULT 0,
      valor_restante NUMERIC(10,2) NOT NULL,
      quantidade_parcelas INTEGER NOT NULL,
      parcelas_pagas INTEGER DEFAULT 0,
      valor_parcela NUMERIC(10,2) NOT NULL,
      status VARCHAR(30) DEFAULT 'Aberto',
      data DATE DEFAULT CURRENT_DATE
    );
        
    CREATE TABLE IF NOT EXISTS parcelas (
      id SERIAL PRIMARY KEY,
      parcelamento_id INTEGER,
      numero INTEGER,
      valor NUMERIC(10,2),
      vencimento DATE,
      data_pagamento DATE,
      forma_pagamento TEXT,
      status VARCHAR(20) DEFAULT 'Aberta'
    );
  `);

  const lojaPadrao = await db.get("SELECT * FROM loja WHERE id = ?", [1]);

  if (!lojaPadrao) {
    await db.run(
      `INSERT INTO loja 
      (id, nome, cnpj, telefone, endereco, instagram, horario)
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
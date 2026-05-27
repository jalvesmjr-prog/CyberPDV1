const initSqlJs = require('sql.js');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const XLSX = require('xlsx');

const app = express();
const PORT = 3000;
const APP_DIR = typeof process.pkg !== 'undefined' ? path.dirname(process.execPath) : __dirname;
const DB_PATH = path.join(APP_DIR, 'database', 'cyberpdv.db');
const XLSX_PATH = (() => {
  const candidates = [
    path.join(APP_DIR, 'db.xlsx'),
    path.join(process.cwd(), 'db.xlsx'),
    'D:\\Arquivos D\\PDVs\\DB\\db.xlsx',
    path.join(__dirname, 'db.xlsx'),
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch (_) {}
  }
  return candidates[0];
})();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

let db;

function saveDb() {
  const data = db.export();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

function serialToDate(serial) {
  if (!serial && serial !== 0) return '';
  const d = new Date((serial - 25569) * 86400 * 1000);
  return d.toISOString().split('T')[0];
}

async function initDatabase() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  db.run("PRAGMA journal_mode=WAL");
  db.run("PRAGMA foreign_keys=ON");

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    level TEXT CHECK(level IN ('lord','adm','gerente','vendedor')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    sku INTEGER PRIMARY KEY,
    nome_completo TEXT DEFAULT '',
    preco REAL DEFAULT 0 CHECK(preco >= 0),
    tipo TEXT DEFAULT 'PROD',
    categoria TEXT DEFAULT '',
    sub_categoria TEXT DEFAULT '',
    marca TEXT DEFAULT '',
    modelo TEXT DEFAULT '',
    p REAL DEFAULT 0,
    a REAL DEFAULT 0,
    l REAL DEFAULT 0,
    t REAL DEFAULT 0,
    obs TEXT DEFAULT '',
    img TEXT DEFAULT '',
    func TEXT DEFAULT '',
    data TEXT DEFAULT '',
    stock INTEGER DEFAULT 1 CHECK(stock >= 0)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    user_name TEXT,
    total REAL,
    payment_method TEXT CHECK(payment_method IN ('dinheiro','pix','debito','credito')),
    valor_recebido REAL DEFAULT 0,
    troco REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  try { db.run("ALTER TABLE sales ADD COLUMN valor_recebido REAL DEFAULT 0"); } catch (_) {}
  try { db.run("ALTER TABLE sales ADD COLUMN troco REAL DEFAULT 0"); } catch (_) {}

  db.run(`CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    product_name TEXT,
    quantity INTEGER,
    unit_price REAL,
    subtotal REAL,
    FOREIGN KEY(sale_id) REFERENCES sales(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT CHECK(level IN ('info','warn','error','fatal')) DEFAULT 'info',
    type TEXT DEFAULT 'system',
    message TEXT,
    context TEXT DEFAULT '{}',
    user TEXT DEFAULT '',
    page TEXT DEFAULT '',
    action TEXT DEFAULT '',
    url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_system_logs_type ON system_logs(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_system_logs_created ON system_logs(created_at)`);

  db.run(`CREATE TABLE IF NOT EXISTS system_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT DEFAULT 'insight',
    content TEXT,
    source TEXT DEFAULT 'ai',
    tags TEXT DEFAULT '',
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const schemaCheck = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='products'");
  const currentSchema = schemaCheck.length ? String(schemaCheck[0].values[0][0]) : '';
  if (currentSchema && !currentSchema.includes('CHECK(stock')) {
    db.run("ALTER TABLE products RENAME TO products_old");
    db.run(`CREATE TABLE products (
      sku INTEGER PRIMARY KEY,
      nome_completo TEXT DEFAULT '',
      preco REAL DEFAULT 0 CHECK(preco >= 0),
      tipo TEXT DEFAULT 'PROD',
      categoria TEXT DEFAULT '',
      sub_categoria TEXT DEFAULT '',
      marca TEXT DEFAULT '',
      modelo TEXT DEFAULT '',
      p REAL DEFAULT 0,
      a REAL DEFAULT 0,
      l REAL DEFAULT 0,
      t REAL DEFAULT 0,
      obs TEXT DEFAULT '',
      img TEXT DEFAULT '',
      func TEXT DEFAULT '',
      data TEXT DEFAULT '',
      stock INTEGER DEFAULT 1 CHECK(stock >= 0)
    )`);
    db.run("INSERT INTO products SELECT * FROM products_old");
    db.run("DROP TABLE products_old");
    saveDb();
  }

  const hasProducts = db.exec("SELECT COUNT(*) as c FROM products");
  const prodCount = hasProducts.length && hasProducts[0].values.length ? hasProducts[0].values[0][0] : 0;

  db.run("UPDATE products SET tipo = TRIM(tipo) WHERE tipo != TRIM(tipo)");
  db.run("UPDATE products SET categoria = TRIM(categoria) WHERE categoria != TRIM(categoria)");
  db.run("UPDATE products SET sub_categoria = TRIM(sub_categoria) WHERE sub_categoria != TRIM(sub_categoria)");
  db.run("UPDATE products SET marca = TRIM(marca) WHERE marca != TRIM(marca)");
  db.run("UPDATE products SET modelo = TRIM(modelo) WHERE modelo != TRIM(modelo)");
  saveDb();

  if (prodCount === 0 && fs.existsSync(XLSX_PATH)) {
    const wb = XLSX.readFile(XLSX_PATH);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });

    const seenCats = new Set();
    const stmtCat = db.prepare("INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)");
    const stmtProd = db.prepare(`INSERT OR REPLACE INTO products
      (sku, nome_completo, preco, tipo, categoria, sub_categoria, marca, modelo, p, a, l, t, obs, img, func, data, stock)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      const catName = String(row[5] !== '' ? row[5] : '').trim();
      if (catName && !seenCats.has(catName)) {
        seenCats.add(catName);
        const cid = 'c' + catName.replace(/[^A-Za-z0-9_\u00C0-\u00FF]/g, '_').substring(0, 30);
        stmtCat.run([cid, catName]);
      }
    }
    stmtCat.free();

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      const sku = parseInt(row[1]) || 0;
      const nome = String(row[2] !== '' ? row[2] : '').trim();
      const preco = parseFloat(String(row[3]).replace(',', '.')) || 0;
      const tipo = String(row[4] !== '' ? row[4] : 'PROD').toUpperCase();
      const categoria = String(row[5] !== '' ? row[5] : '').trim();
      const subcat = String(row[6] !== '' && row[6] !== undefined ? row[6] : '').trim();
      const marca = String(row[7] !== '' && row[7] !== undefined ? row[7] : '').trim();
      const modelo = String(row[8] !== '' && row[8] !== undefined ? row[8] : '').trim();
      const pVal = parseFloat(String(row[9]).replace(',', '.')) || 0;
      const aVal = parseFloat(String(row[10]).replace(',', '.')) || 0;
      const lVal = parseFloat(String(row[11]).replace(',', '.')) || 0;
      const tVal = parseFloat(String(row[12]).replace(',', '.')) || 0;
      const obs = String(row[13] !== '' ? row[13] : '').trim();
      const img = String(row[14] !== '' ? row[14] : '').trim();
      const func = String(row[15] !== '' ? row[15] : '').trim();
      const data = serialToDate(row[16]);

      if (!nome && !tipo) continue;

      const stockInicial = (tipo === 'SERV' || tipo === 'ADM') ? 9999 : 1;
      stmtProd.run([sku, nome, preco, tipo, categoria, subcat, marca, modelo,
        pVal, aVal, lVal, tVal, obs, img, func, data, stockInicial]);
    }
    stmtProd.free();
    saveDb();
  }

  if (prodCount === 0) {
    db.run("UPDATE products SET stock = CASE WHEN tipo IN ('SERV','ADM') THEN 9999 WHEN stock IS NULL OR stock = 0 THEN 1 ELSE stock END");
    saveDb();
  }
}

initDatabase().then(() => {
  const authRoutes = require('./routes/auth')(db, saveDb, hashPassword);
  const produtoRoutes = require('./routes/produtos')(db, saveDb);
  const vendaRoutes = require('./routes/vendas')(db, saveDb);
  const impressaoRoutes = require('./routes/impressao')(db, saveDb);
  const aiAnalyticsRoutes = require('./routes/ai-analytics')(db);
  const aiChatRoutes = require('./routes/ai-chat')(db);
  const systemRoutes = require('./routes/system')(db, saveDb);

  function systemLog(level, type, message, context, user, page, action, url) {
    try {
      db.run("INSERT INTO system_logs (level,type,message,context,user,page,action,url) VALUES (?,?,?,?,?,?,?,?)",
        [level, type, message, JSON.stringify(context||{}), user||'', page||'', action||'', url||'']);
      saveDb();
    } catch (_) {}
  }

  app.use((req, res, next) => {
    req.requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    res.setHeader('x-request-id', req.requestId);
    const start = Date.now();
    res.on('finish', () => {
      if (res.statusCode >= 400) {
        systemLog(res.statusCode >= 500 ? 'error' : 'warn', 'http', req.method + ' ' + req.path, { status: res.statusCode, duration: Date.now() - start }, '', '', '', req.originalUrl || req.url);
      }
    });
    next();
  });

  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth', authRoutes);
  app.use('/api/produtos', produtoRoutes);
  app.use('/api/vendas', vendaRoutes);
  app.use('/api/impressao', impressaoRoutes);
  app.use('/api/ai/analytics', aiAnalyticsRoutes);
  app.use('/api/ai/chat', aiChatRoutes);
  app.use('/api/system', systemRoutes);

  const configRoutes = require('./routes/config')(app);
  app.use('/api/config', configRoutes);
  app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

  app.get('/api/importar-db', (req, res) => {
    try {
      if (!fs.existsSync(XLSX_PATH)) {
        return res.status(404).json({ error: 'db.xlsx não encontrado' });
      }
      const wb = XLSX.readFile(XLSX_PATH);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '', header: 1 });

      const seenCats = new Set();
      const stmtCat = db.prepare("INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)");
      const stmtProd = db.prepare(`INSERT OR REPLACE INTO products
        (sku, nome_completo, preco, tipo, categoria, sub_categoria, marca, modelo, p, a, l, t, obs, img, func, data, stock)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

      for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        const catName = String(row[5] !== '' ? row[5] : '').trim();
        if (catName && !seenCats.has(catName)) {
          seenCats.add(catName);
          const cid = 'c' + catName.replace(/[^A-Za-z0-9_\u00C0-\u00FF]/g, '_').substring(0, 30);
          stmtCat.run([cid, catName]);
        }
      }
      stmtCat.free();

      const existingStock = {};
      const stk = db.exec("SELECT sku, stock FROM products");
      if (stk.length) {
        stk[0].values.forEach(r => { existingStock[r[0]] = r[1]; });
      }

      let imported = 0;
      for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        const sku = parseInt(row[1]) || 0;
        const nome = String(row[2] !== '' ? row[2] : '').trim();
        const preco = parseFloat(String(row[3]).replace(',', '.')) || 0;
      const tipo = String(row[4] !== '' ? row[4] : 'PROD').toUpperCase().trim();
        const categoria = String(row[5] !== '' ? row[5] : '').trim();
        const subcat = String(row[6] !== '' && row[6] !== undefined ? row[6] : '').trim();
        const marca = String(row[7] !== '' && row[7] !== undefined ? row[7] : '').trim();
        const modelo = String(row[8] !== '' && row[8] !== undefined ? row[8] : '').trim();
        const pVal = parseFloat(String(row[9]).replace(',', '.')) || 0;
        const aVal = parseFloat(String(row[10]).replace(',', '.')) || 0;
        const lVal = parseFloat(String(row[11]).replace(',', '.')) || 0;
        const tVal = parseFloat(String(row[12]).replace(',', '.')) || 0;
        const obs = String(row[13] !== '' ? row[13] : '').trim();
        const img = String(row[14] !== '' ? row[14] : '').trim();
        const func = String(row[15] !== '' ? row[15] : '').trim();
        const data = serialToDate(row[16]);

        if (!nome && !tipo) continue;
        const stockPreservado = existingStock[sku] !== undefined ? existingStock[sku] : ((tipo === 'SERV' || tipo === 'ADM') ? 9999 : 1);
        stmtProd.run([sku, nome, preco, tipo, categoria, subcat, marca, modelo,
          pVal, aVal, lVal, tVal, obs, img, func, data, stockPreservado]);
        imported++;
      }
      stmtProd.free();

      saveDb();
      res.json({ success: true, imported });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`CyberPDV rodando em http://localhost:${PORT}`);
  });
});

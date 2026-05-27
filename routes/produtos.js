module.exports = function (db, saveDb) {
  const express = require('express');
  const router = express.Router();

  function queryAll(sql, params) {
    if (params && params.length) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    }
    const r = db.exec(sql);
    if (!r.length) return [];
    return r[0].values.map(row => {
      const obj = {};
      r[0].columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  }

  function queryOne(sql, params) {
    const rows = queryAll(sql, params);
    return rows.length ? rows[0] : null;
  }

  router.get('/', (req, res) => {
    const { cat, search, limit } = req.query;
    let sql = "SELECT * FROM products";
    const conditions = [];
    const params = [];

    if (cat) {
      conditions.push("TRIM(categoria) = ?");
      params.push(cat.trim());
    }
    if (search) {
      conditions.push("(nome_completo LIKE ? OR marca LIKE ? OR modelo LIKE ? OR CAST(sku AS TEXT) LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (conditions.length) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    sql += " ORDER BY sku";
    if (limit) {
      sql += " LIMIT ?";
      params.push(parseInt(limit));
    }

    res.json(queryAll(sql, params));
  });

  router.get('/categorias', (req, res) => {
    res.json(queryAll("SELECT * FROM categories ORDER BY name"));
  });

  router.get('/:sku', (req, res) => {
    const p = queryOne("SELECT * FROM products WHERE sku = ?", [parseInt(req.params.sku)]);
    if (p) {
      res.json(p);
    } else {
      res.status(404).json({ error: 'Produto não encontrado' });
    }
  });

  router.post('/', (req, res) => {
    const p = req.body;
    if (!p.nome_completo && !p.marca && !p.modelo) return res.status(400).json({ error: 'Nome obrigatório' });
    try {
      const sku = parseInt(p.sku) || (Date.now() % 100000);
      const tipo = (p.tipo || 'PROD').toUpperCase().trim();
      const stock = p.stock !== undefined ? parseInt(p.stock) : ((tipo === 'SERV' || tipo === 'ADM') ? 9999 : 1);
      db.run(`INSERT OR REPLACE INTO products
        (sku, nome_completo, preco, tipo, categoria, sub_categoria, marca, modelo, p, a, l, t, obs, img, func, data, stock)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [sku, (p.nome_completo || '').trim(), parseFloat(p.preco) || 0, tipo,
         (p.categoria || '').trim(), (p.sub_categoria || '').trim(), (p.marca || '').trim(), (p.modelo || '').trim(),
         parseFloat(p.p) || 0, parseFloat(p.a) || 0, parseFloat(p.l) || 0, parseFloat(p.t) || 0,
         p.obs || '', p.img || '', p.func || '', p.data || '', stock]);
      saveDb();
      res.json({ success: true, sku });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  router.put('/:sku', (req, res) => {
    const p = req.body;
    const tipo = (p.tipo || 'PROD').toUpperCase().trim();
    const stock = p.stock !== undefined ? parseInt(p.stock) : ((tipo === 'SERV' || tipo === 'ADM') ? 9999 : 1);
    const newSku = parseInt(p.sku) || parseInt(req.params.sku);
    db.run(`UPDATE products SET sku=?, nome_completo=?, preco=?, tipo=?, categoria=?, sub_categoria=?, marca=?, modelo=?,
      p=?, a=?, l=?, t=?, obs=?, img=?, func=?, data=?, stock=? WHERE sku=?`,
      [newSku, (p.nome_completo || '').trim(), parseFloat(p.preco) || 0, tipo,
       (p.categoria || '').trim(), (p.sub_categoria || '').trim(), (p.marca || '').trim(), (p.modelo || '').trim(),
       parseFloat(p.p) || 0, parseFloat(p.a) || 0, parseFloat(p.l) || 0, parseFloat(p.t) || 0,
       p.obs || '', p.img || '', p.func || '', p.data || '', stock, parseInt(req.params.sku)]);
    saveDb();
    res.json({ success: true });
  });

  router.delete('/:sku', (req, res) => {
    db.run("DELETE FROM products WHERE sku=?", [parseInt(req.params.sku)]);
    saveDb();
    res.json({ success: true });
  });

  return router;
};

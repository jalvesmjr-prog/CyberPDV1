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

  router.post('/', (req, res) => {
    const { user_id, user_name, items, payment_method, valor_recebido, troco } = req.body;

    if (!user_id || !user_name) {
      return res.status(400).json({ error: 'Usuário não informado' });
    }
    if (!items || !items.length) {
      return res.status(400).json({ error: 'Carrinho vazio' });
    }
    if (!['dinheiro', 'pix', 'debito', 'credito'].includes(payment_method)) {
      return res.status(400).json({ error: 'Forma de pagamento inválida' });
    }

    const userExists = queryOne("SELECT id FROM users WHERE id = ?", [parseInt(user_id)]);
    if (!userExists) {
      return res.status(400).json({ error: 'Usuário inválido' });
    }

    let total = 0;
    const validatedItems = [];

    for (const item of items) {
      if (item.product_id === undefined || item.product_id === null || item.product_id === '') {
        return res.status(400).json({ error: 'Produto sem identificação no carrinho' });
      }
      const qty = Math.floor(Number(item.quantity));
      if (!Number.isFinite(qty) || qty <= 0 || Number(item.quantity) !== qty) {
        return res.status(400).json({ error: `Quantidade inválida para ${item.product_name || 'produto'}. Use apenas números inteiros positivos.` });
      }

      const prod = queryOne("SELECT sku, nome_completo, preco, stock FROM products WHERE sku = ?", [parseInt(item.product_id)]);
      if (!prod) {
        return res.status(400).json({ error: `Produto não encontrado: ${item.product_name || item.product_id}` });
      }
      if (prod.stock < qty) {
        return res.status(400).json({
          error: `Estoque insuficiente para ${prod.nome_completo}. Disponível: ${prod.stock}`
        });
      }

      const unitPrice = prod.preco;
      const subtotal = Math.round(qty * unitPrice * 100) / 100;
      total += subtotal;

      validatedItems.push({
        product_id: prod.sku,
        product_name: prod.nome_completo,
        quantity: qty,
        unit_price: unitPrice,
        subtotal: subtotal
      });
    }

    total = Math.round(total * 100) / 100;

    db.run("BEGIN TRANSACTION");
    try {
      const vr = payment_method === 'dinheiro' ? (parseFloat(valor_recebido) || total) : total;
      const tr = payment_method === 'dinheiro' ? Math.round(Math.max(0, Math.round((vr - total) * 100) / 100) * 100) / 100 : 0;
      db.run("INSERT INTO sales (user_id, user_name, total, payment_method, valor_recebido, troco) VALUES (?, ?, ?, ?, ?, ?)",
        [user_id, user_name, total, payment_method, vr, tr]);

      const saleRes = db.exec("SELECT last_insert_rowid() as id");
      const saleIdVal = saleRes[0].values[0][0];

      const stmtItem = db.prepare("INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)");
      const stmtStock = db.prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE sku = ?");

      for (const item of validatedItems) {
        stmtItem.run([saleIdVal, item.product_id, item.product_name, item.quantity, item.unit_price, item.subtotal]);
        stmtStock.run([item.quantity, item.product_id]);
      }

      stmtItem.free();
      stmtStock.free();

      db.run("COMMIT");
      saveDb();
      res.json({ success: true, sale_id: saleIdVal, total });
    } catch (e) {
      db.run("ROLLBACK");
      res.status(500).json({ error: 'Erro ao processar venda' });
    }
  });

  router.get('/', (req, res) => {
    const { page = 1, limit = 50, start, end, payment, user } = req.query;
    let sql = "SELECT * FROM sales WHERE 1=1";
    const params = [];
    if (start) { sql += " AND created_at >= ?"; params.push(start); }
    if (end) { sql += " AND created_at <= ?"; params.push(end + ' 23:59:59'); }
    if (payment) { sql += " AND payment_method = ?"; params.push(payment); }
    if (user) { sql += " AND user_name = ?"; params.push(user); }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);
    res.json(queryAll(sql, params));
  });

  router.get('/reports/summary', (req, res) => {
    const { start, end } = req.query;
    let filter = "";
    const params = [];
    if (start) { filter += " AND created_at >= ?"; params.push(start); }
    if (end) { filter += " AND created_at <= ?"; params.push(end + ' 23:59:59'); }

    const totalRevenue = queryOne("SELECT COALESCE(SUM(total),0) as total FROM sales WHERE 1=1" + filter, params);
    const totalSales = queryOne("SELECT COUNT(*) as count FROM sales WHERE 1=1" + filter, params);
    const byPayment = queryAll("SELECT payment_method, COUNT(*) as count, SUM(total) as total FROM sales WHERE 1=1" + filter + " GROUP BY payment_method", params);
    const byUser = queryAll("SELECT user_name, COUNT(*) as count, SUM(total) as total FROM sales WHERE 1=1" + filter + " GROUP BY user_name ORDER BY total DESC", params);

    res.json({
      total_revenue: Math.round(totalRevenue.total * 100) / 100,
      total_sales: totalSales.count,
      by_payment: byPayment,
      by_user: byUser
    });
  });

  router.get('/reports/by-period', (req, res) => {
    const { start, end } = req.query;
    let filter = "";
    const params = [];
    if (start) { filter += " AND created_at >= ?"; params.push(start); }
    if (end) { filter += " AND created_at <= ?"; params.push(end + ' 23:59:59'); }
    const rows = queryAll("SELECT DATE(created_at) as day, COUNT(*) as count, SUM(total) as total FROM sales WHERE 1=1" + filter + " GROUP BY DATE(created_at) ORDER BY day", params);
    res.json(rows.map(r => ({ ...r, total: Math.round((r.total || 0) * 100) / 100 })));
  });

  router.get('/:id', (req, res) => {
    const sale = queryOne("SELECT * FROM sales WHERE id = ?", [req.params.id]);
    if (!sale) {
      return res.status(404).json({ error: 'Venda não encontrada' });
    }
    sale.items = queryAll("SELECT * FROM sale_items WHERE sale_id = ?", [req.params.id]);
    res.json(sale);
  });

  return router;
};

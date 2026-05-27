module.exports = function(db, saveDb) {
  const express = require('express');
  const router = express.Router();
  const path = require('path');
  const fs = require('fs');

  function getAllRows(sql, params) {
    const stmt = db.prepare(sql);
    stmt.bind(params || []);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  function getSingleRow(sql, params) {
    const rows = getAllRows(sql, params);
    return rows.length ? rows[0] : null;
  }

  function runSQL(sql, params) {
    const stmt = db.prepare(sql);
    stmt.bind(params || []);
    stmt.step();
    stmt.free();
  }

  router.post('/log', (req, res) => {
    try {
      const { level, type, message, context, user, page, url } = req.body;
      const validLevels = ['info', 'warn', 'error', 'fatal'];
      if (!validLevels.includes(level)) return res.status(400).json({ error: 'invalid level' });
      runSQL("INSERT INTO system_logs (level, type, message, context, user, page, url) VALUES (?, ?, ?, ?, ?, ?, ?)", [level, type || 'system', message, JSON.stringify(context || {}), user || '', page || '', url || '']);
      saveDb();
      res.status(201).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/logs', (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, Math.min(500, parseInt(req.query.limit) || 50));
      const offset = (page - 1) * limit;
      const conditions = [];
      const params = [];
      if (req.query.level) { conditions.push('level = ?'); params.push(req.query.level); }
      if (req.query.type) { conditions.push('type = ?'); params.push(req.query.type); }
      if (req.query.user) { conditions.push('user = ?'); params.push(req.query.user); }
      if (req.query.since) { conditions.push("created_at >= ?"); params.push(req.query.since); }
      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
      const total = getSingleRow("SELECT COUNT(*) as c FROM system_logs " + where, params)?.c || 0;
      const logs = getAllRows("SELECT * FROM system_logs " + where + " ORDER BY created_at DESC LIMIT ? OFFSET ?", [...params, limit, offset]);
      res.json({ logs, total, page, limit });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/logs/errors', (req, res) => {
    try {
      const errors = getAllRows("SELECT level, type, message, context, user, page, url, created_at FROM system_logs WHERE level IN ('error','fatal') ORDER BY created_at DESC");
      const grouped = {};
      errors.forEach(e => {
        const key = e.type + ':' + (e.message || '').substring(0, 80);
        if (!grouped[key]) grouped[key] = { type: e.type, message: e.message, count: 0, last_occurrence: e.created_at, recommendation: '' };
        grouped[key].count++;
        if (e.created_at > grouped[key].last_occurrence) grouped[key].last_occurrence = e.created_at;
      });
      Object.values(grouped).forEach(g => {
        const msg = (g.message || '').toLowerCase();
        if (msg.includes('login') || msg.includes('senha') || msg.includes('auth')) g.recommendation = 'Verificar se o usuario esta cadastrado e se a senha esta correta';
        else if (msg.includes('produto') || msg.includes('sku')) g.recommendation = 'Verificar se o SKU informado existe no banco de dados';
        else if (msg.includes('venda') || msg.includes('estoque')) g.recommendation = 'Verificar disponibilidade de estoque antes de finalizar a venda';
        else if (msg.includes('insert') || msg.includes('update') || msg.includes('delete')) g.recommendation = 'Verificar integridade do banco de dados';
        else g.recommendation = 'Revisar logs para identificar causa raiz';
      });
      res.json({ errors: Object.values(grouped).sort((a, b) => b.count - a.count) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/memory', (req, res) => {
    try {
      const { category, content, tags } = req.body;
      if (!content) return res.status(400).json({ error: 'content is required' });
      runSQL("INSERT INTO system_memory (category, content, tags) VALUES (?, ?, ?)", [category || 'insight', content, JSON.stringify(tags || [])]);
      saveDb();
      res.status(201).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/memory', (req, res) => {
    try {
      const conditions = [];
      const params = [];
      if (req.query.category) { conditions.push('category = ?'); params.push(req.query.category); }
      if (req.query.search) { conditions.push("content LIKE ?"); params.push('%' + req.query.search + '%'); }
      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
      const memories = getAllRows("SELECT * FROM system_memory " + where + " ORDER BY created_at DESC", params);
      res.json(memories);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/health', (req, res) => {
    try {
      const dbPath = path.join(typeof process.pkg !== 'undefined' ? path.dirname(process.execPath) : __dirname, '..', 'database', 'cyberpdv.db');
      let dbSize = 0;
      try { dbSize = fs.statSync(dbPath).size; } catch (e) {}
      const userCount = getSingleRow("SELECT COUNT(*) as c FROM users")?.c || 0;
      const prodCount = getSingleRow("SELECT COUNT(*) as c FROM products")?.c || 0;
      const saleCount = getSingleRow("SELECT COUNT(*) as c FROM sales")?.c || 0;
      res.json({
        status: 'ok',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        db_size: dbSize,
        records: { users: userCount, products: prodCount, sales: saleCount },
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/logs/older-than/:dias', (req, res) => {
    try {
      const dias = parseInt(req.params.dias);
      if (!dias || dias < 1) return res.status(400).json({ error: 'invalid days' });
      runSQL("DELETE FROM system_logs WHERE created_at < datetime('now', '-' || ? || ' days')", [dias]);
      saveDb();
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

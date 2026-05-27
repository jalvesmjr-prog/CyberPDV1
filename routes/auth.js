module.exports = function (db, saveDb, hashPassword) {
  const express = require('express');
  const router = express.Router();

  function queryOne(sql, params) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
  }

  router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
    }
    const stmt = db.prepare("SELECT id, username, level FROM users WHERE username = ? AND password = ?");
    stmt.bind([username, hashPassword(password)]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      res.json({ success: true, user: row });
    } else {
      stmt.free();
      try {
        const ip = req.ip || req.connection.remoteAddress || '';
        db.run("INSERT INTO system_logs (level,type,message,context,user,action,url) VALUES (?,?,?,?,?,?,?)",
          ['warn', 'auth', 'Tentativa de login invalida', JSON.stringify({ ip, username }), username, 'login_failed', '/api/auth/login']);
        saveDb();
      } catch (_) {}
      res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }
  });

  router.get('/usuarios', (req, res) => {
    const results = db.exec("SELECT id, username, level, created_at FROM users ORDER BY id");
    const users = results.length ? results[0].values.map(row => ({
      id: row[0], username: row[1], level: row[2], created_at: row[3]
    })) : [];
    res.json(users);
  });

  router.post('/usuarios', (req, res) => {
    const { username, password, level } = req.body;
    if (!username || !password || !level) {
      return res.status(400).json({ error: 'Preencha todos os campos' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 4 caracteres' });
    }
    if (!['lord', 'adm', 'gerente', 'vendedor'].includes(level)) {
      return res.status(400).json({ error: 'Nível inválido' });
    }
    try {
      db.run("INSERT INTO users (username, password, level) VALUES (?, ?, ?)",
        [username, hashPassword(password), level]);
      saveDb();
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: 'Usuário já existe' });
    }
  });

  router.put('/usuarios/:id', (req, res) => {
    const { username, password, level } = req.body;
    const { id } = req.params;
    if (!username || !level) {
      return res.status(400).json({ error: 'Username e nível são obrigatórios' });
    }
    if (password) {
      db.run("UPDATE users SET username=?, password=?, level=? WHERE id=?",
        [username, hashPassword(password), level, id]);
    } else {
      db.run("UPDATE users SET username=?, level=? WHERE id=?", [username, level, id]);
    }
    saveDb();
    res.json({ success: true });
  });

  router.delete('/usuarios/:id', (req, res) => {
    db.run("DELETE FROM users WHERE id=?", [req.params.id]);
    saveDb();
    res.json({ success: true });
  });

  router.put('/perfil', (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Preencha todos os campos' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 4 caracteres' });
    }
    const user = queryOne("SELECT id FROM users WHERE id = ? AND password = ?", [userId, hashPassword(currentPassword)]);
    if (!user) {
      return res.status(401).json({ error: 'Senha atual inválida' });
    }
    db.run("UPDATE users SET password = ? WHERE id = ?", [hashPassword(newPassword), userId]);
    saveDb();
    res.json({ success: true });
  });

  return router;
};

module.exports = function (app) {
  const express = require('express');
  const router = express.Router();
  const fs = require('fs');
  const path = require('path');
  const CONFIG_PATH = path.join(__dirname, '..', 'config', 'system.json');
  const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  function loadConfig() {
    try {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function saveConfig(data) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  }

  router.get('/', (req, res) => {
    try {
      const cfg = loadConfig();
      if (!cfg) return res.status(500).json({ success: false, error: 'Config nao encontrada' });
      res.json({ success: true, data: cfg });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.put('/', (req, res) => {
    try {
      const existing = loadConfig() || {};
      const updates = req.body;
      const merged = mergeDeep(existing, updates);
      saveConfig(merged);
      res.json({ success: true, data: merged });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/upload', (req, res) => {
    try {
      const { type, data } = req.body;
      if (!type || !data) return res.status(400).json({ success: false, error: 'Tipo e dados obrigatorios' });
      const ext = type === 'favicon' ? '.ico' : '.png';
      const filename = type + '_' + Date.now() + ext;
      const filepath = path.join(UPLOADS_DIR, filename);
      const buffer = Buffer.from(data, 'base64');
      fs.writeFileSync(filepath, buffer);
      const url = '/uploads/' + filename;
      const cfg = loadConfig() || {};
      if (type === 'favicon') {
        cfg.system = cfg.system || {};
        cfg.system.favicon_path = url;
      } else if (type === 'logo') {
        cfg.system = cfg.system || {};
        cfg.system.logo_path = url;
      }
      saveConfig(cfg);
      res.json({ success: true, data: { url } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/upload', (req, res) => {
    try {
      const { type } = req.body;
      const cfg = loadConfig() || {};
      if (type === 'favicon' && cfg.system && cfg.system.favicon_path) {
        const oldPath = path.join(__dirname, '..', cfg.system.favicon_path);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        cfg.system.favicon_path = '';
      } else if (type === 'logo' && cfg.system && cfg.system.logo_path) {
        const oldPath = path.join(__dirname, '..', cfg.system.logo_path);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        cfg.system.logo_path = '';
      }
      saveConfig(cfg);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  function mergeDeep(target, source) {
    const result = JSON.parse(JSON.stringify(target));
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = mergeDeep(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  return router;
};
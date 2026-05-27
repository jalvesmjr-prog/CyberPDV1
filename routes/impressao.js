module.exports = function (db, saveDb) {
  const express = require('express');
  const router = express.Router();
  const fs = require('fs');
  const path = require('path');
  const { exec } = require('child_process');

  const CONFIG_PATH = path.join(__dirname, '..', 'config', 'printer.json');
  const PRINTS_DIR = path.join(__dirname, '..', 'prints');
  const TEMP_DIR = path.join(__dirname, '..', 'temp');

  [PRINTS_DIR, TEMP_DIR, path.dirname(CONFIG_PATH)].forEach(function (dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

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
    return r[0].values.map(function (row) {
      const obj = {};
      r[0].columns.forEach(function (col, i) { obj[col] = row[i]; });
      return obj;
    });
  }

  function queryOne(sql, params) {
    const rows = queryAll(sql, params);
    return rows.length ? rows[0] : null;
  }

  function loadConfig() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      }
    } catch (_) {}
    return {
      printer_name: 'A4Tech PDF',
      port: 'USB001',
      use_powershell: true,
      charset: 'iso-8859-1',
      paper_width_80mm: true
    };
  }

  function saveConfig(cfg) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
  }

  function stringToBytes(str) {
    const buf = Buffer.alloc(str.length);
    for (let i = 0; i < str.length; i++) {
      buf[i] = str.charCodeAt(i) & 0xFF;
    }
    return buf;
  }

  function buildEscPos(sale, items, config) {
    const buf = [];
    buf.push(0x1B, 0x40);
    buf.push(0x1B, 0x74, 0x02);
    buf.push(0x1B, 0x21, 0x11);
    buf.push.apply(buf, stringToBytes('CYBERPDV\n'));
    buf.push(0x1B, 0x21, 0x00);
    buf.push.apply(buf, stringToBytes('Ponto de Venda\n'));
    buf.push.apply(buf, stringToBytes('='.repeat(32) + '\n'));
    buf.push.apply(buf, stringToBytes('CUPOM FISCAL\n'));
    buf.push.apply(buf, stringToBytes('='.repeat(32) + '\n'));
    buf.push.apply(buf, stringToBytes('ITEM'.padEnd(6) + 'QTD'.padEnd(5) + 'VL.UN'.padEnd(10) + 'SUBTOTAL\n'));
    for (const item of items) {
      const name = (item.product_name || '').substring(0, 20);
      const qty = item.quantity || 1;
      const unitPrice = item.unit_price || 0;
      const subtotal = item.subtotal || 0;
      buf.push.apply(buf, stringToBytes(
        name.padEnd(20) +
        String(qty).padStart(4) + ' ' +
        unitPrice.toFixed(2).padStart(7) + ' ' +
        subtotal.toFixed(2).padStart(7) + '\n'
      ));
    }
    buf.push.apply(buf, stringToBytes('='.repeat(32) + '\n'));
    buf.push(0x1B, 0x21, 0x11);
    buf.push.apply(buf, stringToBytes('TOTAL: R$ ' + (sale.total || 0).toFixed(2) + '\n'));
    buf.push(0x1B, 0x21, 0x00);
    buf.push.apply(buf, stringToBytes('FORMA PAG: ' + (sale.payment_method || '').toUpperCase() + '\n'));
    if (sale.valor_recebido && sale.troco) {
      buf.push.apply(buf, stringToBytes('VALOR REC: R$ ' + (sale.valor_recebido || 0).toFixed(2) + '\n'));
      buf.push.apply(buf, stringToBytes('TROCO: R$ ' + (sale.troco || 0).toFixed(2) + '\n'));
    }
    buf.push.apply(buf, stringToBytes('='.repeat(32) + '\n'));
    buf.push.apply(buf, stringToBytes('DATA: ' + (sale.created_at || '') + '\n'));
    buf.push.apply(buf, stringToBytes('USUARIO: ' + (sale.user_name || '') + '\n'));
    buf.push.apply(buf, stringToBytes('='.repeat(32) + '\n'));
    buf.push(0x0A, 0x0A, 0x0A, 0x0A);
    buf.push(0x1D, 0x56, 0x41);
    return Buffer.from(buf);
  }

  function printViaPort(buffer, port) {
    return new Promise(function (resolve) {
      try {
        fs.writeFileSync('\\\\localhost\\' + port, buffer);
        resolve(true);
      } catch (e) {
        resolve(false);
      }
    });
  }

  function printViaPowerShell(buffer, printerName) {
    const tmpPath = path.join(TEMP_DIR, 'print-' + Date.now() + '.bin');
    fs.writeFileSync(tmpPath, buffer);
    const cmd = 'powershell -Command "Get-Content -Path \'' + tmpPath + '\' -Encoding Byte | Out-Printer -Name \'' + printerName + '\'"';
    return new Promise(function (resolve) {
      exec(cmd, function (err) {
        try { fs.unlinkSync(tmpPath); } catch (e) {}
        resolve(!err);
      });
    });
  }

  function saveToFile(buffer, saleId) {
    const filePath = path.join(PRINTS_DIR, 'receipt-' + saleId + '.prn');
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  router.get('/config', function (req, res) {
    res.json(loadConfig());
  });

  router.put('/config', function (req, res) {
    const cfg = req.body;
    saveConfig(cfg);
    res.json(cfg);
  });

  router.post('/', async function (req, res) {
    try {
      const { sale_id } = req.body;
      if (!sale_id) {
        return res.status(400).json({ error: 'sale_id is required' });
      }
      const sale = queryOne('SELECT * FROM sales WHERE id = ?', [sale_id]);
      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }
      const items = queryAll('SELECT * FROM sale_items WHERE sale_id = ?', [sale_id]);
      const config = loadConfig();
      const buffer = buildEscPos(sale, items, config);
      if (config.port) {
        const ok = await printViaPort(buffer, config.port);
        if (ok) return res.json({ success: true, method: 'port' });
      }
      if (config.use_powershell && config.printer_name) {
        const ok = await printViaPowerShell(buffer, config.printer_name);
        if (ok) return res.json({ success: true, method: 'powershell' });
      }
      const filePath = saveToFile(buffer, sale_id);
      res.json({ success: true, method: 'file', path: filePath });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
};

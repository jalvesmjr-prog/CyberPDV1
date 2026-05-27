module.exports = function(db) {
  const express = require('express');
  const router = express.Router();

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

  function detectIntent(message) {
    const lower = message.toLowerCase();
    if (/estoque de (.+)|quantos (.+) tem|tem (.+) no estoque/.test(lower)) return 'estoque';
    if (/vendas (.+)|quanto vendeu|faturamento/.test(lower)) return 'vendas';
    if (/produto (.+)|preco do (.+)|sku (\d+)/.test(lower)) return 'produto';
    if (/relatorio|resumo|summary/.test(lower)) return 'relatorio';
    if (/sugestao|reabastecer|repor/.test(lower)) return 'sugestao';
    if (/validade|vencimento/.test(lower)) return 'validade';
    return 'ajuda';
  }

  router.post('/chat', (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ intent: 'erro', message: 'Envie uma mensagem valida.' });
      }
      const intent = detectIntent(message);

      switch (intent) {
        case 'estoque': {
          const match = message.match(/estoque de (.+)|quantos (.+) tem|tem (.+) no estoque/i);
          const termo = (match?.[1] || match?.[2] || match?.[3] || message.replace(/estoque|quantos|tem|no estoque/gi, '')).trim();
          if (termo && termo.length > 1) {
            const produtos = getAllRows("SELECT sku, nome_completo, stock FROM products WHERE nome_completo LIKE ? OR marca LIKE ? OR modelo LIKE ? LIMIT 5", [`%${termo}%`, `%${termo}%`, `%${termo}%`]);
            if (produtos.length) {
              const linhas = produtos.map(p => p.nome_completo + ' (SKU ' + p.sku + '): **' + p.stock + '** unidades').join('\n');
              return res.json({ intent, message: '📦 **Estoque disponivel:**\n' + linhas });
            }
          }
          const total = getSingleRow("SELECT COUNT(*) as c FROM products WHERE stock = 0")?.c || 0;
          const baixo = getSingleRow("SELECT COUNT(*) as c FROM products WHERE stock > 0 AND stock < 5")?.c || 0;
          return res.json({ intent, message: '📊 **Resumo de Estoque:**\n- Produtos sem estoque: ' + total + '\n- Estoque baixo (<5): ' + baixo + '\n\nDigite "estoque de [produto]" para consultar um item especifico.' });
        }

        case 'vendas': {
          const totalVendas = getSingleRow("SELECT COUNT(*) as c FROM sales")?.c || 0;
          const totalReceita = getSingleRow("SELECT COALESCE(SUM(total), 0) as t FROM sales")?.t || 0;
          const hoje = getSingleRow("SELECT COUNT(*) as c, COALESCE(SUM(total), 0) as t FROM sales WHERE date(created_at) = date('now')");
          return res.json({ intent, message: '💰 **Resumo de Vendas:**\n- Total de vendas: **' + totalVendas + '**\n- Receita total: **R$ ' + (Math.round(totalReceita * 100) / 100).toFixed(2) + '**\n- Vendas hoje: **' + (hoje?.c || 0) + '** (R$ ' + (Math.round((hoje?.t || 0) * 100) / 100).toFixed(2) + ')' });
        }

        case 'produto': {
          const match = message.match(/sku (\d+)/i);
          if (match) {
            const p = getSingleRow("SELECT * FROM products WHERE sku = ?", [parseInt(match[1])]);
            if (p) return res.json({ intent, message: '📋 **' + p.nome_completo + '** (SKU ' + p.sku + ')\n- Preco: R$ ' + p.preco.toFixed(2) + '\n- Estoque: ' + p.stock + '\n- Tipo: ' + p.tipo + '\n- Categoria: ' + p.categoria + (p.marca ? '\n- Marca: ' + p.marca : '') + (p.modelo ? '\n- Modelo: ' + p.modelo : ''), data: p });
            return res.json({ intent, message: 'Produto com SKU ' + match[1] + ' nao encontrado.' });
          }
          const termo = message.replace(/produto|preco do|preco/gi, '').trim();
          if (termo.length > 1) {
            const produtos = getAllRows("SELECT sku, nome_completo, preco, stock FROM products WHERE nome_completo LIKE ? LIMIT 5", [`%${termo}%`]);
            if (produtos.length) {
              const linhas = produtos.map(p => p.nome_completo + ' (SKU ' + p.sku + '): R$ ' + p.preco.toFixed(2) + ' | Estoque: ' + p.stock).join('\n');
              return res.json({ intent, message: '🔍 **Produtos encontrados:**\n' + linhas });
            }
          }
          return res.json({ intent, message: 'Produto nao encontrado. Tente buscar por nome ou SKU.' });
        }

        case 'relatorio': {
          const totalVendas = getSingleRow("SELECT COUNT(*) as c FROM sales")?.c || 0;
          const totalReceita = getSingleRow("SELECT COALESCE(SUM(total), 0) as t FROM sales")?.t || 0;
          const ticket = totalVendas > 0 ? Math.round((totalReceita / totalVendas) * 100) / 100 : 0;
          return res.json({ intent, message: '📈 **Relatorio Geral:**\n- Total de vendas: **' + totalVendas + '**\n- Receita: **R$ ' + totalReceita.toFixed(2) + '**\n- Ticket medio: **R$ ' + ticket.toFixed(2) + '**\n\nAcesse a pagina de Relatorios para graficos e detalhes.' });
        }

        case 'sugestao': {
          const criticos = getAllRows("SELECT nome_completo, sku, stock FROM products WHERE stock > 0 AND stock < 5 ORDER BY stock ASC LIMIT 10");
          if (criticos.length) {
            const linhas = criticos.map(p => p.nome_completo + ' (SKU ' + p.sku + '): apenas **' + p.stock + '** unidades').join('\n');
            return res.json({ intent, message: '💡 **Sugestoes de Reposicao:**\nProdutos com estoque baixo:\n' + linhas + '\n\nAcesse IA Analytics > Reabastecimento para mais detalhes.' });
          }
          return res.json({ intent, message: '💡 Nenhum produto com estoque critico no momento.' });
        }

        case 'validade': {
          return res.json({ intent, message: '⏳ O controle de validade/vencimento ainda nao foi implementado. Esta funcionalidade esta nos planos futuros.' });
        }

        default: {
          return res.json({ intent, message: '🤖 **Assistente CyberPDV**\n\nPergunte sobre:\n- 📦 **Estoque**: "estoque de iphone", "quantos mouses tem?"\n- 💰 **Vendas**: "quanto vendeu hoje?", "faturamento do mes"\n- 📋 **Produtos**: "preco do galaxy", "SKU 123"\n- 📈 **Relatorio**: "relatorio", "resumo"\n- 💡 **Sugestoes**: "sugestao", "reabastecer"\n\nComo posso ajudar?' });
      }
      }
    } catch (err) {
      res.status(500).json({ intent: 'erro', message: 'Ocorreu um erro ao processar sua pergunta.' });
    }
  });

  router.post('/learn', (req, res) => {
    try {
      const { insight } = req.body;
      if (!insight) return res.status(400).json({ error: 'insight is required' });
      try { db.run("INSERT INTO system_memory (category, content, source) VALUES (?, ?, 'chat')", ['learning', insight, 'chat']); } catch (e) {}
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

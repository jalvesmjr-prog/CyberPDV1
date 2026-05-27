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

  router.get('/summary', (req, res) => {
    try {
      const totalProd = getSingleRow("SELECT COUNT(*) as total FROM products")?.total || 0;
      const vendasInfo = getSingleRow("SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as receita FROM sales");
      const totalVendas = vendasInfo?.total || 0;
      const receitaTotal = Math.round((vendasInfo?.receita || 0) * 100) / 100;
      const ticketMedio = totalVendas > 0 ? Math.round((receitaTotal / totalVendas) * 100) / 100 : 0;
      const semEstoque = getSingleRow("SELECT COUNT(*) as total FROM products WHERE stock IS NULL OR stock = 0")?.total || 0;
      const estoqueBaixo = getSingleRow("SELECT COUNT(*) as total FROM products WHERE stock > 0 AND stock < 5")?.total || 0;
      const catsVendidas = getAllRows("SELECT p.categoria, SUM(si.quantity) as total FROM sale_items si JOIN products p ON si.product_id = p.sku WHERE p.categoria != '' GROUP BY p.categoria ORDER BY total DESC");
      const insights = [];
      if (catsVendidas.length) {
        const topCat = catsVendidas[0];
        insights.push('🔝 Categoria mais vendida: **' + topCat.categoria + '** (' + topCat.total + ' unidades)');
      }
      if (semEstoque > 0) insights.push('⚠️ ' + semEstoque + ' produtos com estoque zerado — revisar reposição');
      if (estoqueBaixo > 0) insights.push('📦 ' + estoqueBaixo + ' produtos com estoque baixo (menos de 5 unidades)');
      if (totalVendas > 0) insights.push('💰 Ticket médio: R$ ' + ticketMedio.toFixed(2));
      if (totalProd > 0) insights.push('📋 Catálogo: ' + totalProd + ' produtos cadastrados');
      res.json({ total_produtos: totalProd, total_vendas: totalVendas, receita_total: receitaTotal, ticket_medio: ticketMedio, produtos_sem_estoque: semEstoque, estoque_baixo: estoqueBaixo, categorias_mais_vendidas: catsVendidas, insights });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/forecast', (req, res) => {
    try {
      const total7d = getSingleRow("SELECT COALESCE(SUM(total), 0) as t FROM sales WHERE created_at >= datetime('now', '-7 days')")?.t || 0;
      const total30d = getSingleRow("SELECT COALESCE(SUM(total), 0) as t FROM sales WHERE created_at >= datetime('now', '-30 days')")?.t || 0;
      const count7d = getSingleRow("SELECT COUNT(*) as c FROM sales WHERE created_at >= datetime('now', '-7 days')")?.c || 0;
      const count30d = getSingleRow("SELECT COUNT(*) as c FROM sales WHERE created_at >= datetime('now', '-30 days')")?.c || 0;
      const media7d = count7d > 0 ? Math.round((total7d / count7d) * 100) / 100 : 0;
      const media30d = count30d > 0 ? Math.round((total30d / count30d) * 100) / 100 : 0;
      res.json({ forecast_7d: total7d, forecast_30d: total30d, total_vendas_7d: count7d, total_vendas_30d: count30d, media_diaria_7d: media7d, media_diaria_30d: media30d });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/reorder', (req, res) => {
    try {
      const sugestoes = getAllRows("SELECT p.sku, p.nome_completo, p.stock, COALESCE(s.vendas_30d, 0) as vendas_30d, COALESCE(s.media_diaria, 0) as media_diaria FROM products p LEFT JOIN (SELECT product_id, SUM(quantity) as vendas_30d, SUM(quantity) / 30.0 as media_diaria FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE created_at >= datetime('now', '-30 days')) GROUP BY product_id) s ON p.sku = s.product_id WHERE p.stock > 0 ORDER BY COALESCE(s.media_diaria, 0) DESC");
      const resultado = sugestoes.map(p => {
        const dias = p.media_diaria > 0 ? Math.round(p.stock / p.media_diaria) : 999;
        let recomendacao = 'OK';
        if (dias < 7) recomendacao = 'Repor urgente';
        else if (dias < 30) recomendacao = 'Observar';
        return { sku: p.sku, nome_completo: p.nome_completo, estoque_atual: p.stock, vendas_30d: p.vendas_30d, media_diaria: Math.round(p.media_diaria * 100) / 100, dias_restantes: dias, recomendacao };
      });
      res.json({ sugestoes: resultado.filter(s => s.recomendacao !== 'OK').slice(0, 20) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/anomalies', (req, res) => {
    try {
      const dias = getAllRows("SELECT date(created_at) as data, COALESCE(SUM(total), 0) as total FROM sales WHERE created_at >= datetime('now', '-90 days') GROUP BY date(created_at) ORDER BY data");
      if (dias.length < 3) return res.json({ anomalias: [], media: 0, desvio_padrao: 0, limiar: 2.0 });
      const valores = dias.map(d => d.total);
      const media = valores.reduce((s, v) => s + v, 0) / valores.length;
      const variancia = valores.reduce((s, v) => s + (v - media) ** 2, 0) / valores.length;
      const desvio = Math.sqrt(variancia);
      const limiar = 2.0;
      const anomalias = [];
      dias.forEach(d => {
        if (desvio === 0) return;
        const z = (d.total - media) / desvio;
        if (Math.abs(z) > limiar) anomalias.push({ data: d.data, total: Math.round(d.total * 100) / 100, z_score: Math.round(z * 100) / 100, tipo: z > 0 ? 'alta' : 'baixa' });
      });
      res.json({ anomalias, media: Math.round(media * 100) / 100, desvio_padrao: Math.round(desvio * 100) / 100, limiar });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/associations', (req, res) => {
    try {
      const pares = getAllRows("SELECT a.product_id as a_id, a.product_name as a_name, b.product_id as b_id, b.product_name as b_name, COUNT(*) as vezes_juntos FROM sale_items a JOIN sale_items b ON a.sale_id = b.sale_id AND a.product_id < b.product_id GROUP BY a.product_id, b.product_id ORDER BY vezes_juntos DESC LIMIT 10");
      if (!pares.length) return res.json({ associacoes: [] });
      const associacoes = pares.map(p => {
        const totalA = getSingleRow("SELECT COUNT(*) as c FROM sale_items WHERE product_id = ?", [p.a_id])?.c || 1;
        return { produto_A: p.a_name, produto_B: p.b_name, vezes_juntos: p.vezes_juntos, total_vendas_A: totalA, confianca: Math.round((p.vezes_juntos / totalA) * 100) / 100 };
      });
      res.json({ associacoes });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/pricing', (req, res) => {
    try {
      const sugestoes = getAllRows("SELECT p.sku, p.nome_completo, p.preco as preco_cadastro, AVG(si.unit_price) as preco_medio_vendido, COUNT(*) as total_vendas FROM products p JOIN sale_items si ON p.sku = si.product_id GROUP BY p.sku HAVING total_vendas >= 3");
      const resultado = sugestoes.map(p => {
        const precoCadastro = p.preco_cadastro || 0;
        const precoMedio = Math.round((p.preco_medio_vendido || 0) * 100) / 100;
        const diff = precoCadastro - precoMedio;
        const pctDiff = precoCadastro > 0 ? (diff / precoCadastro) * 100 : 0;
        let sugestao = 'OK';
        if (pctDiff < -5) sugestao = 'Aumentar preco (vendendo ' + Math.abs(Math.round(pctDiff)) + '% abaixo do cadastro)';
        else if (pctDiff > 15) sugestao = 'Reduzir preco (vendendo ' + Math.round(pctDiff) + '% acima do cadastro)';
        return { sku: p.sku, nome_completo: p.nome_completo, preco_cadastro: precoCadastro, preco_medio_vendido: precoMedio, diferenca: Math.round(diff * 100) / 100, sugestao };
      });
      res.json({ sugestoes: resultado });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

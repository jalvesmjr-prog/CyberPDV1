const API = '/api';

function getUser() {
  const u = sessionStorage.getItem('user');
  if (!u) { window.location.href = '/'; return null; }
  return JSON.parse(u);
}

function logout() {
  sessionStorage.clear();
  window.location.href = '/';
}

function fmtMoney(v) {
  return 'R$ ' + (parseFloat(v) || 0).toFixed(2).replace('.', ',');
}

const methodLabels = { dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Débito', credito: 'Crédito' };
const methodColors = { dinheiro: '#27ae60', pix: '#2196f3', debito: '#ff9800', credito: '#e74c3c' };

document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (!user) return;
  document.getElementById('userDisplay').textContent = `👤 ${user.username} (${user.level})`;
  setPeriod('today');
});

function setPeriod(period, event) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const startEl = document.getElementById('reportStart');
  const endEl = document.getElementById('reportEnd');

  if (period === 'today') {
    startEl.value = today;
    endEl.value = today;
  } else if (period === 'week') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    startEl.value = weekStart.toISOString().split('T')[0];
    endEl.value = today;
  } else if (period === 'month') {
    startEl.value = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-01';
    endEl.value = today;
  } else if (period === 'all') {
    startEl.value = '';
    endEl.value = '';
  }

  if (event) {
    document.querySelectorAll('.period-nav button').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
  }
  carregarRelatorios();
}

async function carregarRelatorios() {
  const start = document.getElementById('reportStart').value;
  const end = document.getElementById('reportEnd').value;
  let url = `${API}/vendas/reports/summary?`;
  if (start) url += `&start=${start}`;
  if (end) url += `&end=${end}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    renderizarResumo(data);
    renderizarPagamentos(data.by_payment || []);
    renderizarVendedores(data.by_user || []);
  } catch (e) {
    console.error(e);
  }

  let periodUrl = `${API}/vendas/reports/by-period?`;
  if (start) periodUrl += `&start=${start}`;
  if (end) periodUrl += `&end=${end}`;
  try {
    const res = await fetch(periodUrl);
    const periods = await res.json();
    renderizarPeriodos(periods);
  } catch (e) {}
}

function renderizarResumo(data) {
  document.getElementById('statSales').textContent = data.total_sales || 0;
  document.getElementById('statRevenue').textContent = fmtMoney(data.total_revenue);
  const avg = data.total_sales > 0 ? (data.total_revenue / data.total_sales) : 0;
  document.getElementById('statAvg').textContent = fmtMoney(avg);
}

function renderizarPagamentos(payments) {
  const div = document.getElementById('paymentStats');
  if (!payments.length) {
    div.innerHTML = '<p style="color:#999;">Nenhum dado</p>';
    return;
  }
  const maxTotal = Math.max(...payments.map(p => p.total));
  let html = '';
  payments.forEach(p => {
    const pct = maxTotal > 0 ? (p.total / maxTotal * 100) : 0;
    const label = methodLabels[p.payment_method] || p.payment_method;
    const color = methodColors[p.payment_method] || '#999';
    html += `<div style="margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px;">
        <span>${label}</span>
        <span><strong>${fmtMoney(p.total)}</strong> (${p.count} vendas)</span>
      </div>
      <div class="bar-container">
        <div class="bar-fill" style="width:${pct}%;background:${color};"></div>
      </div>
    </div>`;
  });
  div.innerHTML = html;
}

function renderizarPeriodos(periods) {
  const div = document.getElementById('periodStats');
  if (!periods.length) {
    div.innerHTML = '<p style="color:#999;">Nenhum dado</p>';
    return;
  }
  const maxTotal = Math.max(...periods.map(p => parseFloat(p.total) || 0));
  let html = `<table class="table-mini"><thead><tr><th>Data</th><th>Vendas</th><th>Receita</th><th></th></tr></thead><tbody>`;
  periods.forEach(p => {
    const pct = maxTotal > 0 ? (parseFloat(p.total) / maxTotal * 100) : 0;
    html += `<tr>
      <td>${p.day}</td>
      <td>${p.count}</td>
      <td>${fmtMoney(p.total)}</td>
      <td style="width:40%;"><div class="bar-fill" style="width:${pct}%;height:14px;"></div></td>
    </tr>`;
  });
  html += '</tbody></table>';
  div.innerHTML = html;
}

function renderizarVendedores(users) {
  const div = document.getElementById('userStats');
  if (!users.length) {
    div.innerHTML = '<p style="color:#999;">Nenhum dado</p>';
    return;
  }
  const maxTotal = Math.max(...users.map(u => u.total));
  let html = `<table class="table-mini"><thead><tr><th>Vendedor</th><th>Vendas</th><th>Total</th><th></th></tr></thead><tbody>`;
  users.forEach(u => {
    const pct = maxTotal > 0 ? (u.total / maxTotal * 100) : 0;
    html += `<tr>
      <td><strong>${u.user_name}</strong></td>
      <td>${u.count}</td>
      <td>${fmtMoney(u.total)}</td>
      <td style="width:40%;"><div class="bar-fill" style="width:${pct}%;height:14px;"></div></td>
    </tr>`;
  });
  html += '</tbody></table>';
  div.innerHTML = html;
}

async function carregarIAForecast() {
  const div = document.getElementById('iaAnalyticsContent');
  div.innerHTML = '<p style="color:#999;">Carregando previsao...</p>';
  try {
    const r = await fetch(`${API}/ai/analytics/forecast`);
    const d = await r.json();
    let html = `<div class="stats-row" style="margin-bottom:12px;">
      <div class="stat-item"><div class="stat-big" style="font-size:20px;">${d.total_vendas_7d || 0}</div><div class="stat-label">Vendas 7 dias</div></div>
      <div class="stat-item"><div class="stat-big" style="font-size:20px;">${d.total_vendas_30d || 0}</div><div class="stat-label">Vendas 30 dias</div></div>
      <div class="stat-item"><div class="stat-big" style="font-size:20px;">${fmtMoney(d.forecast_7d)}</div><div class="stat-label">Faturamento 7d</div></div>
      <div class="stat-item"><div class="stat-big" style="font-size:20px;">${fmtMoney(d.forecast_30d)}</div><div class="stat-label">Faturamento 30d</div></div>
      <div class="stat-item"><div class="stat-big" style="font-size:20px;">${fmtMoney(d.media_diaria_7d)}</div><div class="stat-label">Media dia 7d</div></div>
      <div class="stat-item"><div class="stat-big" style="font-size:20px;">${fmtMoney(d.media_diaria_30d)}</div><div class="stat-label">Media dia 30d</div></div>
    </div>`;
    div.innerHTML = html;
  } catch (_) { div.innerHTML = '<p style="color:red;">Erro de conexao</p>'; }
}

async function carregarIAReorder() {
  const div = document.getElementById('iaAnalyticsContent');
  div.innerHTML = '<p style="color:#999;">Analisando estoque...</p>';
  try {
    const r = await fetch(`${API}/ai/analytics/reorder`);
    const d = await r.json();
    const sugestoes = d.sugestoes || [];
    if (!sugestoes.length) { div.innerHTML = '<p style="color:#27ae60;">✅ Estoque OK — nenhum produto precisa de reabastecimento urgente.</p>'; return; }
    let html = '<p style="font-weight:600;margin-bottom:8px;">📦 Sugestoes de Reabastecimento</p><table class="table-mini"><thead><tr><th>SKU</th><th>Produto</th><th>Estoque</th><th>Vendas/30d</th><th>Dias</th><th>Status</th></tr></thead><tbody>';
    sugestoes.forEach(p => {
      const cor = p.recomendacao === 'Repor urgente' ? '#e74c3c' : p.recomendacao === 'Observar' ? '#f39c12' : '#27ae60';
      html += `<tr><td>#${p.sku}</td><td>${p.nome_completo}</td><td>${p.estoque_atual}</td><td>${p.vendas_30d}</td><td>${p.dias_restantes}</td><td style="color:${cor};font-weight:700;">${p.recomendacao}</td></tr>`;
    });
    html += '</tbody></table>';
    div.innerHTML = html;
  } catch (_) { div.innerHTML = '<p style="color:red;">Erro de conexao</p>'; }
}

async function carregarIAAnomalies() {
  const div = document.getElementById('iaAnalyticsContent');
  div.innerHTML = '<p style="color:#999;">Detectando anomalias...</p>';
  try {
    const r = await fetch(`${API}/ai/analytics/anomalies`);
    const d = await r.json();
    let html = `<p>📊 <strong>Media diaria:</strong> ${fmtMoney(d.media)}  |  <strong>Desvio padrao:</strong> ${d.desvio_padrao}</p>`;
    const anomalias = d.anomalias || [];
    if (anomalias.length) {
      html += '<table class="table-mini" style="margin-top:8px;"><thead><tr><th>Data</th><th>Total</th><th>Z-Score</th><th>Tipo</th></tr></thead><tbody>';
      anomalias.forEach(a => {
        const cor = a.tipo === 'alta' ? '#27ae60' : '#e74c3c';
        html += `<tr><td>${a.data}</td><td>${fmtMoney(a.total)}</td><td>${a.z_score}</td><td style="color:${cor};font-weight:700;">${a.tipo === 'alta' ? '📈 Pico' : '📉 Baixa'}</td></tr>`;
      });
      html += '</tbody></table>';
    } else {
      html += '<p style="color:#27ae60;margin-top:8px;">✅ Nenhuma anomalia detectada no periodo.</p>';
    }
    div.innerHTML = html;
  } catch (_) { div.innerHTML = '<p style="color:red;">Erro de conexao</p>'; }
}

async function carregarIAInsights() {
  const div = document.getElementById('iaAnalyticsContent');
  div.innerHTML = '<p style="color:#999;">Gerando insights...</p>';
  try {
    const r = await fetch(`${API}/ai/analytics/summary`);
    const d = await r.json();
    let html = `<div class="stats-row" style="margin-bottom:12px;">
      <div class="stat-item"><div class="stat-big" style="font-size:20px;">${d.total_produtos || 0}</div><div class="stat-label">Produtos</div></div>
      <div class="stat-item"><div class="stat-big" style="font-size:20px;">${d.total_vendas || 0}</div><div class="stat-label">Vendas total</div></div>
      <div class="stat-item"><div class="stat-big" style="font-size:20px;">${fmtMoney(d.receita_total)}</div><div class="stat-label">Receita total</div></div>
      <div class="stat-item"><div class="stat-big" style="font-size:20px;">${fmtMoney(d.ticket_medio)}</div><div class="stat-label">Ticket medio</div></div>
    </div>`;
    const insights = d.insights || [];
    if (insights.length) {
      html += '<p style="font-weight:600;margin-bottom:6px;">💡 Insights:</p>';
      insights.forEach((ins) => {
        html += `<p style="margin:3px 0;padding:6px 10px;background:#f8f9fa;border-radius:4px;border-left:3px solid #0f3460;">${ins}</p>`;
      });
    }
    if ((d.produtos_sem_estoque || 0) > 0 || (d.estoque_baixo || 0) > 0) {
      html += '<div style="margin-top:10px;padding:10px;background:#fff3f3;border-radius:6px;border:1px solid #e74c3c;">';
      if (d.produtos_sem_estoque > 0) html += `<p>🔴 <strong>${d.produtos_sem_estoque} produtos sem estoque</strong> — reabastecimento urgente!</p>`;
      if (d.estoque_baixo > 0) html += `<p>🟡 <strong>${d.estoque_baixo} produtos com estoque critico</strong> (menos de 5 unidades)</p>`;
      html += '</div>';
    }
    div.innerHTML = html;
  } catch (_) { div.innerHTML = '<p style="color:red;">Erro de conexao</p>'; }
}

async function carregarIAassociations() {
  const div = document.getElementById('iaAnalyticsContent');
  div.innerHTML = '<p style="color:#999;">Calculando associacoes...</p>';
  try {
    const r = await fetch(`${API}/ai/analytics/associations`);
    const d = await r.json();
    const associacoes = d.associacoes || [];
    if (!associacoes.length) { div.innerHTML = '<p style="color:#999;">Poucos dados para calcular associacoes.</p>'; return; }
    let html = '<p style="font-weight:600;margin-bottom:8px;">🔄 Quem comprou X tambem comprou Y:</p><table class="table-mini"><thead><tr><th>Produto A</th><th>Produto B</th><th>Juntos</th><th>Confianca</th></tr></thead><tbody>';
    associacoes.slice(0, 15).forEach(p => {
      html += `<tr><td>${p.produto_A}</td><td>${p.produto_B}</td><td>${p.vezes_juntos}x</td><td>${p.confianca}</td></tr>`;
    });
    html += '</tbody></table>';
    div.innerHTML = html;
  } catch (_) { div.innerHTML = '<p style="color:red;">Erro de conexao</p>'; }
}

async function carregarIAPricing() {
  const div = document.getElementById('iaAnalyticsContent');
  div.innerHTML = '<p style="color:#999;">Analisando precos...</p>';
  try {
    const r = await fetch(`${API}/ai/analytics/pricing`);
    const d = await r.json();
    const sugestoes = d.sugestoes || [];
    if (!sugestoes.length) { div.innerHTML = '<p style="color:#27ae60;">✅ Todos os precos estao consistentes (poucos dados de venda).</p>'; return; }
    let html = '<p style="font-weight:600;margin-bottom:8px;">🏷️ Sugestoes de Precificacao</p><table class="table-mini"><thead><tr><th>SKU</th><th>Produto</th><th>Preco Cadastro</th><th>Preco Praticado</th><th>Diferenca</th><th>Sugestao</th></tr></thead><tbody>';
    sugestoes.forEach(p => {
      html += `<tr><td>#${p.sku}</td><td>${p.nome_completo}</td><td>${fmtMoney(p.preco_cadastro)}</td><td>${fmtMoney(p.preco_medio_vendido)}</td><td>${fmtMoney(p.diferenca)}</td><td style="font-size:11px;">${p.sugestao || 'OK'}</td></tr>`;
    });
    html += '</tbody></table>';
    div.innerHTML = html;
  } catch (_) { div.innerHTML = '<p style="color:red;">Erro de conexao</p>'; }
}

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

function fmtDate(d) {
  if (!d) return '-';
  return d.split(' ')[0].split('-').reverse().join('/');
}

function fmtTime(d) {
  if (!d) return '';
  const p = d.split(' ');
  return p.length > 1 ? p[1].substring(0, 5) : '';
}

const methodLabels = { dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Débito', credito: 'Crédito' };

document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (!user) return;
  document.getElementById('userDisplay').textContent = `👤 ${user.username} (${user.level})`;
  carregarUsuariosFiltro();
  carregarVendas();
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('filterStart').value = '';
  document.getElementById('filterEnd').value = hoje;
});

async function carregarUsuariosFiltro() {
  try {
    const res = await fetch(`${API}/vendas/reports/summary`);
    const data = await res.json();
    const sel = document.getElementById('filterUser');
    (data.by_user || []).forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.user_name;
      opt.textContent = u.user_name;
      sel.appendChild(opt);
    });
  } catch (e) {}
}

async function carregarVendas() {
  const start = document.getElementById('filterStart').value;
  const end = document.getElementById('filterEnd').value;
  const payment = document.getElementById('filterPayment').value;
  const user = document.getElementById('filterUser').value;
  let url = `${API}/vendas?limit=200`;
  if (start) url += `&start=${start}`;
  if (end) url += `&end=${end}`;
  if (payment) url += `&payment=${payment}`;
  if (user) url += `&user=${encodeURIComponent(user)}`;

  try {
    const res = await fetch(url);
    const vendas = await res.json();
    renderizarVendas(vendas);
  } catch (err) {
    document.getElementById('vendasList').innerHTML = '<p style="color:red;">Erro ao carregar vendas</p>';
  }
}

async function renderizarVendas(vendas) {
  const container = document.getElementById('vendasList');
  const countEl = document.getElementById('salesCount');
  countEl.textContent = `${vendas.length} venda(s)`;

  if (!vendas.length) {
    container.innerHTML = '<p style="text-align:center;color:#999;margin-top:40px;">Nenhuma venda encontrada</p>';
    return;
  }

  container.innerHTML = '';
  for (const v of vendas) {
    const div = document.createElement('div');
    div.className = 'venda-card';
    div.innerHTML = `
      <div class="venda-card-header" onclick="toggleVendaItems(${v.id}, this)">
        <div class="venda-card-info">
          <strong>#${v.id}</strong>
          <span class="venda-date">${fmtDate(v.created_at)} ${fmtTime(v.created_at)}</span>
          <span class="venda-user">${v.user_name}</span>
          <span class="venda-payment">${methodLabels[v.payment_method] || v.payment_method}</span>
        </div>
        <div class="venda-card-total">
          <span class="venda-value">${fmtMoney(v.total)}</span>
          <span class="venda-expand">▶</span>
        </div>
      </div>
      <div class="venda-card-body" id="vendaBody${v.id}" style="display:none;">
        <div class="venda-loading">Carregando...</div>
      </div>
    `;
    container.appendChild(div);
  }
}

async function toggleVendaItems(id, headerEl) {
  const body = document.getElementById('vendaBody' + id);
  if (body.style.display !== 'none') {
    body.style.display = 'none';
    headerEl.querySelector('.venda-expand').textContent = '▶';
    return;
  }
  body.style.display = 'block';
  headerEl.querySelector('.venda-expand').textContent = '▼';

  if (body.dataset.loaded) return;

  try {
    const res = await fetch(`${API}/vendas/${id}`);
    const venda = await res.json();
    body.dataset.loaded = '1';
    let html = '<table class="venda-items-table"><thead><tr><th>Produto</th><th>Qtd</th><th>Preço</th><th>Subtotal</th></tr></thead><tbody>';
    (venda.items || []).forEach(item => {
      html += `<tr><td>${item.product_name}</td><td>${item.quantity}</td><td>${fmtMoney(item.unit_price)}</td><td>${fmtMoney(item.subtotal)}</td></tr>`;
    });
    html += '</tbody></table>';
    html += `<div style="text-align:right;margin-top:10px;">
      <button class="btn btn-sm btn-primary" onclick="imprimirCupom(${id})">Imprimir Cupom</button>
      <button class="btn btn-sm btn-secondary" onclick="imprimirTermicaHistorico(${id}, this)" style="margin-left:6px;">🖨️ Térmica</button>
    </div>`;
    body.innerHTML = html;
  } catch (e) {
    body.innerHTML = '<p style="color:red;">Erro ao carregar itens</p>';
  }
}

async function imprimirCupom(saleId) {
  try {
    const res = await fetch(`${API}/vendas/${saleId}`);
    const venda = await res.json();
    const method = methodLabels[venda.payment_method] || venda.payment_method;

    function linha(txt) { return txt + '<br>'; }
    function sep() { return '<div class="cupom-sep">================================</div>'; }

    let itensHtml = '';
    (venda.items || []).forEach((item, idx) => {
      const cod = String(item.product_id || (idx + 1)).padStart(3, '0');
      itensHtml += `<div class="cupom-item">
        <span class="cupom-item-cod">${cod}</span>
        <span class="cupom-item-desc">${item.product_name}</span>
        <span class="cupom-item-qtd">${item.quantity}x</span>
        <span class="cupom-item-val">${fmtMoney(item.subtotal)}</span>
      </div>`;
    });

    const dataStr = venda.created_at ? venda.created_at.replace('T', ' ').substring(0, 19) : '-';
    let html = `<div class="cupom" id="cupomPrint">`;

    html += sep();
    html += `<div class="cupom-header">
      <div class="cupom-logo">CYBERPDV</div>
      <div class="cupom-cnpj">CNPJ: 00.000.000/0000-00</div>
      <div class="cupom-end">Rua da Tecnologia, 100 - Centro</div>
      <div class="cupom-end">Cidade - UF, 00000-000</div>
      <div class="cupom-tel">Tel: (00) 0000-0000</div>
    </div>`;
    html += sep();
    html += `<div class="cupom-title">CUPOM NÃO FISCAL</div>`;
    html += sep();
    html += `<div class="cupom-info">
      <div><span class="cupom-label">VENDA:</span> #${String(venda.id).padStart(6, '0')}</div>
      <div><span class="cupom-label">DATA:</span> ${dataStr}</div>
      <div><span class="cupom-label">OPERADOR:</span> ${venda.user_name || '-'}</div>
    </div>`;
    html += sep();
    html += `<div class="cupom-itens-header">
      <span class="cupom-th-cod">COD</span>
      <span class="cupom-th-desc">DESCRIÇÃO</span>
      <span class="cupom-th-qtd">QTD</span>
      <span class="cupom-th-val">R$</span>
    </div>`;
    html += `<div class="cupom-itens-body">${itensHtml}</div>`;
    html += `<div class="cupom-itens-total">
      <span class="cupom-total-label">TOTAL</span>
      <span class="cupom-total-val">${fmtMoney(venda.total)}</span>
    </div>`;
    html += sep();
    html += `<div class="cupom-pagamento">
      <div class="cupom-pag-linha"><span class="cupom-label">FORMA PAGAMENTO:</span> ${method}</div>`;
    if (venda.payment_method === 'dinheiro' || method === 'Dinheiro') {
      const vr = parseFloat(venda.valor_recebido) || 0;
      const tr = parseFloat(venda.troco) || 0;
      if (vr > 0) html += `<div class="cupom-pag-linha"><span class="cupom-label">VALOR RECEBIDO:</span> ${fmtMoney(vr)}</div>`;
      if (tr > 0) html += `<div class="cupom-pag-linha cupom-troco"><span class="cupom-label">TROCO:</span> ${fmtMoney(tr)}</div>`;
    }
    html += `</div>`;
    html += sep();
    html += `<div class="cupom-footer">
      <div>Obrigado pela preferência!</div>
      <div>Volte sempre!</div>
      <div class="cupom-sys">CyberPDV v1.0</div>
    </div>`;
    html += sep();
    html += `</div>`;

    html += `<div class="cupom-acoes">
      <button class="btn btn-primary btn-full" onclick="window.print()">Imprimir Cupom</button>
      <button class="btn btn-success btn-full" onclick="historicoSalvarImagem(${saleId}, this)" style="margin-top:8px;">Salvar como Imagem</button>
      <button class="btn btn-secondary btn-full" onclick="imprimirTermicaHistorico(${saleId}, this)" style="margin-top:8px;">🖨️ Imprimir na Térmica</button>
    </div>`;

    document.getElementById('cupomContent').innerHTML = html;
    document.getElementById('modalCupom').style.display = 'flex';
  } catch (e) {
    alert('Erro ao carregar venda');
  }
}

async function imprimirTermicaHistorico(saleId, btn) {
  try {
    const res = await fetch(`${API}/vendas/${saleId}`);
    const venda = await res.json();
    if (!btn) { btn = event?.target; }
    if (btn) { btn.disabled = true; btn.textContent = '...'; }
    const imprRes = await fetch(`${API}/impressao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: venda.items || [],
        total: venda.total || 0,
        payment_method: venda.payment_method || 'dinheiro',
        sale_id: venda.id,
        user_name: venda.user_name || '-',
        troco: venda.troco || 0,
        valor_recebido: venda.valor_recebido || venda.total || 0
      })
    });
    const result = await imprRes.json();
    if (result.success) {
      alert('Impresso na termica!');
    } else {
      alert('Erro: ' + (result.error || 'Falha na impressao'));
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Térmica'; }
  } catch (err) {
    alert('Erro de conexao');
  }
}

async function historicoSalvarImagem(saleId, btn) {
  btn.disabled = true;
  btn.textContent = 'Gerando imagem...';
  try {
    if (typeof html2canvas === 'undefined') {
      alert('Biblioteca de imagem não carregada');
      btn.disabled = false;
      btn.textContent = 'Salvar como Imagem';
      return;
    }
    const el = document.getElementById('cupomPrint');
    const canvas = await html2canvas(el, {
      scale: 2, useCORS: true, allowTaint: false,
      backgroundColor: '#ffffff', logging: false,
      width: el.scrollWidth, height: el.scrollHeight
    });
    const link = document.createElement('a');
    link.download = `cupom_${String(saleId).padStart(6, '0')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    alert('Erro ao gerar imagem');
  }
  btn.disabled = false;
  btn.textContent = 'Salvar como Imagem';
}

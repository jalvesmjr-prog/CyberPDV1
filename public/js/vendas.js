const API = '/api';
let carrinho = [];
let produtos = [];
let produtosAll = [];
let fuseIndex = null;
let lastSkuNaoEncontrado = null;
let lastSaleData = null;

function getUser() {
  const u = sessionStorage.getItem('user');
  if (!u) { window.location.href = '/'; return null; }
  return JSON.parse(u);
}

function logout() {
  sessionStorage.clear();
  window.location.href = '/';
}

function formatMoney(v) {
  const val = (parseFloat(v) || 0);
  return 'R$ ' + val.toFixed(2).replace('.', ',');
}

async function carregarCategorias() {
  const res = await fetch(`${API}/produtos/categorias`);
  const cats = await res.json();
  const sel = document.getElementById('catFilter');
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

async function carregarTodosProdutos() {
  try {
    const res = await fetch(`${API}/produtos?limit=9999`);
    produtosAll = await res.json();
    fuseIndex = new Fuse(produtosAll, {
      keys: [
        { name: 'nome_completo', weight: 5 },
        { name: 'sku', weight: 4 },
        { name: 'marca', weight: 3 },
        { name: 'modelo', weight: 3 },
        { name: 'categoria', weight: 1 }
      ],
      threshold: 0.4,
      ignoreLocation: true,
      includeScore: true,
      minMatchCharLength: 2
    });
    buscarProdutos();
  } catch (_) {
    buscarProdutos();
  }
}

async function buscarProdutos() {
  const search = document.getElementById('searchProd').value.trim();
  const cat = document.getElementById('catFilter').value;
  let source = produtosAll;
  if (search && fuseIndex) {
    const results = fuseIndex.search(search);
    source = results.map(r => r.item);
  } else if (!produtosAll.length) {
    const res = await fetch(`${API}/produtos?limit=9999`);
    source = await res.json();
    produtosAll = source;
  }
  if (cat) {
    source = source.filter(p => p.categoria === cat);
  }
  produtos = source;
  renderizarProdutos();
}

function renderizarProdutos() {
  const grid = document.getElementById('produtosGrid');
  grid.innerHTML = '';
  produtos.forEach(p => {
    const card = document.createElement('div');
    const tipo = p.tipo || 'PROD';
    card.className = 'prod-card' + (p.stock <= 0 ? ' out-of-stock' : '');
    const tipoBg = tipo === 'ADM' ? '#ff9800' : tipo === 'SERV' ? '#4caf50' : '#2196f3';
    const nomeCurto = (p.nome_completo || '').length > 50 ? (p.nome_completo || '').substring(0, 47) + '...' : (p.nome_completo || '');
    card.innerHTML = `
      <div class="prod-sku">#${p.sku}</div>
      <div class="prod-tipo"><span style="font-size:10px;padding:1px 5px;border-radius:3px;background:${tipoBg};color:white;">${tipo}</span></div>
      <div class="prod-brand">${p.marca || ''}</div>
      <div class="prod-name">${p.modelo || nomeCurto}</div>
      <div class="prod-price">${formatMoney(p.preco || 0)}</div>
      <div class="prod-stock">Estoque: ${p.stock}</div>
    `;
    if (p.stock > 0) {
      card.onclick = () => adicionarAoCarrinho(p);
    }
    grid.appendChild(card);
  });
}

function adicionarAoCarrinho(prod) {
  if (prod.stock <= 0) {
    feedbackBarcode('Produto sem estoque!', true);
    return;
  }
  const existente = carrinho.find(i => i.product_id === prod.sku);
  if (existente) {
    if (existente.quantity < prod.stock) {
      existente.quantity++;
      existente.subtotal = Math.round(existente.quantity * existente.unit_price * 100) / 100;
    } else {
      feedbackBarcode('Estoque máximo atingido!', true);
    }
  } else {
    carrinho.push({
      product_id: prod.sku,
      product_name: prod.nome_completo || `${prod.marca || ''} ${prod.modelo || ''}`.trim(),
      quantity: 1,
      unit_price: prod.preco || 0,
      subtotal: prod.preco || 0
    });
  }
  renderizarCarrinho();
}

function renderizarCarrinho() {
  const body = document.getElementById('carrinhoBody');
  const totalEl = document.getElementById('totalCarrinho');
  const countEl = document.getElementById('itemCount');

  body.innerHTML = '';
  let total = 0;
  let qtd = 0;

  carrinho.forEach((item, idx) => {
    total += item.subtotal;
    qtd += item.quantity;
    const div = document.createElement('div');
    div.className = 'carrinho-item';
    div.innerHTML = `
      <div class="carrinho-item-info">
        <div class="carrinho-item-name">${item.product_name}</div>
        <div class="carrinho-item-qty">
          <button onclick="alterarQtd(${idx}, -1)">-</button>
          <span>${item.quantity}</span>
          <button onclick="alterarQtd(${idx}, 1)">+</button>
          <span style="margin-left:8px;color:#666">${formatMoney(item.unit_price)}</span>
        </div>
      </div>
      <div class="carrinho-item-total">${formatMoney(item.subtotal)}</div>
      <div class="carrinho-item-remove" onclick="removerItem(${idx})">&times;</div>
    `;
    body.appendChild(div);
  });

  totalEl.textContent = formatMoney(Math.round(total * 100) / 100);
  countEl.textContent = qtd + ' itens';

  if (document.getElementById('trocoGroup').style.display !== 'none') {
    calcularTroco();
  }
}

function alterarQtd(idx, delta) {
  const item = carrinho[idx];
  if (!item) return;
  const prod = produtosAll.find(p => p.sku === item.product_id) || produtos.find(p => p.sku === item.product_id);
  item.quantity += delta;
  if (item.quantity <= 0) {
    carrinho.splice(idx, 1);
  } else {
    if (prod && item.quantity > prod.stock) {
      item.quantity = prod.stock;
    }
    item.subtotal = Math.round(item.quantity * item.unit_price * 100) / 100;
  }
  renderizarCarrinho();
}

function removerItem(idx) {
  carrinho.splice(idx, 1);
  renderizarCarrinho();
}

function limparCarrinho() {
  if (!carrinho.length) return;
  if (!confirm('Limpar carrinho?')) return;
  carrinho = [];
  renderizarCarrinho();
}

function getPaymentMethod() {
  const active = document.querySelector('.btn-pagamento.active');
  return active ? active.dataset.method : 'dinheiro';
}

function selecionarPagamento(method) {
  document.querySelectorAll('.btn-pagamento').forEach(b => b.classList.remove('active'));
  document.querySelector(`.btn-pagamento[data-method="${method}"]`).classList.add('active');
  const trocoGroup = document.getElementById('trocoGroup');
  if (method === 'dinheiro') {
    trocoGroup.style.display = 'block';
    calcularTroco();
  } else {
    trocoGroup.style.display = 'none';
  }
}

function getTotalCarrinho() {
  let total = 0;
  carrinho.forEach(item => { total += item.subtotal; });
  return Math.round(total * 100) / 100;
}

function calcularTroco() {
  const total = getTotalCarrinho();
  const recebido = parseFloat(document.getElementById('valorRecebido').value) || 0;
  const trocoEl = document.getElementById('trocoValor');
  const display = document.getElementById('trocoDisplay');
  if (recebido >= total) {
    const troco = Math.round((recebido - total) * 100) / 100;
    trocoEl.textContent = formatMoney(troco);
    trocoEl.style.color = '#27ae60';
    display.className = 'troco-display troco-ok';
    document.getElementById('btnFinalizar').disabled = false;
  } else if (recebido > 0) {
    trocoEl.textContent = 'Valor insuficiente';
    trocoEl.style.color = '#e74c3c';
    display.className = 'troco-display troco-insuficiente';
    document.getElementById('btnFinalizar').disabled = true;
  } else {
    trocoEl.textContent = formatMoney(0);
    trocoEl.style.color = '#999';
    display.className = 'troco-display';
    document.getElementById('btnFinalizar').disabled = false;
  }
}

async function finalizarVenda() {
  if (!carrinho.length) { alert('Carrinho vazio'); return; }
  const paymentMethod = getPaymentMethod();
  const user = getUser();

  const totalVenda = getTotalCarrinho();
  const recebido = paymentMethod === 'dinheiro' ? (parseFloat(document.getElementById('valorRecebido').value) || 0) : totalVenda;
  const troco = paymentMethod === 'dinheiro' ? Math.max(0, Math.round((recebido - totalVenda) * 100) / 100) : 0;

  if (paymentMethod === 'dinheiro' && recebido < totalVenda) {
    alert(`Valor recebido (R$ ${recebido.toFixed(2)}) é menor que o total (R$ ${totalVenda.toFixed(2)})`);
    return;
  }

  try {
    const res = await fetch(`${API}/vendas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        user_name: user.username,
        items: carrinho,
        payment_method: paymentMethod,
        troco: troco,
        valor_recebido: recebido
      })
    });
    const data = await res.json();
    if (data.success) {
      const items = [...carrinho];
      const total = data.total;
      const saleId = data.sale_id;
      const method = methodLabels[paymentMethod] || paymentMethod;
      carrinho = [];
      renderizarCarrinho();
      carregarTodosProdutos();
      document.getElementById('valorRecebido').value = '';
      mostrarCupom(saleId, items, total, method, user, troco, recebido);
    } else {
      alert('Erro: ' + data.error);
    }
  } catch (err) {
    alert('Erro ao finalizar venda');
  }
}

function mostrarCupom(saleId, items, total, method, user, troco, recebido) {
  recebido = recebido || total;
  lastSaleData = { saleId, items, total, method, user, troco, recebido, payment_method: getPaymentMethod() };
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});

  function linha(txt) { return txt + '<br>'; }
  function sep() { return '<div class="cupom-sep">================================</div>'; }

  let itensHtml = '';
  items.forEach((item, idx) => {
    const cod = String(item.product_id || (idx + 1)).padStart(3, '0');
    itensHtml += `<div class="cupom-item">
      <span class="cupom-item-cod">${cod}</span>
      <span class="cupom-item-desc">${item.product_name}</span>
      <span class="cupom-item-qtd">${item.quantity}x</span>
      <span class="cupom-item-val">${formatMoney(item.subtotal)}</span>
    </div>`;
  });

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
    <div><span class="cupom-label">VENDA:</span> #${String(saleId).padStart(6, '0')}</div>
    <div><span class="cupom-label">DATA:</span> ${dateStr}</div>
    <div><span class="cupom-label">OPERADOR:</span> ${user.username} (${user.level})</div>
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
    <span class="cupom-total-val">${formatMoney(total)}</span>
  </div>`;
  html += sep();
  html += `<div class="cupom-pagamento">
    <div class="cupom-pag-linha"><span class="cupom-label">FORMA PAGAMENTO:</span> ${method}</div>`;
  if (method === 'Dinheiro') {
    html += `<div class="cupom-pag-linha"><span class="cupom-label">VALOR RECEBIDO:</span> ${formatMoney(recebido)}</div>`;
    if (troco && troco > 0) {
      html += `<div class="cupom-pag-linha cupom-troco"><span class="cupom-label">TROCO:</span> ${formatMoney(troco)}</div>`;
    }
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
    <button class="btn btn-success btn-full" onclick="salvarCupomImagem(${saleId}, this)" style="margin-top:8px;">Salvar como Imagem</button>
    <button class="btn btn-secondary btn-full" onclick="imprimirTermica(${saleId}, this)" style="margin-top:8px;">🖨️ Imprimir na Térmica</button>
    <button class="btn btn-secondary btn-full" onclick="document.getElementById('modalCupom').style.display='none'" style="margin-top:8px;">Fechar</button>
  </div>`;

  document.getElementById('cupomContent').innerHTML = html;
  document.getElementById('modalCupom').style.display = 'flex';
}

async function salvarCupomImagem(saleId, btn) {
  btn.disabled = true;
  btn.textContent = 'Gerando imagem...';

  try {
    if (typeof html2canvas === 'undefined') {
      alert('Biblioteca de imagem não carregada. Tente novamente.');
      btn.disabled = false;
      btn.textContent = 'Salvar como Imagem';
      return;
    }

    const el = document.getElementById('cupomPrint');
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      width: el.scrollWidth,
      height: el.scrollHeight
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

async function imprimirTermica(saleId, btn) {
  if (!lastSaleData) { alert('Dados da venda nao disponiveis'); return; }
  const data = lastSaleData;
  if (btn) { btn.disabled = true; btn.textContent = 'Imprimindo...'; }
  try {
    const res = await fetch(`${API}/impressao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: data.items,
        total: data.total,
        payment_method: data.payment_method,
        sale_id: saleId,
        user_name: data.user.username,
        troco: data.troco || 0,
        valor_recebido: data.recebido || data.total
      })
    });
    const result = await res.json();
    if (result.success) {
      feedbackBarcode('Impresso na termica!', false);
    } else {
      alert('Erro ao imprimir: ' + (result.error || 'Falha na impressao'));
    }
  } catch (err) {
    alert('Erro de conexao ao imprimir');
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Imprimir na Térmica'; }
}

const methodLabels = { dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Débito', credito: 'Crédito' };

function handleBarcode(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    buscarBarcode();
  }
}

function feedbackBarcode(msg, isError) {
  const input = document.getElementById('barcodeInput');
  input.style.borderColor = isError ? '#e74c3c' : '#27ae60';
  input.style.backgroundColor = isError ? '#fff5f5' : '#f0fff4';
  input.title = msg;
  setTimeout(() => {
    input.style.borderColor = '';
    input.style.backgroundColor = '';
    input.title = '';
  }, 1500);
}

function buscarBarcode() {
  const input = document.getElementById('barcodeInput');
  const codigo = input.value.trim();
  if (!codigo) return;

  const sku = parseInt(codigo);
  if (isNaN(sku)) {
    feedbackBarcode('Código inválido', true);
    input.value = '';
    input.focus();
    return;
  }

  function processarProd(prod) {
    if (prod.stock <= 0) {
      feedbackBarcode('Produto sem estoque!', true);
      input.value = '';
      input.focus();
      return;
    }
    adicionarAoCarrinho(prod);
    feedbackBarcode(`${prod.nome_completo.substring(0, 30)} - adicionado!`, false);
    input.value = '';
    input.focus();
  }

  const prod = produtos.find(p => p.sku === sku);
  if (prod) {
    processarProd(prod);
  } else {
    fetch(`${API}/produtos/${sku}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(p => {
        if (p && p.sku) {
          produtos.push(p);
          processarProd(p);
        }
      })
      .catch(() => {
        feedbackBarcode('Produto não encontrado!', true);
        lastSkuNaoEncontrado = sku;
        document.getElementById('btnCadastrarBarcode').style.display = 'inline-flex';
        input.value = '';
        input.focus();
      });
  }
}

function abrirCadastroRapido() {
  document.getElementById('crSku').value = lastSkuNaoEncontrado;
  document.getElementById('crNome').value = '';
  document.getElementById('crPreco').value = '';
  document.getElementById('crTipo').value = 'PROD';
  document.getElementById('crMarca').value = '';
  document.getElementById('crModelo').value = '';
  document.getElementById('crEstoque').value = '1';
  document.getElementById('crError').style.display = 'none';
  document.getElementById('crError').textContent = '';
  document.getElementById('btnSalvarCr').disabled = false;
  document.getElementById('btnSalvarCr').textContent = 'Salvar e Adicionar ao Carrinho';
  document.getElementById('modalCadastroRapido').style.display = 'flex';
  document.getElementById('crNome').focus();

  carregarCategoriasCadastro();
}

function fecharCadastroRapido() {
  document.getElementById('modalCadastroRapido').style.display = 'none';
}

async function carregarCategoriasCadastro() {
  const sel = document.getElementById('crCategoria');
  if (sel.options.length > 0) return;
  try {
    const res = await fetch(`${API}/produtos/categorias`);
    const cats = await res.json();
    sel.innerHTML = '<option value="">Sem categoria</option>';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
  } catch (_) {}
}

async function salvarCadastroRapido() {
  const sku = parseInt(document.getElementById('crSku').value);
  const nome = document.getElementById('crNome').value.trim();
  const preco = parseFloat(document.getElementById('crPreco').value) || 0;
  const tipo = document.getElementById('crTipo').value;
  const categoria = document.getElementById('crCategoria').value;
  const marca = document.getElementById('crMarca').value.trim();
  const modelo = document.getElementById('crModelo').value.trim();
  const estoque = parseInt(document.getElementById('crEstoque').value) || 0;

  if (!nome && !marca && !modelo) {
    document.getElementById('crError').textContent = 'Informe ao menos o nome do produto.';
    document.getElementById('crError').style.display = 'block';
    return;
  }

  if (preco <= 0) {
    document.getElementById('crError').textContent = 'Informe um preço válido.';
    document.getElementById('crError').style.display = 'block';
    return;
  }

  const btn = document.getElementById('btnSalvarCr');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    const res = await fetch(`${API}/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku,
        nome_completo: nome,
        preco,
        tipo,
        categoria,
        marca,
        modelo,
        stock: estoque
      })
    });
    const data = await res.json();
    if (data.success) {
      const res2 = await fetch(`${API}/produtos/${sku}`);
      const prod = await res2.json();
      if (prod && prod.sku) {
        produtos.push(prod);
        adicionarAoCarrinho(prod);
        renderizarProdutos();
        feedbackBarcode(`${prod.nome_completo.substring(0, 30)} - cadastrado!`, false);
      }
      document.getElementById('btnCadastrarBarcode').style.display = 'none';
      fecharCadastroRapido();
    } else {
      document.getElementById('crError').textContent = data.error || 'Erro ao cadastrar.';
      document.getElementById('crError').style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Salvar e Adicionar ao Carrinho';
    }
  } catch (err) {
    document.getElementById('crError').textContent = 'Erro de conexão. Tente novamente.';
    document.getElementById('crError').style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Salvar e Adicionar ao Carrinho';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  document.getElementById('userDisplay').textContent = `👤 ${user.username} (${user.level})`;
  carregarCategorias();
  carregarTodosProdutos();

  document.getElementById('barcodeInput').addEventListener('input', () => {
    document.getElementById('btnCadastrarBarcode').style.display = 'none';
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.getElementById('modalCupom').style.display = 'none';
      document.getElementById('modalCadastroRapido').style.display = 'none';
    }
  });
});

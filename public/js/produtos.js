const API = '/api';
let produtosData = [];
let produtosAll = [];
let fuseProd = null;
let sortState = { col: 'sku', dir: 'asc' };

function getUser() {
  const u = sessionStorage.getItem('user');
  if (!u) { window.location.href = '/'; return null; }
  return JSON.parse(u);
}

function logout() {
  sessionStorage.clear();
  window.location.href = '/';
}

function fmt(v) {
  if (v === null || v === undefined || v === '') return '-';
  return String(v);
}

function fmtMoney(v) {
  const n = parseFloat(v);
  if (isNaN(n) || n === 0) return '0,00';
  return n.toFixed(2).replace('.', ',');
}

document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (!user) return;
  document.getElementById('userDisplay').textContent = `👤 ${user.username} (${user.level})`;
  if (user.level === 'lord' || user.level === 'adm') {
    document.getElementById('btnUsers').style.display = 'inline-block';
  }
  carregarCategorias();
});

async function carregarCategorias() {
  const res = await fetch(`${API}/produtos/categorias`);
  const cats = await res.json();
  const sel = document.getElementById('prodCategoria');
  const filterSel = document.getElementById('catFilterTable');
  sel.innerHTML = '<option value="">Sem categoria</option>';
  filterSel.innerHTML = '<option value="">Todas categorias</option>';
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    sel.appendChild(opt);
    filterSel.appendChild(opt.cloneNode(true));
  });
  carregarProdutos();
}

async function carregarProdutos() {
  const search = document.getElementById('searchInput').value.trim();
  const cat = document.getElementById('catFilterTable').value;

  if (!produtosAll.length || !fuseProd) {
    try {
      const res = await fetch(`${API}/produtos?limit=9999`);
      produtosAll = await res.json();
      fuseProd = new Fuse(produtosAll, {
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
    } catch (_) {
      if (!produtosAll.length) {
        const res = await fetch(`${API}/produtos?limit=9999`);
        produtosAll = await res.json();
      }
    }
  }

  let source = produtosAll;
  if (search) {
    const results = fuseProd.search(search);
    source = results.map(r => r.item);
  }
  if (cat) {
    source = source.filter(p => p.categoria === cat);
  }

  produtosData = source;
  sortState.col = 'sku';
  sortState.dir = 'asc';
  renderizarProdutos();
}

function ordenar(col) {
  if (sortState.col === col) {
    sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.col = col;
    sortState.dir = 'asc';
  }
  renderizarProdutos();
}

function renderizarProdutos() {
  const tbody = document.getElementById('produtosBody');
  tbody.innerHTML = '';

  const sorted = [...produtosData].sort((a, b) => {
    let valA, valB;
    const col = sortState.col;

    if (col === 'nome_completo') {
      valA = (a.nome_completo || '').toLowerCase();
      valB = (b.nome_completo || '').toLowerCase();
    } else if (col === 'tipo') {
      valA = (a.tipo || 'PROD').toLowerCase();
      valB = (b.tipo || 'PROD').toLowerCase();
    } else if (col === 'categoria') {
      valA = (a.categoria || '').toLowerCase();
      valB = (b.categoria || '').toLowerCase();
    } else if (col === 'sub_categoria') {
      valA = (a.sub_categoria || '').toLowerCase();
      valB = (b.sub_categoria || '').toLowerCase();
    } else if (col === 'marca') {
      valA = (a.marca || '').toLowerCase();
      valB = (b.marca || '').toLowerCase();
    } else if (col === 'modelo') {
      valA = (a.modelo || '').toLowerCase();
      valB = (b.modelo || '').toLowerCase();
    } else if (col === 'obs') {
      valA = (a.obs || '').toLowerCase();
      valB = (b.obs || '').toLowerCase();
    } else if (col === 'func') {
      valA = (a.func || '').toLowerCase();
      valB = (b.func || '').toLowerCase();
    } else if (col === 'img') {
      valA = (a.img || '').toLowerCase();
      valB = (b.img || '').toLowerCase();
    } else if (col === 'data') {
      valA = (a.data || '').toLowerCase();
      valB = (b.data || '').toLowerCase();
    } else {
      valA = a[col];
      valB = b[col];
    }

    if (valA === undefined || valA === null || valA === '') valA = '';
    if (valB === undefined || valB === null || valB === '') valB = '';

    if (['sku', 'preco', 'stock', 'p', 'a', 'l', 't'].includes(col)) {
      valA = parseFloat(valA) || 0;
      valB = parseFloat(valB) || 0;
      return sortState.dir === 'asc' ? valA - valB : valB - valA;
    }
    valA = String(valA).toLowerCase();
    valB = String(valB).toLowerCase();
    if (valA < valB) return sortState.dir === 'asc' ? -1 : 1;
    if (valA > valB) return sortState.dir === 'asc' ? 1 : -1;
    return 0;
  });

  document.querySelectorAll('#produtosTable th[data-col]').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.col === sortState.col) {
      th.classList.add(sortState.dir === 'asc' ? 'sort-asc' : 'sort-desc');
    }
  });

  sorted.forEach(p => {
    const tr = document.createElement('tr');
    const tipo = p.tipo || 'PROD';
    if (tipo === 'ADM') tr.className = 'tipo-adm';
    else if (tipo === 'SERV') tr.className = 'tipo-serv';

    const nomeCurto = (p.nome_completo || '').length > 50 ? (p.nome_completo || '').substring(0, 47) + '...' : (p.nome_completo || '-');

    tr.innerHTML = `
      <td style="white-space:nowrap">
        <button class="btn btn-sm btn-primary" onclick="editarProduto(${p.sku})" style="padding:3px 8px;font-size:11px;">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="excluirProduto(${p.sku})" style="padding:3px 8px;font-size:11px;">Excluir</button>
      </td>
      <td class="val-num"><strong>${fmt(p.sku)}</strong></td>
      <td title="${fmt(p.nome_completo)}" style="max-width:250px;overflow:hidden;text-overflow:ellipsis;">${nomeCurto}</td>
      <td class="val-center"><span style="font-weight:600;font-size:10px;padding:2px 6px;border-radius:3px;background:${tipo === 'ADM' ? '#ff9800' : tipo === 'SERV' ? '#4caf50' : '#2196f3'};color:white;">${tipo}</span></td>
      <td>${fmt(p.categoria)}</td>
      <td>${fmt(p.sub_categoria)}</td>
      <td>${fmt(p.marca)}</td>
      <td title="${fmt(p.modelo)}" style="max-width:150px;overflow:hidden;text-overflow:ellipsis;">${fmt(p.modelo)}</td>
      <td class="val-num"><strong>${fmtMoney(p.preco)}</strong></td>
      <td class="val-num">${p.stock !== undefined && p.stock !== null ? p.stock : '-'}</td>
      <td class="val-num">${fmt(p.p)}</td>
      <td class="val-num">${fmt(p.a)}</td>
      <td class="val-num">${fmt(p.l)}</td>
      <td class="val-num">${fmt(p.t)}</td>
      <td title="${fmt(p.obs)}" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;">${(p.obs || '').substring(0, 25) || '-'}</td>
      <td title="${fmt(p.img)}" style="max-width:80px;overflow:hidden;text-overflow:ellipsis;">${p.img ? (p.img.substring(0, 20) + '...') : '-'}</td>
      <td>${fmt(p.func)}</td>
      <td>${fmt(p.data)}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('rowCount').textContent = `${sorted.length} registro(s)`;

  if (window._colResizer) window._colResizer.destroy();
  window._colResizer = new ColumnResizer(document.getElementById('produtosTable'), {
    storageKey: 'cyberpdv_produtos_cols',
    minWidth: 40,
    padding: 16
  });
}

function novoProduto() {
  document.getElementById('modalTitle').textContent = 'Novo Produto';
  document.getElementById('prodSkuHidden').value = '';
  document.getElementById('prodSku').value = '';
  document.getElementById('prodSku').readOnly = false;
  document.getElementById('produtoForm').reset();
  document.getElementById('prodTipo').value = 'PROD';
  document.getElementById('prodPreco').value = 0;
  document.getElementById('prodStock').value = 1;
  document.getElementById('prodP').value = 0;
  document.getElementById('prodA').value = 0;
  document.getElementById('prodL').value = 0;
  document.getElementById('prodT').value = 0;
  document.getElementById('modalProduto').style.display = 'flex';
}

async function editarProduto(sku) {
  const res = await fetch(`${API}/produtos/${sku}`);
  const p = await res.json();
  document.getElementById('modalTitle').textContent = 'Editar: SKU ' + p.sku + (p.nome_completo ? ' - ' + p.nome_completo.substring(0, 40) : '');
  document.getElementById('prodSkuHidden').value = p.sku;
  document.getElementById('prodSku').value = p.sku;
  document.getElementById('prodSku').readOnly = true;
  document.getElementById('prodNome').value = p.nome_completo || '';
  document.getElementById('prodTipo').value = p.tipo || 'PROD';
  document.getElementById('prodCategoria').value = p.categoria || '';
  document.getElementById('prodSubcat').value = p.sub_categoria || '';
  document.getElementById('prodMarca').value = p.marca || '';
  document.getElementById('prodModelo').value = p.modelo || '';
  document.getElementById('prodPreco').value = p.preco || 0;
  document.getElementById('prodStock').value = p.stock || 0;
  document.getElementById('prodP').value = p.p || 0;
  document.getElementById('prodA').value = p.a || 0;
  document.getElementById('prodL').value = p.l || 0;
  document.getElementById('prodT').value = p.t || 0;
  document.getElementById('prodObs').value = p.obs || '';
  document.getElementById('prodImg').value = p.img || '';
  document.getElementById('prodFunc').value = p.func || '';
  document.getElementById('prodData').value = p.data || '';
  document.getElementById('modalProduto').style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modalProduto').style.display = 'none';
}

document.getElementById('produtoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const skuHidden = document.getElementById('prodSkuHidden').value;
  const sku = document.getElementById('prodSku').value;

  const data = {
    sku: parseInt(sku) || 0,
    nome_completo: document.getElementById('prodNome').value,
    tipo: document.getElementById('prodTipo').value,
    categoria: document.getElementById('prodCategoria').value,
    sub_categoria: document.getElementById('prodSubcat').value,
    marca: document.getElementById('prodMarca').value,
    modelo: document.getElementById('prodModelo').value,
    preco: parseFloat(document.getElementById('prodPreco').value) || 0,
    stock: parseInt(document.getElementById('prodStock').value) || 0,
    p: parseFloat(document.getElementById('prodP').value) || 0,
    a: parseFloat(document.getElementById('prodA').value) || 0,
    l: parseFloat(document.getElementById('prodL').value) || 0,
    t: parseFloat(document.getElementById('prodT').value) || 0,
    obs: document.getElementById('prodObs').value,
    img: document.getElementById('prodImg').value,
    func: document.getElementById('prodFunc').value,
    data: document.getElementById('prodData').value
  };

  const method = skuHidden ? 'PUT' : 'POST';
  const url = skuHidden ? `${API}/produtos/${skuHidden}` : `${API}/produtos`;

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      fecharModal();
      produtosAll = [];
      fuseProd = null;
      carregarProdutos();
    } else {
      alert('Erro: ' + result.error);
    }
  } catch (err) {
    alert('Erro ao salvar produto');
  }
});

async function excluirProduto(sku) {
  if (!confirm('Excluir este produto?')) return;
  try {
    await fetch(`${API}/produtos/${sku}`, { method: 'DELETE' });
    produtosAll = [];
    fuseProd = null;
    carregarProdutos();
  } catch (err) {
    alert('Erro ao excluir');
  }
}

async function importarDb() {
  if (!confirm('Importar/atualizar produtos do db.xlsx?')) return;
  try {
    const res = await fetch(`${API}/importar-db`);
    const data = await res.json();
    if (data.success) {
      alert(`${data.imported} produtos importados/atualizados!`);
      await carregarCategorias();
      carregarProdutos();
    } else {
      alert('Erro: ' + data.error);
    }
  } catch (err) {
    alert('Erro ao importar');
  }
}

function toggleUsuarios() {
  const modal = document.getElementById('modalUsuarios');
  if (modal.style.display === 'flex') { modal.style.display = 'none'; return; }
  modal.style.display = 'flex';
  carregarUsuarios();
}

function fecharModalUsuarios() {
  document.getElementById('modalUsuarios').style.display = 'none';
}

async function carregarUsuarios() {
  const res = await fetch(`${API}/auth/usuarios`);
  const users = await res.json();
  const list = document.getElementById('usuariosList');
  list.innerHTML = '<h4>Usuários Cadastrados</h4>';
  users.forEach(u => {
    const div = document.createElement('div');
    div.className = 'usuario-item';
    div.innerHTML = `<span><strong>${u.username}</strong> (${u.level})</span>
      <button class="btn btn-sm btn-danger" onclick="excluirUsuario(${u.id})">Excluir</button>`;
    list.appendChild(div);
  });
}

async function excluirUsuario(id) {
  if (!confirm('Excluir este usuário?')) return;
  await fetch(`${API}/auth/usuarios/${id}`, { method: 'DELETE' });
  carregarUsuarios();
}

document.getElementById('usuarioForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    username: document.getElementById('newUsername').value,
    password: document.getElementById('newPassword').value,
    level: document.getElementById('newLevel').value
  };
  const res = await fetch(`${API}/auth/usuarios`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  const result = await res.json();
  if (result.success) {
    alert('Usuário criado!');
    document.getElementById('usuarioForm').reset();
    carregarUsuarios();
  } else alert('Erro: ' + result.error);
});

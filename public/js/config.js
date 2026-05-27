var API = '/api';
var currentConfig = {};

function getUser() {
  var u = sessionStorage.getItem('user');
  if (!u) { window.location.href = '/'; return null; }
  return JSON.parse(u);
}

function logout() {
  sessionStorage.clear();
  window.location.href = '/';
}

document.addEventListener('DOMContentLoaded', function () {
  var user = getUser();
  if (!user) return;
  document.getElementById('userDisplay').textContent = '\u{1F464} ' + user.username + ' (' + user.level + ')';
  var info = document.getElementById('accountUserInfo');
  if (info) info.textContent = user.username + ' — Nivel: ' + user.level;
  applyTranslations();
  loadConfig();
});

function switchSection(id) {
  document.querySelectorAll('.config-section').forEach(function (s) { s.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function (n) { n.classList.remove('active'); });
  document.getElementById('section-' + id).classList.add('active');
  document.querySelector('.nav-item[data-section="' + id + '"]').classList.add('active');
}

function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(function () { t.classList.remove('show'); }, 3000);
}

function markDirty() {}

function selectTheme(value) {
  document.querySelectorAll('.theme-card').forEach(function (c) { c.classList.remove('active'); });
  document.querySelector('.theme-card[data-theme-value="' + value + '"]').classList.add('active');
  currentConfig.theme = value;
  setTheme(value);
}

function selectLanguage(value) {
  currentConfig.language = value;
  setLanguage(value);
}

function applyFontPreview() {
  var family = document.getElementById('configFontFamily').value;
  var size = document.getElementById('configFontSize').value;
  document.getElementById('fontPreview').style.fontFamily = family;
  document.getElementById('fontPreview').style.fontSize = size + 'px';
  currentConfig.font_family = family;
  currentConfig.font_size = parseInt(size);
  document.documentElement.style.setProperty('--font-family', family);
  document.body.style.fontSize = size + 'px';
  try { localStorage.setItem('cyberpdv_font_family', family); } catch (_) {}
  try { localStorage.setItem('cyberpdv_font_size', size); } catch (_) {}
}

function uploadFile(type, input) {
  var file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast('Arquivo muito grande. Max 2MB.', 'error');
    return;
  }
  var reader = new FileReader();
  reader.onload = function (e) {
    var base64 = e.target.result.split(',')[1];
    fetch(API + '/config/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type, data: base64 })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.success) {
        showToast( __('upload_success'), 'success');
        if (type === 'logo') {
          document.getElementById('logoPreview').src = data.data.url;
          document.getElementById('logoPreview').classList.add('show');
          document.getElementById('logoRemoveBtn').style.display = 'inline-block';
          currentConfig.system = currentConfig.system || {};
          currentConfig.system.logo_path = data.data.url;
        } else if (type === 'favicon') {
          document.getElementById('faviconPreview').src = data.data.url;
          document.getElementById('faviconPreview').classList.add('show');
          document.getElementById('faviconRemoveBtn').style.display = 'inline-block';
          document.getElementById('dynamicFavicon').href = data.data.url;
          currentConfig.system = currentConfig.system || {};
          currentConfig.system.favicon_path = data.data.url;
        }
      } else {
        showToast(data.error || __('error'), 'error');
      }
    })
    .catch(function () { showToast(__('error_connection'), 'error'); });
  };
  reader.readAsDataURL(file);
}

function removeFile(type) {
  if (!confirm(__('confirm_delete'))) return;
  fetch(API + '/config/upload', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: type })
  })
  .then(function (r) { return r.json(); })
  .then(function (data) {
    if (data.success) {
      showToast(__('delete_success'), 'success');
      if (type === 'logo') {
        document.getElementById('logoPreview').classList.remove('show');
        document.getElementById('logoPreview').src = '';
        document.getElementById('logoRemoveBtn').style.display = 'none';
        document.getElementById('logoUpload').value = '';
        currentConfig.system = currentConfig.system || {};
        currentConfig.system.logo_path = '';
      } else if (type === 'favicon') {
        document.getElementById('faviconPreview').classList.remove('show');
        document.getElementById('faviconPreview').src = '';
        document.getElementById('faviconRemoveBtn').style.display = 'none';
        document.getElementById('faviconUpload').value = '';
        document.getElementById('dynamicFavicon').href = '/favicon.ico';
        currentConfig.system = currentConfig.system || {};
        currentConfig.system.favicon_path = '';
      }
    } else {
      showToast(data.error || __('error'), 'error');
    }
  })
  .catch(function () { showToast(__('error_connection'), 'error'); });
}

function loadConfig() {
  fetch(API + '/config')
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (!res.success) { showToast(res.error, 'error'); return; }
      currentConfig = res.data;
      applyConfigToUI(res.data);
    })
  .catch(function () { showToast(__('error_connection'), 'error'); });
}

function alterarSenha(e) {
  e.preventDefault();
  var msg = document.getElementById('accountMsg');
  msg.className = '';
  msg.textContent = '';

  var user = getUser();
  var currentPassword = document.getElementById('currentPassword').value;
  var newPassword = document.getElementById('newPassword').value;
  var confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    msg.style.color = 'var(--text-error)';
    msg.textContent = 'Nova senha e confirmacao nao conferem';
    return false;
  }

  if (newPassword.length < 4) {
    msg.style.color = 'var(--text-error)';
    msg.textContent = 'Senha deve ter no minimo 4 caracteres';
    return false;
  }

  fetch(API + '/auth/perfil', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: user.id, currentPassword: currentPassword, newPassword: newPassword })
  })
  .then(function (r) { return r.json(); })
  .then(function (data) {
    if (data.success) {
      msg.style.color = 'var(--text-success)';
      msg.textContent = 'Senha alterada com sucesso!';
      document.getElementById('accountForm').reset();
    } else {
      msg.style.color = 'var(--text-error)';
      msg.textContent = data.error || 'Erro ao alterar senha';
    }
  })
  .catch(function () {
    msg.style.color = 'var(--text-error)';
    msg.textContent = 'Erro de conexao';
  });

  return false;
}

function applyConfigToUI(cfg) {
  var theme = cfg.theme || 'system';
  document.querySelectorAll('.theme-card').forEach(function (c) { c.classList.remove('active'); });
  var activeCard = document.querySelector('.theme-card[data-theme-value="' + theme + '"]');
  if (activeCard) activeCard.classList.add('active');

  document.getElementById('configLang').value = cfg.language || 'pt-BR';
  setLanguage(cfg.language || 'pt-BR');

  var ff = cfg.font_family || 'system-ui, -apple-system, sans-serif';
  var fs = cfg.font_size || 14;
  document.getElementById('configFontFamily').value = ff;
  document.getElementById('configFontSize').value = String(fs);
  document.getElementById('fontPreview').style.fontFamily = ff;
  document.getElementById('fontPreview').style.fontSize = fs + 'px';
  document.documentElement.style.setProperty('--font-family', ff);
  document.body.style.fontSize = fs + 'px';

  if (cfg.coupon) {
    document.getElementById('couponShowHeader').checked = cfg.coupon.show_header !== false;
    document.getElementById('couponHeaderText').value = cfg.coupon.header_text || '';
    document.getElementById('couponShowLogo').checked = cfg.coupon.show_logo === true;
    document.getElementById('couponFooterText').value = cfg.coupon.footer_text || '';
  }

  if (cfg.system) {
    document.getElementById('systemStoreName').value = cfg.system.store_name || '';
    if (cfg.system.logo_path) {
      document.getElementById('logoPreview').src = cfg.system.logo_path;
      document.getElementById('logoPreview').classList.add('show');
      document.getElementById('logoRemoveBtn').style.display = 'inline-block';
    }
    if (cfg.system.favicon_path) {
      document.getElementById('faviconPreview').src = cfg.system.favicon_path;
      document.getElementById('faviconPreview').classList.add('show');
      document.getElementById('faviconRemoveBtn').style.display = 'inline-block';
      document.getElementById('dynamicFavicon').href = cfg.system.favicon_path;
    }
  }
}

function saveConfig() {
  var data = {
    theme: currentConfig.theme || 'system',
    language: document.getElementById('configLang').value,
    font_family: document.getElementById('configFontFamily').value,
    font_size: parseInt(document.getElementById('configFontSize').value) || 14,
    coupon: {
      show_header: document.getElementById('couponShowHeader').checked,
      header_text: document.getElementById('couponHeaderText').value,
      show_logo: document.getElementById('couponShowLogo').checked,
      footer_text: document.getElementById('couponFooterText').value
    },
    system: {
      store_name: document.getElementById('systemStoreName').value,
      logo_path: (currentConfig.system && currentConfig.system.logo_path) || '',
      favicon_path: (currentConfig.system && currentConfig.system.favicon_path) || ''
    }
  };

  fetch(API + '/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(function (r) { return r.json(); })
  .then(function (res) {
    if (res.success) {
      showToast(__('saved'), 'success');
      currentConfig = res.data;
    } else {
      showToast(res.error || __('error'), 'error');
    }
  })
  .catch(function () { showToast(__('error_connection'), 'error'); });
}

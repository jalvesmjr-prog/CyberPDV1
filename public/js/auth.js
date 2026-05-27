const API = '/api';

function logSystemEvent(level, message, context) {
  try {
    navigator.sendBeacon(API + '/system/log', JSON.stringify({
      level: level || 'info', type: 'frontend', message: message,
      context: context || {}, page: window.location.pathname, action: 'user_action',
      url: window.location.href
    }));
  } catch (_) {}
}

window.onerror = function (msg, source, line, col, error) {
  logSystemEvent('error', msg, { source: source, line: line, col: col, stack: error ? error.stack : '' });
};

window.addEventListener('unhandledrejection', function (e) {
  logSystemEvent('error', 'Promise rejection: ' + (e.reason ? e.reason.message || e.reason : 'unknown'), {});
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('loginError');

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      logSystemEvent('info', 'Login bem sucedido', { username: username, level: data.user.level });
      sessionStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/vendas.html';
    } else {
      logSystemEvent('warn', 'Falha de login', { username: username, error: data.error });
      errorDiv.textContent = data.error;
    }
  } catch (err) {
    logSystemEvent('error', 'Erro de conexao no login', { username: username, error: err.message });
    errorDiv.textContent = 'Erro de conexão com o servidor';
  }
});

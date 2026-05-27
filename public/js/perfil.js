document.addEventListener('DOMContentLoaded', function() {
  var user = checkAuth();
  if (!user) return;
  displayUserInfo(user);
  document.getElementById('passwordForm')?.addEventListener('submit', changePassword);
});

function displayUserInfo(user) {
  var el = document.getElementById('userInfoDisplay');
  if (el) {
    el.innerHTML = '<p><strong>Usuário:</strong> ' + (user.username || '') + '</p><p><strong>Nível:</strong> ' + (user.level || '') + '</p>';
  }
}

function changePassword(e) {
  e.preventDefault();
  var current = document.getElementById('currentPassword')?.value || '';
  var newPass = document.getElementById('newPassword')?.value || '';
  var confirm = document.getElementById('confirmPassword')?.value || '';
  var errorEl = document.getElementById('passwordError');
  if (newPass.length < 4) { if (errorEl) errorEl.textContent = 'Nova senha deve ter no mínimo 4 caracteres.'; return; }
  if (newPass !== confirm) { if (errorEl) errorEl.textContent = 'Nova senha e confirmação não conferem.'; return; }
  var user = getUser();
  if (!user) return;
  api('/api/auth/profile', { method: 'PUT', body: JSON.stringify({ id: user.id, currentPassword: current, newPassword: newPass }) }).then(function(data) {
    if (data.error) { if (errorEl) errorEl.textContent = data.error; return; }
    alert('Senha alterada com sucesso!');
    document.getElementById('passwordForm')?.reset();
    if (errorEl) errorEl.textContent = '';
  });
}

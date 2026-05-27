function getTheme() {
  try { return localStorage.getItem('cyberpdv_theme') || 'system'; } catch (_) { return 'system'; }
}

function setTheme(theme) {
  try { localStorage.setItem('cyberpdv_theme', theme); } catch (_) {}
  applyTheme(theme);
}

function applyTheme(theme) {
  var root = document.documentElement;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else if (theme === 'light') {
    root.removeAttribute('data-theme');
    root.style.colorScheme = 'light';
  } else {
    var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) {
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.removeAttribute('data-theme');
      root.style.colorScheme = 'light';
    }
  }
}

(function () {
  try {
    var stored = localStorage.getItem('cyberpdv_theme');
    var theme = stored === 'dark' || stored === 'light' ? stored : 'system';
    var root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else if (theme === 'light') {
      root.removeAttribute('data-theme');
      root.style.colorScheme = 'light';
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.setAttribute('data-theme', 'dark');
        root.style.colorScheme = 'dark';
      }
    }
  } catch (_) {}
})();

(function () {
  const key = 'nimble-theme';
  const root = document.documentElement;
  const saved = localStorage.getItem(key);
  const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

  function apply(theme) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const isLight = theme === 'light';
      button.setAttribute('aria-label', `Switch to ${isLight ? 'dark' : 'light'} mode`);
      button.setAttribute('title', `Switch to ${isLight ? 'dark' : 'light'} mode`);
      const icon = button.querySelector('.theme-toggle__icon');
      const label = button.querySelector('.theme-toggle__label');
      if (icon) icon.textContent = isLight ? '☀' : '☾';
      if (label) label.textContent = isLight ? 'Light' : 'Dark';
    });
  }

  function syncRangeFill(input) {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value);
    const progress = max === min ? 0 : ((value - min) / (max - min)) * 100;
    input.style.setProperty('--range-progress', `${Math.max(0, Math.min(100, progress))}%`);
  }

  window.syncNimbleRangeFill = syncRangeFill;

  apply(saved === 'light' || saved === 'dark' ? saved : preferred);

  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.querySelectorAll('input[type="range"]').forEach(syncRangeFill);
    document.addEventListener('input', (event) => {
      if (event.target.matches('input[type="range"]')) syncRangeFill(event.target);
    });
    document.addEventListener('change', (event) => {
      if (event.target.matches('input[type="range"]')) syncRangeFill(event.target);
    });
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const next = root.dataset.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem(key, next);
        apply(next);
      });
    });
  });
})();

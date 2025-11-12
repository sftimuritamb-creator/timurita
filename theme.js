// /timurita/theme.js
import { setSetting, getSetting } from '/timurita/db.js';

export async function initTheme() {
  const themeBtn = document.getElementById('themeBtn');
  const applyTheme = (name) => {
    document.documentElement.setAttribute('data-theme', name);
    if (themeBtn) themeBtn.textContent = name === 'dark' ? '☀️ Šviesus' : '🌙 Tamsus';
  };

  const saved = await getSetting('theme');
  const initial = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(initial);

  if (themeBtn) {
    themeBtn.addEventListener('click', async () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      await setSetting('theme', next);
    });
  }
}

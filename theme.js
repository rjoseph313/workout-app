// Theme toggle button logic.
// The *initial* theme is already applied by the inline script in <head>
// (before first paint, to avoid a flash of the wrong theme) — this file only
// wires up the button to flip it and persist the choice.

const themeToggleBtn = document.getElementById('theme-toggle');

function updateToggleIcon(theme) {
  themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

updateToggleIcon(document.documentElement.getAttribute('data-theme'));

themeToggleBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateToggleIcon(next);
});

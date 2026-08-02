// Generic tab-switching for the four top-level views (Log/History/Progress/
// Profile). This file only decides which .tab-panel is visible — it knows
// nothing about what's inside them. Each panel's own file (workouts.js for
// Log, history.js, progress.js, profile.js) listens for the 'tab-change'
// event this dispatches and loads/renders its own data only when its tab
// becomes active.

const navTabs = document.getElementById('nav-tabs');
const tabButtons = document.querySelectorAll('.nav-tab');
const tabPanels = document.querySelectorAll('.tab-panel');

function showTab(tabName) {
  tabPanels.forEach((panel) => {
    panel.classList.toggle('hidden', panel.id !== `${tabName}-panel`);
  });
  tabButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.dispatchEvent(new CustomEvent('tab-change', { detail: { tab: tabName } }));
}

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

// auth.js dispatches this — the tab bar itself only makes sense when logged
// in (every tab needs a user's data), so it's gated the same way the Log
// view's own content already is.
document.addEventListener('auth-change', (event) => {
  const { session } = event.detail;
  if (session) {
    navTabs.classList.remove('hidden');
    showTab('log');
  } else {
    navTabs.classList.add('hidden');
  }
});

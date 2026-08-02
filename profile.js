// Profile tab — account info (email, created_at from the session, a total
// workout count) plus a default-unit preference. The preference is a UI
// setting, not data that needs to sync across devices, so it's stored in
// localStorage rather than the workouts table.

const UNIT_PREF_KEY = 'workout-app:preferred-unit';

function getPreferredUnit() {
  return localStorage.getItem(UNIT_PREF_KEY) || 'lbs';
}

function setPreferredUnit(unit) {
  localStorage.setItem(UNIT_PREF_KEY, unit);
  const unitSelect = document.getElementById('exercise-unit');
  if (unitSelect) {
    unitSelect.value = unit;
  }
}

// Pre-fill the Add Workout form's unit dropdown right away — this doesn't
// depend on auth state or which tab is active, it's just applying a stored
// default. Queries the DOM directly rather than sharing workouts.js's
// `exerciseUnitSelect` constant, so this doesn't depend on script load order.
const initialUnitSelect = document.getElementById('exercise-unit');
if (initialUnitSelect) {
  initialUnitSelect.value = getPreferredUnit();
}

const profileEmailEl = document.getElementById('profile-email');
const profileCreatedEl = document.getElementById('profile-created');
const profileCountEl = document.getElementById('profile-count');
const profileUnitSelect = document.getElementById('profile-unit-pref');

let currentSession = null;

async function loadProfile() {
  if (!currentSession) {
    return;
  }

  profileEmailEl.textContent = currentSession.user.email;

  const created = new Date(currentSession.user.created_at);
  profileCreatedEl.textContent = created.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  profileUnitSelect.value = getPreferredUnit();

  const { count, error } = await supabaseClient
    .from('workouts')
    .select('*', { count: 'exact', head: true });

  profileCountEl.textContent = error ? '—' : String(count);
}

profileUnitSelect.addEventListener('change', () => {
  setPreferredUnit(profileUnitSelect.value);
});

// auth.js dispatches this — tracked here (separately from workouts.js's own
// currentUserId) because the Profile tab needs the full session, not just
// the user id, for email and created_at.
document.addEventListener('auth-change', (event) => {
  currentSession = event.detail.session;
});

document.addEventListener('tab-change', (event) => {
  if (event.detail.tab === 'profile') {
    loadProfile();
  }
});

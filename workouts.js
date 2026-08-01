// Workout-logging UI logic — add a workout, list past workouts.
// Relies on `supabaseClient` from supabaseClient.js (must load first) and
// reacts to the 'auth-change' event dispatched by auth.js.

const workoutFormCard = document.getElementById('workout-form-card');
const exerciseNameInput = document.getElementById('exercise-name');
const exerciseSetsInput = document.getElementById('exercise-sets');
const exerciseRepsInput = document.getElementById('exercise-reps');
const exerciseWeightInput = document.getElementById('exercise-weight');
const exerciseUnitSelect = document.getElementById('exercise-unit');
const addWorkoutBtn = document.getElementById('add-workout-btn');
const workoutList = document.getElementById('workout-list');
const workoutErrorEl = document.getElementById('workout-error');

// user_id has no DB default, so it must be supplied on every insert —
// tracked here from the session the 'auth-change' event hands us.
let currentUserId = null;

// Named distinctly from auth.js's showError/clearError — both files load as
// plain <script> tags sharing one global scope, so identically-named top-level
// functions here would silently overwrite auth.js's (last script loaded wins),
// which is exactly what caused auth error messages to render into this file's
// hidden #workout-error instead of #auth-error.
function showWorkoutError(message) {
  workoutErrorEl.textContent = message;
}

function clearWorkoutError() {
  workoutErrorEl.textContent = '';
}

function clearForm() {
  exerciseNameInput.value = '';
  exerciseSetsInput.value = '';
  exerciseRepsInput.value = '';
  exerciseWeightInput.value = '';
  exerciseUnitSelect.value = 'lbs';
}

// Exercise name -> canonical icon key. Several common spellings/phrasings map
// to the same icon. Self-contained inline SVGs — no network request, so there's
// nothing to break or attribute, and they inherit currentColor for free theming.
const EXERCISE_ICON_ALIASES = {
  'bench press': 'bench-press',
  'barbell bench press': 'bench-press',
  'incline bench press': 'bench-press',
  squat: 'squat',
  'back squat': 'squat',
  'front squat': 'squat',
  deadlift: 'deadlift',
  'romanian deadlift': 'deadlift',
  'push up': 'push-up',
  'push-up': 'push-up',
  'push ups': 'push-up',
  pushups: 'push-up',
  'pull up': 'pull-up',
  'pull-up': 'pull-up',
  'pull ups': 'pull-up',
  pullups: 'pull-up',
};

const EXERCISE_ICONS = {
  'bench-press': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <line x1="2" y1="9" x2="22" y2="9" />
    <rect x="3" y="6" width="3" height="6" rx="1" />
    <rect x="18" y="6" width="3" height="6" rx="1" />
    <rect x="7" y="15" width="10" height="3" rx="1" />
    <line x1="9" y1="18" x2="9" y2="21" />
    <line x1="15" y1="18" x2="15" y2="21" />
  </svg>`,
  squat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="4" r="2" />
    <line x1="12" y1="6" x2="12" y2="12" />
    <line x1="6" y1="9" x2="18" y2="9" />
    <rect x="4.5" y="7.5" width="2.5" height="3" rx="0.8" />
    <rect x="17" y="7.5" width="2.5" height="3" rx="0.8" />
    <line x1="12" y1="12" x2="8" y2="16" />
    <line x1="8" y1="16" x2="8" y2="21" />
    <line x1="12" y1="12" x2="16" y2="16" />
    <line x1="16" y1="16" x2="16" y2="21" />
  </svg>`,
  'bicep-curl': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="4" r="2" />
    <line x1="12" y1="6" x2="12" y2="15" />
    <line x1="12" y1="15" x2="9" y2="21" />
    <line x1="12" y1="15" x2="15" y2="21" />
    <line x1="12" y1="8" x2="15" y2="13" />
    <line x1="12" y1="8" x2="8" y2="12" />
    <line x1="8" y1="12" x2="9" y2="7" />
    <circle cx="9" cy="6" r="1.6" />
  </svg>`,
  deadlift: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="7" cy="5" r="2" />
    <line x1="8" y1="7" x2="14" y2="14" />
    <line x1="14" y1="14" x2="13" y2="20" />
    <line x1="4" y1="18" x2="22" y2="18" />
    <circle cx="5" cy="18" r="2" />
    <circle cx="21" cy="18" r="2" />
    <line x1="14" y1="14" x2="18" y2="18" />
  </svg>`,
  'push-up': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="4" cy="10" r="2" />
    <line x1="6" y1="11" x2="20" y2="16" />
    <line x1="9" y1="12" x2="7" y2="18" />
    <line x1="9" y1="12" x2="9" y2="17" />
    <line x1="15" y1="14" x2="14" y2="19" />
  </svg>`,
  'pull-up': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <line x1="4" y1="4" x2="20" y2="4" />
    <line x1="8" y1="4" x2="8" y2="7" />
    <line x1="16" y1="4" x2="16" y2="7" />
    <circle cx="12" cy="10" r="2" />
    <line x1="12" y1="12" x2="12" y2="18" />
    <line x1="12" y1="14" x2="9" y2="17" />
    <line x1="12" y1="14" x2="15" y2="17" />
  </svg>`,
};

// Generic dumbbell — anything not in EXERCISE_ICON_ALIASES falls back to this.
const DEFAULT_EXERCISE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <line x1="7" y1="12" x2="17" y2="12" />
  <rect x="3" y="9" width="4" height="6" rx="1.5" />
  <rect x="17" y="9" width="4" height="6" rx="1.5" />
</svg>`;

// Fallback for names not worth listing individually in EXERCISE_ICON_ALIASES —
// matched by substring, in order, after an exact-alias lookup misses (so
// "squats", "hammer curl", "preacher curl", etc. all resolve without needing
// their own alias entry).
const EXERCISE_ICON_KEYWORDS = [
  ['squat', 'squat'],
  ['curl', 'bicep-curl'],
];

function getExerciseIcon(exerciseName) {
  const key = exerciseName.trim().toLowerCase();

  const canonical = EXERCISE_ICON_ALIASES[key];
  if (canonical && EXERCISE_ICONS[canonical]) {
    return EXERCISE_ICONS[canonical];
  }

  for (const [keyword, canonicalKey] of EXERCISE_ICON_KEYWORDS) {
    if (key.includes(keyword)) {
      return EXERCISE_ICONS[canonicalKey];
    }
  }

  return DEFAULT_EXERCISE_ICON;
}

function groupByExercise(workouts) {
  const groups = new Map();
  for (const workout of workouts) {
    if (!groups.has(workout.exercise_name)) {
      groups.set(workout.exercise_name, []);
    }
    groups.get(workout.exercise_name).push(workout);
  }
  return groups;
}

async function deleteExercise(exerciseName, button) {
  const confirmed = window.confirm(
    `Delete all logged sets for ${exerciseName}? This cannot be undone.`
  );
  if (!confirmed) {
    return;
  }

  clearWorkoutError();
  button.disabled = true;

  const { error } = await supabaseClient
    .from('workouts')
    .delete()
    .eq('exercise_name', exerciseName);

  if (error) {
    showWorkoutError(error.message);
    button.disabled = false;
    return;
  }

  loadWorkouts();
}

async function getTips(exerciseName, entries, button, tipEl) {
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Thinking…';
  tipEl.classList.add('hidden');
  tipEl.textContent = '';

  try {
    const res = await fetch('/api/get-tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exercise_name: exerciseName,
        entries: entries.slice(0, 5).map((entry) => ({
          sets: entry.sets,
          reps: entry.reps,
          weight: entry.weight,
          weight_unit: entry.weight_unit,
          created_at: entry.created_at,
        })),
      }),
    });

    const data = await res.json();
    tipEl.textContent = res.ok ? data.tip : data.error || 'Could not get tips right now.';
  } catch (err) {
    tipEl.textContent = 'Could not reach the tips service.';
  }

  tipEl.classList.remove('hidden');
  button.disabled = false;
  button.textContent = originalLabel;
}

function renderWorkouts(workouts) {
  workoutList.innerHTML = '';

  for (const [exerciseName, entries] of groupByExercise(workouts)) {
    const group = document.createElement('li');
    group.className = 'exercise-group';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-exercise-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', `Delete all logged sets for ${exerciseName}`);

    const title = document.createElement('div');
    title.className = 'exercise-group-title';

    const icon = document.createElement('div');
    icon.className = 'exercise-group-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = getExerciseIcon(exerciseName);

    const name = document.createElement('h3');
    name.className = 'exercise-group-name';
    name.textContent = exerciseName;

    title.append(icon, name);

    const tipsBtn = document.createElement('button');
    tipsBtn.type = 'button';
    tipsBtn.className = 'get-tips-btn';
    tipsBtn.textContent = 'Get Tips';

    const sublist = document.createElement('ul');
    sublist.className = 'workout-sublist';
    for (const entry of entries) {
      const li = document.createElement('li');
      li.className = 'workout-item';

      const meta = document.createElement('span');
      meta.className = 'workout-item-meta';
      meta.textContent = entry.weight
        ? `${entry.sets}x${entry.reps} @ ${entry.weight}${entry.weight_unit || 'lbs'}`
        : `${entry.sets}x${entry.reps}`;

      li.append(meta);
      sublist.append(li);
    }

    const tipText = document.createElement('p');
    tipText.className = 'tip-text hidden';

    tipsBtn.addEventListener('click', () => getTips(exerciseName, entries, tipsBtn, tipText));
    deleteBtn.addEventListener('click', () => deleteExercise(exerciseName, deleteBtn));

    group.append(title, sublist, tipsBtn, tipText, deleteBtn);
    workoutList.append(group);
  }
}

async function loadWorkouts() {
  const { data, error } = await supabaseClient
    .from('workouts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showWorkoutError(error.message);
    return;
  }
  renderWorkouts(data);
}

async function addWorkout() {
  clearWorkoutError();

  const exercise_name = exerciseNameInput.value.trim();
  const sets = Number(exerciseSetsInput.value);
  const reps = Number(exerciseRepsInput.value);
  const weight = exerciseWeightInput.value ? Number(exerciseWeightInput.value) : null;
  const weight_unit = exerciseUnitSelect.value;

  if (!exercise_name || !sets || !reps) {
    showWorkoutError('Fill in exercise, sets, and reps.');
    return;
  }

  const { error } = await supabaseClient
    .from('workouts')
    .insert({ user_id: currentUserId, exercise_name, sets, reps, weight, weight_unit });

  if (error) {
    showWorkoutError(error.message);
    return;
  }

  clearForm();
  loadWorkouts();
}

addWorkoutBtn.addEventListener('click', addWorkout);

// auth.js dispatches this after checking for an existing session on load and
// on every sign-in/sign-out/token-refresh — keeps the section in sync with auth state.
document.addEventListener('auth-change', (event) => {
  const { session } = event.detail;
  currentUserId = session ? session.user.id : null;
  if (session) {
    workoutFormCard.classList.remove('hidden');
    workoutList.classList.remove('hidden');
    loadWorkouts();
  } else {
    workoutFormCard.classList.add('hidden');
    workoutList.classList.add('hidden');
    workoutList.innerHTML = '';
    clearWorkoutError();
  }
});

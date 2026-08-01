// Workout-logging UI logic — add a workout, list past workouts.
// Relies on `supabaseClient` from supabaseClient.js (must load first) and
// reacts to the 'auth-change' event dispatched by auth.js.

const workoutsSection = document.getElementById('workouts-section');
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

function showError(message) {
  workoutErrorEl.textContent = message;
}

function clearError() {
  workoutErrorEl.textContent = '';
}

function clearForm() {
  exerciseNameInput.value = '';
  exerciseSetsInput.value = '';
  exerciseRepsInput.value = '';
  exerciseWeightInput.value = '';
  exerciseUnitSelect.value = 'lbs';
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

  clearError();
  button.disabled = true;

  const { error } = await supabaseClient
    .from('workouts')
    .delete()
    .eq('exercise_name', exerciseName);

  if (error) {
    showError(error.message);
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

    const header = document.createElement('div');
    header.className = 'exercise-group-header';

    const name = document.createElement('h3');
    name.className = 'exercise-group-name';
    name.textContent = exerciseName;

    const actions = document.createElement('div');
    actions.className = 'exercise-group-actions';

    const tipsBtn = document.createElement('button');
    tipsBtn.type = 'button';
    tipsBtn.className = 'get-tips-btn';
    tipsBtn.textContent = 'Get Tips';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-exercise-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', `Delete all logged sets for ${exerciseName}`);

    actions.append(tipsBtn, deleteBtn);
    header.append(name, actions);

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

    group.append(header, sublist, tipText);
    workoutList.append(group);
  }
}

async function loadWorkouts() {
  const { data, error } = await supabaseClient
    .from('workouts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showError(error.message);
    return;
  }
  renderWorkouts(data);
}

async function addWorkout() {
  clearError();

  const exercise_name = exerciseNameInput.value.trim();
  const sets = Number(exerciseSetsInput.value);
  const reps = Number(exerciseRepsInput.value);
  const weight = exerciseWeightInput.value ? Number(exerciseWeightInput.value) : null;
  const weight_unit = exerciseUnitSelect.value;

  if (!exercise_name || !sets || !reps) {
    showError('Fill in exercise, sets, and reps.');
    return;
  }

  const { error } = await supabaseClient
    .from('workouts')
    .insert({ user_id: currentUserId, exercise_name, sets, reps, weight, weight_unit });

  if (error) {
    showError(error.message);
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
    workoutsSection.classList.remove('hidden');
    loadWorkouts();
  } else {
    workoutsSection.classList.add('hidden');
    workoutList.innerHTML = '';
    clearError();
  }
});

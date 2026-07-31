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

function renderWorkouts(workouts) {
  workoutList.innerHTML = '';
  for (const workout of workouts) {
    const li = document.createElement('li');
    li.className = 'workout-item';

    const name = document.createElement('span');
    name.className = 'workout-item-name';
    name.textContent = workout.exercise_name;

    const meta = document.createElement('span');
    meta.className = 'workout-item-meta';
    meta.textContent = workout.weight
      ? `${workout.sets}x${workout.reps} @ ${workout.weight}${workout.weight_unit || 'lbs'}`
      : `${workout.sets}x${workout.reps}`;

    li.append(name, meta);
    workoutList.append(li);
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

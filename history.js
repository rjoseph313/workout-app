// History tab — a flat, chronological (most-recent-first) list of every
// logged set, with an exercise-name filter. Unlike workouts.js's Log view,
// this deliberately does NOT group by exercise.

const historyFilterSelect = document.getElementById('history-filter');
const historyList = document.getElementById('history-list');
const historyErrorEl = document.getElementById('history-error');

let historyWorkouts = [];

function renderHistoryList() {
  const filter = historyFilterSelect.value;
  historyList.innerHTML = '';

  const filtered = filter ? historyWorkouts.filter((w) => w.exercise_name === filter) : historyWorkouts;

  for (const workout of filtered) {
    const li = document.createElement('li');
    li.className = 'history-item';

    const name = document.createElement('span');
    name.className = 'history-item-name';
    name.textContent = workout.exercise_name;

    const dateStr = new Date(workout.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const meta = document.createElement('span');
    meta.className = 'history-item-meta';
    meta.textContent = workout.weight
      ? `${workout.sets}x${workout.reps} @ ${workout.weight}${workout.weight_unit || 'lbs'} — ${dateStr}`
      : `${workout.sets}x${workout.reps} — ${dateStr}`;

    li.append(name, meta);
    historyList.append(li);
  }
}

// Same "distinct exercise names from the user's real data" technique used to
// populate the Progress tab's dropdown — just feeding a filter instead.
function populateHistoryFilter(workouts) {
  const previousValue = historyFilterSelect.value;
  const names = [...new Set(workouts.map((w) => w.exercise_name))].sort();

  historyFilterSelect.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All exercises';
  historyFilterSelect.append(allOption);

  for (const name of names) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    historyFilterSelect.append(option);
  }

  if (names.includes(previousValue)) {
    historyFilterSelect.value = previousValue;
  }
}

async function loadHistory() {
  historyErrorEl.textContent = '';

  const { data, error } = await supabaseClient
    .from('workouts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    historyErrorEl.textContent = error.message;
    return;
  }

  historyWorkouts = data;
  populateHistoryFilter(data);
  renderHistoryList();
}

historyFilterSelect.addEventListener('change', renderHistoryList);

document.addEventListener('tab-change', (event) => {
  if (event.detail.tab === 'history') {
    loadHistory();
  }
});

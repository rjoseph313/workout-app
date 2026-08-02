// Progress tab — a Chart.js line chart of weight logged over time for a
// user-selected exercise. Bodyweight exercises (no weight column data) are
// handled explicitly rather than rendering an empty/broken chart.

const progressExerciseSelect = document.getElementById('progress-exercise-select');
const progressChartCanvas = document.getElementById('progress-chart');
const progressEmptyEl = document.getElementById('progress-empty');
const progressErrorEl = document.getElementById('progress-error');

let progressChart = null;

function renderEmptyChart() {
  if (progressChart) {
    progressChart.destroy();
    progressChart = null;
  }
  progressChartCanvas.classList.add('hidden');
  progressEmptyEl.classList.remove('hidden');
}

async function loadProgressChart(exerciseName) {
  progressErrorEl.textContent = '';

  const { data, error } = await supabaseClient
    .from('workouts')
    .select('created_at, weight, weight_unit')
    .eq('exercise_name', exerciseName)
    .order('created_at', { ascending: true });

  if (error) {
    progressErrorEl.textContent = error.message;
    return;
  }

  // Bodyweight sets (push-ups, pull-ups, etc.) have no weight logged —
  // exclude them rather than plotting them as a false zero.
  const weighted = data.filter((entry) => entry.weight != null);

  if (weighted.length === 0) {
    renderEmptyChart();
    return;
  }

  progressChartCanvas.classList.remove('hidden');
  progressEmptyEl.classList.add('hidden');

  const labels = weighted.map((entry) =>
    new Date(entry.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  );
  const weights = weighted.map((entry) => entry.weight);
  const unit = weighted[weighted.length - 1].weight_unit || 'lbs';

  const lineColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();

  if (progressChart) {
    progressChart.destroy();
  }

  progressChart = new Chart(progressChartCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `Weight (${unit})`,
          data: weights,
          borderColor: lineColor,
          backgroundColor: 'transparent',
          tension: 0.25,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: false },
      },
    },
  });
}

// Same "distinct exercise names from the user's real data" technique used
// for the History filter — just feeding a chart dropdown instead of a list filter.
async function loadProgressExercises() {
  progressErrorEl.textContent = '';

  const { data, error } = await supabaseClient
    .from('workouts')
    .select('exercise_name')
    .order('exercise_name', { ascending: true });

  if (error) {
    progressErrorEl.textContent = error.message;
    return;
  }

  const names = [...new Set(data.map((w) => w.exercise_name))];
  const previousValue = progressExerciseSelect.value;

  progressExerciseSelect.innerHTML = '';
  for (const name of names) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    progressExerciseSelect.append(option);
  }

  if (names.length === 0) {
    renderEmptyChart();
    return;
  }

  progressExerciseSelect.value = names.includes(previousValue) ? previousValue : names[0];
  loadProgressChart(progressExerciseSelect.value);
}

progressExerciseSelect.addEventListener('change', () => {
  loadProgressChart(progressExerciseSelect.value);
});

document.addEventListener('tab-change', (event) => {
  if (event.detail.tab === 'progress') {
    loadProgressExercises();
  }
});

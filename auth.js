// Auth UI logic — sign up, log in, log out, and reacting to session state.
// Relies on `supabaseClient` from supabaseClient.js (must load first).

const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signUpBtn = document.getElementById('signup-btn');
const logInBtn = document.getElementById('login-btn');
const logOutBtn = document.getElementById('logout-btn');
const errorEl = document.getElementById('auth-error');

function showError(message) {
  errorEl.textContent = message;
}

function clearError() {
  errorEl.textContent = '';
}

async function signUp() {
  clearError();
  const { error } = await supabaseClient.auth.signUp({
    email: emailInput.value,
    password: passwordInput.value,
  });
  if (error) {
    showError(error.message);
    return;
  }
  showError('Check your email to confirm your account before logging in.');
}

async function logIn() {
  clearError();
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value,
  });
  if (error) {
    showError(error.message);
  }
}

async function logOut() {
  clearError();
  await supabaseClient.auth.signOut();
}

function renderSession(session) {
  if (session) {
    authForm.style.display = 'none';
    logOutBtn.style.display = 'inline-block';
  } else {
    authForm.style.display = 'block';
    logOutBtn.style.display = 'none';
  }
  // Let other scripts (e.g. workouts.js) react to auth state without coupling to this file
  document.dispatchEvent(new CustomEvent('auth-change', { detail: { session } }));
}

signUpBtn.addEventListener('click', signUp);
logInBtn.addEventListener('click', logIn);
logOutBtn.addEventListener('click', logOut);

// Wait until every script on the page (including workouts.js, which listens
// for 'auth-change') has registered its listeners before we start dispatching.
// Otherwise the initial getSession()/INITIAL_SESSION event can fire and be
// missed while workouts.js is still loading.
document.addEventListener('DOMContentLoaded', () => {
  // Check for an existing session on page load (e.g. after a refresh)
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    renderSession(session);
  });

  // Fires on sign in, sign out, and token refresh — keeps the UI in sync
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    renderSession(session);
  });
});

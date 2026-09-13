const BACKEND_URL = 'http://127.0.0.1:8084';
const TOKEN_KEY = 'skillscape-token';

const body = document.body;
const authType = body.dataset.auth;
const form = document.getElementById('auth-form');
const statusMessage = document.getElementById('status-message');
const submitBtn = document.querySelector('.auth-submit');

const emailInput = document.getElementById('email');

(function handleTokenInUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || params.get('access_token');
    if (!token) return;

    localStorage.setItem(TOKEN_KEY, token);
    params.delete('token');
    params.delete('access_token');
    const cleanPath = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, document.title, cleanPath);

    fetchProfile(token).finally(() => {
      window.location.href = 'dashboard.html';
    });
  } catch (error) {
    console.warn('Could not parse token from URL', error);
  }
})();

function showStatus(message, type = 'success') {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';
}

function hideStatus() {
  if (statusMessage) statusMessage.style.display = 'none';
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setLoadingButton(button, loading, text) {
  if (!button) return;
  if (loading) {
    button.dataset.originalText = button.dataset.originalText || button.textContent;
    button.textContent = text || button.textContent;
    button.classList.add('loading');
    button.disabled = true;
    return;
  }

  button.classList.remove('loading');
  if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
    delete button.dataset.originalText;
  }
  button.disabled = false;
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function validateSignupForm() {
  const formData = new FormData(form);
  const email = normalizeEmail(formData.get('email'));
  const password = (formData.get('password') || '').trim();
  const fullName = (formData.get('name') || '').trim();
  const confirmPassword = (formData.get('confirm_password') || '').trim();
  const acceptedTerms = formData.get('terms');

  if (!fullName || !email || !password || !confirmPassword) {
    showStatus('Please fill in all required fields.', 'error');
    return null;
  }
  if (!validateEmail(email)) {
    showStatus('Please enter a valid email address.', 'error');
    return null;
  }
  if (password.length < 6) {
    showStatus('Password must be at least 6 characters long.', 'error');
    return null;
  }
  if (password !== confirmPassword) {
    showStatus('Passwords do not match.', 'error');
    return null;
  }
  if (!acceptedTerms) {
    showStatus('You must agree to the Terms and Privacy Policy to create an account.', 'error');
    return null;
  }

  return { email, password, full_name: fullName, role: 'user' };
}

async function fetchProfile(token, fallback = {}) {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Profile request failed');
    const user = await response.json();
    localStorage.setItem('skillscape-user', JSON.stringify({
      email: user.email || fallback.email,
      name: user.full_name || fallback.name || fallback.email,
    }));
  } catch {
    localStorage.setItem('skillscape-user', JSON.stringify({
      email: fallback.email,
      name: fallback.name || fallback.email,
    }));
  }
}

async function completeSignup(payload) {
  setLoadingButton(submitBtn, true, 'Creating...');
  try {
    const response = await fetch(`${BACKEND_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      showStatus(result.detail || result.message || 'Signup failed. Please try again.', 'error');
      return;
    }

    localStorage.setItem(TOKEN_KEY, result.access_token);
    await fetchProfile(result.access_token, { email: payload.email, name: payload.full_name });
    showStatus('Account created successfully. Redirecting...', 'success');
    form.reset();
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
  } catch (error) {
    console.error('Signup failed', error);
    showStatus('Unable to connect to the server. Please try again later.', 'error');
  } finally {
    setLoadingButton(submitBtn, false);
  }
}

// Password visibility toggle functionality
function setupPasswordToggle(toggleBtn) {
  const input = toggleBtn.closest('.password-input-wrapper').querySelector('input');
  const eyeOpen = toggleBtn.querySelector('.eye-open');
  const eyeClosed = toggleBtn.querySelector('.eye-closed');

  toggleBtn.addEventListener('click', () => {
    const isVisible = toggleBtn.dataset.visible === 'true';
    const newState = !isVisible;

    input.type = newState ? 'text' : 'password';
    toggleBtn.dataset.visible = newState.toString();

    if (eyeOpen && eyeClosed) {
      eyeOpen.style.display = newState ? 'none' : 'block';
      eyeClosed.style.display = newState ? 'block' : 'none';
    }

    toggleBtn.setAttribute('aria-label', newState ? 'Hide password' : 'Show password');
  });
}

// Initialize password toggles for all password fields
const passwordToggles = document.querySelectorAll('.password-toggle');
passwordToggles.forEach(setupPasswordToggle);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideStatus();

  const formData = new FormData(form);
  const email = normalizeEmail(formData.get('email'));
  const password = (formData.get('password') || '').trim();
  const isSignup = authType === 'signup';

  if (isSignup) {
    const payload = validateSignupForm();
    if (!payload) return;
    await completeSignup(payload);
    return;
  }

  if (!email || !password) {
    showStatus('Please enter your email and password.', 'error');
    return;
  }
  if (!validateEmail(email)) {
    showStatus('Please enter a valid email address.', 'error');
    return;
  }

  setLoadingButton(submitBtn, true, 'Signing in...');
  try {
    const response = await fetch(`${BACKEND_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      showStatus(result.detail || result.message || 'Authentication failed. Please try again.', 'error');
      return;
    }

    localStorage.setItem(TOKEN_KEY, result.access_token);
    await fetchProfile(result.access_token, { email });
    showStatus('You are signed in successfully. Redirecting...', 'success');
    form.reset();
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
  } catch (error) {
    console.error('Auth request failed', error);
    showStatus('Unable to connect to the server. Please try again later.', 'error');
  } finally {
    setLoadingButton(submitBtn, false);
  }
});
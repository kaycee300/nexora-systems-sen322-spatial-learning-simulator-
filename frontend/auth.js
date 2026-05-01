const BACKEND_URL = 'http://localhost:8002';
const body = document.body;
const authType = body.dataset.auth;
const form = document.getElementById('auth-form');
const statusMessage = document.getElementById('status-message');

function showStatus(message, type = 'success') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';
}

function hideStatus() {
  statusMessage.style.display = 'none';
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideStatus();

  const formData = new FormData(form);
  const email = formData.get('email')?.trim();
  const password = formData.get('password')?.trim();
  const isSignup = authType === 'signup';
  const fullName = isSignup ? formData.get('name')?.trim() : null;
  const role = isSignup ? 'user' : null; // Default role for signup

  if (!email || !password || (isSignup && !fullName)) {
    showStatus('Please fill in all required fields.', 'error');
    return;
  }

  if (!validateEmail(email)) {
    showStatus('Please enter a valid email address.', 'error');
    return;
  }

  if (password.length < 6) {
    showStatus('Password must be at least 6 characters long.', 'error');
    return;
  }

  const payload = { email, password };
  if (isSignup) {
    payload.full_name = fullName;
    payload.role = role;
  }

  const endpoint = isSignup ? '/auth/signup' : '/auth/signin';
  const url = `${BACKEND_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      const message = result.detail || result.message || 'Authentication failed. Please try again.';
      showStatus(message, 'error');
      return;
    }

    localStorage.setItem('skillscape-token', result.access_token);
    localStorage.setItem('skillscape-user', JSON.stringify({ email, name: fullName || email }));

    const successMessage = isSignup
      ? 'Account created successfully. You can now sign in.'
      : 'You are signed in successfully. Welcome back!';

    showStatus(successMessage, 'success');
    form.reset();
  } catch (error) {
    console.error('Auth request failed:', error);
    showStatus('Unable to connect to the server. Please try again later.', 'error');
  }
});

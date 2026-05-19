const BACKEND_URL = 'http://127.0.0.1:8000';

const body = document.body;
const authType = body.dataset.auth;
const form = document.getElementById('auth-form');
const statusMessage = document.getElementById('status-message');
const submitBtn = document.querySelector('.auth-submit');

const sendCodeBtn = document.getElementById('send-code-btn');
const verifyCodeBtn = document.getElementById('verify-code-btn');
const codeSection = document.getElementById('code-section');
const codeInput = document.getElementById('code-input');
const emailVerifiedDiv = document.getElementById('email-verified');
const emailInput = document.getElementById('email');

let emailVerified = false;
let verifiedEmail = '';
let pendingSignupPayload = null;
let resendTimer = null;
let resendRemaining = 0;
const RESEND_COOLDOWN = 30;

(function handleTokenInUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || params.get('access_token');
    if (!token) return;

    localStorage.setItem('skillscape-token', token);
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

function setCodeSectionVisible(visible) {
  if (codeSection) codeSection.style.display = visible ? 'block' : 'none';
}

function setEmailVerified(email) {
  emailVerified = true;
  verifiedEmail = email;
  if (emailVerifiedDiv) emailVerifiedDiv.style.display = 'block';
  setCodeSectionVisible(false);
}

function resetEmailVerification() {
  emailVerified = false;
  verifiedEmail = '';
  pendingSignupPayload = null;
  if (emailVerifiedDiv) emailVerifiedDiv.style.display = 'none';
  if (codeInput) codeInput.value = '';
}

function getOrCreateResendNote() {
  let note = document.querySelector('.resend-note');
  if (!note && sendCodeBtn) {
    note = document.createElement('div');
    note.className = 'resend-note';
    sendCodeBtn.closest('.email-verification-group').appendChild(note);
  }
  return note;
}

function startResendCooldown(seconds = RESEND_COOLDOWN) {
  if (!sendCodeBtn) return;
  clearInterval(resendTimer);
  resendRemaining = seconds;
  const note = getOrCreateResendNote();
  sendCodeBtn.disabled = true;
  if (note) note.textContent = `Resend available in ${resendRemaining}s`;

  resendTimer = setInterval(() => {
    resendRemaining -= 1;
    if (resendRemaining <= 0) {
      clearInterval(resendTimer);
      resendTimer = null;
      sendCodeBtn.disabled = false;
      if (note) note.textContent = '';
      return;
    }
    if (note) note.textContent = `Resend available in ${resendRemaining}s`;
  }, 1000);
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function validateSignupForm({ requireVerified = false } = {}) {
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
  if (requireVerified && (!emailVerified || verifiedEmail !== email)) {
    showStatus('Verify your email before creating an account.', 'error');
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
      email_verified: Boolean(user.email_verified),
    }));
  } catch {
    localStorage.setItem('skillscape-user', JSON.stringify({
      email: fallback.email,
      name: fallback.name || fallback.email,
    }));
  }
}

async function checkBackend() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    if (!response.ok) throw new Error('Health check failed');
  } catch {
    throw new Error('Backend is not running. Start FastAPI on http://127.0.0.1:8002 and try again.');
  }
}

async function requestVerificationCode(email) {
  const response = await fetch(`${BACKEND_URL}/auth/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.detail || result.message || 'Failed to send verification code.');
  }
  return result;
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

    localStorage.setItem('skillscape-token', result.access_token);
    await fetchProfile(result.access_token, { email: payload.email, name: payload.full_name });
    showStatus('Account created successfully. Redirecting...', 'success');
    form.reset();
    resetEmailVerification();
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
  } catch (error) {
    console.error('Signup failed', error);
    showStatus('Unable to connect to the server. Please try again later.', 'error');
  } finally {
    setLoadingButton(submitBtn, false);
  }
}

const googleSignupBtn = document.getElementById('google-signup');
const googleSigninBtn = document.getElementById('google-signin');

passwordInputs.forEach(setupPasswordToggle);

if (googleSignupBtn) {
  googleSignupBtn.addEventListener('click', async (event) => {
    event.preventDefault();
    hideStatus();
    setLoadingButton(googleSignupBtn, true, 'Connecting...');
    try {
      await checkBackend();
      window.location.href = `${BACKEND_URL}/auth/google/login`;
    } catch (error) {
      showStatus(error.message, 'error');
      setLoadingButton(googleSignupBtn, false);
    }
  });
}

if (googleSigninBtn) {
  googleSigninBtn.addEventListener('click', async (event) => {
    event.preventDefault();
    hideStatus();
    setLoadingButton(googleSigninBtn, true, 'Connecting...');
    try {
      await checkBackend();
      window.location.href = `${BACKEND_URL}/auth/google/login`;
    } catch (error) {
      showStatus(error.message, 'error');
      setLoadingButton(googleSigninBtn, false);
    }
  });
}

if (emailInput && authType === 'signup') {
  emailInput.addEventListener('input', () => {
    if (normalizeEmail(emailInput.value) !== verifiedEmail) resetEmailVerification();
  });
}

if (sendCodeBtn) {
  sendCodeBtn.addEventListener('click', async () => {
    hideStatus();
    const email = normalizeEmail(emailInput?.value);
    if (!email || !validateEmail(email)) {
      showStatus('Enter a valid email to receive a verification code.', 'error');
      return;
    }

    setLoadingButton(sendCodeBtn, true, 'Sending...');
    try {
      await requestVerificationCode(email);
      showStatus('Verification code sent. Check your email.', 'success');
      setCodeSectionVisible(true);
      startResendCooldown();
    } catch (error) {
      showStatus(error.message, 'error');
      sendCodeBtn.disabled = false;
    } finally {
      sendCodeBtn.classList.remove('loading');
      if (sendCodeBtn.dataset.originalText) {
        sendCodeBtn.textContent = sendCodeBtn.dataset.originalText;
        delete sendCodeBtn.dataset.originalText;
      }
      if (!resendTimer) sendCodeBtn.disabled = false;
    }
  });
}

if (verifyCodeBtn) {
  verifyCodeBtn.addEventListener('click', async () => {
    hideStatus();
    const email = normalizeEmail(emailInput?.value);
    const code = (codeInput?.value || '').trim();
    if (!email || !validateEmail(email)) {
      showStatus('Enter a valid email.', 'error');
      return;
    }
    if (!code) {
      showStatus('Enter the verification code you received.', 'error');
      return;
    }

    setLoadingButton(verifyCodeBtn, true, 'Verifying...');
    try {
      const response = await fetch(`${BACKEND_URL}/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        showStatus(result.detail || result.message || 'Verification failed.', 'error');
        return;
      }

      setEmailVerified(email);
      showStatus(pendingSignupPayload ? 'Email verified. Creating your account...' : 'Email verified.', 'success');
      if (pendingSignupPayload) await completeSignup(pendingSignupPayload);
    } catch (error) {
      console.error('Verification failed', error);
      showStatus('Unable to verify code. Please try again later.', 'error');
    } finally {
      setLoadingButton(verifyCodeBtn, false);
    }
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideStatus();

  const formData = new FormData(form);
  const email = normalizeEmail(formData.get('email'));
  const password = (formData.get('password') || '').trim();
  const isSignup = authType === 'signup';

  if (isSignup) {
    const payload = validateSignupForm({ requireVerified: false });
    if (!payload) return;

    if (!emailVerified || verifiedEmail !== payload.email) {
      pendingSignupPayload = payload;
      setLoadingButton(submitBtn, true, 'Sending code...');
      try {
        await requestVerificationCode(payload.email);
        showStatus('Verification code sent. Enter it to finish creating your account.', 'success');
        setCodeSectionVisible(true);
        startResendCooldown();
      } catch (error) {
        pendingSignupPayload = null;
        showStatus(error.message, 'error');
      } finally {
        setLoadingButton(submitBtn, false);
      }
      return;
    }

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

    localStorage.setItem('skillscape-token', result.access_token);
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

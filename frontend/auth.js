const BACKEND_URL = 'http://127.0.0.1:8002';
const body = document.body;
const authType = body.dataset.auth;
const form = document.getElementById('auth-form');
const statusMessage = document.getElementById('status-message');

// Email verification flag
let emailVerified = false;
let pendingSignupPayload = null;

// If the backend redirects back with ?token=..., capture it and store token
(function handleTokenInUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || params.get('access_token');
    if (token) {
      localStorage.setItem('skillscape-token', token);
      // remove token from URL
      params.delete('token');
      params.delete('access_token');
      const base = window.location.pathname;
      const newUrl = params.toString() ? `${base}?${params.toString()}` : base;
      window.history.replaceState({}, document.title, newUrl);
      // fetch profile
      fetch(`${BACKEND_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : null)
        .then((meJson) => {
          if (meJson) {
            const user = meJson.user || meJson;
            localStorage.setItem('skillscape-user', JSON.stringify({ email: user.email, name: user.full_name }));
          }
        }).catch(() => {});
    }
  } catch (e) {
    console.warn('Could not parse token from URL', e);
  }
})();

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

// Wire up Google buttons if present
const googleSignupBtn = document.getElementById('google-signup');
const googleSigninBtn = document.getElementById('google-signin');
if (googleSignupBtn) googleSignupBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = `${BACKEND_URL}/auth/google/login`; });
if (googleSigninBtn) googleSigninBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = `${BACKEND_URL}/auth/google/login`; });

// Send verification code / verify code handlers (signup page)
const sendCodeBtn = document.getElementById('send-code-btn');
const verifyCodeBtn = document.getElementById('verify-code-btn');
const codeSection = document.getElementById('code-section');
const codeInput = document.getElementById('code-input');
const emailVerifiedDiv = document.getElementById('email-verified');
const submitBtn = document.querySelector('.auth-submit');

let isSubmitting = false;
let resendTimer = null;
const RESEND_COOLDOWN = 30; // seconds

function setLoadingButton(btn, loading, text) {
  if (!btn) return;
  if (loading) {
    btn.classList.add('loading');
    btn.disabled = true;
    if (text) btn._origText = btn.textContent, btn.textContent = text;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
    if (btn._origText) { btn.textContent = btn._origText; delete btn._origText; }
  }
}

function startResendCooldown(seconds = RESEND_COOLDOWN) {
  if (!sendCodeBtn) return;
  let remaining = seconds;
  sendCodeBtn.disabled = true;
  const note = document.querySelector('.resend-note') || (function(){ const el = document.createElement('div'); el.className='resend-note'; sendCodeBtn.parentNode.appendChild(el); return el; })();
  note.textContent = `Resend available in ${remaining}s`;
  resendTimer = setInterval(()=>{
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(resendTimer); resendTimer = null; sendCodeBtn.disabled = false; note.textContent = '';
    } else {
      note.textContent = `Resend available in ${remaining}s`;
    }
  }, 1000);
}

if (sendCodeBtn) {
  sendCodeBtn.addEventListener('click', async () => {
    hideStatus();
    const emailEl = document.getElementById('email');
    const email = emailEl?.value?.trim();
    if (!email || !validateEmail(email)) {
      showStatus('Enter a valid email to receive a verification code.', 'error');
      return;
    }
    setLoadingButton(sendCodeBtn, true, 'Sending...');
    try {
      const resp = await fetch(`${BACKEND_URL}/auth/send-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      const json = await resp.json().catch(()=>({}));
      if (!resp.ok) {
        showStatus(json.detail || json.message || 'Failed to send code.', 'error');
        setLoadingButton(sendCodeBtn, false);
        return;
      }
      showStatus('Verification code sent. Check your email.', 'success');
      if (codeSection) codeSection.style.display = 'flex';
      startResendCooldown();
    } catch (err) {
      console.error('send-code error', err);
      showStatus('Unable to send code. Try again later.', 'error');
    } finally {
      setLoadingButton(sendCodeBtn, false);
    }
  });
}

if (verifyCodeBtn) {
  verifyCodeBtn.addEventListener('click', async () => {
    hideStatus();
    const emailEl = document.getElementById('email');
    const email = emailEl?.value?.trim();
    const code = codeInput?.value?.trim();
    if (!email || !validateEmail(email)) { showStatus('Enter a valid email.', 'error'); return; }
    if (!code) { showStatus('Enter the verification code you received.', 'error'); return; }
    setLoadingButton(verifyCodeBtn, true, 'Verifying...');
    try {
      const resp = await fetch(`${BACKEND_URL}/auth/verify-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code })
      });
      const json = await resp.json().catch(()=>({}));
      if (!resp.ok) { showStatus(json.detail || json.message || 'Verification failed.', 'error'); return; }
      emailVerified = true;
      if (emailVerifiedDiv) emailVerifiedDiv.style.display = 'block';
      showStatus('Email verified. Completing signup...', 'success');
      if (codeSection) codeSection.style.display = 'none';
      // If there is a pending signup payload (user clicked Create Account earlier), finish signup automatically
      if (pendingSignupPayload) {
        setLoadingButton(submitBtn, true, 'Creating...');
        try {
          const signupResp = await fetch(`${BACKEND_URL}/auth/signup`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pendingSignupPayload)
          });
          const signupJson = await signupResp.json().catch(() => ({}));
          if (!signupResp.ok) {
            showStatus(signupJson.detail || signupJson.message || 'Signup failed after verification.', 'error');
            pendingSignupPayload = null;
            setLoadingButton(submitBtn, false);
            return;
          }
          // store token
          localStorage.setItem('skillscape-token', signupJson.access_token);
          // fetch profile
          try {
            const meResp = await fetch(`${BACKEND_URL}/auth/me`, { headers: { Authorization: `Bearer ${signupJson.access_token}` } });
            if (meResp.ok) {
              const meJson = await meResp.json();
              const user = meJson.user || meJson;
              localStorage.setItem('skillscape-user', JSON.stringify({ email: user.email, name: user.full_name }));
            }
          } catch (e) { /* ignore */ }
          showStatus('Account created successfully. You are signed in.', 'success');
          form.reset();
          pendingSignupPayload = null;
          // redirect to dashboard
          setTimeout(()=> window.location.href = 'dashboard.html', 750);
        } catch (err) {
          console.error('Signup after verify failed', err);
          showStatus('Signup failed after verification. Try signing in.', 'error');
          pendingSignupPayload = null;
        } finally { setLoadingButton(submitBtn, false); }
      }
    } catch (err) {
      console.error('verify-code error', err);
      showStatus('Unable to verify code. Try again later.', 'error');
    } finally { setLoadingButton(verifyCodeBtn, false); }
  });
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
  const confirmPassword = isSignup ? formData.get('confirm_password')?.trim() : null;
  const acceptedTerms = isSignup ? formData.get('terms') : null;

  if (!email || !password || (isSignup && !fullName)) {
    showStatus('Please fill in all required fields.', 'error');
    return;
  }

  if (isSignup && !emailVerified) {
    // Auto-send verification code on first create-account click
    try {
      const sendResp = await fetch(`${BACKEND_URL}/auth/send-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      });
      const sendJson = await sendResp.json().catch(() => ({}));
      if (!sendResp.ok) {
        showStatus(sendJson.detail || sendJson.message || 'Failed to send verification code.', 'error');
        return;
      }
      // store pending payload to complete signup after verification
      pendingSignupPayload = { email, password, full_name: fullName, role };
      showStatus('Verification code sent to your email. Enter the code to complete signup.', 'success');
      if (codeSection) codeSection.style.display = 'flex';
      return;
    } catch (err) {
      console.error('Auto send-code error', err);
      showStatus('Unable to send verification code. Try again later.', 'error');
      return;
    }
  }

  if (isSignup && (!confirmPassword || confirmPassword !== password)) {
    showStatus('Passwords do not match. Please re-enter.', 'error');
    return;
  }

  if (isSignup && !acceptedTerms) {
    showStatus('You must agree to the Terms and Privacy Policy to create an account.', 'error');
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
    // set loading state for submit
    setLoadingButton(submitBtn, true, isSignup ? 'Creating...' : 'Signing in...');
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

    // Try to fetch the current user using the returned token and store profile
    try {
      const meResp = await fetch(`${BACKEND_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${result.access_token}` },
      });
      if (meResp.ok) {
        const meJson = await meResp.json();
        const user = meJson.user || meJson; // router returns { user: {...} }
        localStorage.setItem('skillscape-user', JSON.stringify({ email: user.email, name: user.full_name }));
      } else {
        // fallback to storing minimal info
        localStorage.setItem('skillscape-user', JSON.stringify({ email, name: fullName || email }));
      }
    } catch (err) {
      // network error while fetching /auth/me — store minimal info
      localStorage.setItem('skillscape-user', JSON.stringify({ email, name: fullName || email }));
    }

    const successMessage = isSignup
      ? 'Account created successfully. Redirecting...' 
      : 'You are signed in successfully. Redirecting...';

    showStatus(successMessage, 'success');
    form.reset();
    // redirect to dashboard after short delay
    setTimeout(()=> window.location.href = 'dashboard.html', 700);
  } catch (error) {
    console.error('Auth request failed:', error);
    showStatus('Unable to connect to the server. Please try again later.', 'error');
  }
  finally { setLoadingButton(submitBtn, false); }
});

const BACKEND_URL = "http://localhost:8000";

// Modal handling
const modal = document.getElementById('auth-modal');
const closeBtn = document.getElementById('close-modal');
const authFormContainer = document.getElementById('auth-form-container');

document.getElementById('signup-btn').addEventListener('click', () => {
  showAuthForm('signup');
});

document.getElementById('signin-btn').addEventListener('click', () => {
  showAuthForm('signin');
});

closeBtn.addEventListener('click', () => {
  modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

function showAuthForm(type) {
  const isSignup = type === 'signup';
  const formHTML = `
    <form class="auth-form" id="auth-form">
      <h2>${isSignup ? 'Create Account' : 'Welcome Back'}</h2>

      ${isSignup ? `
        <div class="form-group">
          <label for="name">Full Name</label>
          <input type="text" id="name" required>
        </div>
      ` : ''}

      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" required>
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" required>
      </div>

      ${isSignup ? `
        <div class="form-group">
          <label for="role">I am a:</label>
          <select id="role" required>
            <option value="learner">Learner</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
      ` : ''}

      <button type="submit" class="btn btn-primary auth-submit">
        ${isSignup ? 'Sign Up' : 'Sign In'}
      </button>

      <div class="toggle-auth">
        ${isSignup ? 'Already have an account?' : 'Don\'t have an account?'}
        <a href="#" id="toggle-auth-link">
          ${isSignup ? 'Sign In' : 'Sign Up'}
        </a>
      </div>
    </form>
  `;

  authFormContainer.innerHTML = formHTML;
  modal.style.display = 'block';

  // Handle form submission
  document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);

  // Handle toggle
  document.getElementById('toggle-auth-link').addEventListener('click', (e) => {
    e.preventDefault();
    const newType = isSignup ? 'signin' : 'signup';
    showAuthForm(newType);
  });
}

async function handleAuthSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const isSignup = e.target.querySelector('h2').textContent === 'Create Account';

  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  if (isSignup) {
    data.name = formData.get('name');
    data.role = formData.get('role');
  }

  try {
    const endpoint = isSignup ? '/auth/register' : '/auth/login';
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      const result = await response.json();
      // Store auth token and user info
      localStorage.setItem('skillscape-token', result.access_token);
      localStorage.setItem('skillscape-user', JSON.stringify(result.user));

      // Redirect based on role
      const role = result.user.role || 'learner';
      if (role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'user.html';
      }

      modal.style.display = 'none';
    } else {
      const error = await response.json();
      alert(error.detail || 'Authentication failed');
    }
  } catch (error) {
    console.error('Auth error:', error);
    alert('Network error. Please try again.');
  }
}

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('skillscape-token');
  const user = localStorage.getItem('skillscape-user');

  if (token && user) {
    const userData = JSON.parse(user);
    // Redirect to appropriate page
    if (userData.role === 'admin') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'user.html';
    }
  }
});
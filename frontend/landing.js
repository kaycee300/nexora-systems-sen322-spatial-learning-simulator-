const BACKEND_URL = "http://127.0.0.1:8001";

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
          <input type="text" id="name" name="name" required>
        </div>
      ` : ''}

      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required>
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required>
      </div>

      ${isSignup ? `
        <div class="form-group">
          <label for="role">I am a:</label>
          <select id="role" name="role" required>
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
    const url = `${BACKEND_URL}${endpoint}`;
    console.log('Auth request', { isSignup, url, data });
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = responseText;
    }

    if (response.ok) {
      // Store auth token and user info
      localStorage.setItem('skillscape-token', result.access_token);
      localStorage.setItem('skillscape-user', JSON.stringify(result.user));

      // Show success modal
      const successModal = document.getElementById('success-modal');
      const successTitle = document.getElementById('success-title');
      const successMessage = document.getElementById('success-message');
      const successBtn = document.getElementById('success-btn');

      if (isSignup) {
        successTitle.textContent = 'Welcome to SkillScape!';
        successMessage.textContent = `Account created for ${result.user.name}. Get ready to start learning.`;
      } else {
        successTitle.textContent = 'Welcome Back!';
        successMessage.textContent = `Welcome back, ${result.user.name}.`;
      }

      modal.style.display = 'none';
      successModal.style.display = 'flex';

      // Handle redirect
      successBtn.onclick = () => {
        const role = result.user.role || 'learner';
        if (role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'user.html';
        }
      };
    } else {
      const errorMessage = formatAuthError(result);
      showErrorMessage(errorMessage);
    }
  } catch (error) {
    console.error('Auth error:', error);
    showErrorMessage('Network error. Please try again. Check the browser console for details.');
  }
}

function showErrorMessage(message) {
  // Create error toast
  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  // Remove after 5 seconds
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function formatAuthError(error) {
  if (!error) return 'Authentication failed.';
  if (typeof error === 'string') return error;
  if (Array.isArray(error)) {
    return error
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.msg) return item.msg;
        return JSON.stringify(item);
      })
      .join(' ');
  }
  if (error.detail !== undefined) {
    return formatAuthError(error.detail);
  }
  if (error.message) return error.message;
  if (error.error) return formatAuthError(error.error);
  return JSON.stringify(error);
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
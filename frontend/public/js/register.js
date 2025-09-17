// Select form and notification container
const form = document.getElementById('registerForm');
const notification = document.getElementById('notification');

/**
 * Display a temporary notification message
 * @param {string} message - Message to display
 * @param {string} type - 'success' (green) or 'error' (orange)
 */
function showNotification(message, type = 'success') {
  notification.textContent = message;
  notification.style.display = 'block';
  notification.style.backgroundColor = type === 'success' ? '#059669' : '#EA580C';

  // Auto-hide after 3 seconds
  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}

// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(icon => {
  icon.addEventListener('click', () => {
    const input = icon.previousElementSibling; // get the input before the icon
    if (input.type === 'password') {
      input.type = 'text';
      icon.textContent = '🙈'; 
    } else {
      input.type = 'password';
      icon.textContent = '👁️';
    }
  });
});

// Form submit: validate + send to backend
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Grab values from form
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const terms = document.getElementById('terms').checked;

  // Front-end validation
  if (!username) return showNotification('Please enter your full name.', 'error');
  if (!email || !/\S+@\S+\.\S+/.test(email)) return showNotification('Please enter a valid email.', 'error');
  if (!password) return showNotification('Please enter a password.', 'error');
  if (password !== confirmPassword) return showNotification('Passwords do not match.', 'error');
  if (!terms) return showNotification('You must agree to the Terms and Conditions.', 'error');

  // Prepare data for backend
  const data = { username, email, password };

  try {
    // Send registration request
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    // If backend returns an error
    if (!res.ok) {
      showNotification(result.message || 'Registration failed', 'error');
      return;
    }

    // Registration successful
    showNotification('Registration successful! Redirecting to login...', 'success');

    // Redirect to login after short delay
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1500);

  } catch (err) {
    console.error(err);
    showNotification('Something went wrong. Please try again.', 'error');
  }
});

const form = document.getElementById('registerForm');
const notification = document.getElementById('notification');

// Function to show notifications
function showNotification(message, type = 'success') {
  // type: 'success' -> green, 'error' -> orange
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
      icon.textContent = '🙈'; // show hide icon
    } else {
      input.type = 'password';
      icon.textContent = '👁️'; // show eye icon
    }
  });
});

// Form submit front-end validation
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const terms = document.getElementById('terms').checked;

  // Basic front-end validation
  if (!username) return showNotification('Please enter your full name.', 'error');
  if (!email || !/\S+@\S+\.\S+/.test(email)) return showNotification('Please enter a valid email.', 'error');
  if (!password) return showNotification('Please enter a password.', 'error');
  if (password !== confirmPassword) return showNotification('Passwords do not match.', 'error');
  if (!terms) return showNotification('You must agree to the Terms and Conditions.', 'error');
});

// Grab form and error elements
const form = document.getElementById('loginForm');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

// Toggle password visibility
togglePassword.addEventListener('click', () => {
  const type = passwordInput.type === 'password' ? 'text' : 'password';
  passwordInput.type = type;
  togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
});

// Helper functions to show/hide errors
function showError(element) {
  element.style.display = 'block';
}

function hideErrors() {
  emailError.style.display = 'none';
  passwordError.style.display = 'none';
}

// Form submit: validate inputs only
form.addEventListener('submit', (e) => {
  e.preventDefault();
  hideErrors();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  let valid = true;

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    showError(emailError);
    valid = false;
  }

  if (!password) {
    showError(passwordError);
    valid = false;
  }

  if (valid) {
    alert('All inputs valid! Next step: integrate backend.');
  }
});

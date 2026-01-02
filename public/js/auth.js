// ===================================
// SPECTRUM LIMS - Authentication JavaScript
// ===================================

// Switch Login Type
function switchLoginType(type) {
    document.getElementById('loginType').value = type;

    const toggleBtns = document.querySelectorAll('.auth-toggle-btn');
    toggleBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
}

// Toggle Password Visibility
function togglePassword(inputId = 'loginPassword') {
    const passwordInput = document.getElementById(inputId);
    const toggleBtn = passwordInput.parentElement.querySelector('.auth-password-toggle i');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        toggleBtn.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// Handle Login
async function handleLogin(event) {
    event.preventDefault();

    const loginBtn = document.getElementById('loginBtn');
    const errorDiv = document.getElementById('loginError');

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginType = document.getElementById('loginType').value;

    // Disable button and show loading
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Signing in...</span>';
    errorDiv.classList.remove('active');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, loginType })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Redirect to appropriate dashboard
            window.location.href = data.redirect;
        } else {
            errorDiv.textContent = data.error || 'Invalid credentials. Please try again.';
            errorDiv.classList.add('active');
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please check your internet and try again.';
        errorDiv.classList.add('active');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span>Sign In</span> <i class="fas fa-arrow-right"></i>';
    }
}

// Handle Registration
async function handleRegister(event) {
    event.preventDefault();

    const registerBtn = document.getElementById('registerBtn');
    const errorDiv = document.getElementById('registerError');

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const company = document.getElementById('companyName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate passwords match
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match. Please try again.';
        errorDiv.classList.add('active');
        return;
    }

    // Disable button and show loading
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Creating account...</span>';
    errorDiv.classList.remove('active');

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                company,
                email,
                phone,
                password
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Show success and redirect to login
            alert('Account created successfully! Please login to continue.');
            window.location.href = 'login.html';
        } else {
            errorDiv.textContent = data.error || 'Registration failed. Please try again.';
            errorDiv.classList.add('active');
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please check your internet and try again.';
        errorDiv.classList.add('active');
    } finally {
        registerBtn.disabled = false;
        registerBtn.innerHTML = '<span>Create Account</span> <i class="fas fa-arrow-right"></i>';
    }
}

// Add enter key support for forms
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        if (activeElement.tagName === 'INPUT') {
            const form = activeElement.closest('form');
            if (form) {
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn && !submitBtn.disabled) {
                    form.dispatchEvent(new Event('submit', { cancelable: true }));
                }
            }
        }
    }
});

// ===================================
// SPECTRUM LIMS - Main JavaScript
// ===================================

// Mobile Menu Toggle
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenu.classList.toggle('active');
}

// Login Modal Functions
function openLoginModal(type = 'client') {
    const modal = document.getElementById('loginModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    switchLoginType(type);
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('loginError').classList.remove('active');
    document.getElementById('loginForm').reset();
}

function switchLoginType(type) {
    document.getElementById('loginType').value = type;

    const toggleBtns = document.querySelectorAll('.toggle-btn');
    toggleBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
}

function togglePassword() {
    const passwordInput = document.getElementById('loginPassword');
    const toggleBtn = document.querySelector('.password-toggle i');

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

    const form = event.target;
    const loginBtn = document.getElementById('loginBtn');
    const errorDiv = document.getElementById('loginError');

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginType = document.getElementById('loginType').value;

    // Disable button and show loading
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
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
            errorDiv.textContent = data.error || 'Invalid credentials';
            errorDiv.classList.add('active');
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.classList.add('active');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
}

// Contact Form Submit
function submitContactForm(event) {
    event.preventDefault();

    const form = event.target;
    const btn = form.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    // Simulate form submission
    setTimeout(() => {
        alert('Thank you for your message! We will get back to you soon.');
        form.reset();
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
    }, 1500);
}

// Smooth scroll for navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Header scroll effect with top bar hide
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    const topBar = document.querySelector('.top-bar');

    if (window.scrollY > 50) {
        header.classList.add('scrolled');
        if (topBar) topBar.style.transform = 'translateY(-100%)';
    } else {
        header.classList.remove('scrolled');
        if (topBar) topBar.style.transform = 'translateY(0)';
    }
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeLoginModal();
    }
});

// Active navigation highlighting
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.offsetHeight;

        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// ===================================
// ANIMATED COUNTER
// ===================================
function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-target'));
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    const updateCounter = () => {
        current += step;
        if (current < target) {
            element.textContent = formatNumber(Math.floor(current));
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = formatNumber(target);
        }
    };

    updateCounter();
}

function formatNumber(num) {
    if (num >= 1000) {
        return num.toLocaleString();
    }
    return num;
}

// Intersection Observer for counter animation
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const counters = entry.target.querySelectorAll('.counter-value');
            counters.forEach(counter => {
                if (!counter.classList.contains('counted')) {
                    counter.classList.add('counted');
                    animateCounter(counter);
                }
            });
        }
    });
}, { threshold: 0.3 });

// Observe the stats section
const statsSection = document.querySelector('.stats-counter');
if (statsSection) {
    counterObserver.observe(statsSection);
}

// ===================================
// SCROLL REVEAL ANIMATIONS
// ===================================
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
        }
    });
}, { threshold: 0.1 });

// Add reveal animation to cards and sections
document.querySelectorAll('.service-card, .advantage-card, .equipment-card, .industry-card, .testimonial-card, .cert-badge').forEach(el => {
    el.classList.add('reveal-on-scroll');
    revealObserver.observe(el);
});

// ===================================
// PARTICLES ANIMATION ENHANCEMENT
// ===================================
function createRandomParticles() {
    const particlesContainer = document.querySelector('.hero-particles');
    if (!particlesContainer) return;

    // Add some extra dynamic particles
    for (let i = 7; i <= 12; i++) {
        const particle = document.createElement('div');
        particle.className = `particle particle-${i}`;
        particle.style.width = `${Math.random() * 8 + 4}px`;
        particle.style.height = particle.style.width;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.left = `${Math.random() * 40}%`;
        particle.style.animationDelay = `${Math.random() * 5}s`;
        particle.style.opacity = Math.random() * 0.3 + 0.1;
        particlesContainer.appendChild(particle);
    }
}

// ===================================
// INITIALIZE ON DOM LOAD
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    // Create extra particles
    createRandomParticles();

    // Add typewriter effect to hero title (optional enhancement)
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        heroTitle.style.opacity = '1';
    }
});

// ===================================
// PARALLAX SCROLL EFFECT
// ===================================
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');

    if (hero && scrolled < window.innerHeight) {
        const heroContent = hero.querySelector('.hero-content');
        if (heroContent) {
            heroContent.style.transform = `translateY(${scrolled * 0.1}px)`;
        }

        // Parallax for particles
        const particles = hero.querySelectorAll('.particle');
        particles.forEach((particle, index) => {
            const speed = 0.05 + (index * 0.02);
            particle.style.transform = `translateY(${scrolled * speed}px)`;
        });
    }
});

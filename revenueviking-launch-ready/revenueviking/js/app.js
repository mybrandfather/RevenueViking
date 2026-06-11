/* ============================================================
   REVENUEVIKING AI — APP.JS
   ============================================================ */

// ── NAV ──────────────────────────────────────────────────────
const nav = document.getElementById('main-nav');
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobile-nav');

window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 30);
});

hamburger?.addEventListener('click', () => {
  mobileNav?.classList.toggle('open');
  const bars = hamburger.querySelectorAll('span');
  if (mobileNav?.classList.contains('open')) {
    bars[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
    bars[1].style.opacity = '0';
    bars[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
  } else {
    bars.forEach(b => { b.style.transform = ''; b.style.opacity = ''; });
  }
});

// Close mobile nav on link click
mobileNav?.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mobileNav.classList.remove('open');
    hamburger?.querySelectorAll('span').forEach(b => { b.style.transform = ''; b.style.opacity = ''; });
  });
});

// ── SCROLL REVEAL ────────────────────────────────────────────
const revealEls = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), (e.target.dataset.delay || 0) * 1);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach(el => revealObs.observe(el));

// ── ACTIVE NAV LINK ──────────────────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
window.addEventListener('scroll', () => {
  let cur = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 100) cur = s.id; });
  navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + cur));
});

// ── REVENUE COUNTER (signature element) ──────────────────────
const industries = [
  { name: 'HVAC Companies',      missedPerDay: 8,  avgJob: 380 },
  { name: 'Plumbing Companies',  missedPerDay: 6,  avgJob: 310 },
  { name: 'Roofing Contractors', missedPerDay: 5,  avgJob: 850 },
  { name: 'Electricians',        missedPerDay: 7,  avgJob: 295 },
  { name: 'Landscapers',         missedPerDay: 4,  avgJob: 220 },
  { name: 'Cleaning Services',   missedPerDay: 5,  avgJob: 180 },
];

let industryIndex = 0;
let counterValue = 0;
let counterTarget = 0;
let counterInterval;

function setIndustry(idx) {
  const ind = industries[idx];
  counterTarget = ind.missedPerDay * ind.avgJob * 30; // monthly loss
  const indEl = document.getElementById('rc-industry');
  if (indEl) indEl.textContent = ind.name + ' — estimated monthly loss from missed calls';
}

function animateCounter() {
  clearInterval(counterInterval);
  counterInterval = setInterval(() => {
    const diff = counterTarget - counterValue;
    const step = Math.max(1, Math.floor(Math.abs(diff) / 20));
    counterValue += diff > 0 ? step : -step;
    if (Math.abs(counterValue - counterTarget) < step) counterValue = counterTarget;
    const el = document.getElementById('rc-amount');
    if (el) el.textContent = '$' + counterValue.toLocaleString();
    if (counterValue === counterTarget) clearInterval(counterInterval);
  }, 16);
}

function cycleIndustry() {
  setIndustry(industryIndex);
  animateCounter();
  industryIndex = (industryIndex + 1) % industries.length;
}

// Start cycling after page load
window.addEventListener('load', () => {
  setIndustry(0);
  counterValue = 0;
  animateCounter();
  industryIndex = 1;
  setInterval(cycleIndustry, 3500);
});

// ── FAQ ──────────────────────────────────────────────────────
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-q')?.addEventListener('click', () => {
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

// ── FORM VALIDATION + SUBMISSION ─────────────────────────────
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function validatePhone(phone) {
  // Optional field; if present must have at least 7 digits
  if (!phone) return true;
  return (phone.match(/\d/g) || []).length >= 7;
}
function showFieldError(input, message) {
  clearFieldError(input);
  input.style.borderColor = 'var(--danger)';
  const err = document.createElement('div');
  err.className = 'field-error';
  err.style.cssText = 'color:var(--danger);font-size:0.78rem;margin-top:5px';
  err.textContent = message;
  input.parentElement.appendChild(err);
}
function clearFieldError(input) {
  input.style.borderColor = '';
  const existing = input.parentElement.querySelector('.field-error');
  if (existing) existing.remove();
}

function handleFormSubmit(e, redirectUrl) {
  e.preventDefault();
  const form = e.target;

  // Honeypot spam protection — if hidden field filled, silently abort
  const honeypot = form.querySelector('input[name="company_website_hp"]');
  if (honeypot && honeypot.value.trim() !== '') {
    console.warn('Spam detected via honeypot.');
    return;
  }

  // Validate required fields
  let valid = true;
  form.querySelectorAll('[required]').forEach(input => {
    clearFieldError(input);
    if (!input.value.trim()) {
      showFieldError(input, 'This field is required.');
      valid = false;
    }
  });

  // Validate email format
  const emailInput = form.querySelector('input[type=email]');
  if (emailInput && emailInput.value && !validateEmail(emailInput.value)) {
    showFieldError(emailInput, 'Please enter a valid email address.');
    valid = false;
  }

  // Validate phone if present
  const phoneInput = form.querySelector('input[type=tel]');
  if (phoneInput && phoneInput.value && !validatePhone(phoneInput.value)) {
    showFieldError(phoneInput, 'Please enter a valid phone number.');
    valid = false;
  }

  if (!valid) {
    const firstError = form.querySelector('.field-error');
    if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const btn = form.querySelector('[type=submit]');
  const originalText = btn.textContent;
  btn.textContent = 'Sending...';
  btn.disabled = true;

  // TODO: Replace with real Supabase/API POST. Example:
  // await fetch('/api/lead', { method:'POST', body: new FormData(form) });
  setTimeout(() => {
    btn.textContent = '✓ Sent!';
    setTimeout(() => {
      if (redirectUrl) window.location.href = redirectUrl;
      else { btn.textContent = originalText; btn.disabled = false; form.reset(); showNotif('✅ Message sent! We\'ll be in touch within 24 hours.'); }
    }, 800);
  }, 1200);
}

// Clear errors as user types
document.addEventListener('input', (e) => {
  if (e.target.matches('.form-input, .form-select, .form-textarea')) clearFieldError(e.target);
});

document.querySelectorAll('.contact-form').forEach(form => {
  form.addEventListener('submit', (e) => handleFormSubmit(e, 'thank-you.html'));
});

document.querySelectorAll('.demo-form').forEach(form => {
  form.addEventListener('submit', (e) => handleFormSubmit(e, 'thank-you.html'));
});

// ── NOTIFICATION ─────────────────────────────────────────────
let notifTimeout;
function showNotif(msg) {
  let n = document.getElementById('notif');
  if (!n) {
    n = document.createElement('div');
    n.id = 'notif';
    n.className = 'notif';
    document.body.appendChild(n);
  }
  n.textContent = msg;
  n.classList.add('show');
  clearTimeout(notifTimeout);
  notifTimeout = setTimeout(() => n.classList.remove('show'), 4000);
}

// ── PRICING CTA BUTTONS ──────────────────────────────────────
document.querySelectorAll('.price-cta').forEach(btn => {
  btn.addEventListener('click', () => {
    window.location.href = 'book-demo.html';
  });
});

// ── COOKIE BANNER ────────────────────────────────────────────
function initCookieBanner() {
  if (localStorage.getItem('rv_cookies_accepted')) return;
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;
  banner.style.display = 'flex';
  document.getElementById('accept-cookies')?.addEventListener('click', () => {
    localStorage.setItem('rv_cookies_accepted', '1');
    banner.style.display = 'none';
  });
  document.getElementById('decline-cookies')?.addEventListener('click', () => {
    banner.style.display = 'none';
  });
}
window.addEventListener('DOMContentLoaded', initCookieBanner);

// ── SMOOTH SCROLL FOR CTA BUTTONS ───────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ── REVENUE LOSS CALCULATOR ──────────────────────────────────
function runCalc() {
  const calls  = parseFloat(document.getElementById('calc-calls')?.value)  || 0;
  const missed = parseFloat(document.getElementById('calc-missed')?.value) || 0;
  const value  = parseFloat(document.getElementById('calc-value')?.value)  || 0;
  const cappedMissed = Math.min(missed, calls);
  const jobsLost = cappedMissed / 3;           // ~1 in 3 calls becomes a job
  const lost = Math.round(jobsLost * value);
  const recover = Math.round(lost * 0.7);      // conservative 70% recovery
  const lostEl = document.getElementById('calc-lost');
  const recEl  = document.getElementById('calc-recover');
  const subEl  = document.getElementById('calc-lost-sub');
  if (lostEl) lostEl.textContent = '$' + lost.toLocaleString();
  if (recEl)  recEl.textContent  = '$' + recover.toLocaleString();
  if (subEl)  subEl.textContent  = '~' + Math.round(jobsLost) + ' jobs lost to missed calls';
}
window.addEventListener('DOMContentLoaded', runCalc);

// ── AUDIO DEMO TRANSCRIPT PLAYBACK ───────────────────────────
const demoState = {};
function playDemo(id, btn) {
  const transcript = document.getElementById(id + '-transcript');
  const progress   = document.getElementById(id + '-progress');
  if (!transcript) return;

  // Toggle off if already playing
  if (demoState[id]?.playing) {
    clearInterval(demoState[id].timer);
    demoState[id].playing = false;
    btn.textContent = '▶';
    return;
  }

  const lines = transcript.querySelectorAll('[data-line]');
  lines.forEach(l => { l.style.opacity = '0.15'; l.style.transition = 'opacity 0.4s'; });

  let i = 0;
  const total = lines.length;
  const stepMs = 2200;
  demoState[id] = { playing: true };
  btn.textContent = '⏸';
  if (progress) progress.style.width = '0%';

  demoState[id].timer = setInterval(() => {
    if (i < total) {
      lines[i].style.opacity = '1';
      lines[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      if (progress) progress.style.width = Math.round(((i + 1) / total) * 100) + '%';
      i++;
    } else {
      clearInterval(demoState[id].timer);
      demoState[id].playing = false;
      btn.textContent = '▶';
    }
  }, stepMs);
}

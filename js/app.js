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
  hamburger.setAttribute('aria-expanded', mobileNav?.classList.contains('open') ? 'true' : 'false');
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
    hamburger?.setAttribute('aria-expanded', 'false');
    hamburger?.querySelectorAll('span').forEach(b => { b.style.transform = ''; b.style.opacity = ''; });
  });
});

// ── DEFERRED HERO VIDEO ─────────────────────────────────────
// Mobile and reduced-motion visitors keep the lightweight poster frame.
function initHeroVideo() {
  const video = document.querySelector('.hero-video');
  if (!video) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopViewport = window.matchMedia('(min-width: 769px)');
  if (reducedMotion.matches || !desktopViewport.matches) return;

  const loadVideo = () => {
    video.querySelectorAll('source[data-src]').forEach(source => {
      source.src = source.dataset.src;
      source.removeAttribute('data-src');
    });
    video.load();
    video.play().catch(() => {
      // Autoplay can be restricted by browser policy; the poster remains visible.
    });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(loadVideo, { timeout: 1400 });
  } else {
    window.setTimeout(loadVideo, 600);
  }
}
window.addEventListener('DOMContentLoaded', initHeroVideo);

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

// ── FAQ ──────────────────────────────────────────────────────
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-q')?.addEventListener('click', () => {
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

// ── CONTACT + DEMO FORM SUBMISSION ───────────────────────────
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

function setFormStatus(form, message, type = 'error') {
  let status = form.querySelector('.form-status');
  if (!status) {
    status = document.createElement('div');
    status.className = 'form-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    form.appendChild(status);
  }
  status.classList.toggle('success', type === 'success');
  status.innerHTML = message;
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  setFormStatus(form, '', 'success');

  const honeypot = form.querySelector('input[name="company_website_hp"]');
  if (honeypot?.value.trim()) return;

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

  const payload = Object.fromEntries(new FormData(form).entries());
  payload.source = window.location.href;

  submitButton.disabled = true;
  submitButton.dataset.originalText = submitButton.textContent;
  submitButton.textContent = 'Sending…';

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.message || 'Submission failed');
    setFormStatus(form, 'Your request was received. Redirecting…', 'success');
    window.location.assign('thank-you.html');
  } catch {
    setFormStatus(form, 'We couldn’t send your request right now. Please email <a href="mailto:hello@revenueviking.com">hello@revenueviking.com</a>.');
    submitButton.disabled = false;
    submitButton.textContent = submitButton.dataset.originalText;
  }
}

// Clear errors as user types
document.addEventListener('input', (e) => {
  if (e.target.matches('.form-input, .form-select, .form-textarea')) clearFieldError(e.target);
});

document.querySelectorAll('.contact-form').forEach(form => {
  const started = form.querySelector('input[name="form_started_at"]');
  if (started) started.value = Date.now().toString();
  form.addEventListener('submit', (e) => handleFormSubmit(e));
});

document.querySelectorAll('.demo-form').forEach(form => {
  const started = form.querySelector('input[name="form_started_at"]');
  if (started) started.value = Date.now().toString();
  form.addEventListener('submit', (e) => handleFormSubmit(e));
});

// Add the business email once to each footer without crowding page CTAs.
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.footer-brand').forEach(footerBrand => {
    if (footerBrand.querySelector('.footer-email')) return;
    const email = document.createElement('a');
    email.className = 'footer-email';
    email.href = 'mailto:hello@revenueviking.com';
    email.textContent = 'hello@revenueviking.com';
    footerBrand.appendChild(email);
  });
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
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
  });
});

// ── MISSED-CALL OPPORTUNITY CALCULATOR ──────────────────────
function runCalc() {
  const calls = Math.max(0, parseFloat(document.getElementById('calc-calls')?.value) || 0);
  const missed = Math.max(0, parseFloat(document.getElementById('calc-missed')?.value) || 0);
  const conversion = Math.min(100, Math.max(0, parseFloat(document.getElementById('calc-conversion')?.value) || 0));
  const value = Math.max(0, parseFloat(document.getElementById('calc-value')?.value) || 0);
  const cappedMissed = Math.min(missed, calls);
  const opportunities = cappedMissed * (conversion / 100);
  const representedRevenue = Math.round(opportunities * value);
  const revenueEl = document.getElementById('calc-lost');
  const oppEl = document.getElementById('calc-opportunities');
  const subEl = document.getElementById('calc-lost-sub');
  if (revenueEl) revenueEl.textContent = '$' + representedRevenue.toLocaleString();
  if (oppEl) oppEl.textContent = opportunities.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (subEl) subEl.textContent = `Based on ${cappedMissed.toLocaleString()} missed calls and a ${conversion}% lead-to-customer rate`;
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

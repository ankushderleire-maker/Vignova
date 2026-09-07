'use strict';
const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu() { mobileNav.hidden = true; menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.setAttribute('aria-label', 'Open menu'); }
menuToggle.addEventListener('click', () => { const isOpen = menuToggle.getAttribute('aria-expanded') === 'true'; mobileNav.hidden = isOpen; menuToggle.setAttribute('aria-expanded', String(!isOpen)); menuToggle.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu'); });
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuToggle.focus(); } });
window.matchMedia('(min-width: 901px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
document.querySelectorAll('[data-year]').forEach(element => { element.textContent = new Date().getFullYear(); });

// Remember the local animation preference. Analytics consent is handled separately.
const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionButton = document.querySelector('.motion-toggle');
let manualPause = false;
try { manualPause = localStorage.getItem('vignova-pause-motion') === 'true'; } catch { /* Storage may be disabled. */ }
function updateMotion() {
  const paused = reducedMotion.matches || manualPause;
  root.classList.toggle('motion-paused', paused);
  if (!motionButton) return;
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.disabled = reducedMotion.matches;
  motionButton.textContent = reducedMotion.matches ? 'Reduced motion enabled' : paused ? 'Play animations ▷' : 'Pause animations Ⅱ';
}
if (motionButton) motionButton.addEventListener('click', () => {
  manualPause = !manualPause;
  try { localStorage.setItem('vignova-pause-motion', String(manualPause)); } catch { /* Keep working without storage. */ }
  updateMotion();
});
reducedMotion.addEventListener('change', updateMotion);
updateMotion();

if ('IntersectionObserver' in window && !reducedMotion.matches && !manualPause) {
  try {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
    root.classList.add('scroll-reveal-enabled');
  } catch { root.classList.remove('scroll-reveal-enabled'); }
}

// A quiet gradient progress line follows the reader down the page.
let scrollQueued = false;
function updateProgress() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  root.style.setProperty('--reading-progress', maxScroll > 0 ? String(Math.min(1, Math.max(0, window.scrollY / maxScroll))) : '0');
  scrollQueued = false;
}
window.addEventListener('scroll', () => {
  if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateProgress); }
}, { passive: true });
window.addEventListener('resize', updateProgress, { passive: true });
updateProgress();

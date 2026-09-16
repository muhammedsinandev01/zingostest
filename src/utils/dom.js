/** Small DOM helpers shared by the components. */

export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Escapes text before it goes into an innerHTML template. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Event delegation: on(root, 'click', '[data-add]', handler). */
export function on(root, type, selector, handler) {
  root.addEventListener(type, (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(event, target);
  });
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab inside an open overlay and restores focus to whatever opened it.
 * Returns a release function.
 */
export function trapFocus(container) {
  const previouslyFocused = document.activeElement;

  const onKeydown = (event) => {
    if (event.key !== 'Tab') return;
    const focusable = qsa(FOCUSABLE, container).filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  container.addEventListener('keydown', onKeydown);
  const initial = qs('[data-autofocus]', container) || qsa(FOCUSABLE, container)[0];
  initial?.focus({ preventScroll: true });

  return () => {
    container.removeEventListener('keydown', onKeydown);
    previouslyFocused?.focus?.({ preventScroll: true });
  };
}

/** Locks body scroll while an overlay is open, without a layout jump. */
/**
 * Locks by overlay name rather than by counting calls. A counter gets stuck
 * the moment one overlay locks twice and unlocks once - which strands the
 * page with `overflow: hidden` and no way for the customer to scroll. Names
 * make a double lock a no-op, so the page can only stay locked while an
 * overlay really is open.
 */
const scrollLocks = new Set();

export function lockScroll(key = 'overlay') {
  if (scrollLocks.has(key)) return;
  if (scrollLocks.size === 0) {
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = gap > 0 ? `${gap}px` : '';
    document.body.classList.add('is-locked');
  }
  scrollLocks.add(key);
}

export function unlockScroll(key = 'overlay') {
  if (!scrollLocks.delete(key) || scrollLocks.size > 0) return;
  document.body.style.paddingRight = '';
  document.body.classList.remove('is-locked');
}

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Adds .is-visible to elements as they scroll into view. */
export function revealOnScroll(root = document) {
  const targets = qsa('[data-reveal]', root);
  if (!targets.length) return;
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  targets.forEach((el) => observer.observe(el));
}

/** Smooth scroll that accounts for the sticky navbar. */
export function scrollToSection(selector) {
  const target = qs(selector);
  if (!target) return;
  const navHeight = qs('.navbar')?.offsetHeight ?? 72;
  const top = target.getBoundingClientRect().top + window.scrollY - navHeight + 1;
  window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

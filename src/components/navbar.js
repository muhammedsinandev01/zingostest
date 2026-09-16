import { icons } from './icons.js';
import { subscribe } from '../utils/cart.js';
import { qs, qsa, on, scrollToSection } from '../utils/dom.js';

const LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#menu', label: 'Menu' },
  { href: '#about', label: 'About' },
  { href: '#location', label: 'Location' },
];

export function renderNavbar(root) {
  root.className = 'navbar';
  root.innerHTML = `
    <nav class="wrap navbar__inner" aria-label="Main">
      <a class="navbar__logo" href="#home" aria-label="ZINGOS Fried Chicken - home">
        <img src="/images/logo/zingos-logo.png" alt="ZINGOS Fried Chicken" width="132" height="63" />
      </a>

      <ul class="navbar__links">
        ${LINKS.map((link) => `<li><a href="${link.href}" data-nav>${link.label}</a></li>`).join('')}
      </ul>

      <div class="navbar__actions">
        <button class="cart-button" type="button" data-open-cart aria-label="Open cart">
          ${icons.cart}
          <span class="cart-button__count" data-cart-count hidden>0</span>
        </button>
        <a class="btn btn--sm" href="#menu" data-nav>Order Now</a>
        <button class="navbar__burger" type="button" data-burger aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu">
          <span></span>
        </button>
      </div>
    </nav>

    <div class="mobile-menu" id="mobile-menu" data-mobile-menu>
      ${LINKS.map((link) => `<a href="${link.href}" data-nav>${link.label}</a>`).join('')}
      <a class="btn btn--block" href="#menu" data-nav>Order Now</a>
    </div>
  `;

  const burger = qs('[data-burger]', root);
  const mobileMenu = qs('[data-mobile-menu]', root);

  const closeMobile = () => {
    root.classList.remove('is-open');
    mobileMenu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
  };

  burger.addEventListener('click', () => {
    const open = !mobileMenu.classList.contains('is-open');
    root.classList.toggle('is-open', open);
    mobileMenu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  on(root, 'click', '[data-nav]', (event, link) => {
    const href = link.getAttribute('href');
    if (!href?.startsWith('#')) return;
    event.preventDefault();
    closeMobile();
    scrollToSection(href);
    history.replaceState(null, '', href);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMobile();
  });

  /* Compact on scroll ----------------------------------------------------- */
  const onScroll = () => root.classList.toggle('is-stuck', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Cart badge ------------------------------------------------------------ */
  const badge = qs('[data-cart-count]', root);
  const button = qs('.cart-button', root);
  let previous = null;
  subscribe(({ count }) => {
    badge.textContent = String(count);
    badge.hidden = count === 0;
    button.setAttribute('aria-label', count ? `Open cart, ${count} item${count === 1 ? '' : 's'}` : 'Open cart');
    if (previous !== null && count > previous) {
      button.classList.remove('is-bumping');
      void button.offsetWidth;
      button.classList.add('is-bumping');
    }
    previous = count;
  });

  /* Highlight the section currently in view ------------------------------- */
  const sections = LINKS.map((link) => qs(link.href)).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = `#${entry.target.id}`;
          qsa('[data-nav]', root).forEach((link) =>
            link.classList.toggle('is-active', link.getAttribute('href') === id),
          );
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((section) => observer.observe(section));
  }
}

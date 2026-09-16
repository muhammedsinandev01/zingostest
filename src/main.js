/**
 * ZINGOS Fried Chicken - app entry point.
 *
 * Renders the page sections, then wires the three things that make it an
 * ordering site: add-to-cart, the product sheet and the cart drawer.
 */

import './styles/global.css';
import './styles/navbar.css';
import './styles/hero.css';
import './styles/menu.css';
import './styles/sections.css';
import './styles/modal.css';
import './styles/cart.css';
import './styles/checkout.css';

import { CONFIG, isPlaceholder, postalAddress } from './config.js';
import { getProduct, hasChoices, getPrice, defaultSelection } from './data/menu.js';
import { addItem } from './utils/cart.js';
import { qs, on, revealOnScroll, scrollToSection } from './utils/dom.js';

import { renderNavbar } from './components/navbar.js';
import { renderHero } from './components/hero.js';
import { renderFeatured } from './components/featured.js';
import { renderMenu, renderCategories, menuJsonLd } from './components/menu.js';
import { renderAbout, renderOrderCta } from './components/about.js';
import { renderLocation } from './components/location.js';
import { renderFooter } from './components/footer.js';
import { openProductModal } from './components/productModal.js';
import { openCart, renderCartBar } from './components/cart.js';
import { toast } from './components/toast.js';

/* Sections ----------------------------------------------------------------- */
renderNavbar(qs('[data-navbar]'));
renderHero(qs('[data-hero]'));
renderCategories(qs('[data-categories]'));
renderFeatured(qs('[data-featured]'));
renderMenu(qs('[data-menu]'));
renderAbout(qs('[data-about]'));
renderOrderCta(qs('[data-order-cta]'));
renderLocation(qs('[data-location]'));
renderFooter(qs('[data-footer]'));
renderCartBar();

/* Add to cart -------------------------------------------------------------- */
on(document, 'click', '[data-add]', (event, button) => {
  event.preventDefault();
  const product = getProduct(button.dataset.add);
  if (!product) return;

  // Anything with a choice to make opens the sheet first - nothing is ever
  // added to the cart with a variant picked for the customer.
  if (hasChoices(product)) {
    openProductModal(product.id);
    return;
  }

  addItem({
    productId: product.id,
    name: product.name,
    variant: '',
    selection: {},
    basePrice: getPrice(product, defaultSelection(product)),
    addons: [],
    quantity: 1,
    image: product.image,
  });
  toast('Added to cart 🍗', { image: product.image ?? '/images/logo/zingos-mark.png' });
});

on(document, 'click', '[data-open-product]', (event, button) => {
  event.preventDefault();
  openProductModal(button.dataset.openProduct);
});

on(document, 'click', '[data-open-cart]', (event) => {
  event.preventDefault();
  openCart();
});

/* In-page navigation outside the navbar ------------------------------------ */
on(document, 'click', '[data-nav]', (event, link) => {
  if (event.defaultPrevented) return; // already handled by the navbar
  const href = link.getAttribute('href');
  if (!href?.startsWith('#')) return;
  event.preventDefault();
  scrollToSection(href);
  history.replaceState(null, '', href);
});

/* Scroll reveal ------------------------------------------------------------ */
revealOnScroll();

/* Structured data ---------------------------------------------------------- */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: CONFIG.restaurantName,
  servesCuisine: ['Fried Chicken', 'Fast Food', 'Pizza', 'Burgers'],
  priceRange: '₹₹',
  image: '/favicon-512.png',
  hasMenu: menuJsonLd(),
  ...(postalAddress() ? { address: postalAddress() } : {}),
  ...(isPlaceholder(CONFIG.phone) ? {} : { telephone: CONFIG.phone }),
  ...(isPlaceholder(CONFIG.googleMapsUrl) ? {} : { hasMap: CONFIG.googleMapsUrl }),
  ...(isPlaceholder(CONFIG.openingHoursSpec) ? {} : { openingHours: CONFIG.openingHoursSpec }),
  ...(isPlaceholder(CONFIG.instagramUrl) && isPlaceholder(CONFIG.facebookUrl)
    ? {}
    : { sameAs: [CONFIG.instagramUrl, CONFIG.facebookUrl].filter((url) => !isPlaceholder(url)) }),
};
const script = document.createElement('script');
script.type = 'application/ld+json';
script.textContent = JSON.stringify(jsonLd);
document.head.append(script);

/* Deep link: /#menu and friends should land in the right place -------------- */
if (location.hash) {
  requestAnimationFrame(() => scrollToSection(location.hash));
}

/* One-time heads-up for the person setting the site up --------------------- */
if (import.meta.env.DEV && isPlaceholder(CONFIG.whatsappNumber)) {
  console.warn(
    '[ZINGOS] WhatsApp orders are disabled: set `whatsappNumber` in src/config.js ' +
      '(digits only with country code, e.g. 919876543210).',
  );
}

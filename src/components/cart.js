/**
 * Cart drawer.
 *
 * Owns the four-step order flow - cart → details → review → sent - as one
 * sliding panel rather than separate pages, so the customer never loses the
 * menu behind them.
 */

import { CONFIG } from '../config.js';
import {
  subscribe,
  getItems,
  itemCount,
  subtotal,
  deliveryFee,
  lineTotal,
  increment,
  decrement,
  removeItem,
  clearCart,
  isEmpty,
} from '../utils/cart.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { openWhatsApp, isWhatsAppConfigured } from '../utils/whatsapp.js';
import {
  escapeHtml,
  qs,
  on,
  trapFocus,
  lockScroll,
  unlockScroll,
  scrollToSection,
} from '../utils/dom.js';
import { icons } from './icons.js';
import { toast } from './toast.js';
import {
  checkoutHtml,
  readForm,
  validate,
  showErrors,
  buildOrder,
  reviewHtml,
  sentHtml,
  fallbackHtml,
  buildOrderMessage,
  draft,
} from './checkout.js';

const MARK = '/images/logo/zingos-mark.png';
const STEPS = [
  { id: 'cart', label: 'Cart' },
  { id: 'checkout', label: 'Details' },
  { id: 'review', label: 'Review' },
];

let overlay;
let releaseFocus = null;
let step = 'cart';
let lastMessage = '';

/* -------------------------------------------------------------------------- */
/* Views                                                                       */
/* -------------------------------------------------------------------------- */

const emptyHtml = () => `
  <div class="cart-empty">
    <div class="cart-empty__art"><img src="${MARK}" alt="" width="70" height="106" /></div>
    <h3>Your cart is hungry</h3>
    <p>Add something crispy from the menu and it will show up right here.</p>
    <button class="btn" type="button" data-explore>Explore menu ${icons.arrowRight}</button>
  </div>`;

const lineHtml = (item) => `
  <article class="cart-line">
    <div class="cart-line__media${item.image ? '' : ' cart-line__media--placeholder'}">
      <img src="${item.image ?? MARK}" alt="" width="120" height="120" loading="lazy" />
    </div>
    <div class="cart-line__body">
      <h4 class="cart-line__name">${escapeHtml(item.name)}</h4>
      ${item.variant ? `<p class="cart-line__variant">${escapeHtml(item.variant)}</p>` : ''}
      ${
        item.addons?.length
          ? `<ul class="cart-line__addons">${item.addons
              .map((addon) => `<li>${escapeHtml(addon.name)} ${formatCurrency(addon.price)}</li>`)
              .join('')}</ul>`
          : ''
      }
      <div class="cart-line__foot">
        <div class="stepper">
          <button type="button" data-dec="${item.id}" aria-label="Decrease quantity of ${escapeHtml(item.name)}">−</button>
          <output aria-live="polite">${item.quantity}</output>
          <button type="button" data-inc="${item.id}" aria-label="Increase quantity of ${escapeHtml(item.name)}">+</button>
        </div>
        <span class="cart-line__price">${formatCurrency(lineTotal(item))}</span>
      </div>
      <button class="cart-line__remove" type="button" data-remove="${item.id}">Remove</button>
    </div>
  </article>`;

function totalsHtml({ showDelivery, orderType }) {
  const fee = deliveryFee(orderType);
  const sub = subtotal();
  return `
    <div class="cart-totals">
      <div class="cart-totals__row"><span>Subtotal</span><span>${formatCurrency(sub)}</span></div>
      ${
        showDelivery && orderType === 'delivery'
          ? fee > 0
            ? `<div class="cart-totals__row"><span>Delivery</span><span>${formatCurrency(fee)}</span></div>`
            : `<div class="cart-totals__row cart-totals__row--note"><span>Delivery fee will be confirmed by the restaurant</span><span>—</span></div>`
          : ''
      }
      ${
        !showDelivery
          ? `<div class="cart-totals__row cart-totals__row--note"><span>Delivery fee, if any, is confirmed by the restaurant</span><span></span></div>`
          : ''
      }
      <div class="cart-totals__row cart-totals__row--total"><span>Total</span><span>${formatCurrency(sub + fee)}</span></div>
    </div>`;
}

function stepsHtml() {
  const index = STEPS.findIndex((entry) => entry.id === step);
  if (index < 0) return '';
  return `<ol class="steps">${STEPS.map(
    (entry, i) =>
      `<li class="${i === index ? 'is-current' : i < index ? 'is-done' : ''}">${entry.label}</li>`,
  ).join('')}</ol>`;
}

function bodyHtml() {
  if (step === 'cart') {
    return isEmpty() ? emptyHtml() : getItems().map(lineHtml).join('');
  }
  if (step === 'checkout') return checkoutHtml();
  if (step === 'review') return reviewHtml(buildOrder());
  if (step === 'sent') return sentHtml();
  if (step === 'fallback') return fallbackHtml(lastMessage);
  return '';
}

function footHtml() {
  if (step === 'cart') {
    if (isEmpty()) return '';
    return `
      <div class="overlay__foot">
        ${totalsHtml({ showDelivery: false })}
        <button class="btn btn--block btn--lg" type="button" data-go="checkout">
          Checkout ${icons.arrowRight}
        </button>
      </div>`;
  }

  if (step === 'checkout') {
    return `
      <div class="overlay__foot">
        ${totalsHtml({ showDelivery: true, orderType: draft.orderType })}
        <button class="btn btn--block btn--lg" type="button" data-go="review">
          Review order ${icons.arrowRight}
        </button>
      </div>`;
  }

  if (step === 'review') {
    return `
      <div class="overlay__foot">
        ${totalsHtml({ showDelivery: true, orderType: draft.orderType })}
        <button class="btn btn--block btn--lg" type="button" data-send>
          ${icons.whatsapp} Order on WhatsApp
        </button>
        <p class="field__hint" style="text-align:center;margin-top:.6rem">
          Opens WhatsApp with your order — you still press Send there.
        </p>
      </div>`;
  }

  return '';
}

const TITLES = {
  cart: 'Your cart',
  checkout: 'Your details',
  review: 'Review order',
  sent: 'Almost there',
  fallback: 'Order ready',
};

function render() {
  const count = itemCount();
  const canGoBack = step === 'checkout' || step === 'review';

  overlay.innerHTML = `
    <div class="overlay__scrim" data-close></div>
    <div class="overlay__panel" role="dialog" aria-modal="true" aria-label="${TITLES[step]}">
      <header class="overlay__head">
        ${canGoBack ? `<button class="overlay__back" type="button" data-back aria-label="Go back">${icons.back}</button>` : ''}
        <div>
          <p class="overlay__title">${TITLES[step]}</p>
          ${step === 'cart' ? `<p class="overlay__sub">${count} item${count === 1 ? '' : 's'}</p>` : ''}
        </div>
        <button class="overlay__close" type="button" data-close aria-label="Close cart">${icons.close}</button>
      </header>
      ${stepsHtml()}
      <div class="overlay__body">${bodyHtml()}</div>
      ${footHtml()}
    </div>
  `;

  releaseFocus?.();
  releaseFocus = trapFocus(overlay);
}

/* -------------------------------------------------------------------------- */
/* Flow                                                                        */
/* -------------------------------------------------------------------------- */

function goTo(next) {
  if (next === 'checkout' && isEmpty()) return;

  if (next === 'review') {
    const form = qs('[data-checkout-form]', overlay);
    const values = readForm(form);
    const errors = validate(values);
    if (Object.keys(errors).length) {
      showErrors(form, errors);
      return;
    }
  }

  step = next;
  render();
  qs('.overlay__body', overlay)?.scrollTo({ top: 0 });
}

function send() {
  const order = buildOrder();
  lastMessage = buildOrderMessage(order);

  if (!isWhatsAppConfigured()) {
    step = 'fallback';
    render();
    return;
  }

  openWhatsApp(lastMessage);
  step = 'sent';
  render();
}

/* -------------------------------------------------------------------------- */
/* Mount                                                                       */
/* -------------------------------------------------------------------------- */

function ensureOverlay() {
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.className = 'overlay cart-drawer';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.append(overlay);

  on(overlay, 'click', '[data-close]', closeCart);
  on(overlay, 'click', '[data-back]', () => goTo(step === 'review' ? 'checkout' : 'cart'));
  on(overlay, 'click', '[data-go]', (event, button) => goTo(button.dataset.go));
  on(overlay, 'click', '[data-send]', send);
  on(overlay, 'click', '[data-inc]', (event, button) => increment(button.dataset.inc));
  on(overlay, 'click', '[data-dec]', (event, button) => decrement(button.dataset.dec));
  on(overlay, 'click', '[data-remove]', (event, button) => removeItem(button.dataset.remove));

  on(overlay, 'click', '[data-explore]', () => {
    closeCart();
    scrollToSection('#menu');
  });

  on(overlay, 'click', '[data-resend]', () => openWhatsApp(lastMessage));

  on(overlay, 'click', '[data-clear-cart]', () => {
    clearCart();
    step = 'cart';
    render();
    toast('Cart cleared');
  });

  on(overlay, 'click', '[data-copy-order]', async (event, button) => {
    try {
      await navigator.clipboard.writeText(lastMessage);
      button.innerHTML = `${icons.check} Copied`;
    } catch {
      const textarea = qs('[data-order-text]', overlay);
      textarea?.select();
      button.innerHTML = `${icons.copy} Press Ctrl/Cmd + C`;
    }
  });

  // Show or hide the delivery-only fields as the order type changes.
  on(overlay, 'change', 'input[name="orderType"]', (event, input) => {
    draft.orderType = input.value;
    const fields = qs('[data-delivery-fields]', overlay);
    if (fields) fields.hidden = input.value !== 'delivery';
    const foot = qs('.overlay__foot', overlay);
    if (foot) {
      const totals = qs('.cart-totals', foot);
      totals?.replaceWith(
        document
          .createRange()
          .createContextualFragment(totalsHtml({ showDelivery: true, orderType: input.value })),
      );
    }
  });

  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCart();
  });

  // Keep an open drawer in sync with the cart, but never yank the customer
  // out of a form they are filling in.
  subscribe(() => {
    if (!overlay.classList.contains('is-open')) return;
    if (step === 'cart') render();
  });

  return overlay;
}

export function openCart(startStep = 'cart') {
  ensureOverlay();
  const wasOpen = overlay.classList.contains('is-open');
  step = isEmpty() && startStep !== 'cart' ? 'cart' : startStep;
  render();
  overlay.setAttribute('aria-hidden', 'false');
  if (!wasOpen) lockScroll();
  requestAnimationFrame(() => overlay.classList.add('is-open'));
}

export function closeCart() {
  if (!overlay?.classList.contains('is-open')) return;
  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
  releaseFocus?.();
  releaseFocus = null;
  unlockScroll();
  if (step === 'sent' || step === 'fallback') step = 'cart';
}

/** Floating cart bar for phones. */
export function renderCartBar() {
  const bar = document.createElement('div');
  bar.className = 'cart-bar';
  bar.innerHTML = `
    <button class="cart-bar__btn" type="button" data-open-cart>
      <span class="cart-bar__count" data-bar-count>0</span>
      <span class="cart-bar__text">
        <strong data-bar-total>${CONFIG.currency}0</strong>
        <span data-bar-label>items</span>
      </span>
      <span class="cart-bar__cta">View cart ${icons.arrowRight}</span>
    </button>`;
  document.body.append(bar);

  bar.querySelector('[data-open-cart]').addEventListener('click', () => openCart());

  subscribe(({ count, subtotal: sub }) => {
    qs('[data-bar-count]', bar).textContent = String(count);
    qs('[data-bar-total]', bar).textContent = formatCurrency(sub);
    qs('[data-bar-label]', bar).textContent = count === 1 ? 'item' : 'items';
    bar.classList.toggle('is-visible', count > 0);
    document.body.classList.toggle('has-cart-bar', count > 0);
  });
}

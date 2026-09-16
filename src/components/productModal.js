import {
  getProduct,
  getPrice,
  defaultSelection,
  selectionLabel,
  ADDONS,
} from '../data/menu.js';
import { addItem } from '../utils/cart.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { escapeHtml, qs, qsa, on, trapFocus, lockScroll, unlockScroll } from '../utils/dom.js';
import { icons } from './icons.js';
import { toast } from './toast.js';

const MARK = '/images/logo/zingos-mark.png';

let overlay;
let releaseFocus = null;
let state = null;

/* -------------------------------------------------------------------------- */
/* Markup                                                                      */
/* -------------------------------------------------------------------------- */

function optionsHtml(product) {
  return (product.optionGroups || [])
    .map(
      (group) => `
      <fieldset class="option-group">
        <legend class="option-group__label">
          <h3>${escapeHtml(group.label)}</h3>
          <span class="option-group__req">Required</span>
        </legend>
        <div class="option-list${group.options.length > 2 ? ' option-list--inline' : ''}">
          ${group.options
            .map((option) => {
              const id = `opt-${group.id}-${option.id}`;
              return `
              <label class="option" for="${id}">
                <input type="radio" id="${id}" name="${group.id}" value="${option.id}"
                       data-option-group="${group.id}" ${option.id === state.selection[group.id] ? 'checked' : ''} />
                <span class="option__mark" aria-hidden="true"></span>
                <span class="option__text">
                  ${escapeHtml(option.label)}
                  ${option.tag === 'spicy' ? '<span class="option__note">Peri peri — spicy</span>' : ''}
                </span>
                <span class="option__price" data-option-price="${group.id}:${option.id}"></span>
              </label>`;
            })
            .join('')}
        </div>
      </fieldset>`,
    )
    .join('');
}

function addonsHtml(product) {
  if (!product.addons?.length) return '';
  return `
    <fieldset class="option-group">
      <legend class="option-group__label">
        <h3>Add extras</h3>
        <span class="option-group__req option-group__req--optional">Optional</span>
      </legend>
      <div class="option-list">
        ${product.addons
          .map((addonId) => {
            const addon = ADDONS[addonId];
            if (!addon) return '';
            return `
            <label class="option option--check" for="addon-${addon.id}">
              <input type="checkbox" id="addon-${addon.id}" value="${addon.id}" data-addon />
              <span class="option__mark" aria-hidden="true"></span>
              <span class="option__text">${escapeHtml(addon.name)}</span>
              <span class="option__price">+${formatCurrency(addon.price)}</span>
            </label>`;
          })
          .join('')}
      </div>
    </fieldset>`;
}

function panelHtml(product) {
  const hasPhoto = Boolean(product.image);
  const tags = (product.tags || [])
    .map((tag) =>
      tag === 'spicy'
        ? '<span class="tag tag--spicy">🌶 Spicy</span>'
        : tag === 'veg'
          ? '<span class="tag tag--veg">● Veg</span>'
          : '',
    )
    .join('');

  return `
    <div class="overlay__scrim" data-close></div>
    <div class="overlay__panel" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
      <div class="product-modal__hero${hasPhoto ? '' : ' product-modal__hero--placeholder'}">
        <img class="food" src="${hasPhoto ? product.image : MARK}" alt="${hasPhoto ? escapeHtml(product.name) : ''}"
             width="440" height="330" decoding="async" />
        <button class="overlay__close" type="button" data-close aria-label="Close">${icons.close}</button>
      </div>

      <div class="overlay__body">
        <div class="product-modal__intro">
          <h2 id="product-modal-title">${escapeHtml(product.name)}</h2>
          <p>${escapeHtml(product.description)}</p>
          ${tags ? `<div class="product-modal__tags">${tags}</div>` : ''}
        </div>
        ${optionsHtml(product)}
        ${addonsHtml(product)}
        <div style="height:1.2rem"></div>
      </div>

      <div class="overlay__foot product-modal__foot">
        <div class="stepper">
          <button type="button" data-qty="-1" aria-label="Decrease quantity">−</button>
          <output data-qty-value aria-live="polite">1</output>
          <button type="button" data-qty="1" aria-label="Increase quantity">+</button>
        </div>
        <button class="btn" type="button" data-add-to-cart data-autofocus>
          <span>Add to cart</span>
          <span class="total" data-modal-total></span>
        </button>
      </div>
    </div>
  `;
}

/* -------------------------------------------------------------------------- */
/* Behaviour                                                                   */
/* -------------------------------------------------------------------------- */

function addonList() {
  return [...state.addons].map((id) => ({ ...ADDONS[id] }));
}

function unitTotal() {
  const base = getPrice(state.product, state.selection);
  const extras = addonList().reduce((sum, addon) => sum + addon.price, 0);
  return base + extras;
}

function syncPrices() {
  const { product, selection } = state;

  // Each option shows the price it results in, holding the other groups fixed.
  qsa('[data-option-price]', overlay).forEach((node) => {
    const [groupId, optionId] = node.dataset.optionPrice.split(':');
    const price = getPrice(product, { ...selection, [groupId]: optionId });
    node.textContent = price ? formatCurrency(price) : '';
  });

  qs('[data-qty-value]', overlay).textContent = String(state.quantity);
  qs('[data-modal-total]', overlay).textContent = formatCurrency(unitTotal() * state.quantity);
  qs('[data-qty="-1"]', overlay).disabled = state.quantity <= 1;
}

function close() {
  if (!overlay?.classList.contains('is-open')) return;
  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
  releaseFocus?.();
  releaseFocus = null;
  unlockScroll('product');
  state = null;
}

function commit() {
  const { product, selection, quantity } = state;
  const basePrice = getPrice(product, selection);
  addItem({
    productId: product.id,
    name: product.name,
    variant: selectionLabel(product, selection),
    selection,
    basePrice,
    addons: addonList(),
    quantity,
    image: product.image,
  });
  toast('Added to cart 🍗', { image: product.image ?? MARK });
  close();
}

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.className = 'overlay product-modal';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.append(overlay);

  on(overlay, 'click', '[data-close]', close);

  on(overlay, 'change', 'input[data-option-group]', (event, input) => {
    state.selection[input.dataset.optionGroup] = input.value;
    syncPrices();
  });

  on(overlay, 'change', 'input[data-addon]', (event, input) => {
    if (input.checked) state.addons.add(input.value);
    else state.addons.delete(input.value);
    syncPrices();
  });

  on(overlay, 'click', '[data-qty]', (event, button) => {
    state.quantity = Math.min(99, Math.max(1, state.quantity + Number(button.dataset.qty)));
    syncPrices();
  });

  on(overlay, 'click', '[data-add-to-cart]', commit);

  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  return overlay;
}

/** Opens the product sheet for a menu item. */
export function openProductModal(productId) {
  const product = getProduct(productId);
  if (!product) return;

  ensureOverlay();
  const wasOpen = overlay.classList.contains('is-open');
  state = { product, selection: defaultSelection(product), addons: new Set(), quantity: 1 };
  overlay.innerHTML = panelHtml(product);
  overlay.setAttribute('aria-hidden', 'false');
  if (!wasOpen) lockScroll('product');

  // Next frame, so the opening transition actually runs.
  requestAnimationFrame(() => overlay.classList.add('is-open'));
  syncPrices();
  releaseFocus = trapFocus(overlay);
}

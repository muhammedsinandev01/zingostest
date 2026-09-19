/**
 * Cart state.
 *
 * A tiny observable store kept in localStorage. Everything downstream - the
 * badge, the drawer, the checkout, the WhatsApp message - reads from here, so
 * there is exactly one place where an order total is calculated.
 *
 * Item shape:
 * {
 *   id,          // unique per product + options + add-ons combination
 *   productId,
 *   name,
 *   variant,     // human label, e.g. '6 pcs · Zingos Original' (may be '')
 *   selection,   // { size: '6', flavour: 'original' }
 *   basePrice,   // rupees for one unit, before add-ons
 *   addons,      // [{ id, name, price }]
 *   quantity,
 *   image
 * }
 */

import { deliveryFeeForZone } from '../config.js';

const STORAGE_KEY = 'zingos.cart.v1';

let items = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop anything that does not look like a cart line, so a stale or
    // hand-edited storage entry can never break the page on load.
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        Number.isFinite(item.basePrice) &&
        Number.isFinite(item.quantity) &&
        item.quantity > 0,
    );
  } catch {
    return [];
  }
}

function persist() {
  try {
    if (items.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode / storage full - the cart still works for this session */
  }
}

function emit() {
  persist();
  for (const listener of listeners) listener(getState());
}

/** Subscribe to cart changes. Returns an unsubscribe function. */
export function subscribe(listener) {
  listeners.add(listener);
  listener(getState());
  return () => listeners.delete(listener);
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                     */
/* -------------------------------------------------------------------------- */

/** Price of one unit including its add-ons. */
export const unitPrice = (item) =>
  item.basePrice + (item.addons || []).reduce((sum, addon) => sum + addon.price, 0);

/** Line total: (base + add-ons) × quantity. Add-ons belong to each unit. */
export const lineTotal = (item) => unitPrice(item) * item.quantity;

/**
 * Identity of a cart line. Same product + same options + same add-ons means
 * the quantity goes up; any difference creates a separate line.
 */
export function cartItemId(productId, selection = {}, addons = []) {
  const options = Object.keys(selection)
    .sort()
    .map((key) => `${key}:${selection[key]}`)
    .join(',');
  const extras = addons
    .map((addon) => addon.id)
    .sort()
    .join(',');
  return [productId, options, extras].filter(Boolean).join('#');
}

/* -------------------------------------------------------------------------- */
/* Mutations                                                                   */
/* -------------------------------------------------------------------------- */

export function addItem({ productId, name, variant = '', selection = {}, basePrice, addons = [], quantity = 1, image = null }) {
  const id = cartItemId(productId, selection, addons);
  const existing = items.find((item) => item.id === id);
  if (existing) existing.quantity += quantity;
  else items.push({ id, productId, name, variant, selection, basePrice, addons, quantity, image });
  emit();
  return id;
}

export function setQuantity(id, quantity) {
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  if (quantity <= 0) items = items.filter((entry) => entry.id !== id);
  else item.quantity = Math.min(quantity, 99);
  emit();
}

export const increment = (id) => {
  const item = items.find((entry) => entry.id === id);
  if (item) setQuantity(id, item.quantity + 1);
};

export const decrement = (id) => {
  const item = items.find((entry) => entry.id === id);
  if (item) setQuantity(id, item.quantity - 1);
};

export const removeItem = (id) => setQuantity(id, 0);

export function clearCart() {
  items = [];
  emit();
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

export const getItems = () => items.map((item) => ({ ...item }));

export const itemCount = () => items.reduce((sum, item) => sum + item.quantity, 0);

export const subtotal = () => items.reduce((sum, item) => sum + lineTotal(item), 0);

/**
 * Delivery fee in rupees. Pickup is always 0.
 *
 * For delivery the charge comes from the pin the customer dropped on the map,
 * because that is measured rather than guessed. A hand-picked distance band is
 * the fallback for anyone who did not use the map.
 */
export const deliveryFee = (orderType, zone, location = null) => {
  if (orderType !== 'delivery') return 0;
  if (location && Number.isFinite(location.fee)) return location.fee;
  return deliveryFeeForZone(zone);
};

export const isEmpty = () => items.length === 0;

export const getState = () => ({
  items: getItems(),
  count: itemCount(),
  subtotal: subtotal(),
  isEmpty: isEmpty(),
});

/**
 * Checkout: customer details, validation, order review and handoff to
 * WhatsApp. Customer details are held in memory for the length of the visit
 * only - nothing personal is written to localStorage.
 */

import { CONFIG, deliveryZones, hasShopCoordinates, deliveryLimitText } from '../config.js';
import { getItems, subtotal, deliveryFee, lineTotal, unitPrice } from '../utils/cart.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { buildOrderMessage, isWhatsAppConfigured, formatPhone } from '../utils/whatsapp.js';
import { escapeHtml, qs, qsa } from '../utils/dom.js';
import { formatKm } from '../utils/distance.js';
import { icons } from './icons.js';

/** In-memory draft, so moving between steps does not lose what was typed. */
export const draft = {
  name: '',
  phone: '',
  orderType: '',
  deliveryZone: '',
  address: '',
  landmark: '',
  area: '',
  notes: '',

  /**
   * The pin the customer dropped on the map, once they confirm it:
   * { lat, lng, km, distanceText, fee, mapsUrl, coordsText }.
   *
   * Null means they have not used the map - either because they chose a
   * distance band by hand instead, or because the kitchen has no coordinates
   * configured. It is not a form field, so readForm leaves it alone.
   */
  location: null,
};

/** Clears the pin. Used when the customer picks a distance band by hand. */
export const clearDraftLocation = () => {
  draft.location = null;
};

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

/** Indian mobile numbers: 10 digits starting 6-9, with or without +91 / 0. */
export function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return { digits, valid: /^[6-9]\d{9}$/.test(digits) };
}

export function validate(values) {
  const errors = {};

  if (!values.name || values.name.trim().length < 2) {
    errors.name = 'Please tell us who the order is for.';
  }

  if (!values.phone.trim()) {
    errors.phone = 'We need a number to confirm your order.';
  } else if (!normalizePhone(values.phone).valid) {
    errors.phone = 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.';
  }

  if (!values.orderType) {
    errors.orderType = 'Choose pickup or delivery.';
  }

  if (values.orderType === 'delivery') {
    // A pin is the preferred answer, but a hand-picked distance band is a
    // valid one too - some customers cannot or will not use a map.
    if (!values.location && !values.deliveryZone) {
      errors.location = hasShopCoordinates()
        ? 'Pin your location on the map so we can work out the delivery charge.'
        : 'Tell us roughly how far you are so we can work out the delivery charge.';
      errors.deliveryZone = errors.location;
    }
    if (!values.address || values.address.trim().length < 8) {
      errors.address = 'Add the full delivery address, including house or flat number.';
    }
    if (CONFIG.deliveryMinimum > 0 && subtotal() < CONFIG.deliveryMinimum) {
      errors.orderType = `Delivery orders start at ${formatCurrency(CONFIG.deliveryMinimum)}. Add a little more, or switch to pickup.`;
    }
  }

  return errors;
}

/* -------------------------------------------------------------------------- */
/* Form                                                                        */
/* -------------------------------------------------------------------------- */

const field = ({ id, label, required, input, hint }) => `
  <div class="field" data-field="${id}">
    <label class="field__label" for="${id}">${label}${required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>
    ${input}
    ${hint ? `<p class="field__hint">${hint}</p>` : ''}
    <p class="field__error" id="${id}-error" data-error></p>
  </div>`;

/* -------------------------------------------------------------------------- */
/* Delivery location                                                           */
/* -------------------------------------------------------------------------- */

/** The confirmed pin, shown as a card with its distance and charge. */
const pinnedLocationHtml = (location) => `
  <div class="loc-card" data-state="${location.fee ? 'paid' : 'free'}">
    <div class="loc-card__head">
      <span class="loc-card__icon">${icons.pin}</span>
      <div class="loc-card__title">
        <strong>Location pinned</strong>
        <em>${escapeHtml(location.coordsText)}</em>
      </div>
      <button class="loc-card__change" type="button" data-open-map>Change</button>
    </div>

    <dl class="loc-card__stats">
      <div>
        <dt>Distance</dt>
        <dd>${escapeHtml(location.distanceText)}</dd>
      </div>
      <div>
        <dt>Delivery</dt>
        <dd>${location.fee ? formatCurrency(location.fee) : 'Free'}</dd>
      </div>
    </dl>

    ${
      location.mapsUrl
        ? `<a class="loc-card__link" href="${escapeHtml(location.mapsUrl)}" target="_blank" rel="noopener noreferrer">
             ${icons.map} Open in Google Maps
           </a>`
        : ''
    }
  </div>`;

/** The call to action shown before any pin exists. */
const pickLocationHtml = () => `
  <button class="loc-pick" type="button" data-open-map>
    <span class="loc-pick__icon">${icons.map}</span>
    <span class="loc-pick__text">
      <strong>Pin your location</strong>
      <em>We work out the delivery charge from it</em>
    </span>
    <span class="loc-pick__go">${icons.arrowRight}</span>
  </button>`;

/** The hand-picked distance bands: fallback when the map is not an option. */
const zoneListHtml = () => `
  <div class="zone-list" role="radiogroup" aria-label="Distance from us">
    ${deliveryZones()
      .map(
        (zone) => `
      <label class="zone">
        <input type="radio" name="deliveryZone" value="${zone.id}"
               ${draft.deliveryZone === zone.id ? 'checked' : ''} />
        <span class="option__mark" aria-hidden="true"></span>
        <span class="zone__text">
          ${escapeHtml(zone.label)}
          <span class="zone__note">${escapeHtml(zone.note)}</span>
        </span>
        <span class="zone__fee">${zone.fee ? formatCurrency(zone.fee) : 'Free'}</span>
      </label>`,
      )
      .join('')}
  </div>`;

/**
 * The delivery-location field.
 *
 * With the kitchen's coordinates configured the map is the main path and the
 * distance bands sit folded away underneath for anyone who cannot use it.
 * Without them the site cannot measure anything, so the bands are all there is.
 */
function locationFieldHtml() {
  if (!hasShopCoordinates()) {
    return `
      <div class="field" data-field="deliveryZone">
        <span class="field__label">Distance from us <span class="req" aria-hidden="true">*</span></span>
        ${zoneListHtml()}
        <p class="field__hint">
          ${deliveryLimitText() ? `${escapeHtml(deliveryLimitText())}. ` : ''}Not sure? Pick the closest — we confirm it on WhatsApp.
        </p>
        <p class="field__error" id="deliveryZone-error" data-error></p>
      </div>`;
  }

  return `
    <div class="field" data-field="location">
      <span class="field__label">Delivery location <span class="req" aria-hidden="true">*</span></span>
      ${draft.location ? pinnedLocationHtml(draft.location) : pickLocationHtml()}
      <p class="field__error" id="location-error" data-error></p>

      <details class="zone-fallback" ${draft.deliveryZone && !draft.location ? 'open' : ''}>
        <summary>Can’t use the map? Pick your distance instead</summary>
        ${zoneListHtml()}
        <p class="field__hint">
          ${deliveryLimitText() ? `${escapeHtml(deliveryLimitText())}. ` : ''}We confirm the charge on WhatsApp before we cook.
        </p>
      </details>
    </div>`;
}

export function checkoutHtml() {
  return `
    <form class="checkout" data-checkout-form novalidate>
      ${field({
        id: 'name',
        label: 'Full name',
        required: true,
        input: `<input id="name" name="name" type="text" autocomplete="name" placeholder="Your name"
                 value="${escapeHtml(draft.name)}" aria-describedby="name-error" data-autofocus required />`,
      })}

      ${field({
        id: 'phone',
        label: 'Phone number',
        required: true,
        input: `<div class="phone-input">
                  <span class="phone-input__code">+91</span>
                  <input id="phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national"
                         placeholder="98765 43210" value="${escapeHtml(draft.phone)}"
                         aria-describedby="phone-error" maxlength="14" required />
                </div>`,
      })}

      <div class="field" data-field="orderType">
        <span class="field__label" id="order-type-label">Order type <span class="req" aria-hidden="true">*</span></span>
        <div class="order-type" role="radiogroup" aria-labelledby="order-type-label">
          <label class="order-type__option">
            <input type="radio" name="orderType" value="pickup" ${draft.orderType === 'pickup' ? 'checked' : ''} />
            ${icons.bag}
            <strong>Pickup</strong>
            <span>Collect from ZINGOS</span>
          </label>
          <label class="order-type__option">
            <input type="radio" name="orderType" value="delivery" ${draft.orderType === 'delivery' ? 'checked' : ''} />
            ${icons.scooter}
            <strong>Delivery</strong>
            <span>We bring it to you</span>
          </label>
        </div>
        <p class="field__error" id="orderType-error" data-error></p>
      </div>

      <div class="delivery-fields" data-delivery-fields ${draft.orderType === 'delivery' ? '' : 'hidden'}>
        ${locationFieldHtml()}

        ${field({
          id: 'address',
          label: 'Delivery address',
          required: true,
          input: `<textarea id="address" name="address" autocomplete="street-address"
                    placeholder="House / flat, street, area" aria-describedby="address-error">${escapeHtml(draft.address)}</textarea>`,
        })}
        ${field({
          id: 'landmark',
          label: 'Landmark',
          input: `<input id="landmark" name="landmark" type="text" placeholder="Near…" value="${escapeHtml(draft.landmark)}" />`,
        })}
        ${field({
          id: 'area',
          label: 'Location / area',
          input: `<input id="area" name="area" type="text" placeholder="Area or locality" value="${escapeHtml(draft.area)}" />`,
        })}
      </div>

      ${field({
        id: 'notes',
        label: 'Special instructions',
        input: `<textarea id="notes" name="notes" placeholder="e.g. Please make it less spicy."
                  maxlength="400">${escapeHtml(draft.notes)}</textarea>`,
        hint: 'Optional — allergies, spice level, delivery notes.',
      })}
    </form>
  `;
}

/** Copies the form into the draft and returns it. */
export function readForm(form) {
  const data = new FormData(form);
  draft.name = String(data.get('name') ?? '').trim();
  draft.phone = String(data.get('phone') ?? '').trim();
  draft.orderType = String(data.get('orderType') ?? '');
  draft.deliveryZone = String(data.get('deliveryZone') ?? '');
  draft.address = String(data.get('address') ?? '').trim();
  draft.landmark = String(data.get('landmark') ?? '').trim();
  draft.area = String(data.get('area') ?? '').trim();
  draft.notes = String(data.get('notes') ?? '').trim();
  return { ...draft };
}

export function showErrors(form, errors) {
  qsa('[data-field]', form).forEach((wrapper) => {
    const key = wrapper.dataset.field;
    const message = errors[key];
    wrapper.classList.toggle('has-error', Boolean(message));
    const node = qs('[data-error]', wrapper);
    if (node) node.textContent = message ?? '';
    const input = qs('input, textarea', wrapper);
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
  });

  // Document order, not selector order, decides which of these wins - so the
  // first field with an error gets the focus. The map button is listed because
  // the location field's only inputs are radios folded away inside a closed
  // <details>, and focusing one of those would move focus somewhere invisible.
  const first = qs('.has-error [data-open-map], .has-error input, .has-error textarea', form);
  first?.focus();
}

/* -------------------------------------------------------------------------- */
/* Review                                                                      */
/* -------------------------------------------------------------------------- */

/** Human label for a chosen delivery zone, e.g. "Within 5 km · Free delivery". */
export const zoneLabel = (zoneId) => {
  const zone = deliveryZones().find((entry) => entry.id === zoneId);
  return zone ? `${zone.label} · ${zone.note}` : 'To be confirmed';
};

/**
 * How far away the customer is, in one line. A measured pin beats a band the
 * customer guessed at, so it is preferred when both exist.
 */
export const distanceLabel = ({ location, deliveryZone }) => {
  if (location) {
    return `${location.distanceText} away · ${location.fee ? formatCurrency(location.fee) : 'Free delivery'}`;
  }
  return zoneLabel(deliveryZone);
};

/** Everything the review screen and the WhatsApp message are built from. */
export function buildOrder() {
  const customer = { ...draft, phone: normalizePhone(draft.phone).digits };
  const items = getItems();
  const sub = subtotal();
  const fee = deliveryFee(customer.orderType, customer.deliveryZone, customer.location);
  return { items, customer, subtotal: sub, deliveryFee: fee, total: sub + fee };
}

export function reviewHtml(order) {
  const { items, customer } = order;
  const isDelivery = customer.orderType === 'delivery';

  return `
    <div class="review">
      <section class="review__card">
        <h3>${icons.cart} Order summary</h3>
        ${items
          .map(
            (item) => `
          <div class="review__line">
            <strong>${item.quantity} × ${escapeHtml(item.name)}</strong>
            <b>${formatCurrency(lineTotal(item))}</b>
            ${item.variant ? `<em>${escapeHtml(item.variant)}</em>` : ''}
            ${
              item.addons?.length
                ? `<em>+ ${item.addons.map((addon) => escapeHtml(addon.name)).join(', ')} · ${formatCurrency(unitPrice(item))} each</em>`
                : ''
            }
          </div>`,
          )
          .join('')}
      </section>

      <section class="review__card">
        <h3>${icons.phone} Customer</h3>
        <dl class="review__detail">
          <dt>Name</dt><dd>${escapeHtml(customer.name)}</dd>
          <dt>Phone</dt><dd>${escapeHtml(formatPhone(customer.phone))}</dd>
          <dt>Order</dt><dd>${isDelivery ? 'Delivery' : 'Pickup'}</dd>
          ${
            isDelivery
              ? `<dt>Distance</dt><dd>${escapeHtml(distanceLabel(customer))}</dd>`
              : ''
          }
          ${isDelivery ? `<dt>Address</dt><dd>${escapeHtml(customer.address)}</dd>` : ''}
          ${
            isDelivery && customer.location?.mapsUrl
              ? `<dt>Map pin</dt>
                 <dd>
                   <a class="review__maplink" href="${escapeHtml(customer.location.mapsUrl)}"
                      target="_blank" rel="noopener noreferrer">
                     ${escapeHtml(customer.location.coordsText)}
                   </a>
                   <span class="review__maphint">Sent with your order so we can find you</span>
                 </dd>`
              : ''
          }
          ${isDelivery && customer.landmark ? `<dt>Landmark</dt><dd>${escapeHtml(customer.landmark)}</dd>` : ''}
          ${isDelivery && customer.area ? `<dt>Area</dt><dd>${escapeHtml(customer.area)}</dd>` : ''}
          ${customer.notes ? `<dt>Notes</dt><dd>${escapeHtml(customer.notes)}</dd>` : ''}
        </dl>
      </section>

      ${
        isWhatsAppConfigured()
          ? ''
          : `<div class="notice">
               <span aria-hidden="true">⚠️</span>
               <span>
                 <strong>WhatsApp number not configured</strong>
                 Set <code>whatsappNumber</code> in <code>src/config.js</code> to send orders.
                 You can still copy the order text below.
               </span>
             </div>`
      }
    </div>
  `;
}

/* -------------------------------------------------------------------------- */
/* Confirmation                                                                */
/* -------------------------------------------------------------------------- */

export function sentHtml() {
  return `
    <div class="sent">
      <div class="sent__art">${icons.whatsapp}</div>
      <h3>Your order is ready in WhatsApp</h3>
      <p>
        Press <strong>Send</strong> in WhatsApp to complete your order. The kitchen
        confirms the timing and any delivery charge on chat.
      </p>
      <div class="sent__actions">
        <button class="btn btn--block" type="button" data-resend>Open WhatsApp again</button>
        <button class="btn btn--ghost btn--block" type="button" data-clear-cart>Clear my cart</button>
      </div>
    </div>
  `;
}

/** Shown when config.js still has the placeholder WhatsApp number. */
export function fallbackHtml(message) {
  return `
    <div class="review">
      <div class="notice">
        <span aria-hidden="true">⚠️</span>
        <span>
          <strong>WhatsApp is not configured yet</strong>
          Add the restaurant's number as <code>whatsappNumber</code> in <code>src/config.js</code>
          (digits only, with country code — for example <code>919876543210</code>).
          Until then, the order text can be copied and sent manually.
        </span>
      </div>
      <textarea class="order-text" readonly data-order-text>${escapeHtml(message)}</textarea>
      <button class="btn btn--block" type="button" data-copy-order>${icons.copy} Copy order text</button>
    </div>
  `;
}

export { buildOrderMessage };

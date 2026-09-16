import { CONFIG, isPlaceholder, fullAddress } from '../config.js';
import { telHref, formatPhone } from '../utils/whatsapp.js';
import { escapeHtml } from '../utils/dom.js';
import { icons } from './icons.js';

/**
 * Renders a real value, or a placeholder. Visitors see a neutral "coming
 * soon"; while running `npm run dev` the placeholder also names the config
 * key to fill in, so nothing developer-facing ships to customers.
 */
const missing = (key) =>
  `<p class="placeholder">Coming soon${
    import.meta.env.DEV ? ` — set <code>${key}</code> in src/config.js` : ''
  }</p>`;

const value = (text, key) =>
  isPlaceholder(text) ? missing(key) : `<p>${escapeHtml(text)}</p>`;

export function renderLocation(root) {
  root.id = 'location';
  root.className = 'section section--cream';

  const address = fullAddress();
  const phoneLink = telHref();
  const mapsReady = !isPlaceholder(CONFIG.googleMapsUrl);

  root.innerHTML = `
    <div class="wrap">
      <header class="section-head" data-reveal>
        <span class="section-kicker">Find us</span>
        <h2 class="section-title">One kitchen. One location.</h2>
        <p class="section-lede">
          Order ahead for pickup, or have it delivered. Everything is cooked at our
          single ZINGOS kitchen.
        </p>
      </header>

      <div class="location__grid">
        <div class="location__card" data-reveal>
          <div class="location__row">
            <span class="location__icon">${icons.pin}</span>
            <div>
              <h3>Address</h3>
              ${address ? `<p>${escapeHtml(address)}</p>` : missing('address.street')}
            </div>
          </div>

          <div class="location__row">
            <span class="location__icon">${icons.phone}</span>
            <div>
              <h3>Phone</h3>
              ${
                phoneLink
                  ? `<a href="${phoneLink}">${escapeHtml(CONFIG.phone)}</a>`
                  : missing('phone')
              }
            </div>
          </div>

          <div class="location__row">
            <span class="location__icon">${icons.whatsapp}</span>
            <div>
              <h3>WhatsApp orders</h3>
              ${isPlaceholder(CONFIG.whatsappNumber) ? missing('whatsappNumber') : `<p>${escapeHtml(formatPhone(CONFIG.whatsappNumber))}</p>`}
            </div>
          </div>

          <div class="location__row">
            <span class="location__icon">${icons.clock}</span>
            <div>
              <h3>Opening hours</h3>
              ${value(CONFIG.openingHours, 'openingHours')}
            </div>
          </div>

          <div class="location__actions">
            <a class="btn${mapsReady ? '' : ' btn--ghost'}"
               ${mapsReady ? `href="${escapeHtml(CONFIG.googleMapsUrl)}" target="_blank" rel="noopener noreferrer"` : 'href="#location" aria-disabled="true"'}>
              ${icons.pin} Get directions
            </a>
            <a class="btn btn--dark" href="#menu" data-nav>Order now</a>
          </div>

          ${
            mapsReady || !import.meta.env.DEV
              ? ''
              : `<p class="field__hint">Add <code>googleMapsUrl</code> in <code>src/config.js</code> to enable the directions link.</p>`
          }
        </div>

        <div class="location__panel" data-reveal style="--reveal-delay:120ms">
          <div>
            <img src="/images/logo/zingos-logo.png" alt="ZINGOS Fried Chicken" width="260" height="124" loading="lazy" />
            <h3>Pickup or delivery</h3>
            <p>
              Choose at checkout. Your order goes straight to the kitchen on WhatsApp,
              and we confirm the timing on chat.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

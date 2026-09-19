/**
 * WhatsApp ordering.
 *
 * The site never sends anything by itself: it builds the order message and
 * hands it to WhatsApp through the official Click-to-Chat link. The customer
 * still has to press Send inside WhatsApp for the restaurant to receive it.
 *
 * The receiving number lives in src/config.js - nowhere else.
 */

import { CONFIG, whatsappNumber, isPlaceholder, deliveryZones } from '../config.js';
import { formatAmount } from './formatCurrency.js';
import { unitPrice, lineTotal } from './cart.js';

const money = (amount) => `${CONFIG.currency}${formatAmount(amount)}`;

/** Short delivery-zone tag for the message, e.g. "more than 5 km (₹40)". */
const zoneTag = (zoneId) => {
  const zone = deliveryZones().find((entry) => entry.id === zoneId);
  if (!zone) return 'distance to be confirmed';
  return `${zone.label.toLowerCase()} (${zone.fee ? money(zone.fee) : 'free'})`;
};

/**
 * How far the customer is, for the delivery line. A measured pin is stated as
 * a real distance; a hand-picked band keeps its "more than 5 km" wording so
 * the kitchen can tell a measurement from an estimate at a glance.
 */
const distanceTag = ({ location, deliveryZone }) => {
  if (location) {
    return `${location.distanceText} away (${location.fee ? money(location.fee) : 'free'})`;
  }
  return zoneTag(deliveryZone);
};

/** Pretty-prints an Indian mobile number: +91 98765 43210. */
export function formatPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  const code = digits.length > 10 ? digits.slice(0, digits.length - 10) : '91';
  if (local.length !== 10) return String(raw || '').trim();
  return `+${code} ${local.slice(0, 5)} ${local.slice(5)}`;
}

/**
 * Builds the order message. Plain text with WhatsApp's *bold* markers - no
 * HTML, no markdown beyond what WhatsApp itself renders.
 *
 * Kept deliberately tight: the kitchen reads this on a phone mid-service, so
 * every detail earns its line and a typical order fits on one screen without
 * scrolling. Blank lines separate the four blocks - who, what, money, notes.
 */
export function buildOrderMessage({ items, customer, subtotal, deliveryFee, total }) {
  const isDelivery = customer.orderType === 'delivery';
  const lines = ['🍗 *NEW ZINGOS ORDER*', ''];

  /* Who it is and how it leaves the kitchen -------------------------------- */
  lines.push(`👤 *${customer.name}*  📞 ${formatPhone(customer.phone)}`);

  if (isDelivery) {
    lines.push(`🛵 *Delivery* · ${distanceTag(customer)}`);
    const where = [customer.address, customer.landmark, customer.area].filter(Boolean).join(' · ');
    if (where) lines.push(`📍 ${where}`);
    // The map link goes on its own line: WhatsApp only turns a URL into a
    // tappable link when nothing else crowds it.
    if (customer.location?.mapsUrl) lines.push(`🗺️ ${customer.location.mapsUrl}`);
  } else {
    lines.push('🥡 *Pickup*');
  }

  /* What to cook ----------------------------------------------------------- */
  lines.push('', '🛒 *ORDER*');

  for (const item of items) {
    lines.push(`• ${item.quantity} × ${item.name} — ${money(lineTotal(item))}`);

    // Variant, add-ons and (only where the maths is not obvious) unit price,
    // folded onto one indented line instead of three.
    const detail = [];
    if (item.variant) detail.push(item.variant);
    if (item.addons?.length) detail.push(`+ ${item.addons.map((addon) => addon.name).join(', ')}`);
    if (item.addons?.length && item.quantity > 1) detail.push(`${money(unitPrice(item))} ea`);
    if (detail.length) lines.push(`   ${detail.join(' · ')}`);
  }

  /* Money ------------------------------------------------------------------ */
  const totals = [`Subtotal ${money(subtotal)}`];
  if (isDelivery) {
    // "Free" is only honest once we know how far away they are - from a pin we
    // measured, or a band they picked. With neither, the charge is still open.
    const distanceKnown = Boolean(customer.location || customer.deliveryZone);
    totals.push(
      deliveryFee > 0
        ? `Delivery ${money(deliveryFee)}`
        : distanceKnown
          ? 'Delivery free'
          : 'Delivery to confirm',
    );
  }
  lines.push('', totals.join(' · '));
  lines.push(`💰 *TOTAL: ${money(total)}*`);

  /* Anything the customer asked for ---------------------------------------- */
  if (customer.notes) lines.push('', `📝 ${customer.notes}`);

  return lines.join('\n');
}

/** Click-to-Chat URL, or null while the restaurant number is unconfigured. */
export function buildWhatsAppUrl(message, numberOverride) {
  const number = numberOverride ?? whatsappNumber();
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** True when config.js still holds the placeholder number. */
export const isWhatsAppConfigured = () => whatsappNumber() !== null;

/**
 * Hands the message to WhatsApp. wa.me opens the installed app on a phone and
 * WhatsApp Web on a desktop, so one link covers both.
 */
export function openWhatsApp(message) {
  const url = buildWhatsAppUrl(message);
  if (!url) return { ok: false, reason: 'not-configured' };
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  // Popup blockers can swallow window.open even inside a click handler.
  if (!opened) window.location.href = url;
  return { ok: true, url };
}

/** Plain tel: link for the location section, when a phone is configured. */
export const telHref = () =>
  isPlaceholder(CONFIG.phone) ? null : `tel:${CONFIG.phone.replace(/[^\d+]/g, '')}`;

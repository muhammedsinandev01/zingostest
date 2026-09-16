/**
 * WhatsApp ordering.
 *
 * The site never sends anything by itself: it builds the order message and
 * hands it to WhatsApp through the official Click-to-Chat link. The customer
 * still has to press Send inside WhatsApp for the restaurant to receive it.
 *
 * The receiving number lives in src/config.js - nowhere else.
 */

import { CONFIG, whatsappNumber, isPlaceholder } from '../config.js';
import { formatAmount } from './formatCurrency.js';
import { unitPrice, lineTotal } from './cart.js';

const RULE = '━━━━━━━━━━━━━━';

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
 */
export function buildOrderMessage({ items, customer, subtotal, deliveryFee, total }) {
  const lines = [];

  lines.push('🍗 *NEW ZINGOS ORDER*', '', RULE, '');

  lines.push('👤 *CUSTOMER*');
  lines.push(`Name: ${customer.name}`);
  lines.push(`Phone: ${formatPhone(customer.phone)}`);
  lines.push('');

  lines.push('📦 *ORDER TYPE*');
  lines.push(customer.orderType === 'delivery' ? 'Delivery' : 'Pickup');
  lines.push('');

  if (customer.orderType === 'delivery') {
    lines.push('📍 *DELIVERY ADDRESS*');
    lines.push(customer.address);
    if (customer.landmark) lines.push(`Landmark: ${customer.landmark}`);
    if (customer.area) lines.push(`Area: ${customer.area}`);
    lines.push('');
  }

  lines.push(RULE, '', '🛒 *ORDER*', '');

  for (const item of items) {
    lines.push(`${item.quantity} × ${item.name}`);
    if (item.variant) lines.push(item.variant);
    for (const addon of item.addons || []) {
      lines.push(`+ ${addon.name} (${CONFIG.currency}${formatAmount(addon.price)})`);
    }
    if ((item.addons || []).length) {
      lines.push(`${CONFIG.currency}${formatAmount(unitPrice(item))} each`);
    }
    lines.push(`${CONFIG.currency}${formatAmount(lineTotal(item))}`);
    lines.push('');
  }

  lines.push(RULE, '');
  lines.push(`Subtotal: ${CONFIG.currency}${formatAmount(subtotal)}`);
  if (customer.orderType === 'delivery') {
    lines.push(
      deliveryFee > 0
        ? `Delivery: ${CONFIG.currency}${formatAmount(deliveryFee)}`
        : 'Delivery: to be confirmed by the restaurant',
    );
  }
  lines.push('');
  lines.push(`💰 *TOTAL: ${CONFIG.currency}${formatAmount(total)}*`);
  if (customer.orderType === 'delivery' && deliveryFee === 0) {
    lines.push('_(excludes delivery charge)_');
  }
  lines.push('');

  if (customer.notes) {
    lines.push(RULE, '', '📝 *SPECIAL INSTRUCTIONS*', customer.notes, '');
  }

  lines.push(RULE, '', 'Thank you for ordering from ZINGOS! 🍗🔥');

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

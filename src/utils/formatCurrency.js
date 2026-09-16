import { CONFIG } from '../config.js';

/**
 * Money is handled as whole rupees (integers) everywhere in the app, so
 * formatting never has to round and totals can never drift by a paisa.
 */
export function formatCurrency(amount) {
  const rupees = Math.round(Number(amount) || 0);
  return `${CONFIG.currency}${rupees.toLocaleString(CONFIG.locale)}`;
}

/** Same value without the symbol - used inside the WhatsApp message. */
export function formatAmount(amount) {
  return Math.round(Number(amount) || 0).toLocaleString(CONFIG.locale);
}

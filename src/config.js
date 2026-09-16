/**
 * ZINGOS FRIED CHICKEN - single source of truth for restaurant details.
 *
 * Everything the restaurant owner is likely to change lives in this file.
 * Values wrapped in [SQUARE_BRACKETS] are placeholders that still need the
 * real business detail; the site detects them and degrades gracefully
 * instead of generating a broken link.
 */

export const CONFIG = {
  restaurantName: 'ZINGOS Fried Chicken',
  tagline: 'Crispy. Bold. Zingos.',

  /**
   * WhatsApp number that receives orders.
   * Format: country code + number, digits only, no +, no spaces.
   * Example for India: '919876543210'
   */
  whatsappNumber: '919567158313',

  /** Shown in the location section and used for the tap-to-call link. */
  phone: '+91 92921 71777',

  /** Split into fields so search engines can read the address, not just show it. */
  address: {
    street: 'Alakode Road, Manna Road',
    locality: 'Taliparamba',
    region: 'Kerala',
    postalCode: '670141',
    country: 'IN',
  },

  /** Paste the "Share > Copy link" URL from Google Maps. */
  googleMapsUrl: 'https://maps.app.goo.gl/wvS1MwVQmmSS6Fux9',

  /** Shown on the site, in the customer's words. */
  openingHours: 'Every day · 3:00 PM – 2:00 AM',

  /**
   * The same hours in schema.org notation, for the structured data only.
   * Format: '<days> <open>-<close>' on a 24-hour clock; a closing time
   * earlier than the opening time means it runs past midnight.
   */
  openingHoursSpec: 'Mo-Su 15:00-02:00',

  instagramUrl: 'https://www.instagram.com/zingosofficial',
  facebookUrl: '[FACEBOOK_URL]',

  /**
   * Delivery fee in rupees, added to delivery orders only.
   * Leave at 0 while the fee is not finalised - the cart then tells the
   * customer the fee is confirmed by the restaurant instead of showing 0.
   */
  deliveryFee: 0,

  /** Minimum order value for delivery, in rupees. 0 disables the check. */
  deliveryMinimum: 0,

  currency: '₹',
  currencyCode: 'INR',
  locale: 'en-IN',

  /** Used for canonical/Open Graph tags once the site has a domain. */
  siteUrl: '',
};

/** True when a config value is still an unfilled placeholder. */
export const isPlaceholder = (value) =>
  typeof value !== 'string' || value.trim() === '' || /^\[[A-Z_]+\]$/.test(value.trim());

/** Digits-only WhatsApp number, or null while it is unconfigured. */
export const whatsappNumber = () => {
  if (isPlaceholder(CONFIG.whatsappNumber)) return null;
  const digits = CONFIG.whatsappNumber.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
};

/** The address on one line, for display and for the WhatsApp message. */
export const fullAddress = () => {
  const { street, locality, region, postalCode } = CONFIG.address;
  return [street, locality, [region, postalCode].filter(Boolean).join(' ')]
    .filter((part) => part && !isPlaceholder(part))
    .join(', ');
};

/** schema.org PostalAddress, or null while the address is unconfigured. */
export const postalAddress = () => {
  const { street, locality, region, postalCode, country } = CONFIG.address;
  if (isPlaceholder(street)) return null;
  return {
    '@type': 'PostalAddress',
    streetAddress: street,
    ...(locality ? { addressLocality: locality } : {}),
    ...(region ? { addressRegion: region } : {}),
    ...(postalCode ? { postalCode } : {}),
    ...(country ? { addressCountry: country } : {}),
  };
};

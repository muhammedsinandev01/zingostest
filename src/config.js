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
  whatsappNumber: '919292171777',

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

  /**
   * The kitchen's exact pin. EVERY delivery charge is measured from here, so
   * this has to be the real spot - not the road, not the junction nearby.
   *
   * To fill it in: open Google Maps, right-click exactly on ZINGOS, and click
   * the latitude/longitude numbers at the top of the menu that appears. That
   * copies them. Paste them below as plain numbers.
   *
   *   lat: 12.038512,
   *   lng: 75.360194,
   *
   * Until both are real numbers the site cannot measure distance, so checkout
   * quietly falls back to letting the customer pick their own distance band
   * rather than charging anyone a made-up fee.
   */
  coordinates: {
    lat: 12.043683,
    lng: 75.368887,
  },

  /** Shown on the site, in the customer's words. */
  openingHours: 'Every day · 4:00 PM – 2:00 AM',

  /**
   * The same hours in schema.org notation, for the structured data only.
   * Format: '<days> <open>-<close>' on a 24-hour clock; a closing time
   * earlier than the opening time means it runs past midnight.
   */
  openingHoursSpec: 'Mo-Su 16:00-02:00',

  instagramUrl: 'https://www.instagram.com/zingosofficial',
  facebookUrl: '[FACEBOOK_URL]',

  /**
   * Delivery charge by distance from the kitchen.
   *
   * The customer drops a pin on a map at checkout, the site measures how far
   * that pin is from CONFIG.coordinates, and the first band it falls inside
   * sets the charge. Bands are read top to bottom, so keep them in order.
   *
   *   withinKm  the outer edge of the band, in kilometres
   *   fee       rupees charged inside it
   *
   * The last band must have `withinKm: null` - it is the catch-all for
   * everything further out.
   */
  delivery: {
    bands: [
      { withinKm: 5, fee: 0 },
      { withinKm: null, fee: 40 },
    ],

    /**
     * Furthest the kitchen will deliver, in kilometres. A pin beyond this is
     * refused at checkout instead of being quoted a fee, and it also closes
     * off the last band - so the bands above mean "free to 5 km, then Rs 40
     * out to 10 km, and nothing past that". null = no limit.
     */
    maxKm: 10,

    /**
     * Distance is measured as the crow flies, which is always a little less
     * than the road. Raise this above 1 to bill closer to real driving
     * distance - 1.3 adds a typical 30% road allowance. Left at 1, a customer
     * 4.9 km away in a straight line is charged as 4.9 km.
     */
    roadFactor: 1,
  },

  /** Minimum order value for delivery, in rupees. 0 disables the check. */
  deliveryMinimum: 0,

  currency: '₹',
  currencyCode: 'INR',
  locale: 'en-IN',

  /**
   * The site's own address, no trailing slash.
   *
   * Social previews need absolute URLs - WhatsApp and Facebook fetch the page
   * from their own servers, so a relative image path resolves against *their*
   * domain and the preview comes out blank. vite.config.js writes this into
   * index.html at build time, so the domain is written down exactly once.
   *
   * Change it here when the site moves to its own domain.
   */
  siteUrl: 'https://zingostest.vercel.app',
};

/* -------------------------------------------------------------------------- */
/* Delivery                                                                    */
/* -------------------------------------------------------------------------- */

/** The bands from CONFIG, guaranteed non-empty and ending in a catch-all. */
const bands = () => {
  const list = (CONFIG.delivery.bands ?? []).filter(
    (band) => band && Number.isFinite(band.fee) && band.fee >= 0,
  );
  if (!list.length) return [{ withinKm: null, fee: 0 }];
  // The furthest band always catches everything past the one before it, even
  // if someone edits config.js and forgets the trailing null.
  return [...list.slice(0, -1), { ...list[list.length - 1], withinKm: null }];
};

/** True once the kitchen's pin is filled in and distance can be measured. */
export const hasShopCoordinates = () => {
  const { lat, lng } = CONFIG.coordinates ?? {};
  return (
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  );
};

/** The kitchen's pin, or null while config.js still has the TODO. */
export const shopCoordinates = () =>
  hasShopCoordinates() ? { lat: CONFIG.coordinates.lat, lng: CONFIG.coordinates.lng } : null;

/** The band a distance falls into, e.g. { withinKm: 10, fee: 40 }. */
export const bandForDistance = (km) => {
  if (!Number.isFinite(km)) return null;
  const list = bands();
  return list.find((band) => band.withinKm === null || km <= band.withinKm) ?? list[list.length - 1];
};

/** Delivery charge in rupees for a measured distance. */
export const feeForDistance = (km) => bandForDistance(km)?.fee ?? 0;

/** Furthest the kitchen will drive, in km, or null when there is no limit. */
export const deliveryLimitKm = () => {
  const { maxKm } = CONFIG.delivery;
  return Number.isFinite(maxKm) && maxKm > 0 ? maxKm : null;
};

/** True when a pin is further out than the kitchen is willing to drive. */
export const isBeyondDeliveryRange = (km) => {
  const limit = deliveryLimitKm();
  return limit !== null && Number.isFinite(km) && km > limit;
};

/** "We deliver up to 10 km", or null when there is no limit to mention. */
export const deliveryLimitText = () => {
  const limit = deliveryLimitKm();
  return limit === null ? null : `We deliver up to ${limit} km`;
};

/**
 * The distance bands as pickable options, for the customer who cannot or will
 * not drop a pin. Same numbers as the map path, written out in words.
 */
export const deliveryZones = () => {
  const list = bands();
  const limit = deliveryLimitKm();

  return list.map((band, index) => {
    const from = index === 0 ? 0 : list[index - 1].withinKm;

    // The last band is written open-ended, but a delivery limit closes it:
    // "more than 5 km" is really "5 to 10 km" once we refuse anything past 10.
    const outer = band.withinKm ?? limit;

    const label =
      outer !== null
        ? index === 0
          ? `Within ${outer} km`
          : `${from} – ${outer} km`
        : index === 0
          ? 'Any distance' // a single catch-all band: there is nothing to be "beyond"
          : `More than ${from} km`;

    return {
      id: band.withinKm === null ? 'beyond' : `upto-${band.withinKm}`,
      label,
      note: band.fee ? `${CONFIG.currency}${band.fee} delivery charge` : 'Free delivery',
      fee: Math.max(0, Math.round(band.fee) || 0),
      withinKm: outer,
      /** True for the ring that marks the edge of the delivery area. */
      isLimit: limit !== null && outer === limit,
    };
  });
};

/** Fee in rupees for a zone id. Unknown zone means nothing is charged yet. */
export const deliveryFeeForZone = (zoneId) =>
  deliveryZones().find((zone) => zone.id === zoneId)?.fee ?? 0;

/** One-line summary of the rule, e.g. "Free within 5 km · ₹40 · ₹80". */
export const deliveryPolicyText = () => {
  const list = deliveryZones();
  const free = list.find((zone) => zone.fee === 0);
  const paid = list.filter((zone) => zone.fee > 0);
  if (!paid.length) return 'Free delivery everywhere we deliver';
  const head = free ? `Free within ${free.withinKm} km` : null;
  const rest = paid.map(
    (zone) =>
      `${CONFIG.currency}${zone.fee} ${zone.withinKm === null ? `beyond ${list[list.length - 2]?.withinKm ?? ''} km` : `to ${zone.withinKm} km`}`,
  );
  return [head, ...rest].filter(Boolean).join(' · ');
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

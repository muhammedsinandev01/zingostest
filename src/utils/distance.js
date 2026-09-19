/**
 * Distance between the customer's pin and the kitchen.
 *
 * The site measures as the crow flies (haversine). Road distance is always a
 * little more, so CONFIG.delivery.roadFactor exists to bill closer to real
 * driving distance without needing a paid routing API. Everything here is
 * pure maths - no network, no keys.
 */

import { CONFIG, shopCoordinates, feeForDistance, bandForDistance, isBeyondDeliveryRange } from '../config.js';

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees) => (degrees * Math.PI) / 180;

/** True for a usable { lat, lng } pair. */
export const isValidCoords = (point) =>
  Boolean(point) &&
  Number.isFinite(point.lat) &&
  Number.isFinite(point.lng) &&
  Math.abs(point.lat) <= 90 &&
  Math.abs(point.lng) <= 180;

/** Great-circle distance in kilometres between two { lat, lng } points. */
export function haversineKm(a, b) {
  if (!isValidCoords(a) || !isValidCoords(b)) return null;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * How far a customer pin is from the kitchen, as the delivery charge sees it:
 * straight-line distance with the road allowance applied.
 */
export function distanceFromShop(point) {
  const shop = shopCoordinates();
  if (!shop) return null;
  const straight = haversineKm(shop, point);
  if (straight === null) return null;
  const factor = Number.isFinite(CONFIG.delivery.roadFactor) && CONFIG.delivery.roadFactor > 0
    ? CONFIG.delivery.roadFactor
    : 1;
  return straight * factor;
}

/**
 * Everything checkout needs to know about a dropped pin, in one object.
 * Returns null when the pin or the shop coordinate is missing.
 */
export function quoteForPoint(point) {
  const km = distanceFromShop(point);
  if (km === null) return null;
  const tooFar = isBeyondDeliveryRange(km);
  return {
    km,
    distanceText: formatKm(km),
    fee: tooFar ? 0 : feeForDistance(km),
    band: bandForDistance(km),
    tooFar,
  };
}

/** "3.4 km" - one decimal below 10 km, whole numbers above, metres under 1. */
export function formatKm(km) {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/* -------------------------------------------------------------------------- */
/* Google Maps links                                                           */
/* -------------------------------------------------------------------------- */

/** Six decimals is roughly 10 cm - more than enough, and keeps the link short. */
const fixed = (value) => Number(value).toFixed(6);

/**
 * A plain Google Maps pin link. This is what travels with the order: the
 * rider taps it and Google Maps opens on the exact spot.
 */
export const googleMapsPinUrl = (point) =>
  isValidCoords(point) ? `https://www.google.com/maps?q=${fixed(point.lat)},${fixed(point.lng)}` : null;

/** Turn-by-turn directions from the kitchen to the customer's pin. */
export function googleMapsDirectionsUrl(point) {
  const shop = shopCoordinates();
  if (!isValidCoords(point)) return null;
  const destination = `${fixed(point.lat)},${fixed(point.lng)}`;
  if (!shop) return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${fixed(shop.lat)},${fixed(shop.lng)}&destination=${destination}`;
}

/** "12.038512, 75.360194" - the human-readable pin, for the review screen. */
export const formatCoords = (point) =>
  isValidCoords(point) ? `${fixed(point.lat)}, ${fixed(point.lng)}` : '';

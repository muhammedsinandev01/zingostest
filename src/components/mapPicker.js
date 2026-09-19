/**
 * Map location picker.
 *
 * Opens over the cart drawer and lets the customer put a pin on exactly where
 * they want the food. The distance from that pin to the kitchen decides the
 * delivery charge, and the pin itself travels with the order as a Google Maps
 * link so the rider can navigate straight to it.
 *
 * Three ways to set the pin, because any one of them alone fails somebody:
 *   - GPS, for the customer standing at the delivery address
 *   - search, for "deliver to my office, not to my phone"
 *   - dragging the map, which always works and needs no permission
 *
 * The map is OpenStreetMap through Leaflet: no API key, no billing account,
 * nothing to configure. The link handed to the kitchen is still Google Maps.
 */

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { shopCoordinates, deliveryZones, deliveryLimitKm, deliveryLimitText } from '../config.js';
import { quoteForPoint, isValidCoords, formatCoords, googleMapsPinUrl } from '../utils/distance.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { escapeHtml, qs, on, trapFocus, lockScroll, unlockScroll } from '../utils/dom.js';
import { icons } from './icons.js';

/** Zoom that shows roughly a street - close enough to place a house. */
const PIN_ZOOM = 16;
/** Zoom used when we have nothing but the shop to centre on. */
const FALLBACK_ZOOM = 13;
const SEARCH_DEBOUNCE_MS = 450;

let overlay = null;
let map = null;
let releaseFocus = null;
let onConfirm = null;
let current = null; // { lat, lng } under the crosshair right now
let searchTimer = null;
let searchToken = 0;

/* -------------------------------------------------------------------------- */
/* Markup                                                                      */
/* -------------------------------------------------------------------------- */

function shellHtml() {
  const bands = deliveryZones()
    .map(
      (zone) => `
      <li class="map-legend__item" data-fee="${zone.fee ? 'paid' : 'free'}">
        <span class="map-legend__swatch" aria-hidden="true"></span>
        <span class="map-legend__label">${escapeHtml(zone.label)}</span>
        <b>${zone.fee ? formatCurrency(zone.fee) : 'Free'}</b>
      </li>`,
    )
    .join('');

  // The limit is a rule, not a price, so it is spelled out rather than left
  // for the customer to infer from the outermost band.
  const limit = deliveryLimitText();
  const legend =
    bands +
    (limit
      ? `<li class="map-legend__item map-legend__item--limit">
           <span class="map-legend__swatch" aria-hidden="true"></span>
           <span class="map-legend__label">Past ${deliveryLimitKm()} km</span>
           <b>No delivery</b>
         </li>`
      : '');

  return `
    <div class="overlay__scrim" data-map-close></div>
    <div class="overlay__panel map-panel" role="dialog" aria-modal="true" aria-label="Choose your delivery location">
      <header class="overlay__head">
        <button class="overlay__back" type="button" data-map-close aria-label="Go back without choosing">
          ${icons.back}
        </button>
        <div>
          <p class="overlay__title">Where should we deliver?</p>
          <p class="overlay__sub">Move the map so the pin sits on your door</p>
        </div>
        <button class="overlay__close" type="button" data-map-close aria-label="Close map">${icons.close}</button>
      </header>

      <div class="map-search">
        <span class="map-search__icon" aria-hidden="true">${icons.search}</span>
        <input type="text" data-map-search placeholder="Search a place or area&hellip;"
               autocomplete="off" aria-label="Search for a place" />
        <button class="map-search__clear" type="button" data-map-search-clear hidden aria-label="Clear search">
          ${icons.close}
        </button>
        <ul class="map-results" data-map-results hidden aria-label="Search results"></ul>
      </div>

      <div class="map-stage">
        <div class="map-canvas" data-map-canvas></div>

        <div class="map-crosshair" aria-hidden="true">
          <span class="map-crosshair__pin">${icons.pin}</span>
          <span class="map-crosshair__shadow"></span>
        </div>

        <button class="map-locate" type="button" data-map-locate>
          ${icons.crosshair}<span>Use my location</span>
        </button>

        <p class="map-status" data-map-status hidden role="status"></p>
      </div>

      <div class="overlay__foot map-foot">
        <div class="map-quote" data-map-quote aria-live="polite">
          <div class="map-quote__cell">
            <span class="map-quote__label">Distance from ZINGOS</span>
            <strong data-map-distance>&mdash;</strong>
          </div>
          <div class="map-quote__cell map-quote__cell--fee">
            <span class="map-quote__label">Delivery</span>
            <strong data-map-fee>&mdash;</strong>
          </div>
        </div>

        <ul class="map-legend">${legend}</ul>

        <button class="btn btn--block btn--lg" type="button" data-map-confirm disabled>
          ${icons.check} Confirm this location
        </button>
      </div>
    </div>
  `;
}

/* -------------------------------------------------------------------------- */
/* Live readout                                                                */
/* -------------------------------------------------------------------------- */

function setStatus(message, tone = 'info') {
  const node = qs('[data-map-status]', overlay);
  if (!node) return;
  node.hidden = !message;
  node.textContent = message ?? '';
  node.dataset.tone = tone;
}

/** Redraws the distance, the fee and the confirm button for the current pin. */
function refreshQuote() {
  if (!overlay) return;

  const quote = current ? quoteForPoint(current) : null;
  const distance = qs('[data-map-distance]', overlay);
  const fee = qs('[data-map-fee]', overlay);
  const confirm = qs('[data-map-confirm]', overlay);
  const panel = qs('[data-map-quote]', overlay);

  if (!quote) {
    if (distance) distance.textContent = '—';
    if (fee) fee.textContent = '—';
    if (confirm) confirm.disabled = true;
    panel?.removeAttribute('data-state');
    return;
  }

  if (distance) distance.textContent = quote.distanceText;

  if (quote.tooFar) {
    if (fee) fee.textContent = 'Too far';
    panel?.setAttribute('data-state', 'too-far');
    if (confirm) confirm.disabled = true;
    setStatus(
      `That is ${quote.distanceText} away — further than we deliver. Pick a closer spot, or switch to pickup.`,
      'warn',
    );
    return;
  }

  if (fee) fee.textContent = quote.fee ? formatCurrency(quote.fee) : 'Free';
  panel?.setAttribute('data-state', quote.fee ? 'paid' : 'free');
  if (confirm) confirm.disabled = false;
  setStatus('');
}

/** The pin is fixed to the centre of the map, so this runs on every pan. */
function syncFromMap() {
  if (!map) return;
  const centre = map.getCenter();
  current = { lat: centre.lat, lng: centre.lng };
  refreshQuote();
}

/* -------------------------------------------------------------------------- */
/* Map                                                                         */
/* -------------------------------------------------------------------------- */

function buildMap(startPoint) {
  const canvas = qs('[data-map-canvas]', overlay);
  const shop = shopCoordinates();
  const centre = isValidCoords(startPoint) ? startPoint : shop;

  map = L.map(canvas, {
    center: [centre.lat, centre.lng],
    zoom: isValidCoords(startPoint) ? PIN_ZOOM : FALLBACK_ZOOM,
    zoomControl: true,
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap',
  }).addTo(map);

  if (shop) {
    /*
     * A ring per band, so the customer can see which side of a line they are
     * on before the price tells them. The outermost ring is also the edge of
     * the delivery area, so it is drawn as a firm solid boundary rather than
     * another dashed price band - it means "we stop here", not "it costs more
     * past here".
     */
    deliveryZones()
      .filter((zone) => zone.withinKm !== null)
      .forEach((zone) => {
        const colour = zone.isLimit ? '#d13b26' : zone.fee ? '#ee5522' : '#16a34a';
        L.circle([shop.lat, shop.lng], {
          radius: zone.withinKm * 1000,
          interactive: false,
          color: colour,
          weight: zone.isLimit ? 2.5 : 1.5,
          opacity: zone.isLimit ? 0.85 : 0.55,
          fillColor: colour,
          fillOpacity: zone.isLimit ? 0.03 : 0.05,
          ...(zone.isLimit ? {} : { dashArray: '5 6' }),
        }).addTo(map);
      });

    // A divIcon keeps the kitchen marker as plain HTML, which sidesteps
    // Leaflet's default marker images breaking under a bundler.
    L.marker([shop.lat, shop.lng], {
      interactive: false,
      keyboard: false,
      icon: L.divIcon({
        className: 'map-shop-marker',
        html: '<span class="map-shop-marker__dot"></span><span class="map-shop-marker__label">ZINGOS</span>',
      }),
    }).addTo(map);
  }

  map.on('move', syncFromMap);
  map.on('moveend', syncFromMap);

  /*
   * Leaflet measures its container once, on creation. Here the container is
   * inside an overlay that is still sliding open, so that first measurement
   * is of a box that is the wrong size - and every invalidateSize() that
   * corrects it pins the top-left corner and lets the centre slide away.
   *
   * So while the panel settles we re-assert the centre after each remeasure,
   * and we stop the moment the customer touches the map - otherwise the first
   * drag would snap straight back.
   */
  const target = L.latLng(centre.lat, centre.lng);
  const limitKm = deliveryLimitKm();
  let targetZoom = map.getZoom();

  // Opening with no pin to return to, frame the whole delivery area instead of
  // a fixed zoom: the customer sees where the edge is before they start
  // dragging, and it stays right if the kitchen changes how far it will go.
  const autoFit = !isValidCoords(startPoint) && limitKm !== null;
  let settling = true;

  const settle = () => {
    if (!map || !settling) return;
    map.invalidateSize({ animate: false, pan: false });
    // Only measurable once the panel has stopped moving, which is exactly
    // when this runs - the container size is right by now.
    if (autoFit) targetZoom = map.getBoundsZoom(target.toBounds(limitKm * 2300), false);
    map.setView(target, targetZoom, { animate: false, reset: true });
  };

  const stopSettling = () => {
    settling = false;
  };

  map.on('dragstart zoomstart', stopSettling);

  requestAnimationFrame(settle);
  setTimeout(settle, 300);
  setTimeout(() => {
    settle();
    stopSettling();
  }, 650);

  syncFromMap();
}

/* -------------------------------------------------------------------------- */
/* GPS                                                                         */
/* -------------------------------------------------------------------------- */

function locateMe() {
  const button = qs('[data-map-locate]', overlay);

  if (!('geolocation' in navigator)) {
    setStatus('This browser cannot share a location. Drag the map to your spot instead.', 'warn');
    return;
  }

  button?.classList.add('is-busy');
  setStatus('Finding you…');

  navigator.geolocation.getCurrentPosition(
    (position) => {
      button?.classList.remove('is-busy');
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      map?.setView([point.lat, point.lng], PIN_ZOOM);
      syncFromMap();
    },
    (error) => {
      button?.classList.remove('is-busy');
      setStatus(
        error.code === error.PERMISSION_DENIED
          ? 'Location permission was blocked. Drag the map to your spot instead.'
          : error.code === error.TIMEOUT
            ? 'That took too long. Drag the map to your spot instead.'
            : 'We could not find you. Drag the map to your spot instead.',
        'warn',
      );
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
  );
}

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

function renderResults(results) {
  const list = qs('[data-map-results]', overlay);
  if (!list) return;

  list.hidden = false;

  if (!results.length) {
    list.innerHTML = '<li class="map-results__empty">Nothing found. Try a nearby landmark, or drag the map.</li>';
    return;
  }

  list.innerHTML = results
    .map(
      (result) => `
      <li>
        <button type="button" data-map-result data-lat="${result.lat}" data-lng="${result.lng}">
          ${icons.pin}
          <span>
            <strong>${escapeHtml(result.title)}</strong>
            ${result.detail ? `<em>${escapeHtml(result.detail)}</em>` : ''}
          </span>
        </button>
      </li>`,
    )
    .join('');
}

/**
 * Nominatim is free and needs no key, but it is a shared community service -
 * hence the debounce, the result cap and the bias box around the kitchen.
 */
async function runSearch(query) {
  const token = ++searchToken;
  const shop = shopCoordinates();

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '6',
  });

  if (shop) {
    // Roughly a 60 km box around the kitchen, so local results rank first.
    const pad = 0.55;
    params.set('viewbox', [shop.lng - pad, shop.lat + pad, shop.lng + pad, shop.lat - pad].join(','));
  }

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(String(response.status));

    const data = await response.json();
    if (token !== searchToken) return; // a newer keystroke already won

    renderResults(
      data
        .map((entry) => ({ lat: Number(entry.lat), lng: Number(entry.lon), name: String(entry.display_name ?? '') }))
        .filter((entry) => isValidCoords(entry))
        .map((entry) => {
          const [title, ...rest] = entry.name.split(',');
          return {
            lat: entry.lat,
            lng: entry.lng,
            title: title.trim(),
            detail: rest.slice(0, 3).join(',').trim(),
          };
        }),
    );
  } catch {
    if (token !== searchToken) return;
    const list = qs('[data-map-results]', overlay);
    if (!list) return;
    list.hidden = false;
    list.innerHTML =
      '<li class="map-results__empty">Search is unavailable right now. Drag the map to your spot instead.</li>';
  }
}

function closeResults() {
  const list = qs('[data-map-results]', overlay);
  if (!list) return;
  list.hidden = true;
  list.innerHTML = '';
}

/* -------------------------------------------------------------------------- */
/* Open / close                                                                */
/* -------------------------------------------------------------------------- */

function ensureOverlay() {
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.className = 'overlay map-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.append(overlay);

  on(overlay, 'click', '[data-map-close]', () => closeMapPicker());
  on(overlay, 'click', '[data-map-locate]', locateMe);

  on(overlay, 'click', '[data-map-confirm]', () => {
    const quote = current ? quoteForPoint(current) : null;
    if (!quote || quote.tooFar) return;

    const chosen = {
      lat: current.lat,
      lng: current.lng,
      km: quote.km,
      distanceText: quote.distanceText,
      fee: quote.fee,
      mapsUrl: googleMapsPinUrl(current),
      coordsText: formatCoords(current),
    };

    closeMapPicker();
    onConfirm?.(chosen);
  });

  on(overlay, 'click', '[data-map-result]', (event, button) => {
    const point = { lat: Number(button.dataset.lat), lng: Number(button.dataset.lng) };
    if (!isValidCoords(point)) return;
    map?.setView([point.lat, point.lng], PIN_ZOOM);
    syncFromMap();
    closeResults();
    qs('[data-map-search]', overlay)?.blur();
  });

  on(overlay, 'click', '[data-map-search-clear]', () => {
    const input = qs('[data-map-search]', overlay);
    if (input) input.value = '';
    const clear = qs('[data-map-search-clear]', overlay);
    if (clear) clear.hidden = true;
    closeResults();
  });

  on(overlay, 'input', '[data-map-search]', (event, input) => {
    const query = input.value.trim();
    const clear = qs('[data-map-search-clear]', overlay);
    if (clear) clear.hidden = !query;

    clearTimeout(searchTimer);
    if (query.length < 3) {
      closeResults();
      return;
    }
    searchTimer = setTimeout(() => runSearch(query), SEARCH_DEBOUNCE_MS);
  });

  overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMapPicker();
      return;
    }
    // Enter searches now rather than waiting out the debounce.
    if (event.key === 'Enter' && event.target.matches('[data-map-search]')) {
      event.preventDefault();
      clearTimeout(searchTimer);
      const query = event.target.value.trim();
      if (query.length >= 3) runSearch(query);
    }
  });

  return overlay;
}

/**
 * Opens the picker.
 *
 * @param {object}   options
 * @param {object}   [options.start]  pin to open on, e.g. a previous choice
 * @param {Function} options.onSelect called with the confirmed location
 * @returns {boolean} false when the kitchen pin is not configured
 */
export function openMapPicker({ start = null, onSelect } = {}) {
  if (!shopCoordinates()) return false;

  ensureOverlay();
  onConfirm = onSelect;
  current = isValidCoords(start) ? { ...start } : null;

  overlay.innerHTML = shellHtml();
  overlay.setAttribute('aria-hidden', 'false');
  lockScroll('map');
  requestAnimationFrame(() => overlay.classList.add('is-open'));

  buildMap(current);

  if (!isValidCoords(start)) {
    setStatus('Drag the map so the pin sits on your door, or use your location.');
  }

  releaseFocus?.();
  releaseFocus = trapFocus(overlay);
  return true;
}

export function closeMapPicker() {
  if (!overlay?.classList.contains('is-open')) return;

  clearTimeout(searchTimer);
  searchToken += 1;

  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
  releaseFocus?.();
  releaseFocus = null;
  unlockScroll('map');

  // Tearing the map down must never be what stops the picker closing: if
  // Leaflet throws on the way out, the customer is still owed a shut panel
  // and the location they just confirmed.
  try {
    map?.remove();
  } catch {
    /* the container is discarded with the overlay markup anyway */
  }
  map = null;
}

/** True when the kitchen pin is configured, so the map path is available. */
export const isMapPickerAvailable = () => Boolean(shopCoordinates());

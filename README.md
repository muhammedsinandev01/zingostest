# ZINGOS Fried Chicken — ordering website

A mobile-first ordering site for the single ZINGOS Fried Chicken kitchen.
Customers browse the menu, pick their size/flavour/extras, build a cart, enter
their details, and the finished order is handed to WhatsApp as a pre-filled
message that they send themselves.

No backend, no database, no login, no payment gateway. Everything runs in the
browser and the order lands in the restaurant's WhatsApp.

---

## Run it

```bash
npm install
npm run dev
```

Opens at <http://localhost:5173>.

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm run assets    # re-cut the product photos out of the menu artwork
```

Deploy by uploading `dist/` to any static host — Netlify, Vercel, Cloudflare
Pages, GitHub Pages, or plain shared hosting. There is nothing to run on a
server.

---

## Where to change things

| I want to change… | File | What to edit |
|---|---|---|
| **WhatsApp number orders go to** | `src/config.js` | `whatsappNumber` — digits only with country code, e.g. `919567158313` |
| Phone, address, opening hours | `src/config.js` | `phone`, `address`, `openingHours` |
| Google Maps / Instagram / Facebook links | `src/config.js` | `googleMapsUrl`, `instagramUrl`, `facebookUrl` |
| **Delivery charge** | `src/config.js` | `delivery.bands` — each band is `{ withinKm, fee }`, read top to bottom; the last one must be `withinKm: null` |
| **The kitchen's map pin** | `src/config.js` | `coordinates.lat` / `coordinates.lng` — every delivery distance is measured from here |
| **Furthest you will deliver** | `src/config.js` | `delivery.maxKm` — currently `10`; pins beyond it are refused (`null` = no limit) |
| Road allowance on distance | `src/config.js` | `delivery.roadFactor` (`1` = straight-line, `1.3` adds ~30% for roads) |
| Minimum order for delivery | `src/config.js` | `deliveryMinimum` (0 = off) |
| **Menu items and prices** | `src/data/menu.js` | see below |
| Product photos | `public/images/products/` | see [IMAGES.md](IMAGES.md) |
| Colours, type, spacing | `src/styles/global.css` | the `:root` tokens at the top |

Anything in `src/config.js` written as `[LIKE_THIS]` is still a placeholder.
The site detects those and shows "Coming soon" instead of a broken link.

### Menu data

Every item lives in `src/data/menu.js`. Prices are whole rupees (integers), so
totals are always exact.

A simple item:

```js
{
  id: 'zinger-burger',
  categoryId: 'burger',
  name: 'Zinger Burger',
  description: 'Crispy chicken fillet in a soft sesame bun.',
  image: `${IMG}/burger.webp`,
  price: 129,
}
```

An item with choices — the key in `prices` is the selected option ids joined
with `|`, in the order the groups are declared:

```js
{
  id: 'bucket-chicken',
  optionGroups: [
    { id: 'size',    label: 'Choose your bucket', options: [{ id: '6', label: '6 pcs' }, …] },
    { id: 'flavour', label: 'Choose flavour',     options: [{ id: 'original', label: 'Zingos Original' }, …] },
  ],
  prices: { '6|original': 499, '6|peri': 549, '9|original': 699, … },
  addons: ['mayo', 'dips', 'kuboos', 'extra-piece'],
}
```

- `featured: true` puts an item in the Fan Favourites rail.
- `badge: 'Signature'` shows a gold badge on its card.
- `tags: ['spicy']` / `['veg']` show the small chips.
- `addons: [...]` offers the extras from the `ADDONS` catalogue on that item.
- `image: null` falls back to a branded orange tile — no broken images.

---

## How the cart works

`src/utils/cart.js` is a small observable store backed by `localStorage`
(`zingos.cart.v1`). Everything else — the badge, the floating bar, the drawer,
the review screen, the WhatsApp message — reads from it, so there is one and
only one place where money is calculated.

- A cart line's identity is `product + options + add-ons`. Adding the same
  bucket with the same flavour and extras bumps the quantity; a different
  flavour becomes its own line.
- Line total is `(base price + add-ons) × quantity` — add-ons belong to each
  unit, not to the line.
- The cart survives a refresh. Emptying it clears the storage key.
- Customer name, phone and address are held **in memory only** and are never
  written to storage.

## How the delivery charge is worked out

At checkout the customer pins where they want the food on a map. The site
measures the straight-line distance from that pin to the kitchen
(`CONFIG.coordinates`) and charges the first band it falls inside:

| Distance from the kitchen | Charge |
|---|---|
| Up to 5 km | Free |
| 5 – 10 km | ₹40 |
| More than 10 km | We don't deliver |

Those bands live in `CONFIG.delivery.bands` and are written down once — the
map, the totals, the review screen, the WhatsApp message and the "Find us"
section all read from there, so changing a number changes it everywhere.

**10 km is a hard limit**, set by `CONFIG.delivery.maxKm`. A pin beyond it is
refused at checkout — the customer sees how far out they are and is pointed at
pickup instead, and the Confirm button stays disabled, so an order that the
kitchen would have to turn down never reaches WhatsApp. The limit also closes
off the last band: `bands` ends at `{ withinKm: null, fee: 40 }`, and `maxKm`
is what turns that open-ended "beyond 5 km" into "5 – 10 km" everywhere it is
shown. Set `maxKm: null` to deliver anywhere, and add another band if you want
a third price.

**The map needs no API key and no Google account.** It is OpenStreetMap drawn
with [Leaflet](https://leafletjs.com), and place search is the free Nominatim
service. Only the *link* that goes to the kitchen is a Google Maps one, so the
rider taps it and navigates in the app they already use.

The map opens framed on the whole delivery area, with a dashed green ring at
the free radius and a solid red one at the limit, so the customer can see where
they stand before a price is quoted.

The customer can set the pin three ways — GPS, searching for a place, or just
dragging the map — because any one of them alone fails somebody. If they will
not or cannot use a map at all, **"Can't use the map? Pick your distance
instead"** under the map card reveals the same bands as plain radio buttons.
A hand-picked band and a measured pin cancel each other out, so the order can
never carry two different answers.

Distance is measured as the crow flies, which is always a little shorter than
the road. `CONFIG.delivery.roadFactor` bills closer to real driving distance if
you want it to — leave it at `1` for straight-line, or set `1.3` to add a
typical 30% road allowance.

> **Moving the shop?** Open Google Maps, right-click exactly on ZINGOS, and
> click the latitude/longitude at the top of the menu to copy them. Paste them
> into `coordinates` in `src/config.js`. If those are ever blank the site
> cannot measure anything, so it quietly hides the map and asks the customer to
> pick a distance band instead — it never invents a charge.

---

## How WhatsApp ordering works

All of it is in `src/utils/whatsapp.js`.

1. The customer fills in name, phone, pickup/delivery (+ address and their
   map pin, or the distance band they picked by hand) and any notes.
2. `buildOrderMessage()` formats a plain-text order with WhatsApp `*bold*`
   markers, kept tight enough that a normal order fits on one phone screen.
3. A pinned location travels with the order as its own line, a plain
   `https://www.google.com/maps?q=<lat>,<lng>` link the rider can tap to
   navigate.
4. `buildWhatsAppUrl()` URL-encodes it onto `https://wa.me/<number>?text=…` —
   the official Click-to-Chat link. On a phone that opens the WhatsApp app; on
   a desktop it opens WhatsApp Web.
5. The site then says the message is **ready** and the customer still has to
   press Send. It never claims the restaurant received the order, because the
   page has no way to know whether it was sent.

If `whatsappNumber` is still a placeholder, the final step shows a warning plus
the full order text with a Copy button instead of generating a broken link.

---

## Project structure

```
index.html                 page shell, SEO + Open Graph tags
brand-assets/              the official ZINGOS logo and menu card (source of truth)
scripts/
  build-assets.mjs         crops the product shots out of the menu artwork
  lib-cutout.mjs           removes the printed orange background
public/
  favicon-*.png            rooster mark on brand orange
  images/
    logo/                  white wordmark + rooster mark (transparent PNG)
    products/              product photos (transparent WebP)
src/
  main.js                  entry point: renders sections, wires add-to-cart
  config.js                ⭐ all restaurant details
  data/menu.js             ⭐ all menu items and prices
  components/
    navbar.js  hero.js  featured.js  menu.js  about.js  location.js  footer.js
    productModal.js        the size/flavour/extras bottom sheet
    cart.js                cart drawer + the 4-step order flow
    checkout.js            form, validation, review, WhatsApp handoff
    toast.js  icons.js
  utils/
    cart.js                cart state + money
    whatsapp.js            message + Click-to-Chat URL
    formatCurrency.js  dom.js
  styles/                  one stylesheet per area
```

## Tech

Vite + vanilla JavaScript (ES modules) + CSS. No framework, no UI library, no
icon package — the icons are inline SVG. The whole site is ~59 kB of JS and
~44 kB of CSS (18 kB / 9 kB gzipped).

Type is Luckiest Guy for display and Poppins for everything else, loaded from
Google Fonts — the closest freely licensed match to the printed menu card.

## The photography

Every food photo on the site was cut out of the restaurant's own menu artwork in
`brand-assets/`. `npm run assets` re-runs that pipeline: it crops each shot,
removes the printed orange background by growing a mask in from the crop border
(so golden crust and red onion survive where a plain colour key would eat them),
trims, resizes and writes transparent WebP.

To replace a photo with a real one, just drop a file into
`public/images/products/` and point the item's `image` at it — no need to run
the script. See [IMAGES.md](IMAGES.md) for the list of shots still worth taking.

## Accessibility

Semantic landmarks, a skip link, keyboard-reachable product cards, focus traps
in the sheets, Escape to close, visible focus rings, labelled form fields with
inline error messages, `aria-live` on the cart badge and quantities, and no
information carried by colour alone.

---

## Not in version 1 (by design)

Online payment, order IDs, order history, accounts, an admin dashboard, live
order tracking, coupons, inventory. The cart and checkout are structured so a
payment step or an order API can be added later without rewriting them.

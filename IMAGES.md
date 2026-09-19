# ZINGOS — image shopping list

Every photo on the site right now was lifted out of your own printed menu artwork
(`brand-assets/menu-page-1.jpg`, `menu-page-2.jpg`) and had its orange background
removed. Nothing is stock. That covers 9 real photos — but several items are
currently sharing a photo with a sibling, and a few have no photo at all.

This is the list of what to shoot, in priority order.

---

## How to shoot / send them

| | |
|---|---|
| **Format** | JPG, PNG or HEIC (straight off a phone is fine — I convert them) |
| **Size** | 1000 × 1000 px or larger, roughly square framing |
| **Background** | Plain and even — white table, ZINGOS orange card, or a clean tray. A solid background is what lets me cut the food out cleanly. |
| **Lighting** | Bright, even, no harsh flash shadow. Daylight near a window works. |
| **Framing** | One item per photo, centred, filling ~80% of the frame, shot from a 3/4 angle (slightly above) |
| **Avoid** | Text, price stickers, watermarks, busy backgrounds, other dishes in frame |
| **Naming** | Use the exact filename in the tables below |
| **Where** | Drop them into `brand-assets/photos/`, then run `npm run photos` |
| **Branding** | Nothing from another restaurant in frame — no branded boxes, wrappers, cups or napkins |

---

## Done — photos you supplied

Sixteen products now have their own photograph. The originals live in
`brand-assets/photos/`; `npm run photos` crops each one to a square tile and
writes the WebP the site actually loads.

| Now showing its own photo |
|---|
| All four pizzas — Tandoori, Cheese Burst, BBQ, Veg Supreme |
| Classic Fries, Peri Peri Fries |
| Nuggets, Fried Shrimps |
| Zinger Burger, Chicken Smash Burger |
| Spicy Loaded, Cheesy Loaded |
| Blue Mint, Strawberry, Watermelon and Virgin mojitos |

> These are photographs, not cut-outs, so they fill their tile instead of
> floating on the gradient like the nine images taken off the menu card. To
> cut them out properly the site needs trained background removal — the
> Magnific connector does this, on a paid plan.

---

## Rejected — cannot be used

Two supplied photos carry **another restaurant's branding**, so they cannot go
on the ZINGOS menu:

| File | Problem |
|---|---|
| `mini bites.jpeg` | sliders in a box branded **NEXT LEVEL BURGERS** |
| the wrap photo | paper printed **SKEWRD** |

Mini Bites and both wraps keep the shared burger/wrap photo until clean shots
exist. Reshoot these two in plain ZINGOS packaging, or on a bare tray.

> The Blue Mint mojito shot had a liquor bottle in the background. It is
> cropped out — these are mocktails.

---

## Priority 1 — still no photo at all

| Item | Filename |
|---|---|
| Cheese Fries | `cheese-fries.webp` |
| Mayo (add-on) | `addon-mayo.webp` |
| Dips (add-on) | `addon-dips.webp` |
| Kuboos (add-on) | `addon-kuboos.webp` |

---

## Priority 2 — still showing the wrong flavour

| Item | Filename | Why |
|---|---|---|
| Green Apple mojito | `mojito-green-apple.webp` | the only mojito still on the shared photo |
| Taro Velvet | `bubble-tea-taro.webp` | all 4 bubble teas show the same milk tea |
| Matcha Mist | `bubble-tea-matcha.webp` | |
| Mango Saga Bliss | `bubble-tea-mango.webp` | |
| Coffee Rush | `bubble-tea-coffee.webp` | |

---

## Priority 3 — still sharing a family photo

| Item | Filename | Currently showing |
|---|---|---|
| Zingos Snack | `combo-snack.webp` | the bucket chicken photo |
| Zingos Regular | `combo-regular.webp` | ” |
| Zingos Meal | `combo-meal.webp` | ” |
| Zingos Family | `combo-family.webp` | ” |
| Zingos Party | `combo-party.webp` | ” |
| Spicy Zinger Wrap | `wrap-spicy-zinger.webp` | the wrap photo |
| King Wrap | `wrap-king.webp` | ” |
| Zinger Club | `zinger-club.webp` | the burger photo |
| Sizzling Burger | `sizzling-burger.webp` | ” |
| Mini Bites | `mini-bites.webp` | ” |

> A combo shot works best photographed as the **whole tray** — chicken, kuboos,
> dip, fries and the Pepsi bottle together. That's what makes a combo look worth
> the price.

---

## Priority 4 — brand & marketing

| What | Filename | Notes |
|---|---|---|
| Hero shot | `hero.webp` | The one photo people see first (currently the Dipped Strips shot from the menu card). A generous spread — full bucket, a burger, fries, a drink — on a plain or orange background. Landscape or square, at least 1600 px wide. |
| Social share image | `public/og-image.jpg` | 1200 × 630 px. Shown when the link is shared on WhatsApp, Instagram or Facebook. Right now the link preview falls back to the rooster tile. |
| Storefront / interior | `storefront.webp` | Optional, for the Location section — makes pickup customers confident they've found the right place. |
| **Logo source file** | — | If you have the original **vector** logo (`.ai`, `.svg`, `.eps` or `.pdf`), send it. The current logo was traced out of a JPEG, so it's sharp at normal sizes but not infinitely scalable. |

---

## Still needed as text (not images)

Everything in `src/config.js` is filled in except:

- **Facebook page URL** — `facebookUrl`. Until it's set, only the Instagram
  icon shows in the footer.
Delivery pricing is set: free within 5 km, ₹40 out to 10 km, and no delivery
past 10 km (`delivery.bands` / `delivery.maxKm`).

Already set: address (Alakode Road, Manna Road, Taliparamba, Kerala 670141),
phone `+91 92921 71777`, WhatsApp `+91 95671 58313`, opening hours
(every day, 4:00 PM – 2:00 AM), Google Maps link and Instagram.

---

## After you send the images

Drop them in `public/images/products/` with the filenames above and tell me —
I'll cut out the backgrounds, convert them to WebP, wire each one to its menu
item in `src/data/menu.js` and rebuild. No design work needed on your side.

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
| **Where** | Drop them into `public/images/products/` |

---

## Priority 1 — no photo at all

These six show a branded orange tile with the rooster mark instead of food.

| Item | Filename |
|---|---|
| Classic Fries | `classic-fries.webp` |
| Cheese Fries | `cheese-fries.webp` |
| Peri Peri Fries | `peri-peri-fries.webp` |
| Mayo (add-on) | `addon-mayo.webp` |
| Dips (add-on) | `addon-dips.webp` |
| Kuboos (add-on) | `addon-kuboos.webp` |

> A single fries photo would already fix the three fries rows if you'd rather not
> shoot all three — say the word and I'll point all three at it.

---

## Priority 2 — wrong flavour showing

These currently show a photo of a *different* flavour, which is the most
misleading gap on the site.

| Item | Filename | Why |
|---|---|---|
| Blue Mint mojito | `mojito-blue-mint.webp` | all 5 mojitos show the same green mojito |
| Strawberry mojito | `mojito-strawberry.webp` | |
| Green Apple mojito | `mojito-green-apple.webp` | |
| Watermelon mojito | `mojito-watermelon.webp` | |
| Virgin mojito | `mojito-virgin.webp` | |
| Taro Velvet | `bubble-tea-taro.webp` | all 4 bubble teas show the same milk tea |
| Matcha Mist | `bubble-tea-matcha.webp` | |
| Mango Saga Bliss | `bubble-tea-mango.webp` | |
| Coffee Rush | `bubble-tea-coffee.webp` | |
| Tandoori Chicken Pizza | `pizza-tandoori.webp` | the menu's pizza photo is a **pepperoni** pizza — none of your four pizzas are pepperoni |
| Cheese Burst Pizza | `pizza-cheese-burst.webp` | |
| BBQ Chicken Pizza | `pizza-bbq.webp` | |
| Veg Supreme Pizza | `pizza-veg-supreme.webp` | |

---

## Priority 3 — sharing a family photo

These look right, they're just not the exact item.

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
| Zinger Burger | `zinger-burger.webp` | ” |
| Chicken Smash Burger | `chicken-smash-burger.webp` | ” |
| Sizzling Burger | `sizzling-burger.webp` | ” |
| Mini Bites | `mini-bites.webp` | ” |
| Nuggets | `nuggets.webp` | the chicken pops photo |
| Fried Shrimps | `fried-shrimps.webp` | ” |
| Spicy Loaded | `loaded-spicy.webp` | the loaded fries photo |
| Cheesy Loaded | `loaded-cheesy.webp` | ” |

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
Delivery pricing is set: free within 5 km, ₹40 beyond that
(`delivery.freeWithinKm` / `delivery.feeBeyond`).

Already set: address (Alakode Road, Manna Road, Taliparamba, Kerala 670141),
phone `+91 92921 71777`, WhatsApp `+91 95671 58313`, opening hours
(every day, 4:00 PM – 2:00 AM), Google Maps link and Instagram.

---

## After you send the images

Drop them in `public/images/products/` with the filenames above and tell me —
I'll cut out the backgrounds, convert them to WebP, wire each one to its menu
item in `src/data/menu.js` and rebuild. No design work needed on your side.

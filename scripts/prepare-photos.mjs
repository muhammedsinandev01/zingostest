/**
 * Turns supplied product photographs into web-ready menu images.
 *
 * The photos arrive however they arrive - straight off WhatsApp, on whatever
 * background the person who made them happened to use - so each one is cropped
 * to a square tile that fills its slot on the menu card.
 *
 * They are NOT cut out. The existing nine menu images are cut-outs because
 * they came off a flat printed orange background that can be keyed away by
 * colour. These are photographs of real scenes - marble, wood, a hand, a
 * blurred cafe - and keying those by colour eats the food along with the
 * background: it wrecked the nuggets and the fries outright and left a white
 * box around four others. Separating a subject from a scene needs trained
 * segmentation, which is what Magnific's `images_remove_background` does once
 * that account is on a paid plan. Until then an honest photograph in a filled
 * tile beats a mangled cut-out.
 *
 * A chequer background is still repainted white first, because that is a flat
 * two-tone artefact rather than a real scene.
 *
 * Run with:  npm run photos
 * A contact sheet of every result is written to scripts/.photo-qa.jpg so the
 * cut-outs can actually be looked at rather than assumed.
 */
import sharp from 'sharp';
import { readFileSync, existsSync } from 'node:fs';
import { flatCutout, flattenCheckerboard, coverage } from './lib-flat-cutout.mjs';

// Sources live outside public/ so the originals - several megabytes of
// phone-sized JPEG - are never deployed. Only the built WebP is.
const SRC = 'brand-assets/photos';
const OUT = 'public/images/products';
const WIDTH = 480;

const W = (name) => `${SRC}/WhatsApp Image 2026-09-17 at ${name}.jpeg`;

/**
 * chequer: repaint a baked-in transparency chequerboard white before cropping
 * crop:    [left, top, width, height] applied before anything else
 */
const PHOTOS = [
  /* Pizzas. The menu card's pizza shot is a pepperoni, which is not on the
     menu at all, so all four pizzas were showing something we do not sell. */
  { out: 'pizza-veg-supreme', src: W('2.34.56 PM (1)'), mode: 'photo', chequer: true },
  { out: 'pizza-cheese-burst', src: W('2.34.56 PM'), mode: 'photo' },
  { out: 'pizza-tandoori', src: W('2.34.57 PM (1)'), mode: 'photo', chequer: true },
  { out: 'pizza-bbq', src: W('2.34.57 PM'), mode: 'photo', chequer: true },

  /* Chicken sides that were all borrowing the chicken-pops photo. */
  { out: 'nuggets', src: W('2.34.59 PM (1)'), mode: 'photo', chequer: true },
  { out: 'fried-shrimps', src: `${SRC}/fried shrimps.jpeg`, mode: 'photo' },

  /* Burgers that were all borrowing one family photo. */
  { out: 'chicken-smash-burger', src: W('2.35.00 PM (2)'), mode: 'photo' },
  { out: 'zinger-burger', src: W('2.35.00 PM (3)'), mode: 'photo' },

  /* Loaded fries variants. */
  { out: 'loaded-cheesy', src: W('2.35.01 PM (1)'), mode: 'photo' },
  { out: 'loaded-spicy', src: W('2.35.01 PM'), mode: 'photo' },

  /* Fries that had no photo at all. */
  { out: 'classic-fries', src: `${SRC}/classic fries.jpeg`, mode: 'photo', chequer: true },
  { out: 'peri-peri-fries', src: `${SRC}/peri peri fries.jpeg`, mode: 'photo', chequer: true },

  /* Mojitos - every one of the five was showing the same green glass.
     Blue Mint is cropped in to drop a liquor bottle out of the background:
     these are mocktails, and the site should not suggest otherwise. */
  { out: 'mojito-blue-mint', src: `${SRC}/blue mint mojito.jpeg`, mode: 'photo', crop: [250, 250, 646, 1100] },
  { out: 'mojito-strawberry', src: `${SRC}/strawberry mojito.jpeg`, mode: 'photo' },
  { out: 'mojito-virgin', src: `${SRC}/virgin mojito.jpeg`, mode: 'photo' },
  { out: 'mojito-watermelon', src: `${SRC}/watermelon mojito.jpeg`, mode: 'photo' },
];


/* Two supplied photos are deliberately NOT built, both for the same reason -
   they carry another restaurant's branding, which cannot appear on this menu:
     `mini bites.jpeg`        sliders in a box branded NEXT LEVEL BURGERS
     2.35.00 PM (1).jpeg      a wrap in paper printed SKEWRD
   Mini Bites and the wraps keep their shared photos until clean shots exist.
   Also spare: the popcorn-chicken-in-a-bucket shot, which duplicates the
   Chicken Pops photo the site already has. */

const results = [];

for (const photo of PHOTOS) {
  if (!existsSync(photo.src)) {
    console.log('missing  ', photo.src);
    continue;
  }

  let buf = readFileSync(photo.src);
  if (photo.crop) {
    const [left, top, width, height] = photo.crop;
    buf = await sharp(buf).extract({ left, top, width, height }).toBuffer();
  }

  let pipeline;
  let note = '';

  // A chequer background is repainted white first, so the cutout below has a
  // single flat tone to key on instead of two greys straddling the food.
  if (photo.chequer) buf = await flattenCheckerboard(buf);

  if (photo.mode === 'cutout') {
    try {
      const cut = await flatCutout(buf, { tol: photo.tol ?? 34, tones: photo.tones ?? 2 });
      const pct = await coverage(cut);
      note = `cutout ${(pct * 100).toFixed(0)}% solid`;
      pipeline = sharp(cut)
        .trim({ threshold: 1 })
        .resize({ width: WIDTH, kernel: 'lanczos3', withoutEnlargement: false });
    } catch (error) {
      note = `cutout failed (${error.message}) - kept as photo`;
      pipeline = sharp(buf).resize(WIDTH, WIDTH, { fit: 'cover', position: 'attention' });
    }
  } else {
    note = 'photo';
    pipeline = sharp(buf).resize(WIDTH, WIDTH, { fit: 'cover', position: 'attention' });
  }

  const file = `${OUT}/${photo.out}.webp`;
  await pipeline.webp({ quality: 86, alphaQuality: 90, effort: 6 }).toFile(file);
  results.push({ file, name: photo.out });
  console.log('photo ->', photo.out.padEnd(22), note);
}

/* Contact sheet, on the same warm tile the menu card uses, so a cut-out with a
   ragged edge or a leftover halo is obvious rather than theoretical. */
const CELL = 240;
const cols = 6;
const rows = Math.ceil(results.length / cols);
const tiles = [];
for (let i = 0; i < results.length; i++) {
  const tile = await sharp({
    create: { width: CELL, height: CELL, channels: 4, background: { r: 255, g: 226, b: 196, alpha: 1 } },
  })
    .composite([
      {
        input: await sharp(results[i].file)
          .resize(CELL - 24, CELL - 24, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .toBuffer(),
        top: 12,
        left: 12,
      },
    ])
    .png()
    .toBuffer();
  tiles.push({ input: tile, left: (i % cols) * CELL, top: Math.floor(i / cols) * CELL });
}
await sharp({ create: { width: cols * CELL, height: rows * CELL, channels: 3, background: { r: 30, g: 20, b: 14 } } })
  .composite(tiles)
  .jpeg({ quality: 90 })
  .toFile('scripts/.photo-qa.jpg');

console.log(`\n${results.length} images written · QA sheet -> scripts/.photo-qa.jpg`);

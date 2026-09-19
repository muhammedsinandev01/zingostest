/**
 * ZINGOS asset pipeline.
 *
 * Every photograph on this site is lifted straight out of the official ZINGOS
 * menu artwork in /brand-assets - nothing is stock, nothing is invented. This
 * script crops each product shot, keys out the printed orange background and
 * writes web-ready transparent WebP files into /public/images.
 *
 * Re-run with:  npm run assets
 * Replacing a shot later: drop a transparent PNG/WebP into
 * public/images/products/ with the same filename and skip this script.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { cutout } from './lib-cutout.mjs';

const SRC = 'brand-assets';
const OUT = 'public/images';

const PRODUCTS = [
  { file: 'bucket-chicken', src: 'menu-page-1.jpg', box: [0, 0, 196, 172], width: 460 },
  { file: 'dipped-strips',  src: 'menu-page-1.jpg', box: [498, 528, 238, 238], width: 440 },
  { file: 'pizza',          src: 'menu-page-1.jpg', box: [975, 655, 300, 202], width: 520, clear: [[0, 0, 120, 45]] },
  { file: 'wrap',           src: 'menu-page-2.jpg', box: [620, 28, 300, 250], width: 480 },
  { file: 'chicken-pops',   src: 'menu-page-2.jpg', box: [730, 250, 280, 230], width: 480 },
  { file: 'burger',         src: 'menu-page-2.jpg', box: [610, 460, 256, 235], width: 460, clear: [[188, 150, 70, 90]] },
  { file: 'loaded-fries',   src: 'menu-page-2.jpg', box: [620, 850, 290, 235], width: 480 },
  { file: 'mojito',         src: 'menu-page-2.jpg', box: [762, 648, 126, 218], width: 300, grow: 3, despill: 85 },
  { file: 'bubble-tea',     src: 'menu-page-2.jpg', box: [890, 646, 92, 218], width: 300, grow: 3, despill: 85 },
];

await mkdir(`${OUT}/products`, { recursive: true });
await mkdir(`${OUT}/logo`, { recursive: true });

for (const p of PRODUCTS) {
  const [left, top, width, height] = p.box;
  const crop = await sharp(`${SRC}/${p.src}`).extract({ left, top, width, height }).png().toBuffer();
  const cut = await cutout(crop, { grow: p.grow ?? 1, clear: p.clear ?? [], despill: p.despill ?? 0, minBlob: p.minBlob ?? 260 });
  await sharp(cut)
    .trim({ threshold: 1 })
    .resize({ width: p.width, kernel: 'lanczos3', withoutEnlargement: false })
    .sharpen({ sigma: 0.7 })
    .webp({ quality: 86, alphaQuality: 90, effort: 6 })
    .toFile(`${OUT}/products/${p.file}.webp`);
  console.log('product ->', p.file);
}

/* ---------------------------------------------------------------------------
 * Dropped-in photographs.
 *
 * These are not cut out of the menu artwork - they are ordinary photos saved
 * straight into public/images/products/. All this does is make a web-sized
 * WebP next to the original, because a phone-sized JPEG is far too heavy to
 * ship: the "Ready when you are" banner is 943 KB as shot and 155 KB here.
 *
 * The page asks for the WebP first and keeps the original as its fallback, so
 * replacing the photograph means dropping in a new file and re-running
 * `npm run assets` - otherwise the old WebP keeps being served and the new
 * photograph never shows up.
 * ------------------------------------------------------------------------ */
const PHOTOS = [
  { file: 'ready', ext: 'jpeg', width: 1440, quality: 75 },
];

for (const photo of PHOTOS) {
  const src = `${OUT}/products/${photo.file}.${photo.ext}`;
  if (!existsSync(src)) {
    console.log('photo -> skipped, no', src);
    continue;
  }
  await sharp(src)
    .resize({ width: photo.width, kernel: 'lanczos3', withoutEnlargement: true })
    .webp({ quality: photo.quality, effort: 6 })
    .toFile(`${OUT}/products/${photo.file}.webp`);
  console.log('photo ->', photo.file);
}

/* ---------------------------------------------------------------------------
 * Logo. The source is the official white wordmark printed on brand orange, so
 * alpha is taken from how close each pixel is to white and the colour is
 * flattened to pure white - giving a mark that sits on any background.
 * ------------------------------------------------------------------------ */
async function whiteMark(box, outFile, width) {
  const [left, top, w, h] = box;
  const { data, info } = await sharp(`${SRC}/zingos-logo-source.jpg`)
    .extract({ left, top, width: w, height: h })
    .raw().toBuffer({ resolveWithObject: true });
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * info.channels], g = data[i * info.channels + 1], b = data[i * info.channels + 2];
    const whiteness = (Math.min(r, g, b) - 95) / (245 - 95);
    px[i * 4] = 255; px[i * 4 + 1] = 255; px[i * 4 + 2] = 255;
    px[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, whiteness)) * 255);
  }
  await sharp(px, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 1 })
    .resize({ width, kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toFile(outFile);
  console.log('logo ->', outFile);
}

await whiteMark([74, 18, 292, 162], `${OUT}/logo/zingos-logo.png`, 720);
await whiteMark([256, 37, 59, 90], `${OUT}/logo/zingos-mark.png`, 240);

/* Favicon / share image: the official rooster mark on brand orange. */
const mark = await sharp(`${OUT}/logo/zingos-mark.png`).resize({ width: 400, height: 400, fit: 'inside' }).toBuffer();
const markMeta = await sharp(mark).metadata();
// sharp resizes before it composites, so the tile is flattened first and
// scaled in a second pass.
const tile = await sharp({
  create: { width: 640, height: 640, channels: 4, background: { r: 240, g: 78, b: 35, alpha: 1 } },
})
  .composite([{ input: mark, top: Math.round((640 - markMeta.height) / 2), left: Math.round((640 - markMeta.width) / 2) }])
  .png()
  .toBuffer();
for (const size of [32, 180, 512]) {
  await sharp(tile).resize(size, size).png().toFile(`public/favicon-${size}.png`);
}
console.log('favicons ->', 'public/favicon-*.png');


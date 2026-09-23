/**
 * Builds the two images that are not a single product: the hero spread and
 * the social share card.
 *
 * Both are composed from artwork the restaurant already owns - the cut-outs
 * lifted off the printed menu card, and the white ZINGOS wordmark - rather
 * than sourced from anywhere else, so they stay honest to the brand and no
 * licence is involved.
 *
 * Run with:  npm run brand
 */
import sharp from 'sharp';

const P = 'public/images/products';
const LOGO = 'public/images/logo/zingos-logo.png';

const load = (name, width) =>
  sharp(`${P}/${name}.webp`).resize({ width, kernel: 'lanczos3' }).toBuffer();

/* -------------------------------------------------------------------------- */
/* Hero spread                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The hero sits on the orange gradient with a soft glow behind it and a drop
 * shadow applied in CSS, so this has to stay transparent: the shadow is cast
 * from whatever silhouette lands here.
 *
 * A spread rather than one item, because the hero is the only place the whole
 * range is argued at once - bucket, burger, fries and a drink says "there is
 * a meal here", where a single basket of strips only says "chicken".
 */
async function buildHero() {
  const W = 1200;
  const H = 1000;

  /*
   * Ordered back to front: whatever is listed later overlaps what came before.
   *
   * Dipped Strips is the centrepiece rather than the bucket, even though the
   * bucket is the signature. The bucket cut-out was cropped through the
   * chicken on the printed card, so it has straight vertical edges - invisible
   * at menu-row size, glaring when it is the biggest thing on the page.
   */
  const layers = [
    { name: 'dipped-strips', width: 560, left: 330, top: 10 },
    { name: 'mojito', width: 250, left: 930, top: 290 },
    { name: 'burger', width: 470, left: 30, top: 495 },
    { name: 'loaded-fries', width: 500, left: 610, top: 555 },
  ];

  const composite = [];
  for (const layer of layers) {
    composite.push({ input: await load(layer.name, layer.width), left: layer.left, top: layer.top });
  }

  const flat = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composite)
    .png()
    .toBuffer();

  // Trimmed so the art sits tight in its box - the CSS centres it, and stray
  // transparent margin would push the spread off-centre.
  await sharp(flat)
    .trim({ threshold: 1 })
    .webp({ quality: 88, alphaQuality: 92, effort: 6 })
    .toFile(`${P}/hero.webp`);

  const meta = await sharp(`${P}/hero.webp`).metadata();
  console.log('hero  ->', `${meta.width}x${meta.height}`, 'transparent');
}

/* -------------------------------------------------------------------------- */
/* Social share card                                                           */
/* -------------------------------------------------------------------------- */

/**
 * 1200x630 is what WhatsApp, Facebook and X all crop from. It is read at
 * thumbnail size in a chat, so it carries the wordmark, one line of promise
 * and a lot of food - not a paragraph nobody will zoom into.
 *
 * The type is the ZINGOS wordmark PNG rather than live text: the display face
 * is a webfont, and a build machine cannot be assumed to have it installed.
 */
async function buildOgImage() {
  const W = 1200;
  const H = 630;

  const background = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <linearGradient id="brand" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stop-color="#f4622c" />
          <stop offset="45%" stop-color="#ee5522" />
          <stop offset="100%" stop-color="#d33f12" />
        </linearGradient>
        <radialGradient id="glow" cx="0.72" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.26" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#brand)" />
      <rect width="${W}" height="${H}" fill="url(#glow)" />
    </svg>`);

  const tagline = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="520" height="150">
      <style>
        .lede { font-family: 'Segoe UI', 'Poppins', 'Helvetica Neue', Arial, sans-serif;
                font-size: 34px; font-weight: 700; fill: #ffffff; }
        .sub  { font-family: 'Segoe UI', 'Poppins', 'Helvetica Neue', Arial, sans-serif;
                font-size: 25px; font-weight: 600; fill: #ffe6d6; }
      </style>
      <text x="0" y="40" class="lede">Crispy. Bold. Zingos.</text>
      <text x="0" y="90" class="sub">Order on WhatsApp &#183; Pickup or delivery</text>
    </svg>`);

  await sharp(background)
    .composite([
      { input: await load('dipped-strips', 360), left: 700, top: 30 },
      { input: await load('mojito', 175), left: 995, top: 225 },
      { input: await load('burger', 320), left: 615, top: 320 },
      { input: await load('loaded-fries', 340), left: 855, top: 360 },
      { input: await sharp(LOGO).resize({ width: 380 }).toBuffer(), left: 72, top: 150 },
      { input: tagline, left: 76, top: 330 },
    ])
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4' })
    .toFile('public/og-image.jpg');

  console.log('og    -> 1200x630  public/og-image.jpg');
}

await buildHero();
await buildOgImage();

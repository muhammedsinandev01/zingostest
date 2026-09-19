import sharp from 'sharp';

/**
 * Lifts a product photo off a flat background.
 *
 * This is the sibling of `cutout` in lib-cutout.mjs. That one knows about one
 * specific background - the ZINGOS orange the menu card is printed on. This
 * one learns the background from the photo's own border, so it copes with the
 * assorted backgrounds supplied photos arrive on: plain white, solid brand
 * orange, a near-black table, and the grey checkerboard that a "transparent"
 * export picks up when it is saved as a JPEG, which has no alpha channel to
 * carry the transparency in.
 *
 * The palette is learned as up to two tones for exactly that last case: a
 * checkerboard is two greys, and treating it as one average grey would either
 * miss half the squares or eat into the food.
 *
 * Background is grown inward from the border rather than matched across the
 * whole image, so a white plate or a pale sauce in the middle of the shot
 * survives even though it is the same colour as the background around it.
 */

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Up to `k` dominant tones among the border pixels, by simple clustering. */
function learnPalette(samples, k = 2, spread = 40) {
  const palette = [];
  for (const px of samples) {
    const near = palette.find((c) => dist(c.mean, px) <= spread);
    if (near) {
      near.n += 1;
      for (let i = 0; i < 3; i++) near.mean[i] += (px[i] - near.mean[i]) / near.n;
    } else if (palette.length < k) {
      palette.push({ mean: [...px], n: 1 });
    }
  }
  // A tone that barely appears is noise on the border, not part of the
  // background - a stray crumb touching the edge, say.
  const total = samples.length;
  return palette.filter((c) => c.n / total > 0.12).map((c) => c.mean);
}

/**
 * Repaints a baked-in transparency checkerboard as flat white.
 *
 * A "transparent" export saved as JPEG loses its alpha and keeps the editor's
 * grey chequer pattern as real pixels. Those two greys are unsaturated and
 * light, which food never is, so recolouring every near-grey light pixel to
 * white turns the chequer back into a plain studio background that a
 * single-tone cutout can then lift off cleanly.
 */
export async function flattenCheckerboard(input, { maxChroma = 20, minLuma = 168 } = {}) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const out = Buffer.from(data);
  for (let i = 0; i < w * h; i++) {
    const r = out[i * 3], g = out[i * 3 + 1], b = out[i * 3 + 2];
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    if (chroma <= maxChroma && luma >= minLuma) {
      out[i * 3] = 255;
      out[i * 3 + 1] = 255;
      out[i * 3 + 2] = 255;
    }
  }
  return sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
}

export async function flatCutout(input, { tol = 34, tones = 2, feather = 1.1, minSolid = 0.00035 } = {}) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const at = (i) => [data[i * ch], data[i * ch + 1], data[i * ch + 2]];

  /* What does the edge of this photo look like? ---------------------------- */
  const samples = [];
  for (let x = 0; x < w; x += 2) {
    samples.push(at(x), at((h - 1) * w + x));
  }
  for (let y = 0; y < h; y += 2) {
    samples.push(at(y * w), at(y * w + w - 1));
  }
  const palette = learnPalette(samples, tones);
  const isBackground = (p) => palette.some((c) => dist(p, c) <= tol);

  /* Grow it inward from the border ---------------------------------------- */
  const bg = new Uint8Array(w * h);
  const queue = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (bg[i] || !isBackground(at(i))) return;
    bg[i] = 1;
    queue.push(i);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (queue.length) {
    const i = queue.pop();
    const x = i % w;
    const y = (i / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  const kept = w * h - bg.reduce((s, v) => s + v, 0);
  if (kept / (w * h) < minSolid) {
    throw new Error('cutout removed almost everything - the background is not flat enough');
  }

  /* Write the mask into the alpha channel, softened so the edge is not a
     staircase of hard pixels against the card behind it. */
  const alpha = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = bg[i] ? 0 : 255;
  const softened = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } })
    .blur(feather)
    .raw()
    .toBuffer();

  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = at(i);
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = softened[i];
  }

  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/** How much of the frame survived a cutout - a sanity figure for the log. */
export async function coverage(pngBuffer) {
  const { data, info } = await sharp(pngBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let solid = 0;
  for (let i = 0; i < info.width * info.height; i++) {
    if (data[i * info.channels + 3] > 128) solid++;
  }
  return solid / (info.width * info.height);
}

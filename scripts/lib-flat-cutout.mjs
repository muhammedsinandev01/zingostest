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
  // toColourspace('b-w') matters: blurring a 1-channel raw buffer otherwise
  // returns it promoted to 3-channel sRGB, and reading that back as one byte
  // per pixel shears the mask into horizontal stripes.
  const softened = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } })
    .blur(feather)
    .toColourspace('b-w')
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

/**
 * Turns a baked-in transparency chequerboard back into real transparency.
 *
 * `flattenCheckerboard` repaints the chequer white, which is enough when the
 * subject is colourful. It is useless when the subject is itself white - a
 * plate of chicken, say - because keying white afterwards eats the plate.
 *
 * So the chequer is found by its STRUCTURE, not its colour: it is the only
 * thing in the frame that alternates between two fixed grey tones on a regular
 * grid. A white plate is smooth, so a window laid over it holds one tone; a
 * window over the chequer holds both.
 *
 * The alternation is measured once per 8px block rather than per pixel. Doing
 * it per pixel with a stride, the obvious way, samples a different phase of
 * the grid on odd and even rows, so neighbouring rows disagree about the same
 * patch of background and the result comes out in stripes.
 */
export async function checkerboardToAlpha(input, { window: win = 9, block = 4, feather = 0.8, erode = 5, largestOnly = true } = {}) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  const lum = new Float32Array(w * h);
  const chroma = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    chroma[i] = Math.max(r, g, b) - Math.min(r, g, b);
  }

  // The chequer's two tones, read off the border where it always sits.
  const edge = [];
  for (let x = 0; x < w; x++) edge.push(lum[x], lum[(h - 1) * w + x]);
  for (let y = 0; y < h; y++) edge.push(lum[y * w], lum[y * w + w - 1]);
  edge.sort((a, b) => a - b);
  const dark = edge[Math.floor(edge.length * 0.2)];
  const light = edge[Math.floor(edge.length * 0.8)];
  if (light - dark < 5) throw new Error('no chequerboard found on the border');

  const TONE = Math.max(3, (light - dark) * 0.3);
  const isTone = (i) => chroma[i] <= 8 && (Math.abs(lum[i] - dark) <= TONE || Math.abs(lum[i] - light) <= TONE);

  /* Alternation map, one flag per block ------------------------------------ */
  const bw = Math.ceil(w / block), bh = Math.ceil(h / block);
  const alternating = new Uint8Array(bw * bh);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      const cx = bx * block + (block >> 1);
      const cy = by * block + (block >> 1);
      let d = 0, l = 0, colour = 0;
      for (let y = Math.max(0, cy - win); y <= Math.min(h - 1, cy + win); y++) {
        for (let x = Math.max(0, cx - win); x <= Math.min(w - 1, cx + win); x++) {
          const i = y * w + x;
          if (chroma[i] > 24) { colour++; continue; }
          if (Math.abs(lum[i] - dark) <= TONE) d++;
          else if (Math.abs(lum[i] - light) <= TONE) l++;
        }
      }
      const area = (2 * win + 1) ** 2;
      alternating[by * bw + bx] = colour < area * 0.04 && d > area * 0.12 && l > area * 0.12 ? 1 : 0;
    }
  }
  const alternates = (x, y) => alternating[((y / block) | 0) * bw + ((x / block) | 0)] === 1;

  /* Grow the background in from the border --------------------------------- */
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (bg[i] || !isTone(i) || !alternates(x, y)) return;
    bg[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w, y = (i / w) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }

  const grown = Uint8Array.from(bg);

  /**
   * One morphological step over the FOREGROUND: shrink it, or grow it back.
   *
   * `mask` is 1 for background. Neighbours are read through `bgAt`, which
   * reports outside-the-frame as background: indexing the flat array directly
   * wraps a row at the left and right edges, and reads `undefined` above the
   * first row - and `!undefined` is true, which paints a foreground bar right
   * across the top and bottom of the image on the grow pass.
   */
  const step = (mask, shrink) => {
    const bgAt = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 1 : mask[y * w + x]);
    const rim = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (shrink ? mask[i] : !mask[i]) continue;
        const neighbours = [bgAt(x - 1, y), bgAt(x + 1, y), bgAt(x, y - 1), bgAt(x, y + 1)];
        const touches = shrink ? neighbours.some(Boolean) : neighbours.some((n) => !n);
        if (touches) rim.push(i);
      }
    }
    for (const i of rim) mask[i] = shrink ? 1 : 0;
    return rim.length;
  };

  /*
   * The alternation test is measured per block, so it gives up a block early
   * wherever its window starts catching the subject, leaving a stair-stepped
   * collar of background hugging the food, plus the odd tab of retained
   * shadow hanging off it.
   *
   * Shrinking the subject clears the collar and, more usefully, pinches those
   * tabs off the main shape so the blob pass below can drop them. What is left
   * is then grown most of the way back, so the food keeps its own outline.
   *
   * Creeping outward on colour instead was tried and is worse: the chequer's
   * square edges carry JPEG ringing that matches neither grey, so eating
   * around them strands the ringing as a lattice of white lines.
   */
  for (let i = 0; i < erode; i++) step(grown, true);

  /*
   * Whatever survived in one piece is the subject; everything else is a patch
   * of background the alternation test missed - a run JPEG smoothed flat, a
   * stray corner, or a tab the shrink just severed.
   */
  if (largestOnly) {
    const seen = new Uint8Array(w * h);
    let best = null;
    let bestSize = 0;
    for (let start = 0; start < w * h; start++) {
      if (grown[start] || seen[start]) continue;
      const blob = [start];
      seen[start] = 1;
      const queue = [start];
      while (queue.length) {
        const i = queue.pop();
        const x = i % w, y = (i / w) | 0;
        const visit = (nx, ny) => {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
          const j = ny * w + nx;
          if (seen[j] || grown[j]) return;
          seen[j] = 1;
          blob.push(j);
          queue.push(j);
        };
        visit(x + 1, y); visit(x - 1, y); visit(x, y + 1); visit(x, y - 1);
      }
      if (blob.length > bestSize) { bestSize = blob.length; best = blob; }
    }
    if (best) {
      grown.fill(1);
      for (const i of best) grown[i] = 0;
    }
  }

  for (let i = 0; i < Math.max(0, erode - 2); i++) step(grown, false);

  const alpha = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = grown[i] ? 0 : 255;
  // toColourspace('b-w') matters: blurring a 1-channel raw buffer otherwise
  // returns it promoted to 3-channel sRGB, and reading that back as one byte
  // per pixel shears the mask into horizontal stripes.
  const softened = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } })
    .blur(feather)
    .toColourspace('b-w')
    .raw()
    .toBuffer();

  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = data[i * 3];
    out[i * 4 + 1] = data[i * 3 + 1];
    out[i * 4 + 2] = data[i * 3 + 2];
    out[i * 4 + 3] = softened[i];
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/**
 * Lifts warm food off a near-black studio background.
 *
 * A dramatic studio shot - the chicken tower on a dark plate - has no flat
 * pale border to key on, and its plate is nearly as dark as the ground behind
 * it, so neither `flatCutout` nor the chequer reader can separate them. What it
 * does have is colour: fried chicken is golden, and the plate, its shadow and
 * the ground are all neutral grey, lit or not.
 *
 * So the subject is found by WARMTH (red minus blue), not brightness. Measured
 * on this photo, the chicken's own darkest crevice still reads r-b >= 31, while
 * the plate tops out at 22 however the light hits it, and a stray green
 * peppercorn is colder still; a cut at 26 splits food from everything else.
 *
 * Brightness only sets the floor that keeps deep shadow out of the subject.
 * Then the morphology is warmth-aware: the tower may bridge its own crevices
 * and fill its own enclosed pockets, but it can never grow out over the grey
 * plate it rests on, nor seal a wedge of plate trapped under an overhang.
 * That is what leaves the food floating cleanly with nothing hanging off its
 * base.
 *
 * The caller crops the plate-and-watermark band off the bottom first; the
 * largest-blob pass then drops the loose crumbs scattered on the table.
 */
export async function darkGroundToAlpha(
  input,
  { bright = 44, warm = 28, cold = 26, close = 3, open = 2, feather = 1.1 } = {},
) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  const lum = new Float32Array(w * h);
  const notFood = new Uint8Array(w * h); // too cold to be fried chicken: plate, crumb, pepper
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    notFood[i] = r - b < cold ? 1 : 0;
  }

  // Seed: bright AND warm. The warmth test is what rejects the lit-but-grey
  // plate rim that a brightness test alone would grab.
  let fg = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 3], b = data[i * 3 + 2];
    fg[i] = lum[i] >= bright && r - b >= warm ? 1 : 0;
  }

  // Dilation refuses to claim a cold pixel, so the tower bridges its own
  // shadowed crevices but never creeps out onto the plate or a green crumb.
  const dilate = (m) => {
    const o = new Uint8Array(m);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (m[i] || notFood[i]) continue;
        if ((x && m[i - 1]) || (x < w - 1 && m[i + 1]) || (y && m[i - w]) || (y < h - 1 && m[i + w])) o[i] = 1;
      }
    }
    return o;
  };
  const erode = (m) => {
    const o = new Uint8Array(m);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!m[i]) continue;
        if (!(x && m[i - 1]) || !(x < w - 1 && m[i + 1]) || !(y && m[i - w]) || !(y < h - 1 && m[i + w])) o[i] = 0;
      }
    }
    return o;
  };

  /** The single largest connected run of foreground - the tower, not a crumb. */
  const keepLargest = (m) => {
    const seen = new Uint8Array(w * h);
    let best = null, bestSize = 0;
    for (let start = 0; start < w * h; start++) {
      if (!m[start] || seen[start]) continue;
      const blob = [start];
      seen[start] = 1;
      const queue = [start];
      while (queue.length) {
        const i = queue.pop();
        const x = i % w, y = (i / w) | 0;
        const visit = (nx, ny) => {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
          const j = ny * w + nx;
          if (seen[j] || !m[j]) return;
          seen[j] = 1;
          blob.push(j);
          queue.push(j);
        };
        visit(x + 1, y); visit(x - 1, y); visit(x, y + 1); visit(x, y - 1);
      }
      if (blob.length > bestSize) { bestSize = blob.length; best = blob; }
    }
    m.fill(0);
    if (best) for (const i of best) m[i] = 1;
    return bestSize;
  };

  // Close bridges the gaps between stacked pieces so the tower reads as one
  // solid mass; then keep only that mass.
  for (let i = 0; i < close; i++) fg = dilate(fg);
  for (let i = 0; i < close; i++) fg = erode(fg);
  const size = keepLargest(fg);
  if (size / (w * h) < 0.02) {
    throw new Error('dark-ground cutout kept almost nothing - is the subject warm enough?');
  }

  // Fill enclosed pockets, but only warm ones: a batter crevice sealed inside
  // the tower is food, a wedge of plate trapped under an overhang is not.
  const outside = new Uint8Array(w * h);
  const stack = [];
  const pushOut = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (outside[i] || fg[i]) return;
    outside[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < w; x++) { pushOut(x, 0); pushOut(x, h - 1); }
  for (let y = 0; y < h; y++) { pushOut(0, y); pushOut(w - 1, y); }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w, y = (i / w) | 0;
    pushOut(x + 1, y); pushOut(x - 1, y); pushOut(x, y + 1); pushOut(x, y - 1);
  }
  for (let i = 0; i < w * h; i++) if (!fg[i] && !outside[i] && !notFood[i]) fg[i] = 1;

  // Open sheds the thin threads by which the odd crumb still hangs off the
  // base; a final largest-blob pass drops anything the open severed.
  for (let i = 0; i < open; i++) fg = erode(fg);
  for (let i = 0; i < open; i++) fg = dilate(fg);
  keepLargest(fg);

  const alpha = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = fg[i] ? 255 : 0;
  // toColourspace('b-w') matters: blurring a 1-channel raw buffer otherwise
  // returns it promoted to 3-channel sRGB, and reading that back as one byte
  // per pixel shears the mask into horizontal stripes.
  const softened = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } })
    .blur(feather)
    .toColourspace('b-w')
    .raw()
    .toBuffer();

  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    out[i * 4] = data[i * 3];
    out[i * 4 + 1] = data[i * 3 + 1];
    out[i * 4 + 2] = data[i * 3 + 2];
    out[i * 4 + 3] = softened[i];
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

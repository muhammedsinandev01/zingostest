import sharp from 'sharp';

const dist = (a, b) => {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

/**
 * Lifts a product photo off the flat ZINGOS-orange menu background.
 *
 * The background is a smooth orange gradient that always touches the crop
 * border, so it is grown from the border instead of colour-matched globally:
 * a pixel joins the background only if it is orange, close to the corner
 * reference AND close to the neighbour it spread from. The last rule is what
 * keeps golden crust, red onion and tomato - which sit near orange in RGB -
 * out of the mask, because food edges jump far more than the gradient does.
 */
export async function cutout(input, { global: globalTol = 78, local = 9, rg = 92, minR = 150, feather = 0.7, grow = 1, clear = [], despill = 0, minBlob = 260 } = {}) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const at = (i) => [data[i * ch], data[i * ch + 1], data[i * ch + 2]];

  const corners = [0, w - 1, (h - 1) * w, h * w - 1].map(at);
  const ref = [0, 1, 2].map((c) => Math.round(corners.reduce((s, p) => s + p[c], 0) / corners.length));

  const orange = (p) => p[0] >= minR && p[0] - p[1] >= rg && p[0] - p[2] >= rg;
  const bg = new Uint8Array(w * h);
  const queue = [];
  const consider = (x, y, from) => {
    const i = y * w + x;
    if (bg[i]) return;
    const p = at(i);
    if (!orange(p) || dist(p, ref) > globalTol) return;
    if (from && dist(p, from) > local) return;
    bg[i] = 1;
    queue.push(i);
  };
  for (let x = 0; x < w; x++) { consider(x, 0, null); consider(x, h - 1, null); }
  for (let y = 0; y < h; y++) { consider(0, y, null); consider(w - 1, y, null); }
  while (queue.length) {
    const i = queue.pop();
    const x = i % w, y = (i / w) | 0, from = at(i);
    if (x > 0) consider(x - 1, y, from);
    if (x < w - 1) consider(x + 1, y, from);
    if (y > 0) consider(x, y - 1, from);
    if (y < h - 1) consider(x, y + 1, from);
  }

  // Grow the mask a hair so the anti-aliased orange fringe leaves with it
  // rather than haloing once the cut-out sits on a different colour.
  let mask = bg;
  for (let pass = 0; pass < grow; pass++) {
    const next = new Uint8Array(mask);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (mask[i]) continue;
        if ((x > 0 && mask[i - 1]) || (x < w - 1 && mask[i + 1]) ||
            (y > 0 && mask[i - w]) || (y < h - 1 && mask[i + w])) next[i] = 1;
      }
    }
    mask = next;
  }

  // Menu typography that strays into a crop is knocked out by hand - it is not
  // connected to the background the grow starts from.
  for (const [cx, cy, cw, chh] of clear) {
    for (let y = cy; y < Math.min(cy + chh, h); y++) {
      for (let x = cx; x < Math.min(cx + cw, w); x++) mask[y * w + x] = 1;
    }
  }

  // Drop dust-sized leftovers (JPEG speckle, stray print marks) while keeping
  // the deliberate flying crumbs the menu photography is built around.
  if (minBlob) {
    const seen = new Uint8Array(w * h);
    for (let start = 0; start < w * h; start++) {
      if (mask[start] || seen[start]) continue;
      const blob = [start];
      seen[start] = 1;
      for (let k = 0; k < blob.length; k++) {
        const i = blob[k], x = i % w, y = (i / w) | 0;
        const visit = (j) => { if (!mask[j] && !seen[j]) { seen[j] = 1; blob.push(j); } };
        if (x > 0) visit(i - 1);
        if (x < w - 1) visit(i + 1);
        if (y > 0) visit(i - w);
        if (y < h - 1) visit(i + w);
      }
      if (blob.length < minBlob) for (const i of blob) mask[i] = 1;
    }
  }

  const alpha = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = mask[i] ? 0 : 255;
  // sharp promotes a 1-channel raw buffer to 3 channels on blur, so read the
  // softened mask back with its real stride instead of assuming one byte.
  let soft = alpha, softStride = 1;
  if (feather) {
    const blurred = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } })
      .blur(feather).raw().toBuffer({ resolveWithObject: true });
    soft = blurred.data;
    softStride = blurred.info.channels;
  }

  const out = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    // Translucent packaging (drink cups) transmits the orange behind it; pull
    // that spill back so the glass does not read as a red rim off-menu.
    if (despill) {
      const r = data[i * ch], g = data[i * ch + 1], b = data[i * ch + 2];
      if (r - g >= despill) {
        const target = Math.max(g, b) + despill * 0.5;
        data[i * ch] = Math.round(Math.min(r, target));
      }
    }
    out[i * 4] = data[i * ch];
    out[i * 4 + 1] = data[i * ch + 1];
    out[i * 4 + 2] = data[i * ch + 2];
    out[i * 4 + 3] = soft[i * softStride];
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/**
 * CHART STYLE METRICS
 * ===================
 *
 * Pure, dependency-free measurements used by scripts/chart-style-regression.mjs
 * to compare a rendered .pptx chart region against the deck-preview raster of
 * the same slide. Kept separate from the runner so the maths is unit-testable
 * without LibreOffice, Playwright, or a dev server
 * (src/lib/__tests__/chart-style-metrics.test.ts).
 *
 * Every function takes RGBA pixel data plus a mask (1 = pixel counts) so the
 * caller can restrict measurement to the exporter's own chart/graphic rects.
 * A raw pixel diff answers "is anything different"; these four answer *what*
 * is different, which is the part a human needs in order to triage:
 *
 *   fillScore       colour-histogram similarity → wrong series colour, dropped
 *                   fill, tone/mode flip. Histogram rather than per-pixel so a
 *                   1px geometry shift does not read as a fill regression.
 *   strokeFraction  share of hard luminance edges → stroke weight/darkness and
 *                   arc/bar outlines appearing or vanishing.
 *   gradientFraction share of soft ramp pixels (not flat, not an edge) → a
 *                   gradient fill exported as a solid, or vice versa.
 *   trackFraction   share of low-saturation tints of the dominant accent hue →
 *                   the unfilled remainder of a gauge/ring/bar ("track"), which
 *                   is the single most frequently lost chart detail on export.
 */

/** ITU-R BT.601 luminance, matching the pixel-diff gate's YIQ-ish weighting. */
export function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Hue in degrees (0 when achromatic) + saturation/lightness in 0..1. */
export function hsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 1e-6) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

/** Iterate masked pixel indices of an RGBA buffer. */
function* maskedPixels(png, mask) {
  const total = png.width * png.height;
  for (let i = 0; i < total; i += 1) {
    if (mask && !mask[i]) continue;
    const p = i * 4;
    yield [i, png.data[p], png.data[p + 1], png.data[p + 2]];
  }
}

export function maskCount(png, mask) {
  if (!mask) return png.width * png.height;
  let n = 0;
  for (let i = 0; i < mask.length; i += 1) if (mask[i]) n += 1;
  return n;
}

/**
 * 8×8×8 RGB histogram, L1-normalized. Coarse on purpose: renderers disagree on
 * antialiasing and gamma by a few levels, and 32-wide buckets absorb that while
 * still separating brand accent from track tint from background.
 */
export function colorHistogram(png, mask) {
  const bins = new Float64Array(512);
  let n = 0;
  for (const [, r, g, b] of maskedPixels(png, mask)) {
    bins[(r >> 5) * 64 + (g >> 5) * 8 + (b >> 5)] += 1;
    n += 1;
  }
  if (n) for (let i = 0; i < bins.length; i += 1) bins[i] /= n;
  return bins;
}

/** Cosine similarity of two normalized histograms → 0..1. */
export function histogramSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na <= 0 || nb <= 0) return 0;
  return Number((dot / Math.sqrt(na * nb)).toFixed(4));
}

const EDGE_MIN = 28;
/**
 * A real gradient across a 960px slide moves only a level or two per pixel, so
 * the ramp band starts just above quantization noise. Anything at or above
 * RAMP_MAX is an edge, not a ramp.
 */
const RAMP_MIN = 0.5;
const RAMP_MAX = 14;
/** Luminance distance from the region median that counts a pixel as ink. */
const INK_MIN = 24;

/**
 * Forward-difference gradient magnitude per masked pixel. Both neighbours must
 * also be inside the mask, otherwise the mask border itself would read as a
 * wall of strokes.
 */
function gradientMagnitudes(png, mask) {
  const { width: w, height: h } = png;
  const out = [];
  for (let y = 0; y < h - 1; y += 1) {
    for (let x = 0; x < w - 1; x += 1) {
      const i = y * w + x;
      const right = i + 1;
      const down = i + w;
      if (mask && (!mask[i] || !mask[right] || !mask[down])) continue;
      const p = i * 4;
      const pr = right * 4;
      const pd = down * 4;
      const l = luminance(png.data[p], png.data[p + 1], png.data[p + 2]);
      const lr = luminance(png.data[pr], png.data[pr + 1], png.data[pr + 2]);
      const ld = luminance(png.data[pd], png.data[pd + 1], png.data[pd + 2]);
      out.push(Math.max(Math.abs(lr - l), Math.abs(ld - l)));
    }
  }
  return out;
}

/** Share of masked pixels sitting on a hard luminance edge. */
export function edgeFraction(png, mask) {
  const g = gradientMagnitudes(png, mask);
  if (!g.length) return null;
  let n = 0;
  for (const v of g) if (v >= EDGE_MIN) n += 1;
  return Number((n / g.length).toFixed(4));
}

/**
 * Stroke/ink density: share of masked pixels whose luminance departs from the
 * region median. Deliberately NOT an edge count — an arc outline exported at
 * 3× weight has almost the same number of edge pixels but three times the ink,
 * and stroke weight is exactly the regression this metric exists to catch.
 * A dropped outline collapses it toward the fill's own ink level.
 */
export function strokeFraction(png, mask) {
  const lums = [];
  for (const [, r, g, b] of maskedPixels(png, mask)) lums.push(luminance(r, g, b));
  if (!lums.length) return null;
  const sorted = [...lums].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  let ink = 0;
  for (const l of lums) if (Math.abs(l - median) > INK_MIN) ink += 1;
  return Number((ink / lums.length).toFixed(4));
}

/** Share of comparable pixels on a soft ramp — the signature of a gradient. */
export function gradientFraction(png, mask) {
  const g = gradientMagnitudes(png, mask);
  if (!g.length) return null;
  let n = 0;
  for (const v of g) if (v >= RAMP_MIN && v < RAMP_MAX) n += 1;
  return Number((n / g.length).toFixed(4));
}

/**
 * Chroma = max-min of the RGB channels, 0..1. Preferred over HSL saturation for
 * separating an accent fill from its track: a pale tint like #D6E0F5 has a HIGH
 * HSL saturation but low chroma, which is exactly how a track reads on screen.
 */
export function chroma(r, g, b) {
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
}

const HUE_CHROMA_MIN = 0.25;

/** Dominant chromatic hue (chroma-weighted circular mean), or null. */
export function dominantHue(png, mask) {
  let sx = 0;
  let sy = 0;
  let weight = 0;
  for (const [, r, g, b] of maskedPixels(png, mask)) {
    const { h } = hsl(r, g, b);
    const s = chroma(r, g, b);
    if (s < HUE_CHROMA_MIN) continue;
    const rad = (h * Math.PI) / 180;
    sx += Math.cos(rad) * s;
    sy += Math.sin(rad) * s;
    weight += s;
  }
  if (weight < 1) return null;
  let deg = (Math.atan2(sy, sx) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return Number(deg.toFixed(1));
}

const TRACK_CHROMA_MIN = 0.02;
const TRACK_CHROMA_MAX = 0.35;
const TRACK_HUE_TOLERANCE = 40;

function hueDistance(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Track = the unfilled remainder of a gauge/ring/bar: same family hue as the
 * accent but desaturated (a tint or an alpha wash). Measured against a hue
 * supplied by the caller so both sides are judged against the SAME reference —
 * otherwise a fill that lost its colour would drag the track metric with it.
 */
export function trackFraction(png, mask, referenceHue) {
  if (referenceHue == null) return null;
  let n = 0;
  let total = 0;
  for (const [, r, g, b] of maskedPixels(png, mask)) {
    total += 1;
    const { h } = hsl(r, g, b);
    const c = chroma(r, g, b);
    if (c < TRACK_CHROMA_MIN || c > TRACK_CHROMA_MAX) continue;
    if (hueDistance(h, referenceHue) > TRACK_HUE_TOLERANCE) continue;
    n += 1;
  }
  if (!total) return null;
  return Number((n / total).toFixed(4));
}

/** All four descriptors for one side of the comparison. */
export function styleDescriptor(png, mask, trackHue = null) {
  // `hue` is always this side's OWN accent hue, so compareStyle can report the
  // rotation between the two sides. `trackHue` is the shared reference hue used
  // to find track tints: judging each side against its own hue would let a fill
  // that lost its colour quietly drag the track measurement with it.
  const hue = dominantHue(png, mask);
  return {
    histogram: colorHistogram(png, mask),
    stroke: strokeFraction(png, mask),
    edge: edgeFraction(png, mask),
    gradient: gradientFraction(png, mask),
    hue,
    track: trackFraction(png, mask, trackHue ?? hue),
  };
}

const absDelta = (a, b) =>
  typeof a === "number" && typeof b === "number" ? Number(Math.abs(a - b).toFixed(4)) : null;

/**
 * Compare a reference descriptor (deck preview) with an export descriptor.
 * Returns the published metrics plus the hue rotation, which is the single
 * clearest signal that the accent colour itself changed on export.
 */
export function compareStyle(reference, exported) {
  return {
    fillScore: histogramSimilarity(reference.histogram, exported.histogram),
    strokeDelta: absDelta(reference.stroke, exported.stroke),
    edgeDelta: absDelta(reference.edge, exported.edge),
    gradientDelta: absDelta(reference.gradient, exported.gradient),
    trackDelta: absDelta(reference.track, exported.track),
    hueShift:
      typeof reference.hue === "number" && typeof exported.hue === "number"
        ? Number(hueDistance(reference.hue, exported.hue).toFixed(1))
        : null,
    referenceStroke: reference.stroke,
    exportStroke: exported.stroke,
    referenceEdge: reference.edge,
    exportEdge: exported.edge,
    referenceGradient: reference.gradient,
    exportGradient: exported.gradient,
    referenceTrack: reference.track,
    exportTrack: exported.track,
  };
}

/** Union of graphic rects minus text rects; 1 = the pixel is compared. */
export function chartMask(width, height, graphicRects, textRects, graphicPad = 3, textPad = 4) {
  const mask = new Uint8Array(width * height);
  const paint = (rects, pad, value) => {
    for (const r of rects ?? []) {
      const x0 = Math.max(0, Math.floor(r.x * width) - pad);
      const y0 = Math.max(0, Math.floor(r.y * height) - pad);
      const x1 = Math.min(width, Math.ceil((r.x + r.w) * width) + pad);
      const y1 = Math.min(height, Math.ceil((r.y + r.h) * height) + pad);
      for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) mask[y * width + x] = value;
    }
  };
  paint(graphicRects, graphicPad, 1);
  paint(textRects, textPad, 0);
  let count = 0;
  for (let i = 0; i < mask.length; i += 1) if (mask[i]) count += 1;
  return { mask, count };
}

/**
 * Flag rules. Absolute floors catch an outright break on a brand-new cell;
 * baseline drift (handled by the runner) catches slow erosion.
 */
export function flagStyle(metrics, limits) {
  const reasons = [];
  if (typeof metrics.fillScore === "number" && metrics.fillScore < limits.minFill) {
    reasons.push(`fill/colour similarity ${metrics.fillScore} < ${limits.minFill}`);
  }
  if (typeof metrics.strokeDelta === "number" && metrics.strokeDelta > limits.maxStroke) {
    reasons.push(
      `stroke ink Δ ${metrics.strokeDelta} > ${limits.maxStroke} (preview ${metrics.referenceStroke} → export ${metrics.exportStroke})`,
    );
  }
  if (typeof metrics.gradientDelta === "number" && metrics.gradientDelta > limits.maxGradient) {
    reasons.push(
      `gradient ramp Δ ${metrics.gradientDelta} > ${limits.maxGradient} (preview ${metrics.referenceGradient} → export ${metrics.exportGradient})`,
    );
  }
  if (typeof metrics.trackDelta === "number" && metrics.trackDelta > limits.maxTrack) {
    reasons.push(
      `track styling Δ ${metrics.trackDelta} > ${limits.maxTrack} (preview ${metrics.referenceTrack} → export ${metrics.exportTrack})`,
    );
  }
  if (typeof metrics.hueShift === "number" && metrics.hueShift > limits.maxHueShift) {
    reasons.push(`accent hue rotated ${metrics.hueShift}° > ${limits.maxHueShift}°`);
  }
  return reasons;
}

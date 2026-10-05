// Content-aware flat grounds for the General Slides look explorer.
// Each slide's measured content map (look-occupancy.json: 32×18 grid, 2 = text/
// graphic, 1 = card surface) decides where colour and lines may sit: light
// pools into the open space, busy slides get only a faint edge wash, and photo
// panels get a soft halo so the image sits in the light. Browser-only (canvas).
import occupancy from "./look-occupancy.json";

export type GroundStyle = "veil" | "horizon" | "sweep" | "aurora" | "wash" | "grid";
export const GROUND_STYLES: GroundStyle[] = ["sweep", "veil", "horizon", "aurora", "wash", "grid"];

type Occ = { grid: string; photo: number[][] };
const GX = occupancy.gx;
const GY = occupancy.gy;
const SLIDES = occupancy.slides as Occ[];

const W = 960;
const H = 540;

function hex(h: string): [number, number, number] {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255) as [number, number, number];
}

/** Content density 0..1 sampled smoothly from the grid (box-blurred). */
function densityField(o: Occ): Float32Array {
  const raw = new Float32Array(GX * GY);
  for (let i = 0; i < raw.length; i++) raw[i] = o.grid[i] === "2" ? 1 : o.grid[i] === "1" ? 0.35 : 0;
  // two box-blur passes in grid space
  let a = raw;
  for (let pass = 0; pass < 2; pass++) {
    const b = new Float32Array(a.length);
    for (let y = 0; y < GY; y++)
      for (let x = 0; x < GX; x++) {
        let s = 0, n = 0;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= GX || yy >= GY) continue;
            s += a[yy * GX + xx]; n++;
          }
        b[y * GX + x] = s / n;
      }
    a = b;
  }
  return a;
}

function sample(f: Float32Array, u: number, v: number): number {
  const fx = Math.min(GX - 1.001, Math.max(0, u * GX - 0.5));
  const fy = Math.min(GY - 1.001, Math.max(0, v * GY - 0.5));
  const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const g = (x: number, y: number) => f[y * GX + x];
  return (g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx) * (1 - ty) + (g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx) * ty;
}

/** Pick bloom anchors in the emptiest areas, biased to edges, spaced apart. */
function anchors(f: Float32Array, count: number): [number, number][] {
  const cells: [number, number, number][] = [];
  for (let y = 0; y < GY; y++)
    for (let x = 0; x < GX; x++) {
      const u = (x + 0.5) / GX, v = (y + 0.5) / GY;
      const edge = Math.max(Math.abs(u - 0.5) * 2, Math.abs(v - 0.5) * 2);
      cells.push([u, v, (1 - f[y * GX + x]) * (0.4 + 0.6 * edge)]);
    }
  cells.sort((a, b) => b[2] - a[2]);
  const out: [number, number][] = [];
  for (const [u, v] of cells) {
    if (out.every(([a, b]) => Math.hypot((a - u) * 1.78, b - v) > 0.6)) out.push([u, v]);
    if (out.length >= count) break;
  }
  return out;
}

export function slideGround(
  slideIndex: number,
  mode: "dark" | "light",
  base: string,
  colours: string[],
  style: GroundStyle,
): string | null {
  if (typeof document === "undefined") return null;
  const o = SLIDES[slideIndex] ?? SLIDES[SLIDES.length - 1];
  const f = densityField(o);
  let busy = 0;
  for (const v of f) busy += v;
  busy /= f.length;
  const dark = mode === "dark";
  const strength = Math.max(0.25, 1 - busy * 1.1) * (style === "wash" || style === "grid" ? 0.55 : 1);
  const pts = anchors(f, busy > 0.6 ? 1 : busy > 0.4 ? 2 : 3);
  const cols = colours.map(hex);
  const bg = hex(base);
  const photos = o.photo;

  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const g = (u: number, v: number, cx: number, cy: number, rx: number, ry: number) =>
    Math.exp(-(((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2));

  for (let py = 0; py < H; py++) {
    const v = py / H;
    for (let px = 0; px < W; px++) {
      const u = px / W;
      const free = 1 - Math.min(1, sample(f, u, v) * 1.25);
      let r = bg[0], gg = bg[1], b = bg[2];
      let field = 0;
      const add = (m: number, c: [number, number, number]) => {
        m *= free * strength;
        if (m <= 0.002) return;
        field = Math.max(field, m);
        if (dark) { r += c[0] * m * 0.8; gg += c[1] * m * 0.8; b += c[2] * m * 0.8; }
        else { const k = m * 0.75; r = r * (1 - k) + c[0] * k; gg = gg * (1 - k) + c[1] * k; b = b * (1 - k) + c[2] * k; }
      };
      pts.forEach(([cx, cy], k) => {
        const c = cols[k % cols.length];
        if (style === "veil") add(Math.max(0, 1 - Math.abs((u - cx) * 0.9 + (v - cy) * 0.6) / 0.3) ** 2 * g(u, v, cx, cy, 0.7, 0.7), c);
        else if (style === "horizon") add(g(u, v, cx, cy > 0.5 ? 1.05 : -0.05, 0.55, 0.22), c);
        else if (style === "aurora") add((0.5 + 0.5 * Math.sin(u * 18 + Math.sin(u * 5) * 2)) * g(u, v, cx, cy, 0.4, 0.38), c);
        else if (style === "wash") add(g(u, v, cx, cy, 0.6, 0.6) * 0.7, c);
        else add(g(u, v, cx, cy, 0.32, 0.42), c);
      });
      // halo behind photo panels so the image sits in the light
      for (const [x0, y0, w, h] of photos) {
        const cx = x0 + w / 2, cy = y0 + h / 2;
        const halo = g(u, v, cx, cy, w * 0.9, h * 0.8) * 0.55 * strength;
        if (dark) { r += cols[0][0] * halo; gg += cols[0][1] * halo; b += cols[0][2] * halo; }
        else { r = r * (1 - halo * 0.6) + cols[0][0] * halo * 0.6; gg = gg * (1 - halo * 0.6) + cols[0][1] * halo * 0.6; b = b * (1 - halo * 0.6) + cols[0][2] * halo * 0.6; }
      }
      // straight translucent lines, only where colour is present and content is not
      let line = 0;
      if (style !== "wash") {
        const sp = style === "grid" ? 48 : style === "horizon" ? 13 : 17;
        const t = style === "horizon" ? py : style === "veil" ? px + py * 0.3 : px;
        const ph = (t % sp) / sp;
        line = Math.max(0, 1 - Math.abs(ph - 0.5) * 2) ** (style === "grid" ? 30 : 6);
        if (style === "grid") line = Math.max(line, Math.max(0, 1 - Math.abs(((py % sp) / sp) - 0.5) * 2) ** 30);
        const w = Math.min(1, field * 1.6 + (style === "grid" ? 0.2 * free : 0)) * free;
        line *= w;
      }
      if (dark) { r += line * 0.13; gg += line * 0.13; b += line * 0.13; }
      else { r += line * 0.2 * (1 - r); gg += line * 0.2 * (1 - gg); b += line * 0.2 * (1 - b); }
      const n = (Math.random() - 0.5) * 0.006;
      const i = (py * W + px) * 4;
      d[i] = Math.min(255, Math.max(0, (r + n) * 255));
      d[i + 1] = Math.min(255, Math.max(0, (gg + n) * 255));
      d[i + 2] = Math.min(255, Math.max(0, (b + n) * 255));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL("image/jpeg", 0.9);
}

// NEXT designer pack — the one structure, naming rule and version that every
// outside-designer surface shares (ZIP, share page, PDF guide, vendor packs).
// Pure helpers only: safe to import anywhere and to unit-test.

export const DESIGNER_PACK_VERSION = "1.1";

export const DESIGNER_PACK_CHANGELOG: { version: string; date: string; notes: string[] }[] = [
  {
    version: "1.1",
    date: "2026-10-21",
    notes: [
      "Every lockup now ships as SVG, EPS (vector) and transparent PNG.",
      "CMYK listed for every gradient stop, labelled approved or proof first.",
      "Adobe swatch files (.ase), icon sets, file manifest with checksums.",
      "One folder layout and file-naming rule across the pack.",
    ],
  },
  { version: "1.0", date: "2026-09-01", notes: ["First master NEXT kit: SVG lockups, palette, gradients, sizes, fonts, sign masters."] },
];

export const PACK_ROOT = `NEXT-2026-Designer-Pack-v${DESIGNER_PACK_VERSION}`;

export const PACK_FOLDERS = [
  { id: "00", dir: "", title: "Start here", body: "00-START-HERE.pdf: rules, examples and a live link to every file." },
  { id: "01", dir: "01-logos", title: "Logos", body: "Every division lockup as SVG, EPS and transparent PNG, in colour, white and reverse." },
  { id: "02", dir: "02-marks", title: "Marks", body: "NEXT 26 wordmark and chevron lines." },
  { id: "03", dir: "03-colour", title: "Colour", body: "HEX, RGB and CMYK palette, Adobe .ase swatches and Canva values." },
  { id: "04", dir: "04-gradients", title: "Gradients", body: "Every approved ground with its stops, CMYK and a ready-made SVG swatch." },
  { id: "05", dir: "05-icons", title: "Icons", body: "The event icon set and each track set, SVG and PNG." },
  { id: "06", dir: "06-templates", title: "Templates", body: "Sign, social, slide and print masters exactly as supplied." },
  { id: "07", dir: "07-type", title: "Type", body: "Geist Regular and Bold with licence." },
  { id: "08", dir: "08-sizes", title: "Sizes", body: "Sign sizes and digital formats." },
] as const;

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** `next26_<division>_<asset>_<variant>.<ext>` — the one file-naming rule. */
export function designerFileName(division: string, asset: string, variant: string, ext: string): string {
  const parts = ["next26", slug(division), slug(asset), slug(variant)].filter(Boolean).map((p) => p.replace(/-/g, ""));
  return `${parts.join("_")}.${ext.replace(/^\./, "").toLowerCase()}`;
}

/** Sibling EPS / transparent PNG renders of a `/next-2026/logos/*.svg` file. */
export function logoFormats(svgSrc: string): { svg: string; eps: string; png: string } {
  return {
    svg: svgSrc,
    eps: svgSrc.replace(/\/([^/]+)\.svg$/, "/eps/$1.eps"),
    png: svgSrc.replace(/\/([^/]+)\.svg$/, "/png/$1.png"),
  };
}

/** Linear-gradient swatch SVG for a ground, 1200 × 400. */
export function gradientSwatchSvg(stops: string[], label: string): string {
  const n = Math.max(1, stops.length - 1);
  const s = stops.map((c, i) => `<stop offset="${((i / n) * 100).toFixed(2)}%" stop-color="${c}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400"><title>${label.replace(/[<&>]/g, "")}</title><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">${s}</linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/></svg>`;
}

// ---------------------------------------------------------------------------
// Adobe Swatch Exchange (.ase) writer — RGB swatches, plus CMYK only where a
// signed-off build exists. Unapproved CMYK is never written as a swatch.
// ---------------------------------------------------------------------------
export type AseSwatch = { name: string; hex: string; cmyk?: [number, number, number, number] };

export function buildAse(groupName: string, swatches: AseSwatch[]): Uint8Array {
  const chunks: number[] = [];
  const u16 = (v: number) => chunks.push((v >> 8) & 255, v & 255);
  const u32 = (v: number) => chunks.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255);
  const f32 = (v: number) => {
    const b = new DataView(new ArrayBuffer(4));
    b.setFloat32(0, v);
    for (let i = 0; i < 4; i++) chunks.push(b.getUint8(i));
  };
  const nameBytes = (s: string) => {
    const out: number[] = [];
    const len = s.length + 1;
    out.push((len >> 8) & 255, len & 255);
    for (const ch of s) {
      const c = ch.charCodeAt(0);
      out.push((c >> 8) & 255, c & 255);
    }
    out.push(0, 0);
    return out;
  };
  const block = (type: number, body: number[]) => {
    u16(type);
    u32(body.length);
    chunks.push(...body);
  };
  const entries: number[][] = [];
  for (const s of swatches) {
    const h = s.hex.replace("#", "");
    const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    entries.push(colourBody(s.name, "RGB ", rgb));
    if (s.cmyk) entries.push(colourBody(`${s.name} CMYK`, "CMYK", s.cmyk));
  }
  function colourBody(name: string, model: string, vals: number[]): number[] {
    const b: number[] = [...nameBytes(name)];
    for (const ch of model) b.push(ch.charCodeAt(0));
    for (const v of vals) {
      const d = new DataView(new ArrayBuffer(4));
      d.setFloat32(0, v);
      for (let i = 0; i < 4; i++) b.push(d.getUint8(i));
    }
    b.push(0, 2); // normal colour
    return b;
  }
  // header
  for (const ch of "ASEF") chunks.push(ch.charCodeAt(0));
  u16(1);
  u16(0);
  u32(entries.length + 2);
  block(0xc001, nameBytes(groupName));
  for (const e of entries) block(0x0001, e);
  block(0xc002, []);
  void f32;
  return new Uint8Array(chunks);
}

/** Parse "92, 27, 0, 5" style CMYK percentages into 0–1 fractions. */
export function parseCmykPercent(s: string | undefined): [number, number, number, number] | undefined {
  if (!s) return undefined;
  const n = s.split(/[,\s]+/).filter(Boolean).map(Number);
  if (n.length !== 4 || n.some((x) => !Number.isFinite(x))) return undefined;
  return n.map((x) => (x > 1 ? x / 100 : x)) as [number, number, number, number];
}

export async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const d = await crypto.subtle.digest("SHA-256", buf as BufferSource);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

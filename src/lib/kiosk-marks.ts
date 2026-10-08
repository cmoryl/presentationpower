import PRODUCT_LOGOS from "@/lib/product-logo-vectors.json";
// Vector marks added in the sign editor: the NEXT chevron arrows and swapped
// NEXT lockups. Both are taken straight from the official logo geometry in
// next-logo-vectors.ts (the chevrons are the accent-coloured paths of the
// "white + colour chevrons" lockup), so nothing is redrawn by hand.

import { NEXT_LOGO_FAMILIES, nextLogoFamily, pickNextLogo, type NextLogoColourway } from "@/lib/next-logo-vectors";
import { parsePath, mul, rotateAbout, segsToPdf, translate, type Affine } from "@/lib/next-california-kiosk-vector-pdf";

export type KioskMark = {
  id: string;
  kind: "chevrons" | "logo" | "brand";
  family: string;
  colourway?: NextLogoColourway;
  shape?: "stacked" | "side";
  /** Chevron colour (logo marks keep their approved colourway). */
  color?: string;
  /** Top-left and width in kiosk points; height follows the artwork. */
  x: number; y: number; w: number;
  opacity?: number; rot?: number; hidden?: boolean;
};

export type MarkArt = { ox: number; oy: number; w: number; h: number; paths: { d: string; fill: string; evenOdd: boolean }[] };

const cache = new Map<string, MarkArt>();

/** Family id for a layout ("divsign-finance-reg-desk" → "finance"), when it is a NEXT family. */
export function markFamilyFor(layoutId: string): string | null {
  const m = /^divsign-([a-z]+)-/.exec(layoutId);
  return m && m[1]! in NEXT_LOGO_FAMILIES ? m[1]! : null;
}

export function markArt(m: KioskMark): MarkArt | null {
  const key = `${m.kind}|${m.family}|${m.colourway}|${m.shape}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let art: MarkArt | null = null;
  if (m.kind === "brand") {
    const b = (PRODUCT_LOGOS as Record<string, { w: number; h: number; paths: { d: string; fill: string }[] }>)[m.family];
    art = b ? { ox: 0, oy: 0, w: b.w, h: b.h, paths: b.paths.map((p) => ({ d: p.d, fill: p.fill, evenOdd: false })) } : null;
  } else if (m.kind === "logo") {
    const { art: a } = pickNextLogo(m.family, 1, m.colourway ?? "white", m.shape ?? "stacked");
    art = { ox: 0, oy: 0, w: a.w, h: a.h, paths: a.paths.map((p) => ({ d: p.d, fill: p.fill, evenOdd: p.fillRule === "evenodd" })) };
  } else {
    const fam = nextLogoFamily(m.family);
    const src = fam.colourways["white-accent"]?.stacked ?? NEXT_LOGO_FAMILIES.transperfect!.colourways["white-accent"]?.stacked;
    const chev = (src?.paths ?? []).filter((p) => !/^#f{3}(f{3})?$/i.test(p.fill));
    if (!chev.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of chev) for (const s of parsePath(p.d)) for (let k = 0; k < s.p.length; k += 2) {
      x0 = Math.min(x0, s.p[k]!); x1 = Math.max(x1, s.p[k]!); y0 = Math.min(y0, s.p[k + 1]!); y1 = Math.max(y1, s.p[k + 1]!);
    }
    art = { ox: x0, oy: y0, w: x1 - x0, h: y1 - y0, paths: chev.map((p) => ({ d: p.d, fill: p.fill, evenOdd: p.fillRule === "evenodd" })) };
  }
  if (art) cache.set(key, art);
  return art;
}

export const markH = (m: KioskMark, a: MarkArt) => (m.w * a.h) / a.w;
const fillOf = (m: KioskMark, p: { fill: string }) => (m.kind === "chevrons" && m.color ? m.color : p.fill);

/** SVG transform placing the mark's art (art units) into kiosk space. */
export function markTransform(m: KioskMark, a: MarkArt) {
  const s = m.w / a.w, h = markH(m, a);
  const rot = m.rot ? `rotate(${m.rot} ${m.x + m.w / 2} ${m.y + h / 2}) ` : "";
  return `${rot}translate(${m.x} ${m.y}) scale(${s}) translate(${-a.ox} ${-a.oy})`;
}

export function marksSvg(marks: KioskMark[] | undefined): string {
  const out: string[] = [];
  for (const m of marks ?? []) {
    if (m.hidden) continue;
    const a = markArt(m);
    if (!a) continue;
    const o = m.opacity ?? 1;
    out.push(`<g id="${m.id}" transform="${markTransform(m, a)}"${o < 1 ? ` opacity="${o.toFixed(3)}"` : ""}>${a.paths.map((p) => `<path d="${p.d}" fill="${fillOf(m, p)}"${p.evenOdd ? ' fill-rule="evenodd"' : ""}/>`).join("")}</g>`);
  }
  return out.join("");
}

/** PDF operators for the marks; `F` maps kiosk space → page space. */
export function marksPdfOps(marks: KioskMark[] | undefined, F: Affine, alpha: (o: number) => string): string {
  const out: string[] = [];
  for (const m of marks ?? []) {
    if (m.hidden) continue;
    const a = markArt(m);
    if (!a) continue;
    const s = m.w / a.w, h = markH(m, a);
    const M = mul(F, mul(rotateAbout(m.rot ?? 0, m.x + m.w / 2, m.y + h / 2), mul(translate(m.x, m.y), mul([s, 0, 0, s, 0, 0], translate(-a.ox, -a.oy)))));
    const o = m.opacity ?? 1;
    out.push("q", ...(o < 1 ? [alpha(o)] : []));
    for (const p of a.paths) {
      const c = fillOf(m, p).replace("#", "");
      const hex = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
      const rgbv = [0, 2, 4].map((k) => (parseInt(hex.slice(k, k + 2), 16) / 255).toFixed(4)).join(" ");
      out.push(`${rgbv} rg`, segsToPdf(parsePath(p.d), M), p.evenOdd ? "f*" : "f");
    }
    out.push("Q");
  }
  return out.join("\n");
}

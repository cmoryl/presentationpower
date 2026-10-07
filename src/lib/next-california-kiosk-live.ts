// TransPerfect NEXT — CALIFORNIA KIOSKS REBUILT FROM THE LIVE LONDON FILES.
//
// Each London trade-booth `.ai` (live, not outlined) was read once
// (see scripts note in AGENTS.md): every text run with its font, size, colour
// and baseline; the artwork with the text lifted off, kept as vector
// (`-art.svg` for the browser, `-art.pdf` for PDF export); the artwork split
// into horizontal content pieces; and a background colour ramp sampled from
// the edges. Nothing here is invented — every piece and every word comes from
// the partner's own file.
//
// The kiosk front (45 × 96 in) is 0.625 of the London wall's width, so pieces
// are placed at ONE uniform scale — nothing is stretched or squashed — above
// and below the TV keep-clear. All units below are PostScript points on the
// kiosk trim (origin top-left).

import layoutsJson from "@/lib/next-california-kiosk-live-layouts.json";
import signLayoutsJson from "@/lib/legal-next-signage-layouts.json";
import { marksSvg } from "@/lib/kiosk-marks";
import { VENUE_STEP_GUIDES } from "@/lib/venue-step-guides";

export const KIOSK_W = 3240;
export const KIOSK_H = 6912;
export const KIOSK_RETURN_W = 288;
export const KIOSK_BLEED = 9;
export const KIOSK_TV = { x: 0, y: 997.5, w: 2756, h: 1604 } as const;
const GAP_MIN = 60;

/** Kiosks the designer re-supplied with NO TV (2026-09-28): no keep-clear, no TV check. */
export const KIOSK_NO_TV = new Set(["coa", "global-digital-experience-tradebooth-a", "legal-support-2-tradebooth-b", "medical-writing"]);
export function kioskHasTv(id: string): boolean {
  if (isSignId(id)) return false;
  return !KIOSK_NO_TV.has(id);
}


export type LiveText = {
  id: string;
  text: string;
  font: string;
  size: number;
  color: string;
  x: number;
  y: number;
  w: number;
  top: number;
  bottom: number;
  /** Set on text the editor created (badges): use the font's own spacing, not London's. */
  flow?: boolean;
  /** Supplied CMYK build of the colour (0–1 each); `color` is only its on-screen view. */
  cmyk?: number[];
  /** Supplied alignment, line spacing (× size) and letter spacing (1/1000 em) for multi-line blocks. */
  align?: TextAlign;
  lead?: number;
  track?: number;
};
/** One separate object (logo, icon, QR, shape group) inside a piece, in London trim points. */
export type LivePart = {
  id: string; x0: number; y0: number; x1: number; y1: number;
  /** Re-flow offset (trim pt) and fit scale set when a sign is re-sized; the source box stays the designer's. */
  rx?: number; ry?: number; rs?: number;
};
export type LiveBlock = { id: string; y0: number; y1: number; c0: number; c1: number; screen: boolean; parts?: LivePart[] };
export type LiveLayout = {
  id: string;
  source: string;
  trimW: number;
  trimH: number;
  originX: number;
  originY: number;
  mediaW: number;
  mediaH: number;
  texts: LiveText[];
  blocks: LiveBlock[];
  ground: { offset: number; color: string }[];
  /**
   * Set on kiosks read from the designer's own CMYK kiosk file: every piece
   * sits 1:1 where the designer put it (no re-lay), and the print files are
   * built from the file's own CMYK objects.
   */
  native?: KioskNative;
  /** Set on a side-strip view of a kiosk: the strip is edited like the front, at 4 in wide. */
  face?: KioskFace;
  /** Set on general signage templates (Legal NEXT): any trim size, own safe margin, no TV. */
  sign?: { margin: number };
  /** Draw `ground` instead of the native background page (venue staircase tiers). */
  groundOnly?: boolean;
  /** On-screen step/cut lines from the submitted file, trim pt [x1,y1,x2,y2]; never printed. */
  stepGuides?: [number, number, number, number][];
  /** Sign-only TV/screen keep-clear (trim pt, y down): drawn as a non-printing guide; the supplied placeholder box is dropped from print. */
  tv?: { x: number; y: number; w: number; h: number };
};

/** Signage templates share the kiosk editor; their ids carry this prefix. */
export const isSignId = (id: string) => id.startsWith("legalnext-") || id.startsWith("sfsurround-") || id.startsWith("divsign-");

export type KioskFace = "left" | "right";
/** One side strip read from the designer's CMYK file, split one object per page. */
export type KioskStripFace = {
  bgPage: number;
  bgSym: string;
  parts: Record<string, { page: number; kind: "image" | "vector" }>;
  blocks: LiveBlock[];
};

export type KioskNative = {
  version: string;
  profile: string;
  /** Page of the native PDF holding the front's background objects. */
  bgPage: number;
  /** Page holding each movable object, and whether it is a photo or vector art. */
  parts: Record<string, { page: number; kind: "image" | "vector" }>;
  strips: Record<"left" | "right", { bg: number; content: number; w: number }>;
  /** Preview symbol of the background (front: "bg"; strips: "left-bg" / "right-bg"). */
  bgSym?: string;
  /**
   * Where the background page is drawn, in trim points [x, y, w, h]. Default:
   * the native page at its own size. Set to stretch a no-bleed ground over the
   * bleed, or over a re-sized trim.
   */
  bgBox?: [number, number, number, number];
  /** Each side strip split into separate objects, edited like the front. */
  faces?: Record<KioskFace, KioskStripFace>;
};

/** Trim width of the face a layout draws (front 45 in, side strip 4 in). */
export const kioskFaceW = (L: Pick<LiveLayout, "face"> & Partial<Pick<LiveLayout, "sign" | "trimW">>) =>
  L.face ? KIOSK_RETURN_W : L.sign && L.trimW ? L.trimW : KIOSK_W;
/** Trim height of the face a layout draws (kiosks 96 in; signs their own). */
export const kioskFaceH = (L: Partial<Pick<LiveLayout, "sign" | "trimH">>) => (L.sign && L.trimH ? L.trimH : KIOSK_H);
/** Side safe margin: 2 in on the front, 1/4 in on a 4 in strip. */
export const kioskMarginX = (L: Pick<LiveLayout, "face"> & Partial<Pick<LiveLayout, "sign">>) => (L.face ? 18 : L.sign ? L.sign.margin : KIOSK_MARGIN);
/** Where a face's changes are saved (the front keeps the kiosk id). */
export const kioskEditKey = (L: Pick<LiveLayout, "id" | "face">) => (L.face ? `${L.id}--${L.face}` : L.id);
/** Split a saved-changes key back into kiosk id and face. */
export function kioskEditKeyParts(key: string): { id: string; face?: KioskFace } {
  const m = key.match(/^(.*)--(left|right)$/);
  return m ? { id: m[1]!, face: m[2] as KioskFace } : { id: key };
}

/**
 * A side strip of a native kiosk as its own layout: same designer file, same
 * CMYK objects, 4 × 96 in trim. Every editor, layout and export path treats it
 * exactly like the front.
 */
export function kioskFaceLayout(L: LiveLayout, face: KioskFace): LiveLayout | null {
  const F = L.native?.faces?.[face];
  if (!L.native || !F) return null;
  return {
    ...L,
    face,
    trimW: KIOSK_RETURN_W,
    mediaW: KIOSK_RETURN_W + 2 * KIOSK_BLEED,
    texts: [],
    blocks: F.blocks,
    native: { ...L.native, bgPage: F.bgPage, bgSym: F.bgSym, parts: F.parts, faces: undefined },
  };
}

export const KIOSK_LIVE_LAYOUTS = layoutsJson as unknown as Record<string, LiveLayout>;
/** Legal NEXT signage layouts (edited with the same editor; not kiosks). */
export const SIGN_LIVE_LAYOUTS = signLayoutsJson as unknown as Record<string, LiveLayout>;
/** Any editable layout — kiosk or sign — by id. */
export const liveLayoutById = (id: string): LiveLayout | undefined => {
  const hit = KIOSK_LIVE_LAYOUTS[id] ?? SIGN_LIVE_LAYOUTS[id];
  if (hit) return hit;
  const sz = parseSizedId(id);
  const base = sz && SIGN_LIVE_LAYOUTS[templateLayoutId(sz.base)];
  if (!sz || !base) return undefined;
  const L = resizedSignLayout(base, sz.w, sz.h);
  // Venue first versions keep their own id (one live file per spot artboard).
  return isVenueFirstId(id) ? venueTier({ ...L, id: sizedSignId(sz.base, sz.w, sz.h) }, sz.base, sz.w, sz.h) : L;
};

/** Staircase ramp: bottom tier → top tier, enterprise palette. */
const STAIR_RAMP = [{ offset: 0, color: "#03002C" }, { offset: 1, color: "#003FC7" }];
const toHex = (c: [number, number, number]) => `#${c.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

/** One tier of a multi-artboard venue spot: its slice of the shared ramp, plus the file's step lines. */
function venueTier(L0: LiveLayout, base: string, wIn: number, hIn: number): LiveLayout {
  // The generic first version scales as one composition: every piece at the same
  // scale (the tighter of width/height), centres kept at their relative spots,
  // so nothing runs off an edge or collides on a narrow or short artboard.
  const T = SIGN_LIVE_LAYOUTS[VENUE_FIRST_TEMPLATE]!;
  const sx = L0.trimW / T.trimW, sy = L0.trimH / T.trimH, s = Math.min(sx, sy);
  const L: LiveLayout = {
    ...L0,
    blocks: L0.blocks.map((b) => ({
      ...b,
      parts: b.parts?.map((p) => {
        const cx = (p.x0 + p.x1) / 2, cy = (p.y0 + p.y1) / 2;
        return { ...p, rx: cx * sx - cx, ry: cy * sy - cy, rs: s };
      }),
    })),
  };
  const m = base.match(/\.([0-9a-f]{8})-(\d+)of(\d+)$/);
  if (!m) return L;
  const n = Number(m[2]), N = Number(m[3]);
  const g = VENUE_STEP_GUIDES[`${m[1]}-${n}`];
  const guides = g && Math.abs(g.w - wIn) < 0.01 && Math.abs(g.h - hIn) < 0.01 ? g.lines : undefined;
  if (N < 2) return { ...L, stepGuides: guides };
  // Offset 0 is the top edge of the artboard (the higher end of the climb).
  return {
    ...L,
    groundOnly: true,
    ground: [{ offset: 0, color: toHex(groundAt(STAIR_RAMP, n / N)) }, { offset: 1, color: toHex(groundAt(STAIR_RAMP, (n - 1) / N)) }],
    stepGuides: guides,
  };
}

// ---- re-sized versions ------------------------------------------------------
// A sign at a new trim size is its own layout id: `<base>~<w>x<h>` (inches,
// up to 3 decimals). Edits, saves and approvals key on that id; the artwork
// files are the base sign's.

const SIZE_SEP = "~";
/**
 * Venue spot first versions: `divsign-venue-first.<spot>-<n>of<N>~<w>x<h>` — the
 * generic NEXT-look template re-flowed to one artboard (tier n of N) of a submitted file.
 */
export const VENUE_FIRST_TEMPLATE = "divsign-venue-first";
export const isVenueFirstId = (id: string) => id.startsWith(`${VENUE_FIRST_TEMPLATE}.`);
export const venueFirstFaceId = (spotId: string, n: number, N: number, wIn: number, hIn: number) =>
  sizedSignId(`${VENUE_FIRST_TEMPLATE}.${spotId.slice(0, 8)}-${n}of${N}`, wIn, hIn);
const templateLayoutId = (base: string) => (isVenueFirstId(base) ? VENUE_FIRST_TEMPLATE : base);
export function sizedSignId(base: string, wIn: number, hIn: number): string {
  const f = (v: number) => String(+v.toFixed(3));
  return `${base.split(SIZE_SEP)[0]!}${SIZE_SEP}${f(wIn)}x${f(hIn)}`;
}
export function parseSizedId(id: string): { base: string; w: number; h: number } | null {
  const m = id.match(/^(.+)~(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const w = Number(m[2]), h = Number(m[3]);
  return w >= 1 && h >= 1 && w <= 600 && h <= 600 ? { base: m[1]!, w, h } : null;
}
/** The supplied layout an id draws its artwork from. */
export const baseLayoutId = (id: string) => templateLayoutId(id.split(SIZE_SEP)[0]!);

/** Background placement in trim points. */
export function nativeBgBox(L: LiveLayout): [number, number, number, number] {
  return L.native?.bgBox ?? [-L.originX, -L.originY, L.mediaW, L.mediaH];
}

/**
 * Re-flow a sign to a new trim size (inches). The background stretches to
 * the new trim and bleed; every piece keeps its own size and is re-placed so
 * its centre sits at the same relative position. A piece wider or taller than
 * the new safe area is scaled down to fit (never up).
 */
export function resizedSignLayout(L: LiveLayout, wIn: number, hIn: number): LiveLayout {
  const W = wIn * 72, H = hIn * 72;
  const sx = W / L.trimW, sy = H / L.trimH;
  const [bx, by, bw, bh] = nativeBgBox(L);
  const margin = Math.round(Math.min(L.sign?.margin ?? 72, Math.min(W, H) * 0.06) * 100) / 100;
  const blocks = L.blocks.map((b) => ({
    ...b,
    y0: Math.min(b.y0, -KIOSK_BLEED),
    y1: Math.max(b.y1, L.trimH + KIOSK_BLEED, H + KIOSK_BLEED),
    parts: (() => {
      const all = b.parts ?? [];
      const isFull = (p: LivePart) => p.x1 - p.x0 >= 0.9 * L.trimW || p.y1 - p.y0 >= 0.9 * L.trimH;
      // Group nearby pieces (gap under 2 in) so a composition keeps its spacing.
      const small = all.filter((p) => !isFull(p));
      const par = small.map((_, i) => i);
      const find = (i: number): number => (par[i] === i ? i : (par[i] = find(par[i]!)));
      const GAP = 144;
      for (let i = 0; i < small.length; i++)
        for (let j = i + 1; j < small.length; j++) {
          const A = small[i]!, C = small[j]!;
          if (Math.max(A.x0, C.x0) - Math.min(A.x1, C.x1) < GAP && Math.max(A.y0, C.y0) - Math.min(A.y1, C.y1) < GAP) par[find(i)] = find(j);
        }
      const groups = new Map<string, [number, number, number, number]>();
      small.forEach((p, i) => {
        const r = find(i);
        const mem = small.filter((_, k) => find(k) === r);
        groups.set(p.id, [Math.min(...mem.map((q) => q.x0)), Math.min(...mem.map((q) => q.y0)), Math.max(...mem.map((q) => q.x1)), Math.max(...mem.map((q) => q.y1))]);
      });
      return all.map((p) => {
        // Full-bleed pieces (ground shapes, chevrons) grow with the trim.
        if (isFull(p)) {
          const cx = (p.x0 + p.x1) / 2, cy = (p.y0 + p.y1) / 2;
          return { ...p, rx: cx * sx - cx, ry: cy * sy - cy, rs: Math.max(sx, sy) };
        }
        // Pieces that sit together (letters of a word, a tagline, a stacked lockup) move as one group.
        const g = groups.get(p.id)!;
        const ux0 = g[0], uy0 = g[1], ux1 = g[2], uy1 = g[3];
        const rs = Math.max(0.05, Math.min(1, (W - 2 * margin) / (ux1 - ux0), (H - 2 * margin) / (uy1 - uy0)));
        const ucx = (ux0 + ux1) / 2, ucy = (uy0 + uy1) / 2;
        const pcx = (p.x0 + p.x1) / 2, pcy = (p.y0 + p.y1) / 2;
        const ncx = ucx * sx + (pcx - ucx) * rs, ncy = ucy * sy + (pcy - ucy) * rs;
        return { ...p, rx: ncx - pcx, ry: ncy - pcy, rs };
      });
    })(),
  }));
  const texts = L.texts.map((t) => {
    const dx = (t.x + t.w / 2) * (sx - 1), dy = ((t.top + t.bottom) / 2) * (sy - 1);
    return { ...t, x: t.x + dx, y: t.y + dy, top: t.top + dy, bottom: t.bottom + dy };
  });
  return {
    ...L,
    id: sizedSignId(L.id, wIn, hIn),
    trimW: W,
    trimH: H,
    texts,
    blocks,
    native: L.native ? { ...L.native, bgBox: [bx * sx, by * sy, bw * sx, bh * sy] } : undefined,
    sign: { margin },
  };
}

export function kioskLiveLayout(boothId: string | null | undefined): LiveLayout | null {
  return (boothId && KIOSK_LIVE_LAYOUTS[boothId]) || null;
}

// ---- assets -----------------------------------------------------------------

type Ptr = { url: string };
const ART = import.meta.glob<Ptr>("../assets/california-kiosks/live/*.asset.json", { eager: true, import: "default" });
const FONTS = import.meta.glob<Ptr>("../assets/fonts-live/*.asset.json", { eager: true, import: "default" });

function pick(map: Record<string, Ptr>, file: string): string | null {
  const hit = Object.entries(map).find(([k]) => k.endsWith(`/${file}.asset.json`));
  return hit ? hit[1].url : null;
}
const NATIVE = import.meta.glob<Ptr>(["../assets/california-kiosks/native/*.asset.json", "../assets/legal-next-signage/native/*.asset.json", "../assets/sf-screen-surrounds/native/*.asset.json", "../assets/next-demo-booth/native/*.asset.json", "../assets/next-lift-door/native/*.asset.json"], { eager: true, import: "default" });
export const kioskArtSvgUrl = (id0: string) => {
  const id = baseLayoutId(id0);
  return liveLayoutById(id)?.native ? pick(NATIVE, `${id}-native.svg`) : pick(ART, `${id}-art.svg`);
};
export const kioskArtPdfUrl = (id: string) => pick(ART, `${id}-art.pdf`);
/** The designer file split into one page per object (CMYK, as supplied). */
export const kioskNativePdfUrl = (id: string) => pick(NATIVE, `${baseLayoutId(id)}-native.pdf`);
/** Symbol id of a native piece inside the preview SVG ("bg", a part id, "left-bg"…). */
export const nativeSymbol = (sym: string, piece: string) => `${sym}-${piece}`;
/** Full font file for a supplied face name (e.g. "Poppins-Regular"). */
export function kioskFontUrl(font: string): string | null {
  return pick(FONTS, `${font}.ttf`);
}
export function kioskFontFamily(font: string): string {
  if (/times/i.test(font)) return "'Times New Roman', serif";
  return kioskFontUrl(font) ? `'K-${font}', Geist, sans-serif` : "Geist, sans-serif";
}
export function kioskFontFaceCss(): string {
  return Object.keys(FONTS)
    .map((k) => k.split("/").pop()!.replace(".ttf.asset.json", ""))
    .map((f) => `@font-face{font-family:'K-${f}';src:url('${kioskFontUrl(f)}') format('truetype');font-display:block}`)
    .join("");
}

// ---- edits ------------------------------------------------------------------

export type BlockEdit = {
  dx?: number; dy?: number; scale?: number; hidden?: boolean; opacity?: number; rot?: number;
  /** Objects only: one flat CMYK ink (0–1) that replaces the object's own colours; absent = print as supplied. */
  cmyk?: number[];
};
export type TextAlign = "left" | "center" | "right";
export type TextEdit = {
  opacity?: number; rot?: number;
  text?: string; dx?: number; dy?: number; size?: number; color?: string; hidden?: boolean;
  /** Line anchor: left edge, centre or right edge of the line. */
  align?: TextAlign;
  /** Line spacing as a multiple of the type size (multi-line text). */
  lead?: number;
  /** Letter spacing in 1/1000 em, as in design apps. */
  track?: number;
  /** CMYK build set in the editor (0–1 each); `color` then holds its on-screen view. */
  cmyk?: number[];
};
/** An accent divider rule placed on the kiosk front (kiosk points, on trim). */
export type KioskDivider = {
  id: string; x: number; y: number; w: number; h: number; color: string; round?: boolean; hidden?: boolean;
  opacity?: number; rot?: number;
};
/** A duplicate of a London text line or object (shares the source's geometry). */
export type KioskCopy = { id: string; of: string; kind: "text" | "part" };
/**
 * A partner badge turned into editable type: the London object `of` is hidden
 * and a real text line takes its place, in the object's own box, so it can be
 * retyped, resized, recoloured and exported as live text — no re-upload.
 */
export type KioskBadge = { id: string; of: string; text: string; font?: string; color?: string };
/** A new line of type added in the editor: centred on (cx, baseline y), Geist Bold. */
export type KioskNote = { id: string; text: string; cx: number; y: number; size: number; color?: string };
export type KioskEdits = {
  /** Layout these changes were made on (set for kiosks read from the designer's CMYK file). */
  layoutVersion?: string;
  /** Changes made on an earlier layout, kept but not applied. */
  parked?: KioskEdits;
  /** `stops` (top → bottom) set when an approved NEXT ground was picked; `top`/`bottom` stay its ends. */
  ground?: { top: string; bottom: string; stops?: string[]; styleId?: string } | null;
  blocks?: Record<string, BlockEdit>;
  texts?: Record<string, TextEdit>;
  /** Per-object edits inside a piece (dx/dy in kiosk points, scale about the object's centre). */
  parts?: Record<string, BlockEdit>;
  /** Objects the user grouped: each group moves, hides and resets together. */
  groups?: string[][];
  /** Accent divider rules added in the editor (array order = stacking order). */
  dividers?: KioskDivider[];
  /** NEXT chevron arrows and swapped NEXT lockups (official logo geometry). */
  marks?: import("@/lib/kiosk-marks").KioskMark[];
  /** Duplicated text lines and objects. */
  copies?: KioskCopy[];
  /** Partner badges replaced with editable text (the source object is hidden). */
  badges?: KioskBadge[];
  /** New text lines typed in the editor (e.g. wording on a stair step), in trim points. */
  notes?: KioskNote[];
  /** Locked items can be selected but not moved. */
  locked?: string[];
  /** Stacking order of objects within their piece (higher = in front). */
  z?: Record<string, number>;
};

/** Rotate point (px,py) about (cx,cy) by deg clockwise (SVG sense, y down). */
export function rotateAbout(px: number, py: number, cx: number, cy: number, deg: number) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const dx = px - cx, dy = py - cy;
  return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
}

/** Safe side margin used by the editor's align tools (2 in). */
export const KIOSK_MARGIN = 144;

/** Left x of each line of a placed text, given a width measurer. */
export function textLineBoxes(t: PlacedText, width: (s: string) => number) {
  return t.lines.map((s, i) => {
    const w = width(s) + t.trackPt * Math.max(0, [...s].length - 1);
    const x = t.align === "center" ? t.ax - w / 2 : t.align === "right" ? t.ax - w : t.ax;
    return { text: s, x, y: t.ky + i * t.lead * t.ksize, w };
  });
}

/** Accent rule markup for SVG (Accents layer). */
export function dividerSvg(d: KioskDivider) {
  return `<rect id="${d.id}" x="${d.x.toFixed(2)}" y="${d.y.toFixed(2)}" width="${d.w.toFixed(2)}" height="${d.h.toFixed(2)}"${d.round ? ` rx="${(d.h / 2).toFixed(2)}"` : ""} fill="${d.color}"${fx(d.opacity ?? 1, d.rot ?? 0, d.x + d.w / 2, d.y + d.h / 2)}/>`;
}

/** SVG opacity + rotate attributes (empty when neutral). */
export function fx(opacity: number, rot: number, cx: number, cy: number) {
  return `${opacity < 1 ? ` opacity="${opacity.toFixed(3)}"` : ""}${rot ? ` transform="rotate(${rot.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)})"` : ""}`;
}

/** Every object id that moves with `id` (itself when ungrouped). */
export function partGroup(edits: KioskEdits, id: string, L?: LiveLayout): string[] {
  const groups = edits.groups ?? (L ? defaultPartGroups(L) : []);
  return groups.find((g) => g.includes(id)) ?? [id];
}

/**
 * Starting groups, so a lockup is never pulled apart by accident: objects in
 * the same piece that share a row (≥50% vertical overlap) and sit within
 * 60 pt of each other — e.g. the halves of a wordmark — move together.
 */
export function defaultPartGroups(L: LiveLayout): string[][] {
  const out: string[][] = [];
  for (const b of L.blocks) {
    const ps = b.parts ?? [];
    const parent = ps.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
    for (let i = 0; i < ps.length; i++)
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i]!, c = ps[j]!;
        const ov = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
        const gap = Math.max(a.x0, c.x0) - Math.min(a.x1, c.x1);
        if (ov >= 0.5 * Math.min(a.y1 - a.y0, c.y1 - c.y0) && gap < 60) parent[find(i)] = find(j);
      }
    const m = new Map<number, string[]>();
    ps.forEach((q, i) => { const r = find(i); m.set(r, [...(m.get(r) ?? []), q.id]); });
    for (const g of m.values()) if (g.length > 1) out.push(g);
  }
  return out;
}

// ---- layout -----------------------------------------------------------------

export type PlacedBlock = {
  block: LiveBlock;
  /** Source clip, in London trim points. */
  clipTop: number;
  clipBottom: number;
  /** Kiosk placement of the clip's top-left and the uniform scale. */
  x: number;
  y: number;
  scale: number;
  texts: PlacedText[];
  /** Separate objects, each drawn on its own; the piece backdrop has holes where they sit. */
  parts: PlacedPart[];
};
/** src = London rect (clamped to the clip); x/y = kiosk top-left; scale = London→kiosk. */
export type PlacedPart = {
  part: LivePart; src: { x0: number; y0: number; x1: number; y1: number }; x: number; y: number; scale: number; hidden: boolean;
  /** 0–1 see-through amount and clockwise rotation (deg) about the object's centre. */
  opacity: number; rot: number;
  /** Flat CMYK recolour set in the editor (0–1). */
  cmyk?: number[];
};
export type PlacedText = LiveText & {
  kx: number; ky: number; ksize: number; kw: number; edited: boolean; fill: string;
  /** Lines (split on newlines), anchor x for the alignment, line spacing, tracking in pt. */
  lines: string[]; align: TextAlign; ax: number; lead: number; trackPt: number;
  /** True when the original London spacing (textLength) still applies. */
  fixed: boolean;
  /** 0–1 opacity and clockwise rotation (deg) about the anchor on the first baseline. */
  opacity: number; rot: number;
  /** CMYK to print (supplied or set in the editor); absent = print `fill` as RGB. */
  cmyk?: number[];
};

/** Centre of a placed object on the kiosk. */
export const partCentre = (q: PlacedPart) => ({ x: q.x + ((q.src.x1 - q.src.x0) * q.scale) / 2, y: q.y + ((q.src.y1 - q.src.y0) * q.scale) / 2 });

function isHidden(b: LiveBlock, e?: BlockEdit) {
  return e?.hidden ?? b.screen;
}

/**
 * The London layout plus any copies the user made (duplicate / paste). A copy
 * shares its source's geometry and artwork, with its own id, so every editor,
 * layout and export path treats it as one more text line or object.
 */
export function withCopies(L: LiveLayout, edits: KioskEdits = {}): LiveLayout {
  const cs = edits.copies ?? [];
  const bs = edits.badges ?? [];
  const ns = edits.notes ?? [];
  if (!cs.length && !bs.length && !ns.length) return L;
  const texts = [...L.texts, ...ns.map(noteText)];
  for (const c of cs) if (c.kind === "text") { const s = texts.find((t) => t.id === c.of); if (s) texts.push({ ...s, id: c.id }); }
  const blocks = L.blocks.map((b) => {
    const extra = cs.filter((c) => c.kind === "part").flatMap((c) => { const s = b.parts?.find((q) => q.id === c.of); return s ? [{ ...s, id: c.id }] : []; });
    return extra.length ? { ...b, parts: [...(b.parts ?? []), ...extra] } : b;
  });
  const all = blocks.flatMap((b) => b.parts ?? []);
  for (const b of bs) {
    const q = all.find((p) => p.id === b.of);
    if (q) texts.push(badgeText(b, q));
  }
  return { ...L, texts, blocks };
}

/** The editable text line for a note added in the editor. */
export function noteText(n: KioskNote): LiveText {
  const w = Math.max(n.size, n.size * 0.62 * [...n.text].length);
  return { id: n.id, text: n.text, font: "Geist-Bold", size: n.size, color: n.color ?? "#FFFFFF", x: n.cx - w / 2, y: n.y, w, top: n.y - n.size, bottom: n.y + n.size * 0.3, flow: true, align: "center" };
}

/**
 * Steps on a venue artboard: the bands between its horizontal step lines
 * (top → bottom of the artboard), in trim points. Empty when the file has none.
 */
export function stepBands(lines: [number, number, number, number][] | undefined, H: number): [number, number][] {
  if (!lines?.length) return [];
  const ys = [...new Set(lines.filter(([, y1, , y2]) => Math.abs(y1 - y2) < 1).map(([, y]) => Math.round(Math.min(H, Math.max(0, y)))))];
  const cuts = [...new Set([0, ...ys, Math.round(H)])].sort((a, b) => a - b);
  const out: [number, number][] = [];
  for (let i = 1; i < cuts.length; i++) if (cuts[i]! - cuts[i - 1]! > 36) out.push([cuts[i - 1]!, cuts[i]!]);
  return out.length > 1 ? out : [];
}

/** The editable text line that stands in for a badge object, in its own box. */
export function badgeText(b: KioskBadge, q: LivePart): LiveText {
  const h = q.y1 - q.y0;
  const size = Math.max(18, Math.min(400, h * 0.55));
  return {
    id: b.id,
    text: b.text,
    font: b.font ?? "Geist-Bold",
    size,
    color: b.color ?? "#FFFFFF",
    x: q.x0,
    y: q.y0 + h / 2 + size * 0.35,
    w: q.x1 - q.x0,
    top: q.y0,
    bottom: q.y1,
    flow: true,
  };
}

/** Object ids whose picture is replaced by an editable badge text. */
export function badgedPartIds(edits: KioskEdits = {}): Set<string> {
  return new Set((edits.badges ?? []).map((b) => b.of));
}

/** Place one piece at kiosk y with scale s (pure). */
function placeBlock(L: LiveLayout, edits: KioskEdits, badged: Set<string>, b: LiveBlock, c: readonly [number, number], y: number, s: number): PlacedBlock {
    const e = edits.blocks?.[b.id] ?? {};
    const us = e.scale ?? 1;
    const sc = s * us;
    const w = L.trimW * sc;
    const h = (c[1] - c[0]) * sc;
    const hs = (c[1] - c[0]) * s;
    const x = (kioskFaceW(L) - w) / 2 + (e.dx ?? 0);
    const yy = y + (hs - h) / 2 + (e.dy ?? 0);
    const texts = L.texts
      .filter((t) => {
        const m = (t.top + t.bottom) / 2;
        return m >= b.y0 && m < b.y1;
      })
      .map<PlacedText>((t) => {
        const te = edits.texts?.[t.id] ?? {};
        const kx = x + t.x * sc + (te.dx ?? 0);
        const kw = t.w * sc;
        const ksize = (te.size ?? t.size) * sc;
        const text = te.text ?? t.text;
        const lines = text.split(/\r?\n/);
        const align: TextAlign = te.align ?? t.align ?? "left";
        const edited = te.text !== undefined && te.text !== t.text;
        return {
          ...t,
          kx,
          ky: yy + (t.y - c[0]) * sc + (te.dy ?? 0),
          ksize,
          kw,
          edited,
          text,
          fill: (() => { const ck = te.cmyk ?? (te.color ? undefined : t.cmyk); return ck ? cmykScreen(ck) : te.color ?? t.color; })(),
          lines,
          align,
          ax: kx + (align === "center" ? kw / 2 : align === "right" ? kw : 0),
          lead: te.lead ?? t.lead ?? 1.15,
          trackPt: ((te.track ?? t.track ?? 0) / 1000) * ksize,
          cmyk: te.cmyk ?? (te.color ? undefined : t.cmyk),
          fixed: !t.flow && !edited && !te.track && lines.length === 1 && te.size === undefined,
          opacity: te.opacity ?? 1,
          rot: te.rot ?? 0,
        };
      })
      .filter((t) => !edits.texts?.[t.id]?.hidden);
    const parts: PlacedPart[] = (b.parts ?? [])
      .map((pt) => ({ pt, src: { x0: pt.x0, x1: pt.x1, y0: Math.max(pt.y0, c[0]), y1: Math.min(pt.y1, c[1]) } }))
      .filter(({ src }) => src.y1 - src.y0 > 2)
      .map(({ pt, src }) => {
        const pe = edits.parts?.[pt.id] ?? {};
        const ps = (pe.scale ?? 1) * (pt.rs ?? 1);
        const w = (src.x1 - src.x0) * sc, h = (src.y1 - src.y0) * sc;
        return {
          part: pt,
          src,
          x: x + src.x0 * sc + (pe.dx ?? 0) + (pt.rx ?? 0) * sc + ((1 - ps) * w) / 2,
          y: yy + (src.y0 - c[0]) * sc + (pe.dy ?? 0) + (pt.ry ?? 0) * sc + ((1 - ps) * h) / 2,
          scale: sc * ps,
          hidden: !!pe.hidden || badged.has(pt.id),
          opacity: pe.opacity ?? 1,
          rot: pe.rot ?? 0,
          ...(pe.cmyk ? { cmyk: pe.cmyk } : {}),
        };
      })
      .map((q, i) => ({ q, i, z: edits.z?.[q.part.id] ?? 0 }))
      .sort((a, b) => a.z - b.z || a.i - b.i)
      .map(({ q }) => q);
    return { block: b, clipTop: c[0], clipBottom: c[1], x, y: yy, scale: sc, texts, parts };
}

/** Pure: place every visible piece of a London wall onto the kiosk front. */
export function layoutKiosk(L0: LiveLayout, edits: KioskEdits = {}): PlacedBlock[] {
  const L = withCopies(L0, edits);
  const badged = badgedPartIds(edits);
  const base = KIOSK_W / L.trimW;
  const vis = L.blocks.filter((b) => !isHidden(b, edits.blocks?.[b.id]));
  if (L.native) {
    // The designer already laid the kiosk out: every piece stays where it is.
    const out: PlacedBlock[] = [];
    for (const b of vis) out.push(placeBlock(L, edits, badged, b, [b.y0, b.y1], b.y0, 1));
    return out;
  }
  const full = (b: LiveBlock) => [b.y0, b.y1] as const;
  const tight = (b: LiveBlock) => [Math.max(b.y0, b.c0 - 60), Math.min(b.y1, b.c1 + 60)] as const;

  // Above the TV: leading pieces while they fit.
  const above: { b: LiveBlock; c: readonly [number, number] }[] = [];
  let cum = 0;
  for (const b of vis) {
    let c = full(b);
    if (cum + (c[1] - c[0]) * base > KIOSK_TV.y) c = tight(b);
    if (cum + (c[1] - c[0]) * base > KIOSK_TV.y) break;
    above.push({ b, c });
    cum += (c[1] - c[0]) * base;
  }
  // A headline too tall for the space above the TV is shrunk evenly (never
  // below 60 %) so it sits above the TV instead of leaving that space empty.
  let aboveScale = base;
  if (!above.length && vis[0]) {
    const c = tight(vis[0]);
    const kk = KIOSK_TV.y / ((c[1] - c[0]) * base);
    if (kk >= 0.6) {
      above.push({ b: vis[0], c });
      aboveScale = base * kk;
    }
  }
  const below = vis.slice(above.length);
  const region = KIOSK_H - (KIOSK_TV.y + KIOSK_TV.h);
  let clips = below.map((b) => ({ b, c: full(b) as readonly [number, number] }));
  const sum = () => clips.reduce((n, x) => n + (x.c[1] - x.c[0]) * base, 0);
  if (sum() + GAP_MIN * clips.length > region) clips = below.map((b) => ({ b, c: tight(b) }));
  const k = Math.min(1, (region - GAP_MIN * clips.length) / Math.max(1, sum()));
  const gap = clips.length > 1 ? (region - sum() * k) / clips.length : 0;

  const out: PlacedBlock[] = [];
  const place = (b: LiveBlock, c: readonly [number, number], y: number, s: number) => {
    out.push(placeBlock(L, edits, badged, b, c, y, s));
  };
  let y = 0;
  for (const a of above) {
    place(a.b, a.c, y, aboveScale);
    y += (a.c[1] - a.c[0]) * aboveScale;
  }
  y = KIOSK_TV.y + KIOSK_TV.h + (clips.length > 1 ? gap / 2 : 0);
  clips.forEach((x, i) => {
    const h = (x.c[1] - x.c[0]) * base * k;
    // The last piece (usually the bottom motif) sits on the trim edge.
    const yy = i === clips.length - 1 && clips.length > 0 ? KIOSK_H - h : y;
    place(x.b, x.c, yy, base * k);
    y += h + gap;
  });
  return out;
}

export function kioskGround(L: LiveLayout, edits: KioskEdits = {}) {
  const st = edits.ground?.stops;
  if (st && st.length >= 2) return st.map((color, k) => ({ offset: k / (st.length - 1), color }));
  if (edits.ground) return [
    { offset: 0, color: edits.ground.top },
    { offset: 1, color: edits.ground.bottom },
  ];
  return L.ground;
}

// ---- SVG --------------------------------------------------------------------

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The supplied object a (possibly copied) part draws. */
export function partSource(edits: KioskEdits, id: string): string {
  const c = edits.copies?.find((x) => x.id === id && x.kind === "part");
  return c ? partSource(edits, c.of) : id;
}

/** Native preview symbols, named for this document. */
export function nativeSymbols(inner: string, sym: string) {
  // Grounds may be stretched (no-bleed files, re-sized signs); pieces never are.
  return inner.split("__SYM__").join(sym).replace(/<symbol id="([^"]*-bg)"/g, '<symbol preserveAspectRatio="none" id="$1"');
}

/** Split the supplied art SVG into its viewBox and inner markup. */
export function splitArtSvg(svg: string): { viewBox: string; inner: string } {
  const open = svg.match(/<svg\b[^>]*>/);
  const vb = open?.[0].match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 100 100";
  const start = (open?.index ?? 0) + (open?.[0].length ?? 0);
  const end = svg.lastIndexOf("</svg>");
  // Layer groups from the London file are relabelled so they do not read as
  // the kiosk's own Cut layer in Illustrator.
  const inner = svg
    .slice(start, end > start ? end : undefined)
    .replace(/inkscape:label="([^"]*)"/g, 'inkscape:label="London $1"');
  return { viewBox: vb, inner };
}

/**
 * The piece's clip in its own London coordinates (y relative to clipTop),
 * with an even-odd hole for every separate object so nothing draws twice.
 */
export function pieceBackdropPath(L: LiveLayout, p: PlacedBlock, bleedX: number, top: number, bot: number): string {
  const r = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;
  let d = r(-bleedX, top, L.trimW + 2 * bleedX, p.clipBottom - p.clipTop + bot - top);
  for (const q of p.parts) d += r(q.src.x0, q.src.y0 - p.clipTop, q.src.x1 - q.src.x0, q.src.y1 - q.src.y0);
  return d;
}

export type TextPathFn = (t: PlacedText) => string | null;

/**
 * Build the kiosk front as a layered SVG (Illustrator reads the top-level
 * groups as layers). With `outline`, text is drawn as paths for press.
 */
export function buildKioskFrontSvg(
  L: LiveLayout,
  artSvg: string,
  edits: KioskEdits = {},
  opts: { outline?: TextPathFn; fontCss?: string; family?: (font: string) => string } = {},
): string {
  const placed = layoutKiosk(L, edits);
  const art = splitArtSvg(artSvg);
  const [, , vw, vh] = art.viewBox.split(/\s+/).map(Number);
  const B = KIOSK_BLEED;
  const KW = kioskFaceW(L);
  const KIOSK_H = kioskFaceH(L);
  const g = kioskGround(L, edits);
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${KW + 2 * B}pt" height="${KIOSK_H + 2 * B}pt" viewBox="${-B} ${-B} ${KW + 2 * B} ${KIOSK_H + 2 * B}">`,
  );
  parts.push(`<defs>`);
  if (opts.fontCss) parts.push(`<style>${opts.fontCss}</style>`);
  parts.push(
    `<linearGradient id="kg" x1="0" y1="0" x2="0" y2="1">${g.map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join("")}</linearGradient>`,
  );
  if (L.native) parts.push(nativeSymbols(art.inner, "art"));
  else parts.push(`<symbol id="art" viewBox="${art.viewBox}" overflow="visible">${art.inner}</symbol>`);
  placed.forEach((p) => {
    const bleedX = B / p.scale + 1;
    const top = p === placed[0] && p.y <= 0.5 ? -B / p.scale : 0;
    const bot = Math.abs(p.y + (p.clipBottom - p.clipTop) * p.scale - KIOSK_H) < 0.5 ? B / p.scale : 0;
    parts.push(`<clipPath id="c-${p.block.id}"><path clip-rule="evenodd" d="${pieceBackdropPath(L, p, bleedX, top, bot)}"/></clipPath>`);
    for (const q of p.parts)
      parts.push(`<clipPath id="c-${q.part.id}"><rect x="${q.src.x0}" y="${q.src.y0}" width="${q.src.x1 - q.src.x0}" height="${q.src.y1 - q.src.y0}"/></clipPath>`);
  });
  parts.push(`</defs>`);
  const nat = L.native;
  parts.push(
    nat && !edits.ground
      ? `<g id="Background"><rect x="${-B}" y="${-B}" width="${KW + 2 * B}" height="${KIOSK_H + 2 * B}" fill="#FFFFFF"/><use xlink:href="#art-${nat.bgSym ?? "bg"}" href="#art-${nat.bgSym ?? "bg"}" x="${nativeBgBox(L)[0]}" y="${nativeBgBox(L)[1]}" width="${nativeBgBox(L)[2]}" height="${nativeBgBox(L)[3]}"/></g>`
      : `<g id="Background"><rect x="${-B}" y="${-B}" width="${KW + 2 * B}" height="${KIOSK_H + 2 * B}" fill="url(#kg)"/></g>`,
  );
  parts.push(`<g id="Graphics">`);
  for (const p of placed) {
    if (nat) {
      parts.push(`<g id="piece-${p.block.id}">`);
      for (const q of p.parts) {
        if (q.hidden) continue;
        const ref = `#art-${partSource(edits, q.part.id)}`;
        // Recoloured objects: flood the object's own shape with the chosen ink.
        const rc = q.cmyk ? `rc-${q.part.id}` : null;
        if (rc) parts.push(`<filter id="${rc}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feFlood flood-color="${cmykScreen(q.cmyk!)}"/><feComposite in2="SourceAlpha" operator="in"/></filter>`);
        parts.push(
          `<g id="object-${q.part.id}" inkscape:label="Object ${q.part.id}"${fx(q.opacity, q.rot, partCentre(q).x, partCentre(q).y)}><g transform="translate(${q.x - q.src.x0 * q.scale} ${q.y - q.src.y0 * q.scale}) scale(${q.scale})"${rc ? ` filter="url(#${rc})"` : ""}><use xlink:href="${ref}" href="${ref}" x="${-L.originX}" y="${-L.originY}" width="${L.mediaW}" height="${L.mediaH}"/></g></g>`,
        );
      }
      parts.push(`</g>`);
      continue;
    }
    parts.push(
      `<g id="piece-${p.block.id}" inkscape:label="Piece ${p.block.id}"><g transform="translate(${p.x} ${p.y}) scale(${p.scale})"><g clip-path="url(#c-${p.block.id})"><use xlink:href="#art" href="#art" x="${-L.originX}" y="${-(L.originY + p.clipTop)}" width="${vw}" height="${vh}"/></g></g>`,
    );
    for (const q of p.parts) {
      if (q.hidden) continue;
      parts.push(
        `<g id="object-${q.part.id}" inkscape:label="Object ${q.part.id}"${fx(q.opacity, q.rot, partCentre(q).x, partCentre(q).y)}><g transform="translate(${q.x - q.src.x0 * q.scale} ${q.y - q.src.y0 * q.scale}) scale(${q.scale})"><g clip-path="url(#c-${q.part.id})"><use xlink:href="#art" href="#art" x="${-L.originX}" y="${-L.originY}" width="${vw}" height="${vh}"/></g></g></g>`,
      );
    }
    parts.push(`</g>`);
  }
  parts.push(`</g>`);
  parts.push(`<g id="Accents">`);
  for (const d of edits.dividers ?? []) if (!d.hidden) parts.push(dividerSvg(d));
  parts.push(marksSvg(edits.marks));
  parts.push(`</g>`);
  parts.push(`<g id="Text">`);
  for (const p of placed)
    for (const t of p.texts) {
      const sq = bulletSquarePath(t);
      if (sq) {
        parts.push(`<path id="${t.id}" d="${sq}" fill="${t.fill}"${fx(t.opacity, t.rot, t.ax, t.ky)}/>`);
        continue;
      }
      const d = opts.outline?.(t);
      if (d) {
        parts.push(`<path id="${t.id}" d="${d}" fill="${t.fill}"${fx(t.opacity, t.rot, t.ax, t.ky)}/>`);
        continue;
      }
      const fit = t.fixed ? ` textLength="${t.kw.toFixed(2)}" lengthAdjust="spacing"` : "";
      const anchor = t.align === "center" ? "middle" : t.align === "right" ? "end" : "start";
      const ls = t.trackPt ? ` letter-spacing="${t.trackPt.toFixed(2)}"` : "";
      const spans = t.lines.map((s, i) => `<tspan x="${t.ax.toFixed(2)}" y="${(t.ky + i * t.lead * t.ksize).toFixed(2)}">${esc(s)}</tspan>`).join("");
      parts.push(
        `<text id="${t.id}" text-anchor="${anchor}" font-family="${esc((opts.family ?? kioskFontFamily)(t.font))}" font-size="${t.ksize.toFixed(2)}" fill="${t.fill}" xml:space="preserve"${ls}${fit}${fx(t.opacity, t.rot, t.ax, t.ky)}>${spans}</text>`,
      );
    }
  parts.push(`</g>`);
  parts.push(`<g id="Cut"><rect x="0" y="0" width="${KW}" height="${KIOSK_H}" fill="none" stroke="#EC008C" stroke-width="0.5"/></g>`);
  parts.push(`</svg>`);
  return parts.join("");
}

/** A return strip: the partner's own background ramp, with bleed. */
export function buildKioskReturnSvg(L: LiveLayout, edits: KioskEdits = {}): string {
  const B = KIOSK_BLEED;
  const g = kioskGround(L, edits);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${KIOSK_RETURN_W + 2 * B}pt" height="${KIOSK_H + 2 * B}pt" viewBox="${-B} ${-B} ${KIOSK_RETURN_W + 2 * B} ${KIOSK_H + 2 * B}"><defs><linearGradient id="kg" x1="0" y1="0" x2="0" y2="1">${g.map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join("")}</linearGradient></defs><g id="Background"><rect x="${-B}" y="${-B}" width="${KIOSK_RETURN_W + 2 * B}" height="${KIOSK_H + 2 * B}" fill="url(#kg)"/></g><g id="Cut"><rect x="0" y="0" width="${KIOSK_RETURN_W}" height="${KIOSK_H}" fill="none" stroke="#EC008C" stroke-width="0.5"/></g></svg>`;
}

/** Interpolate the ground ramp at t ∈ [0,1] (for stepped PDF grounds). */
export function groundAt(stops: { offset: number; color: string }[], t: number): [number, number, number] {
  const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255) as [number, number, number];
  let a = stops[0]!, b = stops[stops.length - 1]!;
  for (let i = 0; i < stops.length - 1; i++)
    if (t >= stops[i]!.offset && t <= stops[i + 1]!.offset) { a = stops[i]!; b = stops[i + 1]!; break; }
  const f = b.offset === a.offset ? 0 : (t - a.offset) / (b.offset - a.offset);
  const A = hex(a.color), Bc = hex(b.color);
  return [0, 1, 2].map((i) => A[i]! + (Bc[i]! - A[i]!) * f) as [number, number, number];
}

export const kioskLiveFileBase = (id: string) => (isSignId(id) ? `rdraft-${id}-live` : `rdraft-sf-kiosk-${id}-live`);

/**
 * The partner's "▪" bullets were set in Times New Roman, which we have no
 * licence file for (and PDF standard Times cannot encode the glyph, so it
 * dropped out). They are drawn as the same filled square instead, measured
 * from the London file: 0.2226 em square, 0.0624 em in from the origin,
 * bottom edge 0.228 em above the baseline.
 */
export const BULLET_SQUARE = { inset: 0.0624, side: 0.2226, lift: 0.228 } as const;
export function bulletSquareBox(t: Pick<PlacedText, "text" | "kx" | "ky" | "ksize">) {
  if (t.text.trim() !== "▪") return null;
  const s = BULLET_SQUARE.side * t.ksize;
  return { x: t.kx + BULLET_SQUARE.inset * t.ksize, y: t.ky - BULLET_SQUARE.lift * t.ksize - s, s };
}
export function bulletSquarePath(t: Pick<PlacedText, "text" | "kx" | "ky" | "ksize">): string | null {
  const b = bulletSquareBox(t);
  if (!b) return null;
  const f = (v: number) => v.toFixed(2);
  return `M${f(b.x)} ${f(b.y)}H${f(b.x + b.s)}V${f(b.y + b.s)}H${f(b.x)}Z`;
}

/** Faces the partner used that we hold no font file for, and what they are set in instead. */
export const KIOSK_FONT_SUBSTITUTE = "Geist-Regular";
export function kioskMissingFonts(L: LiveLayout): { font: string; lines: number }[] {
  const n = new Map<string, number>();
  for (const t of L.texts) {
    if (t.text.trim() === "▪") continue;
    if (!kioskFontUrl(t.font)) n.set(t.font, (n.get(t.font) ?? 0) + 1);
  }
  return [...n].map(([font, lines]) => ({ font, lines }));
}

/**
 * Screen preview of a CMYK build, approximating US Web Coated (SWOP) v2 inks on
 * white paper (multiplicative ink model). Display only — exports always write
 * the CMYK numbers unchanged.
 */
export function cmykScreen(c: readonly number[]): string {
  const [C = 0, M = 0, Y = 0, K = 0] = c;
  const inks: [number, [number, number, number]][] = [
    [C, [0, 174, 239]], [M, [236, 0, 140]], [Y, [255, 242, 0]], [K, [35, 31, 32]],
  ];
  const rgb = [0, 1, 2].map((i) => inks.reduce((acc, [v, ink]) => acc * (1 - v * (1 - ink[i]! / 255)), 255));
  return `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

// Data model for curated pieces rebuilt page-for-page from the designer's PDF
// (see scripts/lifesci-original-extract.py). Geometry is in inches, type in pt.
import layouts from "@/lib/print-library/lifesci-original-layouts.json";

export const CSS_DPI = 96;

export type OriginalText = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  size: number;
  weight: number;
  color: string;
  lead: number;
  align: "left" | "center" | "right";
  text: string;
  family: "geist" | "poppins";
  /** Mixed colour/weight copy: styled runs (joined, they equal `text`). */
  runs?: { text: string; color: string; weight: number }[];
  hidden?: boolean;
  /** Soft wraps joined: each line break is a real paragraph / list item. */
  paragraphs?: boolean;
  /** Bullet list: each paragraph is one bullet item (hanging indent). */
  list?: boolean;
};
/** One separate piece of the designer's artwork (icon, card, logo, photo…). */
export type OriginalPiece = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
  label: string;
  /** Drawn from a bitmap (photo / flattened effect): tint is not offered. */
  raster?: boolean;
  hidden?: boolean;
  /** Flat recolour of a vector piece. */
  tint?: string;
  opacity?: number;
  /** Paint-order nudge (higher draws above). */
  z?: number;
  /** Swapped for an approved library icon (Lucide name). */
  icon?: string;
};
export type OriginalPage = {
  ground: string;
  texts: OriginalText[];
  /** Artwork split into pieces (scripts/lifesci-original-pieces.py), paint order. */
  pieces?: OriginalPiece[];
  /** Ground used before the artwork was split — lets saved copies pick up pieces. */
  legacyGround?: string;
};
export type OriginalLayout = { widthIn: number; heightIn: number; pages: OriginalPage[] };

const ALL = layouts as unknown as Record<string, OriginalLayout>;

/** The extracted original layout for a curated seed slug, if one exists. */
export function originalLayoutFor(slug: string): OriginalLayout | undefined {
  return ALL[slug];
}

/** Content opted into the original layout (the default for supplied pieces). */
export function isOriginalLayout(content: unknown): content is { layoutMode: "original"; original: OriginalLayout } {
  const c = content as { layoutMode?: string; original?: OriginalLayout } | null;
  return !!c && c.layoutMode === "original" && !!c.original?.pages?.length;
}

/** Adds the original layout to a seed's content (Library layout stays in the same content). */
export function withOriginalLayout<T extends object>(slug: string, content: T): T {
  const original = originalLayoutFor(slug);
  return original ? ({ ...content, layoutMode: "original", original } as T) : content;
}

/** Original geometry of a piece/text as supplied (for "Reset"). */
export function suppliedPiece(ground: string, id: string): OriginalPiece | undefined {
  for (const l of Object.values(ALL))
    for (const p of l.pages)
      if (p.ground === ground) return p.pieces?.find((k) => k.id === id);
  return undefined;
}

/**
 * Saved copies made before the artwork was split carry the old flat ground and
 * no pieces: swap in the split ground + pieces for that same page.
 */
export function withPieces(layout: OriginalLayout): OriginalLayout {
  if (layout.pages.every((p) => p.pieces)) return layout;
  return {
    ...layout,
    pages: layout.pages.map((p) => {
      if (p.pieces) return p;
      for (const l of Object.values(ALL))
        for (const bp of l.pages)
          if (bp.legacyGround === p.ground || bp.ground === p.ground)
            return { ...p, ground: bp.ground, pieces: bp.pieces ?? [], legacyGround: p.ground };
      return p;
    }),
  };
}

// -----------------------------------------------------------------------------
// Paragraphs, not lines. The PDF extract stored every printed line break,
// including the designer's soft wraps, so bullets and body copy arrived as
// hard-broken lines. `withParagraphs` joins soft wraps back into flowing
// paragraphs (one bullet = one item, one body paragraph = one item) while
// keeping every character's colour/weight, and flags bullet blocks so they
// render with a hanging indent. Headings (large type) keep their breaks.
// -----------------------------------------------------------------------------

export const BULLET = "\u2022";
const BODY_MAX_PT = 11.5;

type Run = { text: string; color: string; weight: number };

function runsOf(t: OriginalText): Run[] {
  return t.runs?.length ? t.runs : [{ text: t.text, color: t.color, weight: t.weight }];
}

/** Merge neighbouring runs that share a style. */
export function packRuns(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const r of runs) {
    if (!r.text) continue;
    const last = out[out.length - 1];
    if (last && last.color === r.color && last.weight === r.weight) last.text += r.text;
    else out.push({ ...r });
  }
  return out;
}

/** True when every item of the block starts with a bullet. */
export function isBulletBlock(text: string): boolean {
  return text.trimStart().startsWith(BULLET);
}

/** Indices of `\n` that are soft wraps (not paragraph or item breaks). */
function softBreaks(t: OriginalText): Set<number> {
  const soft = new Set<number>();
  if (t.size > BODY_MAX_PT || !t.text.includes("\n")) return soft;
  const lines = t.text.split("\n");
  const bullets = isBulletBlock(t.text);
  const longest = Math.max(...lines.map((l) => l.length));
  let pos = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    pos += lines[i].length;
    const next = lines[i + 1];
    const cur = lines[i];
    const isSoft = bullets
      ? !next.trimStart().startsWith(BULLET)
      : lines.length >= 2 && cur.length >= longest * 0.72 && !/[.:!?]$/.test(cur.trim()) && next.trim().length > 0;
    if (isSoft) soft.add(pos);
    pos += 1;
  }
  return soft;
}

export function paragraphText(t: OriginalText): OriginalText {
  if (t.paragraphs) return t;
  const soft = softBreaks(t);
  const list = isBulletBlock(t.text);
  if (!soft.size) return { ...t, paragraphs: true, list: list || undefined };
  let i = 0;
  const runs = runsOf(t).map((r) => {
    let s = "";
    for (const ch of r.text) {
      s += ch === "\n" && soft.has(i) ? " " : ch;
      i += ch.length;
    }
    return { ...r, text: s };
  });
  const packed = packRuns(runs);
  return {
    ...t,
    text: packed.map((r) => r.text).join(""),
    runs: t.runs ? packed : undefined,
    // Reflowed copy needs a hair of room for metric differences.
    w: Math.round(t.w * 1.04 * 10000) / 10000,
    paragraphs: true,
    list: list || undefined,
  };
}

/** Apply paragraph joining to every text block on every page. */
export function withParagraphs(layout: OriginalLayout): OriginalLayout {
  if (layout.pages.every((p) => p.texts.every((t) => t.paragraphs))) return layout;
  return { ...layout, pages: layout.pages.map((p) => ({ ...p, texts: p.texts.map(paragraphText) })) };
}

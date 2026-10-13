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

// -----------------------------------------------------------------------------
// Copy sync. Social, print-size and slide versions read the library-layout
// fields of the same content (title, summary, sections, bullets…). When a text
// block is edited in the original layout, carry each changed paragraph / bullet
// into every library field that printed the old wording, so all formats read
// the same as the editor. Only wording the piece already carried is replaced.
// -----------------------------------------------------------------------------

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const stripBullet = (s: string) => norm(s.replace(new RegExp(`^\\s*${BULLET}\\s*`), ""));
const parasOf = (t: OriginalText) => paragraphText(t).text.split("\n").map(stripBullet);

type Swap = { from: string; to: string };

function swapsFor(prev: OriginalLayout, next: OriginalLayout): { swaps: Swap[]; lists: { from: string[]; to: string[] }[] } {
  const swaps: Swap[] = [];
  const lists: { from: string[]; to: string[] }[] = [];
  next.pages.forEach((np, pi) => {
    const pp = prev.pages[pi];
    if (!pp) return;
    for (const nt of np.texts) {
      const pt = pp.texts.find((t) => t.id === nt.id);
      if (!pt) continue;
      const a = parasOf(pt);
      const b = nt.hidden ? [] : parasOf(nt);
      if (a.join("\n") === b.join("\n")) continue;
      const wa = norm(a.join(" "));
      const wb = norm(b.join(" "));
      if (wa && wa !== wb) swaps.push({ from: wa, to: wb });
      if (a.length === b.length) a.forEach((x, i) => x && x !== b[i] && swaps.push({ from: x, to: b[i] }));
      if (isBulletBlock(pt.text)) lists.push({ from: a, to: b });
    }
  });
  // Longest first so whole blocks win over their own lines.
  swaps.sort((x, y) => y.from.length - x.from.length);
  return { swaps, lists };
}

function rewrite(v: unknown, swaps: Swap[], lists: { from: string[]; to: string[] }[]): unknown {
  if (typeof v === "string") {
    const n = norm(v);
    for (const s of swaps) {
      if (n === s.from) return s.to;
      if (s.from.length >= 12 && n.includes(s.from)) return n.split(s.from).join(s.to);
    }
    return v;
  }
  if (Array.isArray(v)) {
    if (v.length && v.every((x) => typeof x === "string")) {
      const items = (v as string[]).map(stripBullet);
      for (const l of lists) {
        const hits = items.filter((x) => l.from.includes(x)).length;
        if (hits >= Math.max(2, Math.ceil(items.length / 2))) return [...l.to];
      }
    }
    return v.map((x) => rewrite(x, swaps, lists));
  }
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = k === "original" || k === "layoutMode" ? x : rewrite(x, swaps, lists);
    return out;
  }
  return v;
}

/** Library-layout fields updated to match an edited original layout. */
export function syncCopyFromOriginal<T extends Record<string, unknown>>(content: T, prev: OriginalLayout | undefined, next: OriginalLayout): T {
  if (!prev) return content;
  const { swaps, lists } = swapsFor(prev, next);
  if (!swaps.length && !lists.length) return content;
  return rewrite(content, swaps, lists) as T;
}

// -----------------------------------------------------------------------------
// Editor copy. For a piece in the original layout, the wording other formats
// use (headline, summary, sections with their bullets) is read straight from
// the visible text blocks the editor shows — so social, print sizes and slides
// always say what the editor says, including edits and hidden blocks.
// -----------------------------------------------------------------------------

export type EditorCopy = {
  title?: string;
  summary?: string;
  sections: { heading: string; body: string; bullets: string[] }[];
};

export function editorCopyFromOriginal(layout: OriginalLayout): EditorCopy {
  const all = withParagraphs(layout).pages.flatMap((p, pi) =>
    p.texts.filter((t) => !t.hidden && norm(t.text)).map((t) => ({ t, pi })),
  );
  if (!all.length) return { sections: [] };
  // Body size = the size carrying the most characters.
  const bySize = new Map<number, number>();
  for (const { t } of all) bySize.set(t.size, (bySize.get(t.size) ?? 0) + t.text.length);
  const body = [...bySize.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const first = all.filter((x) => x.pi === 0);
  const head = first.reduce((a, b) => (b.t.size > a.t.size ? b : a));
  const title = norm(head.t.text);
  const isBullets = (t: OriginalText) => isBulletBlock(t.text);
  const summaryT = first
    .filter(
      (x) =>
        x !== head &&
        x.t.y > head.t.y &&
        !isBullets(x.t) &&
        x.t.size <= body + 1.5 &&
        norm(x.t.text).length >= 100 &&
        !/^(source\b|\d+\.\s)/i.test(norm(x.t.text)),
    )
    .sort((a, b) => a.t.y - b.t.y)[0];
  const isHeading = (t: OriginalText) =>
    !isBullets(t) && norm(t.text).length <= 80 && (t.size >= body + 1.5 || (t.weight >= 600 && t.size >= body)) && t.size < head.t.size;

  type H = { pi: number; t: OriginalText; heading: string; body: string[]; bullets: string[] };
  const heads: H[] = [];
  const sorted = [...all].sort((a, b) => a.pi - b.pi || a.t.y - b.t.y || a.t.x - b.t.x);
  for (const x of sorted) {
    if (x === head || !isHeading(x.t)) continue;
    // A heading split over two text boxes (bold + regular) reads as one.
    const prev = heads[heads.length - 1];
    if (prev && prev.pi === x.pi && !prev.body.length && Math.abs(prev.t.x - x.t.x) < 0.2 && x.t.y - prev.t.y < (prev.t.size / 72) * 2.6) {
      prev.heading = norm(`${prev.heading} ${x.t.text}`);
      continue;
    }
    heads.push({ pi: x.pi, t: x.t, heading: norm(x.t.text), body: [], bullets: [] });
  }
  const owner = (pi: number, t: OriginalText): H | undefined => {
    const above = heads.filter((h) => h.pi === pi && h.t.y <= t.y + 0.5);
    // Row headings sit to the left, level with some part of the block.
    const left = heads.filter(
      (h) => h.pi === pi && h.t.x + h.t.w <= t.x + 0.2 && h.t.y <= t.y + t.h && t.y - h.t.y < 1.6,
    );
    if (left.length) return left.sort((a, b) => Math.abs(a.t.y - t.y) - Math.abs(b.t.y - t.y))[0];
    return above.filter((h) => h.t.y <= t.y).sort((a, b) => b.t.y - a.t.y)[0];
  };
  const loose: H = { pi: -1, t: head.t, heading: "", body: [], bullets: [] };
  for (const x of sorted) {
    if (x === head || x === summaryT || isHeading(x.t)) continue;
    const h = owner(x.pi, x.t) ?? loose;
    if (isBullets(x.t)) h.bullets.push(...parasOf(x.t).filter(Boolean));
    else if (x.t.size <= body + 1.5 && norm(x.t.text).length >= 60) h.body.push(norm(x.t.text));
  }
  const sections = [...(loose.body.length || loose.bullets.length ? [loose] : []), ...heads]
    .filter((h) => h.body.length || h.bullets.length)
    .map((h) => ({ heading: h.heading, body: h.body.join(" "), bullets: h.bullets }));
  return { title, summary: summaryT ? norm(summaryT.t.text) : undefined, sections };
}

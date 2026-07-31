// RAG document builder for imported PPTX decks.
//
// Turns the stored `imported_decks.slides` payload into embedding-friendly
// prose. Layer 2a normalization: the text we emit here is what actually
// reaches brand_asset_chunks, so it must include the structural content that
// only lives in layout shapes (tables, charts, SmartArt, non-placeholder
// callouts) — not just title/bullets/notes.
//
// Pure module: no server or browser dependencies, so the server function and
// the admin embed script share one implementation.

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ImportedSlideLite = {
  index: number;
  title: string;
  bullets: string[];
  notes: string;
  imageCount?: number;
  layout?: any;
  assets?: any;
  layoutFingerprint?: {
    layoutName?: string;
    layoutType?: string;
    phSignature?: string;
    frameGrid?: string;
  };
};

export type DeckSectionLite = { name: string; slideIndexes: number[] };

const clean = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();
const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean)));

/** Flatten a captured LayoutTextBody into a single line of prose. */
function textBodyToLine(body: any): string {
  const paras = body?.paras ?? [];
  return clean(
    paras
      .map((p: any) => (p?.runs ?? []).map((r: any) => r?.text ?? "").join(""))
      .join(" "),
  );
}

/** One prose block per slide — the unit the chunker joins together. */
export function buildSlideBlock(s: ImportedSlideLite): string {
  const title = clean(s.title) || "(untitled)";
  const lines: string[] = [`Slide ${s.index + 1}: ${title}`];

  const layoutName = clean(s.layoutFingerprint?.layoutName);
  if (layoutName) lines.push(`Layout: ${layoutName}`);

  const bullets = (s.bullets ?? []).map(clean).filter(Boolean);
  for (const b of bullets) lines.push(`• ${b}`);

  const shapes: any[] = s.layout?.shapes ?? [];
  const seen = new Set(bullets.map((b) => b.toLowerCase()));
  seen.add(title.toLowerCase());

  // Non-placeholder shape text (callouts, labels, stat captions) that never
  // made it into `bullets` because it isn't in a body placeholder.
  const extraText: string[] = [];
  for (const sh of shapes) {
    if (sh?.kind !== "text" || sh.isPlaceholder || sh.isTitle) continue;
    const line = textBodyToLine(sh.text);
    if (!line || line.length < 2) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    extraText.push(line);
  }
  for (const t of uniq(extraText).slice(0, 24)) lines.push(`• ${t}`);

  // Tables — header row + data rows as readable pipe-separated lines.
  const tables = shapes.filter((sh) => sh?.kind === "table");
  tables.forEach((t: any, i: number) => {
    const header = (t.header ?? []).map(clean).filter(Boolean);
    const rows = (t.rows ?? []) as string[][];
    if (!header.length && !rows.length) return;
    lines.push(`Table ${i + 1}${header.length ? `: ${header.join(" | ")}` : ""}`);
    for (const row of rows.slice(0, 20)) {
      const cells = row.map(clean).filter(Boolean);
      if (cells.length) lines.push(`  ${cells.join(" | ")}`);
    }
  });

  // Charts — title, series labels, categories.
  const charts: any[] = [
    ...shapes.filter((sh) => sh?.kind === "chart" && sh.chart).map((sh) => sh.chart),
    ...(s.assets?.charts ?? []),
  ];
  const chartSeen = new Set<string>();
  charts.forEach((c: any) => {
    const title2 = clean(c?.title);
    const series = uniq(((c?.seriesLabels ?? c?.series ?? []) as any[]).map((x) =>
      clean(typeof x === "string" ? x : x?.label),
    ));
    const cats = uniq(((c?.categories ?? []) as any[]).map(clean));
    const key = `${title2}|${series.join(",")}|${cats.join(",")}`;
    if (chartSeen.has(key)) return;
    chartSeen.add(key);
    const kind = clean(c?.kind);
    const bits = [`Chart${kind ? ` (${kind})` : ""}${title2 ? `: ${title2}` : ""}`];
    if (series.length) bits.push(`series: ${series.slice(0, 10).join(", ")}`);
    if (cats.length) bits.push(`categories: ${cats.slice(0, 16).join(", ")}`);
    if (bits.length > 1 || title2) lines.push(bits.join(" — "));
  });

  // SmartArt / diagram node text.
  for (const d of s.assets?.diagrams ?? []) {
    const nodes = uniq(((d?.nodes ?? d?.sampleNodes ?? []) as any[]).map((n) => clean(n?.text)));
    if (!nodes.length) continue;
    const hint = clean(d?.layoutHint || d?.kind);
    lines.push(`Diagram${hint ? ` (${hint})` : ""}: ${nodes.slice(0, 24).join(" → ")}`);
  }

  const notes = clean(s.notes);
  if (notes) lines.push(`Notes: ${notes}`);

  return lines.join("\n");
}

/** Whole-deck document (used for logging / length checks). */
export function buildDeckDocument(slides: ImportedSlideLite[]): string {
  return slides.map(buildSlideBlock).join("\n\n");
}

/** Sliding-window chunker — the pdf-path default. */
export function chunkText(text: string, size = 1200, overlap = 200): string[] {
  const cleanText = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!cleanText) return [];
  if (cleanText.length <= size) return [cleanText];
  const out: string[] = [];
  let i = 0;
  while (i < cleanText.length) {
    out.push(cleanText.slice(i, i + size));
    if (i + size >= cleanText.length) break;
    i += size - overlap;
  }
  return out;
}

/**
 * Section-aware chunking. When the deck declares `p14:sectionLst` sections we
 * use those boundaries so a chunk never straddles two topics, sub-chunking any
 * section whose prose exceeds the window. Decks without sections fall back to
 * the plain 1200/200 chunker over the whole document.
 */
export function chunkDeckDocument(
  slides: ImportedSlideLite[],
  sections: DeckSectionLite[] | null | undefined,
  size = 1200,
  overlap = 200,
): string[] {
  const blocks = new Map(slides.map((s) => [s.index, buildSlideBlock(s)]));
  const usable = (sections ?? []).filter((sec) => (sec.slideIndexes ?? []).length > 0);
  if (usable.length === 0) return chunkText(buildDeckDocument(slides), size, overlap);

  const covered = new Set<number>();
  const out: string[] = [];
  for (const sec of usable) {
    const body = sec.slideIndexes
      .map((i) => {
        covered.add(i);
        return blocks.get(i);
      })
      .filter(Boolean)
      .join("\n\n");
    if (!body.trim()) continue;
    const head = `Section: ${clean(sec.name) || "Untitled section"}`;
    for (const piece of chunkText(body, size, overlap)) out.push(`${head}\n${piece}`);
  }
  // Slides outside every declared section still need to be retrievable.
  const orphans = slides.filter((s) => !covered.has(s.index));
  if (orphans.length) {
    for (const piece of chunkText(buildDeckDocument(orphans), size, overlap)) out.push(piece);
  }
  return out;
}

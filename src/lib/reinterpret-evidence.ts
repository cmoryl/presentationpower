// Deep per-slide evidence for the AI reinterpretation planner.
//
// The planner used to see only a slide's title, bullets and a truncated notes
// string, so it guessed layouts from thin copy. This module distils everything
// the importer already recovered — text blocks with their real position and
// emphasis, charts with categories/series/values, tables, SmartArt hierarchies,
// media, links, animation — into a compact, token-cheap JSON record so the model
// can genuinely interpret each individual slide.

import type { ParsedSlide, LayoutTextBody } from "./pptx-import";

export type EvidenceTextBlock = {
  /** title | subtitle | body | caption | free — inferred role. */
  role: string;
  /** Position of the block as stage percentages, rounded. */
  at: { x: number; y: number; w: number; h: number };
  /** Largest run size in the block, in pt. */
  sizePt?: number;
  bold?: boolean;
  /** Paragraph text lines (indent preserved with a leading "- " per level). */
  lines: string[];
};

export type SlideEvidence = {
  index: number;
  title: string;
  bullets: string[];
  notes: string;
  imageCount: number;
  currentVariantId: string;
  /** Layout name from the source template, e.g. "Title and Content". */
  layoutName?: string;
  /** Placeholder signature of the source layout. */
  layoutSignature?: string;
  hidden?: boolean;
  hasAnimation?: boolean;
  /** Every text frame with position + emphasis, in z-order. */
  textBlocks: EvidenceTextBlock[];
  charts: Array<{
    kind: string;
    title?: string;
    stacked?: boolean;
    unit?: string;
    axis?: { category?: string; value?: string };
    categories: string[];
    series: Array<{ label: string; values: number[] }>;
  }>;
  tables: Array<{ header: string[]; rows: string[][] }>;
  diagrams: Array<{
    kind: string;
    layoutHint?: string;
    nodes: Array<{ text: string; level: number }>;
  }>;
  media: Array<{ kind: string; mime: string }>;
  links: string[];
  /** Numbers found anywhere in slide copy — the strongest stat-layout signal. */
  figures: string[];
};

function bodyLines(body: LayoutTextBody | undefined, max = 12): string[] {
  if (!body?.paras) return [];
  const out: string[] = [];
  for (const p of body.paras) {
    const text = (p.runs ?? [])
      .map((r) => r?.text ?? "")
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) continue;
    const level = Math.max(0, Math.min(4, Number(p.level) || 0));
    out.push(level > 0 ? `${"  ".repeat(level)}- ${text}` : text);
    if (out.length >= max) break;
  }
  return out;
}

function maxRun(body: LayoutTextBody | undefined) {
  let sizePt: number | undefined;
  let bold = false;
  for (const p of body?.paras ?? [])
    for (const r of p.runs ?? []) {
      if (typeof r.sizePt === "number" && (sizePt === undefined || r.sizePt > sizePt))
        sizePt = r.sizePt;
      if (r.bold) bold = true;
    }
  return { sizePt, bold };
}

function roleFor(args: {
  isTitle?: boolean;
  isPlaceholder?: boolean;
  sizePt?: number;
  lineCount: number;
  yPct: number;
}): string {
  if (args.isTitle) return "title";
  if (args.lineCount > 1) return "body";
  if ((args.sizePt ?? 0) >= 28) return "title";
  if ((args.sizePt ?? 0) <= 12) return "caption";
  if (args.yPct < 45 && args.isPlaceholder) return "subtitle";
  return args.isPlaceholder ? "body" : "free";
}

const FIGURE_RE =
  /(?:[$€£]\s?)?\d[\d,.]*\s?(?:%|k|K|M|B|bn|m|x|×|hrs?|days?|weeks?|months?|years?|languages?)?/g;

function figuresFrom(strings: string[]): string[] {
  const seen = new Set<string>();
  for (const s of strings)
    for (const m of s.match(FIGURE_RE) ?? []) {
      const v = m.trim();
      if (/\d/.test(v) && v.length <= 24) seen.add(v);
      if (seen.size >= 24) return [...seen];
    }
  return [...seen];
}

const clampText = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Build the compact deep-read record the planner consumes for one slide. */
export function buildSlideEvidence(source: ParsedSlide, currentVariantId: string): SlideEvidence {
  const size = source.layout?.size;
  const sw = size?.w && size.w > 0 ? size.w : 13.333;
  const sh = size?.h && size.h > 0 ? size.h : 7.5;

  const textBlocks: EvidenceTextBlock[] = [];
  for (const shape of source.layout?.shapes ?? []) {
    if (shape.kind !== "text") continue;
    const lines = bodyLines(shape.text);
    if (lines.length === 0) continue;
    const { sizePt, bold } = maxRun(shape.text);
    const at = {
      x: Math.round(((shape.frame?.x ?? 0) / sw) * 100),
      y: Math.round(((shape.frame?.y ?? 0) / sh) * 100),
      w: Math.round(((shape.frame?.w ?? 0) / sw) * 100),
      h: Math.round(((shape.frame?.h ?? 0) / sh) * 100),
    };
    textBlocks.push({
      role: roleFor({
        isTitle: shape.isTitle,
        isPlaceholder: shape.isPlaceholder,
        sizePt,
        lineCount: lines.length,
        yPct: at.y,
      }),
      at,
      sizePt: sizePt ? Math.round(sizePt) : undefined,
      bold: bold || undefined,
      lines: lines.map((l) => clampText(l, 300)),
    });
    if (textBlocks.length >= 14) break;
  }

  const charts = (source.charts ?? []).slice(0, 4).map((c) => ({
    kind: c.kind,
    title: c.title ? clampText(c.title, 120) : undefined,
    stacked: c.stacked || undefined,
    unit: c.unit,
    axis: c.axis,
    categories: (c.categories ?? []).slice(0, 16).map((v) => clampText(String(v ?? ""), 60)),
    series: (c.series ?? []).slice(0, 6).map((s) => ({
      label: clampText(s.label ?? "", 60),
      values: (s.values ?? []).slice(0, 16),
    })),
  }));

  const tables = (source.tables ?? []).slice(0, 3).map((t) => ({
    header: (t.header ?? []).slice(0, 8).map((c) => clampText(String(c ?? ""), 60)),
    rows: (t.rows ?? [])
      .slice(0, 10)
      .map((r) => r.slice(0, 8).map((c) => clampText(String(c ?? ""), 80))),
  }));

  const diagrams = (source.diagrams ?? []).slice(0, 3).map((d) => ({
    kind: d.kind,
    layoutHint: d.layoutHint,
    nodes: (d.nodes ?? []).slice(0, 20).map((n) => ({
      text: clampText(n.text ?? "", 120),
      level: Number(n.level) || 0,
    })),
  }));

  const copyPool = [
    source.title ?? "",
    ...(source.bullets ?? []),
    ...textBlocks.flatMap((b) => b.lines),
    ...charts.flatMap((c) => c.series.flatMap((s) => s.values.map(String))),
  ];

  return {
    index: source.index,
    title: source.title ?? "",
    bullets: (source.bullets ?? [])
      .filter(Boolean)
      .slice(0, 30)
      .map((b) => clampText(b, 800)),
    notes: clampText(source.notes ?? "", 3000),
    imageCount: (source.images ?? []).filter(Boolean).length,
    currentVariantId,
    layoutName: source.layoutFingerprint?.layoutName,
    layoutSignature: source.layoutFingerprint?.phSignature,
    hidden: source.hidden || undefined,
    hasAnimation: source.hasAnimation || undefined,
    textBlocks,
    charts,
    tables,
    diagrams,
    media: (source.media ?? []).slice(0, 4).map((m) => ({ kind: m.kind, mime: m.mime })),
    links: (source.hyperlinks ?? [])
      .filter((h) => h.external)
      .slice(0, 6)
      .map((h) => clampText(h.target, 200)),
    figures: figuresFrom(copyPool),
  };
}

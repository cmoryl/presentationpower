// Cross-surface cascade — one curated print-library piece (e-brochure or case
// study) feeds every other surface from the SAME master content and imagery:
//   • print + social sizes through the cross-format adaptor (`/convert?print=`)
//   • a slide deck through `createDeckFromSnapshot`
// Nothing here writes copy: every string and figure is read from the piece,
// trimmed to the target's capacity, and the full copy rides in speaker notes.
// Numeric slides are only built from figures the piece itself prints.

import type { AdaptContent } from "@/lib/cross-format-adapt";
import type { DeckSnapshot } from "@/lib/deck-store";
import { PRINT_LIBRARY_ITEMS, type PrintLibraryItem } from "@/lib/print-library/catalog";

type Rec = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const arr = (v: unknown): Rec[] => (Array.isArray(v) ? (v as Rec[]) : []);

/** Library pieces that can cascade (curated e-brochures and case studies). */
export function cascadePieces(divisionId?: string): PrintLibraryItem[] {
  return PRINT_LIBRARY_ITEMS.filter(
    (i) =>
      i.source === "curated" &&
      !!i.content &&
      (i.kind === "ebrochure" || i.kind === "case-study") &&
      (!divisionId || i.divisionId === divisionId),
  );
}

export function cascadePiece(id: string | undefined | null): PrintLibraryItem | undefined {
  return id ? cascadePieces().find((i) => i.id === id) : undefined;
}

/** Trim to a character budget at a word boundary (never mid-word). */
export function fitChars(text: string | undefined, max: number): string | undefined {
  if (!text) return undefined;
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sentence = cut.lastIndexOf(". ");
  if (sentence > max * 0.6) return cut.slice(0, sentence + 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 1)).replace(/[,;:—-]+$/, "")}…`;
}

type Stat = { value: string; unit?: string; label: string; caption?: string };
function statsOf(c: Rec): Stat[] {
  return arr(c.stats)
    .map((r) => ({ value: s(r.value) ?? "", unit: s(r.unit), label: s(r.label) ?? "", caption: s(r.caption) }))
    .filter((r) => r.value && r.label);
}
/** Only figures the piece prints as numbers (">50", "~80", "20%+", "10,000+"). */
function numericStats(c: Rec): Stat[] {
  return statsOf(c).filter((r) => /^[~<>≈$]*\d/.test(r.value));
}

type Block = { heading: string; body: string; bullets: string[] };
function blocksOf(item: PrintLibraryItem): Block[] {
  const c = (item.content ?? {}) as Rec;
  if (item.kind === "case-study") {
    return (["challenge", "solution", "result"] as const)
      .map((k) => c[k] as Rec | undefined)
      .filter((b): b is Rec => !!b && !!s(b.body))
      .map((b) => ({ heading: s(b.heading) ?? "", body: s(b.body) ?? "", bullets: [] }));
  }
  return arr(c.sections).map((b) => ({
    heading: s(b.heading) ?? "",
    body: s(b.body) ?? "",
    bullets: (Array.isArray(b.bullets) ? b.bullets : []).filter((x): x is string => typeof x === "string"),
  }));
}

function headlineOf(item: PrintLibraryItem): string {
  const c = (item.content ?? {}) as Rec;
  return s(c.title) ?? item.title;
}

/** The neutral adaptor payload for one piece — drives every print/social size. */
export function contentFromLibraryPiece(item: PrintLibraryItem): AdaptContent {
  const c = (item.content ?? {}) as Rec;
  const blocks = blocksOf(item);
  const stat = numericStats(c)[0];
  const hero = s((c.heroMedia as Rec | undefined)?.imageUrl) ?? item.heroUrl;
  const cta = c.cta as Rec | undefined;
  const engagement = c.engagement as Rec | undefined;
  const discover = c.discover as Rec | undefined;
  const extra = [
    ...(Array.isArray(engagement?.bullets) ? (engagement!.bullets as string[]) : []),
    ...(Array.isArray(discover?.bullets) ? (discover!.bullets as string[]) : []),
  ];
  const points = blocks.length
    ? blocks.map((b) => (b.heading ? `${b.heading} — ${fitChars(b.body, 160)}` : (fitChars(b.body, 160) ?? "")))
    : extra;
  return {
    eyebrow: s(c.eyebrow),
    headline: headlineOf(item),
    body: s(c.summary),
    points: points.filter(Boolean),
    stat: stat ? { value: `${stat.value}${stat.unit ?? ""}`, label: stat.label } : undefined,
    cta: s(cta?.label),
    footnote: s(cta?.subhead),
    media: hero ? { kind: "photo", url: hero, alt: item.title } : undefined,
    details: numericStats(c)
      .slice(1, 4)
      .map((r) => ({ label: r.label, value: `${r.value}${r.unit ?? ""}` })),
  };
}

/** Full piece copy, for speaker notes (nothing is lost when slides trim). */
function notesOf(item: PrintLibraryItem): string {
  const c = (item.content ?? {}) as Rec;
  const lines = [headlineOf(item), s(c.summary)];
  for (const b of blocksOf(item)) lines.push(`${b.heading}: ${b.body}`, ...b.bullets.map((x) => `• ${x}`));
  for (const r of statsOf(c)) lines.push(`${r.value}${r.unit ?? ""} — ${r.label}`);
  lines.push(`Source: ${item.sourceFile ?? item.title} (print library)`);
  return lines.filter(Boolean).join("\n");
}

function statSlide(stats: Stat[], title: string) {
  const n = stats.length >= 3 ? 3 : 2;
  const variant = n === 4 ? "MV-PROOF-STATS-4" : n === 3 ? "MV-PROOF-STATS-3" : "MV-PROOF-STATS-2";
  const layout = n === 4 ? "LF-10" : n === 3 ? "LF-08" : "LF-04";
  return {
    sectionId: "SF-13",
    variantId: variant,
    layoutId: layout,
    mode: "dark" as const,
    content: {
      title: fitChars(title, 60),
      items: stats.slice(0, n).map((r) => {
        const m = r.value.match(/^([~<>≈$]*[\d.,]+)(.*)$/);
        const value = m ? m[1] : r.value;
        // Units come only from the printed figure ("20%+" → "%+"); a bare
        // count keeps a thin space so nothing fills it with other copy.
        const unit = `${m ? m[2] : ""}${r.unit ?? ""}`.trim() || "\u2009";
        return { value, unit, label: fitChars(r.label, 60) };
      }),
    },
  };
}

/** A ready deck built only from the piece's own copy, figures and hero image. */
export function deckSnapshotFromPiece(item: PrintLibraryItem): DeckSnapshot {
  const c = (item.content ?? {}) as Rec;
  const title = headlineOf(item);
  const hero = s((c.heroMedia as Rec | undefined)?.imageUrl) ?? item.heroUrl;
  const notes = notesOf(item);
  const blocks = blocksOf(item);
  const stats = numericStats(c);
  const slides: DeckSnapshot["slides"] = [];

  slides.push({
    sectionId: "SF-01",
    variantId: "MV-OP-COVER-MEDIA",
    layoutId: "LF-05",
    mode: "dark",
    content: {
      clientName: fitChars(item.kind === "case-study" ? s(c.client) : s(c.eyebrow), 60) ?? "",
      title: fitChars(title, 60),
      subtitle: fitChars(s(c.summary), 60) ?? "",
      date: item.kind === "case-study" ? "Case study" : "eBrochure",
      ...(hero ? { mediaUrl: hero } : {}),
    },
    notes,
  });

  if (item.kind === "case-study") {
    // Case study spread — the Life Sciences brand-preferred case layout.
    const [ch, so, re] = blocks;
    const lead = stats[0];
    slides.push({
      sectionId: "SF-09",
      variantId: "MV-CASE-SPREAD",
      layoutId: "LF-18",
      mode: "light",
      content: {
        client: fitChars(s(c.client), 60),
        challenge: fitChars(ch?.body, 160),
        solution: fitChars(so?.body, 160),
        result: fitChars(re?.body, 160),
        metric: lead ? fitChars(`${lead.value}${lead.unit ?? ""} ${lead.label}`, 60) : "",
      },
      notes,
    });
  } else if (blocks.length >= 3) {
    slides.push({
      sectionId: "SF-04",
      variantId: "MV-CTX-CARDS-3",
      layoutId: "LF-08",
      mode: "light",
      content: {
        title: fitChars(title, 40),
        items: blocks.slice(0, 3).map((b) => ({
          title: fitChars(b.heading, 40),
          body: fitChars(b.body || b.bullets.join("; "), 140),
        })),
      },
      notes,
    });
  }

  if (stats.length >= 2) slides.push({ ...statSlide(stats, title), notes });

  const division = item.divisionId ?? "bm-enterprise";
  return {
    title,
    brandModeId: division,
    archetypeId: "arch-product-pitch",
    context: { cascadeSource: item.id },
    brief: {
      prospect: item.kind === "case-study" ? (s(c.client) ?? "") : "",
      industry: s(c.industry) ?? "Life sciences",
      audience: s(c.audience) ?? "",
      meetingObjective: s(c.summary) ?? "",
      lengthTarget: slides.length,
      clientFacts: notes,
    },
    slides,
  } as DeckSnapshot;
}

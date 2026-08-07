// Reinterpretation design layer.
//
// `mapParsedSlide` is a *fidelity* mapper: it keeps imported copy safe and
// therefore collapses most slides onto a couple of list-shaped variants
// (callout / feature-list / pillars). That reads as "an outline", not a
// designed deck.
//
// This module re-designs an already-mapped deck: it reads content signals
// (numbers, dates, phases, funnel language, statement length, image
// presence) and re-authors each slide onto the richest native variant whose
// content shape the copy actually satisfies — then enforces layout variety
// so consecutive slides never repeat the same module.
//
// Pure + deterministic: no network, no persistence. Content is only ever
// re-shaped, never invented; every string on the output slide came from the
// source slide's title, bullets, or notes.

import { MODULE_VARIANTS, byId } from "./taxonomy";
import type { SlideContent } from "./deck-store";
import type { MappedSlide } from "./pptx-mapping";
import { variantSupportsImagery, normalizeSlideMedia } from "./variant-media";

// ── signals ──────────────────────────────────────────────────────────────

export type SlideSignals = {
  index: number;
  total: number;
  title: string;
  lowTitle: string;
  bullets: string[];
  notes: string;
  images: string[];
  /** bullets that carry a leading/embedded number, parsed into stat parts */
  stats: Array<{ value: string; unit: string; label: string; raw: string }>;
  /** bullets that carry a date-ish token (Q1, 2026, Jan, Month N) */
  dated: Array<{ date: string; label: string; raw: string }>;
  /** bullets prefixed with an ordinal ("1.", "Step 2", "Phase 3") */
  stepped: boolean;
  longform: boolean;
};

const STAT_RE = /(\$?\d[\d.,]*)\s*(%|x|×|k|m|bn|b|\+|hrs?|days?|weeks?|months?)?/i;
const DATE_RE =
  /\b(q[1-4](?:\s*['’]?\d{2,4})?|fy\s?\d{2,4}|20\d{2}|19\d{2}|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|week\s?\d+|month\s?\d+|day\s?\d+)\b/i;
const STEP_RE = /^\s*(?:\d+[.)]|step\s*\d+|phase\s*\d+|stage\s*\d+)\b/i;

function splitHeadBody(b: string): { head: string; body: string } {
  const m = b.split(/\s*[—–:|]\s+|\s+[-–]\s+/);
  const head = (m[0] ?? b).trim();
  const body = m.slice(1).join(" — ").trim();
  return { head: head.slice(0, 90), body: body.slice(0, 240) };
}

function toStat(b: string) {
  const m = STAT_RE.exec(b);
  if (!m) return null;
  const value = m[1];
  const unit = (m[2] ?? "").replace("×", "x");
  // Label = the copy with the measured quantity removed, tidied.
  const label = b
    .replace(m[0], " ")
    .replace(/^[\s—–:|,.-]+|[\s—–:|,.-]+$/g, "")
    .replace(/\s{2,}/g, " ");
  return { value, unit, label: (label || b).slice(0, 90), raw: b };
}

export function readSignals(m: MappedSlide): SlideSignals {
  const s = m.source;
  const title = (s.title || "").trim();
  const bullets = (s.bullets ?? []).map((b) => b.trim()).filter(Boolean);
  const stats = bullets.map(toStat).filter(Boolean) as SlideSignals["stats"];
  const dated = bullets
    .map((b) => {
      const d = DATE_RE.exec(b);
      if (!d) return null;
      const label = b.replace(d[0], " ").replace(/^[\s—–:|,.-]+/, "").trim();
      return { date: d[0], label: (label || b).slice(0, 80), raw: b };
    })
    .filter(Boolean) as SlideSignals["dated"];
  const joined = bullets.join(" ");
  return {
    index: s.index,
    total: 0,
    title,
    lowTitle: title.toLowerCase(),
    bullets,
    notes: (s.notes ?? "").trim(),
    images: (s.images ?? []).filter(Boolean),
    stats,
    dated,
    stepped: bullets.length >= 3 && bullets.filter((b) => STEP_RE.test(b)).length >= 2,
    longform: bullets.length <= 2 && joined.length > 220,
  };
}

// ── candidate designs ────────────────────────────────────────────────────

type Design = {
  id: string;
  sectionId: string;
  variantId: string;
  /** base desirability — higher wins before the variety penalty */
  score: number;
  build: (g: SlideSignals) => SlideContent | null;
};

const kw = (g: SlideSignals, re: RegExp) => re.test(g.lowTitle) || re.test(g.bullets.join(" ").toLowerCase());

const DESIGNS: Design[] = [
  // ── numeric ───────────────────────────────────────────────────────────
  {
    id: "kpi",
    sectionId: "SF-09",
    variantId: "MV-KPI-DASHBOARD",
    score: 11,
    build: (g) =>
      g.stats.length >= 6
        ? {
            title: g.title,
            items: g.stats.slice(0, 8).map((s) => ({
              value: s.value,
              unit: s.unit,
              label: s.label,
            })),
          }
        : null,
  },
  {
    id: "triptych",
    sectionId: "SF-09",
    variantId: "MV-NUMBERS-TRIPTYCH",
    score: 10,
    build: (g) =>
      g.stats.length >= 3 && g.bullets.length <= 4
        ? {
            title: g.title,
            items: g.stats.slice(0, 3).map((s) => ({
              value: s.value,
              unit: s.unit,
              label: s.label,
              note: "",
            })),
          }
        : null,
  },
  {
    id: "stats4",
    sectionId: "SF-09",
    variantId: "MV-PROOF-STATS-4",
    score: 10,
    build: (g) =>
      g.stats.length >= 4
        ? {
            title: g.title,
            items: g.stats.slice(0, 4).map((s) => ({
              value: s.value,
              unit: s.unit,
              label: s.label,
            })),
          }
        : null,
  },
  {
    id: "statgrid",
    sectionId: "SF-02",
    variantId: "MV-CTX-STAT-GRID",
    score: 9,
    build: (g) =>
      g.stats.length >= 4
        ? {
            title: g.title,
            items: g.stats.slice(0, 4).map((s) => ({
              value: s.value,
              unit: s.unit,
              label: s.label,
            })),
          }
        : null,
  },
  {
    id: "stats3",
    sectionId: "SF-09",
    variantId: "MV-PROOF-STATS-3",
    score: 9,
    build: (g) =>
      g.stats.length >= 3
        ? {
            title: g.title,
            items: g.stats.slice(0, 3).map((s) => ({
              value: s.value,
              unit: s.unit,
              label: s.label,
            })),
          }
        : null,
  },
  {
    id: "statphoto",
    sectionId: "SF-09",
    variantId: "MV-ED-STAT-PHOTO",
    score: 10,
    build: (g) => {
      if (!g.images.length || g.stats.length !== 1) return null;
      const s = g.stats[0];
      return {
        stat: s.value,
        unit: s.unit,
        label: s.label,
        narrative: g.title,
        mediaUrl: g.images[0],
      } as unknown as SlideContent;
    },
  },
  {
    id: "donut",
    sectionId: "SF-09",
    variantId: "MV-INFO-DONUT",
    score: 9,
    build: (g) => {
      const pct = g.stats.filter((s) => s.unit === "%");
      if (pct.length < 3) return null;
      return {
        title: g.title,
        centerValue: pct[0].value,
        centerUnit: "%",
        centerLabel: pct[0].label.slice(0, 40),
        items: pct.slice(0, 5).map((s) => ({ label: s.label, value: s.value, note: "" })),
      } as unknown as SlideContent;
    },
  },
  {
    id: "funnel",
    sectionId: "SF-09",
    variantId: "MV-FUNNEL",
    score: 11,
    build: (g) => {
      const funnelish = kw(
        g,
        /funnel|pipeline|conversion|awareness|screening|enrol|enroll|recruit|leads?|stages?|drop-?off|retention/i,
      );
      if (!funnelish || g.bullets.length < 3) return null;
      return {
        title: g.title,
        items: g.bullets.slice(0, 5).map((b) => {
          const st = toStat(b);
          const { head } = splitHeadBody(b);
          return {
            label: (st?.label || head).slice(0, 40),
            value: st?.value ?? "",
            unit: st?.unit ?? "",
            note: "",
          };
        }),
      } as unknown as SlideContent;
    },
  },

  // ── time / sequence ───────────────────────────────────────────────────
  {
    id: "timeline-vertical",
    sectionId: "SF-04",
    variantId: "MV-TIMELINE-VERTICAL",
    score: 11,
    build: (g) =>
      g.dated.length >= 4
        ? {
            title: g.title,
            items: g.dated.slice(0, 6).map((d) => {
              const { head, body } = splitHeadBody(d.label);
              return { date: d.date, label: head, body };
            }),
          }
        : null,
  },
  {
    id: "timeline",
    sectionId: "SF-04",
    variantId: "MV-PROC-TIMELINE",
    score: 10,
    build: (g) =>
      (g.dated.length >= 3 || g.stepped) && g.bullets.length >= 3
        ? {
            title: g.title,
            items: g.bullets.slice(0, 5).map((b) => {
              const { head, body } = splitHeadBody(b.replace(STEP_RE, "").trim());
              return { label: head.slice(0, 30), body: body.slice(0, 90) };
            }),
          }
        : null,
  },
  {
    id: "phases",
    sectionId: "SF-04",
    variantId: "MV-PROC-PHASES",
    score: 10,
    build: (g) =>
      (g.stepped || kw(g, /phase|approach|methodolog|how it works|process|workflow|roll-?out/i)) &&
      g.bullets.length >= 3
        ? {
            title: g.title,
            items: g.bullets.slice(0, 5).map((b) => {
              const { head, body } = splitHeadBody(b.replace(STEP_RE, "").trim());
              return { label: head.slice(0, 40), body: body.slice(0, 160) };
            }),
          }
        : null,
  },
  {
    id: "horizon",
    sectionId: "SF-04",
    variantId: "MV-HORIZON",
    score: 10,
    build: (g) =>
      g.bullets.length === 3 &&
      kw(g, /now|next|later|short|medium|long[- ]term|near|future|horizon/i)
        ? {
            title: g.title,
            items: g.bullets.slice(0, 3).map((b, i) => {
              const { head, body } = splitHeadBody(b);
              return {
                label: ["Now", "Next", "Later"][i],
                headline: head,
                body: body || "",
              };
            }),
          }
        : null,
  },
  {
    id: "maturity",
    sectionId: "SF-04",
    variantId: "MV-MATURITY-CURVE",
    score: 9,
    build: (g) =>
      g.bullets.length >= 3 && kw(g, /maturity|evolv|journey to|from .* to |scal(e|ing) up|growth path/i)
        ? {
            title: g.title,
            items: g.bullets.slice(0, 5).map((b, i) => {
              const { head, body } = splitHeadBody(b);
              return { label: head.slice(0, 40), note: body.slice(0, 90), current: i === 1 };
            }),
          }
        : null,
  },
  {
    id: "journey",
    sectionId: "SF-04",
    variantId: "MV-JOURNEY-MAP",
    score: 10,
    build: (g) =>
      g.bullets.length >= 4 && kw(g, /journey|experience|touchpoint|patient|customer|candidate|onboard/i)
        ? {
            title: g.title,
            items: g.bullets.slice(0, 5).map((b, i) => {
              const { head, body } = splitHeadBody(b);
              return {
                phase: head.slice(0, 28),
                touchpoint: body.slice(0, 80),
                sentiment: [0.4, 0.55, 0.5, 0.7, 0.85][i] ?? 0.6,
              };
            }),
          }
        : null,
  },

  // ── structure / hierarchy ─────────────────────────────────────────────
  {
    id: "architecture",
    sectionId: "SF-07",
    variantId: "MV-SOL-ARCHITECTURE",
    score: 10,
    build: (g) =>
      g.bullets.length >= 3 &&
      kw(g, /architect|platform|stack|layer|infrastructur|integration|system|module/i)
        ? {
            title: g.title,
            items: g.bullets.slice(0, 5).map((b) => {
              const { head, body } = splitHeadBody(b);
              return { label: head.slice(0, 40), body: body.slice(0, 120) };
            }),
          }
        : null,
  },
  {
    id: "pyramid",
    sectionId: "SF-07",
    variantId: "MV-INFO-PYRAMID",
    score: 9,
    build: (g) =>
      g.bullets.length >= 3 && kw(g, /tier|foundation|hierarch|pyramid|maslow|build(ing)? on/i)
        ? {
            title: g.title,
            items: g.bullets.slice(0, 5).map((b) => {
              const { head, body } = splitHeadBody(b);
              return { label: head.slice(0, 60), body: body.slice(0, 120) };
            }),
          }
        : null,
  },
  {
    id: "principles",
    sectionId: "SF-06",
    variantId: "MV-PRINCIPLES",
    score: 9,
    build: (g) =>
      g.bullets.length >= 3 &&
      g.bullets.length <= 5 &&
      g.bullets.every((b) => b.length < 200)
        ? {
            title: g.title,
            items: g.bullets.slice(0, 5).map((b) => {
              const { head, body } = splitHeadBody(b);
              return { statement: head, body: body || "" };
            }),
          }
        : null,
  },
  {
    id: "bento5",
    sectionId: "SF-06",
    variantId: "MV-BENTO-5",
    score: 11,
    build: (g) => {
      if (g.bullets.length !== 5) return null;
      return {
        title: g.title,
        items: g.bullets.slice(0, 5).map((b, i) => {
          const st = toStat(b);
          const { head, body } = splitHeadBody(b);
          if (st && i > 0) {
            return { kind: "stat", value: st.value, unit: st.unit, label: st.label.slice(0, 60) };
          }
          return { kind: i === 0 ? "feature" : "text", title: head, body: body || "" };
        }),
      } as unknown as SlideContent;
    },
  },
  {
    id: "cards4",
    sectionId: "SF-02",
    variantId: "MV-CTX-CARDS-4",
    score: 8,
    build: (g) =>
      g.bullets.length === 4
        ? {
            title: g.title,
            items: g.bullets.slice(0, 4).map((b) => {
              const { head, body } = splitHeadBody(b);
              return { title: head.slice(0, 32), body: body.slice(0, 100) || head };
            }),
          }
        : null,
  },
  {
    id: "cards3",
    sectionId: "SF-02",
    variantId: "MV-CTX-CARDS-3",
    score: 8,
    build: (g) =>
      g.bullets.length === 3
        ? {
            title: g.title,
            items: g.bullets.slice(0, 3).map((b) => {
              const { head, body } = splitHeadBody(b);
              return { title: head.slice(0, 40), body: body.slice(0, 140) || head };
            }),
          }
        : null,
  },
  {
    id: "challenge-stack",
    sectionId: "SF-02",
    variantId: "MV-CTX-CHALLENGE-STACK",
    score: 9,
    build: (g) =>
      g.bullets.length >= 4
        ? {
            title: g.title,
            items: g.bullets.slice(0, 6).map((b) => {
              const { head, body } = splitHeadBody(b);
              return { title: head.slice(0, 60), body: body.slice(0, 160) };
            }),
          }
        : null,
  },
  {
    id: "checklist",
    sectionId: "SF-11",
    variantId: "MV-DEC-CHECKLIST",
    score: 9,
    build: (g) =>
      g.bullets.length >= 4 && kw(g, /criteri|checklist|requirement|must|ensur|complian|readiness/i)
        ? {
            title: g.title,
            items: g.bullets.slice(0, 8).map((b) => {
              const { head, body } = splitHeadBody(b);
              return { label: head.slice(0, 60), note: body.slice(0, 100) };
            }),
          }
        : null,
  },

  // ── editorial / statement ─────────────────────────────────────────────
  {
    id: "editorial-spread",
    sectionId: "SF-05",
    variantId: "MV-EDITORIAL-SPREAD",
    score: 10,
    build: (g) => {
      if (!g.longform) return null;
      const body = g.bullets.join(" ");
      const half = Math.max(1, Math.floor(body.length / 2));
      const cut = body.indexOf(" ", half);
      const st = g.stats[0];
      return {
        kicker: "",
        title: g.title,
        pullValue: st?.value ?? "",
        pullUnit: st?.unit ?? "",
        pullLabel: st ? st.label.slice(0, 60) : "",
        bodyLeft: body.slice(0, cut > 0 ? cut : body.length).trim(),
        bodyRight: cut > 0 ? body.slice(cut).trim() : "",
        folio: "",
      } as unknown as SlideContent;
    },
  },
  {
    id: "manifesto",
    sectionId: "SF-05",
    variantId: "MV-SPLIT-MANIFESTO",
    score: 10,
    build: (g) =>
      g.bullets.length === 3 && g.title.length > 12
        ? ({
            kicker: "",
            statement: g.title,
            signoff: "",
            items: g.bullets.slice(0, 3).map((b) => {
              const { head, body } = splitHeadBody(b);
              return { title: head.slice(0, 40), body: body.slice(0, 140) || head };
            }),
          } as unknown as SlideContent)
        : null,
  },
  {
    id: "so-what",
    sectionId: "SF-05",
    variantId: "MV-INS-SO-WHAT",
    score: 8,
    build: (g) =>
      g.bullets.length === 2 || g.bullets.length === 3
        ? ({
            insight: g.bullets[0],
            soWhat: g.bullets[1] ?? g.title,
            nowWhat: g.bullets[2] ?? "",
          } as unknown as SlideContent)
        : null,
  },
  {
    id: "definition",
    sectionId: "SF-05",
    variantId: "MV-DEFINITION",
    score: 10,
    build: (g) => {
      const first = g.bullets[0] ?? "";
      if (!/\b(is|are|means|refers to|defined as)\b/i.test(first) || g.bullets.length > 2)
        return null;
      return {
        term: g.title.slice(0, 40),
        pronunciation: "",
        partOfSpeech: "",
        definition: first.slice(0, 400),
        usage: g.bullets[1] ?? "",
      } as unknown as SlideContent;
    },
  },

  // ── title-only chapter breaks ─────────────────────────────────────────
  {
    id: "divider-xl",
    sectionId: "SF-01",
    variantId: "MV-ED-DIVIDER-XL",
    score: 9,
    build: (g) =>
      g.bullets.length === 0 && g.title
        ? ({
            numeral: String(g.index + 1).padStart(2, "0"),
            kicker: "",
            title: g.title,
            subtitle: g.notes.slice(0, 90),
          } as unknown as SlideContent)
        : null,
  },
  {
    id: "kicker-poster",
    sectionId: "SF-01",
    variantId: "MV-ED-KICKER-POSTER",
    score: 8,
    build: (g) =>
      g.bullets.length === 0 && g.title
        ? ({ kicker: "", title: g.title.slice(0, 60), meta: "" } as unknown as SlideContent)
        : null,
  },
  {
    id: "hero-orb",
    sectionId: "SF-01",
    variantId: "MV-ED-HERO-ORB",
    score: 8,
    build: (g) =>
      g.bullets.length <= 1 && g.title
        ? ({
            kicker: "",
            title: g.title.slice(0, 80),
            subtitle: (g.bullets[0] ?? g.notes).slice(0, 140),
          } as unknown as SlideContent)
        : null,
  },

  // ── imagery-forward ───────────────────────────────────────────────────
  {
    id: "img-caption",
    sectionId: "SF-06",
    variantId: "MV-IMG-CAPTION",
    score: 8,
    build: (g) =>
      g.images.length >= 1 && g.bullets.length <= 2
        ? ({
            title: g.title,
            caption: g.bullets.join(" ").slice(0, 200),
            mediaUrl: g.images[0],
          } as unknown as SlideContent)
        : null,
  },
  {
    id: "img-grid3",
    sectionId: "SF-06",
    variantId: "MV-IMG-GRID-3",
    score: 9,
    build: (g) =>
      g.images.length >= 3
        ? ({
            title: g.title,
            items: g.images.slice(0, 3).map((src, i) => ({
              mediaUrl: src,
              caption: g.bullets[i] ?? "",
            })),
            mediaUrl: g.images[0],
          } as unknown as SlideContent)
        : null,
  },
];

// ── chooser ──────────────────────────────────────────────────────────────

/** Variants we never rotate away from — they are already the right answer. */
const PINNED = new Set([
  "MV-OP-COVER",
  "MV-OP-COVER-MEDIA",
  "MV-OP-COVER-EDITORIAL",
  "MV-OP-AGENDA",
  "MV-CLOSE-THANKS",
  "MV-CLOSE-QNA",
  "MV-CLOSE-CONTACT",
  "MV-IMG-QUOTE-BG",
  "MV-INS-QUOTE",
]);

/** Structured graphics (charts/tables/SmartArt) already re-author well. */
function hasGraphics(m: MappedSlide): boolean {
  const s = m.source as unknown as {
    charts?: unknown[];
    tables?: unknown[];
    diagrams?: unknown[];
  };
  return Boolean(s.charts?.length || s.tables?.length || s.diagrams?.length);
}

function finalize(
  base: MappedSlide,
  sectionId: string,
  variantId: string,
  content: SlideContent,
  rationale: string,
): MappedSlide {
  const variant = byId(MODULE_VARIANTS, variantId) ?? MODULE_VARIANTS[0];
  const merged: Record<string, unknown> = { ...content };
  // Preserve deck-level extras the fidelity mapper attached (backdrops,
  // durable media paths, spare imagery) so nothing is lost on re-design.
  const prev = base.content as Record<string, unknown>;
  if (prev.background && !merged.background) merged.background = prev.background;
  const images = (base.source.images ?? []).filter(Boolean);
  if (images.length) {
    if (variantSupportsImagery(variant.id) && !merged.mediaUrl) merged.mediaUrl = images[0];
    if (typeof prev.mediaPath === "string" && merged.mediaUrl === images[0])
      merged.mediaPath = prev.mediaPath;
    merged.extraImages = images.slice(merged.mediaUrl ? 1 : 0);
  }
  return {
    ...base,
    sectionId,
    variantId: variant.id,
    layoutId: variant.permittedLayoutIds[0],
    content: normalizeSlideMedia(variant.id, merged) as SlideContent,
    rationale,
  };
}

/**
 * Re-design a reinterpreted deck: upgrade each slide to the richest native
 * layout its copy supports, and keep consecutive layouts visually distinct.
 */
export function designReinterpretedDeck(mapped: MappedSlide[]): MappedSlide[] {
  const recent: string[] = [];
  const usedCount = new Map<string, number>();
  const out: MappedSlide[] = [];

  mapped.forEach((m, i) => {
    const keep = () => {
      recent.push(m.variantId);
      usedCount.set(m.variantId, (usedCount.get(m.variantId) ?? 0) + 1);
      out.push(m);
    };

    // Cover, closers, quotes and captured-graphics slides stay as mapped.
    if (i === 0 || PINNED.has(m.variantId) || hasGraphics(m)) return keep();

    const g = { ...readSignals(m), total: mapped.length };
    if (!g.title && !g.bullets.length && !g.images.length) return keep();

    let best: { d: Design; content: SlideContent; score: number } | null = null;
    for (const d of DESIGNS) {
      const content = d.build(g);
      if (!content) continue;
      const last = recent[recent.length - 1];
      const window4 = recent.slice(-4);
      let score = d.score;
      if (d.variantId === last) score -= 12;
      else if (window4.includes(d.variantId)) score -= 6;
      // Family-level pressure too: two "stat wall" or two "list stack"
      // slides in a row read as a repeat even with different variant ids.
      const fam = FAMILY_OF[d.variantId];
      if (fam && fam === FAMILY_OF[last ?? ""]) score -= 3;
      score -= Math.min(4, usedCount.get(d.variantId) ?? 0);
      if (!best || score > best.score) best = { d, content, score };
    }

    if (!best) return keep();
    // Only override when the designed layout beats the fidelity mapping's own
    // repeat pressure — i.e. it's either richer or breaks a repeat streak.
    const mappedRepeat = recent.slice(-2).includes(m.variantId);
    if (!mappedRepeat && best.score < 7) return keep();


    const designed = finalize(
      m,
      best.d.sectionId,
      best.d.variantId,
      best.content,
      `Re-designed — ${best.d.id} (${best.d.variantId})`,
    );
    recent.push(designed.variantId);
    usedCount.set(designed.variantId, (usedCount.get(designed.variantId) ?? 0) + 1);
    out.push(designed);
  });

  return out;
}

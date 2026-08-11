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
  return signalsFrom(
    {
      index: s.index,
      title: (s.title || "").trim(),
      notes: (s.notes ?? "").trim(),
      images: (s.images ?? []).filter(Boolean),
    },
    (s.bullets ?? []).map((b) => (b ?? "").trim()).filter(Boolean),
  );
}

/**
 * Derive the numeric / date / step signals from an arbitrary bullet list. Split
 * out of `readSignals` so the forced-layout adapter can re-derive them after
 * reshaping the copy (see `adaptSignals`).
 */
function signalsFrom(
  base: { index: number; title: string; notes: string; images: string[] },
  bulletsIn: string[],
): SlideSignals {
  const s = { index: base.index, notes: base.notes, images: base.images };
  const title = base.title;
  const bullets = bulletsIn.map((b) => b.trim()).filter(Boolean);
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
      (kw(g, /architect|platform|stack|layer|infrastructur|integration|system|module/i) ||
        g.bullets.length >= 5)
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
      g.bullets.length >= 3 &&
      (kw(g, /tier|foundation|hierarch|pyramid|maslow|build(ing)? on/i) || g.bullets.length >= 4)
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
      if (g.bullets.length < 5 || g.bullets.length > 8) return null;
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
      g.bullets.length === 4 || g.bullets.length === 7 || g.bullets.length === 8
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
      g.bullets.length >= 4 &&
      (kw(g, /criteri|checklist|requirement|must|ensur|complian|readiness/i) ||
        g.bullets.length >= 6)
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

// ── style alternates ─────────────────────────────────────────────────────
//
// Every base design above owns a content *shape* (stat items, dated items,
// label/body items, media items). Several native variants consume the same
// shape but look completely different — e.g. a funnel shape renders as a
// classic funnel, an inverted pyramid, an iceberg, a flywheel or a Sankey.
// Registering them as alternates gives reviewers multiple looks per content
// type in the picker, without ever inventing content: the alternate reuses
// the base design's deterministic builder verbatim.

/** Human-facing content family for grouping in the picker. */
const DESIGN_GROUP: Record<string, string> = {
  kpi: "Numbers · KPI wall",
  triptych: "Numbers · three-up",
  stats4: "Numbers · four-up",
  statgrid: "Numbers · grid",
  stats3: "Numbers · proof",
  statphoto: "Numbers · with photography",
  donut: "Numbers · share / percentage",
  funnel: "Flow · funnel & conversion",
  "timeline-vertical": "Time · dated timeline",
  timeline: "Time · steps",
  phases: "Time · phases",
  horizon: "Time · now / next / later",
  maturity: "Time · maturity",
  journey: "Flow · journey",
  architecture: "Structure · architecture",
  pyramid: "Structure · hierarchy",
  principles: "Lists · principles",
  bento5: "Cards · bento",
  cards4: "Cards · four-up",
  cards3: "Cards · three-up",
  "challenge-stack": "Lists · challenges",
  checklist: "Lists · checklist",
  "editorial-spread": "Editorial · spread",
  manifesto: "Editorial · statement",
  "so-what": "Editorial · insight",
  definition: "Editorial · definition",
  "divider-xl": "Section · divider",
  "kicker-poster": "Section · poster",
  "hero-orb": "Section · hero",
  "img-caption": "Imagery · single",
  "img-grid3": "Imagery · grid",
};

/** base design id → alternate variant ids that consume the same content shape */
const STYLE_ALTERNATES: Record<string, string[]> = {
  kpi: [
    "MV-DASH-REPORT-CARDS",
    "MV-DASH-SUMMARY",
    "MV-GRAPH-RINGS",
    "MV-DASH-GAUGE-ROW",
    "MV-STAT-KPI-RAIL",
    "MV-STAT-EDITORIAL-DASH",
    "MV-STAT-ACTUAL-TARGET",
  ],
  triptych: ["MV-PROOF-STATS-3", "MV-DASH-DONUT-TRIO"],
  stats4: [
    "MV-DASH-REGION-STATS",
    "MV-GRAPH-CATEGORY-BARS",
    "MV-STAT-TYPE-WALL",
    "MV-STAT-MOSAIC",
    "MV-STAT-ORBIT",
    "MV-STAT-HERO-NUMBER",
    "MV-STAT-IMAGE-TYPE",
  ],
  statgrid: ["MV-DASH-BREAKDOWN", "MV-GRAPH-PERCENT-COMPARE"],
  stats3: ["MV-NUMBERS-TRIPTYCH", "MV-DASH-DONUT-TRIO"],
  statphoto: ["MV-IMG-STAT-CALLOUT"],
  donut: ["MV-GRAPH-DUAL-DONUT", "MV-DASH-DONUT-TRIO", "MV-GRAPH-RINGS"],
  funnel: ["MV-INFO-FUNNEL", "MV-INFO-PYRAMID", "MV-ICEBERG", "MV-FLYWHEEL", "MV-VIZ-SANKEY"],
  "timeline-vertical": ["MV-ROADMAP-QUARTERS", "MV-CLOSE-TIMELINE", "MV-PROC-TIMELINE"],
  timeline: ["MV-ROADMAP-QUARTERS", "MV-INFO-CIRCULAR-FLOW", "MV-TIMELINE-VERTICAL"],
  phases: ["MV-INFO-CIRCULAR-FLOW", "MV-JOURNEY-MAP", "MV-PROC-TIMELINE"],
  horizon: ["MV-PROC-PHASES"],
  maturity: ["MV-HORIZON", "MV-JOURNEY-MAP"],
  journey: ["MV-PROC-TIMELINE", "MV-MATURITY-CURVE"],
  architecture: ["MV-SOL-PILLARS-3", "MV-INFO-CIRCULAR-FLOW"],
  pyramid: ["MV-ICEBERG", "MV-INFO-FUNNEL"],
  principles: ["MV-SOL-PILLARS-3", "MV-SOL-PILLARS-4", "MV-DEC-CHECKLIST"],
  bento5: ["MV-SOL-PILLARS-5", "MV-CTX-CARDS-4"],
  cards4: ["MV-SOL-PILLARS-4", "MV-DASH-REPORT-CARDS"],
  cards3: ["MV-SOL-PILLARS-3", "MV-CTX-CARDS-2"],
  "challenge-stack": ["MV-CTX-COST", "MV-RISK-MITIGATION"],
  checklist: ["MV-CLOSE-CHECKLIST", "MV-REC-NEXT"],
  "editorial-spread": ["MV-SPLIT-MANIFESTO", "MV-ED-HERO-BLEED"],
  manifesto: ["MV-ED-QUOTE-BLEED", "MV-INS-BIG-IDEA"],
  "so-what": ["MV-INS-CALLOUT", "MV-INS-BIG-IDEA"],
  definition: ["MV-INS-CALLOUT"],
  "divider-xl": ["MV-OP-DIVIDER", "MV-OP-DIVIDER-NUMBERED"],
  "kicker-poster": ["MV-OP-COVER-POSTER"],
  "hero-orb": ["MV-ED-HERO-BLEED", "MV-OP-COVER-GRADIENT"],
  "img-caption": ["MV-IMG-SPLIT", "MV-IMG-FULL-BLEED", "MV-IMG-PORTRAIT"],
  "img-grid3": ["MV-IMG-STRIP", "MV-IMG-MATRIX-4"],
};

const BASE_DESIGN_IDS = new Set(DESIGNS.map((d) => d.id));
/** design id (base or alternate) → content family label */
const GROUP_BY_DESIGN_ID: Record<string, string> = { ...DESIGN_GROUP };

for (const [baseId, alts] of Object.entries(STYLE_ALTERNATES)) {
  const base = DESIGNS.find((d) => d.id === baseId);
  if (!base) continue;
  alts.forEach((variantId, i) => {
    if (variantId === base.variantId) return;
    if (!byId(MODULE_VARIANTS, variantId)) return;
    const id = `${baseId}-${variantId.replace(/^MV-/, "").toLowerCase()}`;
    GROUP_BY_DESIGN_ID[id] = DESIGN_GROUP[baseId] ?? "Other layouts";
    DESIGNS.push({
      id,
      sectionId: base.sectionId,
      variantId,
      // Slightly below the base so the automatic pass keeps today's default
      // pick, while alternates remain available to break repeat streaks and
      // to be chosen explicitly by a reviewer or the AI planner.
      score: base.score - 0.5 - i * 0.01,
      build: base.build,
    });
  });
}



// ── chooser ──────────────────────────────────────────────────────────────

/** Variants we never rotate away from — they are already the right answer. */
/**
 * Coarse visual families — two slides from the same family back-to-back look
 * repetitive even when the variant ids differ, so the chooser penalises them.
 */
const FAMILY_OF: Record<string, string> = {
  "MV-KPI-DASHBOARD": "stat-wall",
  "MV-NUMBERS-TRIPTYCH": "stat-wall",
  "MV-PROOF-STATS-3": "stat-wall",
  "MV-PROOF-STATS-4": "stat-wall",
  "MV-CTX-STAT-GRID": "stat-wall",
  "MV-INFO-DONUT": "chart",
  "MV-FUNNEL": "chart",
  "MV-CTX-CHALLENGE-STACK": "list-stack",
  "MV-SOL-FEATURE-LIST": "list-stack",
  "MV-DEC-CHECKLIST": "list-stack",
  "MV-PRINCIPLES": "list-stack",
  "MV-PROC-PHASES": "sequence",
  "MV-PROC-TIMELINE": "sequence",
  "MV-TIMELINE-VERTICAL": "sequence",
  "MV-JOURNEY-MAP": "sequence",
  "MV-MATURITY-CURVE": "sequence",
  "MV-HORIZON": "sequence",
  "MV-SOL-ARCHITECTURE": "stack",
  "MV-INFO-PYRAMID": "stack",
  "MV-CTX-CARDS-3": "card-grid",
  "MV-CTX-CARDS-4": "card-grid",
  "MV-BENTO-5": "card-grid",
  "MV-ED-DIVIDER-XL": "poster",
  "MV-ED-KICKER-POSTER": "poster",
  "MV-ED-HERO-ORB": "poster",
  "MV-INS-BIG-IDEA": "poster",
  "MV-EDITORIAL-SPREAD": "editorial",
  "MV-SPLIT-MANIFESTO": "editorial",
  "MV-DEFINITION": "editorial",
  "MV-INS-SO-WHAT": "editorial",
};

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

// ── content coverage ─────────────────────────────────────────────────────
//
// Native layouts have fixed cell counts (a flywheel holds 5 nodes, a triptych
// 3 stats), so a 14-bullet source slide cannot show every line on the slide.
// Rather than dropping the remainder silently, we measure coverage and move
// whatever did not land on the canvas into the slide's speaker notes, then
// report it to the reviewer.

/** Every string reachable in a built content object, flattened. */
export function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    if (value.trim()) out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) collectStrings(v, out);
  }
  return out;
}

export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** True when `bullet` is represented (whole or clipped) somewhere on the slide. */
export function isCovered(bullet: string, haystack: string): boolean {
  const n = norm(bullet);
  if (!n) return true;
  if (haystack.includes(n)) return true;
  // Builders split "head — body" and clip to cell widths, so match on a
  // meaningful prefix and on the longest words as a fallback.
  const prefix = n.slice(0, Math.min(28, Math.max(12, Math.floor(n.length * 0.5))));
  if (prefix.length >= 10 && haystack.includes(prefix)) return true;
  const words = n.split(" ").filter((w) => w.length >= 5);
  if (words.length >= 2) {
    const hits = words.filter((w) => haystack.includes(w)).length;
    if (hits / words.length >= 0.7) return true;
  }
  return false;
}

export type SlideCoverage = {
  /** Source bullets represented on the designed slide. */
  used: number;
  /** Total non-empty source bullets. */
  total: number;
  /** Source lines the layout could not hold — moved to speaker notes. */
  dropped: string[];
};

export const OVERFLOW_HEADER = "Not shown on slide (from imported source):";

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

  const sourceBullets = (base.source.bullets ?? []).map((b) => (b ?? "").trim()).filter(Boolean);
  const haystack = norm(collectStrings(merged).join(" ⋄ "));
  const dropped = sourceBullets.filter((b) => !isCovered(b, haystack));
  const coverage: SlideCoverage = {
    used: sourceBullets.length - dropped.length,
    total: sourceBullets.length,
    dropped,
  };

  // Park the overflow in speaker notes so no imported fact is ever lost.
  const priorNotes = (base.source.notes ?? "")
    .split(OVERFLOW_HEADER)[0]
    .trimEnd();
  const notes = dropped.length
    ? [priorNotes, `${OVERFLOW_HEADER}\n${dropped.map((d) => `• ${d}`).join("\n")}`]
        .filter(Boolean)
        .join("\n\n")
    : priorNotes || (base.source.notes ?? "");

  return {
    ...base,
    sectionId,
    variantId: variant.id,
    layoutId: variant.permittedLayoutIds[0],
    content: normalizeSlideMedia(variant.id, merged) as SlideContent,
    rationale,
    source: { ...base.source, notes },
    coverage,
  };
}


/**
 * Re-design a reinterpreted deck: upgrade each slide to the richest native
 * layout its copy supports, and keep consecutive layouts visually distinct.
 */
export type DesignCatalogEntry = {
  /** Stable design id used in AI plans. */
  id: string;
  variantId: string;
  name: string;
  description: string;
  /** Content family label, for grouping the picker (e.g. "Flow · funnel"). */
  group: string;
  /** True for the default look of that family. */
  isPrimary: boolean;
};

/**
 * The design vocabulary offered to the AI planner and the review picker. Every
 * entry is backed by a deterministic `build()` above, so a plan can only ever
 * choose a layout the system knows how to populate from real source copy.
 * Deduped by variant id so the picker never shows the same look twice.
 */
export const DESIGN_CATALOG: DesignCatalogEntry[] = (() => {
  const seen = new Set<string>();
  const out: DesignCatalogEntry[] = [];
  for (const d of DESIGNS) {
    if (seen.has(d.variantId)) continue;
    seen.add(d.variantId);
    const v = byId(MODULE_VARIANTS, d.variantId);
    const isPrimary = BASE_DESIGN_IDS.has(d.id);
    out.push({
      id: d.id,
      variantId: d.variantId,
      name: v?.name ?? d.variantId,
      description: v?.description ?? "",
      group: GROUP_BY_DESIGN_ID[d.id] ?? "Other layouts",
      isPrimary,
    });

  }
  return out;
})();


export type DesignOptions = {
  /**
   * Slide index → variantId the AI planner recommended. A preference only wins
   * when the variant's deterministic builder accepts the slide's copy, so an
   * unusable recommendation degrades to the heuristic choice instead of
   * producing an empty layout.
   */
  preferred?: Record<number, string>;
  /**
   * Deck-wide visual language: variant ids this style favours. Favoured designs
   * get a boost and everything else a light penalty, so the style steers the
   * deck without forcing a layout whose builder rejects the slide's copy.
   */
  styleVariantIds?: string[];
  /**
   * Slide index → variant ids favoured for that one slide, overriding
   * `styleVariantIds` (a reviewer steering a single page).
   */
  styleVariantIdsByIndex?: Record<number, string[]>;
};

export function designReinterpretedDeck(
  mapped: MappedSlide[],
  opts: DesignOptions = {},
): MappedSlide[] {
  const deckStyle = opts.styleVariantIds ? new Set(opts.styleVariantIds) : null;

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
    const preferredVariant = opts.preferred?.[m.source.index];
    // An AI recommendation overrides the "leave it alone" guards for pinned /
    // graphics slides only when it is an explicit, different choice.
    const aiOverride = Boolean(preferredVariant && preferredVariant !== m.variantId);
    if (!aiOverride && (i === 0 || PINNED.has(m.variantId) || hasGraphics(m))) return keep();
    if (aiOverride && i === 0) return keep();

    const g = { ...readSignals(m), total: mapped.length };
    if (!g.title && !g.bullets.length && !g.images.length) return keep();

    // A per-slide style override replaces the deck-wide bias for this slide.
    const perSlide = opts.styleVariantIdsByIndex?.[m.source.index];
    const style = perSlide ? new Set(perSlide) : deckStyle;

    let best: { d: Design; content: SlideContent; score: number } | null = null;
    // An explicit preference (AI plan or a reviewer's picker choice) wins
    // outright whenever its builder accepts this slide's copy — variety
    // pressure must never silently outvote a chosen layout, otherwise the
    // review preview would not change when the dropdown changes.
    let forced: { d: Design; content: SlideContent } | null = null;
    for (const d of DESIGNS) {
      const content = d.build(g);
      if (!content) continue;
      if (preferredVariant && d.variantId === preferredVariant) {
        if (!forced) forced = { d, content };
        continue;
      }
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
      if (style && style.size > 0) score += style.has(d.variantId) ? 7 : -3;
      // Capacity pressure: among otherwise comparable looks, prefer the one
      // that actually holds more of the source copy on the canvas.
      const cells = Array.isArray((content as { items?: unknown[] }).items)
        ? ((content as { items?: unknown[] }).items as unknown[]).length
        : 0;
      if (g.bullets.length > 0 && cells > 0)
        score += Math.min(2, (cells / g.bullets.length) * 2);


      if (!best || score > best.score) best = { d, content, score };
    }

    if (forced) best = { ...forced, score: 1000 };
    if (!best) return keep();
    // Only override when the designed layout beats the fidelity mapping's own
    // repeat pressure — i.e. it's either richer or breaks a repeat streak.
    const mappedRepeat = recent.slice(-2).includes(m.variantId);
    const aiPicked = Boolean(forced);
    if (!aiPicked && !mappedRepeat && best.score < 7) return keep();



    const designed = finalize(
      m,
      best.d.sectionId,
      best.d.variantId,
      best.content,
      aiPicked
        ? `AI-designed — ${best.d.id} (${best.d.variantId})`
        : `Re-designed — ${best.d.id} (${best.d.variantId})`,
    );
    recent.push(designed.variantId);
    usedCount.set(designed.variantId, (usedCount.get(designed.variantId) ?? 0) + 1);
    out.push(designed);
  });

  return out;
}

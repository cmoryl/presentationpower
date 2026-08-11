// Division-aware preview content for /library.
//
// The library grid renders 50+ cards synchronously and cannot afford
// async knowledge/RAG lookups per card. This helper reuses the in-memory
// BRAND_PROFILES + CASE_STUDIES to swap the *text* of each preview slide
// based on the currently-selected brand mode. Layouts, colors, and logos
// are unaffected — those already flow through the `brand` prop.
//
// Two entry points:
//   - resolveDivisionBrief(brand) → a Brief whose brandModeId + industry +
//     prospect align with the picked brand. Passing this to seedContent()
//     already makes MV-CASE-*, MV-PROOF-TESTIMONIAL, MV-PROOF-LOGOS, and
//     MV-CASE-LOGO-GRID brand-aware "for free".
//   - seedDivisionContent(variantId, brief, section, brand) → wraps
//     seedContent() and overlays division-specific fields on additional
//     variant families that don't consult the brand today (stats, quotes,
//     covers, agendas, context cards, service pillars, client matrices,
//     etc.).

import type { Brief, SlideContent } from "@/lib/deck-store";
import { seedContent } from "@/lib/deck-store";
import { BRAND_PROFILES } from "@/lib/brand-profiles";
import { pickCaseStudy, pickProofLogos, CASE_STUDIES } from "@/lib/case-studies";
import { BRAND_MODES, type BrandMode } from "@/lib/taxonomy";

export function resolveDivisionBrief(brand: BrandMode): Brief {
  const profile = BRAND_PROFILES[brand.id];
  const industry = profile?.contentScope?.industries?.[0] ?? "Life sciences";
  const archetypeId = profile?.contentScope?.preferredArchetypes?.[0] ?? "arch-problem-solution";
  const cs = pickCaseStudy(brand.id, industry);
  return {
    id: "preview",
    createdAt: "2026-01-01T00:00:00.000Z",
    prospect: cs.client,
    industry,
    meetingObjective: `Strategic partnership review — ${brand.name}`,
    audience: "Executive team",
    brandModeId: brand.id,
    archetypeId,
    lengthTarget: 12,
    clientFacts: "",
  };
}

type Obj = Record<string, unknown>;

function len(x: unknown): number {
  return Array.isArray(x) ? x.length : 0;
}

/**
 * Overlay division-specific text on top of the generic seedContent() output.
 * Only touches variant families where the base seed is generic. Case, proof-
 * testimonial, proof-logos, and case-logo-grid already consult brief.brandModeId
 * inside seedContent(), so we leave those alone.
 */
function overlayDivisionContent(
  variantId: string,
  brief: Brief,
  sectionName: string,
  brand: BrandMode,
): SlideContent {
  const base = seedContent(variantId, brief, sectionName) as Obj;

  const profile = BRAND_PROFILES[brand.id];
  const scope = profile?.contentScope;
  const industries = scope?.industries ?? [];
  const services = scope?.serviceLines ?? [];
  const cs = pickCaseStudy(brand.id, brief.industry);
  const client = cs.client;
  const divisionName = brand.name;

  // ── Stats ────────────────────────────────────────────────────────────────
  if (/^MV-PROOF-STATS-/.test(variantId)) {
    const n = Math.max(2, len(base.items) || 3);
    const stats = cs.stats.slice(0, n).map((s) => ({
      value: s.value,
      unit: s.unit,
      label: s.label,
      source: s.source ?? "Program data, 2025",
    }));
    // Pad if the case study has fewer stats than the layout wants.
    while (stats.length < n) {
      stats.push({ value: "100", unit: "%", label: "goal alignment", source: "2025" });
    }
    return { ...base, title: "Proof from the field", items: stats } as SlideContent;
  }

  // ── Quotes ───────────────────────────────────────────────────────────────
  if (variantId === "MV-QUOTE-METRIC") {
    return {
      ...base,
      quote: cs.quote,
      attribution: cs.attribution,
      role: cs.role,
      metric: cs.metric,
    } as SlideContent;
  }
  if (variantId === "MV-QUOTE-MULTI") {
    // Round-robin two quotes across the brand-matched pool.
    const primary = cs;
    const others = CASE_STUDIES.filter((c) => c.id !== primary.id);
    const second = others[0] ?? primary;
    return {
      ...base,
      items: [
        { quote: primary.quote, attribution: primary.attribution, role: primary.role },
        { quote: second.quote, attribution: second.attribution, role: second.role },
      ],
    } as SlideContent;
  }
  if (/^MV-QUOTE-/.test(variantId)) {
    return {
      ...base,
      quote: cs.quote,
      attribution: cs.attribution,
      role: cs.role,
    } as SlideContent;
  }

  // ── Context cards ───────────────────────────────────────────────────────
  if (/^MV-CTX-CARDS-/.test(variantId) && industries.length) {
    const baseItems = (base.items as Obj[] | undefined) ?? [];
    const n = baseItems.length || 3;
    const cards = Array.from({ length: n }, (_, i) => {
      const ind = industries[i] ?? industries[i % industries.length];
      const prev = baseItems[i] ?? {};
      return {
        title: ind,
        body:
          (prev.body as string) ??
          `A priority context in ${ind} where ${divisionName} adds measurable leverage.`,
      };
    });
    return {
      ...base,
      title: `Where ${client} operates today`,
      items: cards,
    } as SlideContent;
  }

  // ── Solution pillars ────────────────────────────────────────────────────
  if (/^MV-SOL-PILLARS-/.test(variantId) && services.length) {
    const baseItems = (base.items as Obj[] | undefined) ?? [];
    const n = baseItems.length || services.length;
    const pillars = Array.from({ length: Math.min(n, services.length) }, (_, i) => ({
      title: services[i],
      body: (baseItems[i]?.body as string) ?? `${services[i]} delivered as a managed capability.`,
    }));
    if (pillars.length) {
      return { ...base, items: pillars } as SlideContent;
    }
  }

  // ── Covers ──────────────────────────────────────────────────────────────
  if (/^MV-OP-COVER/.test(variantId) || /^MV-COVER-/.test(variantId)) {
    return {
      ...base,
      title: (base.title as string) || client,
      subtitle: `Strategic partnership review · ${divisionName}`,
      clientName: client,
    } as SlideContent;
  }

  // ── Agenda ──────────────────────────────────────────────────────────────
  if (/^MV-OP-AGENDA/.test(variantId) && services.length) {
    const baseItems = (base.items as Obj[] | undefined) ?? [];
    const n = baseItems.length || 5;
    const derived = Array.from({ length: Math.min(n, services.length) }, (_, i) => {
      const prev = baseItems[i] ?? {};
      const label = services[i];
      const body = prev.body as string | undefined;
      return body ? { label, body } : { label };
    });
    if (derived.length) return { ...base, items: derived } as SlideContent;
  }

  // ── Dividers ────────────────────────────────────────────────────────────
  if (variantId === "MV-OP-DIVIDER" || variantId === "MV-OP-DIVIDER-NUMBERED") {
    return {
      ...base,
      kicker: divisionName,
    } as SlideContent;
  }

  // ── Client matrix / logo grids (proof-logos style) ──────────────────────
  if (
    variantId === "MV-CLIENT-MATRIX" ||
    variantId === "MV-CLIENT-DETAIL-3" ||
    variantId === "MV-CLIENT-COMPARE"
  ) {
    const logos = pickProofLogos(brand.id);
    const baseItems = (base.items as Obj[] | undefined) ?? [];
    if (baseItems.length && logos.length) {
      const merged = baseItems.map((it, i) => ({
        ...it,
        client: logos[i % logos.length]?.name ?? (it.client as string) ?? "Client",
      }));
      return { ...base, items: merged } as SlideContent;
    }
  }

  // ── Insight / big idea → tie to the case-study headline ─────────────────
  if (variantId === "MV-INS-BIG-IDEA") {
    return {
      ...base,
      kicker: `The ${divisionName} idea`,
      idea: cs.headline,
    } as SlideContent;
  }
  if (variantId === "MV-INS-CALLOUT") {
    return {
      ...base,
      insight: cs.headline,
      narrative: `${client} partnered with ${divisionName} to ${cs.solution.toLowerCase().replace(/\.$/, "")}.`,
    } as SlideContent;
  }
  if (variantId === "MV-INS-SO-WHAT") {
    return {
      ...base,
      insight: cs.challenge,
      soWhat: cs.result,
      nowWhat: `${divisionName} scales this playbook across ${industries.slice(0, 2).join(" and ") || brief.industry}.`,
    } as SlideContent;
  }

  // ── Solution architecture / feature list — anchor on service lines ──────
  if (variantId === "MV-SOL-ARCHITECTURE" && services.length) {
    const baseItems = (base.items as Obj[] | undefined) ?? [];
    const items = services.slice(0, Math.max(4, baseItems.length || 4)).map((s, i) => ({
      label: s,
      body:
        (baseItems[i]?.body as string) ??
        `${s} delivered as part of the ${divisionName} operating model.`,
    }));
    return { ...base, title: `How ${divisionName} is built`, items } as SlideContent;
  }
  if (variantId === "MV-SOL-FEATURE-LIST" && services.length) {
    const baseItems = (base.items as Obj[] | undefined) ?? [];
    const items = services.slice(0, Math.max(5, baseItems.length || 6)).map((s, i) => ({
      label: s,
      body: (baseItems[i]?.body as string) ?? `Included in every ${divisionName} engagement.`,
    }));
    return { ...base, title: `What ${divisionName} includes`, items } as SlideContent;
  }

  // ── Process (timeline / phases / before-after) ──────────────────────────
  if (variantId === "MV-PROC-PHASES") {
    return {
      ...base,
      title: `How ${divisionName} rolls out for ${client}`,
    } as SlideContent;
  }
  if (variantId === "MV-PROC-STEP-CHAIN") {
    return {
      ...base,
      title: `${divisionName} · ${client} end-to-end program`,
    } as SlideContent;
  }
  if (variantId === "MV-PROC-TIMELINE") {
    return {
      ...base,
      title: `${divisionName} · ${client} rollout`,
    } as SlideContent;
  }
  if (variantId === "MV-PROC-BEFORE-AFTER-SPLIT") {
    return {
      ...base,
      title: `${client}: before and after ${divisionName}`,
      after: {
        ...(base as Record<string, unknown>).after as Record<string, unknown>,
        label: `With ${divisionName}`,
      },
      hub: {
        ...(base as Record<string, unknown>).hub as Record<string, unknown>,
        title: divisionName,
      },
    } as SlideContent;
  }
  if (variantId === "MV-PROC-BEFORE-AFTER") {

    return {
      ...base,
      title: `What changes for ${client}`,
      after: {
        title: `${divisionName} operating model`,
        body: cs.solution,
      },
    } as SlideContent;
  }

  // ── Context slides (challenge stack / cost / trend / stat grid) ─────────
  if (variantId === "MV-CTX-CHALLENGE-STACK") {
    return {
      ...base,
      title: `What we heard from ${client}`,
    } as SlideContent;
  }
  if (variantId === "MV-CTX-COST") {
    return {
      ...base,
      narrative: `In ${brief.industry || industries[0] || "your sector"}, every quarter of delay compounds — ${divisionName} closes that gap.`,
    } as SlideContent;
  }
  if (variantId === "MV-CTX-TREND") {
    return {
      ...base,
      headline: `${brief.industry || industries[0] || "The market"} is outpacing programs built before ${divisionName} existed at scale.`,
    } as SlideContent;
  }
  if (variantId === "MV-CTX-STAT-GRID") {
    return {
      ...base,
      title: `Market context for ${brief.industry || industries[0] || divisionName}`,
    } as SlideContent;
  }

  // ── Decision / compare tables ───────────────────────────────────────────
  if (variantId === "MV-DEC-COMPARE-TABLE") {
    const cols = (base.columns as Obj[] | undefined) ?? [];
    const nextCols = cols.map((c, i) =>
      i === cols.length - 1 ? { ...c, label: divisionName } : c,
    );
    return {
      ...base,
      title: `Where ${divisionName} wins`,
      columns: nextCols,
    } as SlideContent;
  }
  if (variantId === "MV-DEC-CHECKLIST") {
    return {
      ...base,
      title: `What a good ${divisionName} decision looks like`,
    } as SlideContent;
  }
  if (variantId === "MV-DEC-MATRIX") {
    return {
      ...base,
      title: `Where each option lands for ${client}`,
      q1: `${divisionName} managed program`,
    } as SlideContent;
  }

  // ── Commercial (pricing / investment) ───────────────────────────────────
  if (variantId === "MV-COMM-INVESTMENT") {
    const items = (base.items as Obj[] | undefined) ?? [];
    const nextItems = items.map((it, i) =>
      i === 0
        ? { ...it, label: `Managed ${divisionName} program with dedicated delivery lead` }
        : it,
    );
    return { ...base, title: `${divisionName} investment`, items: nextItems } as SlideContent;
  }
  if (variantId === "MV-COMM-PRICING") {
    return { ...base, title: `${divisionName} program options` } as SlideContent;
  }

  // ── Risk & mitigation ───────────────────────────────────────────────────
  if (variantId === "MV-RISK-MITIGATION") {
    return {
      ...base,
      title: `${divisionName} · risk & mitigation for ${client}`,
    } as SlideContent;
  }

  // ── Team / governance ───────────────────────────────────────────────────
  if (/^MV-TEAM-BIOS-/.test(variantId)) {
    return {
      ...base,
      title: `Your ${divisionName} core team`,
    } as SlideContent;
  }
  if (variantId === "MV-GOV-RACI") {
    return {
      ...base,
      title: `How ${divisionName} runs the program`,
    } as SlideContent;
  }

  // ── Recommendation / close ──────────────────────────────────────────────
  if (variantId === "MV-REC-NEXT") {
    return {
      ...base,
      recommendation: `We recommend ${client} start with a focused ${divisionName} pilot in ${industries[0] || brief.industry || "the highest-priority market"}.`,
    } as SlideContent;
  }
  if (variantId === "MV-CLOSE-CTA") {
    return {
      ...base,
      owner: `${divisionName} account team`,
    } as SlideContent;
  }
  if (variantId === "MV-CLOSE-THANKS") {
    return {
      ...base,
      signoff: `${divisionName} — Global content, local precision`,
    } as SlideContent;
  }
  if (variantId === "MV-CLOSE-QNA") {
    return {
      ...base,
      prompt: `Open discussion — what would you pressure-test with ${divisionName} first?`,
    } as SlideContent;
  }

  return base as SlideContent;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic division pass
// ─────────────────────────────────────────────────────────────────────────────
//
// The per-variant overlays above cover the classic families. Every other
// module (graphs, stat typography, editorial, imagery, dashboards, close
// variants…) still ships hard-coded "TransPerfect" copy from seedContent().
// This pass runs last and makes ANY module react to a division switch:
//   1. deep string rewrite of master-brand mentions → the picked division
//   2. quote/attribution overlays wherever those fields exist
//   3. sources/footnotes rebadged with the division + its lead industry
// Numbers, layout keys, and item counts are never changed, so layouts that
// were tuned for a specific shape stay intact.

interface DivisionCtx {
  divisionName: string;
  client: string;
  industry: string;
  quote: string;
  attribution: string;
  role: string;
}

const QUOTE_KEYS = new Set(["quote", "testimonial"]);
const SOURCE_KEYS = new Set(["source", "footnote", "sourceNote", "prepared", "presenter", "owner"]);

function rewriteString(s: string, ctx: DivisionCtx): string {
  if (!s) return s;
  let out = s;
  if (ctx.divisionName !== "TransPerfect") {
    out = out.replace(/TransPerfect/g, ctx.divisionName);
  }
  out = out.replace(/Enterprise client/g, `${ctx.divisionName} client`);
  return out;
}

function divisionizeValue(value: unknown, key: string, ctx: DivisionCtx): unknown {
  if (typeof value === "string") {
    if (QUOTE_KEYS.has(key) && ctx.quote) return ctx.quote;
    if (key === "attribution" && ctx.attribution) return ctx.attribution;
    if (key === "role" && ctx.role) return ctx.role;
    if (SOURCE_KEYS.has(key)) {
      const rebadged = rewriteString(value, ctx);
      // Keep benchmark-style sources anchored on the active division.
      return /benchmark|data|survey|study/i.test(rebadged)
        ? rebadged.replace(/^[^,]+/, `${ctx.divisionName} ${ctx.industry.toLowerCase()} benchmark`)
        : rebadged;
    }
    return rewriteString(value, ctx);
  }
  if (Array.isArray(value)) return value.map((v) => divisionizeValue(v, key, ctx));
  if (value && typeof value === "object") {
    const src = value as Obj;
    const next: Obj = {};
    for (const k of Object.keys(src)) next[k] = divisionizeValue(src[k], k, ctx);
    return next;
  }
  return value;
}

/**
 * Division-aware preview content for one module. Runs the per-variant
 * overlays, then the generic pass so every module in the library reflects the
 * selected brand mode.
 */
export function seedDivisionContent(
  variantId: string,
  brief: Brief,
  sectionName: string,
  brand: BrandMode,
): SlideContent {
  const seeded = overlayDivisionContent(variantId, brief, sectionName, brand) as Obj;
  const profile = BRAND_PROFILES[brand.id];
  const cs = pickCaseStudy(brand.id, brief.industry);
  const ctx: DivisionCtx = {
    divisionName: brand.name,
    client: cs.client,
    industry: profile?.contentScope?.industries?.[0] ?? brief.industry ?? "Enterprise",
    quote: cs.quote,
    attribution: cs.attribution,
    role: cs.role,
  };
  const out: Obj = {};
  for (const k of Object.keys(seeded)) out[k] = divisionizeValue(seeded[k], k, ctx);
  return out as SlideContent;
}


// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────
//
// validateDivisionContent() proves — before the /library grid renders — that
// every BrandMode can produce a complete, division-specific preview. It is
// pure and synchronous so it can run inside a useMemo() at the top of the
// route and short-circuit rendering if any brand is missing coverage.

export type BrandCoverageIssue =
  | "missing-profile"
  | "missing-industries"
  | "missing-service-lines"
  | "missing-case-study"
  | "case-study-fallback"
  | "empty-stats"
  | "empty-quote"
  | "cover-title-blank"
  | "pillars-empty"
  | "agenda-empty"
  | "context-cards-empty"
  | "logos-empty";

// Human-readable auto-fix hint for each issue code. Points at the exact file
// + field the maintainer needs to open. Keep these in sync with the audit
// branches inside auditBrand().
export const COVERAGE_FIX_HINTS: Record<
  BrandCoverageIssue,
  { file: string; field: string; hint: string }
> = {
  "missing-profile": {
    file: "src/lib/brand-profiles.ts",
    field: "BRAND_PROFILES[<brandId>]",
    hint: "Add a full profile entry keyed by this brand id (voice, contentScope, tone).",
  },
  "missing-industries": {
    file: "src/lib/brand-profiles.ts",
    field: "BRAND_PROFILES[<brandId>].contentScope.industries",
    hint: "List at least one industry — used to seed context cards and pick case studies.",
  },
  "missing-service-lines": {
    file: "src/lib/brand-profiles.ts",
    field: "BRAND_PROFILES[<brandId>].contentScope.serviceLines",
    hint: "Add 3–6 service lines — they seed agenda items and solution pillars.",
  },
  "missing-case-study": {
    file: "src/lib/case-studies.ts",
    field: "CASE_STUDIES[…].stats",
    hint: "Selected case study has fewer than 2 stats. Add stats entries or point brand tags at a richer case.",
  },
  "case-study-fallback": {
    file: "src/lib/case-studies.ts + src/lib/brand-profiles.ts",
    field: "CASE_STUDIES[…].tags  ↔  BRAND_PROFILES[<brandId>].contentScope.caseStudyTags",
    hint: "No case study matched this brand's tags/industry — added a division-specific case study or add matching tags to an existing one.",
  },
  "empty-stats": {
    file: "src/lib/case-studies.ts",
    field: "CASE_STUDIES[…].stats[].{value,label}",
    hint: "The matched case study needs ≥3 stats with non-empty value + label.",
  },
  "empty-quote": {
    file: "src/lib/case-studies.ts",
    field: "CASE_STUDIES[…].{quote,attribution}",
    hint: "The matched case study is missing a quote or attribution.",
  },
  "cover-title-blank": {
    file: "src/lib/library-preview.ts",
    field: "seedDivisionContent() cover branch",
    hint: "Cover overlay produced no title/subtitle — check pickCaseStudy() returned a client and brand.name is set.",
  },
  "pillars-empty": {
    file: "src/lib/brand-profiles.ts",
    field: "BRAND_PROFILES[<brandId>].contentScope.serviceLines",
    hint: "MV-SOL-PILLARS-3 overlay needs service lines. Populate at least 3.",
  },
  "agenda-empty": {
    file: "src/lib/brand-profiles.ts",
    field: "BRAND_PROFILES[<brandId>].contentScope.serviceLines",
    hint: "MV-OP-AGENDA overlay needs service lines. Populate at least 3–5.",
  },
  "context-cards-empty": {
    file: "src/lib/brand-profiles.ts",
    field: "BRAND_PROFILES[<brandId>].contentScope.industries",
    hint: "MV-CTX-CARDS-3 overlay needs industries. Add at least 3.",
  },
  "logos-empty": {
    file: "src/lib/brand-profiles.ts",
    field: "BRAND_PROFILES[<brandId>].contentScope.industries",
    hint: "pickProofLogos() sources names from industries — add more, or expand the fallback list in case-studies.ts → pickProofLogos().",
  },
};

export type OverlaySlot =
  | "stats"
  | "quote"
  | "cover"
  | "pillars"
  | "agenda"
  | "contextCards"
  | "logos";

export interface SlotMetric {
  /** Number of populated items the overlay produced (1/0 for scalar slots). */
  count: number;
  /** Minimum count expected for this slot to be considered complete. */
  expected: number;
  /** count >= expected AND every populated entry is non-empty. */
  ok: boolean;
  /** True when the slot is not applicable to this brand (e.g. no service lines). */
  skipped?: boolean;
  /** Short reason surfaced in the UI when !ok or skipped. */
  note?: string;
}

export const OVERLAY_SLOT_LABELS: Record<OverlaySlot, string> = {
  stats: "Stats",
  quote: "Quote",
  cover: "Cover",
  pillars: "Pillars",
  agenda: "Agenda",
  contextCards: "Context",
  logos: "Logos",
};

const SLOT_ISSUE: Record<OverlaySlot, BrandCoverageIssue> = {
  stats: "empty-stats",
  quote: "empty-quote",
  cover: "cover-title-blank",
  pillars: "pillars-empty",
  agenda: "agenda-empty",
  contextCards: "context-cards-empty",
  logos: "logos-empty",
};

export interface BrandCoverageReport {
  brandId: string;
  brandName: string;
  issues: BrandCoverageIssue[];
  notes: string[];
  metrics: Record<OverlaySlot, SlotMetric>;
}

export interface DivisionCoverageResult {
  ok: boolean;
  reports: BrandCoverageReport[];
  // Convenience — the subset with at least one issue.
  failing: BrandCoverageReport[];
}

// Variant IDs used as canaries for each overlayed family. Kept in sync with
// the branches inside seedDivisionContent().
const CANARIES = {
  stats: "MV-PROOF-STATS-3",
  quote: "MV-QUOTE-METRIC",
  cover: "MV-OP-COVER",
  pillars: "MV-SOL-PILLARS-3",
  agenda: "MV-OP-AGENDA",
  ctx: "MV-CTX-CARDS-3",
  logos: "MV-CLIENT-MATRIX",
} as const;

function asArr(x: unknown): unknown[] {
  return Array.isArray(x) ? x : [];
}
function nonEmpty(s: unknown): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

function emptyMetrics(): Record<OverlaySlot, SlotMetric> {
  return {
    stats: { count: 0, expected: 3, ok: false, skipped: true },
    quote: { count: 0, expected: 1, ok: false, skipped: true },
    cover: { count: 0, expected: 1, ok: false, skipped: true },
    pillars: { count: 0, expected: 3, ok: false, skipped: true },
    agenda: { count: 0, expected: 3, ok: false, skipped: true },
    contextCards: { count: 0, expected: 3, ok: false, skipped: true },
    logos: { count: 0, expected: 4, ok: false, skipped: true },
  };
}

function auditBrand(brand: BrandMode): BrandCoverageReport {
  const issues: BrandCoverageIssue[] = [];
  const notes: string[] = [];
  const metrics = emptyMetrics();
  const profile = BRAND_PROFILES[brand.id];

  const pushSlot = (slot: OverlaySlot, m: SlotMetric) => {
    metrics[slot] = m;
    if (!m.ok && !m.skipped) issues.push(SLOT_ISSUE[slot]);
  };

  if (!profile) {
    issues.push("missing-profile");
    return { brandId: brand.id, brandName: brand.name, issues, notes, metrics };
  }

  const industries = profile.contentScope?.industries ?? [];
  const services = profile.contentScope?.serviceLines ?? [];
  if (industries.length === 0) issues.push("missing-industries");
  if (services.length === 0) issues.push("missing-service-lines");

  // Case-study coverage: pickCaseStudy always returns *something* (falls back
  // to CASE_STUDIES[0]). We only accept it if it scored above zero against
  // this brand's tags — otherwise it is a generic fallback, which is exactly
  // what division-specific validation must catch.
  const cs = pickCaseStudy(brand.id, industries[0]);
  const tagSet = new Set(profile.contentScope?.caseStudyTags ?? []);
  const scored = cs.tags.some((t) => tagSet.has(t));
  const industryMatch =
    !!industries[0] && cs.industry.toLowerCase() === industries[0].toLowerCase();
  if (!scored && !industryMatch) {
    issues.push("case-study-fallback");
    notes.push(
      `case study "${cs.id}" does not match any tag in [${[...tagSet].join(", ") || "∅"}]`,
    );
  }
  if (!cs.stats || cs.stats.length < 2) {
    issues.push("missing-case-study");
    notes.push(`case "${cs.id}" has < 2 stats`);
  }

  const brief = resolveDivisionBrief(brand);

  // Stats canary — expect at least 3 populated items.
  const stats = seedDivisionContent(CANARIES.stats, brief, "Proof", brand) as Record<
    string,
    unknown
  >;
  const statItems = asArr(stats.items) as Array<Record<string, unknown>>;
  const statPopulated = statItems.filter((s) => nonEmpty(s.value) && nonEmpty(s.label)).length;
  pushSlot("stats", {
    count: statPopulated,
    expected: 3,
    ok: statPopulated >= 3 && statPopulated === statItems.length,
    note:
      statItems.length && statPopulated < statItems.length
        ? `${statItems.length - statPopulated} stat(s) missing value/label`
        : undefined,
  });

  // Quote canary (scalar).
  const q = seedDivisionContent(CANARIES.quote, brief, "Voice", brand) as Record<string, unknown>;
  const quoteOk = nonEmpty(q.quote) && nonEmpty(q.attribution);
  pushSlot("quote", {
    count: quoteOk ? 1 : 0,
    expected: 1,
    ok: quoteOk,
    note: quoteOk ? undefined : !nonEmpty(q.quote) ? "quote empty" : "attribution empty",
  });

  // Cover canary (scalar).
  const cov = seedDivisionContent(CANARIES.cover, brief, "Cover", brand) as Record<string, unknown>;
  const coverOk = nonEmpty(cov.title) && nonEmpty(cov.subtitle);
  pushSlot("cover", {
    count: coverOk ? 1 : 0,
    expected: 1,
    ok: coverOk,
    note: coverOk ? undefined : !nonEmpty(cov.title) ? "title blank" : "subtitle blank",
  });

  // Pillars canary — requires service lines.
  if (services.length) {
    const pl = seedDivisionContent(CANARIES.pillars, brief, "Solution", brand) as Record<
      string,
      unknown
    >;
    const plItems = asArr(pl.items) as Array<Record<string, unknown>>;
    const plPop = plItems.filter((p) => nonEmpty(p.title)).length;
    pushSlot("pillars", {
      count: plPop,
      expected: 3,
      ok: plPop >= 3 && plPop === plItems.length,
      note:
        plItems.length && plPop < plItems.length
          ? `${plItems.length - plPop} pillar(s) missing title`
          : undefined,
    });
  } else {
    metrics.pillars = {
      count: 0,
      expected: 3,
      ok: false,
      skipped: true,
      note: "no service lines",
    };
  }

  // Agenda canary — requires service lines to overlay.
  if (services.length) {
    const ag = seedDivisionContent(CANARIES.agenda, brief, "Agenda", brand) as Record<
      string,
      unknown
    >;
    const agItems = asArr(ag.items) as Array<Record<string, unknown>>;
    const agPop = agItems.filter((a) => nonEmpty(a.label)).length;
    pushSlot("agenda", {
      count: agPop,
      expected: 3,
      ok: agPop >= 3 && agPop === agItems.length,
      note:
        agItems.length && agPop < agItems.length
          ? `${agItems.length - agPop} agenda row(s) missing label`
          : undefined,
    });
  } else {
    metrics.agenda = {
      count: 0,
      expected: 3,
      ok: false,
      skipped: true,
      note: "no service lines",
    };
  }

  // Context cards canary — requires industries to overlay.
  if (industries.length) {
    const cx = seedDivisionContent(CANARIES.ctx, brief, "Context", brand) as Record<
      string,
      unknown
    >;
    const cxItems = asArr(cx.items) as Array<Record<string, unknown>>;
    const cxPop = cxItems.filter((c) => nonEmpty(c.title)).length;
    pushSlot("contextCards", {
      count: cxPop,
      expected: 3,
      ok: cxPop >= 3 && cxPop === cxItems.length,
      note:
        cxItems.length && cxPop < cxItems.length
          ? `${cxItems.length - cxPop} card(s) missing title`
          : undefined,
    });
  } else {
    metrics.contextCards = {
      count: 0,
      expected: 3,
      ok: false,
      skipped: true,
      note: "no industries",
    };
  }

  // Proof logos.
  const logos = pickProofLogos(brand.id);
  const logoPop = logos.filter((l) => nonEmpty(l.name)).length;
  pushSlot("logos", {
    count: logoPop,
    expected: 4,
    ok: logoPop >= 4 && logoPop === logos.length,
    note:
      logos.length && logoPop < logos.length
        ? `${logos.length - logoPop} logo(s) missing name`
        : undefined,
  });

  return { brandId: brand.id, brandName: brand.name, issues, notes, metrics };
}

// Sanity-check case study inventory is unique — catches copy/paste seeding bugs
// that would silently narrow which studies pickCaseStudy() can return.
function auditCaseStudyInventory(): string[] {
  const notes: string[] = [];
  const ids = new Set<string>();
  for (const cs of CASE_STUDIES) {
    if (ids.has(cs.id)) notes.push(`duplicate case-study id "${cs.id}"`);
    ids.add(cs.id);
  }
  return notes;
}

let cached: DivisionCoverageResult | null = null;

/**
 * Run once per process — the inputs (BRAND_MODES, BRAND_PROFILES,
 * CASE_STUDIES) are all module-level constants, so the result is stable.
 */
export function validateDivisionContent(): DivisionCoverageResult {
  if (cached) return cached;
  const reports = BRAND_MODES.map(auditBrand);
  const inventoryNotes = auditCaseStudyInventory();
  if (inventoryNotes.length) {
    reports.push({
      brandId: "__inventory__",
      brandName: "Case-study inventory",
      issues: ["missing-case-study"],
      notes: inventoryNotes,
      metrics: emptyMetrics(),
    });
  }
  const failing = reports.filter((r) => r.issues.length > 0);
  cached = { ok: failing.length === 0, reports, failing };
  return cached;
}

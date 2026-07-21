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
  const archetypeId =
    profile?.contentScope?.preferredArchetypes?.[0] ?? "arch-problem-solution";
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
export function seedDivisionContent(
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
      title: cs.headline,
    } as SlideContent;
  }

  return base as SlideContent;
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

export interface BrandCoverageReport {
  brandId: string;
  brandName: string;
  issues: BrandCoverageIssue[];
  notes: string[];
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

function auditBrand(brand: BrandMode): BrandCoverageReport {
  const issues: BrandCoverageIssue[] = [];
  const notes: string[] = [];
  const profile = BRAND_PROFILES[brand.id];

  if (!profile) {
    issues.push("missing-profile");
    return { brandId: brand.id, brandName: brand.name, issues, notes };
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
  if (
    statItems.length < 3 ||
    statItems.some((s) => !nonEmpty(s.value) || !nonEmpty(s.label))
  ) {
    issues.push("empty-stats");
  }

  // Quote canary.
  const q = seedDivisionContent(CANARIES.quote, brief, "Voice", brand) as Record<
    string,
    unknown
  >;
  if (!nonEmpty(q.quote) || !nonEmpty(q.attribution)) {
    issues.push("empty-quote");
  }

  // Cover canary.
  const cov = seedDivisionContent(CANARIES.cover, brief, "Cover", brand) as Record<
    string,
    unknown
  >;
  if (!nonEmpty(cov.title) || !nonEmpty(cov.subtitle)) {
    issues.push("cover-title-blank");
  }

  // Pillars canary — requires service lines.
  if (services.length) {
    const pl = seedDivisionContent(CANARIES.pillars, brief, "Solution", brand) as Record<
      string,
      unknown
    >;
    const plItems = asArr(pl.items) as Array<Record<string, unknown>>;
    if (plItems.length === 0 || plItems.some((p) => !nonEmpty(p.title))) {
      issues.push("pillars-empty");
    }
  }

  // Agenda canary — requires service lines to overlay.
  if (services.length) {
    const ag = seedDivisionContent(CANARIES.agenda, brief, "Agenda", brand) as Record<
      string,
      unknown
    >;
    const agItems = asArr(ag.items) as Array<Record<string, unknown>>;
    if (agItems.length === 0 || agItems.some((a) => !nonEmpty(a.label))) {
      issues.push("agenda-empty");
    }
  }

  // Context cards canary — requires industries to overlay.
  if (industries.length) {
    const cx = seedDivisionContent(CANARIES.ctx, brief, "Context", brand) as Record<
      string,
      unknown
    >;
    const cxItems = asArr(cx.items) as Array<Record<string, unknown>>;
    if (cxItems.length === 0 || cxItems.some((c) => !nonEmpty(c.title))) {
      issues.push("context-cards-empty");
    }
  }

  // Proof logos.
  const logos = pickProofLogos(brand.id);
  if (logos.length < 4 || logos.some((l) => !nonEmpty(l.name))) {
    issues.push("logos-empty");
  }

  return { brandId: brand.id, brandName: brand.name, issues, notes };
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
    });
  }
  const failing = reports.filter((r) => r.issues.length > 0);
  cached = { ok: failing.length === 0, reports, failing };
  return cached;
}


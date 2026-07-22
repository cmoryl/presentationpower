// Module Instance — the atom of the modular system.
// A ModuleInstance is a filled or unfilled variant that can be consumed by ANY
// surface: a deck slide, a brochure page, a one-pager block, a social crop, or
// an email block. This is the pivot: modules are the source of truth; surfaces
// (including decks) are containers that arrange module instances.

import type { SlideContent, DeckSlide, CanvasBlock } from "./deck-store";
import type { ModuleVariant } from "./taxonomy";
import { MODULE_VARIANTS, byId } from "./taxonomy";

export type ModuleRole =
  | "hero"
  | "proof"
  | "stat"
  | "quote"
  | "cta"
  | "close"
  | "logo"
  | "data"
  | "story"
  | "process"
  | "team"
  | "contact";

export type ModuleSaveKind = "populated" | "template";

/** Deterministic backdrop hint carried with the module (see variantBackdrop). */
export type ModuleBackdrop = {
  imageUrl?: string;
  tint?: string;
  scrim?: number;
  mode?: "cover" | "contain" | "tile";
} | null;

export type ModuleInstance = {
  /** Ephemeral instance id (unique within a surface). */
  id: string;
  /** Reference to MODULE_VARIANTS entry. */
  variantId: string;
  /** Filled fields per the variant's editableFields. */
  content: SlideContent;
  /** Optional brand-mode override; when null, inherits surface brandMode. */
  brandMode?: string | null;
  subCompany?: string | null;
  /** Optional custom backdrop; when null, uses deterministic backdropForVariant. */
  backdrop?: ModuleBackdrop;
  /** Narrative role hint — helps auto-compose and rhythm. */
  role?: ModuleRole | null;
  /** Free-form tags (division, tone, campaign). */
  tags?: string[];
  /** Optional presenter/design notes. */
  notes?: string | null;
  /** Free-form canvas overlay (shared with DeckSlide). */
  canvasBlocks?: CanvasBlock[];
  /** Reference back to a saved_module row when dragged from My Modules. */
  savedModuleId?: string | null;
};

// ==========================================================================
// SURFACES the module system supports.
// ==========================================================================

export type SurfaceKind = "deck" | "brochure" | "onepager" | "social" | "email";

export type SurfaceFormat =
  // Deck
  | "16:9"
  // Brochure formats
  | "bi-fold-letter"
  | "bi-fold-a4"
  | "tri-fold-letter"
  | "tri-fold-a4"
  | "4pp-letter"
  | "8pp-letter"
  // One-pager
  | "letter-portrait"
  | "a4-portrait"
  | "letter-landscape"
  // Social
  | "ig-1x1"
  | "ig-4x5"
  | "ig-9x16"
  | "linkedin-1200x627"
  | "linkedin-1080x1350"
  | "x-1600x900"
  // Email
  | "email-single-column"
  | "email-two-column";

export const SURFACE_LABELS: Record<SurfaceKind, string> = {
  deck: "Deck",
  brochure: "Brochure",
  onepager: "One-pager",
  social: "Social",
  email: "Email",
};

export const SURFACE_FORMATS: Record<SurfaceKind, { id: SurfaceFormat; label: string; w: number; h: number }[]> = {
  deck: [{ id: "16:9", label: "16:9 Slide", w: 1920, h: 1080 }],
  brochure: [
    { id: "bi-fold-letter", label: "Bi-fold · Letter", w: 2200, h: 1700 },
    { id: "bi-fold-a4", label: "Bi-fold · A4", w: 2338, h: 1653 },
    { id: "tri-fold-letter", label: "Tri-fold · Letter", w: 3300, h: 1700 },
    { id: "tri-fold-a4", label: "Tri-fold · A4", w: 3507, h: 1653 },
    { id: "4pp-letter", label: "4pp Saddle · Letter", w: 1700, h: 2200 },
    { id: "8pp-letter", label: "8pp Booklet · Letter", w: 1700, h: 2200 },
  ],
  onepager: [
    { id: "letter-portrait", label: "Letter · Portrait", w: 1700, h: 2200 },
    { id: "a4-portrait", label: "A4 · Portrait", w: 1653, h: 2338 },
    { id: "letter-landscape", label: "Letter · Landscape", w: 2200, h: 1700 },
  ],
  social: [
    { id: "ig-1x1", label: "Square 1:1", w: 1080, h: 1080 },
    { id: "ig-4x5", label: "Portrait 4:5", w: 1080, h: 1350 },
    { id: "ig-9x16", label: "Story 9:16", w: 1080, h: 1920 },
    { id: "linkedin-1200x627", label: "LinkedIn 1.91:1", w: 1200, h: 627 },
    { id: "linkedin-1080x1350", label: "LinkedIn 4:5", w: 1080, h: 1350 },
    { id: "x-1600x900", label: "X 16:9", w: 1600, h: 900 },
  ],
  email: [
    { id: "email-single-column", label: "Single-column", w: 600, h: 0 },
    { id: "email-two-column", label: "Two-column", w: 600, h: 0 },
  ],
};

// ==========================================================================
// Variant capability tags — every variant declares which surfaces it supports.
// Defaults are inferred from familyId so existing MODULE_VARIANTS need no edit.
// ==========================================================================

export type SurfaceSupport = {
  deck: boolean;
  brochure: boolean;
  onepager: boolean;
  email: boolean;
  social: {
    "1:1": boolean;
    "4:5": boolean;
    "9:16": boolean;
    "16:9": boolean;
  };
};

/** Deterministic default surface support from familyId + variantId hints. */
export function defaultSurfaceSupport(variant: ModuleVariant): SurfaceSupport {
  const id = variant.id.toUpperCase();
  const fam = variant.familyId;

  // Data/chart variants — no story crops.
  const isData = /CHART|DATA|MATURITY|DASHBOARD|TABLE|MATRIX|COMPARE/.test(id);
  // Logo marquees — always work, marquee style on email/social.
  const isMarquee = /MARQUEE|STRIP|SCROLL/.test(id);
  // Full-bleed hero editorial variants — every surface, every ratio.
  const isHero = /HERO|BLEED|POSTER|COVER|OPENER|ORB/.test(id);
  // Quote / stat / kicker — social-friendly.
  const isQuoteStat = /QUOTE|STAT|KICKER|CALLOUT|NUMBER/.test(id);
  // Process / timeline / step — wide aspect only.
  const isLinear = /PROCESS|TIMELINE|STEP|JOURNEY|ROADMAP/.test(id);
  // Team / cards / people grid — email + brochure friendly.
  const isPeople = /TEAM|PEOPLE|BIO|CARD-GRID/.test(id);

  return {
    deck: true,
    brochure: true,
    onepager: true,
    email: true,
    social: {
      "1:1": !isLinear,
      "4:5": !isLinear,
      "9:16": isHero || isQuoteStat,
      "16:9": isHero || isMarquee || isData || fam === "MF-01",
    },
  };
}

/** Check whether a variant supports a given surface/format. */
export function variantSupportsSurface(variantId: string, kind: SurfaceKind, format?: SurfaceFormat): boolean {
  const variant = byId(MODULE_VARIANTS, variantId);
  if (!variant) return false;
  const support = defaultSurfaceSupport(variant);
  if (kind === "deck" || kind === "brochure" || kind === "onepager" || kind === "email") {
    return support[kind];
  }
  // social
  if (!format) return support.social["1:1"];
  if (format === "ig-1x1" || format === "linkedin-1200x627") return support.social["1:1"] || support.social["16:9"];
  if (format === "ig-4x5" || format === "linkedin-1080x1350") return support.social["4:5"];
  if (format === "ig-9x16") return support.social["9:16"];
  if (format === "x-1600x900") return support.social["16:9"];
  return true;
}

// ==========================================================================
// Bridge helpers — convert between DeckSlide and ModuleInstance without
// coupling the stores.
// ==========================================================================

export function moduleFromSlide(slide: DeckSlide): ModuleInstance {
  return {
    id: `mi-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`,
    variantId: slide.variantId,
    content: slide.content,
    notes: slide.notes ?? null,
    canvasBlocks: slide.canvasBlocks,
    brandMode: null,
    subCompany: null,
    backdrop: null,
    role: inferRoleFromVariant(slide.variantId),
    tags: [],
  };
}

export function slideFromModule(mi: ModuleInstance, position: number, sectionId = "generic"): DeckSlide {
  const variant = byId(MODULE_VARIANTS, mi.variantId);
  return {
    id: mi.id,
    position,
    sectionId,
    variantId: mi.variantId,
    layoutId: variant?.permittedLayoutIds[0] ?? "LF-01",
    content: mi.content,
    changes: [],
    notes: mi.notes ?? undefined,
    canvasBlocks: mi.canvasBlocks,
  };
}

/** Best-effort role inference from a variant id. */
export function inferRoleFromVariant(variantId: string): ModuleRole | null {
  const id = variantId.toUpperCase();
  if (/HERO|OPENER|COVER|BLEED/.test(id)) return "hero";
  if (/CLOSE|CTA|CLOSER/.test(id)) return "cta";
  if (/QUOTE/.test(id)) return "quote";
  if (/STAT|NUMBER|KICKER/.test(id)) return "stat";
  if (/LOGO|MARQUEE|CLIENT/.test(id)) return "logo";
  if (/CHART|DATA|DASHBOARD|MATURITY/.test(id)) return "data";
  if (/PROOF|CASE|TESTIMONIAL/.test(id)) return "proof";
  if (/PROCESS|TIMELINE|STEP|ROADMAP/.test(id)) return "process";
  if (/TEAM|PEOPLE|BIO/.test(id)) return "team";
  if (/CONTACT|FOOTER/.test(id)) return "contact";
  return null;
}

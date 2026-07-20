// Brand enrichment — logo lockups + content scope keyed by brand-mode id.
// The DB owns tokens (color); this file owns the storytelling metadata that
// tells the assembler what content is relevant when a brand is selected.
//
// When real logo assets are uploaded, swap `logo` for URL-backed pointers.

import type { BrandLogoLockup, BrandContentScope, BrandRole, BrandMode } from "@/lib/taxonomy";
import { BRAND_MODES, byId } from "@/lib/taxonomy";

export type BrandProfile = {
  role: BrandRole;
  parentId?: string;
  logo: BrandLogoLockup;
  contentScope: BrandContentScope;
};

// Keyed by BrandMode.id (matches the seeded rows in the brand_modes table).
export const BRAND_PROFILES: Record<string, BrandProfile> = {
  "bm-enterprise": {
    role: "corporate",
    logo: { mark: "TP", wordmark: "TransPerfect" },
    contentScope: {
      industries: ["Life Sciences", "Legal", "Financial Services", "Technology", "Retail", "Manufacturing", "Media & Entertainment"],
      serviceLines: ["Translation", "Localization", "AI Language Services", "Interpretation", "eDiscovery", "Content Production", "Global Marketing"],
      caseStudyTags: ["global-rollout", "regulated", "multilingual-content", "cost-savings", "speed-to-market"],
      preferredArchetypes: ["arch-value-story", "arch-decision-drive", "arch-market-fit"],
      // Corporate narrative leans on long-form case stories + testimonial proof.
      preferredVariantIds: ["MV-CASE-STORY", "MV-PROOF-TESTIMONIAL", "MV-SOL-PILLARS-3", "MV-CTX-CARDS-3"],
    },
  },
  "bm-subcompany": {
    // Neutral fallback for free-typed subcompany names not in the fixed list.
    // Concrete divisions live in their own `bm-tp-*` entries below.
    role: "subcompany",
    parentId: "bm-enterprise",
    logo: { mark: "TP", wordmark: "TransPerfect" },
    contentScope: {
      industries: [],
      serviceLines: [],
      caseStudyTags: [],
      preferredArchetypes: ["arch-value-story", "arch-decision-drive"],
    },
  },
  "bm-tp-lifesci": {
    role: "subcompany",
    parentId: "bm-enterprise",
    logo: { mark: "TPLS", wordmark: "TransPerfect", divisionLine: "Life Sciences" },
    contentScope: {
      industries: ["Life Sciences", "Pharma", "Medical Devices", "Clinical Research"],
      serviceLines: ["Regulatory translation", "Clinical trial content", "Patient recruitment", "eCTD submissions", "Medical writing"],
      caseStudyTags: ["clinical-trial", "regulatory", "fda-ema", "patient-facing", "pharma"],
      preferredArchetypes: ["arch-value-story", "arch-decision-drive"],
      restrictedFamilyIds: [],
      preferredVariantIds: ["MV-CASE-SPREAD", "MV-PROOF-STATS-3", "MV-DEC-CHECKLIST", "MV-CTX-COST"],
    },
  },
  "bm-trial-interactive": {
    role: "product",
    parentId: "bm-tp-lifesci",
    logo: { mark: "TI", wordmark: "Trial Interactive" },
    contentScope: {
      industries: ["Life Sciences", "Clinical Operations", "Sponsors", "CROs"],
      serviceLines: ["eTMF", "Study Start-Up", "Investigator Portal", "Safety & Compliance", "Analytics"],
      caseStudyTags: ["etmf", "study-start-up", "investigator-portal", "clinical-operations", "compliance"],
      preferredArchetypes: ["arch-market-fit", "arch-decision-drive"],
      preferredVariantIds: ["MV-CASE-METRICS", "MV-PROOF-STATS-3", "MV-DEC-CHECKLIST", "MV-CTX-STAT-GRID"],
    },
  },
  // Sub-company-specific overrides are applied dynamically via
  // `getSubCompanyProfile(baseId, subCompany)`. Keep the base record above
  // so generic "Subcompany" still has a fallback before a named division is
  // selected.
  "bm-division": {
    role: "division",
    parentId: "bm-enterprise",
    logo: { mark: "GL", wordmark: "GlobalLink", divisionLine: "TransPerfect Technology" },
    contentScope: {
      industries: ["Technology", "SaaS", "E-commerce", "Media", "Enterprise IT"],
      serviceLines: ["Translation Management System", "Connectors & APIs", "Workflow automation", "Continuous localization"],
      caseStudyTags: ["platform", "integration", "automation", "self-serve", "developer"],
      preferredArchetypes: ["arch-market-fit", "arch-transformation"],
      // Product-forward: lean on metrics + before/after + logo grid.
      preferredVariantIds: ["MV-CASE-METRICS", "MV-PROC-BEFORE-AFTER", "MV-PROOF-LOGOS", "MV-SOL-PILLARS-4"],
    },
  },
  "bm-product": {
    role: "product",
    parentId: "bm-enterprise",
    logo: { mark: "DF", wordmark: "DataForce", divisionLine: "by TransPerfect" },
    contentScope: {
      industries: ["Technology", "AI / ML", "Automotive", "Consumer Tech"],
      serviceLines: ["Data collection", "Data annotation", "Model evaluation", "Human-in-the-loop AI"],
      caseStudyTags: ["ai-training", "annotation", "llm", "computer-vision", "speech"],
      preferredArchetypes: ["arch-market-fit", "arch-transformation"],
      restrictedFamilyIds: ["MF-06"],
      preferredVariantIds: ["MV-CASE-METRICS", "MV-PROOF-STATS-3", "MV-CTX-STAT-GRID", "MV-INS-BIG-IDEA"],
    },
  },
  "bm-tp-media": {
    role: "subcompany",
    parentId: "bm-enterprise",
    logo: { mark: "TPM", wordmark: "TransPerfect", divisionLine: "Media" },
    contentScope: {
      industries: ["Media & Entertainment", "Streaming", "Broadcast", "Film & TV", "Advertising"],
      serviceLines: ["Dubbing", "Subtitling", "Audio description", "Access services", "Media localization", "Voice-over"],
      caseStudyTags: ["streaming", "dubbing", "subtitling", "ott", "access-services", "media"],
      preferredArchetypes: ["arch-value-story", "arch-market-fit"],
      preferredVariantIds: ["MV-CASE-STORY", "MV-PROOF-LOGOS", "MV-SOL-PILLARS-3", "MV-INS-BIG-IDEA"],
    },
  },
  "bm-tp-legal": {
    role: "subcompany",
    parentId: "bm-enterprise",
    logo: { mark: "TPL", wordmark: "TransPerfect", divisionLine: "Legal" },
    contentScope: {
      industries: ["Legal", "Law Firms", "Corporate Legal", "Financial Services", "Insurance"],
      serviceLines: ["eDiscovery", "Legal translation", "Litigation support", "IP & patent", "Compliance", "Managed review"],
      caseStudyTags: ["ediscovery", "litigation", "regulated", "cross-border", "patent", "compliance"],
      preferredArchetypes: ["arch-decision-drive", "arch-value-story"],
      preferredVariantIds: ["MV-CASE-STORY", "MV-DEC-CHECKLIST", "MV-PROOF-STATS-3", "MV-CTX-COST"],
    },
  },
  "bm-tp-games": {
    role: "subcompany",
    parentId: "bm-enterprise",
    logo: { mark: "TPG", wordmark: "TransPerfect", divisionLine: "Gaming" },
    contentScope: {
      industries: ["Gaming", "Interactive Entertainment", "Mobile Games", "Console", "Esports"],
      serviceLines: ["Game localization", "LQA", "Audio & voice", "Community management", "Player support", "Cinematics"],
      caseStudyTags: ["aaa", "mobile-games", "lqa", "live-service", "esports", "voice-over"],
      preferredArchetypes: ["arch-market-fit", "arch-transformation"],
      preferredVariantIds: ["MV-CASE-METRICS", "MV-PROOF-LOGOS", "MV-INS-BIG-IDEA", "MV-CTX-STAT-GRID"],
    },
  },
  "bm-tp-digital": {
    role: "subcompany",
    parentId: "bm-enterprise",
    logo: { mark: "TPD", wordmark: "TransPerfect", divisionLine: "Digital" },
    contentScope: {
      industries: ["Retail", "E-commerce", "Consumer Brands", "Travel & Hospitality", "Technology"],
      serviceLines: ["Website localization", "SEO & multilingual search", "Digital marketing", "Creative production", "Personalization", "Analytics"],
      caseStudyTags: ["ecommerce", "web-localization", "seo", "campaign", "conversion", "digital-experience"],
      preferredArchetypes: ["arch-market-fit", "arch-transformation"],
      preferredVariantIds: ["MV-CASE-METRICS", "MV-PROC-BEFORE-AFTER", "MV-CTX-STAT-GRID", "MV-PROOF-LOGOS"],
    },
  },
  "bm-cobrand": {
    role: "cobrand",
    parentId: "bm-enterprise",
    logo: { mark: "TP+", wordmark: "TransPerfect", divisionLine: "with {client}" },
    contentScope: {
      industries: ["Client-specific"],
      serviceLines: ["Joint program", "Managed service", "Strategic partnership"],
      caseStudyTags: ["partnership", "joint-gtm", "shared-ownership"],
      preferredArchetypes: ["arch-value-story", "arch-decision-drive"],
      preferredVariantIds: ["MV-CASE-STORY", "MV-DEC-CHECKLIST", "MV-PROOF-TESTIMONIAL"],
    },
  },
};


// Merge DB brand rows with the local profile. Missing profile ids fall back to
// a neutral "corporate" role with a text-mark of the first two letters of the
// name — so a new brand added to the DB still renders sensibly.
export function enrichBrandProfile(
  id: string,
  name: string
): BrandProfile {
  const found = BRAND_PROFILES[id];
  if (found) return found;
  const initials = name.replace(/[^A-Z]/g, "").slice(0, 3) || name.slice(0, 2).toUpperCase();
  return {
    role: "corporate",
    logo: { mark: initials, wordmark: name },
    contentScope: {
      industries: [],
      serviceLines: [],
      caseStudyTags: [],
      preferredArchetypes: [],
    },
  };
}

// Map a named TransPerfect sub-company onto a base profile. Used by the
// generic "Subcompany" brand mode so the lockup and content scope always
// resolve to a real division in the TransPerfect family.
export function getSubCompanyProfile(baseId: string, subCompany: string): BrandProfile {
  const base = BRAND_PROFILES[baseId] ?? enrichBrandProfile(baseId, subCompany);
  const normalized = subCompany.trim();

  // Known sub-companies that already have a dedicated brand mode. Re-use their
  // content scope so the assembler pulls the right modules.
  const knownScope = ((): BrandProfile["contentScope"] | undefined => {
    if (/media/i.test(normalized)) return BRAND_PROFILES["bm-tp-media"]?.contentScope;
    if (/legal/i.test(normalized) && normalized !== "Legal") return BRAND_PROFILES["bm-tp-legal"]?.contentScope;
    if (/game/i.test(normalized)) return BRAND_PROFILES["bm-tp-games"]?.contentScope;
    if (/digital/i.test(normalized)) return BRAND_PROFILES["bm-tp-digital"]?.contentScope;
    if (/life science|clinical|medical|pharma/i.test(normalized)) return BRAND_PROFILES["bm-tp-lifesci"]?.contentScope;
    return undefined;
  })();

  const initials = normalized
    .replace(/[^A-Z]/g, "")
    .slice(0, 4) || normalized.slice(0, 2).toUpperCase();

  return {
    ...base,
    role: "subcompany",
    parentId: base.parentId ?? "bm-enterprise",
    logo: {
      ...base.logo,
      mark: initials,
      wordmark: "TransPerfect",
      divisionLine: normalized,
    },
    contentScope: knownScope ?? base.contentScope,
  };
}

// Derive a concrete BrandMode for a named sub-company. Use this anywhere a
// BrandMode is consumed (brief preview, deck editor, assembler) so the lockup
// and content scope are always resolved to a real TransPerfect entity.
export function brandModeWithSubCompany(brand: BrandMode, subCompany?: string): BrandMode {
  if (!subCompany || brand.id !== "bm-subcompany") return brand;
  const profile = getSubCompanyProfile(brand.id, subCompany);
  return {
    ...brand,
    name: subCompany,
    role: "subcompany",
    logo: profile.logo,
    contentScope: profile.contentScope,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Canonical BrandMode resolver.
//
// The rows in BRAND_MODES (in taxonomy.ts) only carry id/name/description/tokens —
// the `role`, `parentId`, `logo` and `contentScope` fields live in BRAND_PROFILES.
// Every render path that needs a deck's / brief's *active* brand should go
// through this resolver so the enrichment layer is always merged in. Without
// it, the text-lockup fallback in <BrandLockup/> renders the mode's `name`
// (e.g. "ENTERPRISE") because `brand.logo` is undefined.
//
// - `brandModeId === "bm-subcompany"` + `subCompany` set  → typed sub-company
//   variant via `brandModeWithSubCompany`.
// - Otherwise → merge the matching BRAND_PROFILES entry (or a neutral
//   `enrichBrandProfile` fallback) onto the base BrandMode.
// ────────────────────────────────────────────────────────────────────────────
export function resolveBrandMode(
  brandModeId: string,
  subCompany?: string | null,
): BrandMode {
  const base = byId(BRAND_MODES, brandModeId) ?? BRAND_MODES[0];
  if (base.id === "bm-subcompany" && subCompany) {
    return brandModeWithSubCompany(base, subCompany);
  }
  const profile = BRAND_PROFILES[base.id] ?? enrichBrandProfile(base.id, base.name);
  return {
    ...base,
    role: profile.role,
    parentId: profile.parentId,
    logo: profile.logo,
    contentScope: profile.contentScope,
  };
}

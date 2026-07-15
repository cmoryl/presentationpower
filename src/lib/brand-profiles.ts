// Brand enrichment — logo lockups + content scope keyed by brand-mode id.
// The DB owns tokens (color); this file owns the storytelling metadata that
// tells the assembler what content is relevant when a brand is selected.
//
// When real logo assets are uploaded, swap `logo` for URL-backed pointers.

import type { BrandLogoLockup, BrandContentScope, BrandRole } from "@/lib/taxonomy";

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
    },
  },
  "bm-subcompany": {
    role: "subcompany",
    parentId: "bm-enterprise",
    logo: { mark: "TPLS", wordmark: "TransPerfect", divisionLine: "Life Sciences" },
    contentScope: {
      industries: ["Life Sciences", "Pharma", "Medical Devices", "Clinical Research"],
      serviceLines: ["Regulatory translation", "Clinical trial content", "Patient recruitment", "eCTD submissions", "Medical writing"],
      caseStudyTags: ["clinical-trial", "regulatory", "fda-ema", "patient-facing", "pharma"],
      preferredArchetypes: ["arch-value-story", "arch-decision-drive"],
      restrictedFamilyIds: [], // Life sciences uses everything but insists on strict-review MF-05 modules.
    },
  },
  "bm-division": {
    role: "division",
    parentId: "bm-enterprise",
    logo: { mark: "GL", wordmark: "GlobalLink", divisionLine: "TransPerfect Technology" },
    contentScope: {
      industries: ["Technology", "SaaS", "E-commerce", "Media", "Enterprise IT"],
      serviceLines: ["Translation Management System", "Connectors & APIs", "Workflow automation", "Continuous localization"],
      caseStudyTags: ["platform", "integration", "automation", "self-serve", "developer"],
      preferredArchetypes: ["arch-market-fit", "arch-transformation"],
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
      restrictedFamilyIds: ["MF-06"], // Long-form case study spreads are unusual for this product brand.
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

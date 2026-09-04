// Built-in starter decks, one per division brand mode.
//
// The /templates gallery used to show a single example card plus an empty
// state, so a signed-out visitor (or a fresh workspace) saw placeholders and
// nothing else. This module gives every division a real, authored library
// card *and* a real deck behind it: the card copy is hand-written per
// division, and the payload is composed from that division's preferred
// narrative archetype, its permitted module families and the division-aware
// seed content already used by the module library previews.
//
// Nothing here is async and nothing hits the network, so the gallery can
// render all cards synchronously and clone one locally without a session.

import {
  BRAND_MODES,
  NARRATIVE_ARCHETYPES,
  SECTION_FRAMEWORKS,
  byId,
  variantsForSection,
  type BrandMode,
  type ModuleVariant,
} from "@/lib/taxonomy";
import { BRAND_PROFILES } from "@/lib/brand-profiles";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import type { TemplatePayload } from "@/lib/deck-store";

/** Hand-written library-card copy for a division starter deck. */
export type DivisionStarterCopy = {
  /** Deck title — what the cloned deck is called. */
  title: string;
  /** Short label chip: the market this starter is aimed at. */
  tag: string;
  /** One line: what this deck argues. */
  caption: string;
  /** 1–2 sentences: when to reach for it. */
  description: string;
  /** Three real lines describing what is actually inside. */
  contains: string[];
};

const COPY: Record<string, DivisionStarterCopy> = {
  "bm-enterprise": {
    title: "TransPerfect — Global partnership review",
    tag: "Enterprise",
    caption: "One partner across every language, market and content type",
    description:
      "The master-brand story for a multi-division account: scale, governance and the breadth of the group. Use it for annual reviews and executive introductions where no single service line owns the conversation.",
    contains: [
      "Group scale stats and coverage map",
      "Service-line overview with governance model",
      "Cross-division case proof and next steps",
    ],
  },
  "bm-subcompany": {
    title: "Subcompany — Capability introduction",
    tag: "Named subcompany",
    caption: "A named subcompany introduced inside the TransPerfect system",
    description:
      "Positions a named subcompany without losing the parent endorsement. Use it for first meetings where the buyer knows TransPerfect but not this team.",
    contains: [
      "Who we are, with parent-brand lockup",
      "Focused capability set and delivery model",
      "Reference client story and commercial ask",
    ],
  },
  "bm-division": {
    title: "Division — Solution briefing",
    tag: "Division",
    caption: "A division's offer, framed against the client's problem",
    description:
      "A neutral division shell for teams without a dedicated starter yet. Use it when you want the approved structure and will swap in your own market detail.",
    contains: [
      "Problem framing and insight",
      "Approach in three to five stages",
      "Proof, pricing frame and close",
    ],
  },
  "bm-element": {
    title: "TransPerfect Element — Platform overview",
    tag: "Product",
    caption: "Brand-governed decks, print and signage built by one system",
    description:
      "The Element product story: approved modules, live brand governance and export parity across PowerPoint, PDF and print. Use it for internal rollout and client-facing platform demos.",
    contains: [
      "Element positioning and the brick motif cover",
      "Module library, skins and governance workflow",
      "Export formats, adoption metrics and rollout plan",
    ],
  },
  "bm-product": {
    title: "DataForce — AI training data programme",
    tag: "AI data",
    caption: "Collection, annotation and evaluation at model scale",
    description:
      "DataForce's data-programme pitch: contributor network, annotation quality loops and model-evaluation services. Use it for AI and platform buyers who care about throughput and quality gates.",
    contains: [
      "Contributor scale and language coverage",
      "Annotation pipeline with quality gates",
      "Model-evaluation results and programme ramp",
    ],
  },
  "bm-tp-media": {
    title: "TransPerfect Media — Localization at release pace",
    tag: "Media & entertainment",
    caption: "Dubbing, subtitling and access services on a release calendar",
    description:
      "Built for streamers, studios and broadcasters shipping simultaneous global releases. Use it when turnaround and compliance matter as much as craft.",
    contains: [
      "Title volume, languages and turnaround stats",
      "Dub and subtitle workflow with QC stages",
      "Access-services compliance and release roadmap",
    ],
  },
  "bm-tp-legal": {
    title: "TransPerfect Legal — Matter-ready language support",
    tag: "Legal",
    caption: "eDiscovery, litigation and IP support that holds up in court",
    description:
      "For law firms and corporate legal teams under deadline and privilege constraints. Use it when defensibility, chain of custody and certified output decide the deal.",
    contains: [
      "Matter volumes, review throughput and accuracy",
      "eDiscovery and certified-translation workflow",
      "Security posture, certifications and next steps",
    ],
  },
  "bm-tp-games": {
    title: "TransPerfect Gaming — Global launch readiness",
    tag: "Gaming",
    caption: "Localization, LQA and audio built around a ship date",
    description:
      "For studios and publishers taking a title multi-market. Use it when the conversation is about launch risk, LQA cycles and player sentiment.",
    contains: [
      "Titles shipped, languages and LQA pass rates",
      "Loc, audio and LQA pipeline against milestones",
      "Community and player-sentiment proof",
    ],
  },
  "bm-tp-digital": {
    title: "TransPerfect Digital — Global experience growth",
    tag: "Digital",
    caption: "Web, campaign and SEO localization that grows local demand",
    description:
      "For marketing and digital owners measured on traffic, conversion and time to market. Use it when the argument is commercial performance, not translation volume.",
    contains: [
      "Traffic, conversion and market-entry stats",
      "GlobalLink connector and publishing workflow",
      "Campaign case study with growth curve",
    ],
  },
  "bm-tp-lifesci": {
    title: "TransPerfect Life Sciences — Regulatory-grade language",
    tag: "Life sciences",
    caption: "Regulatory, clinical and medical content under audit",
    description:
      "For sponsors, CROs and device makers filing across regions. Use it when the buying question is submission risk and inspection readiness.",
    contains: [
      "Submission volumes and on-time filing rates",
      "Regulatory workflow with QA and back-translation",
      "Audit trail, certifications and study roadmap",
    ],
  },
  "bm-trial-interactive": {
    title: "Trial Interactive — eClinical platform review",
    tag: "eClinical",
    caption: "eTMF, study start-up and investigator portals in one platform",
    description:
      "For clinical operations teams consolidating trial documentation. Use it when inspection readiness and start-up cycle time are the metrics on the table.",
    contains: [
      "Study, site and document volume stats",
      "eTMF and start-up workflow with milestones",
      "Inspection-readiness proof and implementation plan",
    ],
  },
  "bm-cobrand": {
    title: "Co-brand — Joint client programme",
    tag: "Partner",
    caption: "A shared story told in two brands at once",
    description:
      "For partner and client co-presented decks. Use it when both logos appear and the programme, not either vendor, is the subject.",
    contains: [
      "Co-branded cover and joint value frame",
      "Shared delivery model and responsibilities",
      "Combined results and joint next steps",
    ],
  },
};

function pickVariantForSection(sectionId: string, brand: BrandMode): ModuleVariant | null {
  const scope = BRAND_PROFILES[brand.id]?.contentScope;
  const restricted = new Set(scope?.restrictedFamilyIds ?? []);
  const preferred = scope?.preferredVariantIds ?? [];
  const pool = variantsForSection(sectionId).filter((v) => !restricted.has(v.familyId));
  if (!pool.length) return null;
  const favoured = pool.find((v) => preferred.includes(v.id));
  return favoured ?? pool[0]!;
}

/** Compose a real deck payload for a division from its preferred archetype. */
export function buildDivisionStarterPayload(brand: BrandMode): TemplatePayload {
  const copy = COPY[brand.id];
  const brief = resolveDivisionBrief(brand);
  const archetype =
    byId(NARRATIVE_ARCHETYPES, brief.archetypeId ?? "") ??
    byId(NARRATIVE_ARCHETYPES, "arch-problem-solution") ??
    NARRATIVE_ARCHETYPES[0]!;

  const slides: TemplatePayload["slides"] = [];
  for (const sectionId of archetype.sectionRecipe) {
    const section = byId(SECTION_FRAMEWORKS, sectionId);
    if (!section) continue;
    const variant = pickVariantForSection(sectionId, brand);
    if (!variant) continue;
    slides.push({
      sectionId,
      variantId: variant.id,
      layoutId: variant.permittedLayoutIds[0]!,
      content: seedDivisionContent(variant.id, brief, section.name, brand),
      notes: `${section.name} — ${section.purpose}`,
    });
  }

  return {
    title: copy?.title ?? `${brand.name} starter deck`,
    brandModeId: brand.id,
    archetypeId: archetype.id,
    subCompany: null,
    context: null,
    slides,
    brief: {
      prospect: brief.prospect,
      industry: brief.industry,
      audience: brief.audience,
      meetingObjective: brief.meetingObjective,
      lengthTarget: slides.length,
      clientFacts: brief.clientFacts,
    },
  };
}

export type DivisionStarter = DivisionStarterCopy & {
  brandModeId: string;
  brandName: string;
  archetypeName: string;
  slideCount: number;
  /** Built on demand so the gallery only pays for what a user clones. */
  build: () => TemplatePayload;
};

/** Every division starter, in brand-mode order, with authored card copy. */
export const DIVISION_STARTERS: DivisionStarter[] = BRAND_MODES.map((brand) => {
  const payload = buildDivisionStarterPayload(brand);
  const copy = COPY[brand.id] ?? {
    title: `${brand.name} starter deck`,
    tag: brand.name,
    caption: brand.description,
    description: brand.description,
    contains: ["Opening and orientation", "Approach and proof", "Close and next steps"],
  };
  return {
    ...copy,
    brandModeId: brand.id,
    brandName: brand.name,
    archetypeName: byId(NARRATIVE_ARCHETYPES, payload.archetypeId)?.name ?? "Custom",
    slideCount: payload.slides.length,
    build: () => buildDivisionStarterPayload(brand),
  };
});

/** Authored card copy for one division, if it exists. */
export function divisionStarterCopy(brandModeId: string): DivisionStarterCopy | undefined {
  return COPY[brandModeId];
}

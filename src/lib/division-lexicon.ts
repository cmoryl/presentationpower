// ---------------------------------------------------------------------------
// Division domain lexicon.
//
// Retargeting a demo used to be cosmetic: swap the brand mode, style pack and
// imagery seeds, and rename the division wherever the authored copy said it.
// The *content* stayed in the source division's world — a Life Sciences deck
// retargeted to Legal still talked about country annexes and clinician review.
//
// This module is the domain knowledge layer that makes retargeting real. Each
// division declares the same set of concepts (who the audience is, what the
// work product is called, which body regulates it, what a quality gate is
// named, what a deadline is called…). Retargeting then rewrites the source
// division's vocabulary into the target division's vocabulary, so every slide
// title, bullet and caption reads like it was written for that division.
//
// It is intentionally a deterministic, dependency-free lookup: demo pages are
// public and must render identically on the server and in the browser, with no
// database round-trip and no AI call.
// ---------------------------------------------------------------------------

export type DivisionConcept =
  | "audienceRole"
  | "secondaryRole"
  | "buyerTitle"
  | "assetNoun"
  | "assetNounPlural"
  | "assetSetNoun"
  | "workUnit"
  | "reviewerRole"
  | "reviewAction"
  | "qualityGate"
  | "complianceBody"
  | "complianceNoun"
  | "riskEvent"
  | "systemOfRecord"
  | "channelNoun"
  | "deadlineNoun"
  | "milestoneNoun"
  | "sectorNoun"
  | "clientArchetype"
  | "proofNoun"
  | "deliveryNoun"
  | "marketNoun"
  | "kpiNoun"
  | "outcomeNoun";

export type DivisionLexicon = Record<DivisionConcept, string>;

/**
 * Keyed by the `slug` of each entry in DEMO_DIVISIONS so callers can look a
 * lexicon up from either a slug or a brand mode id.
 */
export const DIVISION_LEXICONS: Record<string, DivisionLexicon> = {
  globallink: {
    audienceRole: "localization program lead",
    secondaryRole: "digital marketing owner",
    buyerTitle: "VP Global Marketing",
    assetNoun: "launch asset",
    assetNounPlural: "launch assets",
    assetSetNoun: "product catalogue",
    workUnit: "content string",
    reviewerRole: "in-market reviewer",
    reviewAction: "in-context review",
    qualityGate: "linguistic QA pass",
    complianceBody: "brand governance board",
    complianceNoun: "brand and terminology standards",
    riskEvent: "a missed market launch",
    systemOfRecord: "CMS and PIM",
    channelNoun: "publishing lane",
    deadlineNoun: "launch date",
    milestoneNoun: "go-live gate",
    sectorNoun: "enterprise localization",
    clientArchetype: "global retail brand",
    proofNoun: "program benchmark",
    deliveryNoun: "market rollout",
    marketNoun: "market",
    kpiNoun: "cost per market",
    outcomeNoun: "faster time to market",
  },
  enterprise: {
    audienceRole: "global content owner",
    secondaryRole: "procurement lead",
    buyerTitle: "Chief Marketing Officer",
    assetNoun: "content package",
    assetNounPlural: "content packages",
    assetSetNoun: "enterprise content estate",
    workUnit: "content item",
    reviewerRole: "regional approver",
    reviewAction: "stakeholder review",
    qualityGate: "quality review",
    complianceBody: "governance council",
    complianceNoun: "enterprise policy",
    riskEvent: "an inconsistent global rollout",
    systemOfRecord: "core content stack",
    channelNoun: "delivery lane",
    deadlineNoun: "program deadline",
    milestoneNoun: "phase gate",
    sectorNoun: "enterprise services",
    clientArchetype: "Fortune 500 enterprise",
    proofNoun: "program benchmark",
    deliveryNoun: "global rollout",
    marketNoun: "region",
    kpiNoun: "total program cost",
    outcomeNoun: "one consistent global voice",
  },
  lifesci: {
    audienceRole: "regulatory affairs lead",
    secondaryRole: "medical writing manager",
    buyerTitle: "VP Regulatory Affairs",
    assetNoun: "country annex",
    assetNounPlural: "country annexes",
    assetSetNoun: "submission dossier",
    workUnit: "source document",
    reviewerRole: "clinician reviewer",
    reviewAction: "clinician review",
    qualityGate: "two-stage QC",
    complianceBody: "health authority",
    complianceNoun: "regulatory requirements",
    riskEvent: "a submission finding",
    systemOfRecord: "regulated document system",
    channelNoun: "validation lane",
    deadlineNoun: "filing date",
    milestoneNoun: "submission gate",
    sectorNoun: "life sciences",
    clientArchetype: "top-20 pharmaceutical sponsor",
    proofNoun: "inspection outcome",
    deliveryNoun: "global filing",
    marketNoun: "country",
    kpiNoun: "cost per filing",
    outcomeNoun: "inspection-ready evidence",
  },
  legal: {
    audienceRole: "litigation support lead",
    secondaryRole: "eDiscovery manager",
    buyerTitle: "Associate General Counsel",
    assetNoun: "exhibit set",
    assetNounPlural: "exhibit sets",
    assetSetNoun: "production volume",
    workUnit: "custodian document",
    reviewerRole: "attorney reviewer",
    reviewAction: "attorney review",
    qualityGate: "privilege and QC check",
    complianceBody: "court",
    complianceNoun: "procedural rules",
    riskEvent: "a privilege exposure in production",
    systemOfRecord: "review platform",
    channelNoun: "review lane",
    deadlineNoun: "production deadline",
    milestoneNoun: "court date",
    sectorNoun: "legal services",
    clientArchetype: "global law firm",
    proofNoun: "matter outcome",
    deliveryNoun: "document production",
    marketNoun: "jurisdiction",
    kpiNoun: "cost per reviewed document",
    outcomeNoun: "defensible, on-time production",
  },
  media: {
    audienceRole: "localization operations lead",
    secondaryRole: "post-production manager",
    buyerTitle: "VP Content Operations",
    assetNoun: "episode package",
    assetNounPlural: "episode packages",
    assetSetNoun: "content slate",
    workUnit: "subtitle file",
    reviewerRole: "language QC specialist",
    reviewAction: "language QC",
    qualityGate: "broadcast QC",
    complianceBody: "network standards team",
    complianceNoun: "platform delivery specs",
    riskEvent: "a missed release window",
    systemOfRecord: "media asset manager",
    channelNoun: "delivery pipeline",
    deadlineNoun: "release date",
    milestoneNoun: "delivery window",
    sectorNoun: "media and entertainment",
    clientArchetype: "global streaming platform",
    proofNoun: "title benchmark",
    deliveryNoun: "day-and-date release",
    marketNoun: "territory",
    kpiNoun: "cost per episode hour",
    outcomeNoun: "day-and-date global release",
  },
  gaming: {
    audienceRole: "player experience lead",
    secondaryRole: "live-ops producer",
    buyerTitle: "Head of Publishing",
    assetNoun: "build package",
    assetNounPlural: "build packages",
    assetSetNoun: "release build",
    workUnit: "in-game string",
    reviewerRole: "LQA tester",
    reviewAction: "linguistic QA playthrough",
    qualityGate: "LQA pass",
    complianceBody: "platform certification team",
    complianceNoun: "platform cert requirements",
    riskEvent: "a failed cert submission",
    systemOfRecord: "build pipeline",
    channelNoun: "loc pipeline",
    deadlineNoun: "ship date",
    milestoneNoun: "cert milestone",
    sectorNoun: "games",
    clientArchetype: "global games publisher",
    proofNoun: "title launch benchmark",
    deliveryNoun: "simultaneous worldwide launch",
    marketNoun: "region",
    kpiNoun: "cost per 1k words shipped",
    outcomeNoun: "day-one worldwide launch",
  },
  digital: {
    audienceRole: "performance marketing lead",
    secondaryRole: "SEO manager",
    buyerTitle: "VP Digital Marketing",
    assetNoun: "campaign asset",
    assetNounPlural: "campaign assets",
    assetSetNoun: "campaign calendar",
    workUnit: "ad variant",
    reviewerRole: "in-market marketer",
    reviewAction: "market review",
    qualityGate: "transcreation review",
    complianceBody: "brand and legal review",
    complianceNoun: "channel policy",
    riskEvent: "wasted media spend",
    systemOfRecord: "marketing stack",
    channelNoun: "campaign channel",
    deadlineNoun: "campaign launch",
    milestoneNoun: "flight start",
    sectorNoun: "digital marketing",
    clientArchetype: "global consumer brand",
    proofNoun: "campaign benchmark",
    deliveryNoun: "multi-market campaign launch",
    marketNoun: "market",
    kpiNoun: "cost per qualified lead",
    outcomeNoun: "higher return on media spend",
  },
  "trial-interactive": {
    audienceRole: "clinical operations lead",
    secondaryRole: "trial master file manager",
    buyerTitle: "VP Clinical Operations",
    assetNoun: "essential document",
    assetNounPlural: "essential documents",
    assetSetNoun: "trial master file",
    workUnit: "site document",
    reviewerRole: "site monitor",
    reviewAction: "monitor review",
    qualityGate: "TMF completeness check",
    complianceBody: "inspector",
    complianceNoun: "GCP requirements",
    riskEvent: "an inspection finding",
    systemOfRecord: "eTMF",
    channelNoun: "study workflow",
    deadlineNoun: "study milestone",
    milestoneNoun: "inspection readiness date",
    sectorNoun: "eClinical",
    clientArchetype: "global CRO",
    proofNoun: "inspection outcome",
    deliveryNoun: "study startup",
    marketNoun: "site",
    kpiNoun: "cost per study",
    outcomeNoun: "always inspection-ready",
  },
  element: {
    audienceRole: "brand design lead",
    secondaryRole: "sales enablement manager",
    buyerTitle: "Head of Brand",
    assetNoun: "branded asset",
    assetNounPlural: "branded assets",
    assetSetNoun: "asset library",
    workUnit: "module",
    reviewerRole: "brand reviewer",
    reviewAction: "brand review",
    qualityGate: "brand compliance check",
    complianceBody: "brand team",
    complianceNoun: "brand guidelines",
    riskEvent: "an off-brand asset in market",
    systemOfRecord: "Element library",
    channelNoun: "build lane",
    deadlineNoun: "deadline",
    milestoneNoun: "approval gate",
    sectorNoun: "brand and design operations",
    clientArchetype: "global marketing team",
    proofNoun: "usage benchmark",
    deliveryNoun: "asset delivery",
    marketNoun: "team",
    kpiNoun: "hours per asset",
    outcomeNoun: "on-brand output in minutes",
  },
};

// ---------------------------------------------------------------------------
// Headline-level terms. These are the words that actually appear in authored
// demo slide *titles* ("Submission runway", "submission-ready", "inspection"),
// so swapping them is what makes the numbered slide list change when the user
// picks another division.
// ---------------------------------------------------------------------------

export type HeadlineConcept =
  | "programNoun"
  | "readyAdjective"
  | "runwayNoun"
  | "auditEvent"
  | "auditorRole"
  | "masterNoun"
  | "evidenceNoun"
  | "controlNoun"
  | "scaleNoun";

export type HeadlineLexicon = Record<HeadlineConcept, string>;

export const DIVISION_HEADLINE_TERMS: Record<string, HeadlineLexicon> = {
  globallink: {
    programNoun: "localization program",
    readyAdjective: "launch-ready",
    runwayNoun: "launch runway",
    auditEvent: "brand audit",
    auditorRole: "brand owner",
    masterNoun: "source copy",
    evidenceNoun: "program reporting",
    controlNoun: "quality controls",
    scaleNoun: "market coverage",
  },
  enterprise: {
    programNoun: "content program",
    readyAdjective: "rollout-ready",
    runwayNoun: "rollout runway",
    auditEvent: "program review",
    auditorRole: "executive sponsor",
    masterNoun: "master source",
    evidenceNoun: "program reporting",
    controlNoun: "governance controls",
    scaleNoun: "global coverage",
  },
  lifesci: {
    programNoun: "regulated content program",
    readyAdjective: "submission-ready",
    runwayNoun: "submission runway",
    auditEvent: "inspection",
    auditorRole: "inspector",
    masterNoun: "English master",
    evidenceNoun: "audit trail",
    controlNoun: "risk controls",
    scaleNoun: "filing coverage",
  },
  legal: {
    programNoun: "discovery translation program",
    readyAdjective: "production-ready",
    runwayNoun: "production runway",
    auditEvent: "audit",
    auditorRole: "opposing counsel",
    masterNoun: "source collection",
    evidenceNoun: "chain of custody",
    controlNoun: "privilege controls",
    scaleNoun: "matter coverage",
  },
  media: {
    programNoun: "localization pipeline",
    readyAdjective: "broadcast-ready",
    runwayNoun: "release runway",
    auditEvent: "platform QC review",
    auditorRole: "platform reviewer",
    masterNoun: "master file",
    evidenceNoun: "QC report",
    controlNoun: "compliance controls",
    scaleNoun: "territory coverage",
  },
  gaming: {
    programNoun: "loc and LQA program",
    readyAdjective: "cert-ready",
    runwayNoun: "ship runway",
    auditEvent: "cert submission",
    auditorRole: "platform certifier",
    masterNoun: "source build",
    evidenceNoun: "LQA report",
    controlNoun: "release controls",
    scaleNoun: "region coverage",
  },
  digital: {
    programNoun: "global campaign program",
    readyAdjective: "campaign-ready",
    runwayNoun: "campaign runway",
    auditEvent: "performance review",
    auditorRole: "channel partner",
    masterNoun: "master creative",
    evidenceNoun: "performance reporting",
    controlNoun: "brand controls",
    scaleNoun: "channel coverage",
  },
  "trial-interactive": {
    programNoun: "trial document program",
    readyAdjective: "inspection-ready",
    runwayNoun: "study startup runway",
    auditEvent: "inspection",
    auditorRole: "inspector",
    masterNoun: "controlled master",
    evidenceNoun: "audit trail",
    controlNoun: "quality controls",
    scaleNoun: "site coverage",
  },
  element: {
    programNoun: "brand content program",
    readyAdjective: "brand-ready",
    runwayNoun: "delivery runway",
    auditEvent: "brand review",
    auditorRole: "brand lead",
    masterNoun: "master template",
    evidenceNoun: "usage reporting",
    controlNoun: "brand controls",
    scaleNoun: "team coverage",
  },
};

export function divisionLexicon(slug: string): DivisionLexicon | undefined {
  return DIVISION_LEXICONS[slug];
}

/** Naive plural/singular pair so both forms of a concept swap cleanly. */
function variants(phrase: string): string[] {
  const out = [phrase];
  if (!phrase.endsWith("s")) out.push(pluralize(phrase));
  return out;
}

function pluralize(phrase: string): string {
  if (/(s|x|ch|sh)$/i.test(phrase)) return `${phrase}es`;
  if (/[^aeiou]y$/i.test(phrase)) return `${phrase.slice(0, -1)}ies`;
  return `${phrase}s`;
}

function matchCase(source: string, replacement: string): string {
  // ALL CAPS eyebrow copy.
  if (source === source.toUpperCase() && /[A-Z]{2}/.test(source)) return replacement.toUpperCase();
  // Sentence/Title start.
  if (source[0] === source[0]?.toUpperCase())
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type LexiconRule = { from: string; to: string };

/**
 * Ordered rewrite rules taking `from` division vocabulary to `to` division
 * vocabulary. Longest source phrase first so multi-word terms win.
 */
export function lexiconRules(fromSlug: string, toSlug: string): LexiconRule[] {
  const from = DIVISION_LEXICONS[fromSlug];
  const to = DIVISION_LEXICONS[toSlug];
  if (!from || !to || fromSlug === toSlug) return [];

  const rules: LexiconRule[] = [];
  const push = (src?: string, dst?: string) => {
    if (!src || !dst || src.toLowerCase() === dst.toLowerCase()) return;
    const srcVariants = variants(src);
    const dstVariants = variants(dst);
    srcVariants.forEach((s, i) => {
      rules.push({ from: s, to: dstVariants[i] ?? dst });
    });
  };

  for (const key of Object.keys(from) as DivisionConcept[]) push(from[key], to[key]);

  // Headline terms drive the slide titles the demo page lists.
  const fromHead = DIVISION_HEADLINE_TERMS[fromSlug];
  const toHead = DIVISION_HEADLINE_TERMS[toSlug];
  if (fromHead && toHead) {
    for (const key of Object.keys(fromHead) as HeadlineConcept[]) push(fromHead[key], toHead[key]);
  }

  // Longest first: "country annexes" must be consumed before "country".
  return rules.sort((a, b) => b.from.length - a.from.length);
}

/**
 * Rewrite one string from the source division's domain language into the
 * target division's, preserving the original capitalisation of each match.
 */
export function applyLexicon(text: string, rules: LexiconRule[]): string {
  if (!text || rules.length === 0) return text;
  let out = text;
  for (const rule of rules) {
    const re = new RegExp(`\\b${escapeRegExp(rule.from)}\\b`, "gi");
    out = out.replace(re, (m) => matchCase(m, rule.to));
  }
  return out;
}

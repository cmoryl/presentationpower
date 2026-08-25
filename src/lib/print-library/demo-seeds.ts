// Demo seed content for the blank print templates. This is the single source
// of truth for what a template preview shows AND what "Edit master" opens when
// the shipped master has no saved content yet — so the library preview and the
// master editor always show the exact same document.
import caseStudyHero from "@/assets/case-study-hero.jpg";
import adaptorBriefHero from "@/assets/adaptor-brief-hero.jpg";
import aesopLogo from "@/assets/aesop-logo.svg";
import {
  emptySpotlight,
  emptyEBrochure,
  emptyAdaptorBrief,
  emptyMsaPartnership,
  emptySolutionProposal,
  emptyCaseStudy,
  type SpotlightContent,
  type EBrochureContent,
  type AdaptorBriefContent,
  type MsaPartnershipContent,
  type SolutionProposalContent,
  type CaseStudyContent,
  type PrintAssetKind,
} from "@/lib/print-assets.types";

export const SPOTLIGHT_SEED: SpotlightContent = emptySpotlight({
  eyebrow: "Product spotlight",
  productName: "GlobalLink NEXT",
  tagline: "AI-native translation orchestration built for regulated enterprise pipelines.",
  summary:
    "One platform for continuous localization across web, product, and clinical content — with human review, model routing, and full auditability wired in from day one.",
  capabilities: [
    {
      heading: "Adaptive model routing",
      body: "Route each string to the model / linguist blend that fits its risk and reuse profile — automatically.",
    },
    {
      heading: "In-context QA",
      body: "Live visual QA against staging renders catches truncation, layout, and terminology drift pre-merge.",
    },
    {
      heading: "Regulated workflows",
      body: "Signed audit trails, role-scoped review, and validated environments for life-sciences and financial workloads.",
    },
  ],
  stats: [
    { label: "Languages supported", value: "170", unit: "+" },
    { label: "Faster time-to-market", value: "62", unit: "%" },
    { label: "Enterprise deployments", value: "300", unit: "+" },
  ],
  quote: {
    text: "It stopped feeling like localization and started feeling like release engineering.",
    author: "Head of Global Content",
    role: "Fortune 100 medtech",
  },
  expert: {
    name: "Jordan Reyes",
    role: "Solutions architect · GlobalLink",
    email: "jreyes@transperfect.com",
  },
  cta: { label: "Book a walkthrough", url: "https://transperfect.com" },
});

export const EBROCHURE_SEED: EBrochureContent = emptyEBrochure({
  title: "Helping Global Teams Move Faster with GlobalLink",
  summary:
    "See how a leading technology company streamlined content operations, reduced turnaround times, and improved quality across 35+ markets with GlobalLink AI.",
  sections: [
    {
      heading: "The Challenge",
      body: "Fragmented tools, inconsistent terminology, and slow localization made rapid market expansion hard.",
      bullets: [
        "Disconnected systems and manual processes",
        "Inconsistent brand and terminology",
        "Long turnaround times across markets",
        "Limited visibility into content progress",
      ],
    },
    {
      heading: "Our Approach",
      body: "GlobalLink AI to unify content operations, automate workflows, and embed governance — on-brand content faster, everywhere.",
      bullets: [
        "Unified content orchestration",
        "AI-powered translation + workflow automation",
        "Centralized terminology and governance",
        "Real-time dashboards and reporting",
      ],
    },
    {
      heading: "The Impact",
      body: "Measurable improvements in speed, quality, and efficiency — teams scale global content with confidence.",
      bullets: [
        "3.4× faster time-to-market",
        "48% reduction in localization costs",
        "98% translation quality score",
        "Consistent brand across 35+ markets",
      ],
    },
  ],
  stats: [
    { label: "Global teams empowered", value: "100", unit: "%" },
    { label: "Reduction in localization costs", value: "48", unit: "%" },
    { label: "Translation quality score", value: "98", unit: "%" },
    { label: "Markets supported", value: "35", unit: "+" },
    { label: "Faster time-to-market", value: "3.4", unit: "×" },
  ],
  quote: {
    text: "TransPerfect helped us simplify a complex localization process and free our internal team to focus on higher-value work.",
    author: "Global Content Lead",
    company: "Fortune 100 client",
  },
  cta: {
    label: "See GlobalLink in Action",
    subhead: "Explore how GlobalLink AI can transform your content operations.",
  },
});

export const MSA_SEED: MsaPartnershipContent = emptyMsaPartnership({ partner: "Client" });
export const PROPOSAL_SEED: SolutionProposalContent = emptySolutionProposal();

export const ADAPTOR_SEED: AdaptorBriefContent = emptyAdaptorBrief({
  title: "GlobalLink for Adobe Experience Manager Plus",
  summary:
    "TransPerfect GlobalLink brings people, content, and technology together to help global teams translate, adapt, and deliver with speed and clarity.",
  features: [
    {
      verb: "Supports",
      body: "Adobe AEM 6.5 LTS SP packages with cross-environment compatibility",
    },
    { verb: "Adapts", body: "To any AEM content tree, out-of-the-box or custom" },
    { verb: "Enables", body: "Custom localization for URLs and internal and external links" },
    { verb: "Automates", body: "Translation submission through AEM publishing workflow triggers" },
    { verb: "Triggers", body: "AEM workflows with AI and human oversight" },
    { verb: "Learns", body: "Adaptive forms with dictionaries stored under new path locations" },
  ],
  quote: {
    text: "TransPerfect helped us simplify a complex localization process and free our internal team to focus on higher-value work.",
    author: "Aesop",
  },
  // Same treatment as the case study hero: bundled editorial shot whose left
  // half is empty wall, auto-scrim so the headline resolves light and dark.
  heroMedia: {
    imageUrl: adaptorBriefHero,
    autoScrim: true,
    scrim: "bottom",
    // Shallower than the case study band — the verb-card grid starts high on
    // this layout, so the photo stays a header strip.
    heightPct: 30,
  },
});

// Example hero photo — a bundled, client-ready editorial shot with the whole
// left half held as empty wall so the headline reads cleanly, and even
// mid-tones so the auto-scrim resolves it in both light and dark modes.
const EXAMPLE_HERO_URL = caseStudyHero;

export const CASE_STUDY_SEED: CaseStudyContent = emptyCaseStudy({
  eyebrow: "Client case study",
  client: "Aēsop",
  clientLogoUrl: aesopLogo,
  industry: "Beauty & personal care",
  audience: "Global product knowledge teams",
  summary: "Aēsop's success story in rapid product knowledge localization",
  heroMedia: {
    imageUrl: EXAMPLE_HERO_URL,
    autoScrim: true,
    scrim: "bottom",
    // Trimmed from 46 → 36 so the CTA band and footer links clear the page
    // box instead of overflowing off the bottom.
    heightPct: 36,
  },

  challenge: {
    heading: "The Challenge",
    body: "Aēsop needed to localize hundreds of product knowledge modules — combining technical content, regulatory updates, and training materials — across multiple markets. Their internal team was overloaded with disconnected processes, inconsistent terminology, and manual handoffs that slowed delivery and increased costs.",
  },
  solution: {
    heading: "The Solution",
    body: "TransPerfect's GlobalLink for Adobe Experience Manager Plus unified content, automation, and workflows in one centralized ecosystem. We integrated directly with AEM, automated translation submissions, enforced terminology consistency, and delivered localized modules through a one-click workflow with full visibility and control.",
  },
  result: {
    heading: "The Result",
    body: "Aēsop cut project management time by more than 70% and reduced engineering localization costs by 33%. With automated workflows and centralized governance, their team scaled content delivery across 7 markets — on time, on budget, and with consistent quality.",
  },
  stats: [
    { label: "Project management time reduced", value: "3 mo → 10 days", unit: "" },
    { label: "Reduction in engineering localization costs", value: "33", unit: "%" },
    { label: "Modules rolled out within budget", value: "On Time", unit: "" },
  ],
  quote: {
    text: "TransPerfect helped us simplify a complex localization process and free our internal team to focus on higher-value work.",
    author: "Aēsop",
  },
  cta: {
    label: "See GlobalLink in Action",
    subhead: "Explore how GlobalLink AI can transform your content operations.",
    buttonLabel: "Book a Demo »",
  },
  engagement: {
    title: "Engagement Snapshot",
    bullets: [
      "Trusted Adobe Gold Partner",
      "Deep global content expertise",
      "Hands-on, human partnership",
    ],
  },
  footer: { links: ["transperfect.com/globallink", "globallink@transperfect.com"] },
});

/**
 * The demo seed a template preview falls back to when the library item carries
 * no saved content. The master editor seeds its draft from the same value so
 * "Edit master" opens exactly the document the preview showed.
 */
export function demoSeedForKind(kind: PrintAssetKind): Record<string, unknown> | undefined {
  switch (kind) {
    case "spotlight":
      return SPOTLIGHT_SEED as unknown as Record<string, unknown>;
    case "ebrochure":
      return EBROCHURE_SEED as unknown as Record<string, unknown>;
    case "msa-partnership":
      return MSA_SEED as unknown as Record<string, unknown>;
    case "solution-proposal":
      return PROPOSAL_SEED as unknown as Record<string, unknown>;
    case "adaptor-brief":
      return ADAPTOR_SEED as unknown as Record<string, unknown>;
    case "case-study":
      return CASE_STUDY_SEED as unknown as Record<string, unknown>;
    default:
      return undefined;
  }
}

// Master solution-proposal one-pagers, one per division.
//
// Source: TransPerfect_Solutions_Proposal_Template.pptx (cover block, "What's
// included" scope, source files / deliverables / timeline, cost summary, proof,
// and the account team). Each division gets its own master seed so the scope
// lines, proof metrics and pricing language read natively for that business.
//
// Read-only seeds — "Create editable copy" writes one into `print_assets` for
// the signed-in user via createPrintAsset(), exactly like the case studies and
// spotlights, so admins and users get the full live editing surface.

import { emptySolutionProposal, type SolutionProposalContent } from "@/lib/print-assets.types";

export type SolutionProposalSeed = {
  slug: string;
  title: string;
  /** Short shelf blurb — not part of the printed asset. */
  teaser: string;
  tags: string[];
  collection: string;
  sourceFile: string;
  divisionId: string;
  content: SolutionProposalContent;
};

const SOURCE_FILE = "TransPerfect_Solutions_Proposal_Template.pptx";
const COLLECTION = "Solution proposals";

type DivisionProposal = {
  slug: string;
  divisionId: string;
  title: string;
  teaser: string;
  tags: string[];
  eyebrow: string;
  proposalTitle: string;
  subtitle: string;
  clientName: string;
  summary: string;
  included: Array<{ label: string; icon: string; detail: string }>;
  sourceFiles: string[];
  deliverables: string[];
  timelineNote: string;
  costRows: Array<{ item: string; detail: string; qty: string; price: string }>;
  costNote: string;
  stats: Array<{ label: string; value: string; unit?: string }>;
  quote: { text: string; author: string; role?: string; company?: string };
  nextSteps: string[];
  footerUrl: string;
};

const DIVISION_PROPOSALS: DivisionProposal[] = [
  {
    slug: "legal-solutions-proposal",
    divisionId: "bm-tp-legal",
    title: "Legal Solutions Proposal — Master",
    teaser:
      "Master proposal for legal matters — certified translation, eDiscovery review support, and deposition services with a matter-level cost summary.",
    tags: ["proposal", "legal", "certified translation", "ediscovery", "master"],
    eyebrow: "Legal solutions proposal",
    proposalTitle: "Legal solutions proposal",
    subtitle: "Matter scope, certified deliverables, schedule, and investment",
    clientName: "Client Firm LLP",
    summary:
      "This proposal outlines the scope, certified deliverables, schedule, and investment for the multilingual work supporting your matter. All work is performed by legal-qualified linguists under ISO-certified process controls, with certificates of accuracy issued for every filing-ready deliverable.",
    included: [
      {
        label: "Certified translation",
        icon: "check",
        detail: "Filing-ready translation with a signed certificate of accuracy.",
      },
      {
        label: "eDiscovery support",
        icon: "grid",
        detail: "Foreign-language culling, machine translation, and reviewer support.",
      },
      {
        label: "Deposition services",
        icon: "users",
        detail: "Interpreters, transcription, and certified transcript translation.",
      },
      {
        label: "Matter project management",
        icon: "clock",
        detail: "A single point of contact aligned to your case calendar.",
      },
    ],
    sourceFiles: ["Native document set (PDF / DOCX)", "Exhibit index"],
    deliverables: [
      "Certified translations (PDF + editable)",
      "Certificate of accuracy per deliverable",
      "Bilingual exhibit index",
    ],
    timelineNote:
      "Standard delivery is estimated at X business days from written approval. Court-deadline matters can be accelerated to a rush X-day turnaround with dedicated review capacity.",
    costRows: [
      { item: "Certified translation", detail: "Per word, 1 target language", qty: "0", price: "$0.00" },
      { item: "Certificate of accuracy", detail: "Per document", qty: "0", price: "$0.00" },
      { item: "Deposition interpreting", detail: "Per day, 2 interpreters", qty: "0", price: "$0.00" },
      { item: "Matter project management", detail: "Case oversight", qty: "1", price: "$0.00" },
    ],
    costNote:
      "Pricing is valid for 30 days and assumes final, text-searchable source files. Rush turnaround, additional languages, or scope changes are quoted separately.",
    stats: [
      { label: "Languages supported", value: "200", unit: "+" },
      { label: "Am Law 100 firms served", value: "95", unit: "%" },
      { label: "On-time filing rate", value: "99", unit: "%" },
    ],
    quote: {
      text: "They handle deadline pressure the way our own team does — certified, accurate, and never late to a filing.",
      author: "Litigation Partner",
    },
    nextSteps: [
      "Confirm the document set and target languages",
      "Approve pricing and schedule in writing",
      "Kickoff call with your assigned matter team",
    ],
    footerUrl: "legal.transperfect.com",
  },
  {
    slug: "lifesci-solutions-proposal",
    divisionId: "bm-tp-lifesci",
    title: "Life Sciences Solutions Proposal — Master",
    teaser:
      "Master proposal for regulated life-sciences programs — linguistic validation, submission-ready translation, and eCOA scope with a study-level cost summary.",
    tags: ["proposal", "life sciences", "linguistic validation", "regulatory", "master"],
    eyebrow: "Life sciences solutions proposal",
    proposalTitle: "Life sciences solutions proposal",
    subtitle: "Study scope, regulated deliverables, schedule, and investment",
    clientName: "Sponsor Company",
    summary:
      "This proposal outlines the scope, regulated deliverables, schedule, and investment for the multilingual work supporting your study. Every step is executed under ISO 9001 and ISO 17100 controls with a fully auditable trail suitable for regulatory submission.",
    included: [
      {
        label: "Linguistic validation",
        icon: "check",
        detail: "Dual forward translation, back translation, and cognitive debriefing.",
      },
      {
        label: "Submission translation",
        icon: "language",
        detail: "EMA / FDA-ready translation of protocol and labeling content.",
      },
      {
        label: "eCOA localization",
        icon: "grid",
        detail: "Screen-level localization with device screenshot review.",
      },
      {
        label: "Program management",
        icon: "users",
        detail: "Dedicated study lead with site-level status reporting.",
      },
    ],
    sourceFiles: ["Protocol and ICF set", "Instrument / eCOA source"],
    deliverables: [
      "Validated instrument per locale",
      "Certificates of translation",
      "Linguistic validation report",
    ],
    timelineNote:
      "Standard delivery is estimated at X business days from written approval and source-file freeze. Site-activation critical paths can be accelerated to a rush X-day turnaround.",
    costRows: [
      { item: "Linguistic validation", detail: "Per instrument, per locale", qty: "0", price: "$0.00" },
      { item: "Submission translation", detail: "Per word, per locale", qty: "0", price: "$0.00" },
      { item: "eCOA screen review", detail: "Per screen set", qty: "0", price: "$0.00" },
      { item: "Program management", detail: "Study oversight", qty: "1", price: "$0.00" },
    ],
    costNote:
      "Pricing is valid for 30 days and assumes a frozen source instrument. Protocol amendments, added locales, or additional debriefing rounds are quoted separately.",
    stats: [
      { label: "Languages supported", value: "200", unit: "+" },
      { label: "Studies supported yearly", value: "6", unit: "K+" },
      { label: "On-time delivery", value: "99", unit: "%" },
    ],
    quote: {
      text: "Validation used to be our bottleneck. Now it runs in parallel with startup and we activate sites on schedule.",
      author: "Director, Clinical Operations",
    },
    nextSteps: [
      "Confirm locales and instrument list",
      "Approve pricing and schedule in writing",
      "Kickoff call with your assigned study team",
    ],
    footerUrl: "lifesciences.transperfect.com",
  },
  {
    slug: "media-solutions-proposal",
    divisionId: "bm-tp-media",
    title: "Media Solutions Proposal — Master",
    teaser:
      "Master proposal for media and entertainment titles — subtitling, dubbing, and QC scope with a per-runtime-minute cost summary.",
    tags: ["proposal", "media", "subtitling", "dubbing", "master"],
    eyebrow: "Media solutions proposal",
    proposalTitle: "Media solutions proposal",
    subtitle: "Title scope, localized deliverables, schedule, and investment",
    clientName: "Studio Client",
    summary:
      "This proposal outlines the scope, localized deliverables, schedule, and investment for the media localization work on your title. Deliverables are produced to platform specification and pass full technical and linguistic QC before hand-off.",
    included: [
      {
        label: "Subtitling",
        icon: "language",
        detail: "Timed-text origination and translation to platform spec.",
      },
      {
        label: "Dubbing & voice",
        icon: "chat",
        detail: "Casting, direction, recording, and mix in the target locale.",
      },
      {
        label: "Access services",
        icon: "check",
        detail: "SDH, audio description, and forced-narrative handling.",
      },
      {
        label: "Technical QC",
        icon: "target",
        detail: "Spec conformance, sync, and delivery-package validation.",
      },
    ],
    sourceFiles: ["Mezzanine video file", "As-broadcast script", "Music & effects stems"],
    deliverables: [
      "Timed-text files per locale",
      "Mixed dub tracks per locale",
      "QC report and delivery manifest",
    ],
    timelineNote:
      "Standard delivery is estimated at X business days per runtime hour from asset receipt. Day-and-date releases can be accelerated to a rush X-day turnaround.",
    costRows: [
      { item: "Subtitling", detail: "Per runtime minute, per locale", qty: "0", price: "$0.00" },
      { item: "Dubbing", detail: "Per runtime minute, per locale", qty: "0", price: "$0.00" },
      { item: "Technical QC", detail: "Per delivered package", qty: "0", price: "$0.00" },
      { item: "Project management", detail: "Title oversight", qty: "1", price: "$0.00" },
    ],
    costNote:
      "Pricing is valid for 30 days and assumes conformed picture and complete audio stems. Picture changes, added locales, or re-records are quoted separately.",
    stats: [
      { label: "Languages supported", value: "200", unit: "+" },
      { label: "Runtime hours yearly", value: "80", unit: "K+" },
      { label: "First-pass QC rate", value: "98", unit: "%" },
    ],
    quote: {
      text: "Every locale landed on the same day with no spec rejections. That is not normal for a launch this size.",
      author: "VP, Global Distribution",
    },
    nextSteps: [
      "Confirm locales, runtime, and platform spec",
      "Approve pricing and schedule in writing",
      "Asset hand-off and kickoff with your title team",
    ],
    footerUrl: "media.transperfect.com",
  },
  {
    slug: "games-solutions-proposal",
    divisionId: "bm-tp-games",
    title: "Gaming Solutions Proposal — Master",
    teaser:
      "Master proposal for game titles — localization, LQA, and voice production scope with a build-cycle cost summary.",
    tags: ["proposal", "gaming", "localization", "lqa", "master"],
    eyebrow: "Gaming solutions proposal",
    proposalTitle: "Gaming solutions proposal",
    subtitle: "Title scope, build deliverables, schedule, and investment",
    clientName: "Studio Client",
    summary:
      "This proposal outlines the scope, build deliverables, schedule, and investment for the localization and QA work on your title. Work runs in sprint cadence against your build pipeline so localized builds ship alongside the source version.",
    included: [
      {
        label: "Game localization",
        icon: "language",
        detail: "In-context string translation with a maintained termbase.",
      },
      {
        label: "Localization QA",
        icon: "check",
        detail: "On-device linguistic and functional pass with bug reporting.",
      },
      {
        label: "Voice production",
        icon: "chat",
        detail: "Casting, direction, recording, and audio delivery per locale.",
      },
      {
        label: "Culturalization",
        icon: "globe-alt",
        detail: "Age-rating and market compliance review per territory.",
      },
    ],
    sourceFiles: ["String tables (XLIFF / CSV)", "Playable build", "Voice script"],
    deliverables: [
      "Localized string tables per locale",
      "LQA bug report per build",
      "Delivered voice assets per locale",
    ],
    timelineNote:
      "Standard delivery is estimated at X business days per build cycle from string freeze. Launch-window titles can be accelerated to a rush X-day turnaround.",
    costRows: [
      { item: "Localization", detail: "Per word, per locale", qty: "0", price: "$0.00" },
      { item: "Localization QA", detail: "Per tester day", qty: "0", price: "$0.00" },
      { item: "Voice production", detail: "Per recorded hour", qty: "0", price: "$0.00" },
      { item: "Project management", detail: "Title oversight", qty: "1", price: "$0.00" },
    ],
    costNote:
      "Pricing is valid for 30 days and assumes a stable build and frozen strings. Added locales, re-records, or extra QA cycles are quoted separately.",
    stats: [
      { label: "Languages supported", value: "200", unit: "+" },
      { label: "Titles shipped", value: "1.5", unit: "K+" },
      { label: "On-time build delivery", value: "99", unit: "%" },
    ],
    quote: {
      text: "Localized builds now ship in the same window as the source build. Our launch calendar finally holds.",
      author: "Head of Publishing",
    },
    nextSteps: [
      "Confirm locales, word count, and build cadence",
      "Approve pricing and schedule in writing",
      "Pipeline hand-off and kickoff with your title team",
    ],
    footerUrl: "gaming.transperfect.com",
  },
  {
    slug: "globallink-solutions-proposal",
    divisionId: "bm-product",
    title: "GlobalLink Solutions Proposal — Master",
    teaser:
      "Master proposal for GlobalLink technology deployments — connector integration, workflow configuration, and managed translation with a platform cost summary.",
    tags: ["proposal", "globallink", "technology", "integration", "master"],
    eyebrow: "GlobalLink solutions proposal",
    proposalTitle: "GlobalLink solutions proposal",
    subtitle: "Platform scope, integration deliverables, schedule, and investment",
    clientName: "Client Company",
    summary:
      "This proposal outlines the scope, integration deliverables, schedule, and investment for your GlobalLink deployment. Content flows from your existing systems through connector-based automation, removing manual hand-off from every translation cycle.",
    included: [
      {
        label: "Connector integration",
        icon: "grid",
        detail: "Connect your CMS, PIM, or repository to GlobalLink.",
      },
      {
        label: "Workflow configuration",
        icon: "target",
        detail: "Automated routing, approvals, and locale rules.",
      },
      {
        label: "Managed translation",
        icon: "language",
        detail: "Ongoing translation with translation-memory leverage.",
      },
      {
        label: "Enablement & support",
        icon: "users",
        detail: "Admin training, documentation, and named support contact.",
      },
    ],
    sourceFiles: ["System inventory and locale matrix", "API / connector credentials"],
    deliverables: [
      "Configured GlobalLink instance",
      "Live connector per source system",
      "Admin runbook and training session",
    ],
    timelineNote:
      "Standard deployment is estimated at X business days from written approval and credential access. Phased rollouts can be accelerated to a rush X-day pilot.",
    costRows: [
      { item: "Platform subscription", detail: "Annual, per environment", qty: "1", price: "$0.00" },
      { item: "Connector implementation", detail: "Per source system", qty: "0", price: "$0.00" },
      { item: "Managed translation", detail: "Per word, per locale", qty: "0", price: "$0.00" },
      { item: "Program management", detail: "Deployment oversight", qty: "1", price: "$0.00" },
    ],
    costNote:
      "Pricing is valid for 30 days and assumes standard connector scope. Custom development, added environments, or extra locales are quoted separately.",
    stats: [
      { label: "Languages supported", value: "200", unit: "+" },
      { label: "Faster time-to-market", value: "3.4", unit: "x" },
      { label: "Manual hand-off removed", value: "90", unit: "%" },
    ],
    quote: {
      text: "We went from spreadsheets and email to a pipeline that just runs. Nobody touches a file by hand anymore.",
      author: "Director of Digital Operations",
    },
    nextSteps: [
      "Confirm source systems and locale matrix",
      "Approve pricing and deployment schedule in writing",
      "Technical discovery call with your solutions architect",
    ],
    footerUrl: "globallink.transperfect.com",
  },
  {
    slug: "digital-solutions-proposal",
    divisionId: "bm-tp-digital",
    title: "Digital Solutions Proposal — Master",
    teaser:
      "Master proposal for global digital marketing programs — multilingual SEO, campaign transcreation, and website localization with a channel cost summary.",
    tags: ["proposal", "digital", "seo", "transcreation", "master"],
    eyebrow: "Digital solutions proposal",
    proposalTitle: "Digital solutions proposal",
    subtitle: "Channel scope, campaign deliverables, schedule, and investment",
    clientName: "Client Company",
    summary:
      "This proposal outlines the scope, campaign deliverables, schedule, and investment for your global digital program. Every market is briefed from local search demand rather than a translated version of the source campaign.",
    included: [
      {
        label: "Multilingual SEO",
        icon: "trending",
        detail: "In-market keyword research, mapping, and on-page guidance.",
      },
      {
        label: "Campaign transcreation",
        icon: "star",
        detail: "Locally written ad, email, and social copy per market.",
      },
      {
        label: "Website localization",
        icon: "globe-alt",
        detail: "Proxy or connector-based site translation with QA.",
      },
      {
        label: "Performance reporting",
        icon: "grid",
        detail: "Per-market reporting against agreed KPIs.",
      },
    ],
    sourceFiles: ["Source campaign assets", "Analytics and keyword access"],
    deliverables: [
      "Per-market keyword and content map",
      "Transcreated campaign asset set",
      "Localized landing pages and QA report",
    ],
    timelineNote:
      "Standard delivery is estimated at X business days from written approval and asset receipt. In-flight campaigns can be accelerated to a rush X-day turnaround.",
    costRows: [
      { item: "Multilingual SEO", detail: "Per market", qty: "0", price: "$0.00" },
      { item: "Transcreation", detail: "Per asset, per market", qty: "0", price: "$0.00" },
      { item: "Website localization", detail: "Per word, per locale", qty: "0", price: "$0.00" },
      { item: "Program management", detail: "Campaign oversight", qty: "1", price: "$0.00" },
    ],
    costNote:
      "Pricing is valid for 30 days and assumes final source creative. Added markets, extra concept rounds, or paid media spend are quoted separately.",
    stats: [
      { label: "Markets supported", value: "170", unit: "+" },
      { label: "Organic traffic lift", value: "2.8", unit: "x" },
      { label: "Faster campaign launch", value: "60", unit: "%" },
    ],
    quote: {
      text: "Local teams stopped rewriting our campaigns because the copy finally sounded like it was written for their market.",
      author: "Global Head of Marketing",
    },
    nextSteps: [
      "Confirm markets, channels, and KPIs",
      "Approve pricing and schedule in writing",
      "Kickoff call with your assigned campaign team",
    ],
    footerUrl: "transperfect.com",
  },
];

function seedFor(d: DivisionProposal): SolutionProposalSeed {
  return {
    slug: d.slug,
    title: d.title,
    teaser: d.teaser,
    tags: d.tags,
    collection: COLLECTION,
    sourceFile: SOURCE_FILE,
    divisionId: d.divisionId,
    content: emptySolutionProposal({
      eyebrow: d.eyebrow,
      title: d.proposalTitle,
      subtitle: d.subtitle,
      summary: d.summary,
      preparedFor: {
        label: "Prepared for:",
        contact: "Client Contact",
        role: "Title",
        company: d.clientName,
        address1: "Address One",
        address2: "City, State Zip",
        email: "contact@client.com",
      },
      preparedBy: {
        label: "Prepared by:",
        contact: "Account Director",
        role: "Title",
        company: "TransPerfect",
        address1: "1250 Broadway, 32nd Floor",
        address2: "New York, NY 10001",
        email: "proposals@transperfect.com",
      },
      dateLabel: "MM.DD.YY",
      included: d.included,
      sourceFiles: d.sourceFiles,
      deliverables: d.deliverables,
      timelineNote: d.timelineNote,
      costRows: d.costRows,
      costTotalLabel: "Total investment",
      costTotal: "$0.00",
      costNote: d.costNote,
      stats: d.stats,
      quote: d.quote,
      team: [
        { name: "First Last", role: "Account Director", office: "New York", email: "email@transperfect.com" },
        { name: "First Last", role: "Program Manager", office: "London", email: "email@transperfect.com" },
        { name: "First Last", role: "Solutions Architect", office: "Barcelona", email: "email@transperfect.com" },
      ],
      nextSteps: d.nextSteps,
      contacts: { ctaLabel: "Questions?", ctaEmail: "proposals@transperfect.com" },
      footerUrl: d.footerUrl,
    }),
  };
}

export const SOLUTION_PROPOSALS: SolutionProposalSeed[] = DIVISION_PROPOSALS.map(seedFor);

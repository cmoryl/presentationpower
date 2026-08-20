// MULTI-PAGE SOLUTION PROPOSAL MASTERS
// ---------------------------------------------------------------------------
// Source: TransPerfect_Solutions_Proposal_Template_1.pptx (15 slides).
// Each division's single-page proposal master (SOLUTION_PROPOSALS) is expanded
// into the full multi-page document: cover, by-the-numbers, scope, cost,
// global footprint, clients, success stories, why TransPerfect, advocates,
// meet-the-team, team bios and a closing summary.
//
// These are read-only seeds. "Use template" copies one into `print_assets`,
// where every page string is editable in the live asset editor exactly like
// the case studies and spotlights.

import type { MultiProposalPage, SolutionProposalContent } from "@/lib/print-assets.types";
import {
  SOLUTION_PROPOSALS,
  type SolutionProposalSeed,
} from "@/lib/print-library/solution-proposals";

const SOURCE_FILE = "TransPerfect_Solutions_Proposal_Template_1.pptx";
const COLLECTION = "Solution proposals — multi-page";

const GLOBAL_LOCATIONS: MultiProposalPage["locations"] = [
  {
    region: "Americas",
    offices: [
      "New York",
      "Boston",
      "Chicago",
      "Los Angeles",
      "San Francisco",
      "Toronto",
      "Mexico City",
      "São Paulo",
    ],
  },
  {
    region: "EMEA",
    offices: [
      "London",
      "Dublin",
      "Paris",
      "Barcelona",
      "Madrid",
      "Berlin",
      "Zurich",
      "Stockholm",
      "Dubai",
    ],
  },
  {
    region: "APAC",
    offices: ["Tokyo", "Seoul", "Shanghai", "Hong Kong", "Singapore", "Sydney", "Bangalore"],
  },
];

const FOOTPRINT_STATS = [
  { label: "Offices worldwide", value: "140", unit: "+" },
  { label: "Languages supported", value: "200", unit: "+" },
  { label: "Linguists in network", value: "20", unit: "k+" },
];

// Slide 2 — the seven figures in the source template's own order.
const COMPANY_STATS = [
  { label: "IN GLOBAL REVENUE", value: "$1.3B", unit: "" },
  { label: "CONSECUTIVE\nYEARS OF GROWTH", value: "34", unit: "" },
  { label: "SERVICE", value: "24/7/365", unit: "" },
  { label: "CITIES WORLDWIDE", value: "150+", unit: "" },
  { label: "OF THE FORTUNE 500", value: "90%", unit: "" },
  { label: "TEAM MEMBERS", value: "10,000+", unit: "" },
  { label: "LANGUAGES SUPPORTED", value: "200+", unit: "" },
];

/** Slide 8 — `*runs*` render in the template's accent. */
const WHY_LINES = [
  "UNMATCHED *GLOBAL SCALE* & RESOURCES",
  "GLOBAL *REACH*, LOCAL *FOCUS*",
  "PROVEN *RECORD OF SUCCESS*",
  "*TECHNOLOGY* SOLUTIONS",
  "*FLEXIBLE* AND *SCALABLE*",
  "INDUSTRY *EXPERTISE*",
];

const CLIENT_LOGOS = [
  "Lufthansa",
  "Lavazza",
  "Nestlé",
  "Pfizer",
  "Amazon",
  "Sony",
  "Chanel",
  "Deloitte",
  "Bayer",
  "Cisco",
  "Ford",
  "HSBC",
];

const WHY_CARDS = [
  {
    title: "One partner, every language",
    icon: "globe-alt",
    body: "200+ languages, 140+ offices, and a single accountable program team — no vendor patchwork to manage.",
  },
  {
    title: "Technology you already use",
    icon: "grid",
    body: "GlobalLink connectors plug into your CMS, PIM, and commerce stack so content moves without manual handoffs.",
  },
  {
    title: "Quality you can evidence",
    icon: "check",
    body: "ISO 9001, 17100, and 18587 certified processes with auditable linguistic QA on every deliverable.",
  },
  {
    title: "Security by design",
    icon: "target",
    body: "ISO 27001 information security, SOC 2 controls, and client-dedicated environments where required.",
  },
  {
    title: "Scale on demand",
    icon: "clock",
    body: "20,000+ vetted linguists and 24/7 production coverage absorb peak volume without schedule slip.",
  },
  {
    title: "Measurable economics",
    icon: "star",
    body: "Translation memory, terminology and AI acceleration compound savings release over release.",
  },
];

const ADVOCATE_CARDS = [
  {
    title: "Named program lead",
    body: "A single accountable director owns your scope, schedule, and escalation path end to end.",
    meta: "Governance",
  },
  {
    title: "Quarterly business reviews",
    body: "Volume, quality, spend and savings reviewed against agreed KPIs every quarter.",
    meta: "Reporting",
  },
  {
    title: "Dedicated linguist pods",
    body: "The same vetted linguists stay on your account so voice and terminology hold over time.",
    meta: "Continuity",
  },
];

const SUCCESS_QUOTES = [
  {
    headline: "Lufthansa — seamless Adobe Experience Manager integration",
    text: "My team at Lufthansa has come back to me with two major findings when it comes to the TransPerfect solution: one is that it's seamlessly integrating with our Adobe Experience Manager suite, which is a huge advantage for us. And the second is that it's just a very smooth and easy-running process — nothing compared to the manual processes we used before.",
    author: "Head of E-Commerce",
    company: "Lufthansa",
  },
  {
    headline: "GlobalLink helps Lavazza deliver content in 37 languages across 45 countries",
    text: "Thanks to the seamless integration of TransPerfect's GlobalLink with Adobe Experience Manager and SAP Commerce Cloud, our localization costs were reduced by 47% and turnaround times accelerated drastically.",
    author: "Global Head of Digital Marketing",
    company: "Lavazza",
  },
];

const BIO_PLACEHOLDER =
  "Add a short biography here — years of experience, relevant industry programs, languages, and the part of your program this person owns day to day. Two to four sentences reads best on the printed page.";

/**
 * Expand a single-page proposal master into the 12-page document.
 * Content that already exists on the one-pager (scope, cost rows, stats,
 * quote, team) is reused so both masters stay in lockstep per division.
 */
export function multiPagesFor(content: SolutionProposalContent): MultiProposalPage[] {
  const team = content.team ?? [];
  return [
    {
      id: "p-cover",
      kind: "cover",
      navLabel: "Cover",
      eyebrow: "Transforming Global Performance",
      title: "SOLUTIONS PROPOSAL",
      subtitle: "[insert client logo here]",
      body: content.summary,
      footnote: "MM.DD.YY",
      cards: [
        {
          title: "PREPARED FOR:",
          body: "Client Contact\nTitle\nCompany Name\nAddress One\nCity, Zip\nClient Email",
        },
        {
          title: "PREPARED BY:",
          body: "Contact\nTitle\nTransPerfect\nAddress One\nCity, Zip\nYour Email",
        },
      ],
    },
    {
      id: "p-stats",
      kind: "stats",
      navLabel: "By the numbers",
      eyebrow: "Who we are",
      title: "Value.\nIntelligence.\nPerformance.\nIn any language.",
      body: "The largest privately held provider of language and technology solutions — funded by operations, not outside capital, for three decades of consecutive profitability.",
      stats: COMPANY_STATS,
    },
    {
      id: "p-scope",
      kind: "scope",
      navLabel: "Scope",
      eyebrow: "Scope of work",
      title: "Project Scope",
      subtitle: "TIMELINE",
      body: "The services below are in scope for this engagement, with the source files, deliverables, and schedule agreed for this phase.",
      cards: [
        {
          title: content.includedTitle || "What's included",
          body: (content.included ?? []).length
            ? content.included
                .map((item) => (item.detail ? `${item.label} — ${item.detail}` : item.label))
                .join("\n")
            : "Language Pre-Flight\nLocalization\nDesktop Publishing\nProject Management",
        },
        {
          title: content.sourceFilesTitle || "Source Files",
          body: (content.sourceFiles ?? ["1 PDF Document"]).join("\n"),
        },
        {
          title: content.deliverablesTitle || "Deliverables",
          body: (content.deliverables ?? ["1 PDF Document", "1 Certificate"]).join("\n"),
        },
      ],

      bullets: [
        "Project timeline is estimated at X business days.",
        "CLIENT has requested a rush X-day turnaround time.",
      ],
    },
    {
      id: "p-cost",
      kind: "cost",
      navLabel: "Cost summary",
      eyebrow: "Investment",
      title: content.costTitle || "Cost Summary",
      body: "Pricing is itemized per service so scope changes are transparent and easy to approve.",
      costRows: content.costRows,
      costTotal: content.costTotal,
      costTotalLabel: content.costTotalLabel ?? "Total investment",
      costNote: content.costNote,
    },
    {
      id: "p-locations",
      kind: "locations",
      navLabel: "Global footprint",
      eyebrow: "Global footprint",
      title: "Global\nLocations",
      body: "Production runs follow-the-sun across our own offices — no outsourced coordination layer between you and the linguists doing the work.",
      stats: FOOTPRINT_STATS,
      locations: GLOBAL_LOCATIONS,
    },
    {
      id: "p-clients",
      kind: "clients",
      navLabel: "Clients",
      eyebrow: "Trusted by",
      title: "Our\nclients.",
      subtitle: "We're proud of the company we keep",
      body: "A representative sample of the client organizations we support across regulated, retail, and technology sectors.",
      logos: CLIENT_LOGOS,
    },
    {
      id: "p-stories",
      kind: "success-stories",
      navLabel: "Success stories",
      eyebrow: "Proof",
      title: "Success Stories",
      quotes: [
        ...SUCCESS_QUOTES,
        ...(content.quote?.text
          ? [
              {
                headline: "From this program",
                text: content.quote.text,
                author: content.quote.author,
                role: content.quote.role,
                company: content.quote.company,
              },
            ]
          : []),
      ].slice(0, 3),
    },
    {
      id: "p-stories-grid",
      kind: "stories-grid",
      navLabel: "Story cards",
      eyebrow: "Proof",
      title: "Client\nstories.",
      subtitle: "Three programs, three integration paths, one delivery model.",
      quotes: [
        ...SUCCESS_QUOTES,
        ...(content.quote?.text
          ? [
              {
                headline: "From this program",
                text: content.quote.text,
                author: content.quote.author,
                role: content.quote.role,
                company: content.quote.company,
              },
            ]
          : []),
      ].slice(0, 3),
    },
    {
      id: "p-story-feature",
      kind: "story-feature",
      navLabel: "Featured story",
      eyebrow: "Featured engagement",
      title: "Featured story",
      quotes: SUCCESS_QUOTES.slice(0, 1),
      stats: (content.stats ?? []).slice(0, 3),
    },
    {
      id: "p-stories-quotes",
      kind: "stories-quotes",
      navLabel: "Quote wall",
      title: "In their\nwords.",
      quotes: [
        ...SUCCESS_QUOTES,
        ...(content.quote?.text
          ? [
              {
                text: content.quote.text,
                author: content.quote.author,
                role: content.quote.role,
                company: content.quote.company,
              },
            ]
          : []),
      ].slice(0, 4),
      footnote: "Reference calls available on request.",
    },
    {
      id: "p-why",
      kind: "why",
      navLabel: "Why TransPerfect",
      eyebrow: "Why TransPerfect",
      title: "WHY",
      bullets: WHY_LINES,
      cards: WHY_CARDS,
    },
    {
      id: "p-advocates",
      kind: "advocates",
      navLabel: "Advocates",
      eyebrow: "Your advocates",
      title: "Giving Back",
      subtitle: "We are proud to support these causes",
      body: "Every account is run by named people with published KPIs — governance is part of the deliverable, not an afterthought.",
      cards: [
        { title: "Advocacy", body: "Updates" },
        { title: "Our Affinity Groups", body: "Are growing" },
        ...ADVOCATE_CARDS,
      ],
    },
    {
      id: "p-team-grid",
      kind: "team-grid",
      navLabel: "Meet the team",
      eyebrow: "Meet the team",
      title: content.teamTitle || "Meet the Team",
      body: "The people assigned to your program, with direct contact details.",
      team: team.length
        ? team
        : [
            {
              name: "First Last",
              role: "Title",
              office: "Office",
              email: "email@transperfect.com",
            },
            {
              name: "First Last",
              role: "Title",
              office: "Office",
              email: "email@transperfect.com",
            },
            {
              name: "First Last",
              role: "Title",
              office: "Office",
              email: "email@transperfect.com",
            },
          ],
    },
    {
      id: "p-team-bio",
      kind: "team-bio",
      navLabel: "Team bios",
      eyebrow: "Meet the team",
      title: "Biographies",
      team: (team.length ? team : [{ name: "First Last", role: "Title" }]).slice(0, 2).map((m) => ({
        ...m,
        phone: "+1 000 000 0000",
        bio: BIO_PLACEHOLDER,
      })),
    },
    {
      id: "p-team-cards",
      kind: "team-cards",
      navLabel: "Team cards",
      eyebrow: "Meet the team",
      title: content.teamTitle || "Meet the Team",
      body: "Headshot cards for the core delivery pod — drop in photos in the editor.",
      team: team.length
        ? team
        : [
            {
              name: "First Last",
              role: "Title",
              office: "Office",
              email: "email@transperfect.com",
            },
            {
              name: "First Last",
              role: "Title",
              office: "Office",
              email: "email@transperfect.com",
            },
            {
              name: "First Last",
              role: "Title",
              office: "Office",
              email: "email@transperfect.com",
            },
          ],
    },
    {
      id: "p-team-leads",
      kind: "team-leads",
      navLabel: "Engagement leads",
      eyebrow: "Meet the team",
      title: "Your engagement leads",
      body: "Your two points of escalation, available across your time zones.",
      team: (team.length ? team : [{ name: "First Last", role: "Title" }])
        .slice(0, 2)
        .map((m) => ({ ...m, phone: "+1 000 000 0000", bio: BIO_PLACEHOLDER })),
    },
    {
      id: "p-team-wall",
      kind: "team-wall",
      navLabel: "Team wall",
      eyebrow: "Meet the team",
      title: "Your global team",
      subtitle: "Named owners in every region running your program around the clock.",
      team: team.length
        ? team
        : Array.from({ length: 8 }, () => ({
            name: "First Last",
            role: "Title",
            office: "Office",
          })),
    },
    {
      id: "p-summary",
      kind: "summary",
      navLabel: "Summary",
      eyebrow: "Summary",
      title: "Next steps",
      body: "Confirm the items below and we can begin production within one business day of written approval.",
      bullets: content.nextSteps ?? [
        "Confirm scope, languages, and volumes",
        "Approve pricing and schedule in writing",
        "Kickoff call with your assigned program team",
      ],
      footnote: "Pricing valid for 30 days from the date on the cover.",
    },
  ];
}

export type MultiSolutionProposalSeed = {
  slug: string;
  title: string;
  teaser: string;
  tags: string[];
  collection: string;
  sourceFile: string;
  divisionId: string;
  content: SolutionProposalContent;
};

function toMultiSeed(seed: SolutionProposalSeed): MultiSolutionProposalSeed {
  const content: SolutionProposalContent = {
    ...seed.content,
    docMode: "multi",
    pages: multiPagesFor(seed.content),
  };
  return {
    slug: `${seed.slug}-multipage`,
    title: seed.title.replace(/—\s*Master$/, "").trim() + " — Multi-page Master",
    teaser: `Full multi-page proposal — cover, by-the-numbers, scope, cost, footprint, clients, success stories, why TransPerfect, advocates, and team bios. ${seed.teaser}`,
    tags: [...seed.tags, "multi-page"],
    collection: COLLECTION,
    sourceFile: SOURCE_FILE,
    divisionId: seed.divisionId,
    content,
  };
}

export const MULTI_SOLUTION_PROPOSALS: MultiSolutionProposalSeed[] =
  SOLUTION_PROPOSALS.map(toMultiSeed);

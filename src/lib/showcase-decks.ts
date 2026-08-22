// ---------------------------------------------------------------------------
// Homepage showcase decks.
//
// Fully authored, ready-to-ship example decks (real copy, real numbers, real
// style pack) that the homepage "Finished examples" gallery links to. Each one
// expands into an editable deck through `createDeckFromTemplate`, exactly like
// the NEXT palette showcase — nothing here is a mock: every slide is a real
// section/variant/layout triple with production copy.
// ---------------------------------------------------------------------------

import type { TemplatePayload } from "./deck-store";
import { EXTRA_SHOWCASE_DECKS } from "./showcase-decks-extra";
import type { ShowcaseDeckDef } from "./showcase-decks-types";

export type { ShowcaseDeckDef };


/* ------------------------------------------------------------------ */
/* 1. GlobalLink enterprise localization — executive pitch            */
/* ------------------------------------------------------------------ */

function buildGlobalLinkPitch(): TemplatePayload {
  const slides: TemplatePayload["slides"] = [
    {
      sectionId: "SF-01",
      variantId: "MV-OP-COVER-MEDIA",
      layoutId: "LF-05",
      content: {
        clientName: "Northwind Retail Group",
        title: "One content engine, 41 markets",
        titleEmphasis: "41 markets",
        subtitle: "A GlobalLink program review for the FY27 growth plan.",
        date: "Q1 FY27",
        mediaSeed: "globallink-cover-city",
      },
      notes: "Cover — full-bleed media. Open on the market count, not the platform.",
    },
    {
      sectionId: "SF-01",
      variantId: "MV-OP-AGENDA-VERTICAL",
      layoutId: "LF-13",
      content: {
        title: "What we'll cover",
        items: [
          { label: "Where content slows down", body: "Four handoffs, six tools, no single owner." },
          { label: "The GlobalLink model", body: "Connectors, translation memory, and one review lane." },
          { label: "Proof from your sector", body: "Retail programs at the same catalogue depth." },
          { label: "Commercials", body: "Cost per market and the reuse curve over 24 months." },
          { label: "The first 90 days", body: "Pilot markets, owners, and go-live gates." },
        ],
      },
      notes: "Agenda — five beats, 22 minutes.",
    },
    {
      sectionId: "SF-04",
      variantId: "MV-CTX-CARDS-2",
      layoutId: "LF-04",
      content: {
        title: "Where the program stalls",
        items: [
          {
            title: "Content waits on people",
            body: "Every launch asset is emailed between merchandising, agency, and legal. Median wait before a translator ever opens the file: 6.4 days.",
          },
          {
            title: "Nothing gets reused",
            body: "Three agencies keep three memories. The same 180 product descriptions were paid for twice last year across EMEA and APAC.",
          },
        ],
      },
      notes: "Frame the cost of the status quo before naming the platform.",
    },
    {
      sectionId: "SF-06",
      variantId: "MV-PROC-BEFORE-AFTER-SPLIT",
      layoutId: "LF-15",
      content: {
        title: "Before and after GlobalLink",
        before: {
          label: "Today",
          items: [
            { label: "Six tools", body: "PIM, CMS, DAM, email, spreadsheets, agency portal." },
            { label: "Manual handoffs", body: "Four owners touch a string before it ships." },
            { label: "No reuse", body: "Memory is split across three agencies." },
          ],
        },
        after: {
          label: "With GlobalLink",
          items: [
            { label: "One lane", body: "Connectors pull from PIM and CMS on publish." },
            { label: "Shared memory", body: "One TM, one glossary, one review queue." },
            { label: "Measured", body: "Cost per market visible to finance weekly." },
          ],
        },
        hub: {
          title: "GlobalLink",
          lines: ["Connect", "Translate", "Review", "Publish"],
        },
        summary: {
          lead: "Same team, same calendar —",
          emphasis: "half the elapsed time",
        },
      },
      notes: "The single most-quoted slide. Keep the hub lines to four verbs.",
    },
    {
      sectionId: "SF-07",
      variantId: "MV-SOL-PILLARS-4",
      layoutId: "LF-10",
      content: {
        title: "Four moving parts",
        items: [
          { title: "Connectors", body: "Certified links into your PIM, CMS, and support desk." },
          { title: "Translation memory", body: "One shared memory across every market and vendor." },
          { title: "In-context review", body: "Local teams approve on the live page, not in a doc." },
          { title: "Program analytics", body: "Cost, throughput, and quality per market, weekly." },
        ],
      },
      notes: "Architecture without the diagram — four nouns your CFO can repeat.",
    },
    {
      sectionId: "SF-08",
      variantId: "MV-PROOF-STATS-4",
      layoutId: "LF-10",
      content: {
        title: "What programs like yours see",
        items: [
          { value: 52, unit: "%", label: "Faster time to market on launch content" },
          { value: 31, unit: "%", label: "Lower cost per translated word by year two" },
          { value: 94, unit: "%", label: "First-pass approval after in-context review" },
          { value: 41, unit: "markets", label: "Live on one shared memory" },
        ],
      },
      notes: "Sourced from the FY26 retail program benchmark.",
    },
    {
      sectionId: "SF-08",
      variantId: "MV-INFO-DONUT",
      layoutId: "LF-31",
      content: {
        title: "Where the effort goes today",
        centerValue: 6.4,
        centerUnit: "days",
        centerLabel: "Median wait before work starts",
        items: [
          { label: "Chasing files and approvals", value: 38, note: "Email threads between merchandising, agency, and legal." },
          { label: "Re-translating known content", value: 27, note: "Strings that already exist in another market's memory." },
          { label: "Formatting and QA rework", value: 21, note: "Layout breaks found after the file is back." },
          { label: "Actual translation", value: 14, note: "The only step anyone was billed to think about." },
        ],
      },
      notes: "Only 14% of the elapsed time is the work itself.",
    },
    {
      sectionId: "SF-08",
      variantId: "MV-PROOF-TESTIMONIAL",
      layoutId: "LF-03",
      content: {
        quote:
          "We stopped negotiating deadlines with three agencies and started publishing on the same day in every market. The reuse alone paid for the first year.",
        attribution: "Global Content Director",
        role: "Retail",
        metric: "18 markets live in 11 weeks",
      },
      notes: "Anonymized reference — approved for external use.",
    },
    {
      sectionId: "SF-10",
      variantId: "MV-PROC-TIMELINE",
      layoutId: "LF-14",
      content: {
        title: "The first 90 days",
        items: [
          { label: "Weeks 1–2", body: "Connector setup, memory import, glossary sign-off." },
          { label: "Weeks 3–6", body: "Pilot in DE, FR, JP. Baseline measured live." },
          { label: "Weeks 7–10", body: "Review lanes handed to local marketing owners." },
          { label: "Weeks 11–13", body: "Rollout plan for the remaining 38 markets." },
        ],
      },
      notes: "Three pilot markets chosen for catalogue depth, not size.",
    },
    {
      sectionId: "SF-13",
      variantId: "MV-PROOF-STATS-3",
      layoutId: "LF-08",
      content: {
        title: "Commercial shape",
        items: [
          { value: 24, unit: "months", label: "Term with an opt-out at month 12" },
          { value: 3, unit: "markets", label: "Pilot scope before any rollout commitment" },
          { value: 0, unit: "setup", label: "Connector build included in the program fee" },
        ],
      },
      notes: "Keep the number of commercial slides to one.",
    },
    {
      sectionId: "SF-16",
      variantId: "MV-CLOSE-CTA",
      layoutId: "LF-24",
      content: {
        message: "Start with three markets",
        nextSteps:
          "1. Confirm pilot markets (DE, FR, JP). 2. Connector access for PIM and CMS. 3. Import existing memory from all three agencies.",
        owner: "Program lead — GlobalLink Enterprise",
        followUp: "Baseline report at week six, rollout decision at week thirteen.",
      },
      notes: "Close on the smallest committed step.",
    },
  ];

  return {
    title: "GlobalLink · Enterprise localization pitch (demo)",
    brandModeId: "bm-globallink",
    archetypeId: "arch-problem-solution",
    context: { stylePackId: "skin-s06", designRecipeId: "R04", defaultTransition: { type: "fade", durationMs: 420 } },
    slides,
    brief: {
      prospect: "Northwind Retail Group",
      industry: "Retail & e-commerce",
      audience: "CMO, Global Content Director, Finance",
      meetingObjective: "Win a three-market pilot for the FY27 content program",
      lengthTarget: slides.length,
      clientFacts: "41 markets, three incumbent agencies, catalogue-heavy launch calendar.",
    },
  };
}

/* ------------------------------------------------------------------ */
/* 2. Life Sciences regulated content program                          */
/* ------------------------------------------------------------------ */

function buildLifeSciencesProgram(): TemplatePayload {
  const slides: TemplatePayload["slides"] = [
    {
      sectionId: "SF-01",
      variantId: "MV-OP-COVER-MEDIA",
      layoutId: "LF-05",
      content: {
        clientName: "Meridian Therapeutics",
        title: "Regulated content, submission-ready",
        titleEmphasis: "submission-ready",
        subtitle: "A Life Sciences content program for the MERIDIAN-3 global filing.",
        date: "March 2027",
        mediaSeed: "lifesci-cover-lab",
      },
      notes: "Cover — lab media, restrained type. Audience is regulatory, not marketing.",
    },
    {
      sectionId: "SF-01",
      variantId: "MV-OP-AGENDA-VERTICAL",
      layoutId: "LF-13",
      content: {
        title: "Agenda",
        items: [
          { label: "The filing calendar", body: "Nine authorities, one dossier, fixed dates." },
          { label: "Where risk enters", body: "Version drift between country annexes." },
          { label: "Our program", body: "Linguistic validation, QC, and audit trail." },
          { label: "Evidence", body: "Inspection outcomes across 60+ filings." },
          { label: "Governance", body: "Named owners, SLAs, and escalation." },
        ],
      },
      notes: "Agenda — regulatory audiences want the calendar first.",
    },
    {
      sectionId: "SF-04",
      variantId: "MV-CTX-CARDS-2",
      layoutId: "LF-04",
      content: {
        title: "The real risk",
        items: [
          {
            title: "Version drift",
            body: "Country annexes are edited locally after the master is locked. By submission week nobody can prove which English source each translation came from.",
          },
          {
            title: "Evidence gaps",
            body: "Linguistic validation exists, but the trail lives in inboxes. An inspector's question becomes a two-week reconstruction exercise.",
          },
        ],
      },
      notes: "Name risk in the inspector's language.",
    },
    {
      sectionId: "SF-07",
      variantId: "MV-SOL-PILLARS-4",
      layoutId: "LF-10",
      content: {
        title: "Program design",
        items: [
          { title: "Locked sources", body: "Every translation is bound to a versioned English master." },
          { title: "Linguistic validation", body: "Clinician review and cognitive debriefing on patient-facing text." },
          { title: "Two-stage QC", body: "Independent back-translation plus terminology audit." },
          { title: "Audit trail", body: "Every step timestamped, exportable for inspection." },
        ],
      },
      notes: "Four pillars map one-to-one to the SOP annex.",
    },
    {
      sectionId: "SF-10",
      variantId: "MV-PROC-TIMELINE",
      layoutId: "LF-14",
      content: {
        title: "Submission runway",
        items: [
          { label: "T-16 weeks", body: "Master lock, terminology baseline, reviewer panel named." },
          { label: "T-10 weeks", body: "Country annex translation and clinician review." },
          { label: "T-5 weeks", body: "Back-translation, QC reconciliation, sign-off." },
          { label: "T-1 week", body: "Dossier assembly and audit pack export." },
        ],
      },
      notes: "Dates are gates, not estimates.",
    },
    {
      sectionId: "SF-08",
      variantId: "MV-PROOF-STATS-4",
      layoutId: "LF-10",
      content: {
        title: "Track record",
        items: [
          { value: 61, unit: "filings", label: "Global submissions supported since 2019" },
          { value: 0, unit: "findings", label: "Translation-related inspection findings" },
          { value: 27, unit: "languages", label: "Under active linguistic validation" },
          { value: 99.7, unit: "%", label: "On-time delivery against filing gates" },
        ],
      },
      notes: "Zero findings is the headline — say it plainly.",
    },
    {
      sectionId: "SF-08",
      variantId: "MV-PROOF-TESTIMONIAL",
      layoutId: "LF-03",
      content: {
        quote:
          "During the inspection we exported the full trail in an afternoon. The question closed the same day — that had never happened before.",
        attribution: "VP Regulatory Affairs",
        role: "Biotech",
        metric: "Inspection question closed in one day",
      },
      notes: "Anonymized reference — approved for external use.",
    },
    {
      sectionId: "SF-14",
      variantId: "MV-PROOF-STATS-3",
      layoutId: "LF-08",
      content: {
        title: "Risk controls",
        items: [
          { value: 2, unit: "stage QC", label: "Back-translation plus terminology audit" },
          { value: 100, unit: "%", label: "Steps captured in the audit trail" },
          { value: 4, unit: "hours", label: "Median time to produce an inspection pack" },
        ],
      },
      notes: "Controls slide — keep to three, all measurable.",
    },
    {
      sectionId: "SF-15",
      variantId: "MV-CLOSE-CTA",
      layoutId: "LF-24",
      content: {
        message: "Lock the master, then start",
        nextSteps:
          "1. Confirm the English master version. 2. Approve the reviewer panel per market. 3. Sign the terminology baseline.",
        owner: "Program lead — TransPerfect Life Sciences",
        followUp: "Runway review at T-16 with regulatory and medical writing.",
      },
      notes: "Close on the gate, not the signature.",
    },
  ];

  return {
    title: "Life Sciences · Regulated content program (demo)",
    brandModeId: "bm-tp-lifesci",
    archetypeId: "arch-problem-solution",
    context: { stylePackId: "skin-s14", designRecipeId: "R08", defaultTransition: { type: "fade", durationMs: 560 } },
    slides,
    brief: {
      prospect: "Meridian Therapeutics",
      industry: "Life Sciences",
      audience: "VP Regulatory Affairs, Medical Writing, Quality",
      meetingObjective: "Be selected as content partner for the MERIDIAN-3 global filing",
      lengthTarget: slides.length,
      clientFacts: "Nine authorities, 27 languages, fixed submission gates.",
    },
  };
}

/* ------------------------------------------------------------------ */

export const SHOWCASE_DECKS: ShowcaseDeckDef[] = [
  {
    id: "globallink-enterprise-pitch",
    name: "Enterprise localization pitch",
    eyebrow: "GlobalLink",
    blurb:
      "Eleven-slide executive pitch: cost of the status quo, before/after hub, benchmark stats, 90-day runway and a single commercial slide.",
    accent: "#003FC7",
    divisionLabel: "GlobalLink Enterprise",
    deckTitle: "GlobalLink · Enterprise localization pitch (demo)",
    highlights: [
      "Authored copy on every slide — no lorem, no placeholders",
      "Before/after hub, donut breakdown and four-up proof stats",
      "Style pack + industry ground already selected",
      "Opens editable: swap the client, keep the narrative",
    ],
    build: buildGlobalLinkPitch,
  },
  {
    id: "lifesci-regulated-program",
    name: "Regulated content program",
    eyebrow: "Life Sciences",
    blurb:
      "Nine-slide regulatory program review built for inspection: locked sources, two-stage QC, submission runway and audit-trail evidence.",
    accent: "#EC388A",
    divisionLabel: "TransPerfect Life Sciences",
    deckTitle: "Life Sciences · Regulated content program (demo)",
    highlights: [
      "Written for regulatory and quality audiences",
      "Submission runway expressed as gates, not estimates",
      "Zero-findings evidence with anonymized reference quote",
      "Opens editable: retarget to any filing calendar",
    ],
    build: buildLifeSciencesProgram,
  },
  ...EXTRA_SHOWCASE_DECKS,
];


export function getShowcaseDeck(id: string): ShowcaseDeckDef | undefined {
  return SHOWCASE_DECKS.find((d) => d.id === id);
}

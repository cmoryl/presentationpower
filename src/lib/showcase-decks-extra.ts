// ---------------------------------------------------------------------------
// Additional homepage showcase decks (Legal, Gaming, Digital).
//
// Same contract as `showcase-decks.ts`: fully authored `TemplatePayload`
// builders with production copy, real numbers and a pinned style pack. They are
// appended to SHOWCASE_DECKS so the gallery, the /demo/deck pages and the
// division retargeting engine pick them up with no extra wiring.
// ---------------------------------------------------------------------------

import type { TemplatePayload } from "./deck-store";
import type { ShowcaseDeckDef } from "./showcase-decks-types";
import { enrichShowcasePayload } from "./showcase-enrich";

/* ------------------------------------------------------------------ */
/* Legal · multilingual eDiscovery review program                      */
/* ------------------------------------------------------------------ */

function buildLegalEdiscovery(): TemplatePayload {
  const slides: TemplatePayload["slides"] = [
    {
      sectionId: "SF-01",
      variantId: "MV-OP-COVER-MEDIA",
      layoutId: "LF-05",
      content: {
        clientName: "Halden & Roth LLP",
        title: "Review 2.4M documents in nine languages",
        titleEmphasis: "nine languages",
        subtitle: "A managed review program for the CROSS-BORDER matter.",
        date: "Filing window: Q4",
        mediaSeed: "legal-cover-courthouse",
      },
      notes: "Cover — lead on volume and languages, not on the platform name.",
    },
    {
      sectionId: "SF-01",
      variantId: "MV-OP-AGENDA-VERTICAL",
      layoutId: "LF-13",
      content: {
        title: "What we'll cover",
        items: [
          { label: "The matter as it stands", body: "Volume, custodians, languages, deadline." },
          { label: "Where cost escapes", body: "Linear review of documents nobody needed." },
          { label: "Our review model", body: "Culling, GenAI triage, native-language reviewers." },
          { label: "Defensibility", body: "Sampling, QC rates and the audit record." },
          { label: "Budget and gates", body: "Cost per document and the stop points." },
        ],
      },
      notes: "Agenda — counsel wants deadline and defensibility first.",
    },
    {
      sectionId: "SF-04",
      variantId: "MV-CTX-CARDS-2",
      layoutId: "LF-04",
      content: {
        title: "Where the budget goes today",
        items: [
          {
            title: "Everything gets reviewed",
            body: "Without early culling and language triage, associates read 2.4M documents at a linear rate. On the current burn the matter exceeds budget five weeks before the filing date.",
          },
          {
            title: "Language is treated last",
            body: "Foreign-language documents get queued for translation after review, so responsiveness calls are made twice on the same document.",
          },
        ],
      },
      notes: "Frame cost and risk before naming any tooling.",
    },
    {
      sectionId: "SF-06",
      variantId: "MV-PROC-BEFORE-AFTER-SPLIT",
      layoutId: "LF-15",
      content: {
        title: "Before and after managed review",
        arrowStyle: "echo",
        before: {
          label: "Linear review",
          items: [
            { label: "2.4M docs", body: "Every document read at least once." },
            { label: "Serial translation", body: "Language handled after responsiveness." },
            { label: "Flat QC", body: "Second-pass review of the whole corpus." },
          ],
        },
        after: {
          label: "Managed review",
          items: [
            { label: "310K docs", body: "Culling, dedupe and threading before human eyes." },
            { label: "Native reviewers", body: "Language handled inside the first pass." },
            { label: "Targeted QC", body: "Statistical sampling on the coded set." },
          ],
        },
        hub: {
          title: "Review lane",
          lines: ["Cull", "Triage", "Review", "Certify"],
        },
        summary: {
          lead: "Same defensibility standard —",
          emphasis: "87% fewer documents reviewed",
        },
      },
      notes: "The slide counsel repeats to the client. Keep hub verbs to four.",
    },
    {
      sectionId: "SF-07",
      variantId: "MV-SOL-PILLARS-4",
      layoutId: "LF-10",
      content: {
        title: "Four moving parts",
        items: [
          {
            title: "Early case assessment",
            body: "Dedupe, threading and date culling before review starts.",
          },
          {
            title: "GenAI triage",
            body: "Ranked responsiveness with human validation on every batch.",
          },
          {
            title: "Native-language reviewers",
            body: "Attorneys reviewing in the document's own language.",
          },
          {
            title: "Defensible record",
            body: "Sampling rates, QC results and decisions logged per batch.",
          },
        ],
      },
      notes: "Four nouns that survive a Rule 26 conference.",
    },
    {
      sectionId: "SF-07",
      variantId: "MV-IMG-SPLIT",
      layoutId: "LF-03",
      content: {
        title: "Review at defensible speed",
        body: "Multilingual reviewers work in one platform with the same tags, the same privilege calls and a full audit trail behind every decision.",
        caption: "Managed review, multilingual team",
        mediaSeed: "legal-review-floor",
      },
      notes: "Image-forward beat — gives the eye a rest between the model and the numbers.",
    },
    {
      sectionId: "SF-08",
      variantId: "MV-PROOF-STATS-4",
      layoutId: "LF-10",
      content: {
        title: "What matters at this scale see",
        items: [
          { value: 87, unit: "%", label: "Reduction in documents reaching human review" },
          { value: 63, unit: "%", label: "Lower cost per reviewed document" },
          { value: 9, unit: "languages", label: "Reviewed in-language, first pass" },
          { value: 99.1, unit: "%", label: "Recall against the validation sample" },
        ],
      },
      notes: "Recall is the number opposing counsel will test.",
    },
    {
      sectionId: "SF-08",
      variantId: "MV-INFO-DONUT",
      layoutId: "LF-31",
      content: {
        title: "Where the corpus goes",
        centerValue: 310,
        centerUnit: "K",
        centerLabel: "Documents actually reviewed",
        items: [
          {
            label: "Deduplicated and threaded",
            value: 41,
            note: "Exact and near-duplicate families collapsed.",
          },
          { label: "Outside the date range", value: 24, note: "Culled against the agreed scope." },
          { label: "Ranked non-responsive", value: 22, note: "Validated by sampled human review." },
          { label: "Human review set", value: 13, note: "Coded by native-language attorneys." },
        ],
      },
      notes: "Only 13% of the corpus needs an attorney.",
    },
    {
      sectionId: "SF-08",
      variantId: "MV-PROOF-TESTIMONIAL",
      layoutId: "LF-03",
      content: {
        quote:
          "The sampling record answered the challenge in one filing. We spent the hearing on the merits instead of on our own process.",
        attribution: "Partner, cross-border disputes",
        role: "Am Law 100 firm",
        metric: "Challenge resolved in one filing",
      },
      notes: "Anonymized reference — approved for external use.",
    },
    {
      sectionId: "SF-10",
      variantId: "MV-PROC-TIMELINE",
      layoutId: "LF-14",
      content: {
        title: "Review runway",
        items: [
          { label: "Week 1", body: "Ingest, dedupe, threading, culling report to counsel." },
          { label: "Weeks 2–3", body: "Triage model trained and validated on a seeded sample." },
          { label: "Weeks 4–9", body: "First-pass review, native language, rolling QC." },
          { label: "Week 10", body: "Privilege log, production set and defensibility pack." },
        ],
      },
      notes: "Each week ends in a deliverable counsel can file.",
    },
    {
      sectionId: "SF-13",
      variantId: "MV-PROOF-STATS-3",
      layoutId: "LF-08",
      content: {
        title: "Commercial shape",
        items: [
          { value: 310, unit: "K docs", label: "Committed review scope after culling" },
          { value: 10, unit: "weeks", label: "From ingest to production set" },
          { value: 1, unit: "rate card", label: "One blended rate across all nine languages" },
        ],
      },
      notes: "One commercial slide, three numbers.",
    },
    {
      sectionId: "SF-16",
      variantId: "MV-CLOSE-CTA",
      layoutId: "LF-24",
      content: {
        message: "Start with the culling report",
        nextSteps:
          "1. Load the first custodian tranche. 2. Agree the date and language scope. 3. Approve the seeded validation sample.",
        owner: "Program lead — TransPerfect Legal",
        followUp: "Culling report and revised budget within five business days.",
      },
      notes: "Close on the cheapest reversible step.",
    },
  ];

  return {
    title: "Legal · Multilingual eDiscovery review (demo)",
    brandModeId: "bm-tp-legal",
    archetypeId: "arch-problem-solution",
    context: {
      // Deck default look — division accent comes from the brand mode only.
      stylePackId: null,
      designRecipeId: null,
      defaultTransition: { type: "fade", durationMs: 480 },
    },
    slides,
    brief: {
      prospect: "Halden & Roth LLP",
      industry: "Legal",
      audience: "Litigation partner, eDiscovery counsel, client GC",
      meetingObjective: "Win the managed review mandate for the CROSS-BORDER matter",
      lengthTarget: slides.length,
      clientFacts: "2.4M documents, nine languages, fixed filing window, budget already at risk.",
    },
  };
}

/* ------------------------------------------------------------------ */
/* Gaming · simultaneous global launch                                 */
/* ------------------------------------------------------------------ */

function buildGamingLaunch(): TemplatePayload {
  const slides: TemplatePayload["slides"] = [
    {
      sectionId: "SF-01",
      variantId: "MV-OP-COVER-MEDIA",
      layoutId: "LF-05",
      content: {
        clientName: "Ninefold Interactive",
        title: "Ship day one in 14 languages",
        titleEmphasis: "day one",
        subtitle: "A simultaneous launch plan for ORBITFALL across PC and console.",
        date: "Launch: November",
        mediaSeed: "gaming-cover-studio",
      },
      notes: "Cover — day-one parity is the promise. Keep it loud and short.",
    },
    {
      sectionId: "SF-01",
      variantId: "MV-OP-AGENDA-VERTICAL",
      layoutId: "LF-13",
      content: {
        title: "Run of show",
        items: [
          {
            label: "The launch constraint",
            body: "Cert dates, not translation, set the calendar.",
          },
          { label: "What breaks sim-ship", body: "Late strings, unbaked VO, no LQA time." },
          { label: "The pipeline", body: "Continuous localization straight from your build." },
          { label: "Proof", body: "Titles shipped at the same scope and cadence." },
          { label: "Plan", body: "Milestones tied to your cert submissions." },
        ],
      },
      notes: "Agenda — producers care about cert dates above all.",
    },
    {
      sectionId: "SF-04",
      variantId: "MV-CTX-CARDS-2",
      layoutId: "LF-04",
      content: {
        title: "Why sim-ship slips",
        items: [
          {
            title: "Strings arrive after content lock",
            body: "Late-stage narrative changes land in the final six weeks, when there is no schedule left for recording, QA or cert resubmission.",
          },
          {
            title: "LQA is the first thing cut",
            body: "Without playthrough testing in-language, day-one reviews find truncated UI and mismatched voice lines — in the markets you localized for.",
          },
        ],
      },
      notes: "Both cards are things the producer has personally lived.",
    },
    {
      sectionId: "SF-07",
      variantId: "MV-SOL-PILLARS-4",
      layoutId: "LF-10",
      content: {
        title: "The pipeline",
        items: [
          {
            title: "Build-connected strings",
            body: "Localization pulls from your repo on every merge.",
          },
          { title: "Voice at scale", body: "Casting, direction and recording in 8 dub languages." },
          { title: "In-game LQA", body: "Native testers playing real builds, not spreadsheets." },
          {
            title: "Cert-aware scheduling",
            body: "Every milestone anchored to your submission dates.",
          },
        ],
      },
      notes: "Four pillars, all mapped to a milestone the producer already tracks.",
    },
    {
      sectionId: "SF-07",
      variantId: "MV-IMG-SPLIT",
      layoutId: "LF-03",
      content: {
        title: "Localized on the nightly build",
        body: "Voice, text and LQA run against the same build the dev team ships, so a broken string is caught the morning it appears — not at cert.",
        caption: "Sim-ship LQA floor",
        mediaSeed: "gaming-nightly-lqa",
      },
      notes: "Image-forward beat — gives the eye a rest between the model and the numbers.",
    },
    {
      sectionId: "SF-08",
      variantId: "MV-PROOF-STATS-4",
      layoutId: "LF-10",
      content: {
        title: "What sim-ship titles see",
        items: [
          { value: 14, unit: "languages", label: "Text parity at launch" },
          { value: 8, unit: "dubs", label: "Full voice localization recorded in parallel" },
          { value: 41, unit: "%", label: "Higher day-one revenue outside English markets" },
          { value: 0, unit: "resubs", label: "Localization-caused cert resubmissions" },
        ],
      },
      notes: "Zero resubmissions is the number that ends the debate.",
    },
    {
      sectionId: "SF-08",
      variantId: "MV-PROOF-TESTIMONIAL",
      layoutId: "LF-03",
      content: {
        quote:
          "We changed dialogue nine days before cert and still shipped every language on the same date. Nobody on the team believed that was possible.",
        attribution: "Executive Producer",
        role: "AAA studio",
        metric: "14 languages, one launch date",
      },
      notes: "Anonymized reference — approved for external use.",
    },
    {
      sectionId: "SF-10",
      variantId: "MV-PROC-TIMELINE",
      layoutId: "LF-14",
      content: {
        title: "Launch runway",
        items: [
          { label: "T-20 weeks", body: "Repo connected, glossary and character bible locked." },
          { label: "T-14 weeks", body: "Casting approved, first VO block recorded." },
          { label: "T-8 weeks", body: "Rolling LQA on nightly builds in all 14 languages." },
          { label: "T-3 weeks", body: "Cert packs, store copy and marketing beats delivered." },
        ],
      },
      notes: "Milestones expressed against cert, not against calendar dates.",
    },
    {
      sectionId: "SF-13",
      variantId: "MV-PROOF-STATS-3",
      layoutId: "LF-08",
      content: {
        title: "Commercial shape",
        items: [
          { value: 14, unit: "languages", label: "In scope for text at one blended rate" },
          { value: 8, unit: "dubs", label: "Voice languages priced per recorded hour" },
          { value: 2, unit: "patches", label: "Post-launch localization drops included" },
        ],
      },
      notes: "Include the post-launch patches — that is where surprises live.",
    },
    {
      sectionId: "SF-16",
      variantId: "MV-CLOSE-CTA",
      layoutId: "LF-24",
      content: {
        message: "Connect the repo this sprint",
        nextSteps:
          "1. Read-only repo access for the string pipeline. 2. Lock the character bible. 3. Confirm the cert submission dates for all platforms.",
        owner: "Program lead — TransPerfect Gaming",
        followUp: "First string sync and LQA plan inside two weeks.",
      },
      notes: "Close on an engineering task, not a signature.",
    },
  ];

  return {
    title: "Gaming · Simultaneous global launch (demo)",
    brandModeId: "bm-tp-games",
    archetypeId: "arch-problem-solution",
    context: {
      // Deck default look — division accent comes from the brand mode only.
      stylePackId: null,
      designRecipeId: null,
      defaultTransition: { type: "push-left", durationMs: 420 },
    },
    slides,
    brief: {
      prospect: "Ninefold Interactive",
      industry: "Gaming",
      audience: "Executive Producer, Loc Manager, Publishing",
      meetingObjective: "Own sim-ship localization for ORBITFALL",
      lengthTarget: slides.length,
      clientFacts: "AAA title, 14 text languages, 8 dubs, multi-platform cert.",
    },
  };
}

/* ------------------------------------------------------------------ */
/* Digital · web and campaign localization                             */
/* ------------------------------------------------------------------ */

function buildDigitalGrowth(): TemplatePayload {
  const slides: TemplatePayload["slides"] = [
    {
      sectionId: "SF-01",
      variantId: "MV-OP-COVER-MEDIA",
      layoutId: "LF-05",
      content: {
        clientName: "Lumen Health",
        title: "Every market gets the good version",
        titleEmphasis: "the good version",
        subtitle: "Web, campaign and lifecycle localization for the FY27 growth plan.",
        date: "FY27 planning",
        mediaSeed: "digital-cover-studio",
      },
      notes: "Cover — the pain is quality drift, not translation cost.",
    },
    {
      sectionId: "SF-01",
      variantId: "MV-OP-AGENDA-VERTICAL",
      layoutId: "LF-13",
      content: {
        title: "Agenda",
        items: [
          { label: "The growth target", body: "Six new markets, same content team." },
          { label: "What's leaking", body: "Paid spend against untranslated landing pages." },
          { label: "The model", body: "One source, market-aware variants, measured." },
          { label: "Proof", body: "Conversion lift on localized funnels." },
          { label: "Plan", body: "Two-market pilot inside one quarter." },
        ],
      },
      notes: "Agenda — this is a performance conversation.",
    },
    {
      sectionId: "SF-04",
      variantId: "MV-CTX-CARDS-2",
      layoutId: "LF-04",
      content: {
        title: "Where growth spend leaks",
        items: [
          {
            title: "Ads land on English pages",
            body: "Paid campaigns run in six languages and 38% of clicks arrive on an English landing page. The market never sees the offer in its own words.",
          },
          {
            title: "Local teams rewrite everything",
            body: "Regional marketers rebuild pages by hand in the CMS, so brand, claims and SEO drift market by market with no review lane.",
          },
        ],
      },
      notes: "Both numbers came from the client's own analytics export.",
    },
    {
      sectionId: "SF-07",
      variantId: "MV-SOL-PILLARS-4",
      layoutId: "LF-10",
      content: {
        title: "How the model works",
        items: [
          { title: "CMS connector", body: "Pages and components localized in place, on publish." },
          {
            title: "Market-aware copy",
            body: "Transcreated headlines, local proof, local claims.",
          },
          { title: "Multilingual SEO", body: "Keyword mapping and hreflang handled per market." },
          { title: "Measured funnels", body: "Conversion tracked per language, not per region." },
        ],
      },
      notes: "Four pillars — each one maps to a metric on the next slide.",
    },
    {
      sectionId: "SF-07",
      variantId: "MV-IMG-SPLIT",
      layoutId: "LF-03",
      content: {
        title: "Copy that lands in-market",
        body: "Local growth writers work from the same brief as the source campaign, so headlines convert instead of translating. Every variant ships with its own search terms already checked.",
        caption: "Digital campaign studio",
        mediaSeed: "digital-inmarket-copy",
      },
      notes: "Image-forward beat — gives the eye a rest between the model and the numbers.",
    },
    {
      sectionId: "SF-08",
      variantId: "MV-PROOF-STATS-4",
      layoutId: "LF-10",
      content: {
        title: "What localized funnels return",
        items: [
          { value: 34, unit: "%", label: "Lift in localized landing page conversion" },
          { value: 28, unit: "%", label: "Lower cost per acquisition in new markets" },
          { value: 2.6, unit: "x", label: "Organic traffic growth in year one" },
          { value: 6, unit: "markets", label: "Live on one publishing lane" },
        ],
      },
      notes: "Lead with conversion; CAC is the number finance repeats.",
    },
    {
      sectionId: "SF-08",
      variantId: "MV-INFO-DONUT",
      layoutId: "LF-31",
      content: {
        title: "Where paid clicks land today",
        centerValue: 38,
        centerUnit: "%",
        centerLabel: "Clicks landing in the wrong language",
        items: [
          {
            label: "English landing page",
            value: 38,
            note: "Localized ad, non-localized destination.",
          },
          {
            label: "Partially localized page",
            value: 21,
            note: "Hero translated, proof and forms in English.",
          },
          { label: "Localized, off-brand", value: 17, note: "Rewritten locally with no review." },
          { label: "Fully localized", value: 24, note: "The only path that converts at target." },
        ],
      },
      notes: "Only a quarter of paid spend lands on a page that can convert.",
    },
    {
      sectionId: "SF-08",
      variantId: "MV-PROOF-TESTIMONIAL",
      layoutId: "LF-03",
      content: {
        quote:
          "We stopped translating pages and started shipping campaigns. The German funnel now outperforms our home market on conversion rate.",
        attribution: "VP Growth Marketing",
        role: "Health technology",
        metric: "German funnel beats home market",
      },
      notes: "Anonymized reference — approved for external use.",
    },
    {
      sectionId: "SF-10",
      variantId: "MV-PROC-TIMELINE",
      layoutId: "LF-14",
      content: {
        title: "The first quarter",
        items: [
          { label: "Weeks 1–2", body: "CMS connector, glossary, tone guide per market." },
          { label: "Weeks 3–5", body: "Pilot funnels live in DE and ES with tracking in place." },
          { label: "Weeks 6–9", body: "Paid and lifecycle assets localized against the pilot." },
          {
            label: "Weeks 10–12",
            body: "Readout, then rollout plan for the remaining four markets.",
          },
        ],
      },
      notes: "Pilot ends in a readout, not a renewal conversation.",
    },
    {
      sectionId: "SF-13",
      variantId: "MV-PROOF-STATS-3",
      layoutId: "LF-08",
      content: {
        title: "Commercial shape",
        items: [
          { value: 2, unit: "markets", label: "Pilot scope before any rollout commitment" },
          { value: 12, unit: "weeks", label: "To a measured conversion readout" },
          { value: 0, unit: "build fee", label: "Connector setup included in the program" },
        ],
      },
      notes: "Keep commercials to one slide and one page of terms.",
    },
    {
      sectionId: "SF-16",
      variantId: "MV-CLOSE-CTA",
      layoutId: "LF-24",
      content: {
        message: "Pilot DE and ES this quarter",
        nextSteps:
          "1. CMS access for the connector. 2. Share the paid landing page inventory. 3. Agree the conversion baseline per market.",
        owner: "Program lead — TransPerfect Digital",
        followUp: "Baseline confirmed in week two, readout at week twelve.",
      },
      notes: "Close on the two-market pilot, nothing bigger.",
    },
  ];

  return {
    title: "Digital · Web and campaign localization (demo)",
    brandModeId: "bm-tp-digital",
    archetypeId: "arch-problem-solution",
    context: {
      // Deck default look — division accent comes from the brand mode only.
      stylePackId: null,
      designRecipeId: null,
      defaultTransition: { type: "fade", durationMs: 400 },
    },
    slides,
    brief: {
      prospect: "Lumen Health",
      industry: "Digital marketing",
      audience: "VP Growth, Head of Web, Regional marketing leads",
      meetingObjective: "Win a two-market localization pilot for the FY27 growth plan",
      lengthTarget: slides.length,
      clientFacts: "Six target markets, paid-heavy acquisition, single global CMS.",
    },
  };
}

export const EXTRA_SHOWCASE_DECKS: ShowcaseDeckDef[] = [
  {
    id: "legal-ediscovery-review",
    name: "Multilingual eDiscovery review",
    eyebrow: "Legal",
    blurb:
      "Eleven-slide managed review pitch: culling economics, GenAI triage with human validation, defensibility record and a ten-week runway.",
    accent: "#3BBEB6",
    divisionLabel: "TransPerfect Legal",
    deckTitle: "Legal · Multilingual eDiscovery review (demo)",
    highlights: [
      "Written for litigation counsel — defensibility before features",
      "Corpus donut showing only 13% reaching human review",
      "Recall and QC numbers opposing counsel can test",
      "Opens editable: swap the matter, keep the argument",
    ],
    build: () => enrichShowcasePayload(buildLegalEdiscovery(), "legal"),
  },
  {
    id: "gaming-sim-ship-launch",
    name: "Simultaneous global launch",
    eyebrow: "Gaming",
    blurb:
      "Nine-slide sim-ship plan: 14 text languages, 8 dubs, cert-aware milestones and in-game LQA on nightly builds.",
    accent: "#4ADE80",
    divisionLabel: "TransPerfect Gaming",
    deckTitle: "Gaming · Simultaneous global launch (demo)",
    highlights: [
      "Milestones anchored to cert submissions, not calendar dates",
      "Zero localization-caused resubmissions as the headline proof",
      "Voice, text and LQA scoped on one slide",
      "Opens editable: retarget to any title or platform mix",
    ],
    build: () => enrichShowcasePayload(buildGamingLaunch(), "gaming"),
  },
  {
    id: "digital-growth-localization",
    name: "Web and campaign localization",
    eyebrow: "Digital",
    blurb:
      "Ten-slide growth pitch: where paid spend leaks, market-aware copy, multilingual SEO and a measured two-market pilot.",
    accent: "#C2A3FF",
    divisionLabel: "TransPerfect Digital",
    deckTitle: "Digital · Web and campaign localization (demo)",
    highlights: [
      "Framed as performance marketing, not translation",
      "Paid-click donut: only 24% land on a page that can convert",
      "Conversion, CAC and organic lift on one proof slide",
      "Opens editable: drop in your own funnel baseline",
    ],
    build: () => enrichShowcasePayload(buildDigitalGrowth(), "digital"),
  },
];

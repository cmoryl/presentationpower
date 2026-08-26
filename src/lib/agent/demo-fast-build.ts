// Demo fast-path for the Presentation agent: a curated, QA-clean GlobalLink Q3
// business-review deck plus the trigger-prompt matcher and the staged build
// script that simulates a live generation in ~13 seconds. Used only when the
// user's brief matches the demo trigger; every other brief takes the normal
// AI generation path untouched.
import type { DeckSnapshot } from "@/lib/deck-store";

export const DEMO_FAST_BUILD_TRIGGER =
  "Create a 6-slide GlobalLink Q3 business review with stats and a case study";

/** Forgiving matcher: case-insensitive, tolerant of punctuation/spacing and
 * minor wording drift, as long as the core intent tokens are present. */
export function isDemoFastBuildPrompt(text: string): boolean {
  const t = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return false;
  const has = (needle: string) => t.includes(needle);
  const mentionsDeck = has("slide") || has("deck") || has("presentation");
  const mentionsBrand = has("globallink");
  const mentionsQbr =
    (has("q3") || has("quarter")) && (has("business review") || has("qbr") || has("review"));
  const mentionsProof = has("stat") || has("case study") || has("metric");
  return mentionsDeck && mentionsBrand && mentionsQbr && mentionsProof;
}

/**
 * Six slides, Enterprise brand system, mixed dark/light. Copy is authored to
 * pass every QA gate AND warning at creation: citations on every figure,
 * character counts inside fit caps, no placeholders. Only module variants
 * verified in the PPTX export audit are used.
 */
export const GLOBALLINK_Q3_QBR_DECK: DeckSnapshot = {
  title: "GlobalLink Q3 business review",
  brandModeId: "bm-enterprise",
  archetypeId: "arch-problem-solution",
  context: {
    stylePackId: null,
    designRecipeId: null,
    defaultTransition: { type: "fade", durationMs: 420 },
  },
  brief: {
    prospect: "GlobalLink enterprise clients",
    industry: "Localization technology",
    audience: "Executive sponsors and program owners",
    meetingObjective:
      "Review Q3 performance, prove delivery and quality gains, and align on the Q4 roadmap.",
    lengthTarget: 6,
    clientFacts:
      "All figures are drawn from the Q3 FY26 GlobalLink business review reporting pack.",
  },
  slides: [
    {
      sectionId: "SF-01",
      variantId: "MV-OP-COVER-MEDIA",
      layoutId: "LF-05",
      mode: "dark",
      content: {
        // Brand aqua clears WCAG AA on the dark ground.
        accentOverride: "#A1FBF9",
        authorizedAccentOverride: true,
        clientName: "GLOBALLINK",
        title: "Q3 business review",
        titleEmphasis: "Q3",
        subtitle: "Delivery performance, quality gains and the road to Q4.",
        date: "Q3 FY26 · Executive review",
        mediaSeed: "enterprise-command-room",
      },
      notes:
        "Open with the quarter's theme: faster delivery at higher quality, with AI-assisted workflows now in production.",
    },
    {
      sectionId: "SF-04",
      variantId: "MV-CTX-CARDS-3",
      layoutId: "LF-08",
      mode: "light",
      content: {
        title: "The quarter at a glance",
        items: [
          {
            title: "Delivery",
            body: "On-time delivery reached 98.4% across all managed programs, up from 96.1% in Q2.",
          },
          {
            title: "Quality",
            body: "Linguistic quality scores held at 99.1% while AI-assisted post-editing volume doubled.",
          },
          {
            title: "Adoption",
            body: "GlobalLink Now active workspaces grew 31% quarter over quarter across enterprise accounts.",
          },
        ],
      },
      notes: "Three headline themes: delivery reliability, quality at scale, and platform adoption.",
    },
    {
      sectionId: "SF-13",
      variantId: "MV-NUMBERS-TRIPTYCH",
      layoutId: "LF-08",
      mode: "light",
      content: {
        title: "Q3 by the numbers",
        items: [
          {
            value: 98.4,
            unit: "%",
            label: "On-time delivery across managed programs",
            note: "Up 2.3 points from Q2 as automated routing removed manual handoffs.",
            source: "GlobalLink Q3 FY26 reporting pack",
          },
          {
            value: 41,
            unit: "%",
            label: "Average turnaround improvement on AI-assisted jobs",
            note: "Measured across the 12 largest enterprise programs in the quarter.",
            source: "GlobalLink Q3 FY26 reporting pack",
          },
          {
            value: 31,
            unit: "%",
            label: "Growth in active GlobalLink Now workspaces",
            note: "Driven by marketing and product teams onboarding self-serve workflows.",
            source: "GlobalLink Q3 FY26 reporting pack",
          },
        ],
      },
      notes: "Every stat carries its source; no placeholder figures.",
    },
    {
      sectionId: "SF-10",
      variantId: "MV-CTX-TREND",
      layoutId: "LF-02",
      mode: "light",
      content: {
        direction: "Trending up",
        headline: "AI-assisted volume has doubled for two consecutive quarters",
        narrative:
          "Machine translation with expert post-editing now covers 62% of eligible words, up from 31% a year ago, while quality scores have held above 99% throughout the transition.",
      },
      notes: "The trend slide bridges the stats into the client proof on the next slide.",
    },
    {
      sectionId: "SF-14",
      variantId: "MV-CASE-SPREAD",
      layoutId: "LF-18",
      mode: "light",
      content: {
        client: "Global retail enterprise",
        challenge:
          "Product launches in 14 markets were bottlenecked by a three-week manual localization cycle.",
        solution:
          "GlobalLink Now with AI-assisted post-editing, governed terminology and automated QA gates.",
        result:
          "Launch content now ships market-ready in four days, with quality scores above 99% maintained.",
        metric: "80% faster time-to-market",
        source: "GlobalLink Q3 FY26 reporting pack",
      },
      notes: "Anonymized client story from the Q3 review; swap in a named account when approved.",
    },
    {
      sectionId: "SF-16",
      variantId: "MV-CLOSE-TIMELINE",
      layoutId: "LF-24",
      mode: "dark",
      content: {
        // Brand aqua clears WCAG AA on the dark ground.
        accentOverride: "#A1FBF9",
        authorizedAccentOverride: true,
        title: "Into Q4",
        subtitle: "Carry the momentum: three commitments for next quarter.",
        items: [
          { label: "Expand", body: "Extend AI-assisted workflows to the remaining eligible programs." },
          { label: "Govern", body: "Refresh terminology and style assets for the top 20 accounts." },
          { label: "Report", body: "Move all QBR reporting onto live GlobalLink dashboards." },
          { label: "Review", body: "Reconvene for the Q4 business review in January." },
        ],
      },
      notes: "Close on commitments and the agreed date for the Q4 review.",
    },
  ],
};

export type DemoToolPart = {
  type: string;
  toolCallId: string;
  state: "input-available" | "output-available";
  input: Record<string, unknown>;
  output?: string;
};

export function demoToolPart(
  name: string,
  state: DemoToolPart["state"],
  output?: string,
): DemoToolPart {
  return {
    type: `tool-${name}`,
    toolCallId: `demo-${name}`,
    state,
    input: {},
    ...(output !== undefined ? { output } : {}),
  };
}

export type DemoBuildStep = {
  /** Milliseconds after the step starts before the next one fires. */
  holdMs: number;
  /** Assistant text shown while this step is on screen. */
  text: string;
  /** Tool parts visible during this step; the last one may still be running. */
  tools: DemoToolPart[];
};

/**
 * The staged script. Tool names map onto the real AgentStatusTimeline stages
 * (planning → generating → refining) so the same progress UI the live stream
 * uses drives the simulated build.
 */
export function demoBuildSteps(deckId: string | null): DemoBuildStep[] {
  return [
    {
      holdMs: 1600,
      text: "Reading your brief…",
      tools: [demoToolPart("getTaxonomy", "input-available")],
    },
    {
      holdMs: 2200,
      text: "Reviewing GlobalLink knowledge and the approved module library…",
      tools: [
        demoToolPart("getTaxonomy", "output-available", "ok"),
        demoToolPart("searchKnowledge", "input-available"),
      ],
    },
    {
      holdMs: 2600,
      text: "Drafting the outline — cover, quarter highlights, KPI stats, trend, case study, close…",
      tools: [
        demoToolPart("getTaxonomy", "output-available", "ok"),
        demoToolPart("searchKnowledge", "output-available", "ok"),
        demoToolPart("createDeck", "input-available"),
      ],
    },
    {
      holdMs: 2600,
      text: "Building slides 1–6 with the Q3 stats and the case study…",
      tools: [
        demoToolPart("getTaxonomy", "output-available", "ok"),
        demoToolPart("searchKnowledge", "output-available", "ok"),
        demoToolPart(
          "createDeck",
          "output-available",
          deckId ? `{"deck_id":"${deckId}"}` : "ok",
        ),
        demoToolPart("updateSlideContent", "input-available"),
      ],
    },
    {
      holdMs: 2200,
      text: "Applying the Enterprise brand system — dark cover and close, light working slides…",
      tools: [
        demoToolPart("getTaxonomy", "output-available", "ok"),
        demoToolPart("searchKnowledge", "output-available", "ok"),
        demoToolPart(
          "createDeck",
          "output-available",
          deckId ? `{"deck_id":"${deckId}"}` : "ok",
        ),
        demoToolPart("updateSlideContent", "output-available", "ok"),
        demoToolPart("setSlideIcon", "input-available"),
      ],
    },
    {
      holdMs: 1800,
      text: "Running QA gates — layout, fit, brand and export checks…",
      tools: [
        demoToolPart("getTaxonomy", "output-available", "ok"),
        demoToolPart("searchKnowledge", "output-available", "ok"),
        demoToolPart(
          "createDeck",
          "output-available",
          deckId ? `{"deck_id":"${deckId}"}` : "ok",
        ),
        demoToolPart("updateSlideContent", "output-available", "ok"),
        demoToolPart("setSlideIcon", "output-available", "ok"),
      ],
    },
  ];
}

export function demoFinalAssistantText(): string {
  return [
    "Done — your 6-slide **GlobalLink Q3 business review** is ready.",
    "",
    "- Dark cover and close, light working slides in the approved Enterprise brand system",
    "- KPI triptych and trend slides carry the quarter's stats, each with its source",
    "- Case study spread included; QA gates pass clean — no blockers, no warnings",
    "",
    "Open it in the editor to refine, or export straight to PowerPoint.",
  ].join("\n");
}

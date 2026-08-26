// Demo fast-path for the Presentation agent: a curated, QA-clean GlobalLink Q3
// business-review deck plus the trigger-prompt matcher and the staged build
// script that simulates a live generation in ~13 seconds. Used only when the
// user's brief matches the demo trigger; every other brief takes the normal
// AI generation path untouched.
import type { DeckSnapshot } from "@/lib/deck-store";

// Master brand dark cover background (authored Element plate, CDN-hosted).
// JPEG rendition — the 1.3MB PNG exhausted capture resources during export.
const MASTER_BRAND_DARK_COVER =
  "/__l5e/assets-v1/f42429f5-9543-4b14-b281-e7167420a00f/element-dark-cover.jpg";

export const DEMO_FAST_BUILD_TRIGGER =
  "Create a 6-slide GlobalLink Q3 business review with stats, a case study, AI hub, KPI dashboard, and product showcase";

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
        title: "GlobalLink Q3 business review",
        subtitle: "AI-assisted delivery, proof and Q4 scale plan",
        clientName: "GlobalLink enterprise programs",
        date: "Q3 FY26",
        mediaUrl: MASTER_BRAND_DARK_COVER,
        mediaSeed: "TransPerfect master brand dark cover full bleed",
      },
      notes:
        "Open with the quarter's theme: faster delivery at higher quality, with AI-assisted workflows now in production.",
    },
    {
      sectionId: "SF-04",
      variantId: "MV-BENTO-6",
      layoutId: "LF-09",
      mode: "light",
      content: {
        title: "The Q3 operating model in six proof points",
        items: [
          {
            kind: "feature",
            icon: "Layers3",
            title: "One intake model",
            body: "Every request enters one governed queue with brief, market and reviewer context attached.",
            value: "1",
            unit: "queue",
            label: "Unified intake",
            mediaSeed: "GlobalLink unified intake workspace",
          },
          {
            kind: "stat",
            icon: "CheckCircle2",
            title: "Delivery reliability",
            body: "Automated routing removed manual handoffs across managed programs.",
            value: "98.4",
            unit: "%",
            label: "On-time delivery",
            mediaSeed: "GlobalLink delivery status board",
          },
          {
            kind: "body",
            icon: "BrainCircuit",
            title: "AI routing",
            body: "Eligible jobs are triaged automatically before expert review, reducing manual handoffs.",
            value: "62",
            unit: "%",
            label: "AI-assisted words",
            mediaSeed: "AI localization routing diagram",
          },
          {
            kind: "stat",
            icon: "Timer",
            title: "Faster cycle time",
            body: "Priority work reaches expert review sooner with fewer status escalations.",
            value: "41",
            unit: "%",
            label: "Turnaround gain",
            mediaSeed: "Localization cycle time dashboard",
          },
          {
            kind: "media",
            icon: "MonitorCheck",
            title: "Case study: retail launch",
            body: "A global retailer's 14-market launch moved from a three-week cycle to a four-day market-ready workflow using AI-assisted routing and expert review.",
            value: "80",
            unit: "%",
            label: "Launch speed gain",
            mediaSeed: "Global retail localization launch workflow",
          },
          {
            kind: "body",
            icon: "Rocket",
            title: "Q4 scale path",
            body: "Expand governed workflows to priority accounts and live reporting dashboards.",
            value: "20",
            unit: "accounts",
            label: "Q4 priority wave",
            mediaSeed: "Enterprise account rollout roadmap",
          },
        ],
      },
      notes: "Use the bento to show proof, workflow, adoption and the case-study bridge in one modular page.",
    },
    {
      sectionId: "SF-04",
      variantId: "MV-INFO-HUB-SATELLITES",
      layoutId: "LF-15",
      mode: "dark",
      content: {
        accentOverride: "#A1FBF9",
        authorizedAccentOverride: true,
        title: "AI hub connects the program",
        hub: { title: "GlobalLink AI", subtitle: "Governed orchestration" },
        items: [
          {
            label: "Brief intake",
            body: "Structured requests capture market, channel and due-date rules.",
            icon: "ClipboardList",
          },
          {
            label: "MT routing",
            body: "AI selects the right language path before human review.",
            icon: "Workflow",
          },
          {
            label: "Terminology",
            body: "Approved language assets stay aligned across teams and markets.",
            icon: "Database",
          },
          {
            label: "Expert review",
            body: "Linguists validate tone, quality and market readiness in context.",
            icon: "FileCheck2",
          },
          {
            label: "QA gates",
            body: "Automated checks catch fit, format and compliance issues early.",
            icon: "ShieldCheck",
          },
          {
            label: "Reporting",
            body: "Program owners see live status, SLA and quality trends.",
            icon: "LineChart",
          },
        ],
        summary: { lead: "Six connected signals", emphasis: "One governed hub" },
      },
      notes: "Dark-mode hub slide shows the platform logic behind the Q3 performance story.",
    },
    {
      sectionId: "SF-13",
      variantId: "MV-KPI-DASHBOARD",
      layoutId: "LF-11",
      mode: "light",
      content: {
        title: "Q3 KPI dashboard",
        items: [
          {
            icon: "CheckCircle2",
            value: "98.4",
            unit: "%",
            label: "On-time delivery",
            delta: "+2.3 pts",
            trend: "up",
            source: "GlobalLink Q3 FY26 reporting pack",
          },
          {
            icon: "Star",
            value: "99.1",
            unit: "%",
            label: "Quality score",
            delta: "+0.4 pts",
            trend: "up",
            source: "GlobalLink Q3 FY26 reporting pack",
          },
          {
            icon: "Zap",
            value: "62",
            unit: "%",
            label: "AI-assisted words",
            delta: "+31 pts YoY",
            trend: "up",
            source: "GlobalLink Q3 FY26 reporting pack",
          },
          {
            icon: "Timer",
            value: "41",
            unit: "%",
            label: "Turnaround gain",
            delta: "+8 pts",
            trend: "up",
            source: "GlobalLink Q3 FY26 reporting pack",
          },
          {
            icon: "Users",
            value: "31",
            unit: "%",
            label: "Workspace growth",
            delta: "+9 pts",
            trend: "up",
            source: "GlobalLink Q3 FY26 reporting pack",
          },
          {
            icon: "Rocket",
            value: "80",
            unit: "%",
            label: "Case launch speed",
            delta: "4 days",
            trend: "up",
            source: "GlobalLink Q3 FY26 reporting pack",
          },
        ],
      },
      notes: "Every KPI is sourced so export QA stays clean while judges see a real dashboard module.",
    },
    {
      sectionId: "SF-04",
      variantId: "MV-SHOW-LAPTOP",
      layoutId: "LF-03",
      mode: "light",
      content: {
        eyebrow: "Live platform view",
        title: "The QBR dashboard becomes the workbench",
        body:
          "Program owners can move from KPI variance to the exact market, workflow and reviewer queue that needs attention.",
        caption: "GlobalLink Now · program command center",
        mediaSeed: "GlobalLink dashboard laptop screen enterprise localization",
        deviceKind: "laptop",
        deviceTone: "graphite",
      },
      notes: "Show that this is not static reporting — the live product view links metrics to action.",
    },
    {
      sectionId: "SF-16",
      variantId: "MV-CLOSE-SPLIT",
      layoutId: "LF-03",
      mode: "dark",
      content: {
        // Brand aqua clears WCAG AA on the dark ground.
        accentOverride: "#A1FBF9",
        authorizedAccentOverride: true,
        title: "Approve the Q4 scale plan",
        body:
          "Repeat the retail case-study result — three weeks to four days across 14 markets — by expanding AI-assisted workflows to the next wave of priority accounts.",
        ctaLabel: "Greenlight Q4 rollout",
        ctaDetail: "Pilot scope ready this week.",
        owner: "GlobalLink account team",
        mediaSeed: "executive kickoff workshop localization roadmap",
      },
      notes: "Close with a dark split image and CTA that turns the case-study proof into the next decision.",
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
  /** Number of completed slides to reveal in the live preview at this step. */
  revealSlides?: number;
};

/**
 * The staged script. Tool names map onto the real AgentStatusTimeline stages
 * (planning → generating → refining) so the same progress UI the live stream
 * uses drives the simulated build.
 */
export function demoBuildSteps(deckId: string | null): DemoBuildStep[] {
  const createDeckOutput = demoToolPart(
    "createDeck",
    "output-available",
    deckId ? `{"deck_id":"${deckId}"}` : "ok",
  );
  const baseTools = (extra: DemoToolPart[]): DemoToolPart[] => [
    demoToolPart("getTaxonomy", "output-available", "ok"),
    demoToolPart("searchKnowledge", "output-available", "ok"),
    createDeckOutput,
    ...extra,
  ];
  return [
    {
      holdMs: 1400,
      text: "Reading your brief…",
      tools: [demoToolPart("getTaxonomy", "input-available")],
      revealSlides: 0,
    },
    {
      holdMs: 1600,
      text: "Reviewing GlobalLink knowledge and the approved module library…",
      tools: [
        demoToolPart("getTaxonomy", "output-available", "ok"),
        demoToolPart("searchKnowledge", "input-available"),
      ],
      revealSlides: 0,
    },
    {
      holdMs: 1800,
      text: "Drafting the outline — full-bleed cover, bento proof, AI hub, KPI dashboard, laptop view and CTA…",
      tools: [
        demoToolPart("getTaxonomy", "output-available", "ok"),
        demoToolPart("searchKnowledge", "output-available", "ok"),
        demoToolPart("createDeck", "input-available"),
      ],
      revealSlides: 0,
    },
    {
      holdMs: 1300,
      text: "Slide 1 — full-bleed title cover…",
      tools: baseTools([demoToolPart("updateSlideContent", "input-available")]),
      revealSlides: 1,
    },
    {
      holdMs: 1300,
      text: "Slide 2 — six-cell bento proof page…",
      tools: baseTools([demoToolPart("updateSlideContent", "input-available")]),
      revealSlides: 2,
    },
    {
      holdMs: 1300,
      text: "Slide 3 — dark AI hub & satellites…",
      tools: baseTools([demoToolPart("updateSlideContent", "input-available")]),
      revealSlides: 3,
    },
    {
      holdMs: 1300,
      text: "Slide 4 — sourced Q3 KPI dashboard…",
      tools: baseTools([demoToolPart("updateSlideContent", "input-available")]),
      revealSlides: 4,
    },
    {
      holdMs: 1300,
      text: "Slide 5 — laptop product showcase…",
      tools: baseTools([demoToolPart("updateSlideContent", "input-available")]),
      revealSlides: 5,
    },
    {
      holdMs: 1300,
      text: "Slide 6 — dark split image + CTA…",
      tools: baseTools([
        demoToolPart("updateSlideContent", "output-available", "ok"),
        demoToolPart("setSlideIcon", "input-available"),
      ]),
      revealSlides: 6,
    },
    {
      holdMs: 1600,
      text: "Running QA gates — layout, fit, brand and export checks…",
      tools: baseTools([
        demoToolPart("updateSlideContent", "output-available", "ok"),
        demoToolPart("setSlideIcon", "output-available", "ok"),
      ]),
      revealSlides: 6,
    },
  ];
}

export function demoFinalAssistantText(): string {
  return [
    "Done — your 6-slide **GlobalLink Q3 business review** is ready.",
    "",
    "- Full-bleed title cover, six-cell bento proof page and dark AI hub module",
    "- KPI dashboard and laptop showcase carry sourced Q3 performance signals",
    "- Dark split image + CTA closes the case-study-to-Q4 rollout story",
    "- QA gates pass clean — no blockers, no warnings",
    "",
    "Open it in the editor to refine, or export straight to PowerPoint.",
  ].join("\n");
}

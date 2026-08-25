import type { DeckSnapshot } from "@/lib/deck-store";

export type JudgingCategoryId = "sell-more" | "automate" | "scale";

export type JudgingCriterion = {
  id: string;
  label: string;
  prompt: string;
  demoMove: string;
};

export type JudgingCategory = {
  id: JudgingCategoryId;
  label: string;
  weight: number;
  proofLine: string;
  criteria: JudgingCriterion[];
};

export type DemoRunStep = {
  time: string;
  title: string;
  action: string;
  judgeSignal: string;
};

export type DemoScriptBeat = {
  time: string;
  speakerLine: string;
};

export type DemoDeckSlide = {
  title: string;
  mode: "light" | "dark";
  module: string;
  purpose: string;
};

export const JUDGING_CATEGORIES: JudgingCategory[] = [
  {
    id: "sell-more",
    label: "Sell more",
    weight: 5,
    proofLine: "Show a working client-ready deck, not a promise about one.",
    criteria: [
      {
        id: "new-business",
        label: "New business",
        prompt: "Will this help us attract and win new clients?",
        demoMove: "Open with a prospect-ready presentation created from a brief.",
      },
      {
        id: "existing-clients",
        label: "Existing clients",
        prompt: "Will this help us sell more or cross-sell to clients we already have?",
        demoMove: "Show the same content reused across decks, print, social, and events.",
      },
      {
        id: "proof",
        label: "Proof",
        prompt: "How clearly does this show how the solution works versus just making claims?",
        demoMove: "Create, edit, QA, and export live during the demo.",
      },
    ],
  },
  {
    id: "automate",
    label: "Automate & innovate",
    weight: 4,
    proofLine: "Make the manual work visible, then remove it on screen.",
    criteria: [
      {
        id: "time-saved",
        label: "Time saved",
        prompt: "To what degree does this cut out real manual work?",
        demoMove: "Use the Presentation Agent to move from prompt to structured slides.",
      },
      {
        id: "running-cost",
        label: "Running cost",
        prompt: "How cost-effective is it to implement, use, and maintain?",
        demoMove: "Point to reusable approved modules instead of one-off production.",
      },
      {
        id: "ease-of-use",
        label: "Ease of use",
        prompt: "How simple is it for anyone to use? Is it intimidating to new users?",
        demoMove: "Use visible controls: swap module, run QA, export without admin setup.",
      },
    ],
  },
  {
    id: "scale",
    label: "Scale",
    weight: 3,
    proofLine: "Close with repeatability: every team, every format, same governance.",
    criteria: [
      {
        id: "reach",
        label: "Reach",
        prompt: "How useful would other teams find this? Essential versus nice-to-have.",
        demoMove: "Show Presentation, Print, Social, and Events in the same navigation system.",
      },
      {
        id: "effort",
        label: "Effort",
        prompt: "Could other teams start using it without big changes or expense?",
        demoMove: "Show templates and approved assets as the starting point.",
      },
      {
        id: "plan",
        label: "Plan",
        prompt: "Is there a clear plan for getting it to everyone who could benefit?",
        demoMove: "End on the rollout timeline and role-specific adoption path.",
      },
    ],
  },
];

export const JUDGING_RUN_OF_SHOW: DemoRunStep[] = [
  {
    time: "0:00-0:25",
    title: "Open",
    action: "Frame Element as the brand-governed production engine for revenue teams.",
    judgeSignal: "Sell more: new business and cross-sell are the reason for the demo.",
  },
  {
    time: "0:25-1:15",
    title: "Presentation Agent",
    action: "Create a deck from a short client brief and open it in the editor.",
    judgeSignal: "Proof: the judges see the work happen live.",
  },
  {
    time: "1:15-1:55",
    title: "Edit and export",
    action: "Swap one module, run QA, then export to PPTX or PDF.",
    judgeSignal: "Automation: manual layout, brand, and production checks are compressed.",
  },
  {
    time: "1:55-2:30",
    title: "Multi-channel scale",
    action: "Jump from the deck to print, social, and event assets built from the same system.",
    judgeSignal: "Scale: the same governed engine supports every team and output.",
  },
  {
    time: "2:30-3:00",
    title: "Close",
    action: "Recap the rollout path and explicitly map back to the score sheet.",
    judgeSignal: "Plan: the judges can see how it reaches teams after tomorrow.",
  },
];

export const JUDGING_SCRIPT: DemoScriptBeat[] = [
  {
    time: "0:00",
    speakerLine:
      "Element turns a client brief into governed sales content across decks, print, social, and events — using approved TransPerfect systems from the start.",
  },
  {
    time: "0:25",
    speakerLine:
      "I am going to create the first client-facing deck live, so the proof is the workflow itself: prompt, deck, editable modules, QA, and export.",
  },
  {
    time: "1:15",
    speakerLine:
      "This is where manual production normally breaks: resizing copy, matching the brand, fixing layout drift, and rebuilding for PowerPoint. Element handles those gates before the file leaves the editor.",
  },
  {
    time: "1:55",
    speakerLine:
      "The same approved modules extend into print, social, and event production, so a campaign does not restart from scratch every time a team needs a new format.",
  },
  {
    time: "2:30",
    speakerLine:
      "On the judging sheet, this is built to score on selling more, cutting manual work, and scaling through reusable governed templates — with live proof, not just claims.",
  },
];

export const JUDGING_DECK_OUTLINE: DemoDeckSlide[] = [
  {
    title: "Element: live sales-content engine",
    mode: "dark",
    module: "Media cover",
    purpose: "Name the product and anchor the demo in revenue impact.",
  },
  {
    title: "What the judges score",
    mode: "light",
    module: "Three challenge cards",
    purpose: "Make Sell more, Automation, and Scale the structure of the story.",
  },
  {
    title: "Three-minute proof path",
    mode: "light",
    module: "Process timeline",
    purpose: "Show the exact sequence the audience will watch live.",
  },
  {
    title: "Scorecard proof points",
    mode: "dark",
    module: "Proof stats",
    purpose: "Use visible placeholders for any real numbers that must be supplied.",
  },
  {
    title: "Rollout plan",
    mode: "light",
    module: "Closing timeline",
    purpose: "Close on adoption beyond the demo team.",
  },
];

export const JUDGING_DEMO_DECK: DeckSnapshot = {
  title: "Markathon live demo scorecard · Element",
  brandModeId: "bm-enterprise",
  archetypeId: "arch-problem-solution",
  context: {
    stylePackId: null,
    designRecipeId: null,
    defaultTransition: { type: "fade", durationMs: 420 },
  },
  brief: {
    prospect: "Markathon judges",
    industry: "Sales enablement",
    audience: "Judging panel",
    meetingObjective: "Prove Element can sell more, automate manual production, and scale across teams.",
    lengthTarget: 5,
    clientFacts:
      "Use live product actions only. Replace bracketed placeholders with measured business numbers after the demo.",
  },
  slides: [
    {
      sectionId: "SF-01",
      variantId: "MV-OP-COVER-MEDIA",
      layoutId: "LF-05",
      mode: "dark",
      content: {
        clientName: "THE MARKATHON",
        title: "Element: live sales-content engine",
        titleEmphasis: "live",
        subtitle: "A three-minute demo mapped directly to the judging sheet.",
        date: "Live demo tomorrow",
        mediaSeed: "enterprise-command-room",
      },
      notes: "Open by naming the three scoring areas: sell more, automate and innovate, scale.",
    },
    {
      sectionId: "SF-04",
      variantId: "MV-CTX-CARDS-3",
      layoutId: "LF-08",
      mode: "light",
      content: {
        title: "What the judges score",
        items: [
          {
            title: "Sell more x5",
            body: "Win new clients, expand existing clients, and prove the workflow live instead of describing it.",
          },
          {
            title: "Automate x4",
            body: "Remove real manual production work: drafting, layout, QA, resizing, and export prep.",
          },
          {
            title: "Scale x3",
            body: "Make the same governed content engine useful to other teams with low rollout effort.",
          },
        ],
      },
      notes: "This slide tells judges the presentation follows their sheet exactly.",
    },
    {
      sectionId: "SF-10",
      variantId: "MV-PROC-TIMELINE",
      layoutId: "LF-14",
      mode: "light",
      content: {
        title: "Three-minute proof path",
        items: [
          { label: "0:00-0:25", body: "Frame Element as a revenue engine, not a design tool." },
          { label: "0:25-1:15", body: "Use the Presentation Agent to create a deck from a brief." },
          { label: "1:15-1:55", body: "Swap a module, run QA, and export to PPTX or PDF." },
          { label: "1:55-3:00", body: "Show reuse across channels and close with the rollout plan." },
        ],
      },
      notes: "Keep the demo moving; do not stop to explain every control.",
    },
    {
      sectionId: "SF-13",
      variantId: "MV-PROOF-STATS-3",
      layoutId: "LF-08",
      mode: "dark",
      content: {
        title: "Scorecard proof points",
        items: [
          { value: 9, unit: "criteria", label: "Judging points covered explicitly" },
          { value: 3, unit: "min", label: "Live workflow from brief to export" },
          { value: 180, unit: "pts", label: "Maximum weighted score target" },
        ],
      },
      notes: "Only use numbers from the judging sheet and live demo timing unless real metrics are supplied.",
    },
    {
      sectionId: "SF-16",
      variantId: "MV-CLOSE-TIMELINE",
      layoutId: "LF-24",
      mode: "light",
      content: {
        title: "Rollout plan after the demo",
        subtitle: "Start narrow, prove adoption, then scale through approved templates.",
        items: [
          { label: "Pilot", body: "Run one sales team through briefs, decks, QA, and export." },
          { label: "Package", body: "Lock approved modules, prompts, and role-based workflows." },
          { label: "Train", body: "Give Sales create-from-approved paths and Marketing admin control." },
          { label: "Scale", body: "Extend the same engine to print, social, and event kits." },
        ],
      },
      notes: "End by repeating the scoring formula: Sell more x5, Automation x4, Scale x3.",
    },
  ],
};

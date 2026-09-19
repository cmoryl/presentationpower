/**
 * The demo script — ONE registry of how we show this build to an audience.
 *
 * Before this existed, a demo meant hunting for whichever page happened to
 * look finished, so no two run-throughs told the same story and nobody knew
 * how long one took. Each run below is a timed sequence of real pages, with
 * the line to say, the page to be on, and the artefact the audience keeps.
 *
 * Every `to` MUST be a route that exists. Add a run here in the same change
 * that creates the page it depends on, or it stays untested and unseen.
 */

export type DemoRunId = "sales-pitch" | "print" | "event-signage" | "translation";

export type DemoStep = {
  /** What the presenter does, in the audience's words. */
  does: string;
  /** The line to say while it happens. Short enough to say from memory. */
  say: string;
  /** The page this step happens on. */
  to: string;
  /** Roughly how long this step takes, in seconds. */
  seconds: number;
  /**
   * Set when this step is the moment the system refuses something — a
   * guardrail catching an off-brand ask or an unsourced number. One of these
   * per run does more work than any amount of finished artwork.
   */
  proof?: string;
};

export type DemoRun = {
  id: DemoRunId;
  /** Plain-language name, said out loud at the start. */
  name: string;
  /** Who this run is aimed at. */
  audience: string;
  /** The single claim the run proves. */
  claim: string;
  /** Opening line, before the first click. */
  opener: string;
  steps: DemoStep[];
  /** What the audience walks away holding. */
  keeps: string;
  /** Where to personalise it with the prospect's own name and market. */
  personalise: string;
};

/**
 * The live-build opener. Every run starts here: one typed sentence, a finished
 * deck on screen. The belief comes from watching it happen, not from a
 * finished file sitting there when the meeting starts.
 */
export const DEMO_OPENER = {
  to: "/agent",
  /** Typed verbatim — this exact sentence runs the curated, QA-clean build. */
  prompt: "Create a 6-slide GlobalLink Q3 business review with stats and a case study",
  say: "I'll type one sentence. Watch the clock, not me.",
  claim: "Six on-brand slides, sourced, in under a minute — normally two days of work.",
} as const;

/** Numbers to have on screen while something is building. */
export const DEMO_PROOF_POINTS: ReadonlyArray<{ figure: string; label: string }> = [
  { figure: "< 60 sec", label: "one sentence to a finished, on-brand deck" },
  { figure: "11", label: "brand divisions rendered from one governed system" },
  { figure: "4", label: "surfaces from a single brief: deck, print, social, event" },
  { figure: "190", label: "approved modules a generated page can be built from" },
  { figure: "0", label: "off-brand colours or unsourced figures that survive review" },
];

export const DEMO_RUNS: DemoRun[] = [
  {
    id: "sales-pitch",
    name: "The sales pitch",
    audience: "Sales leaders and enablement",
    claim: "Anyone can produce a client-ready pitch, and nothing off-brand gets out.",
    opener:
      "You brief it in a sentence. The brand rules are not a PDF someone was supposed to read — they are enforced on the way out.",
    steps: [
      {
        does: "Type the one-line brief and let the deck build on screen.",
        say: "One sentence. No template picking, no colour picking.",
        to: "/agent",
        seconds: 60,
      },
      {
        does: "Open the finished pitch and scroll it at full size.",
        say: "This is not a mock-up — it is the real deck, editable, with real sources behind the numbers.",
        to: "/demo/deck/globallink-enterprise-pitch",
        seconds: 45,
      },
      {
        does: "Ask for something off-brand — a different accent colour on body text.",
        say: "Watch it say no, and say why.",
        to: "/demo/deck/globallink-enterprise-pitch",
        seconds: 30,
        proof:
          "The system refuses the change and names the rule: accent colour never carries body text, because it fails contrast on light backgrounds.",
      },
      {
        does: "Send it for brand review and decide it as the reviewer.",
        say: "A reviewer sends it back with a reason, and the system learns from design-fit reasons only — never from a brand or accessibility failure.",
        to: "/approvals",
        seconds: 45,
        proof:
          "The reason is recorded either way, but only taste feedback changes future recommendations.",
      },
      {
        does: "Export the approved deck to PowerPoint.",
        say: "Their file, their laptop, fully editable — and it refuses to export while quality checks are failing.",
        to: "/decks",
        seconds: 30,
      },
    ],
    keeps: "The generated PowerPoint, sent before they leave the room.",
    personalise: "Put their company, division and market into the brief so the deck is about them.",
  },
  {
    id: "print",
    name: "Print, press-ready",
    audience: "Marketing and brand owners",
    claim: "The same governed system produces a file a printer will actually accept.",
    opener:
      "Everyone can make a pretty page. The hard part is a file that survives a press without a designer rescuing it.",
    steps: [
      {
        does: "Open a finished case study and edit the headline and a stat in place.",
        say: "Live copy, live layout — the grid holds while you type.",
        to: "/demo/print/pd-legal-genai",
        seconds: 60,
      },
      {
        does: "Switch the look and the division lockup.",
        say: "Same content, different division, still inside the approved palette.",
        to: "/demo/print/pd-legal-genai",
        seconds: 30,
      },
      {
        does: "Show the print module library it was assembled from.",
        say: "Nothing here is drawn by hand — pages are built from approved parts.",
        to: "/library/print/modules",
        seconds: 30,
      },
      {
        does: "Export the press PDF and open the quality report.",
        say: "Type is outlined vector, bleed and trim are set, and the colour space is the house one.",
        to: "/demo/print/pd-legal-genai",
        seconds: 45,
        proof:
          "If a check fails, the download is blocked and the failure is named — we never hand over a file that only looks right on screen.",
      },
    ],
    keeps: "The press PDF plus its quality report.",
    personalise: "Swap in their logo and one of their own case studies before the meeting.",
  },
  {
    id: "event-signage",
    name: "Event signage",
    audience: "Event producers and print vendors",
    claim: "A whole venue's signage is one governed job, always at the current revision.",
    opener:
      "This is a live print job — 54 scenic panels at a real London venue, with real vendors working from it.",
    steps: [
      {
        does: "Open the London venue pack and walk the panel schedule.",
        say: "Every panel, every size, every wall — one list the vendor and we both read.",
        to: "/events/next/london",
        seconds: 60,
      },
      {
        does: "Show the venue page: address, map, opening times, travel.",
        say: "The facts live in one place, so nothing gets typed twice or typed wrong.",
        to: "/events/next/venues",
        seconds: 30,
      },
      {
        does: "Make a change and publish a revision.",
        say: "Files are stamped with the revision number, so nobody can print last month's wording.",
        to: "/events/next/london/revise",
        seconds: 60,
        proof:
          "An unpublished change is stamped as a draft — we never put a revision number on something that has not been issued.",
      },
      {
        does: "Show the same event as a repeatable playbook for the next city.",
        say: "The next city is not a new project. It is this one with new facts.",
        to: "/events/demo/flagship-conference",
        seconds: 45,
      },
    ],
    keeps: "The panel schedule and the current revision pack.",
    personalise: "Use their venue name and dates on the venue page before you present.",
  },
  {
    id: "translation",
    name: "Translation and terminology",
    audience: "Global marketing and localisation buyers",
    claim: "One deck goes multilingual without losing the brand or the approved terms.",
    opener:
      "This is the part only we can do: the words and the design are governed by the same system.",
    steps: [
      {
        does: "Open a finished deck and switch language in place.",
        say: "Same layout, same brand, different language — the design does not break when the text grows.",
        to: "/demo/deck/globallink-enterprise-pitch",
        seconds: 60,
      },
      {
        does: "Show the terminology list and a never-translate term.",
        say: "Product names stay put. That rule is enforced, not remembered.",
        to: "/admin/translation",
        seconds: 45,
      },
      {
        does: "Change a term, then ask the assistant about it.",
        say: "It answers with the new rule within seconds, and cites where the rule came from.",
        to: "/knowledge/ask",
        seconds: 45,
        proof:
          "Clicking the citation opens the real brand document at the passage used — not a numbered footnote.",
      },
      {
        does: "Share the translated deck by link and show the language readiness.",
        say: "They see what is ready and what is still in translation. No guessing.",
        to: "/demo/deck/globallink-enterprise-pitch",
        seconds: 30,
      },
    ],
    keeps: "A share link in their language, with the terminology list behind it.",
    personalise: "Add two of their own product names as never-translate terms beforehand.",
  },
];

export function demoRunById(id: string): DemoRun | undefined {
  return DEMO_RUNS.find((r) => r.id === id);
}

/** Total run length in whole minutes, rounded up — what you promise the room. */
export function demoRunMinutes(run: DemoRun): number {
  const seconds = run.steps.reduce((sum, s) => sum + s.seconds, 0);
  return Math.max(1, Math.ceil(seconds / 60));
}

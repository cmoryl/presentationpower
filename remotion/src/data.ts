export type BeatVisual = "look" | "gates" | "fanout";

export type Beat = {
  n: string;
  title: string;
  body: string;
  visual: BeatVisual;
  /** Big animated statistic for this beat. */
  stat: { to: number; prefix?: string; suffix?: string; label: string };
  /** Time-saved chip. */
  saved: string;
  /** Row labels used by the beat's visual. */
  rows: readonly string[];
};

export type Film = {
  id: string;
  role: string;
  headline: readonly [string, string];
  sub: string;
  beats: readonly [Beat, Beat, Beat];
  close: {
    from: string;
    to: string;
    pct: { to: number; suffix?: string; label: string };
    kicker: string;
  };
};

export const FILMS: Record<string, Film> = {
  admin: {
    id: "admin",
    role: "Admin & Design",
    headline: ["Set the system once.", "Every asset inherits it."],
    sub: "Templates, modules, imagery and export contracts, governed in one room.",
    beats: [
      {
        n: "01",
        title: "Define the look",
        body: "Style pack, industry recipe, type floors and background art lock into one governed template set.",
        visual: "look",
        stat: { to: 29, label: "Approved style packs" },
        saved: "Look setup 2 days → 20 min",
        rows: ["Palette locked", "Type floors set", "Background art bound", "Geometry rhythm 22pt"],
      },
      {
        n: "02",
        title: "Set the gates",
        body: "Modules pass contrast, brand and export checks before anyone can reach them. The rest are held back.",
        visual: "gates",
        stat: { to: 189, suffix: "+", label: "Governed modules" },
        saved: "Zero off-brand rework",
        rows: ["Contrast audit", "Brand mark check", "Export byte-verify", "Legacy variant"],
      },
      {
        n: "03",
        title: "Publish everywhere",
        body: "One master change fans out to every deck, brochure, booth panel and post already in flight.",
        visual: "fanout",
        stat: { to: 100, suffix: "%", label: "Exports byte-verified" },
        saved: "Rollout 3 weeks → 1 afternoon",
        rows: ["Presentation", "Print", "Social", "Events"],
      },
    ],
    close: {
      from: "3 weeks of chasing files",
      to: "one governed publish",
      pct: { to: 94, label: "less brand rework" },
      kicker: "One source of brand truth",
    },
  },
  marketing: {
    id: "marketing",
    role: "Marketing",
    headline: ["Brief it once.", "Ship the whole campaign."],
    sub: "One brief in, a cross-channel set out — same look, correct sizes, export-ready.",
    beats: [
      {
        n: "01",
        title: "Brief it once",
        body: "A single brief opens the right template set and fills the shapes each channel actually needs.",
        visual: "look",
        stat: { to: 4, suffix: " channels", label: "From one brief" },
        saved: "Kick-off 4 hours → 6 min",
        rows: ["Audience + goal", "Division accents", "Template set", "Imagery pool"],
      },
      {
        n: "02",
        title: "Apply one look",
        body: "Switch the style pack and the entire campaign retints together — decks, print, social and event.",
        visual: "gates",
        stat: { to: 406, suffix: "+", label: "Format renders swept" },
        saved: "Retint 3 days → 1 click",
        rows: ["Feed 1:1", "Story 9:16", "Print A4", "Booth panel"],
      },
      {
        n: "03",
        title: "Ship the set",
        body: "Layered PowerPoint, print-ready PDF and verified image sets leave as one checked bundle.",
        visual: "fanout",
        stat: { to: 0, label: "Off-brand exports" },
        saved: "Campaign kit 5 days → 4 hours",
        rows: ["Deck", "PDF", "Social set", "Event kit"],
      },
    ],
    close: {
      from: "five days of assembly",
      to: "one afternoon, four channels",
      pct: { to: 10, suffix: "×", label: "faster campaign kits" },
      kicker: "Cohesion by construction",
    },
  },
  sales: {
    id: "sales",
    role: "Sales",
    headline: ["Describe the meeting.", "Walk in with the deck."],
    sub: "Approved modules, assembled by the agent, on brand before it leaves.",
    beats: [
      {
        n: "01",
        title: "Describe the meeting",
        body: "Tell the deck agent who you are meeting and what you need to land. It drafts the narrative.",
        visual: "look",
        stat: { to: 12, suffix: " slides", label: "Typical client narrative" },
        saved: "Outline 90 min → 90 sec",
        rows: ["Prospect + industry", "Objective", "Proof points", "Problem → solution → proof"],
      },
      {
        n: "02",
        title: "Assemble from approved",
        body: "Only signed-off Enterprise light and dark modules are in play, so the result is on brand by construction.",
        visual: "gates",
        stat: { to: 100, suffix: "%", label: "Brand-passing output" },
        saved: "No design queue",
        rows: ["Enterprise light", "Enterprise dark", "Client logo pool", "Custom template"],
      },
      {
        n: "03",
        title: "Send it",
        body: "Editable PowerPoint, PDF or a read-only share link with a locale switcher — in minutes, not days.",
        visual: "fanout",
        stat: { to: 0, label: "Design tickets filed" },
        saved: "Half a day → 5 minutes",
        rows: ["PowerPoint", "PDF", "Share link", "Locale switch"],
      },
    ],
    close: {
      from: "half a day rebuilding slides",
      to: "five minutes before the call",
      pct: { to: 96, suffix: "%", label: "of pitch prep time saved" },
      kicker: "Never off brand, never late",
    },
  },
};

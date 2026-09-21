// NEXT 2026 London — Innovation Lounge (Innovation Stage).
//
// The Innovation Lounge is a stage area, not a NEXT division: it runs short
// product demonstrations between the division programmes, so its board is built
// from the issued stage schedule (Agenda_EMEA_2026_Innovation_Stage) and the
// approved product write-ups.
//
// Copy here is the issued schedule and the approved product descriptions,
// transcribed exactly — presenter names, "or" choices and operations notes
// included. Do not paraphrase it; an operator edits a saved board, never this
// record. Blackout windows are kept as rows because the stage crew works to
// them; they print in the quieter housekeeping weight.

import type { AgendaSession } from "./next-agenda";
import type { LondonAgendaProgramme } from "./next-agenda-london-2026";

const row = (
  time: string,
  title: string,
  detail = "",
  extra: Partial<AgendaSession> = {},
): AgendaSession => ({ time, title, detail, track: "", muted: false, ...extra });

/** Innovation Lounge — THURSDAY, SEPTEMBER 24, 2026. */
export const INNOVATION_LOUNGE_DAY_ONE: AgendaSession[] = [
  row(
    "12:30-12:50 PM",
    "Media Creator",
    "Presenter: Paulette Pantoja\nOpening slot; 50 minutes before MediaNEXT at 1:40 p.m.",
    { track: "DEMO" },
  ),
  row(
    "1:00-1:20 PM",
    "GlobalLink LIVE",
    "Presenters: Peter Cselenyi, Nate Fong, or Justyn Vasquez\n10-minute turnover after the opening session.",
    { track: "DEMO" },
  ),
  row("1:20-2:40 PM", "Stage blackout", "GlobalLink welcome, technology roadmap, and track transitions.", {
    muted: true,
  }),
  row(
    "2:40-3:00 PM",
    "TransPerfect Aura",
    "Presenters: Mario Lenoci and Filip Smet\nEnds 80 minutes before Mario's 4:20 p.m. formal commitment.",
    { track: "DEMO" },
  ),
  row(
    "3:05-3:25 PM",
    "GlobalLink Coach",
    "Presenters: Diego Bartolome and Anna Zaretskaya\nAnna has 35 minutes after the roadmap panel ends at 2:30 p.m.",
    { track: "DEMO" },
  ),
  row(
    "3:30-3:50 PM",
    "GlobalLink ONE",
    "Presenters: Sofia Alves and Keith Brazil\nKeith has 60 minutes after the roadmap panel.",
    { track: "DEMO" },
  ),
  row(
    "4:00-4:20 PM",
    "GlobalLink LIVE",
    "Presenters: Peter Cselenyi, Nate Fong, or Justyn Vasquez\n35-minute reset after Coach and 10 minutes after ONE.",
    { track: "DEMO" },
  ),
  row("4:20-4:30 PM", "Operations", "Hard stop at 4:30 p.m. for cleanup.", { muted: true }),
];

/** Innovation Lounge — FRIDAY, SEPTEMBER 25, 2026. */
export const INNOVATION_LOUNGE_DAY_TWO: AgendaSession[] = [
  row(
    "9:00-9:20 AM",
    "GlobalLink Coach",
    "Presenters: Diego Bartolome and Anna Zaretskaya\nEarly slot before the headliner blackout.",
    { track: "DEMO" },
  ),
  row("9:20-11:45 AM", "Stage blackout", "Transition, Matt Hauser's Beyond Intelligence, and keynote.", {
    muted: true,
  }),
  row(
    "11:45 AM-12:05 PM",
    "GlobalLink LIVE",
    "Presenters: Peter Cselenyi, Nate Fong, or Justyn Vasquez\nPeter selected to reduce pressure on Nate and Justyn.",
    { track: "DEMO" },
  ),
  row(
    "12:15-12:35 PM",
    "TransPerfect Aura",
    "Presenters: Mario Lenoci and Filip Smet\nMario has 40 minutes before his 1:15 p.m. formal commitment.",
    { track: "DEMO" },
  ),
  row("12:45-1:05 PM", "Media Creator", "Presenter: Paulette Pantoja\n10-minute turnover on both sides.", {
    track: "DEMO",
  }),
  row("1:15-1:35 PM", "GlobalLink ONE", "Presenters: Sofia Alves and Keith Brazil", { track: "DEMO" }),
  row(
    "1:45-2:05 PM",
    "GlobalLink Coach",
    "Presenters: Diego Bartolome and Anna Zaretskaya\n25 minutes after ONE starts; 10-minute stage turnover.",
    { track: "DEMO" },
  ),
  row(
    "2:15-2:35 PM",
    "TransPerfect Aura",
    "Presenters: Mario Lenoci and Filip Smet\n35 minutes after Mario's formal appearance ends at 1:40 p.m.",
    { track: "DEMO" },
  ),
];

/**
 * The board, in the same standard layout block as the twelve division agendas:
 * Bloom Corner dark ground, programme cards, no eyebrow, footer URL / dates
 * pair. The room line carries the stage name because no QEII room has been
 * recorded for the lounge — when one is issued it replaces this line.
 */
export const INNOVATION_LOUNGE_PROGRAMME: LondonAgendaProgramme = {
  title: "",
  meta: "THURSDAY, SEPTEMBER 24, 2026",
  rowStyle: "card",
  bandTreatment: "lavender",
  eyebrow: "",
  locationLine: "INNOVATION LOUNGE",
  footnote: "",
  footerLeft: "WWW.TRANSPERFECTNEXT.COM/EMEA/INNOVATION",
  footerRight: "24 & 25 SEPTEMBER, 2026",
  sessions: INNOVATION_LOUNGE_DAY_ONE,
  days: [
    { label: "", meta: "THURSDAY, SEPTEMBER 24, 2026", sessions: INNOVATION_LOUNGE_DAY_ONE },
    { label: "", meta: "FRIDAY, SEPTEMBER 25, 2026", sessions: INNOVATION_LOUNGE_DAY_TWO },
  ],
};

export type InnovationLoungeProduct = {
  /** Product name, as the stage schedule names it. */
  product: string;
  /** Approved headline for the demonstration. */
  tagline: string;
  /** Approved description, verbatim. */
  body: string;
  /** Presenter line, verbatim — including "or" choices. */
  presenters: string;
};

/**
 * The approved product write-ups shown under the schedule. One record per
 * product on the stage, in the order the write-ups were issued.
 */
export const INNOVATION_LOUNGE_PRODUCTS: InnovationLoungeProduct[] = [
  {
    product: "Media Creator",
    tagline: "Your Words. Your Voice. Any Style.",
    body: "Experience the future of AI-powered voice creation. See how Media Creator can generate natural-sounding audio, customise voice and expression, and adjust the tone—from energetic to mysterious—in real time based on audience input.",
    presenters: "Paulette Pantoja",
  },
  {
    product: "GlobalLink LIVE",
    tagline: "Every Voice, Understood in Real Time",
    body: "Experience real-time interpretation and captioning in action. See how GlobalLink LIVE helps organisations remove language barriers from meetings, events, and conversations, making live communication more accessible to audiences around the world.",
    presenters: "Peter Cselenyi, Nate Fong, or Justyn Vasquez",
  },
  {
    product: "TransPerfect Aura",
    tagline: "Meet Aura: AI Built Around Your Business",
    body: "Discover how Aura brings AI into the flow of work with an experience shaped around your organisation’s content, knowledge, and goals. This live demonstration will explore how teams can find answers, complete tasks, and move from information to action faster.",
    presenters: "Mario Lenoci and Filip Smet",
  },
  {
    product: "GlobalLink Coach",
    tagline: "Smarter Training, Personalised by AI",
    body: "See how GlobalLink Coach creates adaptive learning experiences tailored to each individual. Discover how AI-powered practice, feedback, and guidance can help organisations deliver more engaging training and build skills across global teams.",
    presenters: "Diego Bartolome and Anna Zaretskaya",
  },
  {
    product: "GlobalLink ONE",
    tagline: "Just Ask: One Conversation, All of GlobalLink",
    body: "Meet the conversational AI agent that brings GlobalLink’s capabilities into one connected experience. See how users can translate content, check project status, and complete everyday tasks simply by asking—in GlobalLink or within the AI tools where their teams already work.",
    presenters: "Keith Brazil",
  },
];

/**
 * The write-up for a scheduled row, matched on the product name. Returns null
 * for blackout and operations rows, and for any product with no approved
 * write-up yet — the schedule is never padded with invented copy.
 */
export function innovationLoungeProduct(title: string): InnovationLoungeProduct | null {
  const key = title.trim().toLowerCase();
  return INNOVATION_LOUNGE_PRODUCTS.find((p) => p.product.toLowerCase() === key) ?? null;
}

// -----------------------------------------------------------------------------
// NEXT 2026 San Francisco — agenda boards.
//
// Programme taken from the issued agenda at transperfectnext.com/usa/agenda
// (53 sessions, Tue 27 & Wed 28 Oct 2026, times PDT), read 30 Sep 2026.
// Titles, times and speakers are copied as published. Sessions starting at the
// same time share a band as parallel cards, each keeping its own time.
//
// The published agenda issues no rooms, tracks or division assignments, so
// every board carries the same full programme and room lines stay "to be
// confirmed" rather than guessed. Speaker lines print name + organisation.
// -----------------------------------------------------------------------------

import type { LondonAgendaProgramme } from "./next-agenda-london-2026";
import type { AgendaSession } from "./next-agenda";
import { SF_VENUE } from "./next-sf-event";

export const SF_DAY_ONE_META = "TUESDAY, OCTOBER 27, 2026";
export const SF_DAY_TWO_META = "WEDNESDAY, OCTOBER 28, 2026";
export const SF_FOOTER_RIGHT = "27 & 28 OCTOBER, 2026";

/** Kept for saved boards that still carry the old placeholder rows. */
export const SF_TBC_TITLE = "TO BE CONFIRMED";

const row = (
  time: string,
  title: string,
  detail = "",
  extra: Partial<AgendaSession> = {},
): AgendaSession => ({ time, title, detail, track: "", muted: false, ...extra });

/** Tuesday, October 27, 2026 — as published. */
const SF_DAY_ONE: AgendaSession[] = [
  row("11:00 AM-12:30 PM", "Registration & Networking", "", { muted: true }),
  row("12:30-12:40 PM", "Opening Remarks", "Pep Rosenfeld, BOOM Chicago"),
  row("12:40-1:05 PM", "Beyond Intelligence", "Matt Hauser, TransPerfect"),
  row("1:05-1:45 PM", "GlobalLink Roadmap", "Keith Brazil, TransPerfect; Julien Didier, TransPerfect"),
  row("1:50-2:15 PM", "Digital Transformation in Banking and Credit Unions", "Liz Castillo, Tinker Federal Credit Union; Harry Thakkar, TransPerfect", { parallels: [{ time: "1:50-2:15 PM", title: "Turning Information into Advantage", speaker: "Mark Lawyer, TransPerfect", detail: "" }, { time: "1:50-2:45 PM", title: "Breaking Down Silos: Centralized Translation from Development to Launch", speaker: "Dr. Madiha Khalid, Larimar Therapeutics; Jennifer Locasto, Sarepta; Alexandria Zieba, AZ Life Sciences Consulting Services", detail: "" }, { time: "1:50-2:45 PM", title: "This is TransPerfect Media", speaker: "Paulette Pantoja, TransPerfect", detail: "" }] }),
  row("2:20-2:45 PM", "Cleared for Takeoff: Driving Global Visibility & Value with TransPerfect Digital", "Adib Abrahim, American Airlines; Dana Weber, TransPerfect"),
  row("2:50-3:15 PM", "AI-Powered Content Personalization at Scale", "Harry Thakkar, TransPerfect", { parallels: [{ time: "2:50-3:15 PM", title: "Breaking Language Barriers: Elevating Medical Engagement Worldwide", speaker: "Sheryl Olinsky Borg, Merck", detail: "" }, { time: "2:50-3:15 PM", title: "Scaling Studio Localization with AI", speaker: "Karen Tsai, Lionsgate", detail: "" }, { time: "2:50-3:15 PM", title: "The Future of Mortgage", speaker: "Nora Guerra, Guild Mortgage; George Baker, Talk'uments, LLC; Jennifer Castejon, First American Title", detail: "" }] }),
  row("3:15-3:30 PM", "Break", "", { muted: true }),
  row("3:30-3:55 PM", "From Pitch to Platform: How GMS Redefined its Digital Footprint", "Linsey Bricker, GMS", { parallels: [{ time: "3:30-3:55 PM", title: "Marketing to the Hispanic Audience", speaker: "Alicia R. López, U.S. Bank; Jason Riviero", detail: "" }, { time: "3:30-3:55 PM", title: "One Team, One Dossier: Aligning Clinical & RA to Accelerate Approvals", speaker: "Denise Mayes-Gascard, Sanofi; Nat Arlander, Sanofi", detail: "" }, { time: "3:30-4:25 PM", title: "Driving International Growth with Media", speaker: "", detail: "" }] }),
  row("4:00-4:25 PM", "Enterprise Control, Global Scale: Centralizing Translation Governance", "", { parallels: [{ time: "4:00-4:25 PM", title: "Is Your Brand Still Visible? How to Stay Relevant in an Agentic World", speaker: "Dana Weber, TransPerfect; Leo Rotstein, TransPerfect", detail: "" }] }),
  row("4:30-4:55 PM", "Beyond the Hype: What it Actually Takes to Deploy AI that Works", "Nicholas Panagopoulos, TransPerfect; Guy Yalif, Webflow; Robert Balmaseda, Verndale; Emilio Di Zazzo, commercetools"),
  row("5:00-5:25 PM", "Managing Risk and Control in AI-Created Content", "Hilary Wright, TransPerfect"),
  row("5:25-5:50 PM", "The Catalysts for Evolution: An In-Depth Exploration of Zebra’s AI Journey", "Lisa Cowgill, Zebra Technologies; Ty Trainer, TransPerfect; Amanda Trew, Zebra Technologies"),
  row("5:50-6:15 PM", "Nexties Awards & Closing Remarks", "Matt Hauser, TransPerfect; Pep Rosenfeld, BOOM Chicago"),
  row("6:15-7:00 PM", "Cocktails & Networking", "", { muted: true }),
];

/** Wednesday, October 28, 2026 — as published. */
const SF_DAY_TWO: AgendaSession[] = [
  row("8:15-9:00 AM", "Registration", "", { muted: true }),
  row("9:00-9:25 AM", "AI for Gaming Development", "Matt Scott, Little Orbit", { parallels: [{ time: "9:00-9:25 AM", title: "Bridging Tech & Vendors: Seamless CMS Integration for Multi-Vendor Localization", speaker: "Arun Garg, Terumo Medical Corporation", detail: "" }, { time: "9:00-9:25 AM", title: "From Efficiency to Evolution: How AI Can Deliver Strategic Transformation", speaker: "Hilary Wright, TransPerfect; Ty Trainer, TransPerfect", detail: "" }, { time: "9:00-9:55 AM", title: "Panel Discussion: AI & Innovation for Digital Health", speaker: "Joseph Im, Regeneron Pharmaceuticals; Tracey Larrow, Datacubed; Chris Bowen, Clinical Operations Advisor", detail: "" }] }),
  row("9:30-9:55 AM", "Closing the Competitive Gap: How Pinterest Accelerated Ad Adoption & Monetization", "Jen Faruggio, Pinterest", { parallels: [{ time: "9:30-9:55 AM", title: "Orchestrating the Ecosystem: Multi-Vendor Translation Powered by Advanced Integration", speaker: "Christopher Sause, Cummins Inc.", detail: "" }, { time: "9:30-9:55 AM", title: "Player Trust Beyond Launch", speaker: "Daniel Lafuente, NC America", detail: "" }] }),
  row("10:00-10:25 AM", "Optimize Gaming Development with Global Partners", "Jimmy Corvan, Riot Games", { parallels: [{ time: "10:00-10:25 AM", title: "Quality at Scale: Combining Engine Training and Modernization for Long-Term Success", speaker: "Scott Spencer, Costco Travel", detail: "" }, { time: "10:00-10:25 AM", title: "Reinventing Marketing Operations: How Leading Brands Are Orchestrating AI", speaker: "Shane Madden, TransPerfect", detail: "" }, { time: "10:00-10:25 AM", title: "The Intelligence Hub: Orchestrating Enterprise AI Strategy with Enterprise TMS", speaker: "Vanessa Halloran, GSK", detail: "" }] }),
  row("10:30-10:55 AM", "Connected Content: How Agentic AI and Integrations Bridge Organizational Silos", "Greg Cohen, Smurfit Westrock", { parallels: [{ time: "10:30-10:55 AM", title: "From Global Reach to Local Relevance: Winning Players Market by Market", speaker: "Rytis Joseph Jan, Xsolla", detail: "" }, { time: "10:30-10:55 AM", title: "Putting Patients First: Architecting Localized Products for Global Health", speaker: "Harlene Grewal, Verily Life Sciences; Patrick McLoughlin, Localization Manager", detail: "" }, { time: "10:30-10:55 AM", title: "Raising the Bar on Event Accessibility: The AWS Playbook", speaker: "Marisol Jenkins, Amazon Web Services", detail: "" }] }),
  row("10:55-11:05 AM", "Break", "", { muted: true }),
  row("11:05-11:30 AM", "Agents: The Third-Party Channel Almost No One Is Ready For", "Diego Bartolome, TransPerfect; Brian Ballard, TransPerfect", { parallels: [{ time: "11:05-11:30 AM", title: "Beyond Human-in-the-Loop: Governing AI for Patient-Facing Content", speaker: "Sara Faye Green, WebMD Ignite", detail: "" }, { time: "11:05-11:30 AM", title: "Centralized Enterprise AI: The Custom Model Blueprint", speaker: "Oswaldo Lopez, Hewlett Packard Enterprise", detail: "" }, { time: "11:05 AM-12:00 PM", title: "Managed Care in Motion: AI Compliance & The Future of Member Engagement", speaker: "", detail: "" }] }),
  row("11:35 AM-12:00 PM", "Expanding Clinical Trial Accessibility with GlobalLink Web", "Mariah Blevins, Johnson & Johnson; Krista Goedel, Sanofi", { parallels: [{ time: "11:35 AM-12:00 PM", title: "Logistics of Localization: Deploying Enterprise TMS for Global Efficiency", speaker: "Paige W. Miller, UPS; Buddy McGrath, UPS", detail: "" }] }),
  row("12:00-12:50 PM", "Lunch", "", { muted: true }),
  row("1:00-2:00 PM", "Keynote", "Will Guidara", { track: "KEYNOTE" }),
  row("2:05-2:30 PM", "Aura: Building the Marketing Operating System", ""),
  row("2:30-2:55 PM", "Becoming AI-Forward: Scaling Localization and Content with Agentic AI", "Ajit Manuel, Amazon Web Services"),
  row("2:55-3:05 PM", "Closing Remarks", "Matt Hauser, TransPerfect; Pep Rosenfeld, BOOM Chicago"),
];

const SF_FOOTNOTE =
  "Programme as published at transperfectnext.com/usa/agenda. All times PDT. Rooms to be confirmed. Subject to change.";

/**
 * The default San Francisco board for any division area.
 *
 * Identical for every division: the published agenda assigns no session to a
 * division, so a per-division split here could only be invented.
 */
export function sfProgramme(_divisionId?: string): LondonAgendaProgramme {
  return {
    title: "",
    meta: SF_DAY_ONE_META,
    rowStyle: "card",
    bandTreatment: "lavender",
    eyebrow: "",
    // No room has been issued for the InterContinental, so the room line
    // carries the issued location instead of a guessed space.
    locationLine: SF_VENUE.venue.toUpperCase(),
    footnote: SF_FOOTNOTE,
    footerLeft: "WWW.TRANSPERFECTNEXT.COM",
    footerRight: SF_FOOTER_RIGHT,
    sessions: SF_DAY_ONE,
    days: [
      { label: "", meta: SF_DAY_ONE_META, sessions: SF_DAY_ONE },
      { label: "", meta: SF_DAY_TWO_META, sessions: SF_DAY_TWO },
    ],
  };
}

export const SF_AGENDA_EDITION = "san-francisco";

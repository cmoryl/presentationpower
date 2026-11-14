import { SJB_EVENT } from "@/lib/san-juan-bowl";

export interface SjbTimelineEntry {
  id: string;
  label: string;
  timing: string;
  status: "announced" | "tbc";
}

const kickoff: SjbTimelineEntry = {
  id: "kickoff", label: "Kickoff", timing: SJB_EVENT.localKickoffLabel,
  status: "announced",
};

export const SJB_GAME_SCHEDULE: SjbTimelineEntry[] = [
  kickoff,
  { id: "halftime", label: "Halftime", timing: "Time TBC · after the second quarter", status: "tbc" },
  { id: "end", label: "Game end", timing: "Time TBC · at the final whistle", status: "tbc" },
];

export const SJB_FAN_TIMELINE: SjbTimelineEntry[] = [
  { id: "arrival", label: "Arrival", timing: "Time TBC", status: "tbc" },
  { id: "pregame", label: "Pre-game", timing: "Time TBC", status: "tbc" },
  kickoff,
  { id: "postgame", label: "Post-game", timing: "Time TBC · after the final whistle", status: "tbc" },
];

/** Candidate links are not saved Canva design IDs or production exports. */
export const SJB_SCHEDULE_OPTIONS = [
  { name: "Feed", use: "Instagram / Facebook feed", options: ["https://www.canva.com/d/TCH9aCkJimUgJ1A", "https://www.canva.com/d/ClZEcGvgRohn03R", "https://www.canva.com/d/0l7xAArZ2kzqpUQ", "https://www.canva.com/d/J2vQ71hQc6NsFek"] },
  { name: "Story", use: "Instagram / Facebook Stories", options: ["https://www.canva.com/d/rRvdVVDCOVyBOrZ", "https://www.canva.com/d/3KrCi1A7AgBv5V0", "https://www.canva.com/d/o58jgb5lTxS5Tb3", "https://www.canva.com/d/jvVgZI6q59KDnc6"] },
  { name: "Flyer", use: "Print / digital handout", options: ["https://www.canva.com/d/Y97Am8sXKE8-wnL", "https://www.canva.com/d/E4BPOu7Ub9emOy7", "https://www.canva.com/d/KRvpXAa9iCARm2p", "https://www.canva.com/d/Himiv2J50NhS4OV"] },
] as const;
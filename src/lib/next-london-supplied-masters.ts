// TransPerfect NEXT 2026 — London SUPPLIED VENUE MASTERS.
//
// Some venue items come back from Illustrator as a finished live file: the
// design team takes our generated `.ai`, finishes it by hand, and that file —
// not a regenerated one — is what goes to print. Those files are registered
// here so the kit serves the supplied master, shows its own proof on the card,
// and never quietly hands the vendor a rebuilt ground instead.
//
// Same contract as a vendor booth wall: the supplied file downloads verbatim,
// so it is not re-audited by our generator QA (nothing was generated).

import wallWestminsterAi from "@/assets/london-supplied/wall-4e-westminster.ai.asset.json";
import wallWestminsterProof from "@/assets/london-supplied/wall-4e-westminster.jpg.asset.json";

export type LondonSuppliedMaster = {
  /** Panel this master replaces. */
  panelId: string;
  /** Live Illustrator (PDF-compatible) file, exactly as supplied. */
  aiUrl: string;
  /** Download filename. */
  filename: string;
  /** Flat proof of the supplied artboard, painted as the panel ground. */
  previewUrl: string;
  /** Revision the supplied file was finished from. */
  fromRevision: number;
  /** Date the file was handed back, ISO. */
  issued: string;
  note: string;
};

const MASTERS: LondonSuppliedMaster[] = [
  {
    panelId: "ldn-v32",
    aiUrl: wallWestminsterAi.url,
    filename: wallWestminsterAi.original_filename,
    previewUrl: wallWestminsterProof.url,
    fromRevision: 1,
    issued: "2026-09-09",
    note: "WALL 4E OUTSIDE WESTMINSTER — finished live file, 2590 × 2110 mm trim, 100 mm bleed. Print this file.",
  },
];

const BY_PANEL = new Map(MASTERS.map((m) => [m.panelId, m] as const));

export const LONDON_SUPPLIED_MASTERS = MASTERS;

/** The supplied live file for a panel, when the team has handed one back. */
export function londonSuppliedMaster(
  panel: { id: string } | string,
): LondonSuppliedMaster | null {
  const id = typeof panel === "string" ? panel : panel.id;
  return BY_PANEL.get(id) ?? null;
}

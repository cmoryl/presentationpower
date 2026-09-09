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
import doorVinylAi from "@/assets/london-supplied/main-entrance-door-vinyl.ai.asset.json";
import doorVinylProof from "@/assets/london-supplied/main-entrance-door-vinyl.jpg.asset.json";
import deskVinylAi from "@/assets/london-supplied/registration-desk-vinyl.ai.asset.json";
import deskVinylProof from "@/assets/london-supplied/registration-desk-vinyl.jpg.asset.json";
import regPillarAi from "@/assets/london-supplied/registration-pillar.ai.asset.json";
import regPillarProof from "@/assets/london-supplied/registration-pillar.jpg.asset.json";

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
  {
    panelId: "ldn-v07",
    aiUrl: deskVinylAi.url,
    filename: deskVinylAi.original_filename,
    previewUrl: deskVinylProof.url,
    fromRevision: 1,
    issued: "2026-09-09",
    note: "REGISTRATION DESK VINYL — finished live file, 3390 × 1900 mm trim. Print this file.",
  },
  {
    panelId: "ldn-v45",
    aiUrl: doorVinylAi.url,
    filename: doorVinylAi.original_filename,
    previewUrl: doorVinylProof.url,
    fromRevision: 1,
    issued: "2026-09-09",
    note: "MAIN ENTRANCE DOOR VINYL — finished live file, 900 × 2100 mm trim. Print this file.",
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

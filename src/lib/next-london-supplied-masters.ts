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

import { londonLiveFile } from "@/lib/next-london-live-files";
import { londonBoothArtworkUrl } from "@/lib/next-london-signage";


export type LondonSuppliedMaster = {
  /** Panel this master replaces. */
  panelId: string;
  /** Live Illustrator (PDF-compatible) file, exactly as supplied. */
  aiUrl: string;
  /** Download filename. */
  filename: string;
  /** Print-ready PDF supplied alongside the Illustrator file, when there is one. */
  printUrl?: string | null;
  printFilename?: string | null;
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
  {
    panelId: "ldn-v49",
    aiUrl: regPillarAi.url,
    filename: regPillarAi.original_filename,
    previewUrl: regPillarProof.url,
    fromRevision: 1,
    issued: "2026-09-09",
    note: "REGISTRATION PILLAR — finished live file, 596.9 × 1981 mm trim. Print this file.",
  },
];

const BY_PANEL = new Map(MASTERS.map((m) => [m.panelId, m] as const));

export const LONDON_SUPPLIED_MASTERS = MASTERS;

/** The supplied live file for a panel, when the team has handed one back. */
export function londonSuppliedMaster(panel: { id: string } | string): LondonSuppliedMaster | null {
  const id = typeof panel === "string" ? panel : panel.id;
  // A live file version published from the kit outranks whatever shipped with
  // this build, so swapping the file updates every card at once.
  const live = londonLiveFile(id);
  if (live?.masterUrl) {
    const bundled = BY_PANEL.get(id);
    return {
      panelId: id,
      aiUrl: live.masterUrl,
      filename: live.filename,
      printUrl: live.printUrl ?? null,
      printFilename: live.printFilename ?? null,
      previewUrl: live.proofUrl ?? bundled?.previewUrl ?? "",
      fromRevision: live.version,
      issued: live.issued,

      note:
        live.note ??
        `Finished live file, version ${live.version}, issued ${live.issued}. Print this file.`,
    };
  }
  return BY_PANEL.get(id) ?? null;
}

/**
 * Proof of the supplied live file, painted as the panel ground so previews,
 * the live editor and the venue renders all show the finished artwork rather
 * than a regenerated gradient. Logos, headlines, codes and uploaded artwork
 * still layer on top and stay editable.
 */
export function londonSuppliedGroundUrl(panelId: string): string | null {
  const live = londonLiveFile(panelId);
  if (live?.proofUrl) return live.proofUrl;
  return BY_PANEL.get(panelId)?.previewUrl ?? null;
}

/**
 * THE artwork a sign shows, in one place.
 *
 * Order matters and used to be wrong in half the surfaces: a bundled vendor
 * booth wall was resolved BEFORE a newer published live file, so replacing a
 * booth master left thumbnails, the live editor, the venue renders and the
 * downloaded `.ai` painting the artwork that shipped with the build. Anything
 * that paints or embeds a sign's artwork must call this — never the bundled
 * lookups directly.
 */
export function londonPanelArtworkUrl(panelId: string): string | null {
  const live = londonLiveFile(panelId);
  if (live?.proofUrl) return live.proofUrl;
  return BY_PANEL.get(panelId)?.previewUrl ?? londonBoothArtworkUrl(panelId) ?? null;
}

/** Version stamp of the artwork in force — changes when a live file is replaced. */
export function londonPanelArtworkVersion(panelId: string): string {
  const live = londonLiveFile(panelId);
  if (live) return `v${live.version}`;
  const bundled = BY_PANEL.get(panelId);
  return bundled ? `r${bundled.fromRevision}` : "bundled";
}

/**
 * Same artwork, with the version appended as a cache buster. A replaced file
 * can keep the same URL, and without this a browser keeps the old bitmap.
 */
export function londonPanelArtworkSrc(panelId: string): string | null {
  const url = londonPanelArtworkUrl(panelId);
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;
  const version = londonPanelArtworkVersion(panelId);
  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}


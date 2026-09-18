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
//
// The bundled set is now the 18 September 2026 print pack in
// `next-london-pack-2281.ts` — one entry per print area, keyed to the area it
// replaces. Earlier one-off supplied files (the first Wall 4E, registration
// desk, main entrance door and registration pillar hand-backs) were retired
// when that pack landed, so no card can serve a superseded file.

import {
  LONDON_PACK_AREAS,
  LONDON_PACK_ISSUE,
  londonPackPageCount,
} from "@/lib/next-london-pack-2281";
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

function packNote(panelId: string, filename: string): string {
  const pages = londonPackPageCount(panelId);
  const sheets =
    pages > 1 ? ` ${pages} artboard pages in the file (leaves, versions or template parts).` : "";
  return `${filename} — finished live file from the ${LONDON_PACK_ISSUE.label}.${sheets} Print this file.`;
}

const MASTERS: LondonSuppliedMaster[] = LONDON_PACK_AREAS.filter(
  // Survey photographs and cut templates in the delivery are reference only.
  (area) => area.kind === "artwork" && area.proofUrls.length > 0,
).map((area) => ({
  panelId: area.panelId,
  aiUrl: area.masterUrl,
  filename: area.masterFilename,
  printUrl: area.printUrl,
  printFilename: area.printFilename,
  previewUrl: area.proofUrls[0] ?? "",
  fromRevision: 1,
  issued: LONDON_PACK_ISSUE.issued,
  note: [packNote(area.panelId, area.masterFilename), area.warning].filter(Boolean).join(" "),
}));

const BY_PANEL = new Map(MASTERS.map((m) => [m.panelId, m] as const));

export const LONDON_SUPPLIED_MASTERS = MASTERS;

/** Every print area covered by the pack in force, reference sheets included. */
const PACK_PANEL_IDS = new Set(LONDON_PACK_AREAS.map((area) => area.panelId));

/**
 * Does this sign have a file from the delivery in force (or a newer published
 * live file)? The kit lists these by default: an area with no supplied file is
 * an older spec-sheet entry, and showing it beside the delivered artwork made
 * the schedule read as out of date.
 */
export function londonHasSuppliedFile(panel: { id: string } | string): boolean {
  const id = typeof panel === "string" ? panel : panel.id;
  if (londonLiveFile(id)?.masterUrl) return true;
  return PACK_PANEL_IDS.has(id);
}

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

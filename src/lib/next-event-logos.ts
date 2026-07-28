// Resolves the correct TransPerfect NEXT lockup suite for an event playbook.
//
// The NEXT 2026 system has a master lockup (TRANSPERFECT NEXT) plus per-track
// lockups such as City Series. Flagship editions — London and any other
// master-brand NEXT event — lead with the master mark; the regional roadshow
// leads with the City Series mark. Artwork is served from the bundled
// /next-2026/logos set defined in the NEXT brand guide.

import { NEXT_DIVISIONS, type NextDivisionBrand, type NextLockup } from "@/lib/next-brand-guide";

export type NextLogoEntry = { url: string; ratio: number };

export type NextLockupSuite = {
  trackId: string;
  trackName: string;
  /** Single-line / side-by-side mark for wide frames. */
  wide: NextLogoEntry;
  wideWhite: NextLogoEntry;
  /** Stacked mark for square and portrait frames. */
  stacked: NextLogoEntry;
  stackedWhite: NextLogoEntry;
  /** Every approved lockup in the track, for the identity showcase. */
  showcase: { id: string; label: string; note: string; color: string; white: string }[];
};

function pick(
  lockups: NextLockup[],
  order: NextLockup["lockup"][],
  variant: NextLockup["variant"],
): NextLockup | undefined {
  for (const l of order) {
    const hit = lockups.find((x) => x.lockup === l && x.variant === variant);
    if (hit) return hit;
  }
  return lockups.find((x) => x.variant === variant);
}

function entry(l?: NextLockup): NextLogoEntry {
  return { url: l?.src ?? "", ratio: l?.aspect ?? 4 };
}

const NOTES: Record<string, string> = {
  "side-by-side": "Single line — banners, headers and wide crops.",
  ssv1: "Two-line horizontal — landscape frames.",
  ssv2: "Single line — banners and wide crops.",
  stacked: "Primary — square and portrait frames.",
};

function suiteFor(div: NextDivisionBrand): NextLockupSuite {
  const wideOrder: NextLockup["lockup"][] = ["side-by-side", "ssv2", "ssv1", "stacked"];
  const stackedOrder: NextLockup["lockup"][] = ["stacked", "ssv1", "side-by-side", "ssv2"];

  const seen = new Set<string>();
  const showcase: NextLockupSuite["showcase"] = [];
  for (const l of div.lockups) {
    if (seen.has(l.lockup)) continue;
    const color = div.lockups.find((x) => x.lockup === l.lockup && x.variant === "color");
    const white = div.lockups.find((x) => x.lockup === l.lockup && x.variant === "white");
    if (!color || !white) continue;
    seen.add(l.lockup);
    showcase.push({
      id: l.lockup,
      label: l.lockupLabel,
      note: NOTES[l.lockup] ?? "Approved lockup.",
      color: color.src,
      white: white.src,
    });
  }

  return {
    trackId: div.id,
    trackName: div.name,
    wide: entry(pick(div.lockups, wideOrder, "color")),
    wideWhite: entry(pick(div.lockups, wideOrder, "white")),
    stacked: entry(pick(div.lockups, stackedOrder, "color")),
    stackedWhite: entry(pick(div.lockups, stackedOrder, "white")),
    showcase,
  };
}

/** Track id for a playbook: City Series roadshow vs the master NEXT brand. */
export function nextTrackIdForPlaybook(playbookId: string, name: string): string | undefined {
  const hay = `${playbookId} ${name}`.toLowerCase();
  if (!hay.includes("next")) return undefined;
  if (hay.includes("city series") || hay.includes("city-series")) return "city-series";
  return "transperfect";
}

export function nextLockupSuite(trackId: string): NextLockupSuite | undefined {
  const div = NEXT_DIVISIONS.find((d) => d.id === trackId);
  return div ? suiteFor(div) : undefined;
}

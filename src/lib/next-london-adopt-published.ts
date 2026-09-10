// Bring the revision in force INTO this browser's editors.
//
// Previews and downloads already fall back to the published overrides, but the
// live editors read only the local stores. That split is what made a saved wall
// recipe, lockup placement or board size look absent in the editor while it kept
// printing on the file — two different answers for the same sign. Adopting the
// published values on load gives every surface one answer.
//
// Adoption never overwrites a local edit, and never resurrects a value the user
// explicitly reset (those carry a clear marker).

import { londonBoardSizes, setLondonBoardSize } from "@/lib/next-london-board-size";
import { londonLogoPlacements, setLondonLogoPlacement } from "@/lib/next-london-logo-placement";
import { londonOverrideCleared } from "@/lib/next-london-override-clears";
import { londonPlacedArtMap, setLondonPlacedArt } from "@/lib/next-london-placed-art";
import type { LondonOverrides } from "@/lib/next-london-revise";
import { LONDON_PANELS } from "@/lib/next-london-signage";
import { setStepRepeatConfig, stepRepeatConfigs } from "@/lib/next-london-step-repeat";

/**
 * Adopt every published override this browser has neither edited nor reset, and
 * return the published snapshot normalised to the adopted values.
 *
 * Normalising matters: a stored recipe is clamped on the way in, so comparing a
 * clamped local value against the raw published one would flag the sign as an
 * unpublished draft and auto-publish it again on every page load.
 */
export function adoptLondonPublishedOverrides(
  overrides: LondonOverrides | null | undefined,
): LondonOverrides | null {
  if (!overrides || typeof window === "undefined") return overrides ?? null;
  const placementsOut = { ...(overrides.placements ?? {}) };
  const boardsOut = { ...(overrides.boardSizes ?? {}) };
  const wallsOut = { ...(overrides.stepRepeat ?? {}) };
  const artOut = { ...(overrides.placedArt ?? {}) };

  const placements = londonLogoPlacements();
  for (const [id, value] of Object.entries(overrides.placements ?? {})) {
    if (placements[id] || londonOverrideCleared("placement", id)) continue;
    placementsOut[id] = setLondonLogoPlacement(id, value);
  }

  const boards = londonBoardSizes();
  for (const [id, value] of Object.entries(overrides.boardSizes ?? {})) {
    if (boards[id] || londonOverrideCleared("boardSize", id)) continue;
    const panel = LONDON_PANELS.find((p) => p.id === id);
    if (panel) boardsOut[id] = setLondonBoardSize(panel, value);
  }

  const walls = stepRepeatConfigs();
  for (const [id, value] of Object.entries(overrides.stepRepeat ?? {})) {
    if (walls[id] || londonOverrideCleared("stepRepeat", id)) continue;
    wallsOut[id] = setStepRepeatConfig(id, value);
  }

  const art = londonPlacedArtMap();
  for (const [id, value] of Object.entries(overrides.placedArt ?? {})) {
    if (art[id] || londonOverrideCleared("placedArt", id)) continue;
    setLondonPlacedArt(id, value);
    artOut[id] = value;
  }

  return {
    ...overrides,
    placements: placementsOut,
    boardSizes: boardsOut,
    stepRepeat: wallsOut,
    placedArt: artOut,
  };
}

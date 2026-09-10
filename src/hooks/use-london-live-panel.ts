// One truth for "show me this sign as it stands right now".
//
// Every preview surface — hub cards, thumbnails, in-situ venue renders, print
// resolution previews — must reflect the edits saved in this browser (moved or
// turned lockup, accent tuning, re-measured board, uploaded vector artwork) on
// top of whatever was last published. This hook is that merge, so no surface
// can quietly fall behind the editor.

import { useMemo } from "react";

import { applyLondonBoardSize, useLondonBoardSizes } from "@/lib/next-london-board-size";
import { useLondonLiveFiles } from "@/lib/next-london-live-files";
import { useLondonLogoPlacements } from "@/lib/next-london-logo-placement";
import { useLondonPlacedArt } from "@/lib/next-london-placed-art";
import {
  londonEditsArePublished,
  useLondonPublishedOverrides,
} from "@/lib/next-london-published-overrides";
import { useStepRepeatConfigs } from "@/lib/next-london-step-repeat";
import type { LondonArtOptions } from "@/lib/next-london-revise";
import type { LondonPanel } from "@/lib/next-london-signage";

export interface LondonLivePanel {
  /** The panel resolved against its measured board size. */
  panel: LondonPanel;
  /** Builder options carrying this browser's unpublished edits. */
  options: LondonArtOptions;
  /** Changes whenever anything above changes — use it as a repaint key. */
  signature: string;
  /** True when this browser holds edits that have not been published. */
  draft: boolean;
}

export function useLondonLivePanel(
  input: LondonPanel,
  base: LondonArtOptions = {},
): LondonLivePanel {
  const placements = useLondonLogoPlacements();
  const placedArtMap = useLondonPlacedArt();
  const boardSizes = useLondonBoardSizes();
  // A newly published live file for this sign must repaint every surface too.
  const liveFiles = useLondonLiveFiles();
  // Saves are auto-published, so "draft" means "not yet in the revision in force".
  const publishedOverrides = useLondonPublishedOverrides();
  // Wall recipes (marks, text, QR payload and colours) are edits like any other:
  // a download must carry the recipe saved in this browser, not the last one
  // that made it into a revision — otherwise an exported wall loses its QR rows.
  const stepRepeats = useStepRepeatConfigs();

  return useMemo(() => {
    const placement = placements[input.id];
    const placedArt = placedArtMap[input.id];
    const boardSize = boardSizes[input.id];
    const stepRepeat = stepRepeats[input.id];
    const options: LondonArtOptions = {
      ...base,
      ...(placement ? { placement } : {}),
      ...(placedArt ? { placedArt } : {}),
      ...(boardSize ? { boardSize } : {}),
      ...(stepRepeat ? { stepRepeat } : {}),
    };
    return {
      panel: applyLondonBoardSize(input, boardSizes),
      options,
      signature: [
        input.id,
        input.style,
        input.name,
        input.ground,
        JSON.stringify(placement ?? null),
        JSON.stringify(placedArt ?? null),
        JSON.stringify(boardSize ?? null),
        JSON.stringify(base),
        liveFiles[input.id]
          ? `live:${liveFiles[input.id]!.version}:${liveFiles[input.id]!.proofUrl ?? ""}`
          : "live:none",
      ].join("|"),
      draft:
        Boolean(placement || placedArt || boardSize) &&
        !londonEditsArePublished(input.id, { placement, placedArt, boardSize }, publishedOverrides),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    input,
    placements,
    placedArtMap,
    boardSizes,
    liveFiles,
    publishedOverrides,
    JSON.stringify(base),
  ]);
}

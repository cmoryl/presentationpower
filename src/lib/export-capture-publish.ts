// Persist the scene graph captured during an in-app export.
//
// This is the bridge that lets the server-side export (app API + MCP connector)
// rebuild slides from the real rendered component instead of re-interpreting a
// module into generic PowerPoint shapes. Best-effort by design: a failure here
// must never cost the user the file they just exported.

import type { Deck } from "./deck-store";
import { captureContextOf, slideCaptureFingerprint } from "./export-capture-key";
import { saveSlideCapture } from "./export-captures.functions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PublishableCapture = {
  position: number;
  slideId: string;
  variantId: string;
  mode: "light" | "dark";
  plate: string;
  runs: unknown[];
  shapes: unknown[];
};

export async function publishSlideCaptures(
  deck: Deck,
  captures: PublishableCapture[] | undefined,
): Promise<{ saved: number; failed: number }> {
  // Local-only decks have no cloud row to attach captures to.
  if (!captures?.length || !UUID.test(deck.id)) return { saved: 0, failed: 0 };
  const ctx = captureContextOf(deck);
  const byId = new Map(deck.slides.map((s) => [s.id, s]));
  let saved = 0;
  let failed = 0;
  // Sequential: each plate is a sizeable data URL and there is no benefit to
  // racing several large uploads from the export screen.
  for (const cap of captures) {
    const slide = byId.get(cap.slideId);
    if (!slide) continue;
    try {
      const res = await saveSlideCapture({
        data: {
          deckId: deck.id,
          slideId: cap.slideId,
          position: cap.position,
          variantId: cap.variantId,
          mode: cap.mode,
          fingerprint: slideCaptureFingerprint(slide, ctx, cap.mode),
          plate: cap.plate,
          runs: cap.runs,
          shapes: cap.shapes,
        },
      });
      if (res.ok) saved += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  if (failed) console.warn(`[export-captures] ${failed} slide capture(s) could not be saved`);
  return { saved, failed };
}

// ---------------------------------------------------------------------------
// Showcase demo completeness pass.
//
// The authored demo payloads carry real copy, but they used to ship without two
// things a finished deck always has: photographic imagery on the modules that
// render an image slot, and an explicit backdrop scene per slide (so the
// generated, editable copy in "My files" paints the same designed grounds the
// marketing pages promise instead of one repeated abstract field).
//
// This pass is deterministic — same deck id in, same seeds and scenes out — so
// the demo landing page preview, the generated deck and any division retarget
// all agree.
// ---------------------------------------------------------------------------

import type { SlideTransition, TemplatePayload } from "./deck-store";
import type { SkinScene } from "./skin-backgrounds";
import { variantSupportsImagery } from "./variant-media";

/** Backdrop scene per module family, so consecutive slides never repeat the
 *  same ground and each section gets the register it was designed for. */
function sceneForVariant(variantId: string, index: number): SkinScene {
  if (variantId.startsWith("MV-OP-COVER")) return "cover";
  if (variantId.startsWith("MV-OP-AGENDA")) return "agenda";
  if (variantId.startsWith("MV-OP-DIVIDER")) return "section";
  if (variantId.startsWith("MV-INS")) return "statement";
  if (variantId.startsWith("MV-IMG")) return "split";
  if (variantId.startsWith("MV-CTX")) return index % 2 === 0 ? "split" : "bento";
  if (variantId.startsWith("MV-SOL")) return "bento";
  if (variantId.startsWith("MV-PROC")) return "timeline";
  if (variantId.startsWith("MV-INFO") || variantId.startsWith("MV-GRAPH")) return "chart";
  if (variantId === "MV-PROOF-TESTIMONIAL" || variantId.includes("QUOTE")) return "quote";
  if (variantId.startsWith("MV-PROOF")) return "stats";
  if (variantId.startsWith("MV-CLOSE")) return "closing";
  return index % 2 === 0 ? "split" : "stats";
}

/** The deck-level fallback every demo ships with. */
export const DEMO_DEFAULT_TRANSITION: SlideTransition = { type: "fade", durationMs: 420 };

/**
 * Playback transition per module family. Section cues (covers, dividers,
 * statements) get a directional push so a new chapter reads as a move; content
 * slides stay on a soft crossfade so reading is never interrupted. Deterministic
 * on (variant, index) like the rest of this pass.
 */
function transitionForVariant(variantId: string, index: number): SlideTransition {
  if (variantId.startsWith("MV-OP-COVER")) return { type: "fade", durationMs: 620 };
  if (variantId.startsWith("MV-OP-DIVIDER")) return { type: "push-left", durationMs: 520 };
  if (variantId.startsWith("MV-INS")) return { type: "zoom", durationMs: 520 };
  if (variantId.startsWith("MV-CLOSE")) return { type: "zoom", durationMs: 560 };
  if (variantId.startsWith("MV-IMG")) return { type: "push-left", durationMs: 460 };
  if (variantId.startsWith("MV-PROC")) return { type: "push-left", durationMs: 440 };
  if (variantId === "MV-PROOF-TESTIMONIAL" || variantId.includes("QUOTE"))
    return { type: "fade", durationMs: 540 };
  // Everything else alternates gently so long content runs still have rhythm.
  return index % 3 === 2
    ? { type: "push-left", durationMs: 420 }
    : { type: "fade", durationMs: 420 };
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);
}

/**
 * Fill in imagery seeds + backdrop scenes for an authored showcase payload.
 * Never overwrites anything the author set explicitly.
 */
export function enrichShowcasePayload(payload: TemplatePayload, key: string): TemplatePayload {
  const slides = payload.slides.map((slide, i) => {
    const variantId = slide.variantId;
    const content = { ...(slide.content as Record<string, unknown>) };

    // 1. Photography on every module that actually renders an image slot.
    if (variantSupportsImagery(variantId) && !content.mediaSeed && !content.mediaUrl) {
      const label =
        typeof content.title === "string"
          ? content.title
          : typeof content.message === "string"
            ? content.message
            : variantId;
      content.mediaSeed = `${key}-${slug(label)}-${i + 1}`;
    }

    // 2. An explicit designed ground per slide.
    const override = (slide as { templateOverride?: { scene?: SkinScene } }).templateOverride;
    const templateOverride = {
      ...(override ?? {}),
      scene: override?.scene ?? sceneForVariant(variantId, i),
    };

    // 3. A playback transition per slide, so a demo opened straight from the
    //    library already feels authored during presentation instead of cutting
    //    hard between every slide.
    const authored = (slide as { transition?: SlideTransition }).transition;
    const transition = authored ?? transitionForVariant(variantId, i);

    return {
      ...slide,
      content,
      templateOverride,
      transition,
    } as TemplatePayload["slides"][number];
  });

  // Demos are final, reviewed pieces — the generated editable copy opens with
  // every QA gate and warning suppressed.
  return {
    ...payload,
    slides,
    context: {
      ...(payload.context ?? {}),
      demoApproved: true,
      defaultTransition: payload.context?.defaultTransition ?? DEMO_DEFAULT_TRANSITION,
    },
  };
}

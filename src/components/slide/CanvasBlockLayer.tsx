import { useRef } from "react";
import type { CanvasBlock } from "@/lib/deck-store";
import type { BrandMode } from "@/lib/taxonomy";
import { CanvasBlockContent, canvasBlockFrameStyle, sortBlocks } from "./CanvasBlockView";
import { useHideAdoptedSources } from "./AdoptedSourceHider";

/**
 * Read-only render of free-canvas blocks over the 1920×1080 stage.
 * Used by ScaledSlide-hosted previews, presenter mode, and share viewer so
 * blocks travel with the deck. Editor uses FreeCanvasEditor for the same
 * blocks but with drag / resize / text-edit interactions.
 */
export function CanvasBlockLayer({
  blocks,
  brand,
}: {
  blocks: readonly CanvasBlock[] | undefined;
  brand: BrandMode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // The overlay is a child of the stage, so its parent is the render we adopted
  // sections out of — hide those originals here too, not just in the editor.
  const stageRef = useRef<HTMLElement | null>(null);
  if (ref.current && !stageRef.current) stageRef.current = ref.current.parentElement;
  useHideAdoptedSources(stageRef, blocks);

  if (!blocks || blocks.length === 0) return <div ref={ref} className="hidden" aria-hidden />;
  const ink = brand.tokens.ink ?? brand.tokens.primary;
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-40">
      {sortBlocks(blocks).map((b) => (
        <div key={b.id} style={canvasBlockFrameStyle(b)}>
          <CanvasBlockContent block={b} ink={ink} />
        </div>
      ))}
    </div>
  );
}

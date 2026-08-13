import type { CanvasBlock } from "@/lib/deck-store";
import type { BrandMode } from "@/lib/taxonomy";
import { CanvasBlockContent, canvasBlockFrameStyle, sortBlocks } from "./CanvasBlockView";

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
  if (!blocks || blocks.length === 0) return null;
  const ink = brand.tokens.ink ?? brand.tokens.primary;
  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {sortBlocks(blocks).map((b) => (
        <div key={b.id} style={canvasBlockFrameStyle(b)}>
          <CanvasBlockContent block={b} ink={ink} />
        </div>
      ))}
    </div>
  );
}

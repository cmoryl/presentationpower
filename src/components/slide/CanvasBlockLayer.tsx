import { useRef } from "react";
import type { CanvasBlock } from "@/lib/deck-store";
import type { BrandMode } from "@/lib/taxonomy";
import { CanvasBlockContent, canvasBlockFrameStyle, sortBlocks } from "./CanvasBlockView";
import { useHideAdoptedSources } from "./AdoptedSourceHider";
import { useCanvasEmphasis } from "@/lib/canvas-emphasis";

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
  useHideAdoptedSources(ref, blocks, true);
  // Hover / click in the Slide layers panel emphasizes the matching object.
  const { selectedId, hoverId } = useCanvasEmphasis();

  const ink = brand.tokens.ink ?? brand.tokens.primary;
  const visible = sortBlocks(blocks ?? []);
  const emphasized = visible.filter((b) => b.id === selectedId || b.id === hoverId);
  const dim = Boolean(selectedId || hoverId) && emphasized.length > 0;

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-40">
      {visible.map((b) => {
        const on = b.id === selectedId || b.id === hoverId;
        const style = canvasBlockFrameStyle(b);
        return (
          <div
            key={b.id}
            style={{
              ...style,
              // Push the rest of the stack back so the picked object reads
              // clearly, without moving or resizing anything.
              opacity: dim && !on ? Number(style.opacity ?? 1) * 0.35 : style.opacity,
              transition: "opacity 140ms ease",
            }}
          >
            <CanvasBlockContent block={b} ink={ink} />
          </div>
        );
      })}
      {emphasized.map((b) => (
        <div
          key={`emph-${b.id}`}
          aria-hidden
          style={{
            ...canvasBlockFrameStyle(b),
            opacity: 1,
            outline: `${b.id === selectedId ? 4 : 3}px solid ${
              b.id === selectedId ? "#003FC7" : "#EC388A"
            }`,
            outlineOffset: "3px",
            borderRadius: 6,
            boxShadow:
              b.id === selectedId
                ? "0 0 0 10px rgba(0,63,199,0.14)"
                : "0 0 0 10px rgba(236,56,138,0.12)",
          }}
        />
      ))}
    </div>
  );
}

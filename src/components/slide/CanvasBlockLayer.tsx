import type { CanvasBlock } from "@/lib/deck-store";
import type { BrandMode } from "@/lib/taxonomy";

/**
 * Read-only render of free-canvas blocks over the 1920×1080 stage.
 * Used by ScaledSlide-hosted previews, presenter mode, and share viewer so
 * blocks travel with the deck. Editor uses FreeCanvasEditor for the same
 * blocks but with drag / text-edit interactions.
 */
export function CanvasBlockLayer({
  blocks,
  brand,
}: {
  blocks: readonly CanvasBlock[] | undefined;
  brand: BrandMode;
}) {
  if (!blocks || blocks.length === 0) return null;
  const ink = brand.tokens.text ?? brand.tokens.primary;
  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      {blocks.map((b) => {
        const fs = b.kind === "heading" ? 96 : b.kind === "body" ? 40 : 26;
        const w = b.kind === "heading" ? 700 : b.kind === "body" ? 500 : 400;
        return (
          <div
            key={b.id}
            style={{
              position: "absolute",
              left: `${(b.x / 1920) * 100}%`,
              top: `${(b.y / 1080) * 100}%`,
              width: `${(b.w / 1920) * 100}%`,
              minHeight: `${(b.h / 1080) * 100}%`,
              color: b.color ?? ink,
              fontSize: fs,
              lineHeight: b.kind === "heading" ? 1.02 : 1.28,
              letterSpacing: b.kind === "heading" ? "-0.03em" : "-0.005em",
              fontWeight: b.weight ?? w,
              textAlign: b.align ?? "left",
              whiteSpace: "pre-wrap",
            }}
          >
            {b.text}
          </div>
        );
      })}
    </div>
  );
}

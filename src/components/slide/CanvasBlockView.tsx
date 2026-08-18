import { memo } from "react";
import type { CanvasBlock } from "@/lib/deck-store";
import { canvasFillCss } from "@/lib/canvas-fill";

import { STAGE_H, STAGE_W } from "@/lib/canvas-snap";

/**
 * Single source of truth for how a canvas block paints, shared by the read-only
 * CanvasBlockLayer (present / share / thumbnails) and the interactive
 * FreeCanvasEditor, so what you drag is exactly what ships.
 */

export const BLOCK_FONT_SIZE: Record<string, number> = {
  heading: 96,
  body: 40,
  caption: 26,
};

export function blockFontSize(b: CanvasBlock): number {
  return b.size ?? BLOCK_FONT_SIZE[b.kind] ?? 40;
}

/**
 * Paint order for the interactive editor: suppressed blocks removed (they only
 * exist to keep a deleted module section hidden), hidden blocks KEPT so the
 * layers panel can still list and un-hide them.
 */
export function sortBlocksForEdit(blocks: readonly CanvasBlock[]): CanvasBlock[] {
  return [...blocks]
    .filter((b) => !b.suppressed)
    .map((b, i) => ({ b, i }))
    .sort((a, z) => (a.b.z ?? a.i) - (z.b.z ?? z.i) || a.i - z.i)
    .map(({ b }) => b);
}

/**
 * Paint order for every shipping surface (read-only layer, present, share,
 * PPTX export): suppressed AND hidden blocks removed.
 */
export function sortBlocks(blocks: readonly CanvasBlock[]): CanvasBlock[] {
  return sortBlocksForEdit(blocks).filter((b) => !b.hidden);
}

export function canvasBlockFrameStyle(b: CanvasBlock): React.CSSProperties {
  return {
    position: "absolute",
    left: `${(b.x / STAGE_W) * 100}%`,
    top: `${(b.y / STAGE_H) * 100}%`,
    width: `${(b.w / STAGE_W) * 100}%`,
    height: `${(b.h / STAGE_H) * 100}%`,
    opacity: b.opacity ?? 1,
    // Type scale lives in a custom property so the editor can retype a block
    // during a live resize without re-rendering React.
    ["--cb-fs" as never]: `${blockFontSize(b)}px`,
  };
}

export function canvasBlockTextStyle(b: CanvasBlock, ink: string): React.CSSProperties {
  return {
    color: b.color ?? ink,
    fontSize: `var(--cb-fs, ${blockFontSize(b)}px)`,
    lineHeight: b.kind === "heading" ? 1.02 : 1.28,
    letterSpacing: b.kind === "heading" ? "-0.03em" : "-0.005em",
    fontWeight: b.weight ?? (b.kind === "heading" ? 700 : 500),
    textAlign: b.align ?? "left",
    whiteSpace: "pre-wrap",
    width: "100%",
    height: "100%",
    overflow: "visible",
  };
}


export const CanvasBlockContent = memo(function CanvasBlockContent({
  block,
  ink,
}: {
  block: CanvasBlock;
  ink: string;
}) {

  if (block.kind === "image") {
    if (!block.src) {
      return (
        <div
          className="flex h-full w-full items-center justify-center border border-dashed text-[20px] uppercase tracking-widest"
          style={{ borderColor: "rgba(0,0,0,0.2)", color: ink, borderRadius: block.radius ?? 24 }}
        >
          Image
        </div>
      );
    }
    return (
      <img
        src={block.src}
        alt={block.alt ?? ""}
        style={{
          width: "100%",
          height: "100%",
          objectFit: block.fit ?? "cover",
          borderRadius: block.radius ?? 24,
          display: "block",
        }}
      />
    );
  }
  if (block.kind === "shape") {
    const advanced = (block.fillKind ?? "solid") !== "solid";
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: canvasFillCss(
            {
              fillKind: block.fillKind,
              fill: block.fill,
              gradient: block.gradient,
              imageUrl: block.src,
              imageFit: block.fit,
            },
            "rgba(255,255,255,0.16)",
          ),
          border: block.stroke
            ? `2px solid ${block.stroke}`
            : // Adopted plates already carry the module's own edge treatment —
              // adding a default hairline outlines every tile twice.
              block.sourceSelector
              ? "none"
              : "1px solid rgba(255,255,255,0.28)",
          borderRadius: block.radius ?? 28,
          // Blur is a look for user-inserted glass only; blurring an adopted
          // plate frosts the module content sitting behind it.
          backdropFilter: advanced || block.sourceSelector ? undefined : "blur(14px)",
        }}
      />
    );
  }
  return <div style={canvasBlockTextStyle(block, ink)}>{block.text}</div>;
});


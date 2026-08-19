/**
 * TransPerfect ELEMENT — Modular Design System logo system.
 *
 * The mark is a five-brick "E" monogram: a full-width cap rail, a short brick +
 * long brick middle row, and a long brick + short brick base row. Bricks read as
 * modules; the negative gaps are the system's grid.
 *
 * Variants: mono (currentColor), color (brand spectrum), reversed (white on dark).
 * Never distort, recolor outside these variants, keyline, or crowd the mark —
 * clear space equals one brick height on every side.
 */

import { useTheme } from "@/hooks/use-theme";

export type ElementMarkTone = "mono" | "color" | "reversed";
/** `auto` follows the app theme: mono in light, reversed (white) in dark. */
export type ElementTone = ElementMarkTone | "auto";

/** Resolve `auto` against the active theme; other tones pass straight through. */
export function useResolvedElementTone(tone: ElementTone): ElementMarkTone {
  const [mode] = useTheme();
  if (tone !== "auto") return tone;
  return mode === "dark" ? "reversed" : "mono";
}

const BRICKS = [
  { x: 0, y: 0, w: 100, h: 20, k: "cap" },
  { x: 0, y: 26, w: 26, h: 20, k: "midShort" },
  { x: 32, y: 26, w: 68, h: 20, k: "midLong" },
  { x: 0, y: 52, w: 68, h: 20, k: "baseLong" },
  { x: 74, y: 52, w: 26, h: 20, k: "baseShort" },
] as const;

/** Brand spectrum assignment for the color mark (fixed — do not re-map). */
const COLOR_FILLS: Record<string, string> = {
  cap: "#2563EB",
  midShort: "#14B8A6",
  midLong: "#0D2A6B",
  baseLong: "#FF6B57",
  baseShort: "#8B5CF6",
};

export function ElementMark({
  tone = "mono",
  size = 28,
  className = "",
  title = "TransPerfect Element",
}: {
  tone?: ElementMarkTone;
  size?: number;
  className?: string;
  title?: string;
}) {
  const flat = tone === "reversed" ? "#FFFFFF" : "currentColor";
  return (
    <svg
      viewBox="0 0 100 72"
      width={size}
      height={(size * 72) / 100}
      className={className}
      role="img"
      aria-label={title}
      shapeRendering="crispEdges"
    >
      {BRICKS.map((b) => (
        <rect
          key={b.k}
          x={b.x}
          y={b.y}
          width={b.w}
          height={b.h}
          fill={tone === "color" ? COLOR_FILLS[b.k] : flat}
        />
      ))}
    </svg>
  );
}

/** Compact monogram / favicon form — cap, short brick, base pair only. */
export function ElementMonogram({
  size = 24,
  className = "",
  tone = "mono",
}: {
  size?: number;
  className?: string;
  tone?: ElementMarkTone;
}) {
  const fill = tone === "reversed" ? "#FFFFFF" : tone === "color" ? "#2563EB" : "currentColor";
  return (
    <svg
      viewBox="0 0 76 72"
      width={size}
      height={(size * 72) / 76}
      className={className}
      role="img"
      aria-label="Element"
      shapeRendering="crispEdges"
    >
      <rect x={0} y={0} width={76} height={20} fill={fill} />
      <rect x={0} y={26} width={52} height={20} fill={fill} />
      <rect x={0} y={52} width={30} height={20} fill={fill} />
      <rect x={36} y={52} width={16} height={20} fill={fill} />
    </svg>
  );
}

export type ElementLockupLayout = "stacked" | "horizontal" | "wordmark";

/**
 * Full lockup: master ("TRANSPERFECT") over the ELEMENT wordmark with the
 * "MODULAR DESIGN SYSTEM" descriptor. Stacked leads with the mark; horizontal
 * uses a hairline divider; wordmark drops the mark entirely.
 */
export function ElementLockup({
  layout = "horizontal",
  tone = "mono",
  className = "",
  markSize = 34,
  showDescriptor = true,
}: {
  layout?: ElementLockupLayout;
  tone?: ElementMarkTone;
  className?: string;
  markSize?: number;
  showDescriptor?: boolean;
}) {
  const ink = tone === "reversed" ? "text-white" : "";
  const Words = (
    <div className={`min-w-0 leading-none ${ink}`}>
      <div className="text-[0.5rem] font-medium tracking-[0.42em] opacity-80 sm:text-[0.6rem]">
        TRANSPERFECT
      </div>
      <div className="mt-1 text-lg font-semibold tracking-[0.3em] sm:text-xl">ELEMENT</div>
      {showDescriptor ? (
        <div className="mt-1 text-[0.42rem] tracking-[0.32em] opacity-70 sm:text-[0.5rem]">
          MODULAR DESIGN SYSTEM
        </div>
      ) : null}
    </div>
  );

  if (layout === "wordmark") return <div className={className}>{Words}</div>;

  if (layout === "stacked") {
    return (
      <div className={`flex flex-col items-center gap-3 text-center ${className}`}>
        <ElementMark tone={tone} size={markSize} />
        {Words}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <ElementMark tone={tone} size={markSize} />
      <span
        aria-hidden
        className={
          tone === "reversed" ? "h-9 w-px bg-white/40" : "h-9 w-px bg-current/25 opacity-30"
        }
      />
      {Words}
    </div>
  );
}

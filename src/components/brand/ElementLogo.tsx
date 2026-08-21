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
import elementLogoAsset from "@/assets/element-logo.svg.asset.json";
import elementLogoReversedAsset from "@/assets/element-logo-reversed.svg.asset.json";
import elementLogoMonoAsset from "@/assets/element-logo-mono.svg.asset.json";

export type ElementMarkTone = "mono" | "color" | "reversed";
/** `auto` follows the app theme: mono in light, reversed (white) in dark. */
export type ElementTone = ElementMarkTone | "auto";

/** Resolve `auto` against the active theme; other tones pass straight through. */
export function useResolvedElementTone(tone: ElementTone): ElementMarkTone {
  const [mode] = useTheme();
  if (tone !== "auto") return tone;
  return mode === "dark" ? "reversed" : "mono";
}

/**
 * Master-file brick geometry, normalised from the approved artwork
 * (viewBox 156.5 191 356.5 363) to a 100 x 101.8 grid. Do not redraw.
 */
const BRICKS = [
  { x: 0, y: 0, w: 100, h: 28.89, k: "cap" },
  { x: 0, y: 35.19, w: 35.48, h: 30.16, k: "midShort" },
  { x: 41.52, y: 35.19, w: 58.48, h: 30.16, k: "midLong" },
  { x: 0, y: 72.09, w: 58.77, h: 29.73, k: "baseLong" },
  { x: 64.66, y: 72.09, w: 35.34, h: 29.73, k: "baseShort" },
] as const;

const MARK_H = 101.82;

/** Master-file colour assignment for the colour mark (fixed — do not re-map). */
export const ELEMENT_BRICK_COLORS = {
  cap: "#135CFB",
  midShort: "#08BFC1",
  midLong: "#073091",
  baseLong: "#FC5950",
  baseShort: "#7C4EF4",
} as const;

const COLOR_FILLS: Record<string, string> = ELEMENT_BRICK_COLORS;

/** Ordered brick spectrum for motifs, rails and accent rows. */
export const ELEMENT_SPECTRUM = [
  ELEMENT_BRICK_COLORS.cap,
  ELEMENT_BRICK_COLORS.midShort,
  ELEMENT_BRICK_COLORS.midLong,
  ELEMENT_BRICK_COLORS.baseLong,
  ELEMENT_BRICK_COLORS.baseShort,
] as const;

/** Master lockup artwork per tone (approved SVG files, never redrawn). */
export const ELEMENT_LOCKUP_URLS: Record<ElementMarkTone, string> = {
  color: elementLogoAsset.url,
  reversed: elementLogoReversedAsset.url,
  mono: elementLogoMonoAsset.url,
};

export function ElementMark({
  tone: toneProp = "mono",
  size = 28,
  className = "",
  title = "TransPerfect Element",
}: {
  tone?: ElementTone;
  size?: number;
  className?: string;
  title?: string;
}) {
  const tone = useResolvedElementTone(toneProp);
  const flat = tone === "reversed" ? "#FFFFFF" : "currentColor";
  return (
    <svg
      viewBox={`0 0 100 ${MARK_H}`}
      width={size}
      height={(size * MARK_H) / 100}
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

/** Compact monogram / favicon form — the master mark at reduced fidelity. */
export function ElementMonogram({
  size = 24,
  className = "",
  tone: toneProp = "mono",
}: {
  size?: number;
  className?: string;
  tone?: ElementTone;
}) {
  return <ElementMark tone={toneProp} size={size} className={className} title="Element" />;
}

export type ElementLockupLayout = "stacked" | "horizontal" | "wordmark";

/**
 * Full lockup. By default this renders the APPROVED MASTER ARTWORK (SVG) for
 * the resolved tone — colour, reversed (white wordmark) or mono. Pass
 * `image={false}` for the constructed mark + type fallback used where the
 * lockup must inherit `currentColor` at tiny chrome sizes.
 */
export function ElementLockup({
  layout = "horizontal",
  tone: toneProp = "mono",
  className = "",
  markSize = 34,
  showDescriptor = true,
  image = true,
}: {
  layout?: ElementLockupLayout;
  tone?: ElementTone;
  className?: string;
  markSize?: number;
  showDescriptor?: boolean;
  image?: boolean;
}) {
  const tone = useResolvedElementTone(toneProp);

  if (image && layout !== "wordmark") {
    // Master artwork is 1983 x 793; scale from the requested mark height so the
    // lockup stays optically matched to constructed marks beside it.
    const height = markSize * (layout === "stacked" ? 1.9 : 1.55);
    return (
      <img
        src={ELEMENT_LOCKUP_URLS[tone]}
        alt="TransPerfect Element"
        className={`w-auto max-w-full object-contain ${className}`}
        style={{ height }}
      />
    );
  }

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


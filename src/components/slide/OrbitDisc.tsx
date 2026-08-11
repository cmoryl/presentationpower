import type { CSSProperties, ReactNode } from "react";
import { SEAM_HEIGHT_PX } from "@/lib/surface-tokens";

/**
 * OrbitDisc — the house circle.
 *
 * A layered concentric treatment first designed for the Before → After hub and
 * now the canonical circle for every Enterprise-look circular device: stat
 * callouts, donut centres, cycle hubs, orbit totals.
 *
 * Layers, outside → in:
 *  1. dashed outer orbit ring (faint accent)
 *  2. accent arc — a partial stroke that gives the circle direction, plus a
 *     shorter cool counter-arc for balance
 *  3. glass disc — top-lit radial wash, hairline accent ring, soft accent halo
 *  4. top seam, matching module cards
 */
export function OrbitDisc({
  size = 300,
  accent,
  cool,
  isDark,
  children,
  arcRotation = -118,
  seam = true,
  rings = true,
  className = "",
  style,
  contentClassName = "flex flex-col items-center justify-center text-center",
}: {
  /** Diameter of the inner glass disc in px. Rings scale off this. */
  size?: number;
  accent: string;
  /** Secondary hue for the counter-arc; falls back to accent. */
  cool?: string;
  isDark: boolean;
  children?: ReactNode;
  arcRotation?: number;
  seam?: boolean;
  rings?: boolean;
  className?: string;
  style?: CSSProperties;
  contentClassName?: string;
}) {
  const counter = cool || accent;
  const dashed = Math.round(size * 1.347);
  const arc = Math.round(size * 1.267);
  const arcR = arc / 2 - 4;
  const circumference = 2 * Math.PI * arcR;
  // Roughly 52% of the ring for the lead arc, 15% for the counter-arc.
  const lead = circumference * 0.52;
  const trail = circumference * 0.15;
  const padX = Math.max(24, Math.round(size * 0.11));

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={style}>
      {rings && (
        <>
          <div
            aria-hidden
            data-decorative
            className="absolute rounded-full"
            style={{
              width: dashed,
              height: dashed,
              border: `1px dashed color-mix(in oklab, ${accent} 28%, transparent)`,
            }}
          />
          <svg
            aria-hidden
            className="absolute"
            width={arc}
            height={arc}
            viewBox={`0 0 ${arc} ${arc}`}
            style={{ transform: `rotate(${arcRotation}deg)` }}
          >
            <circle
              cx={arc / 2}
              cy={arc / 2}
              r={arcR}
              fill="none"
              stroke={accent}
              strokeWidth={Math.max(3, Math.round(size * 0.013))}
              strokeLinecap="round"
              strokeDasharray={`${lead} ${circumference}`}
              opacity="0.9"
            />
            <circle
              cx={arc / 2}
              cy={arc / 2}
              r={arcR}
              fill="none"
              stroke={counter}
              strokeWidth={Math.max(3, Math.round(size * 0.013))}
              strokeLinecap="round"
              strokeDasharray={`${trail} ${circumference}`}
              strokeDashoffset={-(lead + circumference * 0.09)}
              opacity="0.55"
            />
          </svg>
        </>
      )}
      <div
        className={`relative rounded-full ${contentClassName}`}
        style={{
          width: size,
          height: size,
          paddingLeft: padX,
          paddingRight: padX,
          border: `1px solid color-mix(in oklab, ${accent} 45%, transparent)`,
          backgroundImage: isDark
            ? `radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, ${accent} 32%, transparent) 0%, rgba(255,255,255,0.05) 58%, rgba(255,255,255,0.02) 100%)`
            : `radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, ${accent} 14%, white) 0%, #FFFFFF 58%, #EEF3FB 100%)`,
          boxShadow: `0 0 0 ${Math.max(6, Math.round(size * 0.04))}px color-mix(in oklab, ${accent} ${isDark ? 8 : 6}%, transparent)`,
        }}
      >
        {seam && (
          <div
            aria-hidden
            data-decorative
            className="absolute"
            style={{
              top: Math.max(12, Math.round(size * 0.087)),
              left: "32%",
              right: "32%",
              height: SEAM_HEIGHT_PX,
              borderRadius: SEAM_HEIGHT_PX,
              backgroundImage: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            }}
          />
        )}
        {children}
      </div>
    </div>
  );
}

export default OrbitDisc;

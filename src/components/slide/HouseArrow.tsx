import { useId, type CSSProperties } from "react";

/**
 * HouseArrow — the system's canonical directional mark.
 *
 * Replaces stock stroke arrows (lucide `ArrowRight` et al.) wherever a slide
 * needs to point at something. The shape follows the same language as every
 * other decorative element in the deck system:
 *
 *  - a hairline shaft that FADES IN from its tail (no hard-cut line ends),
 *  - a solid, slightly over-scaled chevron head in the accent tone,
 *  - an optional trailing "travel" tick that implies motion without noise.
 *
 * Use this going forward for split diagrams, before/after hubs, step rails and
 * any inline "leads to" mark, so directional cues read the same everywhere.
 */
export function HouseArrow({
  tone,
  direction = "right",
  length = 120,
  thickness = 2,
  headScale = 1,
  className = "",
  style,
}: {
  /** Any CSS colour: the head is solid in this tone, the shaft fades to it. */
  tone: string;
  direction?: "right" | "left" | "up" | "down";
  /** Overall length along the pointing axis, in px. */
  length?: number;
  /** Shaft weight in px. */
  thickness?: number;
  /** Multiplier on the chevron head size. */
  headScale?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `house-arrow-${uid}`;
  const H = 44 * headScale;
  const rotate =
    direction === "left" ? 180 : direction === "up" ? -90 : direction === "down" ? 90 : 0;
  const headW = H * 0.42;
  const shaftEnd = length - headW - 6;

  return (
    <span
      aria-hidden
      data-house-arrow=""
      data-decorative
      className={`inline-flex items-center ${className}`}
      style={{ width: length, height: H, transform: `rotate(${rotate}deg)`, ...style }}
    >
      <svg width={length} height={H} viewBox={`0 0 ${length} ${H}`} fill="none">
        <defs>
          <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={tone} stopOpacity="0" />
            <stop offset="55%" stopColor={tone} stopOpacity="0.45" />
            <stop offset="100%" stopColor={tone} stopOpacity="0.95" />
          </linearGradient>
        </defs>
        {/* Shaft: fades in from the tail so it dissolves into the ground. */}
        <rect
          x={0}
          y={H / 2 - thickness / 2}
          width={Math.max(shaftEnd, 0)}
          height={thickness}
          rx={thickness}
          fill={`url(#${gradId})`}
        />
        {/* Travel tick — a short detached lead-in just behind the head. */}
        <rect
          x={Math.max(shaftEnd - H * 0.62, 0)}
          y={H / 2 - thickness / 2}
          width={H * 0.2}
          height={thickness}
          rx={thickness}
          fill={tone}
          opacity={0.35}
        />
        {/* Chevron head: open, mitred, no fill — reads sharp at slide scale. */}
        <path
          d={`M ${length - headW - 2} ${H / 2 - H * 0.26} L ${length - 2} ${H / 2} L ${length - headW - 2} ${H / 2 + H * 0.26}`}
          stroke={tone}
          strokeWidth={thickness * 1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default HouseArrow;

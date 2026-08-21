import type { CSSProperties } from "react";
import { useId } from "react";

/**
 * EchoArrow — a directional cue built from nested chevron "echoes" instead of a
 * shaft + head. Because it carries no long tail it lives entirely inside the
 * gutter of its own column and never crosses into neighbouring content panels.
 *
 * Three strokes ripple outward: the innermost is the most solid, each echo
 * behind it steps down in opacity and weight, reading as motion radiating away
 * from a centre hub.
 */
export function EchoArrow({
  tone,
  direction = "right",
  size = 30,
  echoes = 3,
  className = "",
  style,
}: {
  /** Any CSS colour: the leading chevron is near-solid in this tone. */
  tone: string;
  direction?: "right" | "left";
  /** Height of the chevron band in px; width scales from it. */
  size?: number;
  /** Number of chevron strokes, leading stroke included. */
  echoes?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const glowId = `echo-arrow-${uid}`;
  const n = Math.max(1, Math.min(4, echoes));
  const step = size * 0.34;
  const w = Math.round(size * 0.42 + step * (n - 1));
  const h = size;
  const armX = size * 0.3;
  const armY = size * 0.34;

  return (
    <span
      aria-hidden
      data-echo-arrow=""
      data-decorative
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        width: w,
        height: h,
        transform: direction === "left" ? "scaleX(-1)" : undefined,
        ...style,
      }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
        <defs>
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={tone} stopOpacity="0.16" />
            <stop offset="100%" stopColor={tone} stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Soft halo so the echoes sit on the ground rather than float on it. */}
        <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={`url(#${glowId})`} />
        {Array.from({ length: n }).map((_, i) => {
          // i = 0 is the leading (most solid) chevron; later strokes trail behind.
          const tipX = w - size * 0.1 - step * i;
          const t = i / Math.max(n - 1, 1);
          return (
            <path
              key={i}
              d={`M ${tipX - armX} ${h / 2 - armY} L ${tipX} ${h / 2} L ${tipX - armX} ${h / 2 + armY}`}
              stroke={tone}
              strokeOpacity={0.95 - t * 0.68}
              strokeWidth={Math.max(size * 0.075 - i * size * 0.014, 1)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
    </span>
  );
}

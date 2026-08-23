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
 *
 * `variant` restyles the strokes only — the occupied box (width × height) is
 * derived from `size` and `echoes` alone, so switching styles to match a theme
 * never shifts a single pixel of layout.
 */
export type EchoArrowVariant = "echo" | "thin" | "bold" | "dashed";

/** Per-variant stroke recipe. All values are multipliers of `size`. */
const VARIANTS: Record<
  EchoArrowVariant,
  {
    /** Leading stroke weight as a fraction of size. */
    weight: number;
    /** How much lighter each trailing echo gets, per step. */
    taper: number;
    /** Opacity of the leading stroke, and the fade applied across echoes. */
    leadOpacity: number;
    fade: number;
    /** Halo strength behind the chevrons (0 disables it). */
    halo: number;
    cap: "round" | "butt" | "square";
    /** Dash pattern as fractions of size; undefined = solid. */
    dash?: [number, number];
  }
> = {
  echo: { weight: 0.075, taper: 0.014, leadOpacity: 0.95, fade: 0.68, halo: 0.16, cap: "round" },
  thin: { weight: 0.042, taper: 0.007, leadOpacity: 0.82, fade: 0.55, halo: 0.08, cap: "round" },
  bold: { weight: 0.125, taper: 0.024, leadOpacity: 1, fade: 0.6, halo: 0.24, cap: "square" },
  dashed: {
    weight: 0.062,
    taper: 0.01,
    leadOpacity: 0.9,
    fade: 0.6,
    halo: 0.1,
    cap: "butt",
    dash: [0.13, 0.1],
  },
};

export const ECHO_ARROW_VARIANTS: { id: EchoArrowVariant; label: string }[] = [
  { id: "echo", label: "Echo" },
  { id: "thin", label: "Thin" },
  { id: "bold", label: "Bold" },
  { id: "dashed", label: "Dashed" },
];

/** Normalise arbitrary content input (e.g. deck JSON) to a known variant. */
export function coerceEchoArrowVariant(value: unknown): EchoArrowVariant {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  return v === "thin" || v === "bold" || v === "dashed" || v === "echo" ? v : "echo";
}

export function EchoArrow({
  tone,
  direction = "right",
  size = 30,
  echoes = 3,
  variant = "echo",
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
  /** Stroke treatment. Purely cosmetic — the layout box never changes. */
  variant?: EchoArrowVariant;
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
  const v = VARIANTS[variant] ?? VARIANTS.echo;
  const dash = v.dash
    ? `${(size * v.dash[0]).toFixed(2)} ${(size * v.dash[1]).toFixed(2)}`
    : undefined;

  return (
    <span
      aria-hidden
      data-echo-arrow=""
      data-echo-arrow-variant={variant}
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
            <stop offset="0%" stopColor={tone} stopOpacity={v.halo} />
            <stop offset="100%" stopColor={tone} stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Soft halo so the echoes sit on the ground rather than float on it. */}
        {v.halo > 0 ? (
          <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={`url(#${glowId})`} />
        ) : null}
        {Array.from({ length: n }).map((_, i) => {
          // i = 0 is the leading (most solid) chevron; later strokes trail behind.
          const tipX = w - size * 0.1 - step * i;
          const t = i / Math.max(n - 1, 1);
          return (
            <path
              key={i}
              d={`M ${tipX - armX} ${h / 2 - armY} L ${tipX} ${h / 2} L ${tipX - armX} ${h / 2 + armY}`}
              stroke={tone}
              strokeOpacity={v.leadOpacity - t * v.fade}
              strokeWidth={Math.max(size * v.weight - i * size * v.taper, 1)}
              strokeLinecap={v.cap}
              strokeLinejoin={v.cap === "square" ? "miter" : "round"}
              strokeDasharray={dash}
            />
          );
        })}
      </svg>
    </span>
  );
}

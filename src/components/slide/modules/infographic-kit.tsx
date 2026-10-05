// Infographic kit — solid colour blocks, donut gauges and labelled bars used
// by the stat/KPI modules. Every graphic is data-true: rings fill exactly to a
// stated percentage, bars are scaled against the largest figure in their own
// group. Nothing here invents a trend or a series.

import type { CSSProperties, ReactNode } from "react";
import { fillPx } from "@/lib/open-space-fill";

/** Approved brand fills (enterprise palette: primary, secondary accents, ink). */
export const INFO_FILL = {
  blue: { bg: "#003FC7", fg: "#FFFFFF", track: "rgba(255,255,255,0.22)", ring: "#A1FBF9" },
  navy: { bg: "#03002C", fg: "#FFFFFF", track: "rgba(255,255,255,0.16)", ring: "#C2A3FF" },
  aqua: { bg: "#A1FBF9", fg: "#03002C", track: "rgba(3,0,44,0.12)", ring: "#003FC7" },
  lavender: { bg: "#C2A3FF", fg: "#03002C", track: "rgba(3,0,44,0.12)", ring: "#03002C" },
} as const;
export type InfoFill = keyof typeof INFO_FILL;

export function pctOf(value: string, unit?: string): number | null {
  const raw = `${value}${unit ?? ""}`;
  if (!/%/.test(raw)) return null;
  const n = parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
}

export function numOf(value: string): number {
  const raw = value.replace(/,/g, "").trim();
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return /k\b|k\+?$/i.test(raw) ? n * 1000 : n;
}

export function Donut({
  pct,
  size,
  stroke,
  color,
  track,
  children,
}: {
  pct: number;
  size: number;
  stroke: number;
  color: string;
  track: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

export function Figure({
  value,
  unit,
  px,
  color,
  unitColor,
  style,
}: {
  value: string;
  unit?: string;
  px: number;
  color: string;
  unitColor?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className="tabular-nums"
      style={{
        fontSize: fillPx(px, "display"),
        fontWeight: 800,
        lineHeight: 0.92,
        letterSpacing: "-0.04em",
        color,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {value}
      {unit && <span style={{ fontSize: "0.62em", color: unitColor ?? color, marginLeft: "0.03em" }}>{unit}</span>}
    </div>
  );
}

/** Solid colour block — the core infographic tile. */
export function FillTile({
  fill,
  className,
  style,
  children,
}: {
  fill: InfoFill;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const f = INFO_FILL[fill];
  return (
    <div
      className={`relative overflow-hidden rounded-[22px] ${className ?? ""}`}
      style={{ background: f.bg, color: f.fg, minWidth: 0, ...style }}
    >
      {children}
    </div>
  );
}

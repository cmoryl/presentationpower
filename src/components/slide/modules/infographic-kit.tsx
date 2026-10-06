// Infographic kit — solid colour blocks, donut gauges and labelled bars used
// by the stat/KPI modules. Every graphic is data-true: rings fill exactly to a
// stated percentage, bars are scaled against the largest figure in their own
// group. Nothing here invents a trend or a series.

import { useId, type CSSProperties, type ReactNode } from "react";
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
  const m = raw.match(/[\d.]\s*([kmb])\b|[\d.]\s*([kmb])\+?$/i);
  const unit = (m?.[1] ?? m?.[2] ?? "").toLowerCase();
  return unit === "k" ? n * 1e3 : unit === "m" ? n * 1e6 : unit === "b" ? n * 1e9 : n;
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
  const gid = useId().replace(/:/g, "");
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`d${gid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={`color-mix(in oklab, ${color} 55%, #FFFFFF)`} />
            <stop offset="1" stopColor={color} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          style={{ filter: `drop-shadow(0 0 ${Math.round(stroke * 0.6)}px color-mix(in oklab, ${color} 60%, transparent))` }}
          stroke={`url(#d${gid})`}
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
  gradient,
}: {
  value: string;
  unit?: string;
  px: number;
  color: string;
  unitColor?: string;
  style?: CSSProperties;
  /** Optional gradient fill for the numerals (dark grounds). */
  gradient?: string;
}) {
  const grad: CSSProperties = gradient
    ? { backgroundImage: gradient, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }
    : {};
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
        ...grad,
        ...style,
      }}
    >
      {value}
      {unit && <span style={{ fontSize: "0.62em", color: unitColor ?? color, marginLeft: "0.03em" }}>{unit}</span>}
    </div>
  );
}

/** Layered surfaces for each fill: a lit gradient body, a soft glow from one
 * corner and a fine sheen, so blocks read as dimensional objects, not flat paint. */
const FILL_SKIN: Record<InfoFill, { body: string; glow: string; shadow: string; edge: string }> = {
  blue: {
    body: "linear-gradient(145deg, color-mix(in oklab, #003FC7 82%, #A1FBF9) 0%, #003FC7 42%, color-mix(in oklab, #003FC7 55%, #03002C) 100%)",
    glow: "radial-gradient(70% 60% at 100% 0%, rgba(161,251,249,0.45), transparent 70%)",
    shadow: "0 34px 60px -30px rgba(0,63,199,0.85), 0 10px 22px -12px rgba(3,0,44,0.45)",
    edge: "rgba(255,255,255,0.32)",
  },
  navy: {
    body: "linear-gradient(160deg, color-mix(in oklab, #03002C 78%, #003FC7) 0%, #03002C 55%, #03002C 100%)",
    glow: "radial-gradient(65% 55% at 92% 6%, rgba(0,63,199,0.9), transparent 70%), radial-gradient(55% 45% at 0% 100%, rgba(194,163,255,0.4), transparent 72%)",
    shadow: "0 40px 70px -34px rgba(3,0,44,0.9), 0 12px 26px -14px rgba(3,0,44,0.5)",
    edge: "rgba(255,255,255,0.16)",
  },
  aqua: {
    body: "linear-gradient(150deg, color-mix(in oklab, #A1FBF9 60%, #FFFFFF) 0%, #A1FBF9 45%, color-mix(in oklab, #A1FBF9 70%, #003FC7) 100%)",
    glow: "radial-gradient(70% 60% at 100% 0%, rgba(255,255,255,0.75), transparent 70%)",
    shadow: "0 30px 56px -30px rgba(0,63,199,0.55), 0 8px 20px -12px rgba(3,0,44,0.3)",
    edge: "rgba(255,255,255,0.7)",
  },
  lavender: {
    body: "linear-gradient(150deg, color-mix(in oklab, #C2A3FF 55%, #FFFFFF) 0%, #C2A3FF 48%, color-mix(in oklab, #C2A3FF 72%, #003FC7) 100%)",
    glow: "radial-gradient(70% 60% at 100% 0%, rgba(255,255,255,0.6), transparent 70%)",
    shadow: "0 30px 56px -30px rgba(80,40,190,0.6), 0 8px 20px -12px rgba(3,0,44,0.3)",
    edge: "rgba(255,255,255,0.6)",
  },
};

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
  const k = FILL_SKIN[fill];
  return (
    <div
      className={`relative overflow-hidden rounded-[26px] ${className ?? ""}`}
      style={{
        background: `${k.glow}, ${k.body}`,
        color: f.fg,
        minWidth: 0,
        boxShadow: `${k.shadow}, inset 0 1px 0 ${k.edge}, inset 0 0 0 1px ${k.edge.replace(/[\d.]+\)$/, "0.12)")}`,
        ...style,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 14px)",
          maskImage: "linear-gradient(200deg, black, transparent 60%)",
          WebkitMaskImage: "linear-gradient(200deg, black, transparent 60%)",
        }}
      />
      {children}
    </div>
  );
}

/** Glass panel for light/dark grounds — frosted body, lit top edge, deep shadow. */
export function GlassPanel({ dark, className, style, children }: { dark: boolean; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[26px] ${className ?? ""}`}
      style={{
        background: dark
          ? "linear-gradient(160deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))"
          : "linear-gradient(165deg, rgba(255,255,255,0.96), rgba(238,241,247,0.78))",
        backdropFilter: "blur(18px) saturate(140%)",
        WebkitBackdropFilter: "blur(18px) saturate(140%)",
        border: dark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.9)",
        boxShadow: dark
          ? "0 30px 60px -30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.18)"
          : "0 36px 70px -36px rgba(3,0,44,0.5), 0 10px 24px -16px rgba(0,63,199,0.35), inset 0 1px 0 #FFFFFF",
        minWidth: 0,
        minHeight: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** 10×10 waffle: exactly `pct` cells filled. */
export function Waffle({ pct, cell, gap, on, off }: { pct: number; cell: number; gap: number; on: string; off: string }) {
  const n = Math.round(pct);
  return (
    <div aria-hidden className="grid shrink-0" style={{ gridTemplateColumns: `repeat(10, ${cell}px)`, gap }}>
      {Array.from({ length: 100 }).map((_, i) => (
        <span key={i} style={{ width: cell, height: cell, borderRadius: cell * 0.28, background: i < n ? on : off }} />
      ))}
    </div>
  );
}

/** Semi-circle gauge filled exactly to `pct`. */
export function Gauge({ pct, width, stroke, color, track, children }: { pct: number; width: number; stroke: number; color: string; track: string; children?: ReactNode }) {
  const r = (width - stroke) / 2;
  const h = r + stroke;
  const len = Math.PI * r;
  const d = `M ${stroke / 2} ${h - stroke / 2} A ${r} ${r} 0 0 1 ${width - stroke / 2} ${h - stroke / 2}`;
  return (
    <div className="relative shrink-0" style={{ width, height: h }}>
      <svg width={width} height={h} aria-hidden>
        <path d={d} fill="none" stroke={track} strokeWidth={stroke} strokeLinecap="round" />
        <path d={d} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(pct / 100) * len} ${len}`} />
      </svg>
      {children && <div className="absolute inset-x-0 bottom-0 flex justify-center">{children}</div>}
    </div>
  );
}

/** Exactly `count` repeated glyphs (capped by caller), for whole-number counts. */
export function Pictogram({ count, size, color, dim, total, render }: { count: number; size: number; color: string; dim?: string; total?: number; render: (c: string, s: number) => ReactNode }) {
  const t = Math.max(total ?? count, count);
  return (
    <div aria-hidden className="flex flex-wrap" style={{ gap: Math.round(size * 0.3) }}>
      {Array.from({ length: t }).map((_, i) => (
        <span key={i} className="inline-flex">{render(i < count ? color : dim ?? color, size)}</span>
      ))}
    </div>
  );
}

/** Concentric radial bars (activity-ring style). Each arc fills exactly to its pct over `sweep` degrees. */
export function RadialBars({
  rings,
  size,
  stroke,
  gap,
  track,
  sweep = 270,
  children,
}: {
  rings: { pct: number; color: string }[];
  size: number;
  stroke: number;
  gap: number;
  track: string;
  sweep?: number;
  children?: ReactNode;
}) {
  const cx = size / 2;
  const start = -90 - (sweep - 180) / 2 - 90 + 90; // arc starts at the left of the gap
  const pt = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(a), cx + r * Math.sin(a)];
  };
  const arc = (r: number, deg: number) => {
    const s0 = 90 + (360 - sweep) / 2; // gap centred at the bottom
    const [x0, y0] = pt(r, s0);
    const [x1, y1] = pt(r, s0 + deg);
    return `M ${x0} ${y0} A ${r} ${r} 0 ${deg > 180 ? 1 : 0} 1 ${x1} ${y1}`;
  };
  void start;
  const gid = useId().replace(/:/g, "");
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden style={{ overflow: "visible" }}>
        <defs>
          {rings.map((g, i) => (
            <linearGradient key={i} id={`r${gid}${i}`} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor={g.color} />
              <stop offset="1" stopColor={`color-mix(in oklab, ${g.color} 50%, #FFFFFF)`} />
            </linearGradient>
          ))}
        </defs>
        {rings.map((g, i) => {
          const r = cx - stroke / 2 - i * (stroke + gap);
          return (
            <g key={i}>
              <path d={arc(r, sweep)} fill="none" stroke={track} strokeWidth={stroke} strokeLinecap="round" />
              <path
                d={arc(r, Math.max(0.5, (g.pct / 100) * sweep))}
                fill="none"
                stroke={`url(#r${gid}${i})`}
                strokeWidth={stroke}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 ${Math.round(stroke * 0.45)}px color-mix(in oklab, ${g.color} 55%, transparent))` }}
              />
            </g>
          );
        })}
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

/** Log-scale horizontal lollipop for counts of very different magnitude. */
export function LogLollipop({
  rows,
  ink,
  muted,
  hairline,
  px,
}: {
  rows: { value: string; unit?: string; label: string; n: number; color: string; icon?: ReactNode }[];
  ink: string;
  muted: string;
  hairline: string;
  px: (n: number) => number | string;
}) {
  const maxExp = Math.ceil(Math.log10(Math.max(10, ...rows.map((r) => r.n))));
  const ticks = Array.from({ length: maxExp + 1 }, (_, i) => Math.pow(10, i));
  const pos = (n: number) => (Math.log10(Math.max(1, n)) / maxExp) * 100;
  const fmt = (v: number) => (v >= 1000 ? `${v / 1000}K` : String(v));
  return (
    <div className="flex h-full flex-col justify-between gap-2">
      {rows.map((r, i) => (
        <div key={i} className="grid items-center gap-4" style={{ gridTemplateColumns: "44px 150px 1fr" }}>
          <span className="flex h-[44px] w-[44px] items-center justify-center rounded-[12px]" style={{ background: r.color, color: "#03002C" }}>{r.icon}</span>
          <div className="min-w-0">
            <div className="tabular-nums" style={{ fontSize: px(34), fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", color: ink, whiteSpace: "nowrap" }}>
              {r.value}
              {r.unit && <span style={{ fontSize: "0.65em" }}>{r.unit}</span>}
            </div>
            <div style={{ fontSize: px(14), color: muted, lineHeight: 1.2, marginTop: 4 }}>{r.label}</div>
          </div>
          <div className="relative h-[34px]">
            {ticks.map((t) => (
              <span key={t} aria-hidden className="absolute inset-y-0 w-px" style={{ left: `${pos(t)}%`, background: hairline }} />
            ))}
            <span aria-hidden className="absolute top-1/2 h-[6px] -translate-y-1/2 rounded-full" style={{ left: 0, width: `${pos(r.n)}%`, background: `linear-gradient(90deg, color-mix(in oklab, ${r.color} 15%, transparent), ${r.color})`, height: 10, boxShadow: `0 0 14px color-mix(in oklab, ${r.color} 60%, transparent)` }} />
            <span aria-hidden className="absolute top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${pos(r.n)}%`, background: `radial-gradient(circle at 35% 30%, #FFFFFF, ${r.color} 55%)`, boxShadow: `0 0 0 6px color-mix(in oklab, ${r.color} 25%, transparent), 0 0 18px ${r.color}` }} />
          </div>
        </div>
      ))}
      <div className="grid gap-4" style={{ gridTemplateColumns: "44px 150px 1fr" }}>
        <span />
        <span style={{ fontSize: px(12), color: muted }}>Log scale</span>
        <div className="relative h-[16px]">
          {ticks.map((t, i) => (
            <span key={t} className="absolute tabular-nums" style={{ left: `${pos(t)}%`, transform: i === 0 ? "none" : i === ticks.length - 1 ? "translateX(-100%)" : "translateX(-50%)", fontSize: px(12), color: muted }}>{fmt(t)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Dot field — exactly `count` dots (each worth `per`), laid out in `cols`
 * columns with a soft gradient across the field. */
export function DotField({ count, cols, dot, gap, from, to, total }: { count: number; cols: number; dot: number; gap: number; from: string; to: string; total?: number }) {
  // Hard cap: never more than 8 rows of dots, so a big figure can't overflow the slide.
  const max = Math.max(1, cols * 8);
  const rawT = Math.max(total ?? count, count, 0) || 0;
  const t = Math.min(max, Math.round(rawT));
  count = rawT > max ? Math.round((count / rawT) * t) : Math.max(0, Math.round(count));
  return (
    <div aria-hidden className="grid" style={{ gridTemplateColumns: `repeat(${cols}, ${dot}px)`, gap }}>
      {Array.from({ length: t }).map((_, i) => {
        const on = i < count;
        const f = t > 1 ? i / (t - 1) : 0;
        return (
          <span
            key={i}
            style={{
              width: dot,
              height: dot,
              borderRadius: dot,
              background: on ? `color-mix(in oklab, ${from} ${Math.round((1 - f) * 100)}%, ${to})` : "transparent",
              boxShadow: on ? undefined : `inset 0 0 0 1px color-mix(in oklab, ${from} 30%, transparent)`,
            }}
          />
        );
      })}
    </div>
  );
}

/** Per-dot unit for a count so the field stays between ~6 and ~150 dots. */
export function dotUnit(n: number): number {
  if (n <= 150) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return n / mag > 150 ? mag * 10 : mag;
}

/**
 * Scale capsule: a glowing gradient bar filled to the figure's position on a
 * stated scale. `log` places counts on order-of-magnitude ticks (10 → 100K);
 * `linear` fills against `max`. Data-true, never more than one element per tick.
 */
export function ScaleBar({ value, max, mode = "log", from, to, track, labelColor, height = 18, width = "100%" }: { value: number; max?: number; mode?: "log" | "linear"; from: string; to: string; track: string; labelColor: string; height?: number; width?: number | string }) {
  const v = Math.max(0, value);
  let pct: number;
  let ticks: { at: number; label: string }[] = [];
  if (mode === "log") {
    const top = Math.max(2, Math.ceil(Math.log10(Math.max(10, v)) + 0.0001));
    pct = v <= 1 ? 0 : Math.min(1, Math.log10(v) / top);
    const fmt = (e: number) => (e >= 6 ? `${10 ** (e - 6)}M` : e >= 3 ? `${10 ** (e - 3)}K` : String(10 ** e));
    ticks = Array.from({ length: top }, (_, i) => ({ at: (i + 1) / top, label: fmt(i + 1) }));
  } else {
    const m = Math.max(1, max ?? v);
    pct = Math.min(1, v / m);
  }
  const fill = `${Math.max(4, pct * 100)}%`;
  return (
    <div aria-hidden style={{ width }}>
      <div className="relative" style={{ height, borderRadius: height, background: track, overflow: "visible" }}>
        <div className="absolute inset-y-0 left-0" style={{ width: fill, borderRadius: height, background: `linear-gradient(90deg, ${from}, ${to})`, boxShadow: `0 0 ${height * 1.4}px color-mix(in oklab, ${to} 55%, transparent)` }} />
        <div className="absolute top-1/2" style={{ left: `calc(${fill} - ${height * 0.7}px)`, width: height * 1.4, height: height * 1.4, marginTop: -height * 0.7, borderRadius: height, background: to, boxShadow: `0 0 0 ${Math.round(height / 3)}px color-mix(in oklab, ${to} 30%, transparent), 0 0 ${height * 2}px ${to}` }} />
      </div>
      {ticks.length > 0 && (
        <div className="relative mt-3" style={{ height: 16 }}>
          {ticks.map((t) => (
            <span key={t.label} className="absolute -translate-x-full" style={{ left: `${t.at * 100}%`, fontSize: 13, color: labelColor, letterSpacing: "0.06em", fontVariantNumeric: "tabular-nums" }}>{t.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MV-FUNNEL figure ─────────────────────────────────────────────────────
// A data-shaped conversion cone: one continuous SVG funnel whose every
// boundary width is the real value, sliced into segments, paired with an
// editorial ledger on the right (stage, label, note, value, delta).
//
// Replaces the old stack of independently-clipped bands — the silhouette is
// now honest (each slice's top edge equals the previous slice's bottom edge)
// and the type lives on a clean surface instead of fighting a gradient.

import * as React from "react";
import type { ResolvedFunnelStyle } from "@/lib/funnel-style";

export type FunnelStage = {
  label: string;
  note: string;
  value: string;
  unit: string;
  icon: string;
  /** Numeric magnitude used for the silhouette. 0 = unknown. */
  num: number;
};

const SEG_H = 132;
const GAP = 8;
const FIG_W = 720;
/** Narrowest the cone is allowed to get, as a share of the full width. */
const MIN_W = 0.24;

function mix(hex: string, pct: number, other: string) {
  return `color-mix(in oklab, ${hex} ${pct}%, ${other})`;
}

export function FunnelFigure({
  stages,
  style,
  ink,
  renderIcon,
}: {
  stages: FunnelStage[];
  style: ResolvedFunnelStyle;
  ink: { strong: string; body: string; muted: string; faint: string; hairline: string };
  /** Supplied by the renderer so the figure reuses the deck's icon badge. */
  renderIcon?: (stage: FunnelStage, index: number) => React.ReactNode;
}) {
  const n = stages.length;
  if (!n) return null;

  const top = Math.max(1, stages[0].num || Math.max(1, ...stages.map((x) => x.num)));
  // Ratio at each boundary. Missing numbers fall back to an even taper.
  const ratio = stages.map((st, i) => (st.num > 0 ? Math.min(1, st.num / top) : 1 - (i / n) * 0.7));
  const wAt = (r: number) => FIG_W * (MIN_W + (1 - MIN_W) * Math.max(0, Math.min(1, r)));

  const figH = n * SEG_H + (n - 1) * GAP;
  const from = style.colorFrom;
  const to = style.colorTo;
  const fade = Math.max(0, Math.min(60, style.fade ?? 0));

  return (
    <div className="flex items-start gap-14">
      {/* ── cone ───────────────────────────────────────────────────────── */}
      <div className="relative shrink-0" style={{ width: FIG_W, height: figH }}>
        <svg
          viewBox={`0 0 ${FIG_W} ${figH}`}
          width={FIG_W}
          height={figH}
          className="absolute inset-0"
          aria-hidden
        >
          <defs>
            <linearGradient id="fnl-sheen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="46%" stopColor="#ffffff" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {stages.map((st, i) => {
            const y = i * (SEG_H + GAP);
            const rTop = ratio[i];
            const rBot = ratio[i + 1] ?? Math.max(MIN_W, rTop * 0.74);
            const wT = wAt(rTop);
            const wB = wAt(rBot);
            const cx = FIG_W / 2;
            const depth = n > 1 ? i / (n - 1) : 0;
            const pts = [
              [cx - wT / 2, y],
              [cx + wT / 2, y],
              [cx + wB / 2, y + SEG_H],
              [cx - wB / 2, y + SEG_H],
            ]
              .map((p) => p.join(","))
              .join(" ");
            const gid = `fnl-seg-${i}`;
            return (
              <g key={i}>
                <defs>
                  <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={from} />
                    <stop offset="100%" stopColor={to} />
                  </linearGradient>
                </defs>
                <polygon points={pts} fill={`url(#${gid})`} opacity={1 - (depth * fade) / 100} />
                <polygon points={pts} fill="url(#fnl-sheen)" />
              </g>
            );
          })}
        </svg>

        {/* value read-outs sit on top of each slice */}
        {stages.map((st, i) => {
          const y = i * (SEG_H + GAP);
          return (
            <div
              key={i}
              className="absolute flex items-center justify-center"
              style={{ left: 0, right: 0, top: y, height: SEG_H }}
            >
              <div className="flex items-baseline tabular-nums" style={{ color: "#ffffff" }}>
                <span style={{ fontSize: 66, fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1 }}>
                  {st.value || "—"}
                </span>
                <span className="ml-1" style={{ fontSize: 24, opacity: 0.78 }}>
                  {st.unit || "%"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── ledger ─────────────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1">
        {stages.map((st, i) => {
          const prev = i > 0 ? stages[i - 1].num : 0;
          const drop = i > 0 && prev > 0 && st.num > 0 ? Math.round(((prev - st.num) / prev) * 100) : 0;
          const retained = st.num > 0 ? Math.round((st.num / top) * 100) : 0;
          return (
            <div
              key={i}
              className="flex items-center gap-6"
              style={{
                height: SEG_H + (i < n - 1 ? GAP : 0),
                borderTop: i === 0 ? "none" : `1px solid ${ink.hairline}`,
              }}
            >
              {renderIcon?.(st, i)}
              <div className="min-w-0 flex-1">
                <div
                  className="uppercase tabular-nums"
                  style={{ fontSize: 13, letterSpacing: "0.3em", color: ink.muted }}
                >
                  Stage {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  className="mt-1 truncate"
                  style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", color: ink.strong }}
                >
                  {st.label}
                </div>
                {st.note && (
                  <div className="mt-1 truncate" style={{ fontSize: 18, color: ink.body }}>
                    {st.note}
                  </div>
                )}
                {/* retention track */}
                <div
                  className="mt-3 overflow-hidden rounded-full"
                  style={{ width: 300, height: 4, background: ink.hairline }}
                >
                  <div
                    style={{
                      width: `${Math.max(4, retained)}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, ${from}, ${to})`,
                    }}
                  />
                </div>
              </div>
              <div className="shrink-0 text-right" style={{ width: 150 }}>
                {drop > 0 ? (
                  <>
                    <div
                      className="tabular-nums"
                      style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", color: ink.strong }}
                    >
                      −{drop}%
                    </div>
                    <div className="uppercase" style={{ fontSize: 12, letterSpacing: "0.22em", color: ink.muted }}>
                      drop-off
                    </div>
                  </>
                ) : (
                  <div
                    className="ml-auto inline-flex items-center rounded-full px-4 py-1.5 uppercase"
                    style={{
                      fontSize: 12,
                      letterSpacing: "0.22em",
                      color: ink.strong,
                      background: mix(to, 14, "transparent"),
                      border: `1px solid ${mix(to, 30, "transparent")}`,
                    }}
                  >
                    Entry
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

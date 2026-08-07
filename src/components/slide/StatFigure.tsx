/**
 * StatFigure — statistics as TYPOGRAPHIC SHAPES.
 *
 * A statistic is not "a big font". It is a composed figure: the numeral is the
 * primary shape, and geometry (ghost counterform, slab, arc, baseline rule,
 * bracket notches) is set in relation to its optical box. Every shape is
 * derived from the active division accent via accent-tokens, so figures
 * re-colour with the deck exactly like module surfaces do.
 *
 * Typographic rules baked in:
 *  - tabular numerals, tight negative tracking that scales with size
 *  - unit/suffix set at ~0.34x the numeral and optically aligned to the
 *    cap-height (not the baseline) so "%" and "x" never float
 *  - label set as a tracked kicker below the figure's baseline rule
 *  - shapes never overlap the numeral's ink, only its counter/negative space
 */
import type { CSSProperties, ReactNode } from "react";
import { useSlideInk, useSlideMode, useSlideAccent } from "./SlideChrome";
import { accentTokens, hexA } from "@/lib/accent-tokens";
import { statGradient } from "@/lib/stat-contrast";

export type StatFigureShape =
  | "plain"
  | "ghost"
  | "slab"
  | "arc"
  | "rule"
  | "notch"
  | "column";

export interface StatFigureProps {
  value: string | number;
  unit?: string;
  label?: string;
  note?: string;
  /** Numeral font-size in slide px. Everything else scales from this. */
  size?: number;
  shape?: StatFigureShape;
  /** 0..1 — drives arc / column / slab fill length. */
  progress?: number;
  align?: "left" | "center";
  accent?: string;
  /** Trailing marker such as a trend arrow. */
  adornment?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** Optical tracking ramp — bigger type needs tighter fit. */
function trackingFor(size: number) {
  if (size >= 140) return "-0.055em";
  if (size >= 96) return "-0.045em";
  if (size >= 64) return "-0.038em";
  return "-0.03em";
}

export function StatFigure({
  value,
  unit,
  label,
  note,
  size = 96,
  shape = "ghost",
  progress = 0.72,
  align = "left",
  accent,
  adornment,
  className = "",
  style,
}: StatFigureProps) {
  const ink = useSlideInk();
  const mode = useSlideMode();
  const ctxAccent = useSlideAccent();
  const a = accent ?? ctxAccent ?? undefined;
  const isDark = mode === "dark";
  const t = accentTokens(a, isDark ? "dark" : "light");
  const p = Math.max(0, Math.min(1, progress));

  const stat = statGradient(t.accent, isDark ? "dark" : "light", "96deg", {
    ink: ink.strong,
  });
  const numeralInk: CSSProperties = {
    backgroundImage: stat.backgroundImage,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    filter: stat.filter,
  };

  const centered = align === "center";
  const unitSize = Math.round(size * 0.34);
  const capOffset = Math.round(size * 0.1);
  const ruleWeight = Math.max(3, Math.round(size * 0.055));

  const numeral = (
    <span
      className="tabular-nums font-bold"
      style={{
        fontSize: size,
        lineHeight: 0.86,
        letterSpacing: trackingFor(size),
        display: "inline-block",
        ...numeralInk,
      }}
    >
      {value}
    </span>
  );

  const unitEl = unit ? (
    <span
      className="font-medium"
      style={{
        fontSize: unitSize,
        lineHeight: 1,
        letterSpacing: "-0.015em",
        color: isDark ? "var(--slide-accent-text)" : t.accent,
        alignSelf: "flex-start",
        marginTop: capOffset,
      }}
    >
      {unit}
    </span>
  ) : null;

  return (
    <div
      className={`relative ${centered ? "flex flex-col items-center text-center" : "flex flex-col items-start"} ${className}`}
      style={style}
    >
      {/* ── Shape layer: negative-space geometry keyed to the numeral box ── */}
      {shape === "ghost" && (
        <span
          aria-hidden
          data-accent-glow
          className="tabular-nums font-bold pointer-events-none select-none absolute"
          style={{
            fontSize: Math.round(size * 1.9),
            lineHeight: 0.72,
            letterSpacing: trackingFor(size),
            top: -Math.round(size * 0.42),
            left: centered ? "50%" : -Math.round(size * 0.16),
            transform: centered ? "translateX(-50%)" : undefined,
            color: "transparent",
            WebkitTextStrokeWidth: Math.max(1, Math.round(size * 0.014)),
            WebkitTextStrokeColor: hexA(t.accent, isDark ? 0.2 : 0.14),
            zIndex: 0,
          }}
        >
          {value}
        </span>
      )}

      {shape === "slab" && (
        <span
          aria-hidden
          data-accent-glow
          className="pointer-events-none absolute"
          style={{
            left: centered ? "50%" : 0,
            transform: centered ? "translateX(-50%)" : undefined,
            bottom: Math.round(size * 0.14),
            height: Math.round(size * 0.34),
            width: `${Math.round(28 + p * 62)}%`,
            minWidth: Math.round(size * 0.9),
            background: `linear-gradient(90deg, ${hexA(t.accent, isDark ? 0.36 : 0.2)} 0%, ${hexA(t.accent, 0)} 100%)`,
            borderRadius: 2,
            zIndex: 0,
          }}
        />
      )}

      {shape === "notch" && (
        <span aria-hidden className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }}>
          {(["left", "right"] as const).map((side) => (
            <span
              key={side}
              className="absolute"
              style={{
                top: 0,
                [side]: -Math.round(size * 0.12),
                width: Math.round(size * 0.16),
                height: Math.round(size * 0.16),
                borderTop: `2px solid ${hexA(t.accent, 0.55)}`,
                [side === "left" ? "borderLeft" : "borderRight"]:
                  `2px solid ${hexA(t.accent, 0.55)}`,
              }}
            />
          ))}
        </span>
      )}

      {shape === "arc" ? (
        <div className="relative" style={{ width: size * 2.05, height: size * 1.32 }}>
          <svg
            aria-hidden
            viewBox="0 0 200 120"
            className="absolute inset-0 h-full w-full"
            style={{ overflow: "visible" }}
          >
            <path
              d="M14 108 A86 86 0 0 1 186 108"
              fill="none"
              stroke={hexA(t.accent, isDark ? 0.2 : 0.14)}
              strokeWidth={9}
              strokeLinecap="round"
            />
            <path
              d="M14 108 A86 86 0 0 1 186 108"
              fill="none"
              stroke={t.accent}
              strokeWidth={9}
              strokeLinecap="round"
              strokeDasharray={270}
              strokeDashoffset={270 * (1 - p)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
            <div className="flex items-start gap-1.5">
              {numeral}
              {unitEl}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`relative flex items-start ${centered ? "justify-center" : ""}`}
          style={{ gap: Math.round(size * 0.06), zIndex: 1 }}
        >
          {numeral}
          {unitEl}
          {adornment ? (
            <span
              style={{
                fontSize: Math.round(size * 0.26),
                color: ink.muted,
                marginTop: capOffset,
              }}
            >
              {adornment}
            </span>
          ) : null}
        </div>
      )}

      {/* ── Baseline geometry ── */}
      {(shape === "rule" || shape === "notch") && (
        <span
          aria-hidden
          data-accent-glow
          className="relative"
          style={{
            marginTop: Math.round(size * 0.12),
            height: ruleWeight,
            width: centered ? "60%" : `${Math.round(34 + p * 60)}%`,
            minWidth: Math.round(size * 1.1),
            borderRadius: ruleWeight,
            background: `linear-gradient(90deg, ${t.accent} 0%, ${hexA(t.accent, 0.15)} 100%)`,
            zIndex: 1,
          }}
        />
      )}

      {shape === "column" && (
        <span
          aria-hidden
          className="relative overflow-hidden"
          style={{
            marginTop: Math.round(size * 0.14),
            height: Math.max(5, Math.round(size * 0.07)),
            width: "100%",
            borderRadius: 999,
            background: isDark ? "rgba(255,255,255,0.10)" : hexA(t.accent, 0.12),
            zIndex: 1,
          }}
        >
          <span
            className="absolute inset-y-0 left-0"
            style={{
              width: `${Math.round(p * 100)}%`,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${t.accent} 0%, ${hexA(t.accent, 0.35)} 100%)`,
            }}
          />
        </span>
      )}

      {label ? (
        <div
          className="uppercase"
          style={{
            marginTop: Math.round(size * 0.14),
            fontSize: Math.max(13, Math.round(size * 0.16)),
            letterSpacing: "0.22em",
            fontWeight: 600,
            color: ink.muted,
            zIndex: 1,
          }}
        >
          {label}
        </div>
      ) : null}
      {note ? (
        <div
          style={{
            marginTop: Math.round(size * 0.08),
            fontSize: Math.max(14, Math.round(size * 0.19)),
            lineHeight: 1.35,
            color: ink.muted,
            zIndex: 1,
          }}
        >
          {note}
        </div>
      ) : null}
    </div>
  );
}

export default StatFigure;

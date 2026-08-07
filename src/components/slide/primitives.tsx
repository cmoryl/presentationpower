import type { CSSProperties, ReactNode } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import { useSlideInk, useSlideMode } from "./SlideChrome";
import { accentTokens, hexA } from "@/lib/accent-tokens";

/**
 * Editorial slide primitives — a small, disciplined typographic system used
 * across the 94 module variants so cover, divider, and content families feel
 * like one deck instead of 94 hand-tuned pages.
 *
 * Native stage is 1920×1080 (see ScaledSlide). Sizes are tuned for that stage;
 * they scale down cleanly to editor thumbnails and up cleanly to a projector.
 *
 * Rules of thumb (applied in Phase 2+):
 *   • No more than 3 type sizes per slide (Display + one supporting size + kicker).
 *   • Kicker in accent, uppercase, 0.28em tracking.
 *   • Titles use tight leading (0.98–1.05) and slight negative tracking.
 *   • Body copy at 30–36px with generous 1.35 leading.
 *   • Structural rules are always 1–2px, never heavy borders.
 */

// ── Kicker ────────────────────────────────────────────────────────────────
// Small uppercase eyebrow in accent above a title. Wide letterspacing gives
// the composition its editorial rhythm.
import { useSlideSkin } from "@/components/slide/SlideSkinContext";
import { ENTERPRISE_WHITE, isEnterpriseWhite } from "@/lib/slide-skin";

export function Kicker({
  brand,
  children,
  color,
  size = 22,
  tracking = "0.28em",
  className = "",
}: {
  brand: BrandMode;
  children: ReactNode;
  color?: string;
  size?: number;
  tracking?: string;
  className?: string;
}) {
  const ink = useSlideInk();
  const enterprise = isEnterpriseWhite(useSlideSkin());
  return (
    <div
      className={`${enterprise ? "font-bold" : "font-semibold"} uppercase ${className}`}
      style={{
        color: color ?? (enterprise ? ENTERPRISE_WHITE.ink : ink.muted),
        fontSize: enterprise ? Math.max(15, size - 5) : size,
        letterSpacing: enterprise ? "0.18em" : tracking,
        lineHeight: 1.1,
      }}
    >
      {children}
    </div>
  );
}

// ── Display / Title ───────────────────────────────────────────────────────
// The single dominant type element on a slide. Sizes are named, not free-form,
// so covers stay cinematic and titles stay quiet.
type DisplaySize = "hero" | "cover" | "divider" | "section" | "title";
const DISPLAY_SPECS: Record<
  DisplaySize,
  { fontSize: number; lineHeight: number; letterSpacing: string; weight: number }
> = {
  hero: { fontSize: 124, lineHeight: 0.94, letterSpacing: "-0.04em", weight: 600 },
  cover: { fontSize: 100, lineHeight: 0.98, letterSpacing: "-0.03em", weight: 600 },
  divider: { fontSize: 88, lineHeight: 1.02, letterSpacing: "-0.025em", weight: 600 },
  section: { fontSize: 72, lineHeight: 1.04, letterSpacing: "-0.02em", weight: 600 },
  title: { fontSize: 56, lineHeight: 1.08, letterSpacing: "-0.015em", weight: 600 },
};

export function DisplayTitle({
  children,
  size = "cover",
  color,
  maxWidthPx,
  // Slide titles are canvas artwork rendered many times per page (thumbnails,
  // previews, editors). Defaulting to <h1> put several top-level headings in
  // the document outline; callers that need real semantics can pass `as`.
  as: Tag = "div",
  className = "",
}: {
  children: ReactNode;
  size?: DisplaySize;
  color?: string;
  maxWidthPx?: number;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
}) {
  const spec = DISPLAY_SPECS[size];
  const enterprise = isEnterpriseWhite(useSlideSkin());
  const style: CSSProperties = {
    fontSize: spec.fontSize,
    lineHeight: enterprise ? spec.lineHeight + 0.04 : spec.lineHeight,
    letterSpacing: enterprise ? "-0.015em" : spec.letterSpacing,
    // Enterprise White headlines are light-weight editorial, not bold.
    fontWeight: enterprise ? 400 : spec.weight,
    maxWidth: maxWidthPx,
    color,
  };
  return (
    <Tag className={`m-0 ${className}`} style={style}>
      {children}
    </Tag>
  );
}

// ── Hairline / Rule ───────────────────────────────────────────────────────
// A 1–2px accent rule used as structural punctuation above titles and between
// sections. Never a heavy border.
export function Hairline({
  color,
  widthPx = 88,
  thicknessPx = 2,
  opacity = 1,
  className = "",
  vertical = false,
}: {
  color: string;
  widthPx?: number;
  thicknessPx?: number;
  opacity?: number;
  className?: string;
  vertical?: boolean;
}) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: color,
        opacity,
        width: vertical ? thicknessPx : widthPx,
        height: vertical ? widthPx : thicknessPx,
      }}
      aria-hidden
    />
  );
}

// A very quiet divider used between rows (border replacement).
export function SoftDivider({ className = "" }: { className?: string }) {
  const ink = useSlideInk();
  const color = ink.hairline;
  return (
    <div
      className={className}
      style={{ height: 1, width: "100%", backgroundColor: color }}
      aria-hidden
    />
  );
}

// ── Body / Supporting text ────────────────────────────────────────────────
export function SupportingText({
  children,
  size = "lg",
  maxWidthPx,
  opacity,
  className = "",
}: {
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  maxWidthPx?: number;
  opacity?: number;
  className?: string;
}) {
  const fontSize = size === "xl" ? 40 : size === "lg" ? 32 : size === "md" ? 26 : 22;
  return (
    <p
      className={`m-0 ${className}`}
      style={{ fontSize, lineHeight: 1.38, opacity, maxWidth: maxWidthPx }}
    >
      {children}
    </p>
  );
}

// ── Meta row (dates, presenters, "prepared by" line) ──────────────────────
export function MetaRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-16 gap-y-3 uppercase ${className}`}
      style={{ fontSize: 20, letterSpacing: "0.28em", opacity: 0.7 }}
    >
      {children}
    </div>
  );
}

// ── Editorial title block (kicker + hairline + title + optional dek) ─────
// Used across content slides in place of the ad-hoc SlideTitle. Keeps the
// deck feeling like one designed system.
export function TitleBlock({
  brand,
  kicker,
  title,
  dek,
  size = "title",
  align = "start",
}: {
  brand: BrandMode;
  kicker?: string;
  title: string;
  dek?: string;
  size?: DisplaySize;
  align?: "start" | "center";
}) {
  const ink = useSlideInk();
  const titleColor = ink.text;
  const dekColor = ink.muted;
  return (
    <div
      className={(align === "center" ? "flex flex-col items-center text-center" : "") + " mb-10"}
    >
      {kicker && (
        <div className="mb-6">
          <Kicker brand={brand}>{kicker}</Kicker>
        </div>
      )}
      {!kicker && (
        <Hairline color={brand.tokens.accent} widthPx={88} thicknessPx={2} className="mb-6" />
      )}
      <DisplayTitle size={size} color={titleColor}>
        {title}
      </DisplayTitle>
      {dek && (
        <div className="mt-6">
          <SupportingText size="lg" opacity={1} maxWidthPx={1180} className="">
            <span style={{ color: dekColor }}>{dek}</span>
          </SupportingText>
        </div>
      )}
    </div>
  );
}

// ── StatFigure ────────────────────────────────────────────────────────────
// A single stat, sized like a display headline: huge tabular numeral in
// primary, unit/suffix in accent, small-caps label beneath. Sizes are named
// so a stat row baseline-aligns and a single-stat slide can go monumental.
type StatSize = "sm" | "md" | "lg" | "xl" | "monumental";
const STAT_SPECS: Record<StatSize, { valuePx: number; unitPx: number; labelPx: number }> = {
  sm: { valuePx: 84, unitPx: 32, labelPx: 20 },
  md: { valuePx: 116, unitPx: 42, labelPx: 22 },
  lg: { valuePx: 156, unitPx: 54, labelPx: 24 },
  xl: { valuePx: 200, unitPx: 66, labelPx: 26 },
  monumental: { valuePx: 280, unitPx: 84, labelPx: 28 },
};

/**
 * Typographic SHAPE treatments for a statistic. A stat is composed as a
 * figure, not just set as type: the numeral is the primary shape and the
 * geometry below is drawn in relation to its optical box.
 *   auto   — ghost counterform behind + accent baseline rule (deck default)
 *   ghost  — oversized outlined numeral behind the ink (counterform texture)
 *   rule   — heavy accent baseline rule, length keyed to the value
 *   slab   — accent slab set across the numeral's lower third
 *   notch  — bracket notches framing the numeral's cap line
 *   column — thin progress column beneath (needs `progress`)
 *   arc    — semicircular gauge with the numeral seated in its counter
 *   none   — pure type, no geometry
 */
export type StatShape =
  | "auto"
  | "none"
  | "ghost"
  | "rule"
  | "slab"
  | "notch"
  | "column"
  | "arc";

export function StatFigure({
  brand,
  value,
  unit,
  label,
  source,
  size = "md",
  align = "start",
  valueColor,
  unitColor,
  monoLabel = true,
  shape = "auto",
  progress,
  accent,
}: {
  brand: BrandMode;
  value: string;
  unit?: string;
  label?: string;
  source?: string;
  size?: StatSize;
  align?: "start" | "center";
  valueColor?: string;
  unitColor?: string;
  monoLabel?: boolean;
  /** Typographic shape treatment. Defaults to the deck-wide `auto` recipe. */
  shape?: StatShape;
  /** 0..1 — drives column / arc / rule length. */
  progress?: number;
  /** Override the division accent used by the shape geometry. */
  accent?: string;
}) {
  const ink = useSlideInk();
  const mode = useSlideMode();
  const spec = STAT_SPECS[size];
  const shapeAccent = accent ?? brand.tokens.accent;
  const aTok = accentTokens(shapeAccent, mode === "dark" ? "dark" : "light");
  const p = Math.max(0, Math.min(1, progress ?? 0.72));
  const centeredShape = align === "center";
  const ruleWeight = Math.max(3, Math.round(spec.valuePx * 0.035));
  const ruleWidth = centeredShape
    ? "58%"
    : `${Math.min(100, Math.round(34 + p * 60))}%`;
  const vc = valueColor ?? ink.text;
  const uc = unitColor ?? ink.muted;
  const labelColor = ink.muted;
  // Overflow safeguards: wide values (e.g. "$220k", "1,240 pts") sitting in
  // half-width grid columns previously spilled into the neighbor. We now:
  //   • constrain the wrapper with `min-w-0 max-w-full` so it can actually
  //     shrink inside a grid track (grid children default to `min-width: auto`
  //     and refuse to compress, which is what caused the overlap);
  //   • keep the numeral on one line but let it shrink via a viewport-clamped
  //     font-size ceiling so very wide values step down automatically before
  //     they touch the next column;
  //   • tighten letter-spacing on the value so long strings stay compact.
  const unitText = unit?.trim() ?? "";
  const unitIsLong = /\s|·|\/|–|-/.test(unitText) || unitText.length > 6;
  // A "phrase value" is a value that isn't just a number+suffix but a full
  // clause like "38% ↓ time to market". These previously overflowed their
  // grid track because `white-space:nowrap` refused to wrap. Detect the case
  // and switch into a wrapping, size-stepped-down mode so the phrase fits
  // inside its column at the same visual weight.
  const valueText = value ?? "";
  const valueIsPhrase =
    valueText.trim().length > 8 &&
    /\s/.test(valueText.trim()) &&
    // exclude thousand-separated numerics like "1 240" (rare) — require at
    // least one alphabetic word of 3+ chars to qualify as a phrase.
    /[A-Za-z]{3,}/.test(valueText);
  const valueFontSize = valueIsPhrase
    ? `min(${Math.round(spec.valuePx * 0.5)}px, 9cqw)`
    : unitIsLong
      ? `min(${spec.valuePx}px, 18cqw)`
      : `min(${spec.valuePx}px, 20cqw)`;
  const unitFontSize = unitIsLong
    ? `min(${Math.max(32, Math.round(spec.unitPx * 0.58))}px, 5.6cqw)`
    : `min(${spec.unitPx}px, 6.5cqw)`;
  return (
    <div
      data-stat-figure={size}
      data-stat-shape={shape}
      className={`relative min-w-0 max-w-full overflow-hidden ${align === "center" ? "flex flex-col items-center text-center" : ""}`}
      style={{ containerType: "inline-size", contain: "inline-size" }}
    >
      {(shape === "ghost" || shape === "auto") && !valueIsPhrase && (
        <span
          aria-hidden
          data-accent-glow
          className="pointer-events-none absolute select-none font-semibold tabular-nums"
          style={{
            fontSize: `min(${Math.round(spec.valuePx * 1.7)}px, 34cqw)`,
            lineHeight: 0.74,
            letterSpacing: "-0.05em",
            top: `-${Math.round(spec.valuePx * 0.3)}px`,
            left: centeredShape ? "50%" : `-${Math.round(spec.valuePx * 0.12)}px`,
            transform: centeredShape ? "translateX(-50%)" : undefined,
            color: "transparent",
            WebkitTextStrokeWidth: Math.max(1, Math.round(spec.valuePx * 0.012)),
            WebkitTextStrokeColor: hexA(aTok.accent, mode === "dark" ? 0.18 : 0.12),
            whiteSpace: "nowrap",
            zIndex: 0,
          }}
        >
          {value || "\u2014"}
        </span>
      )}
      {shape === "slab" && (
        <span
          aria-hidden
          data-accent-glow
          className="pointer-events-none absolute"
          style={{
            left: centeredShape ? "50%" : 0,
            transform: centeredShape ? "translateX(-50%)" : undefined,
            top: `${Math.round(spec.valuePx * 0.5)}px`,
            height: `${Math.round(spec.valuePx * 0.3)}px`,
            width: ruleWidth,
            background: `linear-gradient(90deg, ${hexA(aTok.accent, mode === "dark" ? 0.34 : 0.18)} 0%, ${hexA(aTok.accent, 0)} 100%)`,
            borderRadius: 2,
            zIndex: 0,
          }}
        />
      )}
      {shape === "notch" && (
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0" style={{ zIndex: 0 }}>
          <span
            className="absolute left-0 top-0"
            style={{
              width: Math.round(spec.valuePx * 0.14),
              height: Math.round(spec.valuePx * 0.14),
              borderTop: `2px solid ${hexA(aTok.accent, 0.55)}`,
              borderLeft: `2px solid ${hexA(aTok.accent, 0.55)}`,
            }}
          />
          <span
            className="absolute right-0 top-0"
            style={{
              width: Math.round(spec.valuePx * 0.14),
              height: Math.round(spec.valuePx * 0.14),
              borderTop: `2px solid ${hexA(aTok.accent, 0.55)}`,
              borderRight: `2px solid ${hexA(aTok.accent, 0.55)}`,
            }}
          />
        </span>
      )}
      {shape === "arc" && (
        <svg
          aria-hidden
          viewBox="0 0 200 112"
          className="pointer-events-none absolute"
          style={{
            width: `${Math.round(spec.valuePx * 1.95)}px`,
            top: `-${Math.round(spec.valuePx * 0.12)}px`,
            left: centeredShape ? "50%" : 0,
            transform: centeredShape ? "translateX(-50%)" : undefined,
            zIndex: 0,
          }}
        >
          <path
            d="M12 104 A88 88 0 0 1 188 104"
            fill="none"
            stroke={hexA(aTok.accent, mode === "dark" ? 0.2 : 0.14)}
            strokeWidth={8}
            strokeLinecap="round"
          />
          <path
            d="M12 104 A88 88 0 0 1 188 104"
            fill="none"
            stroke={aTok.accent}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={277}
            strokeDashoffset={277 * (1 - p)}
          />
        </svg>
      )}
      <div
        className="relative"
        style={{ zIndex: 1 }}
      >
      <div
        className={valueIsPhrase ? "font-semibold" : "font-semibold tabular-nums"}
        style={{
          fontSize: valueFontSize,
          lineHeight: valueIsPhrase ? 1.05 : 0.92,
          letterSpacing: valueIsPhrase ? "-0.02em" : "-0.035em",
          color: vc,
          whiteSpace: valueIsPhrase ? "normal" : "nowrap",
          overflowWrap: valueIsPhrase ? "anywhere" : "normal",
          wordBreak: "normal",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "clip",
        }}
      >
        <span>{value || "—"}</span>
        {unitText && !unitIsLong && (
          <span
            className="ml-2 font-medium align-top"
            style={{ fontSize: unitFontSize, color: uc, letterSpacing: "-0.02em" }}
          >
            {unitText}
          </span>
        )}
      </div>
      {unitText && unitIsLong && (
        <div
          className={align === "center" ? "mx-auto mt-2 font-medium" : "mt-2 font-medium"}
          style={{
            fontSize: unitFontSize,
            lineHeight: 1.08,
            letterSpacing: "-0.015em",
            color: uc,
            maxWidth: "100%",
            overflow: "hidden",
            overflowWrap: "anywhere",
            wordBreak: "normal",
          }}
        >
          {unitText}
        </div>
      )}
      </div>
      {(shape === "auto" || shape === "rule" || shape === "notch") && (
        <span
          aria-hidden
          data-accent-glow
          className="relative block"
          style={{
            marginTop: Math.round(spec.valuePx * 0.1),
            height: ruleWeight,
            width: ruleWidth,
            borderRadius: ruleWeight,
            background: `linear-gradient(90deg, ${aTok.accent} 0%, ${hexA(aTok.accent, 0.14)} 100%)`,
            zIndex: 1,
          }}
        />
      )}
      {(shape === "column" || shape === "slab") && (
        <span
          aria-hidden
          className="relative block overflow-hidden"
          style={{
            marginTop: Math.round(spec.valuePx * 0.11),
            height: Math.max(5, Math.round(spec.valuePx * 0.05)),
            width: "100%",
            borderRadius: 999,
            background: mode === "dark" ? "rgba(255,255,255,0.10)" : hexA(aTok.accent, 0.12),
            zIndex: 1,
          }}
        >
          <span
            className="absolute inset-y-0 left-0 block"
            style={{
              width: `${Math.round(p * 100)}%`,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${aTok.accent} 0%, ${hexA(aTok.accent, 0.35)} 100%)`,
            }}
          />
        </span>
      )}
      {label && (
        <div
          className={monoLabel ? "mt-6 font-semibold uppercase" : "mt-6"}
          style={{
            fontSize: spec.labelPx,
            letterSpacing: monoLabel ? "0.28em" : "-0.005em",
            color: labelColor,
            lineHeight: 1.25,
            maxWidth: 560,
          }}
        >
          {label}
        </div>
      )}
      {source && (
        <div
          className="mt-4 uppercase"
          style={{ fontSize: 16, letterSpacing: "0.28em", color: labelColor, opacity: 0.75 }}
        >
          Source · {source}
        </div>
      )}
    </div>
  );
}

// ── QuoteMark ─────────────────────────────────────────────────────────────
// The typographic curly quote glyph in accent at low opacity, positioned
// behind or above a pull quote. Never a card ornament — always the sheet.
export function QuoteMark({
  color,
  size = 520,
  opacity = 0.12,
  className = "",
  style = {},
  glyph = "\u201C",
}: {
  color: string;
  size?: number;
  opacity?: number;
  className?: string;
  style?: CSSProperties;
  glyph?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none select-none ${className}`}
      style={{
        color,
        opacity,
        fontSize: size,
        lineHeight: 0.72,
        fontWeight: 600,
        letterSpacing: "-0.06em",
        ...style,
      }}
    >
      {glyph}
    </div>
  );
}

// ── Attribution ───────────────────────────────────────────────────────────
// Small-caps meta line for quote attributions, preceded by a short hairline.
export function Attribution({
  brand,
  name,
  role,
  org,
  align = "start",
}: {
  brand: BrandMode;
  name: string;
  role?: string;
  org?: string;
  align?: "start" | "center";
}) {
  const ink = useSlideInk(brand.tokens.accent);
  const nameColor = ink.text;
  const metaColor = ink.muted;
  return (
    <div className={align === "center" ? "flex flex-col items-center text-center" : ""}>
      <Hairline color={brand.tokens.accent} widthPx={56} thicknessPx={2} className="mb-5" />
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.015em", color: nameColor }}>
        {name}
      </div>
      {(role || org) && (
        <div
          className="mt-2 uppercase"
          style={{ fontSize: 18, letterSpacing: "0.28em", color: metaColor, fontWeight: 500 }}
        >
          {[role, org].filter(Boolean).join("  ·  ")}
        </div>
      )}
    </div>
  );
}

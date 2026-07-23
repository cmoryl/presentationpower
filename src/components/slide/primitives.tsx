import type { CSSProperties, ReactNode } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import { useSlideInk, useSlideMode } from "./SlideChrome";

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
  return (
    <div
      className={`font-semibold uppercase ${className}`}
      style={{
        color: color ?? ink.muted,
        fontSize: size,
        letterSpacing: tracking,
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
const DISPLAY_SPECS: Record<DisplaySize, { fontSize: number; lineHeight: number; letterSpacing: string; weight: number }> = {
  hero:    { fontSize: 124, lineHeight: 0.94, letterSpacing: "-0.04em",  weight: 600 },
  cover:   { fontSize: 100, lineHeight: 0.98, letterSpacing: "-0.03em",  weight: 600 },
  divider: { fontSize: 88,  lineHeight: 1.02, letterSpacing: "-0.025em", weight: 600 },
  section: { fontSize: 72,  lineHeight: 1.04, letterSpacing: "-0.02em",  weight: 600 },
  title:   { fontSize: 56,  lineHeight: 1.08, letterSpacing: "-0.015em", weight: 600 },
};

export function DisplayTitle({
  children,
  size = "cover",
  color,
  maxWidthPx,
  as: Tag = "h1",
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
  const style: CSSProperties = {
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    letterSpacing: spec.letterSpacing,
    fontWeight: spec.weight,
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
  return <div className={className} style={{ height: 1, width: "100%", backgroundColor: color }} aria-hidden />;
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
export function MetaRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
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
    <div className={(align === "center" ? "flex flex-col items-center text-center" : "") + " mb-10"}>
      {kicker && (
        <div className="mb-6">
          <Kicker brand={brand}>{kicker}</Kicker>
        </div>
      )}
      {!kicker && <Hairline color={brand.tokens.accent} widthPx={88} thicknessPx={2} className="mb-6" />}
      <DisplayTitle size={size} color={titleColor}>
        {title}
      </DisplayTitle>
      {dek && (
        <div className="mt-6">
          <SupportingText size="lg" opacity={1} maxWidthPx={1180} className="" >
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
  sm:          { valuePx: 84,  unitPx: 32, labelPx: 20 },
  md:          { valuePx: 116, unitPx: 42, labelPx: 22 },
  lg:          { valuePx: 156, unitPx: 54, labelPx: 24 },
  xl:          { valuePx: 200, unitPx: 66, labelPx: 26 },
  monumental:  { valuePx: 280, unitPx: 84, labelPx: 28 },
};

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
}) {
  const ink = useSlideInk();
  const spec = STAT_SPECS[size];
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
      className={`min-w-0 max-w-full overflow-hidden ${align === "center" ? "flex flex-col items-center text-center" : ""}`}
      style={{ containerType: "inline-size", contain: "inline-size" }}
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


import type { CSSProperties, ReactNode } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import { useSlideMode } from "./SlideChrome";

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
  return (
    <div
      className={`font-semibold uppercase ${className}`}
      style={{
        color: color ?? brand.tokens.accent,
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
  hero:    { fontSize: 168, lineHeight: 0.92, letterSpacing: "-0.045em", weight: 600 },
  cover:   { fontSize: 132, lineHeight: 0.96, letterSpacing: "-0.035em", weight: 600 },
  divider: { fontSize: 116, lineHeight: 1.0,  letterSpacing: "-0.03em",  weight: 600 },
  section: { fontSize: 88,  lineHeight: 1.02, letterSpacing: "-0.025em", weight: 600 },
  title:   { fontSize: 68,  lineHeight: 1.05, letterSpacing: "-0.02em",  weight: 600 },
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
  const mode = useSlideMode();
  const color = mode === "dark" ? "rgba(255,255,255,0.10)" : "rgba(10,15,28,0.10)";
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
  const mode = useSlideMode();
  const titleColor = mode === "dark" ? "#ffffff" : brand.tokens.primary;
  const dekColor = mode === "dark" ? "rgba(255,255,255,0.72)" : "rgba(10,15,28,0.70)";
  return (
    <div className={align === "center" ? "flex flex-col items-center text-center" : ""}>
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

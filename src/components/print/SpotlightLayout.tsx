import { useRef, type CSSProperties } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import type {
  SpotlightContent,
  PrintDensity,
  PrintPageSize,
} from "@/lib/print-assets.types";
import { resolvePrintLogoInk } from "@/lib/print-assets.types";
import { AuroraLayer } from "@/components/slide/flagship";
import { SlideModeContext, SlideAccentContext } from "@/components/slide/SlideChrome";
import { BrandLockup } from "@/components/BrandLockup";
import { PrintHeroMediaLayer } from "@/components/print/PrintHeroMedia";
import { useTextFit } from "@/lib/text-fit";


// -----------------------------------------------------------------------
// PORT — TransPerfect ClientSpotlight.dc.html → SpotlightLayout
//
// Layout, grid, spacing, and hierarchy come directly from the template.
// Every hardcoded brand color (#003FC7, #E8EEFB, #03002C, the gradient CTA
// band) resolves from the active brand mode's tokens. Solid white cards
// become GLASS PANELS floating over the division-accent AURORA — the
// synthesis called for in the port brief.
//
// Sizing: the template was authored at a fixed 816px page width. Every px
// value from the source is translated to `cqw` against that base so the
// layout scales cleanly at any preview or export DPI.
// -----------------------------------------------------------------------

const PAGE_W = 816; // px — template canvas width

/** Template-px → container-relative unit. */
const cq = (px: number) => `${((px * 100) / PAGE_W).toFixed(3)}cqw`;

function pageAspect(size: PrintPageSize): string {
  switch (size) {
    case "A4":
      return "8.2677 / 11.6929";
    case "Letter":
      return "8.5 / 11";
    case "Square":
      return "1 / 1";
  }
}

// Aurora is authored 1280×720 landscape; re-project for portrait so orbs
// bleed from the correct edges instead of being cropped.
function auroraAspect(size: PrintPageSize): { w: number; h: number } {
  switch (size) {
    case "A4":
      return { w: Math.round((1280 * 8.2677) / 11.6929), h: 1280 };
    case "Letter":
      return { w: Math.round((1280 * 8.5) / 11), h: 1280 };
    case "Square":
      return { w: 1280, h: 1280 };
  }
}

// Density → the template's outer 44px page inset gets nudged up/down.
function pagePadX(d: PrintDensity): number {
  return d === "compact" ? 36 : d === "airy" ? 52 : 44;
}
function pagePadTop(d: PrintDensity): number {
  return d === "compact" ? 22 : d === "airy" ? 32 : 26;
}

// ---------------------------------------------------------------------------
// Glass tokens — derived from the active accent + mode. The synthesis rule:
// the template's solid white cards become frosted panels with the division
// accent glowing softly behind. Contrast risk mitigation lives here — we
// tune panel opacity to keep 9–11px template type legible.
// ---------------------------------------------------------------------------
function glass(mode: "light" | "dark", accent: string): CSSProperties {
  if (mode === "dark") {
    return {
      background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 6%, rgba(10,8,36,0.62)), rgba(6,4,32,0.55))`,
      border: `1px solid color-mix(in srgb, ${accent} 22%, rgba(255,255,255,0.08))`,
      backdropFilter: "blur(14px) saturate(140%)",
      boxShadow: `0 ${cq(10)} ${cq(28)} rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04)`,
    };
  }
  // Light mode — a heavier white wash keeps 9px captions legible against
  // the (75%-opacity) portrait-projected aurora.
  return {
    background: `linear-gradient(180deg, rgba(255,255,255,0.86), rgba(255,255,255,0.72))`,
    border: `1px solid color-mix(in srgb, ${accent} 18%, rgba(255,255,255,0.75))`,
    backdropFilter: "blur(14px) saturate(140%)",
    boxShadow: `0 ${cq(10)} ${cq(28)} rgba(3,0,44,0.10), inset 0 0 0 1px rgba(255,255,255,0.55)`,
  };
}

// Icon chip (soft accent circle behind an outline glyph) — the template
// uses #E8EEFB against the primary. We resolve both from tokens.
function chipStyle(mode: "light" | "dark", accent: string): CSSProperties {
  return {
    background:
      mode === "dark"
        ? `color-mix(in srgb, ${accent} 26%, rgba(6,4,32,0.7))`
        : `color-mix(in srgb, ${accent} 22%, #ffffff)`,
    border:
      mode === "dark"
        ? `1px solid color-mix(in srgb, ${accent} 32%, rgba(255,255,255,0.08))`
        : `1px solid color-mix(in srgb, ${accent} 26%, rgba(255,255,255,0.9))`,
  };
}

// ---------------------------------------------------------------------------
// Icons — Heroicons-outline paths, ported verbatim from icon-library.js for
// the specific glyphs this template uses. Stroke=currentColor so callers
// tint via the surrounding container.
// ---------------------------------------------------------------------------
type IconName =
  | "sparkles"
  | "users"
  | "globe-alt"
  | "language"
  | "squares-2x2"
  | "arrow-trending-up"
  | "chat"
  | "check"
  | "target"
  | "globe-flat"
  | "trending"
  | "star";

const ICON_PATHS: Record<IconName, string> = {
  sparkles:
    "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z",
  users:
    "M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72M18 18.72c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719M18 18.72a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z",
  "globe-alt":
    "M12 21a9 9 0 0 0 0-18m0 18a9 9 0 0 1 0-18m0 18c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3M3.6 9h16.8M3.6 15h16.8",
  language:
    "m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0V3m0 2.25c2.223 5.298 5.707 9.716 10.334 12.253M9 5.25c1.12 0 2.233.038 3.334.114",
  "squares-2x2":
    "M3.75 6a2.25 2.25 0 0 1 2.25-2.25h1.5A2.25 2.25 0 0 1 9.75 6v1.5A2.25 2.25 0 0 1 7.5 9.75H6A2.25 2.25 0 0 1 3.75 7.5V6ZM3.75 16.5A2.25 2.25 0 0 1 6 14.25h1.5a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 7.5 20.25H6A2.25 2.25 0 0 1 3.75 18v-1.5ZM14.25 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v1.5A2.25 2.25 0 0 1 18 9.75h-1.5a2.25 2.25 0 0 1-2.25-2.25V6ZM14.25 16.5A2.25 2.25 0 0 1 16.5 14.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-1.5A2.25 2.25 0 0 1 14.25 18v-1.5Z",
  "arrow-trending-up":
    "M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941",
  chat:
    "M21 11.5a8.38 8.38 0 0 1-9 8.4 8.5 8.5 0 0 1-3.9-.9L3 20l1-4.9A8.38 8.38 0 0 1 3.5 11a8.5 8.5 0 0 1 8.4-8.5 8.38 8.38 0 0 1 9.1 9z",
  check: "M4 12l5 5L20 6",
  target:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  "globe-flat":
    "M12 3a9 9 0 1 0 0 18M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18",
  trending: "M3 17l6-6 4 4 8-8M15 7h6v6",
  star:
    "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z",
};

function Icon({
  name,
  size,
  color,
  strokeWidth = 1.5,
}: {
  name: IconName;
  size: number | string;
  color: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ display: "block" }}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

// Deterministic stat-icon heuristic. If capabilities/stats grow icon fields
// later, plug them in here.
function pickStatIcon(label: string, index: number): IconName {
  const l = label.toLowerCase();
  if (/lang|locale|market/.test(l)) return "language";
  if (/client|partner|team|user|people/.test(l)) return "users";
  if (/integr|platform|connect|module/.test(l)) return "squares-2x2";
  if (/year|exp/.test(l)) return "star";
  if (/speed|time|faster|growth|%/.test(l)) return "arrow-trending-up";
  if (/global|world|countr/.test(l)) return "globe-alt";
  return (["star", "users", "squares-2x2", "language"] as const)[index % 4];
}

// ---------------------------------------------------------------------------
// LAYOUT
// ---------------------------------------------------------------------------
export function SpotlightLayout({
  content,
  brand,
  mode,
  pageSize = "Letter",
  density = "standard",
  showSafeArea = false,
  seed,
  style,
}: {
  content: SpotlightContent;
  brand: BrandMode;
  mode: "light" | "dark";
  pageSize?: PrintPageSize;
  density?: PrintDensity;
  showSafeArea?: boolean;
  seed?: string;
  style?: CSSProperties;
}) {
  const accent = brand.tokens.accent || brand.tokens.primary;
  const primary = brand.tokens.primary;
  const ink = mode === "dark" ? "#F5F4FF" : "#03002C";
  const inkSoft = mode === "dark" ? "rgba(245,244,255,0.72)" : "rgba(68,68,68,0.92)";
  const inkFaint = mode === "dark" ? "rgba(245,244,255,0.55)" : "rgba(102,102,102,0.92)";
  const dividerCol =
    mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(3,0,44,0.14)";
  // Accent used for tint marks (chip inner glyph, quote glyph, section headings).
  const accentInk = mode === "dark" ? accent : primary;

  const bg = mode === "dark" ? "#111114" : "#FFFFFF";
  const auroraSeed = seed ?? `spotlight-${brand.id}-${mode}`;

  // Refs for text-fit — reproduce the template's data-fit ranges exactly.
  const heroRef = useRef<HTMLHeadingElement | null>(null);
  const introRef = useRef<HTMLParagraphElement | null>(null);
  useTextFit(heroRef, content.productName, {
    min: 25,
    max: 33,
    base: 50,
    cap: 95,
    containerWidth: PAGE_W,
  });
  useTextFit(introRef, content.tagline ?? content.summary ?? "", {
    min: 10,
    max: 11.5,
    base: 150,
    cap: 250,
    containerWidth: PAGE_W,
  });

  // Content slices
  const stats = content.stats.slice(0, 4);
  const columns = content.capabilities.slice(0, 3);
  const proofBullets = content.capabilities.slice(3, 6).map((c) => c.heading);
  const expertBullets =
    proofBullets.length >= 3
      ? proofBullets
      : ["Trusted global partner", "Deep division expertise", "Hands-on, human collaboration"];

  const padX = pagePadX(density);
  const padTop = pagePadTop(density);
  const padXcq = cq(padX);
  const padTopCq = cq(padTop);

  return (
    <SlideModeContext.Provider value={mode}>
      <SlideAccentContext.Provider value={accent}>
        <div
          className="relative w-full overflow-hidden [container-type:inline-size]"
          style={{
            aspectRatio: pageAspect(pageSize),
            backgroundColor: bg,
            color: ink,
            fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
            ...style,
          }}
        >
          {/* AURORA GROUND — division accent behind everything */}
          <AuroraLayer
            seed={auroraSeed}
            brand={brand}
            intensity={0.9}
            aspect={auroraAspect(pageSize)}
          />

          {/* Corner accent bloom (template's top-right lavender radial) —
              retuned to the active accent so every division reads through. */}
          <div
            className="pointer-events-none absolute"
            aria-hidden
            style={{
              top: cq(-140),
              right: cq(-140),
              width: cq(460),
              height: cq(460),
              borderRadius: "50%",
              background: `radial-gradient(circle at 45% 45%, ${accent}59 0%, ${accent}22 45%, transparent 72%)`,
              filter: `blur(${cq(10)})`,
              opacity: mode === "dark" ? 0.9 : 0.7,
            }}
          />

          <div
            className="relative flex h-full flex-col"
            style={{ paddingLeft: padXcq, paddingRight: padXcq, paddingTop: padTopCq, paddingBottom: cq(26) }}
          >
            {/* ============================================================ */}
            {/* HEADER — brand lockup + CLIENT SPOTLIGHT eyebrow              */}
            {/* ============================================================ */}
            <div className="flex items-center justify-between" style={{ gap: cq(10) }}>
              <div
                style={{
                  fontSize: cq(9.5),
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  color: inkFaint,
                }}
              >
                {(content.eyebrow ?? "Client spotlight").toUpperCase()}
              </div>
              <BrandLockup brand={brand} color={resolvePrintLogoInk(content.logoColor, ink)} size="xs" orientation="horizontal" />
            </div>

            {/* ============================================================ */}
            {/* HERO — title + intro (left)  |  quote glass card (right)      */}
            {/* ============================================================ */}
            <div className="flex" style={{ gap: cq(28), paddingTop: cq(26) }}>
              <div style={{ flex: "1.15 1 0" }}>
                <h1
                  ref={heroRef}
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: cq(33),
                    lineHeight: 1.14,
                    letterSpacing: "-0.015em",
                    color: ink,
                  }}
                >
                  {content.productName || "Untitled spotlight"}
                </h1>
                {content.tagline && (
                  <p
                    style={{
                      margin: `${cq(10)} 0 0`,
                      fontSize: cq(12.5),
                      lineHeight: 1.35,
                      fontWeight: 600,
                      color: accentInk,
                      maxWidth: cq(340),
                    }}
                  >
                    {content.tagline}
                  </p>
                )}
                {content.summary && (
                  <p
                    ref={introRef}
                    style={{
                      margin: `${cq(12)} 0 0`,
                      fontSize: cq(11.5),
                      lineHeight: 1.65,
                      color: inkSoft,
                      maxWidth: cq(320),
                    }}
                  >
                    {content.summary}
                  </p>
                )}
              </div>

              {content.quote && (
                <div
                  style={{
                    flex: "1 1 0",
                    borderRadius: cq(14),
                    padding: `${cq(20)} ${cq(22)}`,
                    ...glass(mode, accent),
                  }}
                >
                  <div
                    style={{
                      fontFamily: "Georgia, serif",
                      fontSize: cq(42),
                      lineHeight: 0.6,
                      color: accentInk,
                      fontWeight: 700,
                    }}
                    aria-hidden
                  >
                    &ldquo;
                  </div>
                  <p
                    style={{
                      margin: `${cq(10)} 0 0`,
                      fontSize: cq(12.5),
                      lineHeight: 1.6,
                      color: ink,
                    }}
                  >
                    {content.quote.text}
                  </p>
                  {(content.quote.role || content.quote.company) && (
                    <div
                      style={{
                        marginTop: cq(14),
                        fontSize: cq(10),
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: accentInk,
                        textTransform: "uppercase",
                      }}
                    >
                      {content.quote.role ?? "Client title"}
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: cq(2),
                      fontSize: cq(11),
                      fontWeight: 700,
                      color: ink,
                    }}
                  >
                    — {content.quote.author}
                    {content.quote.company ? ` · ${content.quote.company}` : ""}
                  </div>
                </div>
              )}
            </div>

            {/* ============================================================ */}
            {/* STATS — 4 tiles  |  expert glass panel                        */}
            {/* ============================================================ */}
            {(stats.length > 0 || content.expert || content.cta) && (
              <div style={{ paddingTop: cq(30) }}>
                <div style={{ fontWeight: 700, fontSize: cq(13), color: ink }}>
                  Project statistics
                </div>
                <div className="flex" style={{ gap: cq(14), marginTop: cq(12) }}>
                  {stats.length > 0 && (
                    <div
                      className="grid"
                      style={{
                        flex: "2.2 1 0",
                        gridTemplateColumns: `repeat(${Math.max(1, stats.length)}, minmax(0, 1fr))`,
                        gap: cq(12),
                      }}
                    >
                      {stats.map((s, i) => (
                        <div
                          key={i}
                          style={{
                            borderRadius: cq(12),
                            padding: `${cq(16)} ${cq(12)}`,
                            textAlign: "center",
                            ...glass(mode, accent),
                          }}
                        >
                          <div
                            className="mx-auto flex items-center justify-center"
                            style={{
                              width: cq(34),
                              height: cq(34),
                              borderRadius: "50%",
                              ...chipStyle(mode, accent),
                            }}
                          >
                            <Icon
                              name={pickStatIcon(s.label, i)}
                              size={cq(15)}
                              color={accentInk}
                            />
                          </div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: cq(18),
                              color: accentInk,
                              marginTop: cq(8),
                              lineHeight: 1,
                              letterSpacing: "-0.02em",
                            }}
                          >
                            {s.value}
                            {s.unit && (
                              <span style={{ fontSize: cq(14), marginLeft: cq(1) }}>
                                {s.unit}
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: cq(9),
                              lineHeight: 1.4,
                              color: inkFaint,
                              marginTop: cq(3),
                            }}
                          >
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(content.expert || content.cta) && (
                    <div
                      style={{
                        flex: "1 1 0",
                        borderRadius: cq(12),
                        padding: cq(16),
                        ...glass(mode, accent),
                      }}
                    >
                      <div className="flex items-center" style={{ gap: cq(8) }}>
                        <div
                          className="flex items-center justify-center"
                          style={{
                            width: cq(30),
                            height: cq(30),
                            borderRadius: "50%",
                            flexShrink: 0,
                            ...chipStyle(mode, accent),
                          }}
                        >
                          <Icon name="chat" size={cq(15)} color={accentInk} />
                        </div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: cq(12),
                            lineHeight: 1.3,
                            color: accentInk,
                          }}
                        >
                          {content.expert
                            ? `Talk to ${content.expert.name.split(" ")[0]}`
                            : `Talk to a ${brand.name} expert`}
                        </div>
                      </div>
                      <p
                        style={{
                          margin: `${cq(8)} 0 0`,
                          fontSize: cq(9.5),
                          lineHeight: 1.55,
                          color: inkSoft,
                        }}
                      >
                        {content.expert?.role
                          ? content.expert.role
                          : "Our experts help teams operationalize this at scale — with measurable impact."}
                      </p>
                      {expertBullets.slice(0, 3).map((b, i) => (
                        <div
                          key={i}
                          className="flex items-center"
                          style={{ gap: cq(6), marginTop: i === 0 ? cq(10) : cq(6) }}
                        >
                          <Icon name="check" size={cq(11)} color={accentInk} strokeWidth={2.5} />
                          <div style={{ fontSize: cq(9), color: inkSoft, lineHeight: 1.3 }}>
                            {b}
                          </div>
                        </div>
                      ))}
                      {(content.cta || content.expert?.email) && (
                        <div
                          className="inline-flex items-center"
                          style={{
                            marginTop: cq(12),
                            border: `1.5px solid ${accentInk}`,
                            borderRadius: 999,
                            padding: `${cq(5)} ${cq(14)}`,
                            fontSize: cq(9.5),
                            fontWeight: 700,
                            color: accentInk,
                            gap: cq(4),
                          }}
                        >
                          {content.cta?.label ?? "Contact an expert"} »
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* 3-COL — capabilities as Need / Approach / Impact              */}
            {/* ============================================================ */}
            {columns.length > 0 && (
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
                  paddingTop: cq(26),
                  flex: 1,
                }}
              >
                {columns.map((c, i) => {
                  const isFirst = i === 0;
                  const isLast = i === columns.length - 1;
                  const iconName: IconName =
                    i === 0 ? "globe-flat" : i === 1 ? "target" : "trending";
                  return (
                    <div
                      key={i}
                      style={{
                        paddingLeft: isFirst ? 0 : cq(18),
                        paddingRight: isLast ? 0 : cq(18),
                        borderRight: isLast ? "none" : `1px solid ${dividerCol}`,
                      }}
                    >
                      <div className="flex items-center" style={{ gap: cq(8) }}>
                        <div
                          className="flex items-center justify-center"
                          style={{
                            width: cq(26),
                            height: cq(26),
                            borderRadius: "50%",
                            ...chipStyle(mode, accent),
                          }}
                        >
                          <Icon name={iconName} size={cq(13)} color={accentInk} />
                        </div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: cq(12),
                            color: accentInk,
                          }}
                        >
                          {c.heading}
                        </div>
                      </div>
                      <p
                        style={{
                          margin: `${cq(8)} 0 0`,
                          fontSize: cq(10),
                          lineHeight: 1.6,
                          color: inkSoft,
                        }}
                      >
                        {c.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ============================================================ */}
            {/* CTA BAND — division-tokenized gradient                        */}
            {/* ============================================================ */}
            {content.cta && (
              <div
                className="flex items-center justify-between"
                style={{
                  marginTop: cq(24),
                  borderRadius: cq(12),
                  padding: `${cq(16)} ${cq(20)}`,
                  background: `linear-gradient(90deg, ${primary} 0%, color-mix(in srgb, ${primary} 55%, ${accent}) 70%, ${accent} 100%)`,
                  color: "#FFFFFF",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: cq(15), color: "#FFFFFF" }}>
                    {content.cta.label}
                  </div>
                  {content.summary && (
                    <div
                      style={{
                        fontSize: cq(10),
                        color: "rgba(255,255,255,0.8)",
                        marginTop: cq(3),
                      }}
                    >
                      Explore how {brand.name} can transform your operations.
                    </div>
                  )}
                </div>
                <div
                  style={{
                    border: "1.5px solid #FFFFFF",
                    borderRadius: 999,
                    padding: `${cq(8)} ${cq(18)}`,
                    fontSize: cq(11),
                    fontWeight: 700,
                    color: "#FFFFFF",
                    whiteSpace: "nowrap",
                  }}
                >
                  Book a demo »
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* FOOTER — TP + division lockup + contact strip                 */}
            {/* ============================================================ */}
            <div
              className="flex items-center justify-between"
              style={{
                borderTop: `1px solid ${dividerCol}`,
                marginTop: cq(20),
                paddingTop: cq(16),
              }}
            >
              <BrandLockup brand={brand} color={ink} size="2xs" orientation="horizontal" />
              <div className="flex items-center" style={{ gap: cq(18) }}>
                {content.expert?.email && (
                  <span style={{ fontSize: cq(9.5), color: accentInk }}>
                    {content.expert.email}
                  </span>
                )}
                <span style={{ fontSize: cq(9.5), color: accentInk }}>
                  transperfect.com
                </span>
              </div>
            </div>

            {showSafeArea && (
              <div
                className="pointer-events-none absolute inset-6 rounded-2xl border border-dashed"
                style={{
                  borderColor: mode === "dark" ? "rgba(255,255,255,0.25)" : "rgba(3,0,44,0.22)",
                }}
              />
            )}
          </div>
        </div>
      </SlideAccentContext.Provider>
    </SlideModeContext.Provider>
  );
}

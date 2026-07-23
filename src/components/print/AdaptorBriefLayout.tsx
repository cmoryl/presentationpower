import { useRef, type CSSProperties } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import type {
  AdaptorBriefContent,
  PrintDensity,
  PrintPageSize,
} from "@/lib/print-assets.types";
import { resolvePrintLogoInk } from "@/lib/print-assets.types";
import { AuroraLayer } from "@/components/slide/flagship";
import { SlideModeContext, SlideAccentContext } from "@/components/slide/SlideChrome";
import { BrandLockup } from "@/components/BrandLockup";
import { useTextFit } from "@/lib/text-fit";

// -----------------------------------------------------------------------
// PORT — TransPerfect ApplicationBrief.dc.html → AdaptorBriefLayout
//
// The template opens with a dark→light vertical gradient hero, drops six
// feature cards over the fold, then adds a "WE KNOW HOW" divider strip
// with 5 icon-tile bullets, a pull-quote, and a footer. Our synthesis
// keeps that hierarchy verbatim; solid white cards become glass panels
// floating on the division accent aurora, and the hardcoded #003FC7 /
// #A1FBF9 / #C2A3FF tokens resolve from the active brand mode.
// -----------------------------------------------------------------------

const PAGE_W = 816;
const cq = (px: number) => `${((px * 100) / PAGE_W).toFixed(3)}cqw`;

function pageAspect(size: PrintPageSize): string {
  switch (size) {
    case "A4": return "8.2677 / 11.6929";
    case "Letter": return "8.5 / 11";
    case "Square": return "1 / 1";
  }
}
function auroraAspect(size: PrintPageSize): { w: number; h: number } {
  switch (size) {
    case "A4": return { w: Math.round((1280 * 8.2677) / 11.6929), h: 1280 };
    case "Letter": return { w: Math.round((1280 * 8.5) / 11), h: 1280 };
    case "Square": return { w: 1280, h: 1280 };
  }
}
function padX(d: PrintDensity): number { return d === "compact" ? 36 : d === "airy" ? 52 : 44; }
function padTop(d: PrintDensity): number { return d === "compact" ? 34 : d === "airy" ? 52 : 44; }

function glassCard(mode: "light" | "dark", accent: string): CSSProperties {
  if (mode === "dark") {
    return {
      background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 8%, rgba(10,8,36,0.72)), rgba(6,4,32,0.62))`,
      border: `1px solid color-mix(in srgb, ${accent} 24%, rgba(255,255,255,0.08))`,
      backdropFilter: "blur(14px) saturate(140%)",
      boxShadow: `0 ${cq(10)} ${cq(28)} rgba(0,0,0,0.35)`,
    };
  }
  return {
    background: "rgba(255,255,255,0.92)",
    border: `1px solid color-mix(in srgb, ${accent} 18%, rgba(255,255,255,0.75))`,
    boxShadow: `0 ${cq(6)} ${cq(18)} rgba(3,0,44,0.10)`,
  };
}

function chipStyle(mode: "light" | "dark", accent: string): CSSProperties {
  return {
    background: mode === "dark"
      ? `color-mix(in srgb, ${accent} 26%, rgba(6,4,32,0.7))`
      : `color-mix(in srgb, ${accent} 22%, #ffffff)`,
    border: mode === "dark"
      ? `1px solid color-mix(in srgb, ${accent} 32%, rgba(255,255,255,0.08))`
      : `1px solid color-mix(in srgb, ${accent} 26%, rgba(255,255,255,0.9))`,
  };
}

// Feature-verb → icon glyph. Falls back to a sparkle for unknown verbs.
const VERB_ICONS: Record<string, string> = {
  supports: "M12 6v6l4 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  adapts: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  enables: "M13 3L4 14h6l-1 7 9-11h-6l1-7z",
  automates: "M12 8v4l3 3M12 3a9 9 0 1 0 9 9",
  triggers: "M4 6h16M4 12h10M4 18h16",
  learns: "M12 3l9 5-9 5-9-5 9-5zM3 12l9 5 9-5",
  default: "M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z",
};
const KNOW_ICONS = [
  "M12 21a9 9 0 0 0 0-18m0 18a9 9 0 0 1 0-18M3.6 9h16.8M3.6 15h16.8",
  "M13 3L4 14h6l-1 7 9-11h-6l1-7z",
  "M9 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-4.5 6-4.5s6 1.5 6 4.5",
  "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  "M3 17l6-6 4 4 8-8M15 7h6v6",
];

function Icon({ d, size, color, sw = 1.5 }: { d: string; size: number | string; color: string; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }} aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function AdaptorBriefLayout({
  content, brand, mode, pageSize = "Letter", density = "standard", seed, style,
}: {
  content: AdaptorBriefContent;
  brand: BrandMode;
  mode: "light" | "dark";
  pageSize?: PrintPageSize;
  density?: PrintDensity;
  seed?: string;
  style?: CSSProperties;
}) {
  const accent = brand.tokens.accent || brand.tokens.primary;
  const primary = brand.tokens.primary;
  const ink = mode === "dark" ? "#F5F4FF" : "#03002C";
  const inkSoft = mode === "dark" ? "rgba(245,244,255,0.72)" : "rgba(85,85,85,0.92)";
  const dividerCol = mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(3,0,44,0.14)";
  const accentInk = mode === "dark" ? accent : primary;
  const bg = mode === "dark" ? "#111114" : "#FFFFFF";
  // Print guideline: no full-color hero band. Text over the hero uses the
  // mode's default ink; background stays white / offset black.
  const heroInk = ink;
  const heroSubInk = inkSoft;

  const heroRef = useRef<HTMLHeadingElement | null>(null);
  const introRef = useRef<HTMLParagraphElement | null>(null);
  useTextFit(heroRef, content.title, { min: 26, max: 37, base: 45, cap: 90, containerWidth: PAGE_W });
  useTextFit(introRef, content.summary ?? "", { min: 10.5, max: 12.5, base: 140, cap: 230, containerWidth: PAGE_W });

  const features = content.features.slice(0, 6);
  const knowHow = content.knowHow.slice(0, 5);


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

          {/* Aurora sits UNDER the hero gradient for the lower two-thirds. */}
          <div className="pointer-events-none absolute inset-0" style={{ opacity: mode === "dark" ? 0.9 : 0.75 }}>
            <AuroraLayer
              seed={seed ?? `adaptor-${brand.id}-${mode}`}
              brand={brand}
              intensity={0.85}
              aspect={auroraAspect(pageSize)}
            />
          </div>

          {/* Corner accent blooms — template's top-right lavender + left-mid teal. */}
          <div className="pointer-events-none absolute" aria-hidden style={{
            top: cq(-100), right: cq(-120), width: cq(430), height: cq(430), borderRadius: "50%",
            background: `radial-gradient(circle at 45% 45%, ${accent}66 0%, ${accent}22 45%, transparent 72%)`,
            filter: `blur(${cq(10)})`,
          }} />
          <div className="pointer-events-none absolute" aria-hidden style={{
            top: cq(340), left: cq(-140), width: cq(360), height: cq(360), borderRadius: "50%",
            background: `radial-gradient(circle at 60% 40%, ${accent}44 0%, transparent 70%)`,
            filter: `blur(${cq(10)})`,
          }} />

          <div className="relative flex h-full flex-col" style={{
            paddingLeft: cq(padX(density)), paddingRight: cq(padX(density)),
            paddingTop: cq(padTop(density)), paddingBottom: cq(28),
          }}>
            {/* HERO */}
            <div>
              <div className="flex items-center justify-between" style={{ gap: cq(10) }}>
                <div style={{ fontSize: cq(10), fontWeight: 600, letterSpacing: "0.14em", color: accent }}>
                  {(content.eyebrow ?? "ADAPTOR BRIEF").toUpperCase()}
                </div>
                <BrandLockup brand={brand} color={resolvePrintLogoInk(content.logoColor, heroInk)} size="xs" orientation="horizontal" />
              </div>
              <h1 ref={heroRef} style={{
                margin: `${cq(12)} 0 0`, fontWeight: 700, fontSize: cq(37),
                lineHeight: 1.12, letterSpacing: "-0.015em", color: heroInk, maxWidth: cq(480),
              }}>
                {content.title || "Untitled adaptor brief"}
              </h1>
              {content.summary && (
                <p ref={introRef} style={{
                  margin: `${cq(14)} 0 0`, fontSize: cq(12.5), lineHeight: 1.6,
                  color: heroSubInk, maxWidth: cq(380),
                }}>{content.summary}</p>
              )}
            </div>

            {/* 6 FEATURE CARDS */}
            <div className="grid" style={{
              gridTemplateColumns: "1fr 1fr 1fr", gap: cq(14), paddingTop: cq(28),
            }}>
              {features.map((f, i) => {
                const glyph = VERB_ICONS[f.verb.toLowerCase()] ?? VERB_ICONS.default;
                return (
                  <div key={i} style={{ borderRadius: cq(12), padding: `${cq(18)} ${cq(16)}`, ...glassCard(mode, accent) }}>
                    <div className="flex items-center justify-center" style={{
                      width: cq(38), height: cq(38), borderRadius: cq(10), ...chipStyle(mode, accent),
                    }}>
                      <Icon d={glyph!} size={cq(18)} color={accentInk} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: cq(15), color: accentInk, marginTop: cq(10) }}>
                      {f.verb}
                    </div>
                    <div style={{ fontSize: cq(10.5), lineHeight: 1.5, color: inkSoft, marginTop: cq(4) }}>
                      {f.body}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* WE KNOW HOW strip */}
            {knowHow.length > 0 && (
              <>
                <div className="flex items-center" style={{ gap: cq(14), paddingTop: cq(28) }}>
                  <div style={{ flex: 1, height: 1, background: dividerCol }} />
                  <div style={{ fontSize: cq(10), fontWeight: 700, letterSpacing: "0.14em", color: ink }}>
                    WE KNOW HOW
                  </div>
                  <div style={{ flex: 1, height: 1, background: dividerCol }} />
                </div>
                <div className="grid" style={{
                  gridTemplateColumns: `repeat(${knowHow.length}, minmax(0, 1fr))`,
                  gap: cq(12), paddingTop: cq(22), textAlign: "center",
                }}>
                  {knowHow.map((k, i) => (
                    <div key={i} className="flex flex-col items-center" style={{ gap: cq(8) }}>
                      <div className="flex items-center justify-center" style={{
                        width: cq(34), height: cq(34), borderRadius: "50%", ...chipStyle(mode, accent),
                      }}>
                        <Icon d={KNOW_ICONS[i % KNOW_ICONS.length]!} size={cq(17)} color={accentInk} />
                      </div>
                      <div style={{ fontSize: cq(9.5), lineHeight: 1.45, color: inkSoft }}>{k}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* QUOTE */}
            {content.quote && (
              <div className="flex items-start" style={{ gap: cq(16), paddingTop: cq(30), flex: 1 }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: cq(54), lineHeight: 0.8, color: accentInk, fontWeight: 700 }} aria-hidden>
                  &ldquo;
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{
                    margin: `${cq(4)} 0 0`, fontSize: cq(16), lineHeight: 1.6,
                    color: ink, fontWeight: 500,
                  }}>{content.quote.text}</p>
                  <div style={{ marginTop: cq(8), fontSize: cq(11), fontWeight: 700, color: accentInk }}>
                    — {content.quote.author}{content.quote.company ? ` · ${content.quote.company}` : ""}
                  </div>
                </div>
              </div>
            )}

            {/* FOOTER */}
            <div className="flex items-center justify-between" style={{
              borderTop: `1px solid ${dividerCol}`, marginTop: cq(24), paddingTop: cq(16),
            }}>
              <BrandLockup brand={brand} color={ink} size="2xs" orientation="horizontal" />
              <div style={{ fontSize: cq(9.5), color: accentInk }}>transperfect.com</div>
            </div>
          </div>
        </div>
      </SlideAccentContext.Provider>
    </SlideModeContext.Provider>
  );
}

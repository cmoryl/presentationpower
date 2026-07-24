import { useRef, type CSSProperties } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import type {
  AdaptorBriefContent,
  PrintDensity,
  PrintPageSize,
} from "@/lib/print-assets.types";
import { resolvePrintLogoInk } from "@/lib/print-assets.types";
import { SlideModeContext, SlideAccentContext } from "@/components/slide/SlideChrome";
import { BrandLockup } from "@/components/BrandLockup";
import { PrintHeroMediaLayer } from "@/components/print/PrintHeroMedia";
import { PrintCTABand, PrintFooterLockup } from "@/components/print/PrintChrome";
import { PrintSectionsStack } from "@/components/print/sections/PrintSectionRenderer";
import { useTextFit } from "@/lib/text-fit";
import {
  PAGE_W,
  cq,
  pageAspect,
  pagePadX as padX,
  pagePadTop,
  glass as glassCard,
  chipStyle,
  IconPath as Icon,
  clampLines,
  PrintEyebrow,
  heroCopyScrimStyle,
} from "@/components/print/print-primitives";


// -----------------------------------------------------------------------
// PORT — TransPerfect ApplicationBrief.dc.html → AdaptorBriefLayout
// Shared page/aurora geometry, glass, chip, and icon primitives live in
// ./print-primitives so the three print layouts read as one family.
// -----------------------------------------------------------------------

function padTop(d: import("@/lib/print-assets.types").PrintDensity): number {
  return pagePadTop(d, 44, 10);
}

// Feature-verb → icon glyph. Local because this maps content vocabulary,
// not a design token.
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
            backgroundColor: mode === "light" ? "#FFFFFF" : bg,
            color: ink,
            fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
            ...style,
          }}
        >
          {mode === "light" && (
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden
              style={{ background: "#FFFFFF", zIndex: 0 }}
            />
          )}
          {content.heroMedia ? (
            <PrintHeroMediaLayer media={content.heroMedia} accent={accent} mode={mode} cq={cq} />
          ) : null}

          <div className="relative flex h-full flex-col" style={{
            paddingLeft: cq(padX(density)), paddingRight: cq(padX(density)),
            paddingTop: cq(padTop(density)), paddingBottom: cq(28),
          }}>
            {/* HERO — wrapped in a relative container so a localized text-backing
                scrim travels with the copy block rather than introducing a
                full-width top wash. */}
            <div data-section="hero" data-section-label="Hero" style={{ position: "relative" }}>
              <div style={heroCopyScrimStyle(mode)} aria-hidden />
              <div className="relative flex items-center justify-between" style={{ gap: cq(10) }}>
                <PrintEyebrow
                  label={content.eyebrow ?? "ADAPTOR BRIEF"}
                  mode={mode}
                  accent={accent}
                  cq={cq}
                />
                <BrandLockup brand={brand} color={brand.id === "bm-enterprise" ? (mode === "dark" ? "#FFFFFF" : "#000000") : (mode === "dark" ? "#FFFFFF" : resolvePrintLogoInk(content.logoColor, heroInk))} size="2xs" orientation="horizontal" />
              </div>
              <h1 ref={heroRef} style={{
                position: "relative",
                margin: `${cq(12)} 0 0`, fontWeight: 700, fontSize: cq(37),
                lineHeight: 1.12, letterSpacing: "-0.015em", color: heroInk, maxWidth: cq(480),
              }}>
                {content.title || "Untitled adaptor brief"}
              </h1>
              {content.summary && (
                <p ref={introRef} style={{
                  position: "relative",
                  margin: `${cq(14)} 0 0`, fontSize: cq(12.5), lineHeight: 1.6,
                  color: heroSubInk, maxWidth: cq(380),
                }}>{content.summary}</p>
              )}
            </div>

            {/* 6 FEATURE CARDS — grouped in one rounded panel (Canva ref). */}
            <div style={{ paddingTop: cq(28) }}>
              <div style={{ borderRadius: cq(16), padding: cq(18), ...glassCard(mode, accent) }}>
                <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: cq(14) }}>
                  {features.map((f, i) => {
                    const glyph = VERB_ICONS[f.verb.toLowerCase()] ?? VERB_ICONS.default;
                    return (
                      <div key={i} style={{ borderRadius: cq(12), padding: `${cq(14)} ${cq(12)}`, background: "transparent" }}>
                        <div className="flex items-center justify-center" style={{
                          width: cq(38), height: cq(38), borderRadius: cq(10), ...chipStyle(mode, accent),
                        }}>
                          <Icon d={glyph!} size={cq(18)} color={accentInk} />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: cq(15), color: accentInk, marginTop: cq(10) }}>
                          {f.verb}
                        </div>
                        <div style={{ fontSize: cq(10.5), lineHeight: 1.5, color: inkSoft, marginTop: cq(4), ...clampLines(4) }}>
                          {f.body}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
                      <div style={{ fontSize: cq(9.5), lineHeight: 1.45, color: inkSoft, ...clampLines(3) }}>{k}</div>
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
                    color: ink, fontWeight: 500, ...clampLines(5),
                  }}>{content.quote.text}</p>
                  <div style={{ marginTop: cq(8), fontSize: cq(11), fontWeight: 700, color: accentInk }}>
                    — {content.quote.author}{content.quote.company ? ` · ${content.quote.company}` : ""}
                  </div>
                </div>
              </div>
            )}

            {/* SHARED MODULES */}
            <PrintSectionsStack sections={content.modules} mode={mode} accent={accent} />

            {/* CTA BAND */}
            {content.cta && (
              <PrintCTABand brand={brand} mode={mode} label={content.cta.label} cq={cq} />
            )}

            {/* FOOTER */}
            <PrintFooterLockup brand={brand} mode={mode} cq={cq} links={["transperfect.com"]} />
          </div>
        </div>
      </SlideAccentContext.Provider>
    </SlideModeContext.Provider>
  );
}

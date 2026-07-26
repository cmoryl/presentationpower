import { useRef, type CSSProperties } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import type {
  CaseStudyContent,
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
  glass,
  IconPath as Icon,
  ICON_PATHS,
  clampLines,
  PrintEyebrow,
} from "@/components/print/print-primitives";



// -----------------------------------------------------------------------
// PORT — TransPerfect CaseStudy.dc.html → CaseStudyLayout
//
// Clean page-base hero, three stat pills tucked under it, Challenge /
// Solution / Result rows, pull-quote + Engagement Snapshot, CTA band,
// footer lockup. Same synthesis as Spotlight/EBrochure/AdaptorBrief: the
// cards use division-tokenized glass, pixels convert to `cqw` against the
// 816px canvas.
//
// Shared page/aurora geometry, glass, chip, and icon primitives live in
// ./print-primitives — do NOT duplicate helpers here.
// -----------------------------------------------------------------------

function padTop(d: PrintDensity): number {
  return pagePadTop(d, 40, 8);
}

const STAT_ICONS = [ICON_PATHS["globe-alt"], ICON_PATHS.sparkles, ICON_PATHS.trending];


export function CaseStudyLayout({
  content, brand, mode, pageSize = "Letter", density = "standard", seed, style,
}: {
  content: CaseStudyContent;
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
  const inkSoft = mode === "dark" ? "rgba(245,244,255,0.72)" : "rgba(68,68,68,0.95)";
  const inkFaint = mode === "dark" ? "rgba(245,244,255,0.55)" : "rgba(102,102,102,0.92)";
  const dividerCol = mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(3,0,44,0.10)";
  const accentInk = mode === "dark" ? accent : primary;
  const bg = mode === "dark" ? "#111114" : "#FFFFFF";
  const chipBg = mode === "dark"
    ? `color-mix(in srgb, ${accent} 22%, rgba(6,4,32,0.7))`
    : `color-mix(in srgb, ${accent} 18%, #ffffff)`;

  const heroRef = useRef<HTMLHeadingElement | null>(null);
  const introRef = useRef<HTMLParagraphElement | null>(null);
  const title = content.summary?.trim()
    ? `${content.client || "Client"} — ${content.summary}`
    : `${content.client || "Client"} case study`;
  const heroTitle = content.summary?.trim() ? content.summary : title;
  useTextFit(heroRef, heroTitle, { min: 22, max: 32, base: 60, cap: 110, containerWidth: PAGE_W });
  useTextFit(introRef, content.industry ?? content.audience ?? "", { min: 10, max: 12, base: 120, cap: 210, containerWidth: PAGE_W });

  const stats = content.stats.slice(0, 3);
  const blocks: Array<{ label: string; block: typeof content.challenge; icon: string }> = [
    { label: content.challenge.heading || "The Challenge", block: content.challenge, icon: ICON_PATHS["globe-alt"] },
    { label: content.solution.heading || "The Solution", block: content.solution, icon: ICON_PATHS.sparkles },
    { label: content.result.heading || "The Result", block: content.result, icon: ICON_PATHS.trending },
  ];


  const engagement = content.engagement ?? {
    title: "Engagement Snapshot",
    bullets: content.expert?.name
      ? [content.expert.name, ...(content.expert.role ? [content.expert.role] : [])]
      : [],
  };

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
            display: "flex",
            flexDirection: "column",
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


          {/* HERO — no full-color band; background inherits page bg (white / offset black).
              When a hero photo is present, reserve the hero band's vertical
              space so the first content module lands at the image fade seam. */}
          <div
            className="relative"
            style={{
              padding: `${cq(padTop(density))} ${cq(padX(density))} ${cq(96)}`,
              overflow: "hidden",
              color: ink,
              display: "flex",
              flexDirection: "column",
              minHeight: content.heroMedia?.imageUrl
                ? `${(content.heroMedia.heightPct ?? 46) - 4}%`
                : undefined,
            }}
          >
            <div className="relative flex items-center justify-between" style={{ gap: cq(10) }}>
              <PrintEyebrow
                label={content.eyebrow ?? "CLIENT CASE STUDY"}
                mode={mode}
                accent={accent}
                cq={cq}
                onDark
              />
              <BrandLockup brand={brand} color={mode === "dark" ? "#FFFFFF" : "#000000"} size="2xs" orientation="horizontal" />
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                transform: `translateY(${content.heroMedia?.copyOffsetPct ?? 0}%)`,
                willChange: "transform",
              }}
            >
              <h1
                ref={heroRef}
                style={{
                  position: "relative",
                  margin: 0,
                  fontWeight: 700, fontSize: cq(32), lineHeight: 1.15,
                  letterSpacing: "-0.015em", color: ink, maxWidth: cq(460),
                }}
              >
                {heroTitle || "Untitled case study"}
              </h1>
              {(content.industry || content.audience) && (
                <p
                  ref={introRef}
                  style={{
                    position: "relative", margin: `${cq(12)} 0 0`,
                    fontSize: cq(12), lineHeight: 1.6,
                    color: inkSoft, maxWidth: cq(420),
                  }}
                >
                  {[content.industry, content.audience].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>



          {/* STAT PILLS — tucked over the hero/body seam */}
          {stats.length > 0 && (
            <div
              className="relative grid"
              style={{
                gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`,
                gap: cq(14),
                padding: `0 ${cq(padX(density))}`,
                marginTop: cq(-48),
              }}
            >
              {stats.map((s, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: cq(12),
                    padding: `${cq(14)} ${cq(16)}`,
                    display: "flex", alignItems: "center", gap: cq(10),
                    ...glass(mode, accent),
                  }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: cq(34), height: cq(34), borderRadius: "50%",
                      border: `1.5px solid color-mix(in srgb, ${accent} 45%, rgba(255,255,255,0.25))`,
                      flexShrink: 0,
                    }}
                  >
                    <Icon d={STAT_ICONS[i % STAT_ICONS.length]!} size={cq(17)} color={accentInk} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: cq(13), color: accentInk, letterSpacing: "-0.01em" }}>
                      {s.value}{s.unit ?? ""}
                    </div>
                    <div style={{ fontSize: cq(9), color: inkFaint, marginTop: cq(2) }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CSR ROWS — Challenge / Solution / Result */}
          <div
            className="relative flex flex-col"
            style={{ padding: `${cq(28)} ${cq(padX(density))} 0`, flex: 1 }}
          >
            {blocks.map((b, i) => (
              <div
                key={i}
                className="flex"
                style={{
                  gap: cq(16),
                  padding: `${cq(14)} 0`,
                  borderBottom: i < blocks.length - 1 ? `1px solid ${dividerCol}` : "none",
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: cq(44), height: cq(44), borderRadius: "50%",
                    background: chipBg, flexShrink: 0,
                  }}
                >
                  <Icon d={b.icon} size={cq(22)} color={accentInk} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: cq(13.5), color: accentInk }}>{b.label}</div>
                  {b.block.body && (
                    <p style={{ margin: `${cq(5)} 0 0`, fontSize: cq(10.5), lineHeight: 1.6, color: inkSoft, ...clampLines(3) }}>
                      {b.block.body}
                    </p>
                  )}

                </div>
              </div>
            ))}

            {/* QUOTE + ENGAGEMENT SNAPSHOT */}
            {(content.quote || engagement.bullets.length > 0) && (
              <div className="flex" style={{ gap: cq(16), paddingTop: cq(14) }}>
                {content.quote && (
                  <div
                    style={{
                      flex: "1.4 1 0",
                      borderRadius: cq(14),
                      padding: `${cq(20)} ${cq(22)}`,
                      background: mode === "dark"
                        ? `linear-gradient(120deg, color-mix(in srgb, ${accent} 22%, rgba(10,8,36,0.6)), rgba(6,4,32,0.55))`
                        : `linear-gradient(120deg, color-mix(in srgb, ${accent} 14%, #EFE7FF), color-mix(in srgb, ${accent} 8%, #E0F7F6))`,
                      border: `1px solid color-mix(in srgb, ${accent} 20%, rgba(255,255,255,0.6))`,
                    }}
                  >
                    <div style={{ fontFamily: "Georgia, serif", fontSize: cq(40), lineHeight: 0.6, color: accentInk, fontWeight: 700 }} aria-hidden>
                      &ldquo;
                    </div>
                    <p style={{ margin: `${cq(10)} 0 0`, fontSize: cq(12.5), lineHeight: 1.6, color: ink, ...clampLines(5) }}>
                      {content.quote.text}
                    </p>

                    <div style={{ marginTop: cq(10), fontSize: cq(11), fontWeight: 700, color: accentInk }}>
                      — {content.quote.author}{content.quote.company ? ` · ${content.quote.company}` : ""}
                    </div>
                  </div>
                )}
                {engagement.bullets.length > 0 && (
                  <div style={{ flex: "1 1 0", padding: `${cq(6)} 0` }}>
                    <div style={{ fontWeight: 700, fontSize: cq(12), color: accentInk }}>
                      {engagement.title ?? "Engagement Snapshot"}
                    </div>
                    {engagement.bullets.slice(0, 4).map((b, k) => (
                      <div key={k} className="flex items-center" style={{ gap: cq(8), marginTop: k === 0 ? cq(12) : cq(9) }}>
                        <div
                          className="flex items-center justify-center"
                          style={{
                            width: cq(22), height: cq(22), borderRadius: "50%",
                            background: chipBg, flexShrink: 0,
                          }}
                        >
                          <Icon d={ICON_PATHS.check} size={cq(12)} color={accentInk} strokeWidth={2} />
                        </div>
                        <div style={{ fontSize: cq(10), color: inkSoft, ...clampLines(2) }}>{b}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SHARED MODULES — user-inserted reusable blocks */}
            <PrintSectionsStack sections={content.modules} mode={mode} accent={accent} />

            {/* CTA BAND */}
            {content.cta && (
              <PrintCTABand
                brand={brand}
                mode={mode}
                label={content.cta.label}
                subhead={content.cta.subhead}
                buttonLabel={content.cta.buttonLabel}
                cq={cq}
              />
            )}

            {/* FOOTER LOCKUP */}
            <PrintFooterLockup
              brand={brand}
              mode={mode}
              cq={cq}
              links={content.footer?.links ?? ["transperfect.com"]}
              email={content.expert?.email}
            />
          </div>
        </div>
      </SlideAccentContext.Provider>
    </SlideModeContext.Provider>
  );
}

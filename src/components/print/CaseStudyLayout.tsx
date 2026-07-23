import { useRef, type CSSProperties } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import type {
  CaseStudyContent,
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
// PORT — TransPerfect CaseStudy.dc.html → CaseStudyLayout
//
// Dark gradient hero, three stat pills tucked over the seam, Challenge /
// Solution / Result rows, pull-quote + Engagement Snapshot, CTA band,
// footer lockup. Same synthesis as Spotlight/EBrochure: the hero gradient
// is division-tokenized, the white cards become glass over the aurora,
// pixels are converted to `cqw` against the 816px canvas.
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
function padTop(d: PrintDensity): number { return d === "compact" ? 32 : d === "airy" ? 46 : 40; }

function glass(mode: "light" | "dark", accent: string): CSSProperties {
  if (mode === "dark") {
    return {
      background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 6%, rgba(10,8,36,0.62)), rgba(6,4,32,0.55))`,
      border: `1px solid color-mix(in srgb, ${accent} 22%, rgba(255,255,255,0.08))`,
      backdropFilter: "blur(14px) saturate(140%)",
      boxShadow: `0 ${cq(10)} ${cq(28)} rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04)`,
    };
  }
  return {
    background: `linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.74))`,
    border: `1px solid color-mix(in srgb, ${accent} 18%, rgba(255,255,255,0.75))`,
    backdropFilter: "blur(14px) saturate(140%)",
    boxShadow: `0 ${cq(6)} ${cq(18)} rgba(3,0,44,0.12), inset 0 0 0 1px rgba(255,255,255,0.55)`,
  };
}

// Heroicons-style outline paths.
const ICONS = {
  globe: "M12 21a9 9 0 0 0 0-18m0 18a9 9 0 0 1 0-18m0 18c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3M3.6 9h16.8M3.6 15h16.8",
  spark: "M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2",
  trending: "M3 17l6-6 4 4 8-8M15 7h6v6",
  check: "M4 12l5 5L20 6",
} as const;

function Icon({ d, size, color, sw = 1.5 }: { d: string; size: number | string; color: string; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }} aria-hidden>
      <path d={d} />
    </svg>
  );
}

const STAT_ICONS = [ICONS.globe, ICONS.spark, ICONS.trending];

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
    { label: content.challenge.heading || "The Challenge", block: content.challenge, icon: ICONS.globe },
    { label: content.solution.heading || "The Solution", block: content.solution, icon: ICONS.spark },
    { label: content.result.heading || "The Result", block: content.result, icon: ICONS.trending },
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
            backgroundColor: bg,
            color: ink,
            fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
            display: "flex",
            flexDirection: "column",
            ...style,
          }}
        >
          <AuroraLayer
            seed={seed ?? `casestudy-${brand.id}-${mode}`}
            brand={brand}
            intensity={0.85}
            aspect={auroraAspect(pageSize)}
          />
          {content.heroMedia && (
            <PrintHeroMediaLayer media={content.heroMedia} accent={accent} mode={mode} cq={cq} />
          )}


          {/* HERO — no full-color band; background inherits page bg (white / offset black).
              A soft accent halo bleeds from the top-right so the division still reads. */}
          <div
            className="relative"
            style={{
              padding: `${cq(padTop(density))} ${cq(padX(density))} ${cq(96)}`,
              overflow: "hidden",
              color: ink,
            }}
          >
            <div
              className="pointer-events-none absolute"
              aria-hidden
              style={{
                top: cq(-60), right: cq(-80),
                width: cq(300), height: cq(300), borderRadius: "50%",
                background: `radial-gradient(circle at 40% 40%, color-mix(in srgb, ${accent} 45%, transparent) 0%, color-mix(in srgb, ${accent} 15%, transparent) 50%, transparent 72%)`,
                filter: `blur(${cq(6)})`,
                opacity: mode === "dark" ? 0.85 : 0.55,
              }}
            />
            <div className="relative flex items-center justify-between" style={{ gap: cq(10) }}>
              <div style={{ fontSize: cq(9.5), fontWeight: 600, letterSpacing: "0.14em", color: accentInk }}>
                {(content.eyebrow ?? "CLIENT CASE STUDY").toUpperCase()}
              </div>
              <BrandLockup brand={brand} color={resolvePrintLogoInk(content.logoColor, ink)} size="xs" orientation="horizontal" />
            </div>
            <h1
              ref={heroRef}
              style={{
                position: "relative",
                margin: `${cq(14)} 0 0`,
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
            className="flex flex-col"
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
                    <p style={{ margin: `${cq(5)} 0 0`, fontSize: cq(10.5), lineHeight: 1.6, color: inkSoft }}>
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
                    <p style={{ margin: `${cq(10)} 0 0`, fontSize: cq(12.5), lineHeight: 1.6, color: ink }}>
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
                          <Icon d={ICONS.check} size={cq(12)} color={accentInk} sw={2} />
                        </div>
                        <div style={{ fontSize: cq(10), color: inkSoft }}>{b}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CTA BAND */}
            {content.cta && (
              <div
                className="flex items-center justify-between"
                style={{
                  marginTop: cq(22), borderRadius: cq(12),
                  padding: `${cq(16)} ${cq(20)}`,
                  background: `linear-gradient(90deg, #03002C 0%, ${primary} 70%, color-mix(in srgb, ${primary} 40%, ${accent}) 100%)`,
                  color: "#FFFFFF",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: cq(15), color: "#FFFFFF" }}>{content.cta.label}</div>
                  {content.cta.subhead && (
                    <div style={{ fontSize: cq(10), color: "rgba(255,255,255,0.8)", marginTop: cq(3) }}>
                      {content.cta.subhead}
                    </div>
                  )}
                </div>
                <div style={{
                  border: "1.5px solid #FFFFFF", borderRadius: 999,
                  padding: `${cq(8)} ${cq(18)}`, fontSize: cq(11),
                  fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap",
                }}>{content.cta.buttonLabel ?? "Book a Demo »"}</div>
              </div>
            )}

            {/* FOOTER LOCKUP */}
            <div
              className="flex items-center justify-between"
              style={{
                borderTop: `1px solid ${dividerCol}`,
                marginTop: cq(20), paddingTop: cq(16), paddingBottom: cq(6),
                gap: cq(16),
              }}
            >
              <BrandLockup brand={brand} color={ink} size="2xs" orientation="horizontal" />
              <div className="flex items-center" style={{ gap: cq(18), fontSize: cq(9.5), color: accentInk }}>
                {(content.footer?.links ?? ["transperfect.com"]).map((l, i) => (
                  <span key={i}>{l}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SlideAccentContext.Provider>
    </SlideModeContext.Provider>
  );
}

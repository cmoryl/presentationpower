import { useRef, type CSSProperties } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import type { EBrochureContent, PrintDensity, PrintPageSize } from "@/lib/print-assets.types";
import { SlideModeContext, SlideAccentContext } from "@/components/slide/SlideChrome";
import { BrandLockup } from "@/components/BrandLockup";
import { PrintHeroMediaLayer } from "@/components/print/PrintHeroMedia";
import { PrintCTABand, PrintFooterLockup } from "@/components/print/PrintChrome";
import { PrintSectionsStack } from "@/components/print/sections/PrintSectionRenderer";
import { useTextFit } from "@/lib/text-fit";
import { EditableIcon } from "@/components/print/PrintIconEdit";
import {
  PAGE_W,
  cq,
  padCq,
  pageAspect,
  pagePadX as padX,
  pagePadTop,
  glass,
  chipStyle,
  IconPath as Icon,
  clampLines,
  ICON_PATHS,
  PrintEyebrow,
} from "@/components/print/print-primitives";

// -----------------------------------------------------------------------
// PORT — TransPerfect EBrochure.dc.html → EBrochureLayout
//
// SINGLE PAGE by design. This is the standalone print-asset E-Brochure —
// authored content on the portrait canvas, faithful to EBrochure.dc.html.
// Do NOT convert it to multi-page. Deck-derived multi-page brochures are
// the separate `deck-brochure` document-family (see src/lib/document-families.ts),
// which reflows deck slides onto multiple pages. The two live side by side
// with different names precisely so nobody "fixes" this later.
//
// Shared page/aurora geometry, glass, chip, and icon primitives live in
// ./print-primitives so the four print layouts read as one family.
// -----------------------------------------------------------------------

function padTop(d: import("@/lib/print-assets.types").PrintDensity): number {
  return pagePadTop(d, 40, 8);
}

const ICONS = ICON_PATHS;

const SECTION_ICONS = [ICONS.target, ICONS.bolt, ICONS.trending];
const SECTION_WARM = [true, false, true]; // matches template: warm / cool / warm

export function EBrochureLayout({
  content,
  brand,
  mode,
  pageSize = "Letter",
  density = "standard",
  seed,
  style,
}: {
  content: EBrochureContent;
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
  const inkFaint = mode === "dark" ? "rgba(245,244,255,0.55)" : "rgba(102,102,102,0.92)";
  const dividerCol = mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(3,0,44,0.14)";
  const accentInk = mode === "dark" ? accent : primary;
  const bg = mode === "dark" ? "#111114" : "#FFFFFF";

  const heroRef = useRef<HTMLHeadingElement | null>(null);
  const introRef = useRef<HTMLParagraphElement | null>(null);
  useTextFit(heroRef, content.title, {
    min: 24,
    max: 30,
    base: 50,
    cap: 95,
    containerWidth: PAGE_W,
  });
  useTextFit(introRef, content.summary ?? "", {
    min: 10,
    max: 11.5,
    base: 160,
    cap: 260,
    containerWidth: PAGE_W,
  });

  const sections = content.sections.slice(0, 3);
  const stats = content.stats.slice(0, 5);

  return (
    <SlideModeContext.Provider value={mode}>
      <SlideAccentContext.Provider value={accent}>
        <div
          className="relative w-full overflow-hidden [container-type:inline-size]"
          data-print-page
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

          <div
            className="relative flex h-full flex-col"
            style={{
              paddingLeft: padCq(padX(density)),
              paddingRight: padCq(padX(density)),
              paddingTop: cq(padTop(density)),
              paddingBottom: cq(26),
            }}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between" style={{ gap: cq(10) }}>
              <PrintEyebrow
                label={content.eyebrow ?? "EBROCHURE"}
                mode={mode}
                accent={accent}
                cq={cq}
              />
              <BrandLockup
                brand={brand}
                color={mode === "dark" ? "#FFFFFF" : "#000000"}
                size="2xs"
                orientation="horizontal"
                monochromeOfficialLogo
              />
            </div>

            {/* HERO — title + summary. Reserve hero band height when a photo
                is present so the summary cards drop into the fade seam. */}
            <div
              style={{
                paddingTop: cq(22),
                minHeight: content.heroMedia?.imageUrl
                  ? `calc(${(content.heroMedia.heightPct ?? 46) - 6}% - ${cq(padTop(density))})`
                  : undefined,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  transform: `translateY(${content.heroMedia?.copyOffsetPct ?? 0}%)`,
                  willChange: "transform",
                }}
              >
                <div
                  ref={heroRef}
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: cq(30),
                    lineHeight: 1.16,
                    letterSpacing: "-0.015em",
                    color: ink,
                    maxWidth: cq(440),
                  }}
                >
                  {content.title || "Untitled brochure"}
                </div>
                {content.summary && (
                  <p
                    ref={introRef}
                    style={{
                      margin: `${cq(12)} 0 0`,
                      fontSize: cq(11.5),
                      lineHeight: 1.65,
                      color: inkSoft,
                      maxWidth: cq(430),
                    }}
                  >
                    {content.summary}
                  </p>
                )}
              </div>
            </div>

            {/* 3 SUMMARY CARDS — Challenge / Approach / Impact in one panel (Canva ref). */}
            <div style={{ paddingTop: cq(38), marginTop: cq(-6) }}>
              <div style={{ borderRadius: cq(16), padding: cq(16), ...glass(mode, accent) }}>
                <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: cq(14) }}>
                  {sections.map((s, i) => (
                    <div
                      key={i}
                      style={{
                        borderRadius: cq(12),
                        padding: `${cq(10)} ${cq(8)}`,
                        background: "transparent",
                      }}
                    >
                      <div className="flex items-center" style={{ gap: cq(8) }}>
                        <div
                          className="flex items-center justify-center"
                          style={{
                            width: cq(30),
                            height: cq(30),
                            borderRadius: cq(8),
                            ...chipStyle(mode, accent, SECTION_WARM[i]!),
                          }}
                        >
                          <EditableIcon slot={`eb.section.${i}`} d={SECTION_ICONS[i]!} size={cq(16)} color={accentInk} />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: cq(12.5), color: ink }}>
                          {s.heading}
                        </div>
                      </div>
                      {s.body && (
                        <p
                          style={{
                            margin: `${cq(9)} 0 0`,
                            fontSize: cq(9.5),
                            lineHeight: 1.55,
                            color: inkSoft,
                            ...clampLines(5),
                          }}
                        >
                          {s.body}
                        </p>
                      )}
                      {s.bullets.length > 0 && (
                        <ul
                          style={{
                            margin: `${cq(8)} 0 0`,
                            paddingLeft: cq(14),
                            fontSize: cq(9),
                            lineHeight: 1.6,
                            color: inkFaint,
                          }}
                        >
                          {s.bullets.slice(0, 4).map((b, k) => (
                            <li key={k} style={clampLines(2)}>
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* STAT ROW — icon + big number × 5 */}
            {stats.length > 0 && (
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`,
                  gap: cq(12),
                  paddingTop: cq(28),
                  textAlign: "center",
                }}
              >
                {stats.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-center" style={{ gap: cq(6) }}>
                      <Icon
                        d={
                          [
                            ICONS["globe-alt"],
                            ICONS.trending,
                            ICONS.star,
                            ICONS.bolt,
                            ICONS.target,
                          ][i % 5]!
                        }
                        size={cq(15)}
                        color={accentInk}
                      />
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: cq(19),
                          color: accentInk,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {s.value}
                        {s.unit ?? ""}
                      </span>
                    </div>
                    <div style={{ fontSize: cq(9), color: inkFaint, marginTop: cq(4) }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* QUOTE + DISCOVER PANEL */}
            {(content.quote || content.discover) && (
              <div className="flex" style={{ gap: cq(16), paddingTop: cq(26), flex: 1 }}>
                {content.quote && (
                  <div
                    style={{
                      flex: "1.3 1 0",
                      borderRadius: cq(14),
                      padding: `${cq(20)} ${cq(22)}`,
                      ...glass(mode, accent),
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "Georgia, serif",
                        fontSize: cq(40),
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
                        ...clampLines(6),
                      }}
                    >
                      {content.quote.text}
                    </p>
                    <div
                      style={{
                        marginTop: cq(10),
                        fontSize: cq(11),
                        fontWeight: 700,
                        color: accentInk,
                      }}
                    >
                      — {content.quote.author}
                      {content.quote.company ? ` · ${content.quote.company}` : ""}
                    </div>
                  </div>
                )}
                {content.discover && (
                  <div style={{ flex: "1 1 0", padding: `${cq(6)} 0` }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: cq(10),
                        lineHeight: 1.6,
                        color: inkSoft,
                        ...clampLines(6),
                      }}
                    >
                      {content.discover.body}
                    </p>
                    {content.discover.bullets.slice(0, 4).map((b, k) => (
                      <div
                        key={k}
                        className="flex items-center"
                        style={{ gap: cq(8), marginTop: k === 0 ? cq(12) : cq(8) }}
                      >
                        <EditableIcon slot="eb.check" d={ICONS.check} size={cq(11)} color={accentInk} strokeWidth={2.5} />
                        <div style={{ fontSize: cq(10), color: inkSoft, ...clampLines(2) }}>
                          {b}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SHARED MODULES */}
            <PrintSectionsStack sections={content.modules} mode={mode} accent={accent} />

            {/* CTA BAND */}
            {content.cta && (
              <PrintCTABand
                brand={brand}
                mode={mode}
                label={content.cta.label}
                subhead={content.cta.subhead}
                cq={cq}
              />
            )}

            {/* FOOTER */}
            <PrintFooterLockup brand={brand} mode={mode} cq={cq} links={["transperfect.com"]} />
          </div>
        </div>
      </SlideAccentContext.Provider>
    </SlideModeContext.Provider>
  );
}

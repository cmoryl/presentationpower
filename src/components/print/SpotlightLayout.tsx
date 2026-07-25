import { useRef, type CSSProperties } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import type {
  SpotlightContent,
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
  pagePadX,
  pagePadTop,
  glass,
  chipStyle,
  Icon,
  clampLines,
  PrintEyebrow,
  type IconName,
} from "@/components/print/print-primitives";


// PORT — TransPerfect ClientSpotlight.dc.html → SpotlightLayout.
// Layout / grid / hierarchy stay verbatim from the template. Every shared
// helper (page geometry, glass, chips, icons) lives in ./print-primitives so
// the three print layouts read as one family.

// Density → the template's outer 44px page inset gets nudged up/down.
function padXFn(d: import("@/lib/print-assets.types").PrintDensity): number {
  return pagePadX(d);
}
function padTopFn(d: import("@/lib/print-assets.types").PrintDensity): number {
  // Spotlight opens tight — base 26, ±4.
  return pagePadTop(d, 26, 4);
}

// Deterministic stat-icon heuristic.
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

  const padX = padXFn(density);
  const padTop = padTopFn(density);
  const padXcq = cq(padX);
  const padTopCq = cq(padTop);

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
          {/* Light mode: hard white base under everything (belt-and-suspenders). */}
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
            style={{ paddingLeft: padXcq, paddingRight: padXcq, paddingTop: padTopCq, paddingBottom: cq(26) }}
          >
            {/* ============================================================ */}
            {/* HEADER — brand lockup + CLIENT SPOTLIGHT eyebrow              */}
            {/* ============================================================ */}
            <div className="flex items-center justify-between" style={{ gap: cq(10) }}>
              <PrintEyebrow
                label={content.eyebrow ?? "Client spotlight"}
                mode={mode}
                accent={accent}
                cq={cq}
              />
              <BrandLockup brand={brand} color={brand.id === "bm-enterprise" ? (mode === "dark" ? "#FFFFFF" : "#000000") : (mode === "dark" ? "#FFFFFF" : resolvePrintLogoInk(content.logoColor, ink))} size="2xs" orientation="horizontal" />
            </div>

            {/* ============================================================ */}
            {/* HERO — title + intro (left)  |  quote glass card (right)      */}
            {/* ============================================================ */}
            <div className="flex" style={{
              gap: cq(28),
              paddingTop: cq(26),
              minHeight: content.heroMedia?.imageUrl
                ? `calc(${(content.heroMedia.heightPct ?? 46) - 6}% - ${padTopCq})`
                : undefined,
            }}>
              <div style={{ flex: "1.15 1 0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div
                  style={{
                    transform: `translateY(${content.heroMedia?.copyOffsetPct ?? 0}%)`,
                    willChange: "transform",
                  }}
                >
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
                      ...clampLines(6),
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
                              ...clampLines(2),
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
                          <div style={{ fontSize: cq(9), color: inkSoft, lineHeight: 1.3, ...clampLines(2) }}>
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
                          ...clampLines(6),
                        }}
                      >
                        {c.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SHARED MODULES */}
            <PrintSectionsStack sections={content.modules} mode={mode} accent={accent} />

            {/* Rhythm spacer — takes leftover column height as ONE uniform gap
                above the CTA instead of inflating the top-aligned capability
                row. Fixes the dead-space band that appeared when capability
                bodies were short and shared-modules were empty. */}
            <div style={{ flex: 1, minHeight: cq(12) }} aria-hidden />

            {/* ============================================================ */}
            {/* CTA BAND — division-tokenized gradient                        */}
            {/* ============================================================ */}
            {content.cta && (
              <PrintCTABand
                brand={brand}
                mode={mode}
                label={content.cta.label}
                subhead={content.summary ? `Explore how ${brand.name} can transform your operations.` : undefined}
                cq={cq}
              />
            )}

            {/* ============================================================ */}
            {/* FOOTER — TP + division lockup + contact strip                 */}
            {/* ============================================================ */}
            <PrintFooterLockup
              brand={brand}
              mode={mode}
              cq={cq}
              links={["transperfect.com"]}
              email={content.expert?.email}
            />

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

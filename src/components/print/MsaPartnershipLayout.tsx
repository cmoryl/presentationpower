import { useRef, type CSSProperties } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import type {
  MsaPartnershipContent,
  PrintDensity,
  PrintPageSize,
} from "@/lib/print-assets.types";
import { SlideModeContext, SlideAccentContext } from "@/components/slide/SlideChrome";
import { BrandLockup } from "@/components/BrandLockup";
import { PrintSectionsStack } from "@/components/print/sections/PrintSectionRenderer";
import { useTextFit } from "@/lib/text-fit";
import { EditableIcon } from "@/components/print/PrintIconEdit";
import {
  PAGE_W,
  cq,
  pageAspect,
  pagePadX as padX,
  ICON_PATHS,
  clampLines,
  type IconName,
} from "@/components/print/print-primitives";

// -----------------------------------------------------------------------
// PORT — TP_MSA-Partnership_*.pdf → MsaPartnershipLayout
//
// Structure (top → bottom):
//   1. Navy relationship band: co-brand lockup, positioning line,
//      KPI cards, MSA / preferred-provider paragraph.
//   2. Solutions grid + right-hand scale rail, headed by a pill title
//      that straddles the band seam.
//   3. "Departments supported" two-column table + global contacts panel.
//   4. Footer division URL rule.
//
// Page geometry, chips and icons come from ./print-primitives so this reads
// as part of the same print family as the other layouts.
// -----------------------------------------------------------------------

const FALLBACK_ICONS: IconName[] = [
  "language",
  "check",
  "users",
  "star",
  "bolt",
  "chat",
  "globe-alt",
  "learn",
  "target",
  "grid",
  "trending",
  "clock",
];

function iconFor(name: string | undefined, i: number): string {
  if (name && name in ICON_PATHS) return ICON_PATHS[name as IconName];
  return ICON_PATHS[FALLBACK_ICONS[i % FALLBACK_ICONS.length]!];
}

function statValue(s: { value: string; unit?: string }): string {
  return `${s.value ?? ""}${s.unit ?? ""}`;
}

export function MsaPartnershipLayout({
  content,
  brand,
  mode,
  pageSize = "Letter",
  density = "standard",
  style,
}: {
  content: MsaPartnershipContent;
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
  const inkSoft = mode === "dark" ? "rgba(245,244,255,0.74)" : "rgba(85,85,85,0.94)";
  const pageBg = mode === "dark" ? "#111114" : "#FFFFFF";
  const bandInk = "#FFFFFF";
  const bandSoft = "rgba(255,255,255,0.86)";
  const rowAlt = mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(3,0,44,0.035)";
  const rowLine = mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(3,0,44,0.1)";

  const introRef = useRef<HTMLParagraphElement | null>(null);
  const noteRef = useRef<HTMLParagraphElement | null>(null);
  useTextFit(introRef, content.intro ?? "", {
    min: 11,
    max: 15,
    base: 120,
    cap: 200,
    containerWidth: PAGE_W,
  });
  useTextFit(noteRef, content.partnershipNote ?? "", {
    min: 9.5,
    max: 11.5,
    base: 220,
    cap: 400,
    containerWidth: PAGE_W,
  });

  const stats = (content.stats ?? []).slice(0, 6);
  const solutions = (content.solutions ?? []).slice(0, 12);
  const scale = (content.scale ?? []).slice(0, 4);
  const departments = (content.departments ?? []).slice(0, 20);
  const deptRows: [string | undefined, string | undefined][] = [];
  const half = Math.ceil(departments.length / 2);
  for (let i = 0; i < half; i++) deptRows.push([departments[i], departments[half + i]]);
  const contacts = content.contacts;

  return (
    <SlideModeContext.Provider value={mode}>
      <SlideAccentContext.Provider value={accent}>
        <div
          className="relative w-full overflow-hidden [container-type:inline-size]"
          data-print-page
          style={{
            aspectRatio: pageAspect(pageSize),
            backgroundColor: pageBg,
            color: ink,
            fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
            display: "flex",
            flexDirection: "column",
            ...style,
          }}
        >
          {/* ---------- 1. NAVY RELATIONSHIP BAND ---------- */}
          <div
            data-section="band"
            data-section-label="Partnership band"
            style={{
              position: "relative",
              background: `linear-gradient(118deg, #03002C 0%, ${primary} 62%, color-mix(in srgb, ${primary} 62%, ${accent}) 100%)`,
              color: bandInk,
              paddingLeft: cq(padX(density)),
              paddingRight: cq(padX(density)),
              paddingTop: cq(30),
              paddingBottom: cq(34),
            }}
          >
            {/* CO-BRAND LOCKUP */}
            <div
              className="flex items-center justify-center"
              style={{ gap: cq(22), minHeight: cq(46) }}
            >
              <BrandLockup
                brand={brand}
                color="#FFFFFF"
                size="sm"
                orientation="horizontal"
                monochromeOfficialLogo
              />
              <div
                aria-hidden
                style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,0.4)" }}
              />
              {content.partnerLogoUrl ? (
                <img
                  src={content.partnerLogoUrl}
                  alt={content.partner ? `${content.partner} logo` : ""}
                  style={{
                    height: cq(34),
                    width: "auto",
                    maxWidth: cq(220),
                    objectFit: "contain",
                    filter: "brightness(0) invert(1)",
                  }}
                />
              ) : (
                <div
                  style={{
                    fontSize: cq(26),
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    color: bandInk,
                  }}
                >
                  {content.partner || "Partner"}
                </div>
              )}
            </div>

            {/* POSITIONING LINE */}
            {content.intro && (
              <p
                ref={introRef}
                style={{
                  margin: `${cq(18)} auto 0`,
                  maxWidth: cq(560),
                  textAlign: "center",
                  fontSize: cq(15),
                  lineHeight: 1.45,
                  color: bandInk,
                }}
              >
                {content.intro}
              </p>
            )}

            {/* KPI CARDS */}
            {stats.length > 0 && (
              <div
                className="grid"
                style={{
                  marginTop: cq(22),
                  gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`,
                  gap: cq(10),
                }}
              >
                {stats.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      borderRadius: cq(14),
                      border: "1px solid rgba(255,255,255,0.42)",
                      background: "rgba(255,255,255,0.06)",
                      padding: `${cq(14)} ${cq(8)}`,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: cq(26),
                        fontWeight: 700,
                        lineHeight: 1.05,
                        letterSpacing: "-0.02em",
                        color: bandInk,
                      }}
                    >
                      {statValue(s)}
                    </div>
                    <div
                      style={{
                        marginTop: cq(6),
                        fontSize: cq(8.5),
                        lineHeight: 1.35,
                        fontWeight: 600,
                        color: bandSoft,
                        ...clampLines(3),
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* MSA PARAGRAPH */}
            {content.partnershipNote && (
              <p
                ref={noteRef}
                style={{
                  margin: `${cq(20)} auto 0`,
                  maxWidth: cq(620),
                  textAlign: "center",
                  fontSize: cq(11),
                  lineHeight: 1.6,
                  color: bandSoft,
                }}
              >
                {content.partnershipNote}
              </p>
            )}
          </div>

          {/* ---------- 2. SOLUTIONS GRID + SCALE RAIL ---------- */}
          <div
            data-section="solutions"
            data-section-label="Solutions grid"
            style={{
              position: "relative",
              paddingLeft: cq(padX(density)),
              paddingRight: cq(padX(density)),
              paddingTop: cq(30),
              flex: 1,
            }}
          >
            {/* PILL TITLE — straddles the band seam. */}
            <div
              style={{
                position: "absolute",
                top: cq(-18),
                left: "50%",
                transform: "translateX(-50%)",
                borderRadius: cq(999),
                background: mode === "dark" ? "#1B1B22" : "#FFFFFF",
                border: `1px solid ${rowLine}`,
                boxShadow: "0 6px 18px rgba(3,0,44,0.14)",
                padding: `${cq(10)} ${cq(30)}`,
                fontSize: cq(15),
                fontWeight: 700,
: 700,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                color: primary,
                whiteSpace: "nowrap",
              }}
            >
              {content.solutionsTitle || "Discover a world of solutions"}
            </div>

            <div
              className="grid"
              style={{ gridTemplateColumns: scale.length ? "1fr auto" : "1fr", gap: cq(22) }}
            >
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: `${cq(18)} ${cq(12)}`,
                  paddingTop: cq(14),
                }}
              >
                {solutions.map((s, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center"
                    style={{ gap: cq(8), textAlign: "center" }}
                  >
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: cq(40),
                        height: cq(40),
                        borderRadius: "50%",
                        border: `1px solid ${rowLine}`,
                        background: mode === "dark" ? "rgba(255,255,255,0.05)" : "#F5F8FF",
                      }}
                    >
                      <EditableIcon
                        slot={`msa.solution.${i}`}
                        d={iconFor(s.icon, i)}
                        size={cq(20)}
                        color={primary}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: cq(9.5),
                        lineHeight: 1.35,
                        fontWeight: 600,
                        color: ink,
                        ...clampLines(3),
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {scale.length > 0 && (
                <div
                  data-section="scale"
                  data-section-label="Scale rail"
                  style={{
                    width: cq(150),
                    borderLeft: `1px solid ${rowLine}`,
                    paddingLeft: cq(16),
                    display: "flex",
                    flexDirection: "column",
                    gap: cq(14),
                  }}
                >
                  {scale.map((s, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: cq(24),
                          fontWeight: 700,
                          lineHeight: 1.05,
                          letterSpacing: "-0.02em",
                          color: primary,
                        }}
                      >
                        {statValue(s)}
                      </div>
                      <div
                        style={{
                          marginTop: cq(3),
                          fontSize: cq(8.5),
                          lineHeight: 1.35,
                          fontWeight: 600,
                          color: inkSoft,
                          ...clampLines(2),
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ---------- 3. DEPARTMENTS + CONTACTS ---------- */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: contacts ? "1fr auto" : "1fr",
              gap: cq(22),
              alignItems: "start",
              paddingLeft: cq(padX(density)),
              paddingRight: cq(padX(density)),
              paddingTop: cq(24),
            }}
          >
            {departments.length > 0 && (
              <div data-section="departments" data-section-label="Departments supported">
                <div
                  style={{
                    borderTopLeftRadius: cq(12),
                    borderTopRightRadius: cq(12),
                    background: primary,
                    color: "#FFFFFF",
                    padding: `${cq(10)} ${cq(16)}`,
                    fontSize: cq(13),
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    textAlign: "center",
                  }}
                >
                  {content.departmentsTitle || "Departments supported"}
                </div>
                <div style={{ border: `1px solid ${rowLine}`, borderTop: "none" }}>
                  {deptRows.map((pair, i) => (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        borderTop: i === 0 ? "none" : `1px solid ${rowLine}`,
                        background: i % 2 === 1 ? rowAlt : "transparent",
                      }}
                    >
                      {[pair[0], pair[1]].map((label, j) => (
                        <div
                          key={j}
                          style={{
                            padding: `${cq(7)} ${cq(12)}`,
                            fontSize: cq(9.5),
                            lineHeight: 1.4,
                            textAlign: "center",
                            color: ink,
                            borderLeft: j === 1 ? `1px solid ${rowLine}` : "none",
                            ...clampLines(2),
                          }}
                        >
                          {label ?? ""}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {contacts && (
              <div
                data-section="contacts"
                data-section-label="Global contacts"
                style={{ width: cq(210) }}
              >
                {contacts.title && (
                  <div
                    style={{
                      fontSize: cq(14),
                      fontWeight: 700,
                      color: primary,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {contacts.title}
                  </div>
                )}
                {contacts.name && (
                  <div
                    style={{ marginTop: cq(6), fontSize: cq(11.5), fontWeight: 700, color: ink }}
                  >
                    {contacts.name}
                  </div>
                )}
                {contacts.role && (
                  <div style={{ fontSize: cq(10), color: inkSoft }}>{contacts.role}</div>
                )}
                {contacts.phone && (
                  <div style={{ marginTop: cq(8), fontSize: cq(10), color: inkSoft }}>
                    {contacts.phone}
                  </div>
                )}
                {contacts.email && (
                  <div style={{ fontSize: cq(10), color: inkSoft }}>{contacts.email}</div>
                )}
                {contacts.ctaLabel && (
                  <div
                    style={{
                      marginTop: cq(12),
                      fontSize: cq(11),
                      fontWeight: 700,
                      color: primary,
                    }}
                  >
                    {contacts.ctaLabel}
                  </div>
                )}
                {contacts.ctaEmail && (
                  <div style={{ fontSize: cq(10), color: inkSoft, wordBreak: "break-all" }}>
                    {contacts.ctaEmail}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SHARED MODULES */}
          <div style={{ paddingLeft: cq(padX(density)), paddingRight: cq(padX(density)) }}>
            <PrintSectionsStack sections={content.modules} mode={mode} accent={accent} />
          </div>

          {/* ---------- 4. FOOTER RULE ---------- */}
          <div
            data-section="footer"
            data-section-label="Footer"
            className="flex items-center"
            style={{
              gap: cq(14),
              paddingLeft: cq(padX(density)),
              paddingRight: cq(padX(density)),
              paddingTop: cq(18),
              paddingBottom: cq(24),
              marginTop: "auto",
            }}
          >
            <div style={{ flex: 1, height: 1, background: rowLine }} />
            <div
              style={{
                fontSize: cq(10),
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: primary,
                whiteSpace: "nowrap",
              }}
            >
              {content.footerUrl || "transperfect.com"}
            </div>
            <div style={{ flex: 1, height: 1, background: rowLine }} />
          </div>
        </div>
      </SlideAccentContext.Provider>
    </SlideModeContext.Provider>
  );
}

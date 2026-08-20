import { useRef, type CSSProperties } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import type {
  SolutionProposalContent,
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
  padCq,
  pageAspect,
  pagePadX as padX,
  ICON_PATHS,
  clampLines,
  type IconName,
} from "@/components/print/print-primitives";

// -----------------------------------------------------------------------
// PORT — TransPerfect_Solutions_Proposal_Template.pptx → single print page.
//
// Structure (top → bottom):
//   1. Masthead: TransPerfect lockup + client logo slot, eyebrow, title,
//      positioning paragraph, accent rule.
//   2. Cover block: "Prepared for" / "Prepared by" / date columns.
//   3. Scope band: "What's included" icon chips + source files, deliverables
//      and timeline cards.
//   4. Cost summary table + proof rail (stats and pull-quote).
//   5. Your team cards + next steps.
//   6. Footer division URL rule.
//
// Every string comes from `SolutionProposalContent`, so the master editor,
// the asset editor and the PDF export all drive the same nodes.
// -----------------------------------------------------------------------

const FALLBACK_ICONS: IconName[] = [
  "check",
  "language",
  "grid",
  "users",
  "clock",
  "target",
  "globe-alt",
  "star",
];

function iconFor(name: string | undefined, i: number): string {
  if (name && name in ICON_PATHS) return ICON_PATHS[name as IconName];
  return ICON_PATHS[FALLBACK_ICONS[i % FALLBACK_ICONS.length]!];
}

function statValue(s: { value: string; unit?: string }): string {
  return `${s.value ?? ""}${s.unit ?? ""}`;
}

export function SolutionProposalLayout({
  content,
  brand,
  mode,
  pageSize = "Letter",
  density = "standard",
  style,
}: {
  content: SolutionProposalContent;
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
  const line = mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(3,0,44,0.12)";
  const cardBg = mode === "dark" ? "rgba(255,255,255,0.05)" : "#F5F8FF";
  const rowAlt = mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(3,0,44,0.035)";

  const summaryRef = useRef<HTMLParagraphElement | null>(null);
  const timelineRef = useRef<HTMLParagraphElement | null>(null);
  useTextFit(summaryRef, content.summary ?? "", {
    min: 10,
    max: 13,
    base: 180,
    cap: 340,
    containerWidth: PAGE_W,
  });
  useTextFit(timelineRef, content.timelineNote ?? "", {
    min: 8.5,
    max: 10.5,
    base: 150,
    cap: 300,
    containerWidth: PAGE_W,
  });

  const included = (content.included ?? []).slice(0, 8);
  const sourceFiles = (content.sourceFiles ?? []).slice(0, 6);
  const deliverables = (content.deliverables ?? []).slice(0, 6);
  const costRows = (content.costRows ?? []).slice(0, 8);
  const stats = (content.stats ?? []).slice(0, 4);
  const team = (content.team ?? []).slice(0, 4);
  const nextSteps = (content.nextSteps ?? []).slice(0, 5);
  const pad = padCq(padX(density));

  const parties: Array<{ key: string; party: SolutionProposalContent["preparedFor"] }> = [
    { key: "for", party: content.preparedFor },
    { key: "by", party: content.preparedBy },
  ];

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
          {/* ---------- 1. MASTHEAD ---------- */}
          <div
            data-section="masthead"
            data-section-label="Proposal masthead"
            style={{
              paddingLeft: pad,
              paddingRight: pad,
              paddingTop: cq(28),
              paddingBottom: cq(18),
              borderBottom: `${cq(3)} solid ${accent}`,
            }}
          >
            <div className="flex items-center justify-between" style={{ gap: cq(18) }}>
              <BrandLockup
                brand={brand}
                color={mode === "dark" ? "#FFFFFF" : primary}
                size="sm"
                orientation="horizontal"
              />
              {content.clientLogoUrl ? (
                <img
                  src={content.clientLogoUrl}
                  alt={content.preparedFor?.company ? `${content.preparedFor.company} logo` : ""}
                  style={{
                    height: cq(30),
                    width: "auto",
                    maxWidth: cq(190),
                    objectFit: "contain",
                  }}
                />
              ) : null}
            </div>

            {content.eyebrow && (
              <div
                style={{
                  marginTop: cq(20),
                  fontSize: cq(9),
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: primary,
                }}
              >
                {content.eyebrow}
              </div>
            )}
            <h1
              style={{
                margin: `${cq(8)} 0 0`,
                fontSize: cq(34),
                lineHeight: 1.05,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: ink,
                ...clampLines(2),
              }}
            >
              {content.title || "Solutions proposal"}
            </h1>
            {content.subtitle && (
              <div
                style={{
                  marginTop: cq(6),
                  fontSize: cq(12),
                  fontWeight: 600,
                  color: primary,
                  ...clampLines(2),
                }}
              >
                {content.subtitle}
              </div>
            )}
            {content.summary && (
              <p
                ref={summaryRef}
                style={{
                  margin: `${cq(10)} 0 0`,
                  maxWidth: cq(620),
                  fontSize: cq(11),
                  lineHeight: 1.55,
                  color: inkSoft,
                }}
              >
                {content.summary}
              </p>
            )}
          </div>

          {/* ---------- 2. COVER BLOCK ---------- */}
          <div
            data-section="parties"
            data-section-label="Prepared for / by"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr auto",
              gap: cq(18),
              paddingLeft: pad,
              paddingRight: pad,
              paddingTop: cq(18),
            }}
          >
            {parties.map(({ key, party }, idx) => (
              <div key={key}>
                <div
                  style={{
                    fontSize: cq(8.5),
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: primary,
                  }}
                >
                  {party?.label || (idx === 0 ? "Prepared for:" : "Prepared by:")}
                </div>
                <div
                  style={{ marginTop: cq(6), fontSize: cq(11.5), fontWeight: 700, color: ink }}
                >
                  {party?.contact ?? ""}
                </div>
                {party?.role && (
                  <div style={{ fontSize: cq(9.5), color: inkSoft }}>{party.role}</div>
                )}
                {party?.company && (
                  <div style={{ marginTop: cq(4), fontSize: cq(10), fontWeight: 600, color: ink }}>
                    {party.company}
                  </div>
                )}
                {party?.address1 && (
                  <div style={{ fontSize: cq(9.5), color: inkSoft }}>{party.address1}</div>
                )}
                {party?.address2 && (
                  <div style={{ fontSize: cq(9.5), color: inkSoft }}>{party.address2}</div>
                )}
                {party?.email && (
                  <div style={{ fontSize: cq(9.5), color: inkSoft, wordBreak: "break-all" }}>
                    {party.email}
                  </div>
                )}
                {party?.phone && (
                  <div style={{ fontSize: cq(9.5), color: inkSoft }}>{party.phone}</div>
                )}
              </div>
            ))}
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: cq(8.5),
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: primary,
                }}
              >
                Date:
              </div>
              <div style={{ marginTop: cq(6), fontSize: cq(12), fontWeight: 700, color: ink }}>
                {content.dateLabel || ""}
              </div>
            </div>
          </div>

          {/* ---------- 3. SCOPE BAND ---------- */}
          <div
            data-section="scope"
            data-section-label="Scope & timeline"
            style={{ paddingLeft: pad, paddingRight: pad, paddingTop: cq(20) }}
          >
            {included.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: cq(13),
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                    color: ink,
                  }}
                >
                  {content.includedTitle || "What's included"}
                </div>
                <div
                  className="grid"
                  style={{
                    marginTop: cq(10),
                    gridTemplateColumns: `repeat(${Math.min(included.length, 4)}, minmax(0, 1fr))`,
                    gap: cq(10),
                  }}
                >
                  {included.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        borderRadius: cq(12),
                        border: `1px solid ${line}`,
                        background: cardBg,
                        padding: `${cq(12)} ${cq(10)}`,
                      }}
                    >
                      <EditableIcon
                        slot={`proposal.included.${i}`}
                        d={iconFor(item.icon, i)}
                        size={cq(18)}
                        color={primary}
                      />
                      <div
                        style={{
                          marginTop: cq(8),
                          fontSize: cq(10),
                          lineHeight: 1.35,
                          fontWeight: 700,
                          color: ink,
                          ...clampLines(2),
                        }}
                      >
                        {item.label}
                      </div>
                      {item.detail && (
                        <div
                          style={{
                            marginTop: cq(4),
                            fontSize: cq(8.5),
                            lineHeight: 1.4,
                            color: inkSoft,
                            ...clampLines(3),
                          }}
                        >
                          {item.detail}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div
              className="grid"
              style={{
                marginTop: cq(16),
                gridTemplateColumns: "1fr 1fr 1.4fr",
                gap: cq(12),
              }}
            >
              {[
                { title: content.sourceFilesTitle || "Source files", items: sourceFiles },
                { title: content.deliverablesTitle || "Deliverables", items: deliverables },
              ].map((col, i) => (
                <div
                  key={i}
                  style={{
                    borderTop: `1px solid ${line}`,
                    paddingTop: cq(10),
                  }}
                >
                  <div
                    style={{
                      fontSize: cq(8.5),
                      fontWeight: 700,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: primary,
                    }}
                  >
                    {col.title}
                  </div>
                  <ul style={{ margin: `${cq(8)} 0 0`, padding: 0, listStyle: "none" }}>
                    {col.items.map((v, j) => (
                      <li
                        key={j}
                        style={{
                          fontSize: cq(9.5),
                          lineHeight: 1.5,
                          color: ink,
                          ...clampLines(2),
                        }}
                      >
                        {v}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${line}`, paddingTop: cq(10) }}>
                <div
                  style={{
                    fontSize: cq(8.5),
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: primary,
                  }}
                >
                  {content.timelineTitle || "Timeline"}
                </div>
                <p
                  ref={timelineRef}
                  style={{
                    margin: `${cq(8)} 0 0`,
                    fontSize: cq(9.5),
                    lineHeight: 1.5,
                    color: inkSoft,
                  }}
                >
                  {content.timelineNote}
                </p>
              </div>
            </div>
          </div>

          {/* ---------- 4. COST SUMMARY + PROOF ---------- */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: stats.length || content.quote ? "1.6fr 1fr" : "1fr",
              gap: cq(18),
              alignItems: "start",
              paddingLeft: pad,
              paddingRight: pad,
              paddingTop: cq(20),
            }}
          >
            <div data-section="cost" data-section-label="Cost summary">
              <div
                style={{
                  borderTopLeftRadius: cq(12),
                  borderTopRightRadius: cq(12),
                  background: primary,
                  color: "#FFFFFF",
                  padding: `${cq(9)} ${cq(14)}`,
                  fontSize: cq(12),
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {content.costTitle || "Cost summary"}
              </div>
              <div style={{ border: `1px solid ${line}`, borderTop: "none" }}>
                {costRows.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 0.4fr 0.6fr",
                      borderTop: i === 0 ? "none" : `1px solid ${line}`,
                      background: i % 2 === 1 ? rowAlt : "transparent",
                      padding: `${cq(7)} ${cq(12)}`,
                      gap: cq(8),
                      alignItems: "baseline",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: cq(10), fontWeight: 700, color: ink }}>{r.item}</div>
                      {r.detail && (
                        <div style={{ fontSize: cq(8.5), color: inkSoft, ...clampLines(2) }}>
                          {r.detail}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: cq(9.5), color: inkSoft, textAlign: "center" }}>
                      {r.qty ?? ""}
                    </div>
                    <div
                      style={{
                        fontSize: cq(10.5),
                        fontWeight: 700,
                        color: ink,
                        textAlign: "right",
                      }}
                    >
                      {r.price ?? ""}
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    borderTop: `1px solid ${line}`,
                    background: cardBg,
                    padding: `${cq(9)} ${cq(12)}`,
                    alignItems: "baseline",
                    gap: cq(10),
                  }}
                >
                  <div
                    style={{
                      fontSize: cq(9),
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: primary,
                    }}
                  >
                    {content.costTotalLabel || "Total"}
                  </div>
                  <div style={{ fontSize: cq(16), fontWeight: 700, color: ink }}>
                    {content.costTotal ?? ""}
                  </div>
                </div>
              </div>
              {content.costNote && (
                <div
                  style={{
                    marginTop: cq(8),
                    fontSize: cq(8),
                    lineHeight: 1.45,
                    color: inkSoft,
                    ...clampLines(3),
                  }}
                >
                  {content.costNote}
                </div>
              )}
            </div>

            {(stats.length > 0 || content.quote) && (
              <div data-section="proof" data-section-label="Proof rail">
                {stats.length > 0 && (
                  <div
                    className="grid"
                    style={{ gridTemplateColumns: "1fr 1fr", gap: cq(10) }}
                  >
                    {stats.map((s, i) => (
                      <div
                        key={i}
                        style={{
                          borderRadius: cq(12),
                          border: `1px solid ${line}`,
                          padding: `${cq(10)} ${cq(8)}`,
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: cq(20),
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
                            marginTop: cq(4),
                            fontSize: cq(8),
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
                {content.quote?.text && (
                  <blockquote
                    style={{
                      margin: `${cq(12)} 0 0`,
                      borderLeft: `${cq(3)} solid ${accent}`,
                      paddingLeft: cq(12),
                    }}
                  >
                    <div
                      style={{
                        fontSize: cq(10),
                        lineHeight: 1.5,
                        fontStyle: "italic",
                        color: ink,
                        ...clampLines(5),
                      }}
                    >
                      “{content.quote.text}”
                    </div>
                    <div
                      style={{
                        marginTop: cq(6),
                        fontSize: cq(8.5),
                        fontWeight: 700,
                        color: primary,
                      }}
                    >
                      {[content.quote.author, content.quote.role, content.quote.company]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </blockquote>
                )}
              </div>
            )}
          </div>

          {/* ---------- 5. TEAM + NEXT STEPS ---------- */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: nextSteps.length ? "1.6fr 1fr" : "1fr",
              gap: cq(18),
              alignItems: "start",
              paddingLeft: pad,
              paddingRight: pad,
              paddingTop: cq(20),
            }}
          >
            {team.length > 0 && (
              <div data-section="team" data-section-label="Your team">
                <div
                  style={{
                    fontSize: cq(8.5),
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: primary,
                  }}
                >
                  {content.teamTitle || "Your team"}
                </div>
                <div
                  className="grid"
                  style={{
                    marginTop: cq(10),
                    gridTemplateColumns: `repeat(${Math.min(team.length, 3)}, minmax(0, 1fr))`,
                    gap: cq(10),
                  }}
                >
                  {team.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        borderTop: `${cq(2)} solid ${accent}`,
                        paddingTop: cq(8),
                      }}
                    >
                      <div style={{ fontSize: cq(10.5), fontWeight: 700, color: ink }}>
                        {m.name}
                      </div>
                      {m.role && (
                        <div style={{ fontSize: cq(9), color: inkSoft, ...clampLines(2) }}>
                          {m.role}
                        </div>
                      )}
                      {m.office && (
                        <div style={{ fontSize: cq(9), color: inkSoft }}>{m.office}</div>
                      )}
                      {m.email && (
                        <div
                          style={{ fontSize: cq(9), color: inkSoft, wordBreak: "break-all" }}
                        >
                          {m.email}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {nextSteps.length > 0 && (
              <div data-section="next-steps" data-section-label="Next steps">
                <div
                  style={{
                    fontSize: cq(8.5),
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: primary,
                  }}
                >
                  {content.nextStepsTitle || "Next steps"}
                </div>
                <ol
                  style={{
                    margin: `${cq(10)} 0 0`,
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: cq(6),
                  }}
                >
                  {nextSteps.map((s, i) => (
                    <li
                      key={i}
                      className="flex"
                      style={{ gap: cq(8), fontSize: cq(9.5), lineHeight: 1.45, color: ink }}
                    >
                      <span style={{ fontWeight: 700, color: primary }}>{i + 1}.</span>
                      <span style={clampLines(3)}>{s}</span>
                    </li>
                  ))}
                </ol>
                {content.contacts?.ctaLabel && (
                  <div
                    style={{ marginTop: cq(10), fontSize: cq(10), fontWeight: 700, color: primary }}
                  >
                    {content.contacts.ctaLabel}{" "}
                    <span style={{ color: ink, fontWeight: 600 }}>
                      {content.contacts.ctaEmail ?? ""}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SHARED MODULES */}
          <div style={{ paddingLeft: pad, paddingRight: pad }}>
            <PrintSectionsStack sections={content.modules} mode={mode} accent={accent} />
          </div>

          {/* ---------- 6. FOOTER RULE ---------- */}
          <div
            data-section="footer"
            data-section-label="Footer"
            className="flex items-center"
            style={{
              gap: cq(14),
              paddingLeft: pad,
              paddingRight: pad,
              paddingTop: cq(18),
              paddingBottom: cq(24),
              marginTop: "auto",
            }}
          >
            <div style={{ flex: 1, height: 1, background: line }} />
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
            <div style={{ flex: 1, height: 1, background: line }} />
          </div>
        </div>
      </SlideAccentContext.Provider>
    </SlideModeContext.Provider>
  );
}

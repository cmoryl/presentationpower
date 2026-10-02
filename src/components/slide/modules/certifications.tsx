// Credential proof split — architectural enterprise layout: an unframed
// programme statement on the left (heading, stat tiles, a ruled spec-sheet
// bullet block) and a staggered stack of credential cards on the right,
// each with an accent edge bar, ghost index numeral and badge well. Mode
// aware (light + dark), every string editable, PPTX-native export parity.

import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, s, strs, type Item } from "../module-kit";
import { ClientLogoImg, pickLogoForMode } from "../client-logo";
import { accentInk } from "@/lib/accent-tokens";
import { fillPx } from "@/lib/open-space-fill";
import { resolveCertStyle } from "@/lib/cert-style";
import { LoopHalo } from "./process";

const GLOWS = ["#7FB3F5", "#7FE3F5", "#C2A3FF"];

/** Thin ring whose arc runs exactly to the percentage. */
function PctRing({ pct, glow, uid }: { pct: number; glow: string; uid: string }) {
  const r = 40, C = 2 * Math.PI * r, v = Math.max(0, Math.min(100, pct));
  return (
    <svg aria-hidden data-decorative viewBox="0 0 100 100" width={104} height={104} style={{ flexShrink: 0, overflow: "visible" }}>
      <defs><linearGradient id={`pr-${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7FE3F5" /><stop offset="1" stopColor={glow} /></linearGradient></defs>
      <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" strokeDasharray="0.5 1.6" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={`url(#pr-${uid})`} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(v / 100) * C} ${C}`} transform="rotate(-90 50 50)" style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    </svg>
  );
}

const MAX_CERTS = 3;
const MAX_POINTS = 6;
const MAX_HIGHLIGHTS = 3;

/** Split "6% TECHNICAL FIELD PASS RATE" into a big figure + label. */
function splitStat(text: string): { figure: string; label: string } {
  const m = /^(\S+)\s+(.+)$/.exec(text.trim());
  if (m && /^[+\-–~$€£]?\d/.test(m[1])) return { figure: m[1], label: m[2] };
  return { figure: "", label: text.trim() };
}

registerSlideModule({
  id: "family:certifications",
  variantIds: ["MV-PROOF-CERT-ORBITS"],
  render: ({ brand, pageNumber, c, mode, ink, isDark }) => {
    const accent = accentInk(brand.tokens.accent, mode, 4.5);
    const st = resolveCertStyle(c.certStyle);
    const certs = arr(c.certs).slice(0, MAX_CERTS);
    const highlights = strs(c.cardHighlights).slice(0, MAX_HIGHLIGHTS).filter(Boolean);
    const points = strs(c.cardPoints).slice(0, MAX_POINTS).filter(Boolean);
    const dense = certs.length >= 3 || st.density === "compact";

    const hairline = isDark ? "rgba(255,255,255,0.14)" : "rgba(10,15,28,0.12)";
    const bandBg = st.band
      ? isDark
        ? "rgba(255,255,255,0.045)"
        : "rgba(3,0,44,0.03)"
      : "transparent";
    const cardBg =
      st.cardLook === "outline" ? "transparent" : isDark ? "rgba(255,255,255,0.07)" : "#FFFFFF";
    const cardBorder = isDark ? "rgba(255,255,255,0.16)" : "rgba(10,15,28,0.1)";
    const cardShadow =
      st.cardLook === "elevated"
        ? isDark
          ? "0 18px 40px -22px rgba(0,0,0,0.7)"
          : "0 18px 40px -24px rgba(3,0,44,0.25)"
        : "none";
    const tileBg =
      st.statTile === "tile"
        ? isDark
          ? "rgba(255,255,255,0.06)"
          : "rgba(3,0,44,0.045)"
        : "transparent";
    const ghostIdx = isDark ? "rgba(255,255,255,0.1)" : "rgba(3,0,44,0.08)";
    const muted = isDark ? "rgba(255,255,255,0.6)" : "rgba(3,0,44,0.62)";
    const cardsFirst = st.cardsSide === "left";
    // How loudly the accent runs: quiet keeps decorative marks neutral, strong
    // pushes the accent into the statement heading as well.
    const decoAccent = st.accentRole === "quiet" ? muted : accent;
    const headingColor = st.accentRole === "strong" ? accent : ink.strong;
    const badgeBox = Math.round((dense ? 70 : 82) * st.badgeScale);
    const centerHead = st.headerAlign === "center";

    return (
      <SlideFrame brand={brand} pageNumber={pageNumber}>
        <SlideTitle brand={brand} title={s(c.title)} />

        <div
          className="mt-10 grid min-h-0 flex-1 items-stretch"
          style={{
            gridTemplateColumns: cardsFirst
              ? `minmax(0, 1.08fr) minmax(0, ${st.split}fr)`
              : `minmax(0, ${st.split}fr) minmax(0, 1.08fr)`,
            gap: dense ? 44 : 56,
          }}
        >
          {/* ── Statement column (unframed) ── */}
          <div
            data-intro-item=""
            data-intro-step={1}
            className="flex min-w-0 flex-col"
            style={{ order: cardsFirst ? 2 : 1 }}
          >
            {s(c.cardTitle) && (
              <div
                style={{
                  fontSize: fillPx(44, "display"),
                  fontWeight: 800,
                  lineHeight: 1.08,
                  letterSpacing: "-0.03em",
                  color: headingColor,
                  textAlign: centerHead ? "center" : undefined,
                }}
              >
                {s(c.cardTitle)}
              </div>
            )}

            {highlights.length > 0 && (
              <div
                className="mt-8 flex"
                style={{
                  gap: 16,
                  flexDirection: st.statLayout === "stack" ? "column" : "row",
                }}
              >
                {highlights.map((h, i) => {
                  const { figure, label } = splitStat(h);
                  const pct = parseFloat(figure);
                  if (isDark && figure && /%$/.test(figure) && !Number.isNaN(pct)) {
                    const g = GLOWS[(i * 2) % 3];
                    return (
                      <div key={i} className="flex min-w-0 flex-1 items-center" style={{ gap: 20, padding: "18px 22px", borderRadius: 16, background: "linear-gradient(160deg, rgba(255,255,255,0.11), rgba(255,255,255,0.03))", border: "1px solid rgba(255,255,255,0.14)", borderBottom: `2px solid ${g}AA`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 18px 40px -26px ${g}` }}>
                        <div className="relative flex items-center justify-center" style={{ width: 104, height: 104, flexShrink: 0 }}>
                          <PctRing pct={pct} glow={g} uid={`cs-${i}`} />
                          <span className="absolute" style={{ fontSize: fillPx(30, "display"), fontWeight: 800, color: "#FFFFFF" }}>{figure}</span>
                        </div>
                        <span style={{ fontSize: fillPx(18, "body"), fontWeight: 700, lineHeight: 1.25, letterSpacing: "0.06em", textTransform: "uppercase", color: "#FFFFFF" }}>{label}</span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={i}
                      className="flex min-w-0 flex-1 flex-col justify-between"
                      style={{
                        background: tileBg,
                        borderLeft: st.statTile === "plain" ? undefined : `5px solid ${accent}`,
                        borderRadius: 4,
                        padding:
                          st.statTile === "plain"
                            ? "0 0 4px"
                            : st.statTile === "rule"
                              ? "2px 0 4px 18px"
                              : "18px 20px 16px",
                        gap: 8,
                        textAlign: st.statAlign === "center" ? "center" : undefined,
                        alignItems: st.statAlign === "center" ? "center" : undefined,
                      }}
                    >
                      {figure && (
                        <span
                          style={{
                            fontSize: fillPx(Math.round(40 * st.statSize), "display"),
                            fontWeight: 800,
                            lineHeight: 1,
                            letterSpacing: "-0.02em",
                            color: st.statFigureColor === "ink" ? ink.strong : accent,
                          }}
                        >
                          {figure}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: fillPx(19, "body"),
                          fontWeight: 700,
                          lineHeight: 1.25,
                          letterSpacing: st.statLabelCase === "upper" ? "0.04em" : "0",
                          textTransform: st.statLabelCase === "upper" ? "uppercase" : "none",
                          color: figure ? ink.strong : accent,
                        }}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Spec-sheet bullet block — ruled rows with accent markers */}
            {points.length > 0 && (
              <div className="mt-9 flex flex-col" style={{ borderTop: `2px solid ${ink.strong}` }}>
                <div
                  className="flex items-center justify-between"
                  style={{ padding: "12px 2px 0" }}
                >
                  <span
                    style={{
                      fontSize: fillPx(15, "body"),
                      fontWeight: 800,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      color: accent,
                    }}
                  >
                    {st.coversLabel}
                  </span>
                  <span
                    aria-hidden
                    data-decorative
                    style={{
                      fontSize: fillPx(15, "body"),
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      color: muted,
                    }}
                  >
                    {String(points.length).padStart(2, "0")} points
                  </span>
                </div>
                <ul className="mt-1 flex flex-col">
                  {points.map((pt, i) => (
                    <li
                      key={i}
                      className="flex items-center"
                      style={{
                        gap: 16,
                        padding: "13px 2px",
                        borderBottom: `1px solid ${hairline}`,
                      }}
                    >
                      <span
                        aria-hidden
                        data-decorative
                        style={{
                          width: 4,
                          alignSelf: "stretch",
                          borderRadius: 2,
                          background: isDark ? `linear-gradient(180deg, ${GLOWS[i % 3]}, ${GLOWS[(i + 1) % 3]})` : decoAccent,
                          boxShadow: isDark ? `0 0 10px ${GLOWS[i % 3]}88` : undefined,
                          flexShrink: 0,
                        }}
                      />
                      {st.numberedPoints &&
                        st.pointMarker !== "none" &&
                        (st.pointMarker === "number" ? (
                          <span
                            aria-hidden
                            data-decorative
                            style={{
                              fontSize: fillPx(17, "body"),
                              fontWeight: 700,
                              fontVariantNumeric: "tabular-nums",
                              letterSpacing: "0.06em",
                              color: muted,
                              width: 30,
                              flexShrink: 0,
                            }}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        ) : st.pointMarker === "dash" ? (
                          <span
                            aria-hidden
                            data-decorative
                            style={{
                              width: 18,
                              height: 2,
                              borderRadius: 1,
                              background: decoAccent,
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <span
                            aria-hidden
                            data-decorative
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: decoAccent,
                              flexShrink: 0,
                            }}
                          />
                        ))}

                      <span
                        style={{
                          fontSize: fillPx(25, "body"),
                          lineHeight: 1.26,
                          color: ink.body,
                        }}
                      >
                        {pt}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── Credential cards on a quiet band ── */}
          <div
            data-intro-item=""
            data-intro-step={2}
            className="relative flex min-w-0 flex-col justify-center"
            style={{
              background: bandBg,
              borderRadius: 8,
              padding: dense ? "26px 30px" : "34px 38px",
              overflow: "hidden",
              order: cardsFirst ? 1 : 2,
            }}
          >
            {/* decorative quarter arcs */}
            {st.showArcs && (
              <>
                <div
                  aria-hidden
                  data-decorative
                  style={{
                    position: "absolute",
                    right: -90,
                    bottom: -90,
                    width: 260,
                    height: 260,
                    borderRadius: "50%",
                    border: `1.5px solid ${hairline}`,
                    pointerEvents: "none",
                  }}
                />
                <div
                  aria-hidden
                  data-decorative
                  style={{
                    position: "absolute",
                    right: -40,
                    bottom: -40,
                    width: 160,
                    height: 160,
                    borderRadius: "50%",
                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(3,63,199,0.06)",
                    pointerEvents: "none",
                  }}
                />
              </>
            )}

            <div className="relative flex min-w-0 flex-col" style={{ gap: dense ? 16 : 22 }}>
              {certs.map((cert: Item, i) => {
                const bullets = strs(cert.points).slice(0, MAX_POINTS).filter(Boolean);
                const url = pickLogoForMode(cert, mode);
                const path = s(cert.logoPath);
                const indent = st.stagger * i;
                const g = GLOWS[i % 3];
                return (
                  <div
                    key={i}
                    data-intro-item=""
                    data-intro-step={3 + i}
                    className="relative flex min-w-0 items-start"
                    style={{
                      background: isDark ? "linear-gradient(160deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))" : cardBg,
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : cardBorder}`,
                      borderLeft: isDark ? undefined : st.accentBar > 0 ? `${st.accentBar}px solid ${accent}` : undefined,
                      borderBottom: isDark ? `2px solid ${g}AA` : undefined,
                      borderRadius: isDark ? 16 : st.cardRadius,
                      boxShadow: isDark ? `inset 0 1px 0 rgba(255,255,255,0.2), 0 20px 44px -28px ${g}` : cardShadow,
                      backdropFilter: isDark ? "blur(16px)" : undefined,
                      alignItems: isDark ? "center" : undefined,
                      gap: 22,
                      padding: dense ? "20px 26px" : "26px 30px",
                      marginLeft: cardsFirst ? 0 : indent,
                      marginRight: cardsFirst ? indent : 0,
                    }}
                  >
                    {/* ghost index numeral */}
                    {isDark && (
                      <div aria-hidden data-decorative className="relative flex shrink-0 items-center justify-center" style={{ width: 78, height: 78, marginRight: 4 }}>
                        <LoopHalo uid={`cert-${i}`} slim small />
                        <span className="relative flex items-center justify-center" style={{ width: 58, height: 58, borderRadius: 999, background: `radial-gradient(circle at 35% 30%, ${g}55, rgba(11,16,48,0.92) 70%)`, border: "1px solid rgba(255,255,255,0.3)", color: "#FFFFFF", fontSize: 22, fontWeight: 800 }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>
                    )}
                    {st.showIndex && !isDark && (
                      <span
                        aria-hidden
                        data-decorative
                        style={{
                          position: "absolute",
                          top: 10,
                          right: 18,
                          fontSize: fillPx(44, "display"),
                          fontWeight: 800,
                          lineHeight: 1,
                          letterSpacing: "-0.02em",
                          color: ghostIdx,
                          pointerEvents: "none",
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    )}

                    {(url || path) && (
                      <div
                        className="flex shrink-0 items-center justify-center"
                        style={{
                          width: badgeBox,
                          height: badgeBox,
                          borderRadius: st.badge === "round" ? "50%" : 6,
                          background: st.badge === "none" ? "transparent" : "#FFFFFF",
                          border:
                            st.badge === "none"
                              ? undefined
                              : `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(10,15,28,0.1)"}`,
                        }}
                      >
                        <ClientLogoImg
                          url={url}
                          path={path}
                          alt={`${s(cert.label)} badge`}
                          className="object-contain"
                          style={{
                            maxWidth: "74%",
                            maxHeight: "74%",
                            filter:
                              st.logoTone === "mono"
                                ? isDark
                                  ? "grayscale(1) brightness(2.4)"
                                  : "grayscale(1) contrast(1.15)"
                                : undefined,
                          }}
                        />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      {s(cert.label) && (
                        <div
                          style={{
                            fontSize: fillPx(dense ? 27 : 30, "body"),
                            fontWeight: 800,
                            lineHeight: 1.14,
                            letterSpacing: "-0.01em",
                            color: ink.strong,
                          }}
                        >
                          {s(cert.label)}
                        </div>
                      )}
                      {bullets.length > 0 && (
                        <ul className="mt-3 flex flex-col" style={{ gap: 6 }}>
                          {bullets.map((b, k) => (
                            <li key={k} className="flex items-baseline" style={{ gap: 12 }}>
                              <span
                                aria-hidden
                                data-decorative
                                style={{
                                  width: 14,
                                  height: 2,
                                  borderRadius: 1,
                                  background: isDark ? g : accent,
                                  flexShrink: 0,
                                  transform: "translateY(-5px)",
                                }}
                              />
                              <span
                                style={{
                                  fontSize: fillPx(dense ? 21 : 23, "body"),
                                  lineHeight: 1.28,
                                  color: ink.body,
                                }}
                              >
                                {b}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SlideFrame>
    );
  },
});

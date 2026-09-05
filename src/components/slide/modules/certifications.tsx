// Credential proof split — house-style two-column module: an unframed programme
// statement on the left (heading, emphasised headline figures, bullet list) and
// a stack of standard module cards on the right, one per credential, each with
// its badge, heading and bullet points. Mode aware (light + dark), every string
// editable, and it uses the shared card surface + accent tick rather than a
// bespoke white panel or circular rings.

import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, s, strs, type Item } from "../module-kit";
import { ClientLogoImg, pickLogoForMode } from "../client-logo";
import { moduleCardSurface, AccentTick } from "../flagship";
import { accentInk } from "@/lib/accent-tokens";
import { fillPx } from "@/lib/open-space-fill";

const MAX_CERTS = 3;
const MAX_POINTS = 6;
const MAX_HIGHLIGHTS = 3;

registerSlideModule({
  id: "family:certifications",
  variantIds: ["MV-PROOF-CERT-ORBITS"],
  render: ({ brand, pageNumber, c, mode, ink, isDark }) => {
    const accent = accentInk(brand.tokens.accent, mode, 4.5);
    const certs = arr(c.certs).slice(0, MAX_CERTS);
    const highlights = strs(c.cardHighlights).slice(0, MAX_HIGHLIGHTS).filter(Boolean);
    const points = strs(c.cardPoints).slice(0, MAX_POINTS).filter(Boolean);
    const cardStyle = moduleCardSurface(brand.tokens.accent, isDark ? "dark" : "light", {
      radius: 22,
    });
    const dense = certs.length >= 3;

    return (
      <SlideFrame brand={brand} pageNumber={pageNumber}>
        <SlideTitle brand={brand} title={s(c.title)} />

        <div
          className="mt-10 grid min-h-0 flex-1 items-start"
          style={{ gridTemplateColumns: "minmax(0, 0.92fr) minmax(0, 1.08fr)", gap: 56 }}
        >
          {/* ── Left: programme statement (unframed) ── */}
          <div data-intro-item="" data-intro-step={1} className="flex min-w-0 flex-col">
            {s(c.cardTitle) && (
              <div
                style={{
                  fontSize: fillPx(44, "display"),
                  fontWeight: 800,
                  lineHeight: 1.08,
                  letterSpacing: "-0.03em",
                  color: ink.strong,
                }}
              >
                {s(c.cardTitle)}
              </div>
            )}

            {highlights.length > 0 && (
              <div className="mt-7 flex flex-col" style={{ gap: 8 }}>
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-center" style={{ gap: 14 }}>
                    <span
                      aria-hidden
                      data-decorative
                      style={{ width: 28, height: 3, borderRadius: 2, background: accent }}
                    />
                    <span
                      style={{
                        fontSize: fillPx(27, "body"),
                        fontWeight: 800,
                        lineHeight: 1.2,
                        letterSpacing: "0.01em",
                        textTransform: "uppercase",
                        color: accent,
                      }}
                    >
                      {h}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {points.length > 0 && (
              <ul className="mt-8 flex flex-col" style={{ gap: 15 }}>
                {points.map((pt, i) => (
                  <li key={i} className="flex items-baseline" style={{ gap: 14 }}>
                    <span aria-hidden data-decorative style={{ color: accent, fontSize: 22 }}>
                      •
                    </span>
                    <span
                      style={{ fontSize: fillPx(26, "body"), lineHeight: 1.26, color: ink.body }}
                    >
                      {pt}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Right: credential cards ── */}
          <div className="flex min-w-0 flex-col" style={{ gap: dense ? 18 : 24 }}>
            {certs.map((cert: Item, i) => {
              const bullets = strs(cert.points).slice(0, MAX_POINTS).filter(Boolean);
              const url = pickLogoForMode(cert, mode);
              const path = s(cert.logoPath);
              return (
                <div
                  key={i}
                  data-intro-item=""
                  data-intro-step={2 + i}
                  className="flex min-w-0 items-start"
                  style={{ ...cardStyle, gap: 24, padding: dense ? "24px 28px" : "30px 32px" }}
                >
                  <AccentTick accent={accent} height={3} radius={22} />

                  {(url || path) && (
                    <div
                      className="flex shrink-0 items-center justify-center rounded-[14px]"
                      style={{
                        width: dense ? 74 : 86,
                        height: dense ? 74 : 86,
                        background: "#FFFFFF",
                        border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(10,15,28,0.1)"}`,
                      }}
                    >
                      <ClientLogoImg
                        url={url}
                        path={path}
                        alt={`${s(cert.label)} badge`}
                        className="object-contain"
                        style={{ maxWidth: "74%", maxHeight: "74%" }}
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
                      <ul className="mt-3 flex flex-col" style={{ gap: 7 }}>
                        {bullets.map((b, k) => (
                          <li key={k} className="flex items-baseline" style={{ gap: 10 }}>
                            <span
                              aria-hidden
                              data-decorative
                              style={{ color: accent, fontSize: 15, lineHeight: 1.2 }}
                            >
                              •
                            </span>
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
      </SlideFrame>
    );
  },
});

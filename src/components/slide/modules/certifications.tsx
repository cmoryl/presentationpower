// Credential proof split — a two-panel module: on the left a raised card that
// carries a programme name, emphasised headline figures and a bullet list; on
// the right up to three credentials, each set inside a hairline orbit ring with
// its own badge, heading and bullet points. Mode aware (light + dark) and every
// string is editable.

import { registerSlideModule } from "../module-registry";
import { SlideFrame, arr, s, strs, type Item } from "../module-kit";
import { ClientLogoImg, pickLogoForMode } from "../client-logo";
import { accentInk } from "@/lib/accent-tokens";
import { fillPx } from "@/lib/open-space-fill";
import { resolveOrbitFace } from "@/lib/orbit-style";
import { OrbitRing } from "./growth-orbits";

const MAX_CERTS = 3;
const MAX_POINTS = 6;
const MAX_HIGHLIGHTS = 3;

/** Staggered credential placement — percentages of the right-hand stage. */
const CERT_LAYOUT: Record<number, Array<{ x: number; y: number; size: number }>> = {
  1: [{ x: 50, y: 50, size: 1.1 }],
  2: [
    { x: 36, y: 32, size: 1 },
    { x: 66, y: 74, size: 1 },
  ],
  3: [
    { x: 34, y: 40, size: 0.98 },
    { x: 72, y: 17, size: 0.94 },
    { x: 70, y: 78, size: 0.94 },
  ],
};

function certPlacement(index: number, count: number) {
  const list = CERT_LAYOUT[Math.min(Math.max(count, 1), 3)] ?? CERT_LAYOUT[3]!;
  return list[index] ?? { x: 50, y: 50, size: 1 };
}

registerSlideModule({
  id: "family:certifications",
  variantIds: ["MV-PROOF-CERT-ORBITS"],
  render: ({ brand, pageNumber, c, mode, ink, isDark, bareSurfaces }) => {
    const accent = accentInk(brand.tokens.accent, mode, 4.5);
    const certs = arr(c.certs).slice(0, MAX_CERTS);
    const highlights = strs(c.cardHighlights).slice(0, MAX_HIGHLIGHTS).filter(Boolean);
    const points = strs(c.cardPoints).slice(0, MAX_POINTS).filter(Boolean);
    const ringFace = resolveOrbitFace(c.orbitStyle, mode === "dark" ? "dark" : "light");

    // On a dark ground the card is the one bright plane on the slide; on light
    // it stays a quiet raised surface so the credentials keep the emphasis.
    const cardBg = bareSurfaces ? "transparent" : isDark ? "#FFFFFF" : "#FFFFFF";
    const cardRing = bareSurfaces
      ? ink.hairline
      : isDark
        ? "rgba(255,255,255,0.16)"
        : "rgba(10,15,28,0.08)";
    const cardStrong = bareSurfaces ? ink.strong : "#03002C";
    const cardBody = bareSurfaces ? ink.body : "rgba(3,0,44,0.72)";
    const cardAccent = bareSurfaces ? accent : accentInk(brand.tokens.accent, "light", 4.5);
    const ringSize = certs.length >= 3 ? 400 : certs.length === 2 ? 440 : 480;

    return (
      <SlideFrame brand={brand} pageNumber={pageNumber}>
        <div className="flex h-full flex-col">
          <div
            data-intro-item=""
            data-intro-step={0}
            style={{
              fontSize: fillPx(72, "display"),
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              color: ink.strong,
            }}
          >
            {s(c.title)}
          </div>

          <div
            className="mt-8 grid min-h-0 flex-1 items-stretch"
            style={{ gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)", gap: 56 }}
          >
            {/* ── Left: programme card ── */}
            <div
              data-intro-item=""
              data-intro-step={1}
              className="flex min-w-0 flex-col justify-center rounded-[28px]"
              style={{
                background: cardBg,
                border: `1px solid ${cardRing}`,
                padding: "56px 52px",
                boxShadow: bareSurfaces ? "none" : "0 24px 60px rgba(3,0,44,0.16)",
              }}
            >
              {s(c.cardTitle) && (
                <div
                  style={{
                    fontSize: fillPx(46, "display"),
                    fontWeight: 800,
                    lineHeight: 1.08,
                    letterSpacing: "-0.03em",
                    color: cardStrong,
                  }}
                >
                  {s(c.cardTitle)}
                </div>
              )}

              {highlights.length > 0 && (
                <div className="mt-8 flex flex-col" style={{ gap: 6 }}>
                  {highlights.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: fillPx(28, "body"),
                        fontWeight: 800,
                        lineHeight: 1.2,
                        letterSpacing: "0.01em",
                        textTransform: "uppercase",
                        color: cardAccent,
                      }}
                    >
                      {h}
                    </div>
                  ))}
                </div>
              )}

              {points.length > 0 && (
                <ul className="mt-9 flex flex-col" style={{ gap: 16 }}>
                  {points.map((pt, i) => (
                    <li key={i} className="flex items-baseline" style={{ gap: 14 }}>
                      <span aria-hidden data-decorative style={{ color: cardAccent, fontSize: 24 }}>
                        •
                      </span>
                      <span
                        style={{
                          fontSize: fillPx(27, "body"),
                          lineHeight: 1.24,
                          color: cardBody,
                        }}
                      >
                        {pt}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ── Right: credential orbits ── */}
            <div className="relative min-w-0" style={{ minHeight: ringSize }}>
              {certs.map((cert: Item, i) => {
                const pos = certPlacement(i, certs.length);
                const size = Math.round(ringSize * pos.size);
                const bullets = strs(cert.points).slice(0, MAX_POINTS).filter(Boolean);
                const url = pickLogoForMode(cert, mode);
                const path = s(cert.logoPath);
                return (
                  <div
                    key={i}
                    data-intro-item=""
                    data-intro-step={2 + i}
                    className="absolute"
                    style={{
                      width: size,
                      height: size,
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <OrbitRing accent={accent} size={size} face={ringFace} />

                    {(url || path) && (
                      <div
                        className="absolute flex items-center justify-center rounded-full"
                        style={{
                          width: Math.round(size * 0.2),
                          height: Math.round(size * 0.2),
                          left: 0,
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          background: "#FFFFFF",
                          border: `1px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(10,15,28,0.1)"}`,
                        }}
                      >
                        <ClientLogoImg
                          url={url}
                          path={path}
                          alt={`${s(cert.label)} badge`}
                          className="object-contain"
                          style={{ maxWidth: "72%", maxHeight: "72%" }}
                        />
                      </div>
                    )}

                    <div className="absolute inset-[12%] flex flex-col justify-center">
                      {s(cert.label) && (
                        <div
                          style={{
                            fontSize: fillPx(28, "body"),
                            fontWeight: 800,
                            lineHeight: 1.14,
                            letterSpacing: "-0.01em",
                            color: ink.strong,
                            textAlign: "center",
                          }}
                        >
                          {s(cert.label)}
                        </div>
                      )}
                      {bullets.length > 0 && (
                        <ul className="mt-3 flex flex-col" style={{ gap: 6 }}>
                          {bullets.map((b, k) => (
                            <li key={k} className="flex items-baseline" style={{ gap: 8 }}>
                              <span
                                aria-hidden
                                data-decorative
                                style={{ color: accent, fontSize: 16, lineHeight: 1.2 }}
                              >
                                •
                              </span>
                              <span
                                style={{
                                  fontSize: fillPx(21, "body"),
                                  lineHeight: 1.24,
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

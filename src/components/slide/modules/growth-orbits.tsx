// Growth proof split — a two-panel module: on the left an acquisitions logo
// wall plus a numbered growth stat list, on the right up to three headline
// percentage figures set inside hairline orbit rings. Both halves are mode
// aware (light + dark) and every string is editable.

import { registerSlideModule } from "../module-registry";
import { SlideFrame, arr, s, type Item } from "../module-kit";
import { ClientLogoImg, pickLogoForMode } from "../client-logo";
import { Kicker } from "../primitives";
import { accentInk } from "@/lib/accent-tokens";
import { fillPx } from "@/lib/open-space-fill";
import { formatStatValue } from "@/lib/stat-format";
import { orbitBaseSize, resolveOrbitLayout } from "@/lib/orbit-layout";
import {
  orbitDotColor,
  orbitRingColor,
  resolveOrbitFace,
  type OrbitFaceStyle,
} from "@/lib/orbit-style";
import {
  MAX_WALL_LOGOS,
  resolveLogoWall,
  wallLogoMaxHeight,
  wallLogoMaxWidth,
} from "@/lib/logo-wall";

const MAX_ORBITS = 3;
const MAX_GROWTH = 4;
const MAX_LOGOS = MAX_WALL_LOGOS;

/** Hairline orbit ring: one full circle plus an offset arc with end nodes. */
export function OrbitRing({
  accent,
  size,
  face,
}: {
  accent: string;
  size: number;
  face: OrbitFaceStyle;
}) {
  const nodes = [
    { top: "10%", left: "8%" },
    { top: "50%", left: "-1%" },
    { top: "88%", left: "22%" },
    { top: "22%", left: "94%" },
    { top: "74%", left: "92%" },
  ];
  const ring = orbitRingColor(face, accent);
  const dot = orbitDotColor(face, accent);
  const alpha = face.ringOpacity / 100;
  // The SVG arcs live in a 100-unit box, so translate the px weight to units.
  const arcWidth = Math.max(0.4, (face.ringWidth / Math.max(size, 1)) * 100);
  const dotPx = Math.max(0, Math.round(face.dotSize * 0.75 + size * 0.008));
  return (
    <>
      <div
        aria-hidden
        data-decorative
        className="absolute inset-0 rounded-full"
        style={{
          border: `${face.ringWidth}px solid color-mix(in oklab, ${ring} ${face.ringOpacity}%, transparent)`,
        }}
      />
      <svg
        aria-hidden
        data-decorative
        className="absolute"
        style={{ inset: "-7%" }}
        viewBox="0 0 100 100"
        fill="none"
      >
        <path
          d="M 92 28 A 46 46 0 0 1 66 93"
          stroke={ring}
          strokeOpacity={Math.min(1, alpha * 1.5)}
          strokeWidth={arcWidth}
          strokeLinecap="round"
        />
        <path
          d="M 10 72 A 46 46 0 0 1 26 12"
          stroke={ring}
          strokeOpacity={alpha}
          strokeWidth={arcWidth}
          strokeLinecap="round"
        />
      </svg>
      {face.dotStyle !== "none" &&
        dotPx > 0 &&
        nodes.map((pos, i) => (
          <div
            key={i}
            aria-hidden
            data-decorative
            className={face.dotStyle === "square" ? "absolute" : "absolute rounded-full"}
            style={{
              ...pos,
              width: dotPx,
              height: dotPx,
              transform: "translate(-50%, -50%)",
              backgroundColor: face.dotStyle === "hollow" ? "transparent" : dot,
              border: face.dotStyle === "hollow" ? `${face.ringWidth}px solid ${dot}` : undefined,
            }}
          />
        ))}
    </>
  );
}


registerSlideModule({
  id: "family:growth-orbits",
  variantIds: ["MV-PROOF-GROWTH-ORBITS"],
  render: ({ brand, pageNumber, c, mode, ink, isDark, bareSurfaces }) => {
    const accent = accentInk(brand.tokens.accent, mode, 4.5);
    const logos = arr(c.items).slice(0, MAX_LOGOS);
    const growth = arr(c.growth).slice(0, MAX_GROWTH);
    const orbits = arr(c.orbits).slice(0, MAX_ORBITS);
    const wall = resolveLogoWall(c.logoWall);
    // Ring colour, weight and dot treatment are authored per face.
    const ringFace = resolveOrbitFace(c.orbitStyle, mode === "dark" ? "dark" : "light");


    const tileBg = bareSurfaces ? "transparent" : isDark ? "#FFFFFF" : "rgba(10,15,28,0.02)";
    const tileRing = bareSurfaces
      ? "transparent"
      : isDark
        ? "rgba(255,255,255,0.10)"
        : "rgba(10,15,28,0.08)";

    // Ring size shrinks as the count grows so three still clear each other and
    // the whole stack stays inside the 1080px frame under the headline.
    const ringSize = orbitBaseSize(orbits.length);
    const positions = resolveOrbitLayout(orbits);


    return (
      <SlideFrame brand={brand} pageNumber={pageNumber}>
        <div className="grid h-full grid-cols-2 items-start" style={{ gap: 64 }}>
          {/* ── Left panel: heading, acquisitions wall, growth stats ── */}
          <div className="flex min-w-0 flex-col">
            <div
              data-intro-item=""
              data-intro-step={0}
              style={{
                fontSize: fillPx(74, "display"),
                fontWeight: 800,
                lineHeight: 1.02,
                letterSpacing: "-0.04em",
                color: ink.strong,
              }}
            >
              {s(c.title)}
            </div>
            {s(c.subtitle) && (
              <div
                className="mt-4"
                style={{
                  fontSize: fillPx(30, "body"),
                  lineHeight: 1.3,
                  color: ink.body,
                  maxWidth: 560,
                }}
              >
                {s(c.subtitle)}
              </div>
            )}

            {logos.length > 0 && (
              <div className="mt-10" data-intro-item="" data-intro-step={1}>
                {s(c.logosLabel) && <Kicker brand={brand}>{s(c.logosLabel)}</Kicker>}
                <div
                  className="mt-4 grid"
                  style={{
                    gap: wall.gap,
                    gridTemplateColumns: `repeat(${wall.columns}, minmax(0, 1fr))`,
                  }}
                >
                  {logos.map((it: Item, i) => {
                    const url = pickLogoForMode(it, mode);
                    const path = s(it.logoPath);
                    const name = s(it.name ?? it.client);
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-center overflow-hidden rounded-xl px-3"
                        style={{
                          aspectRatio: "16 / 7",
                          background: tileBg,
                          border: `1px solid ${tileRing}`,
                        }}
                      >
                        {url || path ? (
                          <ClientLogoImg
                            url={url}
                            path={path}
                            alt={`${name} logo`}
                            className="object-contain"
                            style={{
                              maxHeight: wallLogoMaxHeight(wall.scale),
                              maxWidth: wallLogoMaxWidth(wall.scale),
                            }}
                          />
                        ) : (
                          <div
                            className="truncate text-center"
                            style={{
                              fontSize: fillPx(18, "body"),
                              fontWeight: 700,
                              color: isDark ? "#03002C" : ink.strong,
                            }}
                          >
                            {name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {growth.length > 0 && (
              <div className="mt-10" data-intro-item="" data-intro-step={2}>
                {s(c.growthLabel) && <Kicker brand={brand}>{s(c.growthLabel)}</Kicker>}
                <div className="mt-4 flex flex-col" style={{ gap: 18 }}>
                  {growth.map((g: Item, i) => (
                    <div key={i} className="flex items-baseline" style={{ gap: 22 }}>
                      <div
                        className="shrink-0 text-right"
                        style={{
                          minWidth: 96,
                          fontSize: fillPx(50, "display"),
                          fontWeight: 800,
                          lineHeight: 1,
                          letterSpacing: "-0.04em",
                          color: ink.strong,
                        }}
                      >
                        {formatStatValue(g.value, g)}
                      </div>
                      <div className="min-w-0">
                        <div
                          style={{
                            fontSize: fillPx(24, "body"),
                            fontWeight: 700,
                            lineHeight: 1.22,
                            color: ink.strong,
                          }}
                        >
                          {s(g.label)}
                        </div>
                        {s(g.body) && (
                          <div
                            style={{
                              fontSize: fillPx(21, "body"),
                              lineHeight: 1.28,
                              color: ink.body,
                            }}
                          >
                            {s(g.body)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right panel: headline + orbit percentage figures ── */}
          <div className="flex min-w-0 flex-col">
            {s(c.statsTitle) && (
              <div
                data-intro-item=""
                data-intro-step={3}
                style={{
                  fontSize: fillPx(64, "display"),
                  fontWeight: 800,
                  lineHeight: 1.04,
                  letterSpacing: "-0.04em",
                  color: ink.strong,
                }}
              >
                {s(c.statsTitle)}
                {s(c.statsEmphasis) && (
                  <span
                    style={{
                      color: accent,
                      fontStyle: "italic",
                      fontWeight: 700,
                      marginLeft: "0.35em",
                    }}
                  >
                    {s(c.statsEmphasis)}
                  </span>
                )}
              </div>
            )}
            <div className="relative mt-8 w-full flex-1" style={{ minHeight: ringSize + 40 }}>
              {orbits.map((o: Item, i) => {
                const pos = positions[i]!;
                const size = Math.round(ringSize * pos.size);
                return (
                <div
                  key={i}
                  data-intro-item=""
                  data-intro-step={4 + i}
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
                  <div className="absolute inset-[9%] flex flex-col items-center justify-center text-center">

                    {s(o.label) && (
                      <div
                        style={{
                          fontSize: fillPx(22, "body"),
                          fontWeight: 800,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          lineHeight: 1.15,
                          color: accent,
                        }}
                      >
                        {s(o.label)}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: Math.round(size * 0.33),
                        fontWeight: 800,
                        lineHeight: 1,
                        letterSpacing: "-0.05em",
                        color: ink.strong,
                      }}
                    >
                      {formatStatValue(o.value, o)}
                    </div>
                    {s(o.body) && (
                      <div
                        className="mt-1"
                        style={{
                          fontSize: fillPx(19, "body"),
                          lineHeight: 1.26,
                          color: ink.body,
                          maxWidth: "84%",
                        }}
                      >
                        {s(o.body)}
                      </div>
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

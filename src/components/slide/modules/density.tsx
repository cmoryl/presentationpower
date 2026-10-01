// Density family — designs built for content-heavy slides so a dense source
// slide still gets a styled layout instead of falling back to plain text.
// MV-STAT-PROOF-BOARD: hero results + compact scale rail.
// MV-LOC-CITY-DIRECTORY: region title, count figure, multi-column city list.

import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, s } from "../module-kit";
import { StatFigure } from "../primitives";
import { fillPx } from "@/lib/open-space-fill";
import { hexA } from "@/lib/accent-tokens";

function Ring({ pct, color, track }: { pct: number; color: string; track: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <svg viewBox="0 0 100 100" width={64} height={64} aria-hidden className="shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke={track} strokeWidth="7" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(p / 100) * c} ${c}`}
        transform="rotate(-90 50 50)"
      />
    </svg>
  );
}

/** Column count + type size for a list of `n` short entries on one slide. */
export function cityDirectoryPlan(n: number): { cols: number; px: number } {
  if (n <= 6) return { cols: 1, px: 34 };
  if (n <= 12) return { cols: 2, px: 30 };
  if (n <= 30) return { cols: 3, px: 24 };
  if (n <= 60) return { cols: 4, px: 20 };
  return { cols: 5, px: 18 };
}

registerSlideModule({
  id: "family:density",
  variantIds: ["MV-STAT-PROOF-BOARD", "MV-LOC-CITY-DIRECTORY"],
  render: ({ variant, brand, pageNumber, c, ink, isDark }) => {
    const accent = brand.tokens.accent;
    switch (variant.id) {
      case "MV-STAT-PROOF-BOARD": {
        const hero = arr(c.hero).slice(0, 4);
        const items = arr(c.items).slice(0, 8);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
            <div className="mt-10 grid flex-1 grid-cols-[1.35fr_1fr] gap-14">
              <section className="flex flex-col">
                {(s(c.brandLabel) || s(c.tagline)) && (
                  <div className="mb-6 flex items-baseline gap-4">
                    {s(c.brandLabel) && (
                      <span style={{ fontSize: fillPx(30, "body"), fontWeight: 700, color: ink.strong }}>
                        {s(c.brandLabel)}
                      </span>
                    )}
                    {s(c.tagline) && (
                      <span style={{ fontSize: fillPx(18, "body"), color: ink.muted }}>{s(c.tagline)}</span>
                    )}
                  </div>
                )}
                <div className="grid flex-1 grid-cols-2 gap-6">
                  {hero.map((it, i) => {
                    const pct = s(it.unit) === "%" ? Number(s(it.value)) : NaN;
                    return (
                      <div
                        key={i}
                        className="flex flex-col justify-between rounded-2xl p-7"
                        style={{
                          background: isDark ? "rgba(255,255,255,0.05)" : hexA(accent, 0.05),
                          border: `1px solid ${ink.hairline}`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <StatFigure
                            brand={brand}
                            value={s(it.value)}
                            unit={s(it.unit)}
                            size="lg"
                            valueStyle="gradient"
                            unitColor={isDark ? ink.strong : accent}
                          />
                          {Number.isFinite(pct) && (
                            <Ring pct={pct} color={accent} track={ink.hairline} />
                          )}
                        </div>
                        <div
                          className="mt-4"
                          style={{ fontSize: fillPx(19, "body"), lineHeight: 1.35, color: ink.body, fontWeight: 500 }}
                        >
                          {s(it.label)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
              <section
                className="flex flex-col justify-center"
                style={{ borderLeft: `1px solid ${ink.hairline}`, paddingLeft: 40 }}
              >
                {items.map((it, i) => (
                  <div
                    key={i}
                    className="flex items-baseline gap-5 py-4"
                    style={{ borderTop: i ? `1px solid ${ink.hairline}` : undefined }}
                  >
                    <span
                      className="tabular-nums"
                      style={{
                        fontSize: fillPx(44, "body"),
                        fontWeight: 700,
                        color: ink.strong,
                        minWidth: 190,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s(it.value)}
                      {s(it.unit) && <span style={{ color: isDark ? ink.strong : accent }}>{s(it.unit)}</span>}
                    </span>
                    <span style={{ fontSize: fillPx(18, "body"), color: ink.muted, lineHeight: 1.3 }}>
                      {s(it.label)}
                    </span>
                  </div>
                ))}
              </section>
            </div>
          </SlideFrame>
        );
      }

      case "MV-LOC-CITY-DIRECTORY": {
        const cities = arr(c.items).map((it) => s(it.city)).filter(Boolean);
        const { cols, px } = cityDirectoryPlan(cities.length);
        const rows = Math.ceil(cities.length / cols);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="grid flex-1 grid-cols-[0.8fr_2.2fr] gap-14">
              <section className="flex flex-col justify-between">
                <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
                <div>
                  <StatFigure
                    brand={brand}
                    value={String(cities.length)}
                    size="lg"
                    valueStyle="gradient"
                  />
                  <div className="mt-2" style={{ fontSize: fillPx(18, "body"), color: ink.muted }}>
                    {s(c.countLabel, "Cities")}
                  </div>
                  {s(c.badge) && (
                    <div
                      className="mt-8 inline-block rounded-md px-4 py-2"
                      style={{ border: `2px solid ${accent}`, color: ink.strong, fontWeight: 700, fontSize: fillPx(18, "body") }}
                    >
                      {s(c.badge)}
                    </div>
                  )}
                </div>
              </section>
              <section
                className="grid content-center"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${rows}, auto)`,
                  gridAutoFlow: "column",
                  columnGap: 32,
                  borderLeft: `1px solid ${ink.hairline}`,
                  paddingLeft: 40,
                }}
              >
                {cities.map((city, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: px,
                      lineHeight: 1.45,
                      color: ink.body,
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {city}
                  </div>
                ))}
              </section>
            </div>
          </SlideFrame>
        );
      }
      default:
        return null;
    }
  },
});

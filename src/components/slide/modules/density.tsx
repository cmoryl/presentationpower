// Density family — designs built for content-heavy slides so a dense source
// slide still gets a styled layout instead of falling back to plain text.
// MV-STAT-PROOF-BOARD: hero results + compact scale rail.
// MV-LOC-CITY-DIRECTORY: region title, count figure, multi-column city list.

import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, s } from "../module-kit";
import { fillPx } from "@/lib/open-space-fill";
import { accentInk, hexA } from "@/lib/accent-tokens";
import { Rocket, Users, Globe2, Flag, Sparkles, MapPin, BarChart3, Code2, Building2, type LucideIcon } from "lucide-react";
import * as React from "react";
import { Donut, FillTile, Figure, GlassPanel, INFO_FILL, LogLollipop, Pictogram, RadialBars, ScaleBar as GlowScale, numOf, pctOf, type InfoFill } from "./infographic-kit";

function statIcon(label: string): LucideIcon {
  const l = label.toLowerCase();
  if (/deploy/.test(l)) return Rocket;
  if (/develop|engineer/.test(l)) return Code2;
  if (/client|compan/.test(l)) return Building2;
  if (/team|member|people|staff/.test(l)) return Users;
  if (/continent/.test(l)) return Globe2;
  if (/countr/.test(l)) return Flag;
  if (/\bai\b|marketplace/.test(l)) return Sparkles;
  if (/cit(y|ies)|office/.test(l)) return MapPin;
  return BarChart3;
}

function Ring({ pct, color, track }: { pct: number; color: string; track: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <svg viewBox="0 0 100 100" width={96} height={96} aria-hidden className="shrink-0">
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

function BigNumber({ value, unit, size, ink, unitColor }: { value: string; unit?: string; size: number; ink: string; unitColor: string }) {
  return (
    <div className="tabular-nums" style={{ fontSize: fillPx(size, "display"), fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.04em", color: ink }}>
      {value}
      {unit && <span style={{ color: unitColor, fontSize: "0.6em", marginLeft: "0.04em" }}>{unit}</span>}
    </div>
  );
}

/** Data-true scale bar: the fill ends exactly at the figure on a labelled
 * axis (0–100% for shares; 0 → next round step above the count otherwise). */
function ScaleBar({ value, unit, color, track, caption }: { value: string; unit?: string; color: string; track: string; caption: string }) {
  const raw = value.replace(/,/g, "").trim();
  const n = parseFloat(raw) * (/k$/i.test(raw) ? 1000 : 1);
  if (!Number.isFinite(n) || n <= 0) return null;
  const isPct = unit === "%";
  let max = 100;
  if (!isPct) {
    const mag = Math.pow(10, Math.floor(Math.log10(n)));
    max = Math.ceil((n * 1.2) / mag) * mag;
  }
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const frac = Math.min(1, n / max);
  const fmt = (v: number) => (isPct ? `${v}%` : v >= 1000 ? `${(v / 1000).toLocaleString("en-US")}K` : String(v));
  return (
    <div aria-hidden>
      <div className="relative h-[14px] rounded-full" style={{ background: track }}>
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${frac * 100}%`, background: `linear-gradient(90deg, ${hexA(color, 0.25)}, ${color})` }} />
        <div className="absolute top-1/2 h-[24px] w-[24px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${frac * 100}%`, background: color, boxShadow: `0 0 0 5px ${hexA(color, 0.25)}` }} />
      </div>
      <div className="relative mt-3 h-[16px]">
        {ticks.map((v, i) => (
          <span key={i} className="absolute tabular-nums" style={{ left: `${(v / max) * 100}%`, transform: i === 0 ? "none" : i === 4 ? "translateX(-100%)" : "translateX(-50%)", fontSize: fillPx(13, "body"), color: caption }}>{fmt(v)}</span>
        ))}
      </div>
    </div>
  );
}

/** Column count + type size for a list of `n` short entries on one slide. */
export function cityDirectoryPlan(n: number): { cols: number; px: number } {
  if (n <= 6) return { cols: 2, px: 60 };
  if (n <= 12) return { cols: 2, px: 50 };
  if (n <= 30) return { cols: 3, px: 40 };
  if (n <= 60) return { cols: 4, px: 31 };
  return { cols: 5, px: 27 };
}

registerSlideModule({
  id: "family:density",
  variantIds: ["MV-STAT-PROOF-BOARD", "MV-LOC-CITY-DIRECTORY"],
  render: ({ variant, brand, pageNumber, c, ink, isDark }) => {
    const accent = brand.tokens.accent;
    switch (variant.id) {
      case "MV-STAT-PROOF-BOARD": {
        // Open editorial composition: no boxes, no icons. Figures sit directly
        // on the slide ground; rings and scale rules are the only graphics, and
        // each is data-true (rings = stated %, rules = log position of count).
        const hero = arr(c.hero).slice(0, 4);
        const items = arr(c.items).slice(0, 8);
        const shares = hero.filter((it) => pctOf(s(it.value), s(it.unit)) !== null);
        const counts = hero.filter((it) => pctOf(s(it.value), s(it.unit)) === null);
        const blue = isDark ? "#7FB0FF" : INFO_FILL.blue.bg;
        const ringCol = [blue, INFO_FILL.lavender.bg];
        const hair = ink.hairline;
        const maxExp = Math.max(1, Math.ceil(Math.log10(Math.max(10, ...items.map((it) => numOf(s(it.value)))))));
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
            <div data-portrait="proof-stack" className="mt-4 grid min-h-0 flex-1 gap-x-16" style={{ gridTemplateColumns: "minmax(0,1.25fr) minmax(0,1fr)", gridTemplateRows: "minmax(0,1fr) auto" }}>
              <section className="flex min-h-0 items-center gap-12">
                <RadialBars
                  rings={shares.map((it, i) => ({ pct: pctOf(s(it.value), s(it.unit)) ?? 0, color: ringCol[i % 2]! }))}
                  size={360}
                  stroke={26}
                  gap={14}
                  sweep={300}
                  track={hair}
                >
                  <div className="text-center" style={{ color: ink.strong }}>
                    <div style={{ fontSize: fillPx(28, "body"), fontWeight: 750 }}>{s(c.brandLabel)}</div>
                  </div>
                </RadialBars>
                <div className="flex min-w-0 flex-col gap-10">
                  {shares.map((it, i) => (
                    <div key={i} className="pl-6" style={{ borderLeft: `3px solid ${ringCol[i % 2]}` }}>
                      <Figure value={s(it.value)} unit={s(it.unit)} px={96} color={ink.strong} />
                      <div style={{ fontSize: fillPx(20, "body"), lineHeight: 1.35, color: ink.body, marginTop: 8, maxWidth: 340 }}>{s(it.label)}</div>
                    </div>
                  ))}
                  {s(c.tagline) && <div style={{ fontSize: fillPx(16, "body"), color: ink.muted }}>{s(c.tagline)}</div>}
                </div>
              </section>
              <section className="flex min-h-0 flex-col justify-center">
                {counts.slice(0, 2).map((it, i) => (
                  <div key={i} className="py-7" style={{ borderTop: i ? `1px solid ${hair}` : undefined }}>
                    <Figure
                      value={s(it.value)}
                      unit={s(it.unit)}
                      px={i === 0 ? 128 : 104}
                      color={ink.strong}
                      gradient={`linear-gradient(100deg, ${ink.strong} 35%, ${blue} 75%, ${INFO_FILL.lavender.bg})`}
                    />
                    <div style={{ fontSize: fillPx(22, "body"), color: ink.body, marginTop: 10, fontWeight: 500 }}>{s(it.label)}</div>
                    <div className="mt-5" style={{ maxWidth: 520 }}>
                      <GlowScale value={numOf(s(it.value))} from={i === 0 ? blue : INFO_FILL.lavender.bg} to={i === 0 ? INFO_FILL.lavender.bg : blue} track={hair} labelColor={ink.muted} height={i === 0 ? 18 : 14} />
                    </div>
                  </div>
                ))}
              </section>
              <section className="col-span-2 mt-6 grid pt-6" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))`, borderTop: `1px solid ${hair}` }}>
                {items.map((it, i) => {
                  const pct = pctOf(s(it.value), s(it.unit));
                  void maxExp;
                  return (
                    <div key={i} className="flex flex-col justify-start gap-3 px-5" style={{ borderLeft: i ? `1px solid ${hair}` : undefined }}>
                      <Figure value={s(it.value)} unit={s(it.unit)} px={46} color={ink.strong} />
                      <div style={{ fontSize: fillPx(15, "body"), color: ink.muted, lineHeight: 1.3, minHeight: "2.6em" }}>{s(it.label)}</div>
                      {pct !== null ? (
                        <Donut pct={pct} size={92} stroke={11} color={blue} track={hair} />
                      ) : (
                        <div className="pt-3"><GlowScale value={numOf(s(it.value))} from={blue} to={INFO_FILL.lavender.bg} track={hair} labelColor={ink.muted} height={10} /></div>
                      )}
                    </div>
                  );
                })}
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
                <div className="mt-10">
                  <BigNumber value={String(cities.length)} size={150} ink={ink.strong} unitColor={accent} />
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
                      color: ink.body,
                      fontWeight: 500,
                      lineHeight: 1.25,
                      paddingBlock: px * 0.14,
                      borderBottom: `1px solid ${ink.hairline}`,
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

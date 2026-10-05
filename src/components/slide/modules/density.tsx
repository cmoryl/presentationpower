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
import { Donut, FillTile, Figure, GlassPanel, INFO_FILL, LogLollipop, Pictogram, RadialBars, numOf, pctOf, type InfoFill } from "./infographic-kit";

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
        // Bento proof board: one dominant hero tile (concentric rings for the
        // two shares), two isotype count tiles, one log-scale scale panel.
        const hero = arr(c.hero).slice(0, 4);
        const items = arr(c.items).slice(0, 8);
        const shares = hero.filter((it) => pctOf(s(it.value), s(it.unit)) !== null);
        const counts = hero.filter((it) => pctOf(s(it.value), s(it.unit)) === null);
        const ringCol = [INFO_FILL.aqua.bg, INFO_FILL.lavender.bg, "#FFFFFF"];
        const itemShares = items.filter((it) => pctOf(s(it.value), s(it.unit)) !== null);
        const itemCounts = items
          .filter((it) => pctOf(s(it.value), s(it.unit)) === null)
          .map((it) => ({ it, n: numOf(s(it.value)) }))
          .sort((a, b) => b.n - a.n);
        const dots = [INFO_FILL.aqua.bg, INFO_FILL.lavender.bg, "#7FB0FF"];
        const _panel: React.CSSProperties = {
          background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.82)",
          border: `1px solid ${ink.hairline}`,
          boxShadow: isDark ? undefined : "0 18px 40px -26px rgba(3,0,44,0.45)",
          borderRadius: 24,
          minWidth: 0,
          minHeight: 0,
        };
        const countTile = (it: Record<string, unknown>, i: number) => {
          const fill: InfoFill = i === 0 ? "blue" : "lavender";
          const f = INFO_FILL[fill];
          const n = numOf(s(it.value));
          const mag = Math.pow(10, Math.floor(Math.log10(Math.max(n, 1))));
          const step = n / mag > 5 ? mag : (mag / 10) * 2 || 1;
          const count = Math.min(12, Math.round(n / step));
          const Icon = statIcon(s(it.label));
          return (
            <FillTile key={i} fill={fill} className="flex flex-col justify-between p-6" style={{ gridColumn: i === 0 ? "6 / span 4" : "10 / span 3", gridRow: "1" }}>
              <Icon aria-hidden size={230} strokeWidth={0.9} className="pointer-events-none absolute -bottom-10 -right-8" style={{ opacity: 0.13 }} />
              <div className="relative flex items-start justify-between">
                <Figure value={s(it.value)} unit={s(it.unit)} px={i === 0 ? 80 : 64} color={f.fg} />
                <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full" style={{ background: f.track, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)" }}>
                  <Icon size={26} strokeWidth={1.7} />
                </span>
              </div>
              <div className="relative">
                <Pictogram count={count} size={i === 0 ? 24 : 20} color={f.fg} render={(col, sz) => <Icon size={sz} color={col} strokeWidth={1.8} />} />
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <span style={{ fontSize: fillPx(18, "body"), fontWeight: 650 }}>{s(it.label)}</span>
                  <span style={{ fontSize: fillPx(12, "body"), opacity: 0.75, whiteSpace: "nowrap" }}>1 icon = {step.toLocaleString("en-US")}</span>
                </div>
              </div>
            </FillTile>
          );
        };
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} kicker={s(c.kicker)} />
            <div
              data-portrait="proof-stack"
              className="mt-6 grid min-h-0 flex-1 gap-5"
              style={{ gridTemplateColumns: "repeat(12, minmax(0,1fr))", gridTemplateRows: "minmax(0,0.9fr) minmax(0,1.1fr)" }}
            >
              <FillTile fill="navy" className="flex flex-col p-8" style={{ gridColumn: "1 / span 5", gridRow: "1 / span 2" }}>
                <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full" style={{ background: "radial-gradient(circle, rgba(0,63,199,0.75), transparent 68%)" }} />
                <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-[380px] w-[380px] rounded-full" style={{ background: "radial-gradient(circle, rgba(194,163,255,0.35), transparent 70%)" }} />
                <div className="relative">
                  {s(c.brandLabel) && <div style={{ fontSize: fillPx(32, "body"), fontWeight: 750 }}>{s(c.brandLabel)}</div>}
                  {s(c.tagline) && <div style={{ fontSize: fillPx(16, "body"), opacity: 0.75, marginTop: 4 }}>{s(c.tagline)}</div>}
                </div>
                <div className="relative flex flex-1 items-center gap-8">
                  <RadialBars
                    rings={shares.map((it, i) => ({ pct: pctOf(s(it.value), s(it.unit)) ?? 0, color: ringCol[i % 3]! }))}
                    size={300}
                    stroke={30}
                    gap={10}
                    track="rgba(255,255,255,0.10)"
                  />
                  <div className="flex flex-col gap-7">
                    {shares.map((it, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-3">
                          <span className="h-[14px] w-[14px] rounded-full" style={{ background: ringCol[i % 3] }} />
                          <Figure value={s(it.value)} unit={s(it.unit)} px={68} color="#FFFFFF" gradient={`linear-gradient(180deg, #FFFFFF 30%, ${ringCol[i % 3]})`} />
                        </div>
                        <div style={{ fontSize: fillPx(18, "body"), lineHeight: 1.3, opacity: 0.85, marginTop: 6, maxWidth: 260 }}>{s(it.label)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </FillTile>
              {counts.slice(0, 2).map(countTile)}
              <GlassPanel dark={isDark} className="flex gap-6 p-6" style={{ gridColumn: "6 / span 7", gridRow: "2" }}>
                <div className="min-w-0 flex-1">
                  <LogLollipop
                    rows={itemCounts.map(({ it, n }, i) => {
                      const Icon = statIcon(s(it.label));
                      return { value: s(it.value), unit: s(it.unit), label: s(it.label), n, color: dots[i % 3]!, icon: <Icon size={22} strokeWidth={1.8} /> };
                    })}
                    ink={ink.strong}
                    muted={ink.muted}
                    hairline={ink.hairline}
                    px={(n) => fillPx(n, "body")}
                  />
                </div>
                {itemShares.slice(0, 1).map((it, i) => {
                  const pct = pctOf(s(it.value), s(it.unit)) ?? 0;
                  return (
                    <FillTile key={i} fill="aqua" className="flex w-[230px] shrink-0 flex-col items-center justify-center gap-3 p-5 text-center">
                      <Donut pct={pct} size={150} stroke={18} color={INFO_FILL.aqua.ring} track={INFO_FILL.aqua.track}>
                        <Figure value={s(it.value)} unit={s(it.unit)} px={42} color={INFO_FILL.aqua.fg} />
                      </Donut>
                      <div style={{ fontSize: fillPx(17, "body"), fontWeight: 650, lineHeight: 1.25 }}>{s(it.label)}</div>
                    </FillTile>
                  );
                })}
              </GlassPanel>
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

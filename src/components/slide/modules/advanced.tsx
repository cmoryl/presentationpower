// Advanced diagram family — the bento value/close spread, the KPI dashboard
// grid, roadmap quarters, funnel, flywheel, maturity curve, journey map, logo
// wall, 2x2 matrix and iceberg. Extracted from the legacy `VariantRenderer`
// switch onto the module registry so this heavier geometry has one owner.

import React from "react";
import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, obj, s, strs, truthy, type Item } from "../module-kit";
import { IconBadge, MediaTile, Sparkline, pickKitIcon } from "../module-primitives";
import { Kicker, SlideNumeral, StatFigure, Hairline, DisplayTitle } from "../primitives";
import {
  AccentTick,
  AuroraOrb,
  GlassTile,
  IconWell,
  moduleCardSurface,
  moduleCardTint,
} from "../flagship";
import { FunnelFigure, type FunnelStage } from "../FunnelFigure";
import { resolveFunnelStyle } from "@/lib/funnel-style";
import { SummaryBand } from "../SummaryBand";
import { ClientLogoImg, pickLogoForMode } from "../client-logo";
import { SEAM_HEIGHT_PX, SUMMARY_BAND } from "@/lib/surface-tokens";
import { accentInk, hexA } from "@/lib/accent-tokens";
import { statGradient } from "@/lib/stat-contrast";
import { fillPx, statPx, clampLines } from "@/lib/open-space-fill";
import { useSlideInk } from "../SlideChrome";
import {
  BarChart3,
  LineChart,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import type { CSSProperties } from "react";

type IconType = typeof Sparkles;

// The kit's icon resolver is typed against the shared kit icon shape; this
// family renders lucide components directly, so narrow the return type once.
const pickIcon = pickKitIcon as unknown as (
  label: string,
  fallbackIndex?: number,
  override?: string | null,
  divisionId?: string | null,
) => IconType;

export type {
  CSSProperties as _KitCss,
  FunnelStage as _KitFunnelStage,
  Item as _KitItem,
  IconType as _KitIconType,
};

registerSlideModule({
  id: "family:advanced",
  variantIds: [
    "MV-BENTO-VALUE-CLOSE",
    "MV-KPI-DASHBOARD",
    "MV-ROADMAP-QUARTERS",
    "MV-FUNNEL",
    "MV-FLYWHEEL",
    "MV-MATURITY-CURVE",
    "MV-JOURNEY-MAP",
    "MV-LOGO-WALL",
    "MV-MATRIX-2X2",
    "MV-ICEBERG",
  ],
  render: (args) => {
    const {
      slide,
      variant,
      brand,
      pageNumber,
      c,
      mode,
      clientName,
      clientLogoUrl,
      dash,
      bareSurfaces,
      isDark,
      ink,
      accentTone,
    } = args;
    void slide;
    void clientLogoUrl;
    void dash;
    void accentTone;
    void clientName;
    void bareSurfaces;
    void mode;
    void isDark;
    switch (variant.id) {
      case "MV-BENTO-VALUE-CLOSE": {
        // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
        // is too deep to read as text or as a hairline, so lift it onto the
        // shared accentInk ramp. Light mode is unchanged.
        const accent = accentInk(brand.tokens.accent, mode, 4.5);
        const cool = isDark ? "#7FB3F5" : "#3E7BD1";
        const promise = obj(c.promise);
        const close = obj(c.close);
        const items = arr(c.items).slice(0, 6);
        const cols = items.length >= 5 ? 3 : items.length >= 3 ? 3 : 2;
        const rowCount = Math.max(1, Math.ceil(items.length / cols));
        // Vertical contract: the module is a flex column inside the fixed content
        // box, so the value grid is the only flexible band. Everything else (title,
        // subtitle, promise line, items label, close band) is flex-none and the
        // grid absorbs the remainder — long copy shortens the grid instead of
        // pushing the close band down into it or off the page. `minH` keeps the
        // grid legible; below it the cells clamp their body copy.
        const cellMinH = rowCount >= 2 ? 132 : 172;
        // Responsive contract: the grid and the close band are containers, and
        // every type step is `min(<px cap>, <fluid cqw>)`. On a 1920 stage the px
        // cap wins so the design is pixel-identical to the approved look; on
        // narrower stages (4:3 crops, half-width compare views, thumbnails,
        // aspect variants) the cqw term takes over so nothing clips or collides.
        // One column of the grid is ~ (100 - gaps) / cols of the container width.
        const colCqw = (100 - (cols - 1) * 2.2) / cols;
        // Each cell is its own SIZE container, so a step can be expressed against
        // the width AND the height the cell actually received. Shares stay in
        // column terms (`colCqw * share`) and are converted to cell-relative cqw,
        // so the 1920 look is unchanged while a short row scales its own type down
        // instead of letting the copy run past the card's bottom edge.
        const cellText = (capPx: number, share: number, hShare: number) =>
          `min(${capPx}px, ${(share * 100).toFixed(2)}cqw, ${hShare}cqh)`;
        // Vertical rhythm inside a cell: never more than the design gap, never
        // more than a fixed share of the cell height (the safe-area contract).
        const cellGap = (capPx: number, hShare: number) => `min(${capPx}px, ${hShare}cqh)`;

        // Body copy clamps so a long cell can never win height against its
        // siblings: 2 lines on a two-row grid, 4 when there's a single row.
        const bodyLines = rowCount >= 2 ? 2 : 4;
        const clamp = (lines: number) => ({
          display: "-webkit-box" as const,
          WebkitBoxOrient: "vertical" as const,
          WebkitLineClamp: lines,
          overflow: "hidden" as const,
        });
        // Restrained tone rotation: division accent, a cool companion and neutral
        // ink. No off-brand pops — the source deck's rainbow is normalised here.
        const toneFor = (i: number) => [accent, cool, accent, ink.strong, cool, accent][i % 6]!;
        const cellStyle = moduleCardSurface(accent, isDark ? "dark" : "light", { radius: 20 });
        const hasClose = !!(s(close.lead) || s(close.emphasis) || s(close.ctaTitle));

        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="flex h-full min-h-0 flex-col">
              {/* Header is capped at two title lines so an overlong title can't
                eat the grid's height or push the close band off the page. */}
              <div className="flex-none overflow-hidden" style={{ maxHeight: 200 }}>
                <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.kicker) || undefined} />
              </div>
              {s(c.subtitle) && (
                <div
                  data-title-subline
                  className="mt-4 flex-none"
                  style={{
                    fontSize: fillPx(34, "figure"),
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.18,
                    color: accentInk(accent, mode, 4.5),
                    ...clamp(2),
                  }}
                >
                  {s(c.subtitle)}
                </div>
              )}
              {(s(promise.lead) || s(promise.emphasis)) && (
                <SummaryBand
                  lead={s(promise.lead)}
                  emphasis={s(promise.emphasis)}
                  accent={accent}
                  leadTone={ink.strong}
                  scale={0.72}
                  className="flex-none"
                  style={{ marginTop: 22 }}
                />
              )}
              {s(c.itemsLabel) && (
                <div
                  className="mt-8 flex-none text-center uppercase"
                  style={{
                    fontSize: fillPx(19, "body"),
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    color: ink.muted,
                  }}
                >
                  {s(c.itemsLabel)}
                </div>
              )}
              <div
                className="mt-5 grid min-h-0 flex-1"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  // Rows share the flexible remainder equally, with a legibility
                  // floor. Long copy shortens a row rather than growing the grid.
                  gridTemplateRows: `repeat(${rowCount}, minmax(min(${cellMinH}px, ${(cellMinH / 10.4).toFixed(2)}cqw), 1fr))`,
                  // Floor for the whole grid so it can never be squeezed to icons
                  // only by long copy above it.
                  minHeight: `min(${rowCount * cellMinH + (rowCount - 1) * 16}px, ${((rowCount * cellMinH + (rowCount - 1) * 16) / 10.4).toFixed(2)}cqw)`,
                  gap: "min(16px, 2.2cqw)",
                  containerType: "inline-size",
                }}
              >
                {items.map((it, i) => {
                  const tone = toneFor(i);
                  return (
                    <div
                      key={i}
                      className="flex min-w-0 flex-col items-center justify-center overflow-hidden text-center"
                      style={{
                        ...cellStyle,
                        // cqw is cell-relative inside the size container below.
                        paddingInline: "min(24px, 5cqw)",
                        paddingTop: cellGap(20, 12),
                        paddingBottom: cellGap(24, 14),
                        // Cell owns a size container so the steps below can fall back
                        // to a share of the height it actually received.
                        containerType: "size",
                      }}
                    >
                      <AccentTick accent={accent} height={3} radius={20} />
                      <IconBadge
                        brand={brand}
                        label={s(it.title)}
                        index={i}
                        size="sm"
                        override={s(it.icon)}
                        sizeToken={s(it.iconSize)}
                        treatment="soft-circle"
                      />
                      <div
                        className="min-w-0 flex-none"
                        style={{
                          marginTop: cellGap(14, 8),
                          fontSize: cellText(23, 0.048, 15),
                          fontWeight: 700,
                          letterSpacing: "-0.018em",
                          lineHeight: 1.14,
                          color: tone === ink.strong ? ink.strong : accentInk(tone, mode, 4.5),
                          ...clamp(2),
                        }}
                      >
                        {s(it.title)}
                      </div>
                      <div
                        aria-hidden
                        data-decorative
                        className="flex-none"
                        style={{
                          marginTop: cellGap(12, 7),
                          height: SEAM_HEIGHT_PX,
                          width: `min(56px, ${(0.12 * 100).toFixed(2)}cqw)`,
                          borderRadius: SEAM_HEIGHT_PX,
                          backgroundImage: `linear-gradient(90deg, transparent, ${tone}, transparent)`,
                        }}
                      />
                      <div
                        className="min-w-0 flex-none"
                        style={{
                          marginTop: cellGap(12, 7),
                          fontSize: cellText(17, 0.036, 11),
                          lineHeight: 1.38,
                          color: ink.muted,
                          ...clamp(bodyLines),
                        }}
                      >
                        {s(it.body)}
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasClose && (
                // Pinned to the bottom of the content box with a guaranteed gap
                // above it: `mt-auto` eats any slack, the wrapper's paddingTop is
                // the minimum breathing room from the grid, and the band's own
                // token margin is zeroed so the two never double up.
                <div
                  className="mt-auto flex-none"
                  style={{ paddingTop: `min(${SUMMARY_BAND.marginTop}px, 2.6cqw)` }}
                >
                  <SummaryBand
                    accent={accent}
                    leadTone={ink.strong}
                    scale={0.78}
                    style={{ marginTop: 0 }}
                  >
                    <div className="@container w-full">
                      <div
                        className="grid w-full grid-cols-1 items-center gap-y-2 @[620px]:grid-cols-[1fr_1px_1fr]"
                        style={{ columnGap: "min(40px, 2.6cqw)" }}
                      >
                        <div className="min-w-0 text-left">
                          <div
                            style={{
                              fontSize: "min(24px, 2.9cqw)",
                              fontWeight: 700,
                              letterSpacing: "-0.02em",
                              lineHeight: 1.22,
                              color: ink.strong,
                              ...clamp(2),
                            }}
                          >
                            {s(close.lead)}
                          </div>
                          {s(close.emphasis) && (
                            <div
                              style={{
                                fontSize: "min(24px, 2.9cqw)",
                                fontWeight: 700,
                                letterSpacing: "-0.02em",
                                lineHeight: 1.22,
                                color: accentInk(accent, mode, 4.5),
                                ...clamp(2),
                              }}
                            >
                              {s(close.emphasis)}
                            </div>
                          )}
                        </div>
                        <div
                          aria-hidden
                          data-decorative
                          className="hidden self-stretch @[620px]:block"
                          style={{
                            backgroundColor: `color-mix(in oklab, ${accent} 32%, transparent)`,
                          }}
                        />
                        <div className="min-w-0 text-left">
                          <div
                            style={{
                              fontSize: "min(24px, 2.9cqw)",
                              fontWeight: 700,
                              letterSpacing: "-0.02em",
                              lineHeight: 1.22,
                              color: ink.strong,
                              ...clamp(2),
                            }}
                          >
                            {s(close.ctaTitle)}
                          </div>
                          {s(close.ctaBody) && (
                            <div
                              className="mt-1"
                              style={{
                                fontSize: "min(19px, 2.3cqw)",
                                lineHeight: 1.32,
                                color: ink.muted,
                                ...clamp(2),
                              }}
                            >
                              {s(close.ctaBody)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </SummaryBand>
                </div>
              )}
            </div>
          </SlideFrame>
        );
      }

      case "MV-KPI-DASHBOARD": {
        const items = arr(c.items).slice(0, 6);
        // Deterministic pseudo-random per slide so sparklines stay stable but
        // differ per tile. Mulberry32-style.
        const rng = (seed: number) => {
          let a = (seed * 2654435761) >>> 0;
          return () => {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
        };
        const numeric = (v: string) => {
          const m = String(v).replace(/[^0-9.-]/g, "");
          const n = parseFloat(m);
          return Number.isFinite(n) ? n : 60;
        };
        const seriesFor = (label: string, trend: string, base: number) => {
          const seed =
            Array.from(label).reduce((a, ch) => a + ch.charCodeAt(0), 7) + Math.round(base * 13);
          const r = rng(seed);
          const dir = trend === "down" ? -1 : 1;
          const arr: number[] = [];
          for (let i = 0; i < 14; i++) {
            const t = i / 13;
            const noise = (r() - 0.5) * 0.18;
            arr.push(0.55 + dir * t * 0.42 + noise);
          }
          return arr;
        };
        const ringPct = (v: string, unit: string) => {
          const n = numeric(v);
          if (unit === "%") return Math.max(4, Math.min(99, n));
          if (unit === "/5") return Math.max(4, Math.min(99, (n / 5) * 100));
          // fallback: normalize small numbers to a sane arc
          if (n <= 10) return 40 + n * 5;
          if (n <= 100) return Math.max(20, n);
          return 78;
        };
        const usedIcons = new Set<IconType>();
        const dedupPool: IconType[] = [
          LineChart,
          TrendingUp,
          Target,
          Zap,
          Trophy,
          Rocket,
          Sparkles,
          BarChart3,
        ];
        const pickTileIcon = (label: string, override: string, i: number) => {
          let Icon = pickIcon(label || "kpi", i, override);
          if (usedIcons.has(Icon)) {
            const alt = dedupPool.find((c) => !usedIcons.has(c));
            if (alt) Icon = alt;
          }
          usedIcons.add(Icon);
          return Icon;
        };

        // Bento assignment — a defined 12-col × 3-row mosaic (172px rows):
        //   [ HERO (7×2) ][ RING (5×1) ]
        //                 [ SPARK (5×1) ]
        //   [ BAR (4×1) ][ BAR (4×1) ][ BAR (4×1) ]
        // Every tile clips its own content so charts can never leak past the card.
        type TileKind = "hero" | "ring" | "spark" | "bar";
        const layout: { col: number; row: number; kind: TileKind }[] = [
          { col: 7, row: 2, kind: "hero" },
          { col: 5, row: 1, kind: "ring" },
          { col: 5, row: 1, kind: "spark" },
          { col: 4, row: 1, kind: "bar" },
          { col: 4, row: 1, kind: "bar" },
          { col: 4, row: 1, kind: "bar" },
        ];

        // Trend accent — up uses the brand accent, down uses TransPerfect Red so
        // the mosaic reads as a real infographic (green/red visual grammar) while
        // still respecting the brand palette.
        const upInk = "var(--slide-accent-text)";
        const downInk = "#E53D2E";
        const trendInk = (t: string) => (t === "down" ? downInk : upInk);

        const chip = (tInk: string, arrow: string, delta: string, size = 15) => (
          <div
            className="inline-flex items-center gap-1.5 rounded-full"
            style={{
              padding: size >= 15 ? "5px 12px" : "4px 10px",
              background: `color-mix(in oklab, ${tInk} 13%, transparent)`,
              border: `1px solid color-mix(in oklab, ${tInk} 30%, transparent)`,
              color: tInk,
              fontSize: size,
              fontWeight: 600,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            <span aria-hidden>{arrow}</span>
            <span className="tabular-nums">{delta}</span>
          </div>
        );

        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div
              className="mt-10 grid gap-5"
              style={{
                gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
                gridAutoRows: "214px",
              }}
            >
              {items.map((it, i) => {
                const cfg = layout[i] ?? { col: 4, row: 1, kind: "bar" as TileKind };
                const label = s(it.label);
                const value = s(it.value);
                const unit = s(it.unit);
                const delta = s(it.delta);
                const trend = s(it.trend) || (delta.startsWith("-") ? "down" : "up");
                const Icon = pickTileIcon(label, s(it.icon), i);
                const tInk = trendInk(trend);
                const arrow = trend === "down" ? "▼" : "▲";

                const tileStyle: React.CSSProperties = {
                  gridColumn: `span ${cfg.col}`,
                  gridRow: `span ${cfg.row}`,
                  ...moduleCardSurface(brand.tokens.accent, isDark ? "dark" : "light", {
                    radius: 22,
                  }),
                  padding: cfg.kind === "hero" ? 34 : 24,
                  position: "relative",
                  overflow: "hidden",
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                };

                // Numbered corner label — infographic wayfinding.
                const cornerNum = (
                  <div
                    className="absolute font-mono"
                    style={{
                      top: 16,
                      right: 20,
                      fontSize: fillPx(12, "kicker"),
                      letterSpacing: "0.28em",
                      color: ink.faint,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                );

                const iconChip = (size: number, box: number, radius: number) => (
                  <div
                    aria-hidden
                    className="flex shrink-0 items-center justify-center"
                    style={{
                      width: box,
                      height: box,
                      borderRadius: radius,
                      background: "color-mix(in oklab, var(--slide-accent-text) 11%, transparent)",
                      border: `1px solid color-mix(in oklab, var(--slide-accent-text) 30%, transparent)`,
                      color: "var(--slide-accent-text)",
                    }}
                  >
                    <Icon size={size} aria-hidden />
                  </div>
                );

                if (cfg.kind === "hero") {
                  const series = seriesFor(label, trend, numeric(value));
                  return (
                    <div key={i} style={tileStyle}>
                      <AccentTick accent={brand.tokens.accent} height={3} radius={22} />
                      {cornerNum}
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: `radial-gradient(120% 95% at 0% 100%, color-mix(in oklab, var(--slide-accent-text) 13%, transparent), transparent 62%)`,
                          pointerEvents: "none",
                        }}
                      />
                      <div className="relative flex min-h-0 flex-1 gap-8">
                        {/* Reading column — figure + label */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div className="flex items-center gap-4">
                            {iconChip(28, 60, 18)}
                            <div>
                              <div
                                className="uppercase font-mono"
                                style={{
                                  fontSize: fillPx(12, "kicker"),
                                  letterSpacing: "0.3em",
                                  color: ink.faint,
                                }}
                              >
                                Headline metric
                              </div>
                              <div
                                className="mt-1.5"
                                style={{
                                  fontSize: fillPx(19, "body"),
                                  fontWeight: 600,
                                  color: ink.strong,
                                  letterSpacing: "-0.01em",
                                }}
                              >
                                {label}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-end gap-5">
                            <div
                              className="tabular-nums"
                              style={{
                                fontSize: fillPx(176, "display"),
                                lineHeight: 0.84,
                                fontWeight: 700,
                                letterSpacing: "-0.05em",
                                color: ink.strong,
                              }}
                            >
                              {value}
                              {unit && (
                                <span
                                  style={{
                                    fontSize: fillPx(52, "figure"),
                                    marginLeft: 6,
                                    color: "var(--slide-accent-text)",
                                    letterSpacing: "-0.03em",
                                  }}
                                >
                                  {unit}
                                </span>
                              )}
                            </div>
                            {delta && <div className="pb-4">{chip(tInk, arrow, delta, 16)}</div>}
                          </div>
                        </div>
                        {/* Chart column — bounded, never stretched past the card */}
                        <div
                          className="flex min-w-0 flex-col justify-end"
                          style={{
                            width: "42%",
                            borderLeft: `1px solid ${ink.hairline}`,
                            paddingLeft: 22,
                          }}
                        >
                          <div
                            className="uppercase font-mono"
                            style={{
                              fontSize: fillPx(11, "kicker"),
                              letterSpacing: "0.28em",
                              color: ink.faint,
                            }}
                          >
                            Trailing 14 periods
                          </div>
                          <div className="mt-3">
                            <Sparkline brand={brand} values={series} w={420} h={168} peakPin />
                          </div>
                          <div
                            className="mt-2 flex justify-between font-mono"
                            style={{
                              fontSize: fillPx(11, "kicker"),
                              letterSpacing: "0.18em",
                              color: ink.faint,
                            }}
                          >
                            <span>T-13</span>
                            <span>NOW</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (cfg.kind === "ring") {
                  const pct = ringPct(value, unit);
                  const R = 54;
                  const C = 2 * Math.PI * R;
                  const dash = (pct / 100) * C;
                  return (
                    <div key={i} style={tileStyle}>
                      <AccentTick accent={brand.tokens.accent} height={3} radius={22} />
                      {cornerNum}
                      <div className="flex min-h-0 flex-1 items-center gap-6">
                        <svg
                          width={128}
                          height={128}
                          viewBox="-64 -64 128 128"
                          className="shrink-0"
                          aria-hidden
                        >
                          <circle r={R} fill="none" stroke={ink.hairline} strokeWidth={9} />
                          <circle
                            r={R}
                            fill="none"
                            stroke="var(--slide-accent-text)"
                            strokeWidth={9}
                            strokeLinecap="round"
                            strokeDasharray={`${dash} ${C - dash}`}
                            transform="rotate(-90)"
                          />
                          <text
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={34}
                            fontWeight={700}
                            fill={ink.strong}
                            style={{ letterSpacing: "-0.03em" }}
                          >
                            {value}
                          </text>
                        </svg>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5">
                            <Icon
                              size={19}
                              style={{ color: "var(--slide-accent-text)" }}
                              aria-hidden
                            />
                            <div
                              className="truncate"
                              style={{
                                fontSize: fillPx(21, "body"),
                                fontWeight: 600,
                                color: ink.strong,
                                letterSpacing: "-0.01em",
                              }}
                            >
                              {label}
                              {unit && (
                                <span style={{ color: ink.faint, fontSize: fillPx(16, "body") }}>
                                  {" "}
                                  · {unit}
                                </span>
                              )}
                            </div>
                          </div>
                          {delta && (
                            <div className="mt-3 flex items-center gap-2.5">
                              {chip(tInk, arrow, delta, 14)}
                              <span style={{ color: ink.faint, fontSize: fillPx(14, "kicker") }}>
                                vs. baseline
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (cfg.kind === "spark") {
                  const series = seriesFor(label, trend, numeric(value));
                  return (
                    <div key={i} style={tileStyle}>
                      <AccentTick accent={brand.tokens.accent} height={3} radius={22} />
                      {cornerNum}
                      <div className="flex min-h-0 flex-1 items-center gap-6">
                        <div className="flex min-w-0 shrink-0 flex-col" style={{ width: "44%" }}>
                          <div className="flex items-center gap-3">
                            {iconChip(19, 42, 12)}
                            <div
                              className="truncate"
                              style={{
                                fontSize: fillPx(16, "body"),
                                color: ink.muted,
                                letterSpacing: "-0.005em",
                              }}
                            >
                              {label}
                            </div>
                          </div>
                          <div className="mt-3 flex items-baseline gap-1.5">
                            <span
                              className="tabular-nums font-semibold"
                              style={{
                                fontSize: fillPx(70, "display"),
                                lineHeight: 0.88,
                                letterSpacing: "-0.045em",
                                color: ink.strong,
                              }}
                            >
                              {value}
                            </span>
                            {unit && (
                              <span
                                style={{
                                  fontSize: fillPx(22, "body"),
                                  color: "var(--slide-accent-text)",
                                  letterSpacing: "-0.02em",
                                }}
                              >
                                {unit}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <Sparkline brand={brand} values={series} w={320} h={96} />
                          {delta && <div className="mt-2.5">{chip(tInk, arrow, delta, 14)}</div>}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Uniform bottom rail — value, delta, progress meter
                const pct = ringPct(value, unit);
                return (
                  <div key={i} style={tileStyle}>
                    <AccentTick accent={brand.tokens.accent} height={3} radius={22} />
                    {cornerNum}
                    <div className="flex items-center gap-3" style={{ paddingRight: 44 }}>
                      {iconChip(20, 44, 13)}
                      <div
                        className="truncate"
                        style={{
                          fontSize: fillPx(16, "body"),
                          color: ink.muted,
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {label}
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className="tabular-nums font-semibold"
                          style={{
                            fontSize: fillPx(54, "figure"),
                            lineHeight: 0.9,
                            letterSpacing: "-0.04em",
                            color: ink.strong,
                          }}
                        >
                          {value}
                        </span>
                        {unit && (
                          <span
                            style={{
                              fontSize: fillPx(21, "body"),
                              color: "var(--slide-accent-text)",
                              letterSpacing: "-0.02em",
                            }}
                          >
                            {unit}
                          </span>
                        )}
                      </div>
                      {delta && chip(tInk, arrow, delta, 14)}
                    </div>
                    <div
                      style={{
                        height: 7,
                        borderRadius: 4,
                        background: ink.hairline,
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: `${Math.max(6, Math.min(100, pct))}%`,
                          background: `linear-gradient(90deg, color-mix(in oklab, var(--slide-accent-text) 45%, transparent), var(--slide-accent-text))`,
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </SlideFrame>
        );
      }

      case "MV-ROADMAP-QUARTERS": {
        const quarters = strs(c.quarters).length ? strs(c.quarters) : ["Q1", "Q2", "Q3", "Q4"];
        // Rows are unbounded in authored content; past six the table used to run
        // through the footer, so cap the run and tighten the row rhythm as it grows.
        const items = arr(c.items).slice(0, 6);
        const dense = items.length >= 5;
        const rowPad = dense ? "py-3" : "py-5";
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className={dense ? "mt-8" : "mt-14"}>
              <div
                className="grid gap-6"
                style={{ gridTemplateColumns: `240px repeat(${quarters.length}, minmax(0, 1fr))` }}
              >
                <div />
                {quarters.map((q, i) => (
                  <div
                    key={i}
                    className="pb-4 uppercase"
                    style={{
                      fontSize: fillPx(20, "body"),
                      letterSpacing: "0.28em",
                      color: "var(--slide-accent-text)",
                      fontWeight: 600,
                      borderBottom: `2px solid ${brand.tokens.accent}`,
                    }}
                  >
                    {q}
                  </div>
                ))}
                {items.map((it, i) => {
                  const start = Math.max(1, Number(it.start ?? 1));
                  const end = Math.min(quarters.length, Number(it.end ?? start));
                  const span = end - start + 1;
                  return (
                    <>
                      <div
                        key={`l-${i}`}
                        className={`${rowPad} pr-6`}
                        style={{
                          fontSize: fillPx(22, "body"),
                          fontWeight: 600,
                          color: ink.strong,
                          letterSpacing: "-0.01em",
                          borderTop: `1px solid ${ink.hairline}`,
                        }}
                      >
                        {s(it.label)}
                        {s(it.note) && (
                          <div
                            className="mt-1"
                            style={{
                              fontSize: fillPx(16, "body"),
                              fontWeight: 400,
                              color: "color-mix(in oklab, currentColor 60%, transparent)",
                              letterSpacing: 0,
                            }}
                          >
                            {s(it.note)}
                          </div>
                        )}
                      </div>
                      {Array.from({ length: quarters.length }).map((_, q) => {
                        const active = q + 1 >= start && q + 1 <= end;
                        const isStart = q + 1 === start;
                        return (
                          <div
                            key={`c-${i}-${q}`}
                            className={rowPad}
                            style={{ borderTop: `1px solid ${ink.hairline}` }}
                          >
                            {isStart && (
                              <div
                                style={{
                                  gridColumn: `span ${span}`,
                                  height: 24,
                                  background: `linear-gradient(90deg, ${brand.tokens.primary}, ${brand.tokens.accent})`,
                                  width: `calc(${span * 100}% + ${(span - 1) * 24}px)`,
                                  opacity: 0.9,
                                }}
                              />
                            )}
                            {!active && !isStart && <div style={{ height: 24 }} />}
                          </div>
                        );
                      })}
                    </>
                  );
                })}
              </div>
            </div>
          </SlideFrame>
        );
      }

      case "MV-FUNNEL": {
        const items = arr(c.items);
        const fstyle = resolveFunnelStyle((c as Record<string, unknown>).funnelStyle, brand);
        const stages: FunnelStage[] = items.map((it) => {
          const raw =
            typeof it.value === "number"
              ? it.value
              : Number(String(it.value ?? "").replace(/[^0-9.]/g, ""));
          return {
            label: s(it.label),
            note: s(it.note),
            value: s(it.value),
            unit: s(it.unit),
            icon: s(it.icon),
            num: Number.isFinite(raw) && raw > 0 ? raw : 0,
          };
        });
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <AuroraOrb x={88} y={22} size={780} />
            <AuroraOrb x={6} y={92} size={620} />
            <div className="relative">
              <SlideTitle brand={brand} title={s(c.title, variant.name)} />
              <div className="mt-10">
                <FunnelFigure
                  stages={stages}
                  style={fstyle}
                  ink={{
                    strong: ink.strong,
                    body: ink.body,
                    muted: ink.muted,
                    faint: ink.faint,
                    hairline: ink.hairline,
                  }}
                  renderIcon={(st, i) => (
                    <IconBadge
                      brand={brand}
                      label={st.label}
                      index={i}
                      size="md"
                      override={st.icon}
                    />
                  )}
                />
              </div>
            </div>
          </SlideFrame>
        );
      }

      case "MV-FLYWHEEL": {
        const items = arr(c.items).slice(0, 6);
        const list = items.length
          ? items
          : [
              { label: "Create" },
              { label: "Localize" },
              { label: "Publish" },
              { label: "Measure" },
            ];
        const n = list.length;
        // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
        // is too deep to read as text or as a hairline, so lift it onto the
        // shared accentInk ramp. Light mode is unchanged.
        const accent = accentInk(brand.tokens.accent, mode, 4.5);
        const accentText = accentInk(accent, mode);
        const uid = `fw-${variant.id}-${n}`;
        // Geometry — one square stage for the wheel, everything derived from it so
        // nodes, arcs and labels can never drift apart.
        const S = 660;
        const CX = S / 2;
        const CY = S / 2;
        const R = 232; // track radius
        const NODE = 92; // node chip diameter
        const GAP = 0.23; // arc gap (fraction of a segment) reserved for the node
        const ang = (t: number) => t * Math.PI * 2 - Math.PI / 2;
        const pt = (t: number, r = R) => ({
          x: CX + Math.cos(ang(t)) * r,
          y: CY + Math.sin(ang(t)) * r,
        });
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="flex h-full flex-col">
              <SlideTitle brand={brand} title={s(c.title, variant.name)} />
              <div
                className="mt-8 grid flex-1 items-center gap-12"
                style={{ gridTemplateColumns: "660px 1fr" }}
              >
                {/* ── Wheel ─────────────────────────────────────────────── */}
                <div className="relative" style={{ width: S, height: S }}>
                  <svg
                    viewBox={`0 0 ${S} ${S}`}
                    className="absolute inset-0 h-full w-full"
                    aria-hidden
                    data-decorative
                  >
                    <defs>
                      <linearGradient id={`${uid}-arc`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={accent} stopOpacity={isDark ? 0.55 : 0.45} />
                        <stop offset="55%" stopColor={accent} />
                        <stop offset="100%" stopColor={accentText} />
                      </linearGradient>
                      <radialGradient id={`${uid}-hub`} cx="50%" cy="45%" r="60%">
                        <stop offset="0%" stopColor={accent} stopOpacity={isDark ? 0.34 : 0.2} />
                        <stop offset="100%" stopColor={accent} stopOpacity={0} />
                      </radialGradient>
                      <marker
                        id={`${uid}-tip`}
                        viewBox="0 0 12 12"
                        refX="9"
                        refY="6"
                        markerWidth="6.5"
                        markerHeight="6.5"
                        orient="auto"
                      >
                        <path d="M 0 0 L 12 6 L 0 12 L 3.2 6 Z" fill={accentText} />
                      </marker>
                    </defs>

                    {/* hub aura + concentric guides */}
                    <circle cx={CX} cy={CY} r={R - 46} fill={`url(#${uid}-hub)`} />
                    <circle
                      cx={CX}
                      cy={CY}
                      r={R}
                      fill="none"
                      stroke={hexA(accent, isDark ? 0.28 : 0.22)}
                      strokeWidth={16}
                    />
                    <circle
                      cx={CX}
                      cy={CY}
                      r={R + 30}
                      fill="none"
                      stroke={ink.hairline}
                      strokeWidth={1}
                      strokeDasharray="2 10"
                    />
                    <circle
                      cx={CX}
                      cy={CY}
                      r={R - 74}
                      fill="none"
                      stroke={ink.hairline}
                      strokeWidth={1}
                    />

                    {/* momentum arcs — one per hand-off, arrow lands on next node */}
                    {list.map((_, i) => {
                      const a = (i + GAP) / n;
                      const b = (i + 1 - GAP) / n;
                      const p1 = pt(a);
                      const p2 = pt(b);
                      return (
                        <path
                          key={`arc-${i}`}
                          d={`M ${p1.x} ${p1.y} A ${R} ${R} 0 0 1 ${p2.x} ${p2.y}`}
                          fill="none"
                          stroke={`url(#${uid}-arc)`}
                          strokeWidth={7}
                          strokeLinecap="round"
                          markerEnd={`url(#${uid}-tip)`}
                        />
                      );
                    })}

                    {/* spokes from hub to each node */}
                    {list.map((_, i) => {
                      const inner = pt(i / n, R - 74);
                      const outer = pt(i / n, R - NODE / 2 - 6);
                      return (
                        <line
                          key={`spoke-${i}`}
                          x1={inner.x}
                          y1={inner.y}
                          x2={outer.x}
                          y2={outer.y}
                          stroke={hexA(accent, isDark ? 0.4 : 0.3)}
                          strokeWidth={1.5}
                          strokeDasharray="3 6"
                        />
                      );
                    })}
                  </svg>

                  {/* hub */}
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center"
                    style={{
                      width: (R - 74) * 2 - 24,
                      height: (R - 74) * 2 - 24,
                      borderRadius: "50%",
                      ...moduleCardSurface(accent, mode, { radius: 9999, emphasis: 1.1 }),
                      padding: fillPx(28, "plate"),
                    }}
                  >
                    <div
                      style={{
                        fontSize: fillPx(13, "kicker"),
                        fontWeight: 700,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: accentText,
                      }}
                    >
                      {s(c.hubKicker, "Flywheel hub")}
                    </div>
                    <div
                      className="mt-2"
                      style={{
                        fontSize: fillPx(30, "figure"),
                        fontWeight: 600,
                        lineHeight: 1.12,
                        letterSpacing: "-0.02em",
                        color: ink.strong,
                      }}
                    >
                      {s(c.hub, "Program")}
                    </div>
                    {s(c.hubNote) && (
                      <div
                        className="mt-2"
                        style={{
                          fontSize: fillPx(15, "kicker"),
                          lineHeight: 1.35,
                          color: ink.muted,
                          maxWidth: 200,
                        }}
                      >
                        {s(c.hubNote)}
                      </div>
                    )}
                  </div>

                  {/* node chips */}
                  {list.map((it, i) => {
                    const p = pt(i / n);
                    return (
                      <div
                        key={`node-${i}`}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{ left: p.x, top: p.y, width: NODE, height: NODE }}
                      >
                        <div
                          className="flex h-full w-full items-center justify-center rounded-full"
                          style={{
                            background: isDark ? "rgba(8,6,40,0.72)" : "#ffffff",
                            border: `2px solid ${hexA(accent, isDark ? 0.7 : 0.55)}`,
                            boxShadow: isDark
                              ? `0 0 0 8px ${hexA(accent, 0.08)}`
                              : `0 12px 28px -18px ${hexA(accent, 0.55)}, 0 0 0 8px ${hexA(accent, 0.07)}`,
                            backdropFilter: "blur(10px)",
                          }}
                        >
                          <IconBadge
                            brand={brand}
                            label={s(it.label)}
                            index={i}
                            size="md"
                            override={s(it.icon)}
                            sizeToken={s(it.iconSize)}
                            treatment="glyph"
                          />
                        </div>
                        <div
                          className="absolute -right-1 -top-1 flex items-center justify-center rounded-full"
                          style={{
                            width: 26,
                            height: 26,
                            background: accentText,
                            color: isDark ? "#06052a" : "#ffffff",
                            fontSize: fillPx(13, "kicker"),
                            fontWeight: 700,
                            letterSpacing: "0.02em",
                          }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Ledger ────────────────────────────────────────────── */}
                <div className="flex flex-col gap-4">
                  {s(c.subtitle) && (
                    <div
                      style={{
                        fontSize: fillPx(21, "body"),
                        lineHeight: 1.4,
                        color: ink.muted,
                        maxWidth: 640,
                      }}
                    >
                      {s(c.subtitle)}
                    </div>
                  )}
                  {list.map((it, i) => (
                    <div
                      key={`row-${i}`}
                      className="flex items-start gap-5 px-6 py-5"
                      style={moduleCardSurface(accent, mode, { radius: 18 })}
                    >
                      <AccentTick accent={accent} radius={18} />
                      <SlideNumeral
                        value={i + 1}
                        sizePx={34}
                        color={accentText}
                        className="shrink-0"
                        style={{ width: 52 }}
                      />
                      <div className="min-w-0">
                        <div
                          style={{
                            fontSize: fillPx(23, "body"),
                            fontWeight: 600,
                            letterSpacing: "-0.015em",
                            color: ink.strong,
                          }}
                        >
                          {s(it.label)}
                        </div>
                        {s(it.note) && (
                          <div
                            className="mt-1"
                            style={{ fontSize: 16.5, lineHeight: 1.4, color: ink.muted }}
                          >
                            {s(it.note)}
                          </div>
                        )}
                      </div>
                      {s(it.metric) && (
                        <div
                          className="ml-auto shrink-0 self-center"
                          style={{
                            fontSize: fillPx(26, "body"),
                            fontWeight: 700,
                            letterSpacing: "-0.02em",
                            color: accentText,
                          }}
                        >
                          {s(it.metric)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SlideFrame>
        );
      }

      case "MV-MATURITY-CURVE": {
        const items = arr(c.items);
        const n = Math.max(items.length, 2);
        // Reserve generous horizontal padding so the leftmost/rightmost labels
        // never get clipped, and vertical padding for stage-label + note lines.
        const PAD_X = 200;
        const PAD_TOP = 90;
        const PAD_BOT = 110;
        const W = 1760;
        const H = 520;
        const curveId = `mc-fill-${variant.id}`;
        const glowId = `mc-glow-${variant.id}`;
        const gradId = `mc-line-${variant.id}`;
        const primary = brand.tokens.primary;
        // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
        // is too deep to read as text or as a hairline, so lift it onto the
        // shared accentInk ramp. Light mode is unchanged.
        const accent = accentInk(brand.tokens.accent, mode, 4.5);
        // Anchor left/right, sinusoidal ease so the S-curve reads as a real
        // maturity ramp rather than a straight diagonal.
        const px = (i: number) => PAD_X + (i / (n - 1)) * (W - PAD_X * 2);
        const py = (i: number) => {
          const t = i / (n - 1);
          const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
          return PAD_TOP + (1 - eased) * (H - PAD_TOP - PAD_BOT) * 0.9 + (H - PAD_BOT) * 0.05;
        };
        const points = items.map((_, i) => ({ x: px(i), y: py(i) }));
        const path = points
          .map((p, i) => {
            if (i === 0) return `M ${p.x} ${p.y}`;
            const prev = points[i - 1];
            const mx = (prev.x + p.x) / 2;
            return `C ${mx} ${prev.y} ${mx} ${p.y} ${p.x} ${p.y}`;
          })
          .join(" ");
        const areaPath = `${path} L ${points[points.length - 1]?.x ?? W - PAD_X} ${H - PAD_BOT} L ${points[0]?.x ?? PAD_X} ${H - PAD_BOT} Z`;
        const currentIdx = items.findIndex((it) => Boolean(it.current));
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            {s(c.subtitle) && (
              <div
                className="mt-10 max-w-[1080px]"
                style={{ fontSize: fillPx(22, "body"), lineHeight: 1.4, color: ink.muted }}
              >
                {s(c.subtitle)}
              </div>
            )}
            <div className="mt-10">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor={primary} stopOpacity={0.55} />
                    <stop offset="55%" stopColor={primary} />
                    <stop offset="100%" stopColor={accent} />
                  </linearGradient>
                  <linearGradient id={curveId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={isDark ? 0.28 : 0.2} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                  <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="6" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {/* Baseline & tick guides */}
                {Array.from({ length: 4 }, (_, i) => {
                  const y = PAD_TOP + ((H - PAD_TOP - PAD_BOT) / 3) * i;
                  return (
                    <line
                      key={i}
                      x1={PAD_X}
                      y1={y}
                      x2={W - PAD_X}
                      y2={y}
                      stroke={ink.axis}
                      strokeDasharray={i === 3 ? "0" : "2 8"}
                      strokeWidth={1}
                    />
                  );
                })}
                {/* Y-axis frame labels */}
                <text
                  x={PAD_X - 24}
                  y={PAD_TOP + 6}
                  textAnchor="end"
                  fontSize={16}
                  letterSpacing="0.28em"
                  fill={ink.faint}
                  style={{ textTransform: "uppercase", fontWeight: 600 }}
                >
                  High
                </text>
                <text
                  x={PAD_X - 24}
                  y={H - PAD_BOT + 6}
                  textAnchor="end"
                  fontSize={16}
                  letterSpacing="0.28em"
                  fill={ink.faint}
                  style={{ textTransform: "uppercase", fontWeight: 600 }}
                >
                  Low
                </text>
                {/* Curve fill under-glow */}
                <path d={areaPath} fill={`url(#${curveId})`} />
                {/* Curve stroke */}
                <path
                  d={path}
                  fill="none"
                  stroke={`url(#${gradId})`}
                  strokeWidth={5}
                  strokeLinecap="round"
                  filter={`url(#${glowId})`}
                />
                {/* Nodes */}
                {items.map((it, i) => {
                  const current = Boolean(it.current) || i === currentIdx;
                  const p = points[i];
                  const isFirst = i === 0;
                  const isLast = i === n - 1;
                  const anchor: "start" | "middle" | "end" = isFirst
                    ? "start"
                    : isLast
                      ? "end"
                      : "middle";
                  const labelX = isFirst ? p.x - 6 : isLast ? p.x + 6 : p.x;
                  const noteX = labelX;
                  const label = s(it.label);
                  const note = s(it.note);
                  return (
                    <g key={i}>
                      {current && <circle cx={p.x} cy={p.y} r={26} fill={accent} opacity={0.18} />}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={current ? 14 : 9}
                        fill={current ? accent : ink.ringOnDark}
                        stroke={current ? accent : primary}
                        strokeWidth={current ? 0 : 3}
                      />
                      {current && <circle cx={p.x} cy={p.y} r={5} fill={ink.ringOnDark} />}
                      <text
                        x={labelX}
                        y={p.y - 32}
                        textAnchor={anchor}
                        fontSize={28}
                        fontWeight={700}
                        fill={ink.strong}
                        style={{ letterSpacing: "-0.015em" }}
                      >
                        {label}
                      </text>
                      {note && (
                        <text
                          x={noteX}
                          y={H - PAD_BOT + 40}
                          textAnchor={anchor}
                          fontSize={18}
                          fill={ink.muted}
                        >
                          {note}
                        </text>
                      )}
                      {current && (
                        <text
                          x={p.x}
                          y={p.y + 44}
                          textAnchor="middle"
                          fontSize={13}
                          fontWeight={700}
                          fill={accent}
                          style={{ letterSpacing: "0.32em", textTransform: "uppercase" }}
                        >
                          You are here
                        </text>
                      )}
                    </g>
                  );
                })}
                {/* X-axis kicker */}
                <text
                  x={PAD_X}
                  y={H - 14}
                  fontSize={13}
                  letterSpacing="0.32em"
                  fill={ink.faint}
                  style={{ textTransform: "uppercase", fontWeight: 700 }}
                >
                  {s(c.axisLabel, "Program maturity")}
                </text>
              </svg>
            </div>
          </SlideFrame>
        );
      }

      case "MV-JOURNEY-MAP": {
        const items = arr(c.items);
        const n = Math.max(items.length, 2);
        const W = 1600,
          H = 260;
        const points = items.map((it, i) => {
          const x = 60 + (i / (n - 1)) * (W - 120);
          const sent = Math.max(1, Math.min(5, Number(it.sentiment ?? 3)));
          const y = H - ((sent - 1) / 4) * (H - 40) - 20;
          return { x, y, it };
        });
        const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className="mt-10">
              <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                {items.map((it, i) => (
                  <div
                    key={i}
                    className="pb-5"
                    style={{ borderBottom: `2px solid ${brand.tokens.accent}` }}
                  >
                    <div className="flex items-center gap-3">
                      <IconBadge
                        brand={brand}
                        label={s(it.phase)}
                        index={i}
                        size="sm"
                        override={s(it.icon)}
                        sizeToken={s(it.iconSize)}
                        treatment="soft-circle"
                      />
                      <Kicker brand={brand}>Phase {String(i + 1).padStart(2, "0")}</Kicker>
                    </div>
                    <div
                      className="mt-2"
                      style={{
                        fontSize: fillPx(28, "body"),
                        fontWeight: 600,
                        color: ink.strong,
                        letterSpacing: "-0.015em",
                      }}
                    >
                      {s(it.phase)}
                    </div>
                    <div
                      className="mt-2"
                      style={{ fontSize: fillPx(18, "body"), color: ink.muted, lineHeight: 1.4 }}
                    >
                      {s(it.touchpoint)}
                    </div>
                  </div>
                ))}
              </div>
              <svg viewBox={`0 0 ${W} ${H + 40}`} className="mt-8 w-full">
                <path d={path} fill="none" stroke={ink.strong} strokeWidth={3} />
                {points.map((p, i) => (
                  <g key={i}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={11}
                      fill="var(--slide-accent-text)"
                      stroke="#fff"
                      strokeWidth={3}
                    />
                    <text
                      x={p.x}
                      y={p.y - 20}
                      textAnchor="middle"
                      fontSize={18}
                      fontWeight={600}
                      fill={ink.strong}
                    >
                      {String(p.it.sentiment ?? "")}/5
                    </text>
                  </g>
                ))}
                <text
                  x={20}
                  y={20}
                  fontSize={14}
                  fill={ink.faint}
                  style={{ letterSpacing: "0.28em", textTransform: "uppercase" }}
                >
                  High
                </text>
                <text
                  x={20}
                  y={H}
                  fontSize={14}
                  fill={ink.faint}
                  style={{ letterSpacing: "0.28em", textTransform: "uppercase" }}
                >
                  Low
                </text>
              </svg>
            </div>
          </SlideFrame>
        );
      }

      case "MV-LOGO-WALL": {
        const items = arr(c.items);
        const cols = items.length <= 8 ? 4 : items.length <= 10 ? 5 : 6;
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div
              className="mt-14 grid"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {items.map((it, i) => {
                const name = s(it.name);
                const initials = name
                  .split(/\s+/)
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <div
                    key={i}
                    className="flex aspect-[4/3] items-center justify-center"
                    style={{
                      borderRight: (i + 1) % cols === 0 ? "none" : `1px solid ${ink.divider}`,
                      borderBottom: `1px solid ${ink.divider}`,
                      borderTop: i < cols ? `1px solid ${ink.divider}` : "none",
                      borderLeft: i % cols === 0 ? `1px solid ${ink.divider}` : "none",
                    }}
                  >
                    {pickLogoForMode(it, mode) || s(it.logoPath) ? (
                      <ClientLogoImg
                        path={s(it.logoPath)}
                        url={pickLogoForMode(it, mode)}
                        alt={name}
                        className="max-h-16 max-w-[70%] object-contain"
                        style={{ opacity: 0.9 }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div
                          style={{
                            fontSize: fillPx(44, "figure"),
                            fontWeight: 600,
                            color: ink.strong,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {initials || "—"}
                        </div>
                        <div
                          className="uppercase"
                          style={{
                            fontSize: fillPx(14, "kicker"),
                            letterSpacing: "0.28em",
                            color: ink.faint,
                          }}
                        >
                          {name}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SlideFrame>
        );
      }

      case "MV-MATRIX-2X2": {
        const quadrants = strs(c.quadrants);
        const target = Number(c.target ?? 0);
        const items = arr(c.items);
        const S = 720;
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className="mt-8 grid gap-10" style={{ gridTemplateColumns: "1fr 320px" }}>
              <div className="relative" style={{ height: S }}>
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                  {[0, 1, 2, 3].map((q) => {
                    const isTarget = q + 1 === target;
                    return (
                      <div
                        key={q}
                        className="flex items-start justify-start p-6"
                        style={{
                          border: `1px solid ${ink.hairline}`,
                          background: isTarget
                            ? `${hexA(brand.tokens.accent, 0.078)}`
                            : "transparent",
                        }}
                      >
                        <div
                          className="uppercase"
                          style={{
                            fontSize: fillPx(16, "body"),
                            letterSpacing: "0.28em",
                            color: isTarget ? "var(--slide-accent-text)" : ink.faint,
                            fontWeight: 600,
                          }}
                        >
                          {quadrants[q] ?? `Q${q + 1}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {items.map((it, i) => {
                  const x = Math.max(0.05, Math.min(0.95, Number(it.x ?? 0.5))) * S;
                  const y = (1 - Math.max(0.05, Math.min(0.95, Number(it.y ?? 0.5)))) * S;
                  return (
                    <div
                      key={i}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: x, top: y }}
                    >
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{
                          background: brand.tokens.primary,
                          boxShadow: `0 0 0 4px ${brand.tokens.primary}22`,
                        }}
                      />
                      <div
                        className="mt-2 whitespace-nowrap"
                        style={{
                          fontSize: fillPx(18, "body"),
                          fontWeight: 600,
                          color: ink.strong,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {s(it.label)}
                      </div>
                    </div>
                  );
                })}
                <div
                  className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 uppercase"
                  style={{
                    fontSize: fillPx(16, "body"),
                    letterSpacing: "0.28em",
                    color: "var(--slide-accent-text)",
                    fontWeight: 600,
                  }}
                >
                  {s(c.axisY)}
                </div>
                <div
                  className="absolute -bottom-8 left-1/2 -translate-x-1/2 uppercase"
                  style={{
                    fontSize: fillPx(16, "body"),
                    letterSpacing: "0.28em",
                    color: "var(--slide-accent-text)",
                    fontWeight: 600,
                  }}
                >
                  {s(c.axisX)}
                </div>
              </div>
              <div className="flex flex-col justify-center gap-6">
                <Kicker brand={brand}>Reading</Kicker>
                <div style={{ fontSize: fillPx(22, "body"), lineHeight: 1.45, color: ink.body }}>
                  Position on <b>{s(c.axisX)}</b> and <b>{s(c.axisY)}</b>. The tinted quadrant is
                  where the program should live.
                </div>
              </div>
            </div>
          </SlideFrame>
        );
      }

      case "MV-ICEBERG": {
        const above = arr(c.above);
        const below = arr(c.below);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div className="mt-8">
              <div
                className="grid gap-8"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(above.length, 2)}, minmax(0, 1fr))`,
                }}
              >
                {above.map((it, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-3">
                      <IconBadge
                        brand={brand}
                        label={s(it.label)}
                        index={i}
                        size="sm"
                        override={s(it.icon)}
                        sizeToken={s(it.iconSize)}
                        treatment="glyph"
                      />
                      <Kicker brand={brand}>Visible</Kicker>
                    </div>
                    <div
                      className="mt-3"
                      style={{
                        fontSize: fillPx(28, "body"),
                        fontWeight: 600,
                        color: ink.strong,
                        letterSpacing: "-0.015em",
                      }}
                    >
                      {s(it.label)}
                    </div>
                    <div
                      className="mt-2"
                      style={{ fontSize: fillPx(20, "body"), lineHeight: 1.42, color: ink.body }}
                    >
                      {s(it.body)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="my-10 flex items-center gap-6">
                <div className="h-[2px] flex-1" style={{ background: brand.tokens.accent }} />
                <div
                  className="uppercase"
                  style={{
                    fontSize: fillPx(18, "body"),
                    letterSpacing: "0.28em",
                    color: "var(--slide-accent-text)",
                    fontWeight: 600,
                  }}
                >
                  Waterline — {s(c.waterline, "what leadership sees")}
                </div>
                <div className="h-[2px] flex-1" style={{ background: brand.tokens.accent }} />
              </div>
              <div
                className="grid gap-8"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(Math.min(below.length, 3), 2)}, minmax(0, 1fr))`,
                }}
              >
                {below.map((it, i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden p-6"
                    style={moduleCardTint(brand.tokens.accent, mode)}
                  >
                    <AccentTick accent={brand.tokens.accent} />
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className="uppercase"
                        style={{
                          fontSize: fillPx(14, "kicker"),
                          letterSpacing: "0.28em",
                          color: ink.faint,
                          fontWeight: 600,
                        }}
                      >
                        Hidden
                      </div>
                      <IconBadge
                        brand={brand}
                        label={s(it.label)}
                        index={i}
                        size="sm"
                        override={s(it.icon)}
                        sizeToken={s(it.iconSize)}
                        treatment="soft-tile"
                      />
                    </div>
                    <div
                      className="mt-3"
                      style={{
                        fontSize: fillPx(24, "body"),
                        fontWeight: 600,
                        color: ink.strong,
                        letterSpacing: "-0.015em",
                      }}
                    >
                      {s(it.label)}
                    </div>
                    <div
                      className="mt-2"
                      style={{ fontSize: fillPx(18, "body"), lineHeight: 1.42, color: ink.body }}
                    >
                      {s(it.body)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SlideFrame>
        );
      }

      // ── Advanced variants — BATCH 2 ─────────────────────────────────────

      default:
        return null;
    }
  },
});

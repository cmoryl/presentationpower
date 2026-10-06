// Advanced diagram family — the bento value/close spread, the KPI dashboard
// grid, roadmap quarters, funnel, flywheel, maturity curve, journey map, logo
// wall, 2x2 matrix and iceberg. Extracted from the legacy `VariantRenderer`
// switch onto the module registry so this heavier geometry has one owner.

import React from "react";
import { PageOrientContext } from "@/components/slide/PageFit";
import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, obj, s, strs, truthy, type Item } from "../module-kit";
import { IconBadge, MediaTile, Sparkline, pickKitIcon } from "../module-primitives";
import { Kicker, SlideNumeral, StatFigure, Hairline, DisplayTitle, sameWords } from "../primitives";
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
import { MapPin } from "lucide-react";
import { Donut, FillTile, Figure, GlassPanel, INFO_FILL, Pictogram, RadialBars, IsoCity, numOf, pctOf, type InfoFill } from "./infographic-kit";

type IconType = typeof Sparkles;

/**
 * Break a caption into <=`maxLines` lines of at most `perLine` characters.
 * SVG <text> never wraps on its own, so any long caption inside a chart has to
 * be split before it is drawn or it runs straight through its neighbours.
 */
function wrapSvgText(text: string, perLine: number, maxLines: number): string[] {
  const clean = String(text ?? "").trim();
  if (!clean) return [];
  const lines: string[] = [];
  let line = "";
  for (const word of clean.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= perLine) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    const consumed = lines.join(" ").length;
    if (consumed < clean.length) {
      lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[\s,.;:]+$/, "")}…`;
    }
  }
  return lines;
}

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

        // Factual mode: only the slide's own figures. No invented sparklines or
        // trend deltas; rings fill exactly to a stated percentage, and every
        // tile keeps its body copy. Groups carry their own heading.
        const groups = arr(c.groups);
        if (groups.length) {
          const gA = arr(groups[0]?.items);
          const gB = arr(groups[1]?.items);
          const surf = (extra: React.CSSProperties = {}): React.CSSProperties => ({
            ...moduleCardSurface(brand.tokens.accent, isDark ? "dark" : "light", { radius: 22 }),
            position: "relative",
            overflow: "hidden",
            minWidth: 0,
            ...extra,
          });
          const kick = (txt: string) => (
            <div
              className="uppercase font-mono"
              style={{
                fontSize: fillPx(13, "kicker"),
                letterSpacing: "0.26em",
                color: "var(--slide-accent-text)",
                fontWeight: 600,
              }}
            >
              {txt}
            </div>
          );
          const big = (v: string, px: number) => (
            <div
              className="tabular-nums"
              style={{
                fontSize: fillPx(px, "display"),
                lineHeight: 0.86,
                fontWeight: 700,
                letterSpacing: "-0.05em",
                color: ink.strong,
              }}
            >
              {v}
            </div>
          );
          const lab = (v: string, px = 22) => (
            <div style={{ fontSize: fillPx(px, "body"), fontWeight: 600, color: ink.strong }}>{v}</div>
          );
          const bod = (v: string) =>
            v ? (
              <div style={{ fontSize: fillPx(17, "body"), lineHeight: 1.4, color: ink.strong, opacity: 0.85 }}>{v}</div>
            ) : null;
          // Count glyphs: exactly N marks for a stated whole number (accurate, not a trend).
          const marks = (n: number, cols: number, size: number, round: boolean) => (
            <div
              aria-hidden
              className="grid"
              style={{ gridTemplateColumns: `repeat(${cols}, ${size}px)`, gap: Math.round(size * 0.45) }}
            >
              {Array.from({ length: n }).map((_, k) => (
                <span
                  key={k}
                  style={{
                    width: size,
                    height: size,
                    borderRadius: round ? size : 3,
                    background: `color-mix(in oklab, var(--slide-accent-text) ${45 + Math.round((k / Math.max(n - 1, 1)) * 55)}%, transparent)`,
                  }}
                />
              ))}
            </div>
          );
          void marks;
          void surf;
          void bod;
          const blue = isDark ? "#7FB0FF" : INFO_FILL.blue.bg;
          const ringCols = [blue, isDark ? INFO_FILL.aqua.bg : "#03002C", INFO_FILL.lavender.bg];
          const heroA = gA[0];
          const restA = gA.slice(1, 3);
          // Thin tick ruler — exactly N ticks for a stated whole number.
          const ruler = (n: number, h: number, col: string) => (
            <div aria-hidden className="flex items-end" style={{ gap: 6, height: h }}>
              {Array.from({ length: Math.min(40, Math.round(n)) }).map((_, k, a) => (
                <span key={k} style={{ width: 3, flexShrink: 0, height: `${k % 5 === 4 ? 100 : 55}%`, borderRadius: 2, background: col, opacity: 0.35 + (k / Math.max(1, a.length - 1)) * 0.65 }} />
              ))}
            </div>
          );
          return (
            <SlideFrame brand={brand} pageNumber={pageNumber}>
              <SlideTitle brand={brand} title={s(c.title, variant.name)} />
              {s(c.subtitle) && (
                <div className="mt-3" style={{ fontSize: fillPx(24, "body"), color: ink.body }}>{s(c.subtitle)}</div>
              )}
              <div className="slide-fill-stretch mt-8 grid min-h-0 gap-x-16" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr)" }}>
                <section className="flex min-h-0 flex-col justify-center gap-8">
                  {kick(s(groups[0]?.label))}
                  {heroA && (
                    <div>
                      <div className="flex items-end gap-6">
                        <Figure value={s(heroA.value)} px={190} color={ink.strong} gradient={`linear-gradient(100deg, ${ink.strong} 30%, ${blue} 80%, ${INFO_FILL.lavender.bg})`} />
                        <div style={{ fontSize: fillPx(26, "body"), fontWeight: 650, color: ink.strong, paddingBottom: 22 }}>{s(heroA.label)}</div>
                      </div>
                      <div className="mt-4" style={{ height: 150, maxWidth: 560 }}>
                        <IsoCity
                          towers={Array.from({ length: Math.max(1, Math.min(40, Math.round(numOf(s(heroA.value))))) }, (_, k, arr) => ({ value: k + 1, color: `color-mix(in oklab, ${blue} ${Math.round(100 - (k / Math.max(1, arr.length - 1)) * 55)}%, ${INFO_FILL.lavender.bg})` }))}
                          mode="linear"
                          maxHeight={4}
                          foot={0.55}
                          gapTiles={0.12}
                          unit={20}
                          ground={blue}
                          glow={false}
                        />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 pt-7" style={{ borderTop: `1px solid ${ink.hairline}` }}>
                    {restA.map((it, i) => (
                      <div key={i} className="flex flex-col gap-2" style={{ paddingLeft: i ? 32 : 0, borderLeft: i ? `1px solid ${ink.hairline}` : undefined }}>
                        <Figure value={s(it.value)} px={80} color={ink.strong} />
                        {lab(s(it.label), 20)}
                        <div className="mt-2" style={{ height: 120, width: 200 }}>
                          <IsoCity towers={[{ value: numOf(s(it.value)), color: i === 0 ? INFO_FILL.lavender.bg : blue }]} mode="linear" max={Math.max(...restA.map((r) => numOf(s(r.value))))} maxHeight={3} foot={1.6} ground={blue} />
                        </div>
                        {s(it.body) && <div style={{ fontSize: fillPx(15, "body"), color: ink.muted, lineHeight: 1.35 }}>{s(it.body)}</div>}
                      </div>
                    ))}
                  </div>
                </section>
                <section className="flex min-h-0 flex-col justify-center gap-6 pl-16" style={{ borderLeft: `1px solid ${ink.hairline}` }}>
                  {kick(s(groups[1]?.label))}
                  <div className="flex items-center gap-12">
                    <RadialBars
                      rings={gB.slice(0, 3).map((it, i) => ({ pct: pctOf(s(it.value)) ?? 0, color: ringCols[i]! }))}
                      size={400}
                      stroke={28}
                      gap={12}
                      sweep={300}
                      track={ink.hairline}
                    >
                      <div className="text-center" style={{ color: ink.muted, fontSize: fillPx(13, "body"), letterSpacing: "0.2em" }}>
                        0 — 100%
                      </div>
                    </RadialBars>
                    <div className="flex min-w-0 flex-1 flex-col gap-7">
                      {gB.slice(0, 3).map((it, i) => (
                        <div key={i} className="pl-5" style={{ borderLeft: `3px solid ${ringCols[i]}` }}>
                          <div className="flex items-baseline gap-4">
                            <Figure value={s(it.value)} px={60} color={ink.strong} />
                            {lab(s(it.label), 22)}
                          </div>
                          {s(it.body) && (
                            <div style={{ fontSize: fillPx(15, "body"), lineHeight: 1.4, color: ink.body, marginTop: 6 }}>{s(it.body)}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </SlideFrame>
          );
        }

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
                // Imported/seeded tiles often repeat the label in the unit
                // slot ("Markets live" / "Cost / word"), which printed the same
                // words twice on one tile. A unit that just restates the label
                // carries no information, so drop it.
                const rawTileUnit = s(it.unit);
                const unit = sameWords(rawTileUnit, label) ? "" : rawTileUnit;
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
                    // Each roadmap row emits a label cell plus one cell per
                    // quarter; the fragment needs the key, not its children.
                    <React.Fragment key={`row-${i}`}>
                      <div
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
                    </React.Fragment>
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
        if (s(c.display) === "dial" && items.length >= 2) {
          // Circular spectrum: ordered stages wrap a 270° gauge, segments
          // thicken and brighten as quality (and cost) rises.
          const acc = accentInk(brand.tokens.accent, mode, 4.5);
          const N = items.length;
          const CX = 880, CY = 440, R0 = 210;
          const A0 = 135, SPAN = 270, GAP = 3;
          const rad = (d: number) => ((d - 90) * Math.PI) / 180;
          const pt = (r: number, d: number) => [CX + r * Math.cos(rad(d + 90)), CY + r * Math.sin(rad(d + 90))];
          const seg = (r1: number, r2: number, a: number, b: number) => {
            const [x1, y1] = pt(r2, a), [x2, y2] = pt(r2, b), [x3, y3] = pt(r1, b), [x4, y4] = pt(r1, a);
            const lg = b - a > 180 ? 1 : 0;
            return `M${x1} ${y1} A${r2} ${r2} 0 ${lg} 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 ${lg} 0 ${x4} ${y4}Z`;
          };
          const step = SPAN / N;
          const DAQ = "#7FE3F5", DLV = "#C2A3FF", DBL = "#7FB3F5";
          const mix = (i: number) => {
            // blue → aqua → lavender along the dial
            const t = i / (N - 1);
            return t < 0.5 ? (t < 0.25 ? DBL : DAQ) : t < 0.75 ? DAQ : DLV;
          };
          const arcPath = (r: number, a: number, b: number) => {
            const [x1, y1] = pt(r, a), [x2, y2] = pt(r, b);
            return `M${x1} ${y1} A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x2} ${y2}`;
          };
          const uid = `dial-${variant.id}`;
          const labelInk = isDark ? "#FFFFFF" : ink.strong;
          return (
            <SlideFrame brand={brand} pageNumber={pageNumber}>
              <SlideTitle brand={brand} title={s(c.title, variant.name)} />
              <svg data-export-text data-portrait-crop viewBox="0 0 1760 800" className="mt-4 w-full flex-1" style={{ overflow: "visible" }} aria-label={s(c.subtitle)}>
                <defs>
                  <linearGradient id={`${uid}-g`} x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0" stopColor={isDark ? DBL : acc} />
                    <stop offset="0.5" stopColor={isDark ? DAQ : acc} />
                    <stop offset="1" stopColor={isDark ? DLV : acc} />
                  </linearGradient>
                  <radialGradient id={`${uid}-hub`} cx="50%" cy="45%" r="60%">
                    <stop offset="0" stopColor={isDark ? DLV : acc} stopOpacity={isDark ? 0.28 : 0.14} />
                    <stop offset="0.6" stopColor={isDark ? DBL : acc} stopOpacity={isDark ? 0.1 : 0.05} />
                    <stop offset="1" stopColor={isDark ? DBL : acc} stopOpacity={0} />
                  </radialGradient>
                  <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="7" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                {/* Hub glow + glass disc */}
                <circle cx={CX} cy={CY} r={R0 + 60} fill={`url(#${uid}-hub)`} />
                <circle cx={CX} cy={CY} r={R0 - 34} fill={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,63,199,0.04)"} stroke={isDark ? "rgba(255,255,255,0.18)" : ink.axis} strokeWidth={1.5} />
                <circle cx={CX} cy={CY} r={R0 - 52} fill="none" stroke={`url(#${uid}-g)`} strokeOpacity={0.55} strokeWidth={1.6} strokeDasharray="1 7" strokeLinecap="round" />
                {/* Outer rings: faint full + partial arcs */}
                <path d={arcPath(R0 + 124, A0, A0 + SPAN)} fill="none" stroke={`url(#${uid}-g)`} strokeOpacity={0.35} strokeWidth={1.5} />
                <path d={arcPath(R0 + 140, A0 + 20, A0 + 120)} fill="none" stroke={`url(#${uid}-g)`} strokeOpacity={0.3} strokeWidth={1.2} />
                <path d={arcPath(R0 + 140, A0 + 170, A0 + 250)} fill="none" stroke={`url(#${uid}-g)`} strokeOpacity={0.3} strokeWidth={1.2} />
                <path d={arcPath(R0 - 14, A0 + 10, A0 + SPAN - 10)} fill="none" stroke={`url(#${uid}-g)`} strokeOpacity={0.45} strokeWidth={2} />
                {/* Tick marks */}
                {Array.from({ length: 55 }, (_, k) => {
                  const d = A0 + (k / 54) * SPAN;
                  const [x1, y1] = pt(R0 + 114, d), [x2, y2] = pt(R0 + (k % 9 === 0 ? 104 : 110), d);
                  return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={isDark ? "rgba(255,255,255,0.35)" : ink.axis} strokeWidth={k % 9 === 0 ? 2 : 1} />;
                })}
                {items.map((it, i) => {
                  const a = A0 + i * step + GAP / 2, b = A0 + (i + 1) * step - GAP / 2;
                  const t = 34 + (i / (N - 1)) * 70;
                  const mid = (a + b) / 2;
                  const [nx, ny] = pt(R0 + t / 2, mid);
                  const [dx, dy] = pt(R0 + t + 6, mid);
                  const [ex, ey] = pt(R0 + 132, mid);
                  const col = isDark ? mix(i) : acc;
                  const words = s(it.label).split(" ");
                  const lines: string[] = [];
                  for (const w of words) {
                    const l = lines[lines.length - 1];
                    if (l && (l + " " + w).length <= 16) lines[lines.length - 1] = l + " " + w;
                    else lines.push(w);
                  }
                  // Upper call-outs stack their lines toward the hub, so push them
                  // out by their block height to sit clear of the outer rings.
                  const [, py] = pt(R0 + 156, mid);
                  const vert = Math.max(0, (CY - py) / (R0 + 156));
                  const [lx, ly] = pt(R0 + 156 + vert * (24 + lines.length * 26), mid);
                  const right = lx > CX + 20, left = lx < CX - 20;
                  const op = 0.35 + (0.65 * i) / (N - 1);
                  return (
                    <g key={i}>
                      <path d={seg(R0, R0 + t, a, b)} fill={col} opacity={op * 0.55} filter={`url(#${uid}-glow)`} />
                      <path d={seg(R0, R0 + t, a, b)} fill={col} opacity={op} stroke={isDark ? "rgba(255,255,255,0.35)" : "none"} strokeWidth={1} />
                      <line x1={dx} y1={dy} x2={ex} y2={ey} stroke={col} strokeOpacity={0.7} strokeWidth={1.5} strokeDasharray="2 4" />
                      <circle cx={ex} cy={ey} r={5} fill={col} />
                      <circle cx={ex} cy={ey} r={2} fill={isDark ? "#03002C" : "#FFFFFF"} />
                      <text x={nx} y={ny + 8} textAnchor="middle" fontSize={24} fontWeight={800} fill={isDark ? "#03002C" : i > N / 2 ? "#FFFFFF" : ink.strong}>
                        {String(i + 1).padStart(2, "0")}
                      </text>
                      <text x={lx} y={ly - ((lines.length - 1) * 30) / 2 + 10} textAnchor={right ? "start" : left ? "end" : "middle"} fontSize={28} fontWeight={600} fill={labelInk}>
                        {lines.map((l, k) => (
                          <tspan key={k} x={lx} dy={k ? 32 : 0}>{l}</tspan>
                        ))}
                      </text>
                    </g>
                  );
                })}
                <text x={CX} y={CY - 10} textAnchor="middle" fontSize={48} fontWeight={800} fill={labelInk}>Quality</text>
                <rect x={CX - 40} y={CY + 8} width={50} height={3} rx={1.5} fill={isDark ? DAQ : acc} />
                <rect x={CX + 14} y={CY + 8} width={26} height={3} rx={1.5} fill={isDark ? DLV : acc} opacity={isDark ? 1 : 0.5} />
                <text x={CX} y={CY + 48} textAnchor="middle" fontSize={24} fill={isDark ? "rgba(255,255,255,0.75)" : ink.muted}>{s(c.subtitle)}</text>
                <text x={pt(R0 + 50, A0)[0] - 10} y={pt(R0 + 50, A0)[1] + 50} textAnchor="middle" fontSize={20} fontWeight={700} letterSpacing="0.2em" fill={isDark ? DBL : ink.muted}>LOW</text>
                <text x={pt(R0 + 50, A0 + SPAN)[0] + 10} y={pt(R0 + 50, A0 + SPAN)[1] + 50} textAnchor="middle" fontSize={20} fontWeight={700} letterSpacing="0.2em" fill={isDark ? DLV : ink.muted}>HIGH</text>
              </svg>
            </SlideFrame>
          );
        }
        const n = Math.max(items.length, 2);
        // Reserve generous horizontal padding so the leftmost/rightmost labels
        // never get clipped, and vertical padding for stage-label + note lines.
        const PAD_X = 200;
        const PAD_TOP = 90;
        // Bottom padding carries the axis baseline, the wrapped note band and
        // the axis kicker. 110 put the first note straight through the "Low"
        // frame label and the "You are here" badge.
        const PAD_BOT = 152;
        // Tall page: the same curve drawn on a narrower, much taller canvas so
        // it fills the sheet instead of a thin band across the top.
        const tall = React.useContext(PageOrientContext) === "portrait";
        const W = tall ? 1160 : 1760;
        const H = tall ? 1000 : 520;
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
        // Characters that fit on one note line inside one column band, at 16px.
        const noteColWidth = (W - PAD_X * 2) / Math.max(1, n - 1);
        const noteColChars = Math.max(14, Math.floor((noteColWidth * 0.92) / 8));
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
              <svg data-portrait-crop viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }}>
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
                  // Exactly ONE node is "here": seeded content often flags every
                  // level, which printed "YOU ARE HERE" five times.
                  const current = currentIdx >= 0 ? i === currentIdx : false;
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
                  // SVG text does not wrap, so an un-wrapped note ran the full
                  // width of the plot and every level's note printed on top of
                  // the next. Each note now wraps inside its own column band.
                  // "A · B · C" lists stack one entry per line so neighbouring
                  // stages with several content types never run together.
                  const noteParts = note.split(/\s+·\s+/).filter(Boolean);
                  const noteLines =
                    noteParts.length > 1
                      ? noteParts.flatMap((part) => wrapSvgText(part, noteColChars, 2)).slice(0, 5)
                      : wrapSvgText(note, noteColChars, 3);
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
                      {(() => {
                        // Many stages share the width: shrink and wrap each
                        // label inside its own column band so neighbours never
                        // print over one another.
                        const fs = n > 5 ? 22 : 28;
                        const chars = Math.max(8, Math.floor((noteColWidth * 0.95) / (fs * 0.55)));
                        const lines = n > 4 ? wrapSvgText(label, chars, 3) : [label];
                        return lines.map((ln, li) => (
                          <text
                            key={li}
                            x={labelX}
                            y={p.y - 32 - (lines.length - 1 - li) * (fs + 4)}
                            textAnchor={anchor}
                            fontSize={fs}
                            fontWeight={700}
                            fill={ink.strong}
                            style={{ letterSpacing: "-0.015em" }}
                          >
                            {ln}
                          </text>
                        ));
                      })()}
                      {noteLines.length > 0 &&
                        noteLines.map((line, li) => (
                          <text
                            key={li}
                            x={noteX}
                            y={H - PAD_BOT + 58 + li * 22}
                            textAnchor={anchor}
                            fontSize={16}
                            fill={ink.muted}
                          >
                            {line}
                          </text>
                        ))}
                      {current && (
                        // Low-sitting nodes are close to the baseline and the
                        // note band, so the badge flips above its stage label.
                        <text
                          x={p.x}
                          y={p.y > PAD_TOP + (H - PAD_TOP - PAD_BOT) * 0.55 ? p.y - 70 : p.y + 44}
                          textAnchor={anchor}
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
                {/* Sits just above the baseline at the right so stacked
                    stage notes below never collide with it. */}
                <text
                  x={W - PAD_X - 24}
                  y={H - PAD_BOT - 16}
                  textAnchor="end"
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
        const AQ = "#7FE3F5", LV = "#C2A3FF", BL = "#5B9BFF";
        const clamp = (v: unknown) => Math.max(0.04, Math.min(0.96, Number(v ?? 0.5)));
        const heroIdx = items.findIndex((it) => truthy(it.highlight) || /globallink/i.test(s(it.label)));
        const ranked = items.map((it, i) => ({ it, i })).sort((a, b) => Number(b.it.y ?? 0) - Number(a.it.y ?? 0));
        const dotCol = isDark ? BL : brand.tokens.accent;
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div data-portrait="stack-one" className="mt-8 grid gap-12" style={{ gridTemplateColumns: "1fr 340px" }}>
              <div className="relative ml-14" style={{ height: S }}>
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 overflow-hidden rounded-[22px]" style={{ border: `1px solid ${isDark ? "rgba(255,255,255,0.14)" : ink.hairline}` }}>
                  {[0, 1, 2, 3].map((q) => {
                    const isTarget = q + 1 === target;
                    return (
                      <div
                        key={q}
                        className="relative flex items-start justify-start p-6"
                        style={{
                          borderRight: q % 2 === 0 ? `1px solid ${isDark ? "rgba(255,255,255,0.12)" : ink.hairline}` : undefined,
                          borderBottom: q < 2 ? `1px solid ${isDark ? "rgba(255,255,255,0.12)" : ink.hairline}` : undefined,
                          background: isTarget
                            ? isDark
                              ? "radial-gradient(120% 120% at 100% 0%, rgba(194,163,255,0.30) 0%, rgba(91,155,255,0.16) 45%, rgba(255,255,255,0.03) 100%)"
                              : hexA(brand.tokens.accent, 0.09)
                            : isDark ? "rgba(255,255,255,0.025)" : "transparent",
                        }}
                      >
                        {isTarget && isDark && <div aria-hidden className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${hexA(accentInk(brand.tokens.accent, "dark"), 0)}, ${accentInk(brand.tokens.accent, "dark")}, ${hexA(accentInk(brand.tokens.accent, "dark"), 0)})` }} />}
                        <div
                          className="uppercase"
                          style={{
                            fontSize: fillPx(isTarget ? 18 : 15, "body"),
                            letterSpacing: "0.28em",
                            color: isTarget ? (isDark ? "#FFFFFF" : "var(--slide-accent-text)") : isDark ? "rgba(255,255,255,0.55)" : ink.faint,
                            fontWeight: isTarget ? 700 : 600,
                          }}
                        >
                          {quadrants[q] ?? `Q${q + 1}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {items.map((it, i) => {
                  const hero = i === heroIdx;
                  const x = clamp(it.x) * 100;
                  const y = (1 - clamp(it.y)) * 100;
                  const d = hero ? 30 : 12;
                  return (
                    <div key={i} className="absolute" style={{ left: `${x}%`, top: `${y}%`, zIndex: hero ? 3 : 2 }}>
                      {hero ? (
                        <svg aria-hidden width={120} height={120} viewBox="0 0 120 120" className="absolute" style={{ left: -60, top: -60 }}>
                          <defs>
                            <linearGradient id="mx-hero" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={AQ} /><stop offset="1" stopColor={LV} /></linearGradient>
                            <radialGradient id="mx-glow"><stop offset="0" stopColor={AQ} stopOpacity="0.55" /><stop offset="1" stopColor={AQ} stopOpacity="0" /></radialGradient>
                          </defs>
                          <circle cx={60} cy={60} r={58} fill="url(#mx-glow)" />
                          <circle cx={60} cy={60} r={40} fill="none" stroke="url(#mx-hero)" strokeWidth={1.2} opacity={0.5} />
                          <circle cx={60} cy={60} r={32} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1} strokeDasharray="0.6 3" />
                          <path d="M 60 34 A 26 26 0 0 1 86 60" fill="none" stroke="url(#mx-hero)" strokeWidth={3} strokeLinecap="round" />
                          <path d="M 60 86 A 26 26 0 0 1 34 60" fill="none" stroke="url(#mx-hero)" strokeWidth={3} strokeLinecap="round" />
                          <circle cx={60} cy={60} r={d / 2} fill="#FFFFFF" />
                          <circle cx={60} cy={60} r={d / 2 - 6} fill={BL} />
                        </svg>
                      ) : (
                        <div className="absolute rounded-full" style={{ width: d, height: d, left: -d / 2, top: -d / 2, background: dotCol, opacity: 0.85, boxShadow: `0 0 0 4px ${hexA(dotCol, 0.16)}` }} />
                      )}
                      <div
                        className="absolute whitespace-nowrap"
                        style={{
                          left: hero ? 44 : 12,
                          top: hero ? -16 : -11,
                          fontSize: fillPx(hero ? 26 : 17, "body"),
                          fontWeight: hero ? 800 : 500,
                          color: hero ? ink.strong : isDark ? "rgba(255,255,255,0.75)" : ink.body,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {s(it.label)}
                      </div>
                    </div>
                  );
                })}
                {/* Axes with arrows, outside the grid so they never collide with quadrant labels */}
                <svg aria-hidden className="absolute" style={{ left: -44, top: 0, height: S, width: 20, overflow: "visible" }}>
                  <defs><linearGradient id="mx-ay" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={AQ} stopOpacity="0.15" /><stop offset="1" stopColor={AQ} /></linearGradient></defs>
                  <line x1={10} y1={S} x2={10} y2={8} stroke="url(#mx-ay)" strokeWidth={2} />
                  <path d="M 3 16 L 10 4 L 17 16" fill="none" stroke={AQ} strokeWidth={2} strokeLinejoin="round" />
                </svg>
                <div className="absolute uppercase whitespace-nowrap" style={{ left: -78, top: "50%", transform: "translate(-50%, -50%) rotate(-90deg)", transformOrigin: "center", fontSize: fillPx(15, "body"), letterSpacing: "0.28em", color: isDark ? "#FFFFFF" : "var(--slide-accent-text)", fontWeight: 600, marginLeft: 0 }}>
                  {s(c.axisY)}
                </div>
                <svg aria-hidden className="absolute" style={{ left: 0, top: S + 16, width: "100%", height: 20, overflow: "visible" }}>
                  <defs><linearGradient id="mx-ax" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={LV} stopOpacity="0.15" /><stop offset="1" stopColor={LV} /></linearGradient></defs>
                  <line x1="0" y1={10} x2="99.5%" y2={10} stroke="url(#mx-ax)" strokeWidth={2} />
                </svg>
                <div className="absolute" style={{ right: -2, top: S + 16 + 3, width: 0, height: 0, borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderLeft: `12px solid ${LV}` }} />
                <div className="absolute left-1/2 -translate-x-1/2 uppercase" style={{ top: S + 40, fontSize: fillPx(15, "body"), letterSpacing: "0.28em", color: isDark ? "#FFFFFF" : "var(--slide-accent-text)", fontWeight: 600 }}>
                  {s(c.axisX)}
                </div>
              </div>
              <div className="flex flex-col justify-center gap-3">
                <div className="mb-2 uppercase" style={{ fontSize: fillPx(14, "body"), letterSpacing: "0.28em", fontWeight: 600, color: isDark ? "rgba(255,255,255,0.6)" : ink.faint }}>
                  {s(c.axisY)}
                </div>
                {ranked.map(({ it, i }, r) => {
                  const hero = i === heroIdx;
                  return (
                    <div key={i} className="flex items-center gap-4 rounded-xl px-4" style={{ paddingTop: hero ? 12 : 5, paddingBottom: hero ? 12 : 5, background: hero ? (isDark ? "linear-gradient(110deg, rgba(127,227,245,0.18), rgba(194,163,255,0.10))" : hexA(brand.tokens.accent, 0.1)) : "transparent", border: hero ? `1px solid ${isDark ? "rgba(127,227,245,0.45)" : hexA(brand.tokens.accent, 0.4)}` : "1px solid transparent" }}>
                      <span className="tabular-nums" style={{ width: 28, fontSize: fillPx(15, "body"), fontWeight: 700, color: hero ? AQ : isDark ? "rgba(255,255,255,0.45)" : ink.faint }}>{String(r + 1).padStart(2, "0")}</span>
                      <span style={{ fontSize: fillPx(hero ? 22 : 17, "body"), fontWeight: hero ? 800 : 500, color: hero ? ink.strong : isDark ? "rgba(255,255,255,0.78)" : ink.body }}>{s(it.label)}</span>
                    </div>
                  );
                })}
                <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.14)" : ink.hairline}` }}>
                  <Kicker brand={brand}>{s(c.noteKicker, "Reading")}</Kicker>
                  <div className="mt-2" style={{ fontSize: fillPx(18, "body"), lineHeight: 1.4, color: ink.body }}>
                    {s(c.note) || `Position on ${s(c.axisX)} and ${s(c.axisY)}.`}
                  </div>
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

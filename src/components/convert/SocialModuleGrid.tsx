import { AdaptIcon, iconFor } from "./AdaptIcon";
// -----------------------------------------------------------------------------
// SocialModuleGrid — "Rebuilt for this size" for social cards when the module
// carries a set of cells (bento, cards, pillars, figures…).
//
// - Smarter grid: columns/rows are chosen from the cell count AND the card's
//   shape, so tiles stay close to a readable proportion with no empty cells.
// - Auto-fit text: every tile measures itself and scales its type up or down
//   until it fills its space without being cut.
// - Background: any approved template background (light or dark face).
// -----------------------------------------------------------------------------

import type { AdaptChart, AdaptImage } from "@/lib/cross-format-adapt";
import { MediaTile } from "@/components/slide/module-primitives";
import { moduleCardSurface } from "@/components/slide/flagship";
import { AdaptChartBlock } from "./AdaptChartBlock";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { BrandLockup } from "@/components/BrandLockup";
import { BRAND_MODES } from "@/lib/taxonomy";
import type { SocialFormat } from "@/lib/social-formats";
import { brandSystemDarkGround, brandSystemLightGround } from "@/lib/brand-system-template";

const INK = "#03002C";
const BLUE = "#003FC7";
const SURFACE = "#EEF1F7";

export type ConvertGround = { id: string; label: string; scene: string | null; dark: boolean };

/** Approved template backgrounds offered in the adaptor. */
export const CONVERT_GROUNDS: ConvertGround[] = [
  { id: "light-bento", label: "Template light · grid", scene: "bento", dark: false },
  { id: "light-cover", label: "Template light · cover", scene: "cover", dark: false },
  { id: "light-stats", label: "Template light · figures", scene: "stats", dark: false },
  { id: "light-section", label: "Template light · section", scene: "section", dark: false },
  { id: "light-closing", label: "Template light · closing", scene: "closing", dark: false },
  { id: "dark-bento", label: "Template dark · grid", scene: "bento", dark: true },
  { id: "dark-cover", label: "Template dark · cover", scene: "cover", dark: true },
  { id: "dark-closing", label: "Template dark · closing", scene: "closing", dark: true },
  { id: "white", label: "Plain white", scene: null, dark: false },
];

export function groundCss(g: ConvertGround, variantId: string, accent?: string): string {
  if (!g.scene) return "#FFFFFF";
  const seed = `scene:${g.scene} ${variantId}`;
  return g.dark ? brandSystemDarkGround(seed, accent) : brandSystemLightGround(seed, accent);
}

/** How many tiles each social size can hold legibly. */
export function socialGridCapacity(format: { width: number; height: number }) {
  const r = format.height / format.width;
  return r >= 1.6 ? 9 : 8;
}

type Tile = { kind: "stat"; value: string; label: string } | { kind: "text"; title: string; body: string };

function toTile(p: string): Tile {
  const m = /^([$€£]?[\d.,]+\s*(?:%|\+|x|×|[KMB])?)\s+(.+)$/.exec(p.trim());
  if (m && !p.includes(" — ")) return { kind: "stat", value: m[1].replace(/\s+/g, ""), label: m[2] };
  const i = p.indexOf(" — ");
  return i < 0 ? { kind: "text", title: p, body: "" } : { kind: "text", title: p.slice(0, i), body: p.slice(i + 3) };
}

/** Pick columns for n tiles in a w×h area: tiles near 1.4:1, fewest empty cells. */
export function pickGrid(n: number, w: number, h: number) {
  let best = { cols: 2, anchorCols: 2, anchorRows: 1, score: Infinity };
  for (let cols = 1; cols <= 4; cols++) {
    for (const [ac, ar] of [
      [Math.min(2, cols), 2],
      [cols, 1],
      [Math.min(2, cols), 1],
    ] as const) {
      if (ac > cols) continue;
      const cells = ac * ar + (n - 1);
      const rows = Math.ceil(cells / cols);
      const waste = rows * cols - cells;
      const ratio = w / cols / (h / rows);
      const score = Math.abs(Math.log(ratio / 1.4)) + waste * 0.35 + (rows > 5 ? 1 : 0);
      if (score < best.score) best = { cols, anchorCols: ac, anchorRows: ar, score };
    }
  }
  return best;
}

/** Scales its children's type so they fill the box without overflowing. */
function FitBox({ children, max = 1.8, deps }: { children: ReactNode; max?: number; deps: unknown[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fits = (s: number) => {
      el.style.setProperty("--fit", String(s));
      return el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
    };
    let lo = 0.35;
    let hi = max;
    for (let i = 0; i < 12; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) lo = mid;
      else hi = mid;
    }
    fits(lo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return (
    <div ref={ref} style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {children}
    </div>
  );
}

export type SocialModuleGridProps = {
  format: SocialFormat;
  brandId: string;
  variantId: string;
  headline: string;
  eyebrow?: string;
  points: string[];
  displayShortEdge: number;
  ground?: ConvertGround;
  chart?: AdaptChart;
  images?: AdaptImage[];
  pointIcons?: Record<string, string>;
};

export function SocialModuleGrid({
  format,
  brandId,
  variantId,
  headline,
  eyebrow,
  points,
  displayShortEdge,
  ground = CONVERT_GROUNDS[0],
  chart,
  images = [],
  pointIcons,
}: SocialModuleGridProps) {
  const brand = BRAND_MODES.find((b) => b.id === brandId) ?? BRAND_MODES[0];
  const W = format.width;
  const H = format.height;
  const short = Math.min(W, H);
  const scale = displayShortEdge / short;
  const pad = Math.round(short * 0.065);
  const gap = Math.round(short * 0.018);
  const f = short / 1080;
  const tiles = points.slice(0, socialGridCapacity(format)).map(toTile);
  const headH = H * (H / W >= 1.2 ? 0.2 : 0.24);
  const g = pickGrid(tiles.length, W - pad * 2, (H - pad * 2 - headH) * (chart ? 0.55 : 1));
  const cols = g.cols;
  const dark = ground.dark;
  const text = dark ? "#FFFFFF" : INK;
  const fitKey = [W, H, points.join("|"), headline, cols];

  return (
    <div style={{ width: Math.round(W * scale), height: Math.round(H * scale) }} className="relative overflow-hidden">
      <div
        data-kit-asset-frame="true"
        data-social-module-grid="true"
        style={{
          width: W,
          height: H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          background: groundCss(ground, variantId, brand.tokens.accent),
          backgroundColor: dark ? INK : "#FFFFFF",
          color: text,
          padding: pad,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: Math.round(gap * 1.6),
          fontFamily: "Geist, 'Geist Variable', sans-serif",
        }}
      >
        <div style={{ height: headH, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: gap * 2 }}>
          <div style={{ minWidth: 0, flex: 1, height: "100%" }}>
            <FitBox deps={fitKey} max={1.6}>
              {eyebrow ? (
                <div style={{ fontSize: `calc(20px * ${f} * var(--fit, 1))`, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.75, marginBottom: 10 * f }}>
                  {eyebrow}
                </div>
              ) : null}
              <div style={{ fontSize: `calc(52px * ${f} * var(--fit, 1))`, fontWeight: 700, lineHeight: 1.05 }}>{headline}</div>
            </FitBox>
          </div>
          <div style={{ flexShrink: 0 }}>
            <BrandLockup brand={brand} color={text} size="sm" showMark showDivision={false} monochromeOfficialLogo />
          </div>
        </div>
        {chart ? (
          <div style={{ flexShrink: 0 }}>
            <AdaptChartBlock chart={chart} width={W - pad * 2} height={Math.round((H - pad * 2 - headH) * (tiles.length ? 0.42 : 0.95))} fontPx={Math.round(22 * f)} dark={dark} />
          </div>
        ) : null}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridAutoRows: "1fr",
            gap,
          }}
        >
          {tiles.map((t, i) => {
            const anchor = i === 0;
            const used = g.anchorCols * g.anchorRows + tiles.length - 1;
            const gapCells = (cols - (used % cols)) % cols;
            const last = i === tiles.length - 1 && !anchor && gapCells > 0;
            const span = anchor
              ? { gridColumn: `span ${g.anchorCols}`, gridRow: `span ${g.anchorRows}` }
              : last
                ? { gridColumn: `span ${gapCells + 1}` }
                : {};
            const solid = anchor;
            const tileBg = solid ? (dark ? BLUE : INK) : dark ? "rgba(255,255,255,0.1)" : SURFACE;
            const tileInk = solid || dark ? "#FFFFFF" : INK;
            const img = t.kind === "text" ? images.find((m) => m.title && m.title.trim().toLowerCase() === t.title.trim().toLowerCase()) : undefined;
            if (img) {
              return (
                <div key={i} data-adapt-image="true" style={{ ...span, position: "relative", overflow: "hidden", minHeight: 0, minWidth: 0, borderTop: `${Math.round(6 * f)}px solid ${BLUE}` }}>
                  <MediaTile brand={brand} seed={img.seed} overrideUrl={img.url} className="absolute inset-0 h-full w-full rounded-none" />
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: Math.round(20 * f), background: "linear-gradient(to top, rgba(3,0,44,0.78), rgba(3,0,44,0))", color: "#FFFFFF", fontWeight: 700, fontSize: Math.round(24 * f) }}>{img.title}</div>
                </div>
              );
            }
            return (
              <div
                key={i}
                style={{
                  ...span,
                  ...(solid
                    ? { background: tileBg, borderTop: `${Math.round(6 * f)}px solid ${dark ? "#FFFFFF" : BLUE}`, borderRadius: Math.round(22 * f) }
                    : {
                        ...moduleCardSurface(BLUE, dark ? "dark" : "light", { radius: Math.round(22 * f) }),
                        backgroundColor: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.55)",
                        boxShadow: `inset 0 ${Math.max(2, Math.round(4 * f))}px 0 0 ${BLUE}`,
                      }),
                  color: tileInk,
                  padding: Math.round(26 * f),
                  overflow: "hidden",
                  minHeight: 0,
                  minWidth: 0,
                }}
              >
                <FitBox deps={fitKey}>
                  <div
                    style={{
                      marginTop: t.kind === "stat" || anchor ? "auto" : 0,
                      marginBottom: t.kind === "stat" ? "auto" : 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: `calc(8px * ${f} * var(--fit, 1))`,
                    }}
                  >
                    {t.kind === "stat" ? (
                      <>
                        <div style={{ fontSize: `calc(${anchor ? 120 : 76}px * ${f} * var(--fit, 1))`, fontWeight: 700, lineHeight: 1, color: solid || dark ? "#FFFFFF" : BLUE }}>{t.value}</div>
                        <div style={{ fontSize: `calc(22px * ${f} * var(--fit, 1))`, lineHeight: 1.3, fontWeight: 500 }}>{t.label}</div>
                      </>
                    ) : (
                      <>
                        {(() => {
                          const ic = iconFor(pointIcons, points[i]);
                          return ic ? <AdaptIcon name={ic} label={t.title} size={Math.round((anchor ? 56 : 40) * f)} color={solid || dark ? "#FFFFFF" : BLUE} /> : null;
                        })()}
                        <div style={{ fontSize: `calc(${anchor ? 38 : 26}px * ${f} * var(--fit, 1))`, fontWeight: 700, lineHeight: 1.15 }}>{t.title}</div>
                        {t.body ? (
                          <div style={{ fontSize: `calc(${anchor ? 22 : 18}px * ${f} * var(--fit, 1))`, lineHeight: 1.4, opacity: 0.85 }}>{t.body}</div>
                        ) : null}
                      </>
                    )}
                  </div>
                </FitBox>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

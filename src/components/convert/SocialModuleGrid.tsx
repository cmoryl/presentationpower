// -----------------------------------------------------------------------------
// SocialModuleGrid — "Rebuilt for this size" for social cards when the module
// carries a set of cells (bento, cards, pillars, figures…). Rebuilds the
// module's grid natively at the social size: headline, an anchor tile, and
// supporting tiles (figures render as big numbers). Uses the carried-across
// copy, so edits in "Info to carry across" apply.
// -----------------------------------------------------------------------------

import { BrandLockup } from "@/components/BrandLockup";
import { BRAND_MODES } from "@/lib/taxonomy";
import type { SocialFormat } from "@/lib/social-formats";

const INK = "#03002C";
const BLUE = "#003FC7";
const SURFACE = "#EEF1F7";

export type SocialModuleGridProps = {
  format: SocialFormat;
  brandId: string;
  headline: string;
  eyebrow?: string;
  points: string[];
  displayShortEdge: number;
};

/** How many tiles each social size can hold legibly. */
export function socialGridCapacity(format: { width: number; height: number }) {
  const r = format.height / format.width;
  return r >= 1.6 ? 7 : r >= 1.2 ? 6 : 5;
}

type Tile = { kind: "stat"; value: string; label: string } | { kind: "text"; title: string; body: string };

function toTile(p: string): Tile {
  const m = /^([$€£]?[\d.,]+\s*(?:%|\+|x|×|[KMB])?)\s+(.+)$/.exec(p.trim());
  if (m && !p.includes(" — ")) return { kind: "stat", value: m[1].replace(/\s+/g, ""), label: m[2] };
  const i = p.indexOf(" — ");
  return i < 0 ? { kind: "text", title: p, body: "" } : { kind: "text", title: p.slice(0, i), body: p.slice(i + 3) };
}

export function SocialModuleGrid({ format, brandId, headline, eyebrow, points, displayShortEdge }: SocialModuleGridProps) {
  const brand = BRAND_MODES.find((b) => b.id === brandId) ?? BRAND_MODES[0];
  const W = format.width;
  const H = format.height;
  const short = Math.min(W, H);
  const scale = displayShortEdge / short;
  const pad = Math.round(short * 0.065);
  const gap = Math.round(short * 0.018);
  const tall = H / W >= 1.2;
  const tiles = points.slice(0, socialGridCapacity(format)).map(toTile);
  const cols = tall ? 2 : 3;
  const f = short / 1080;

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
          background: "#FFFFFF",
          color: INK,
          padding: pad,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: Math.round(gap * 1.6),
          fontFamily: "Geist, 'Geist Variable', sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap }}>
          <div style={{ minWidth: 0 }}>
            {eyebrow ? (
              <div style={{ fontSize: 22 * f, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#666666", marginBottom: 12 * f }}>
                {eyebrow}
              </div>
            ) : null}
            <div style={{ fontSize: (tall ? 64 : 56) * f, fontWeight: 700, lineHeight: 1.05 }}>{headline}</div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <BrandLockup brand={brand} color={INK} size="sm" showMark showDivision={false} monochromeOfficialLogo />
          </div>
        </div>
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
            const span = anchor ? { gridColumn: tall ? "1 / -1" : "span 2", gridRow: tall ? undefined : "span 2" } : {};
            const dark = anchor;
            return (
              <div
                key={i}
                style={{
                  ...span,
                  background: dark ? INK : SURFACE,
                  color: dark ? "#FFFFFF" : INK,
                  borderTop: `${Math.round(6 * f)}px solid ${BLUE}`,
                  padding: Math.round(28 * f),
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: t.kind === "stat" ? "center" : anchor ? "flex-end" : "flex-start",
                  gap: 10 * f,
                  overflow: "hidden",
                  minHeight: 0,
                }}
              >
                {t.kind === "stat" ? (
                  <>
                    <div style={{ fontSize: (anchor ? 150 : 88) * f, fontWeight: 700, lineHeight: 1, color: dark ? "#FFFFFF" : BLUE }}>{t.value}</div>
                    <div style={{ fontSize: 26 * f, lineHeight: 1.3, fontWeight: 500 }}>{t.label}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: (anchor ? 44 : 30) * f, fontWeight: 700, lineHeight: 1.15 }}>{t.title}</div>
                    {t.body ? (
                      <div
                        style={{
                          fontSize: (anchor ? 26 : 21) * f,
                          lineHeight: 1.4,
                          opacity: dark ? 0.85 : 0.8,
                          display: "-webkit-box",
                          WebkitLineClamp: anchor ? 5 : 4,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {t.body}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

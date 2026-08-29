// Bento mosaic family (MV-BENTO-5/6/7/8) — extracted from the legacy
// `VariantRenderer` switch onto the module registry.
//
// One engine, four densities. The anchor cell always sits top-left and spans
// two rows; every other cell is placed through an explicit grid-area mosaic so
// no density ever degrades into a plain equal grid. Media cells intentionally
// carry a SINGLE gradient scrim (not stacked translucent plates) so the PPTX
// exporter emits one alpha overlay object per tile.

import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, s } from "../module-kit";
import { IconBadge, MediaTile } from "../module-primitives";
import { Kicker, StatFigure } from "../primitives";
import { ICON_SIZES, type IconSizeToken } from "@/lib/iconography";
import { moduleCardSurface, AccentTick } from "../flagship";
import { fillPx } from "@/lib/open-space-fill";
import { itemTone, itemToneEnd, toneWashGradient } from "@/lib/item-tone";

/**
 * Per-cell studio controls the mosaic honours live: `tone` / `toneEnd` recolour
 * this cell's wash and accent tick, and `iconAlign` / `iconOffsetPct` nudge the
 * glyph inside its row without moving the copy. Unset cells render exactly as
 * before, so saved samples are untouched.
 */
function cellTone(it: Record<string, unknown>, accent: string) {
  const start = itemTone(it);
  return {
    accent: start ?? accent,
    wash: start ? toneWashGradient(start, itemToneEnd(it)) : undefined,
  };
}

function iconWellStyle(it: Record<string, unknown>) {
  const align = String(it.iconAlign ?? "center");
  const offset = Math.max(-40, Math.min(40, Number(it.iconOffsetPct ?? 0) || 0));
  return {
    alignItems: align === "top" ? "flex-start" : align === "bottom" ? "flex-end" : "center",
    transform: offset ? `translateY(${offset}%)` : undefined,
  } as const;
}

const MOSAIC: Record<number, { cols: string; rows: string; areas: string[] }> = {
  5: { cols: "1.5fr 1fr 1fr", rows: "1fr 1fr", areas: ['"a b c"', '"a d e"'] },
  6: {
    cols: "repeat(5, minmax(0, 1fr))",
    rows: "1fr 1fr",
    areas: ['"a a b c d"', '"a a e f d"'],
  },
  7: {
    cols: "repeat(6, minmax(0, 1fr))",
    rows: "1fr 1fr",
    areas: ['"a a b c d e"', '"a a f f g g"'],
  },
  8: {
    cols: "repeat(4, minmax(0, 1fr))",
    rows: "1fr 1fr 1fr",
    areas: ['"a a b c"', '"a a d e"', '"f f g h"'],
  },
};

registerSlideModule({
  id: "family:bento-mosaic",
  variantIds: ["MV-BENTO-5", "MV-BENTO-6", "MV-BENTO-7", "MV-BENTO-8"],
  cellControls: { tone: true, iconNudge: true },
  render: ({ variant, brand, pageNumber, c, ink, isDark }) => {
    const cellCount =
      variant.id === "MV-BENTO-8"
        ? 8
        : variant.id === "MV-BENTO-7"
          ? 7
          : variant.id === "MV-BENTO-6"
            ? 6
            : 5;
    const mosaic = MOSAIC[cellCount]!;
    // Denser mosaics step the type and padding down so cells never overflow.
    const k = cellCount >= 8 ? 0.84 : cellCount === 7 ? 0.89 : cellCount === 6 ? 0.94 : 1;
    const px = (n: number) => Math.round(n * k);
    const items = arr(c.items);
    const anchor = items[0] ?? {};
    const rest = items.slice(1, cellCount);
    const cellStyle = moduleCardSurface(brand.tokens.accent, isDark ? "dark" : "light", {
      radius: 22,
    });
    const pad = cellCount >= 7 ? "p-7" : cellCount === 6 ? "p-8" : "p-10";
    const cellClass = `flex flex-col ${pad}`;
    // Growing, centred content well: consumes the leftover height instead of
    // leaving it above the copy.
    const wellClass = "relative flex flex-1 flex-col justify-center";
    return (
      <SlideFrame brand={brand} pageNumber={pageNumber}>
        <SlideTitle brand={brand} title={s(c.title, variant.name)} />
        <div
          className="mt-10 grid gap-6"
          style={{
            gridTemplateColumns: mosaic.cols,
            gridTemplateRows: mosaic.rows,
            gridTemplateAreas: mosaic.areas.join(" "),
            height: 720,
          }}
        >
          <div
            className={cellClass}
            style={{
              ...cellStyle,
              gridArea: "a",
              backgroundImage: cellTone(anchor, brand.tokens.accent).wash ?? cellStyle.backgroundImage,
            }}
          >
            <AccentTick
              accent={cellTone(anchor, brand.tokens.accent).accent}
              height={3}
              radius={22}
            />
            <div
              className="pointer-events-none absolute"
              style={{
                inset: "-30% -40% auto -30%",
                height: "70%",
                background: `radial-gradient(60% 60% at 30% 20%, color-mix(in oklab, ${cellTone(anchor, brand.tokens.accent).accent} 22%, transparent), transparent 70%)`,
              }}
            />
            <div
              className="relative flex items-center gap-4"
              style={iconWellStyle(anchor)}
            >
              <IconBadge
                brand={brand}
                label={s(anchor.title)}
                index={0}
                size="md"
                override={s(anchor.icon)}
                sizeToken={s(anchor.iconSize)}
                treatment="soft-tile"
              />
              <Kicker brand={brand}>Anchor</Kicker>
              <span
                className="ml-auto tabular-nums"
                style={{
                  fontSize: fillPx(16, "body"),
                  letterSpacing: "0.24em",
                  color: ink.faint,
                }}
              >
                01
              </span>
            </div>
            <div className={`${wellClass} pt-8`}>
              <div
                style={{
                  height: 3,
                  width: 96,
                  marginBottom: 24,
                  backgroundImage: `linear-gradient(90deg, ${cellTone(anchor, brand.tokens.accent).accent}, transparent)`,
                }}
              />
              <div
                style={{
                  fontSize: px(46),
                  fontWeight: 650,
                  color: ink.strong,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.08,
                }}
              >
                {s(anchor.title)}
              </div>
              <div
                className="mt-5"
                style={{
                  fontSize: px(24),
                  lineHeight: 1.45,
                  color: "color-mix(in oklab, currentColor 70%, transparent)",
                }}
              >
                {s(anchor.body)}
              </div>
            </div>
          </div>
          {rest.map((it, i) => {
            const kind = s(it.kind, "body");
            const idx = String(i + 2).padStart(2, "0");
            // b, c, d, … in mosaic order.
            const area = String.fromCharCode(98 + i);
            if (kind === "media") {
              return (
                <div key={i} style={{ ...cellStyle, gridArea: area }}>
                  <AccentTick
                    accent={cellTone(it, brand.tokens.accent).accent}
                    height={3}
                    radius={22}
                  />
                  <MediaTile
                    brand={brand}
                    seed={s(it.mediaSeed, s(it.title, `bento-${i}`))}
                    overrideUrl={s(it.mediaUrl)}
                    fit={s(it.mediaFit) || undefined}
                    focus={s(it.mediaFocus) || undefined}
                    mediaPath={s(it.mediaPath) || undefined}
                    zoom={Number(it.mediaZoom) || undefined}
                    className="absolute inset-0 h-full w-full rounded-none"
                  />
                  {/* Single gradient scrim — the export decomposer collapses this
                      into one alpha overlay object instead of stacked plates. */}
                  <div
                    className="absolute inset-x-0 bottom-0"
                    style={{
                      height: "58%",
                      backgroundImage:
                        "linear-gradient(to top, rgba(3,0,44,0.82), rgba(3,0,44,0.28) 55%, transparent)",
                    }}
                  />
                  <div className="absolute inset-x-8 bottom-8">
                    <div
                      style={{
                        height: 2,
                        width: 56,
                        marginBottom: 12,
                        backgroundImage: `linear-gradient(90deg, ${cellTone(it, brand.tokens.accent).accent}, transparent)`,
                      }}
                    />
                    <div
                      className="uppercase"
                      style={{
                        fontSize: px(18),
                        letterSpacing: "0.26em",
                        color: "#FFFFFF",
                      }}
                    >
                      {s(it.title)}
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div
                key={i}
                className={cellClass}
                style={{
                  ...cellStyle,
                  gridArea: area,
                  backgroundImage: cellTone(it, brand.tokens.accent).wash ?? cellStyle.backgroundImage,
                }}
              >
                <AccentTick
                  accent={cellTone(it, brand.tokens.accent).accent}
                  height={3}
                  radius={22}
                />
                <div className="flex items-center gap-4" style={iconWellStyle(it)}>
                  <IconBadge
                    brand={brand}
                    label={s(kind === "stat" ? it.label : it.title)}
                    index={i + 1}
                    size={
                      (ICON_SIZES as Record<string, unknown>)[s(it.iconSize)]
                        ? (s(it.iconSize) as IconSizeToken)
                        : "sm"
                    }
                    override={s(it.icon)}
                    sizeToken={s(it.iconSize)}
                    treatment="soft-tile"
                  />
                  <span
                    className="ml-auto tabular-nums"
                    style={{
                      fontSize: fillPx(15, "kicker"),
                      letterSpacing: "0.24em",
                      color: ink.faint,
                    }}
                  >
                    {idx}
                  </span>
                </div>
                {kind === "stat" ? (
                  <div className={wellClass}>
                    <StatFigure
                      brand={brand}
                      value={s(it.value)}
                      unit={s(it.unit)}
                      size="sm"
                      shape="column"
                      progress={0.72}
                      icon={s(it.icon)}
                      iconSize={s(it.iconSize)}
                    />
                    <div
                      className="mt-4 uppercase"
                      style={{ fontSize: px(16), letterSpacing: "0.2em", color: ink.muted }}
                    >
                      {s(it.label)}
                    </div>
                  </div>
                ) : (
                  <div className={wellClass}>
                    <div
                      style={{
                        fontSize: px(28),
                        fontWeight: 620,
                        color: ink.strong,
                        letterSpacing: "-0.018em",
                        lineHeight: 1.15,
                      }}
                    >
                      {s(it.title)}
                    </div>
                    <div
                      className="mt-3"
                      style={{ fontSize: px(20), lineHeight: 1.42, color: ink.muted }}
                    >
                      {s(it.body)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SlideFrame>
    );
  },
});

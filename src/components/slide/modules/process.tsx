// Process family — extracted from the legacy `VariantRenderer` switch onto the
// module registry. Step rails, chains and spotlights share one owner here so a
// connector or seam change lands across every process module at once.

import { AlertTriangle, ChevronsDown } from "lucide-react";
import { registerSlideModule } from "../module-registry";
import {
  MediaTile,
  NumberedList,
  SlideFrame,
  SlideTitle,
  arr,
  obj,
  s,
  truthy,
} from "../module-kit";
import { ProcessRail } from "../Connectors";
import { SummaryBand, readSummary } from "../SummaryBand";
import { accentInk } from "@/lib/accent-tokens";
import { iconByName } from "@/lib/icon-library";
import { fillPx } from "@/lib/open-space-fill";
import {
  cardWashGradient,
  openBottomFrame,
  orbitNodePositions,
  SEAM_HEIGHT_PX,
  SEAM_TICK_INSET_PCT,
  SUMMARY_BAND,
} from "@/lib/surface-tokens";

registerSlideModule({
  id: "family:process",
  variantIds: [
    "MV-PROC-TIMELINE",
    "MV-PROC-STEP-CHAIN",
    "MV-PROC-PHASES",
    "MV-PROC-STEP-SPOTLIGHT",
  ],
  render: ({ variant, brand, pageNumber, c, mode, ink, accentTone }) => {
    switch (variant.id) {
    case "MV-PROC-TIMELINE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="slide-fill-stretch relative mt-24 flex flex-col">
            {/* Brand process rail at node baseline */}
            <ProcessRail
              accent={brand.tokens.accent}
              thickness={2}
              arrow
              style={{ left: 0, right: 32, top: 8, width: "auto" }}
            />
            <div
              className="slide-fill-stretch grid gap-10"
              style={{
                gridTemplateColumns: `repeat(${Math.max(arr(c.items).length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {arr(c.items).map((it, i) => (
                <div key={i} className="flex h-full flex-col justify-between gap-3 pr-8">
                  {/* Refined node — small precise dot on the rule */}
                  <div className="relative mb-8" style={{ height: 18 }}>
                    <div
                      className="absolute left-0"
                      style={{
                        top: 3,
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        backgroundColor: brand.tokens.accent,
                        boxShadow: `0 0 0 4px ${brand.tokens.surface}`,
                      }}
                    />
                  </div>
                  <div
                    className="mb-3 uppercase tabular-nums"
                    style={{
                      fontSize: fillPx(18, "body"),
                      letterSpacing: "0.28em",
                      color: "var(--slide-accent-text)",
                      fontWeight: 600,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div
                    style={{
                      fontSize: fillPx(30, "figure"),
                      fontWeight: 600,
                      color: ink.strong,
                      letterSpacing: "-0.015em",
                      lineHeight: 1.15,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  <div
                    className="mt-4"
                    style={{
                      fontSize: fillPx(22, "body"),
                      lineHeight: 1.4,
                      color: "color-mix(in oklab, currentColor 72%, transparent)",
                    }}
                  >
                    {s(it.body)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-PROC-STEP-CHAIN": {
      // Up to nine connected steps on one rail. Each tile shows its index by
      // default; `item.icon` swaps the number for a mark. `item.highlight`
      // flags a step in the tertiary pop and surfaces `item.note` beneath it.
      const steps = arr(c.items).slice(0, 9);
      const count = Math.max(steps.length, 1);
      // Tiles cap at these widths on the full 1920 canvas but are free to shrink
      // fluidly on narrower stages via container-query units below.
      const tile = count >= 8 ? 108 : count >= 6 ? 132 : 168;
      const gap = count >= 8 ? 12 : 20;
      // Column width as a share of the row container, so every size below can be
      // expressed as `min(<fluid cqw>, <cap px>)` and never overlap its neighbour.
      const colCqw = 100 / count;
      const fluid = (share: number, cap: number) =>
        `min(${(colCqw * share).toFixed(3)}cqw, ${Math.round(cap)}px)`;
      // ---- Global type scale -------------------------------------------------
      // Numerals, titles and sub-text are sized from FIXED px baselines (not the
      // per-count tile width) so a 3-step chain and a 9-step chain read at the
      // same weight. The `cqw` term only kicks in on genuinely narrow stages,
      // where it keeps neighbours from colliding.
      const typeK = (raw: unknown, fallback = 100) => {
        const n = Number(raw);
        return (Number.isFinite(n) && n > 0 ? Math.max(50, Math.min(200, n)) : fallback) / 100;
      };
      const numeralK = typeK(c.stepNumeralPct);
      const titleK = typeK(c.stepTitlePct);
      const bodyK = typeK(c.stepBodyPct);
      const NUMERAL_BASE = 56;
      const TITLE_BASE = 23;
      const BODY_BASE = 17;
      const glyphSize = (mult: number) => fluid(0.52 * mult, NUMERAL_BASE * numeralK * mult);
      const titleSize = fluid(0.19 * titleK, TITLE_BASE * titleK);
      const bodySize = fluid(0.155 * bodyK, BODY_BASE * bodyK);
      const hasNote = steps.some((it) => truthy(it.highlight) && s(it.note));

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          {/* Tagged intro items: the title leads, then every step lands on its
              own beat (see slide-intro.ts "steps" recipe) so the sequence reads
              as discrete moves rather than one soft wash. */}
          <div data-intro-item="" data-intro-step={0}>
            <SlideTitle brand={brand} title={s(c.title)} />
          </div>
          <div className="relative mt-20 @container">
            <div
              className="grid items-start"
              style={{
                gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
                columnGap: gap,
              }}
            >
              {steps.map((it, i) => {
                const flagged = truthy(it.highlight);
                const StepIcon = it.icon ? iconByName(s(it.icon)) : null;
                // Per-step glyph size token, matching the Studio icon stepper.
                const stepIconK =
                  (
                    { xs: 0.6, sm: 0.8, md: 1, lg: 1.25, xl: 1.6, display: 2.2 } as Record<
                      string,
                      number
                    >
                  )[String(it.iconSize ?? "md")] ?? 1;
                // Flagged steps break out of the division accent into the brand
                // pink pop so the risk point reads instantly.
                // Mode-aware tone: raw pink/blue is unreadable as ink or hairline on
                // the dark ground, so both flavours ride the accentInk ramp.
                const line = flagged ? accentInk("#EC388A", mode, 3) : accentTone;
                return (
                  <div
                    key={i}
                    data-intro-item=""
                    data-intro-step={i + 1}
                    className="relative flex flex-col items-center text-center"
                  >
                    {/* Connector segment — drawn ONLY in the gutter between two
                        tile edges, never underneath or across a tile/glyph, and
                        faded at both tails per the house connector style. */}
                    {i > 0 && (
                      <div
                        aria-hidden
                        data-decorative
                        data-chain-connector=""
                        className="absolute"
                        style={{
                          top: `calc(${fluid(1.45, tile * 1.45)} * 0.5)`,
                          right: `calc(50% + ${fluid(0.5, tile / 2)})`,
                          left: `calc(-50% - ${gap}px + ${fluid(0.5, tile / 2)})`,
                          height: 1,
                          backgroundImage: `linear-gradient(90deg, color-mix(in oklab, ${brand.tokens.accent} 6%, transparent) 0%, color-mix(in oklab, ${brand.tokens.accent} 42%, transparent) 50%, color-mix(in oklab, ${brand.tokens.accent} 6%, transparent) 100%)`,
                        }}
                      />
                    )}
                    <div
                      data-step-tile=""
                      className="relative flex justify-center"
                      style={{
                        width: fluid(1, tile),
                        height: fluid(1.45, tile * 1.45),
                      }}
                    >
                      {/* Card wash — top-lit accent gradient dissolving into the
                          ground, matching moduleCardSurface. */}
                      <div
                        className="absolute inset-0"
                        style={{
                          borderRadius: `min(22px, 13%)`,
                          backgroundImage: cardWashGradient(line),
                        }}
                      />
                      {/* Hairline frame, masked so BOTH the bottom edge and the
                          lower thirds of the side rails fade out — no closed box
                          line anywhere along the bottom of the gradient. */}
                      <div
                        aria-hidden
                        data-decorative
                        className="absolute inset-0"
                        style={openBottomFrame(line, "min(22px, 13%)")}
                      />
                      {/* Accent seam across the top edge + inner top highlight,
                          the same signature the other module cards carry. */}
                      <div
                        aria-hidden
                        data-decorative
                        className="absolute"
                        style={{
                          top: 0,
                          left: `${SEAM_TICK_INSET_PCT}%`,
                          right: `${SEAM_TICK_INSET_PCT}%`,
                          height: SEAM_HEIGHT_PX,
                          borderRadius: SEAM_HEIGHT_PX,
                          backgroundImage: `linear-gradient(90deg, transparent 0%, ${line} 50%, transparent 100%)`,
                          opacity: flagged ? 0.95 : 0.7,
                        }}
                      />

                      {/* Fixed-height glyph well: the number/icon is centered
                          inside it so per-step icon sizes never shift the copy.
                          `iconAlign` / `iconOffsetPct` nudge the glyph inside the
                          well without touching the tile frame itself. */}
                      <div
                        data-icon-well=""
                        className="absolute left-0 right-0 flex justify-center"
                        style={{
                          top: "16%",
                          height: "62%",
                          alignItems:
                            String(it.iconAlign ?? "center") === "top"
                              ? "flex-start"
                              : String(it.iconAlign ?? "center") === "bottom"
                                ? "flex-end"
                                : "center",
                          transform: `translateY(${Math.max(
                            -40,
                            Math.min(40, Number(it.iconOffsetPct ?? 0) || 0),
                          )}%)`,
                        }}
                      >
                        {StepIcon ? (
                          <StepIcon
                            size={Math.round(NUMERAL_BASE * numeralK * 0.86 * stepIconK)}
                            strokeWidth={1.6}
                            color={line}
                            aria-hidden
                            style={{
                              width: glyphSize(0.86 * stepIconK),
                              height: glyphSize(0.86 * stepIconK),
                            }}
                          />
                        ) : (
                          <span
                            className="tabular-nums"
                            style={{
                              fontSize: glyphSize(stepIconK),
                              fontWeight: 800,
                              color: line,
                              letterSpacing: "-0.04em",
                              lineHeight: 1,
                            }}
                          >
                            {i + 1}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reserved title band keeps sub-text baselines aligned even
                        when one step's label wraps to two lines. */}
                    <div
                      data-step-copy=""
                      className="mt-6 flex items-start justify-center"
                      style={{
                        width: fluid(1, tile),
                        minHeight: "2.4em",
                        fontSize: titleSize,
                        fontWeight: 600,
                        lineHeight: 1.2,
                        letterSpacing: "-0.01em",
                        color: flagged ? line : ink.strong,
                      }}
                    >
                      {s(it.label)}
                    </div>
                    {s(it.body) && (
                      <div
                        data-step-copy=""
                        style={{
                          width: fluid(1, tile),
                          fontSize: bodySize,
                          lineHeight: 1.35,
                          color: "color-mix(in oklab, currentColor 66%, transparent)",
                        }}
                      >
                        {s(it.body)}
                      </div>
                    )}

                    {flagged && s(it.note) && (
                      <div className="mt-5 flex flex-col items-center">
                        <div
                          aria-hidden
                          style={{
                            width: 1,
                            height: 28,
                            backgroundColor: `color-mix(in oklab, ${line} 60%, transparent)`,
                          }}
                        />
                        <AlertTriangle size={30} strokeWidth={1.7} color={line} aria-hidden />
                        <div
                          className="mt-3"
                          style={{
                            fontSize: fluid(0.17 * bodyK, 19 * bodyK),
                            fontWeight: 600,
                            lineHeight: 1.25,
                            color: line,
                          }}
                        >
                          {s(it.note)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Reserve space so a flagged callout never collides with the footer. */}
            {hasNote && <div style={{ height: 24 }} />}
            {/* Module-specific bottom content band — a single takeaway line that
                sits under the chain. Accepts either a plain `summary` string or
                `{ lead, emphasis }` so the second clause can pop in the accent.
                Geometry/type come from the shared SummaryBand component. */}
            {(() => {
              const sum = readSummary(c.summary);
              if (!sum.lead && !sum.emphasis) return null;
              return (
                <SummaryBand
                  data-intro-item=""
                  data-intro-step={count + 1}
                  data-step-summary=""
                  lead={sum.lead}
                  emphasis={sum.emphasis}
                  accent={brand.tokens.accent}
                  leadTone={ink.strong}
                  fontSize={fluid(0.26, SUMMARY_BAND.fontSize)}
                />
              );
            })()}
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROC-PHASES":
      return (
        <NumberedList
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items).map((it) => ({ title: s(it.label), body: s(it.body) }))}
        />
      );

    case "MV-PROC-STEP-SPOTLIGHT": {
      // One process step, spotlit. A circular media medallion carries the step
      // numeral on the left; the right column runs the hero step title over an
      // icon-led capability chain. House treatment throughout: accentInk tones,
      // hairline rings with faded tails, cardWashGradient tiles.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const rows = arr(c.items).slice(0, 5);
      const stepNo = s(c.stepNumber, String(Math.max(1, Number(c.stepIndex) || pageNumber || 1)));
      const rowCount = Math.max(rows.length, 1);
      const iconBox = rowCount > 4 ? 82 : 96;
      const labelSize = rowCount > 4 ? 34 : 40;

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div
            className="grid h-full items-center"
            style={{ gridTemplateColumns: "0.92fr 1.08fr", columnGap: 96 }}
          >
            {/* ── Numbered medallion ───────────────────────────────────── */}
            <div
              data-intro-item=""
              data-intro-step={0}
              className="relative mx-auto aspect-square w-full"
              style={{ maxWidth: 620 }}
            >
              {/* Outer orbit ring — one continuous hairline, no masked breaks
                  (the old conic mask read as several stacked arcs). */}
              <div
                aria-hidden
                data-decorative
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid color-mix(in oklab, ${accent} 40%, transparent)` }}
              />
              {/* Orbit nodes centred exactly on the ring. */}
              {orbitNodePositions(4, 26).map((pos, i) => (
                <div
                  key={i}
                  aria-hidden
                  data-decorative
                  className="absolute rounded-full"
                  style={{
                    ...pos,
                    width: 16,
                    height: 16,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: accent,
                  }}
                />
              ))}

              {/* Photo medallion. */}
              <div className="absolute overflow-hidden rounded-full" style={{ inset: "7%" }}>
                <MediaTile
                  brand={brand}
                  seed={s(c.mediaSeed, s(c.title, "step-spotlight"))}
                  overrideUrl={s(c.mediaUrl)}
                  mediaPath={s(c.mediaPath)}
                  fit={s(c.mediaFit) || undefined}
                  focus={s(c.mediaFocus) || undefined}
                  zoom={Number(c.mediaZoom) || undefined}
                  className="h-full w-full rounded-full"
                />
                {/* Accent duotone wash so the numeral always clears contrast. */}
                <div
                  aria-hidden
                  data-decorative
                  className="absolute inset-0 rounded-full"
                  style={{
                    backgroundImage: `linear-gradient(150deg, color-mix(in oklab, ${brand.tokens.primary} 62%, transparent) 0%, color-mix(in oklab, ${accent} 34%, transparent) 100%)`,
                  }}
                />
                <div
                  data-on-media
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    color: "#FFFFFF",
                    fontSize: fillPx(220, "display"),
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: "-0.05em",
                  }}
                >
                  {stepNo}
                </div>
              </div>
            </div>

            {/* ── Hero title + icon chain ──────────────────────────────── */}
            <div className="flex flex-col justify-center">
              <div data-intro-item="" data-intro-step={1}>
                <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.subtitle)} />
              </div>
              {/* gap:0 on the stack — the chevron carries equal margins above
                  and below itself so every row sits on the same rhythm. */}
              <div className="mt-12 flex flex-col" style={{ gap: 0 }}>
                {rows.map((raw, i) => {
                  const it = obj(raw);
                  const RowIcon = it.icon ? iconByName(s(it.icon)) : null;
                  const chainGap = rowCount > 4 ? 10 : 18;
                  return (
                    <div key={i} data-intro-item="" data-intro-step={i + 2}>
                      {i > 0 && (
                        <div
                          aria-hidden
                          data-decorative
                          className="flex items-center justify-center"
                          style={{
                            width: iconBox,
                            height: rowCount > 4 ? 20 : 30,
                            marginTop: chainGap,
                            marginBottom: chainGap,
                            color: accent,
                          }}
                        >
                          <ChevronsDown size={rowCount > 4 ? 22 : 28} strokeWidth={2.5} />
                        </div>
                      )}

                      <div className="flex items-center" style={{ gap: 34 }}>
                        <div
                          className="relative flex shrink-0 items-center justify-center"
                          style={{ width: iconBox, height: iconBox }}
                        >
                          <div
                            aria-hidden
                            data-decorative
                            className="absolute inset-0"
                            style={{ borderRadius: 20, backgroundImage: cardWashGradient(accent) }}
                          />
                          <div
                            aria-hidden
                            data-decorative
                            className="absolute inset-0"
                            style={openBottomFrame(accent, 20)}
                          />
                          <span className="relative" style={{ color: accent }}>
                            {RowIcon ? (
                              <RowIcon size={Math.round(iconBox * 0.46)} strokeWidth={1.7} />
                            ) : (
                              <span style={{ fontSize: fillPx(30, "figure"), fontWeight: 700 }}>
                                {i + 1}
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div
                            style={{
                              fontSize: labelSize,
                              fontWeight: 600,
                              letterSpacing: "-0.02em",
                              lineHeight: 1.15,
                              color: ink.strong,
                            }}
                          >
                            {s(it.label)}
                          </div>
                          {s(it.body) && (
                            <div
                              className="mt-1.5"
                              style={{
                                fontSize: fillPx(22, "body"),
                                lineHeight: 1.35,
                                color: ink.body,
                              }}
                            >
                              {s(it.body)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }
      default:
        return null;
    }
  },
});

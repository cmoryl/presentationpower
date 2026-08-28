// Process family — extracted from the legacy `VariantRenderer` switch onto the
// module registry. Step rails, chains and spotlights share one owner here so a
// connector or seam change lands across every process module at once.

import React from "react";
import { AlertTriangle, ChevronsDown, ChevronsRight } from "lucide-react";
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
import { Kicker } from "../primitives";
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
    "MV-PROC-STAGE-ORBITS",
    "MV-PROC-BEFORE-AFTER",
    "MV-PROC-ARC-FLOW",
    "MV-PROC-TIMELINE-RAIL",
    "MV-PROC-JOURNEY-VERTICAL",
    "MV-PROC-SWIMLANE-FLOW",
    "MV-PROC-LAYER-STACK",
    "MV-PROC-PROOF-PAIRS",
    "MV-PROC-PLATFORM-LOOP",
    "MV-PROC-BEFORE-AFTER-SPLIT",
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
    case "MV-PROC-STAGE-ORBITS": {
      // Two-to-four numbered stages across the slide. Each stage is a circular
      // photo medallion in an orbit ring carrying its numeral and stage name,
      // with a vertical icon-led task chain beneath it. Chevron pairs carry the
      // eye between stages. House treatment: accentInk tones, hairline rings
      // with faded tails, cardWashGradient + openBottomFrame task tiles.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const stages = arr(c.stages)
        .slice(0, 4)
        .map((raw) => obj(raw));
      const stageCount = Math.max(stages.length, 1);
      const wide = stageCount <= 3;
      const iconBox = wide ? 78 : 64;
      const taskSize = wide ? 27 : 22;
      const numeralSize = wide ? 96 : 74;
      const stageNameSize = wide ? 40 : 32;

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center">
            {s(c.title) && (
              <div data-intro-item="" data-intro-step={0}>
                <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.subtitle)} />
              </div>
            )}
            <div className="mt-10 flex items-start justify-center" style={{ gap: wide ? 28 : 18 }}>
              {stages.map((st, si) => {
                const tasks = arr(st.items)
                  .slice(0, 4)
                  .map((t) => obj(t));
                return (
                  <React.Fragment key={si}>
                    {si > 0 && (
                      <div
                        aria-hidden
                        data-decorative
                        className="flex shrink-0 items-center justify-center"
                        style={{ color: accent, paddingTop: wide ? 168 : 140 }}
                      >
                        <ChevronsRight size={wide ? 58 : 44} strokeWidth={3} />
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col items-center">
                      {/* ── Numbered stage medallion ─────────────────────── */}
                      <div
                        data-intro-item=""
                        data-intro-step={si * 2 + 1}
                        className="relative aspect-square w-full"
                        style={{ maxWidth: wide ? 380 : 310 }}
                      >
                        {/* Outer orbit ring — one continuous hairline. */}
                        <div
                          aria-hidden
                          data-decorative
                          className="absolute inset-0 rounded-full"
                          style={{
                            border: `2px solid color-mix(in oklab, ${accent} 38%, transparent)`,
                          }}
                        />
                        {/* Inner containment ring. */}
                        <div
                          aria-hidden
                          data-decorative
                          className="absolute rounded-full"
                          style={{
                            inset: "5.5%",
                            border: `1px solid color-mix(in oklab, ${accent} 26%, transparent)`,
                          }}
                        />
                        {/* Orbit nodes centred exactly on the outer ring. */}
                        {orbitNodePositions(4, 26).map((pos, i) => (
                          <div
                            key={i}
                            aria-hidden
                            data-decorative
                            className="absolute rounded-full"
                            style={{
                              ...pos,
                              width: wide ? 13 : 10,
                              height: wide ? 13 : 10,
                              transform: "translate(-50%, -50%)",
                              backgroundColor: accent,
                            }}
                          />
                        ))}
                        {/* Photo medallion with duotone wash so type clears. */}
                        <div
                          className="absolute overflow-hidden rounded-full"
                          style={{ inset: "11%" }}
                        >
                          <MediaTile
                            brand={brand}
                            seed={s(st.mediaSeed, s(st.label, `stage-${si + 1}`))}
                            overrideUrl={s(st.mediaUrl)}
                            mediaPath={s(st.mediaPath)}
                            fit={s(st.mediaFit) || undefined}
                            focus={s(st.mediaFocus) || undefined}
                            zoom={Number(st.mediaZoom) || undefined}
                            className="h-full w-full rounded-full"
                          />
                          <div
                            aria-hidden
                            data-decorative
                            className="absolute inset-0 rounded-full"
                            style={{
                              backgroundImage: `linear-gradient(150deg, color-mix(in oklab, ${brand.tokens.primary} 66%, transparent) 0%, color-mix(in oklab, ${accent} 36%, transparent) 100%)`,
                            }}
                          />
                          <div
                            data-on-media
                            className="absolute inset-0 flex flex-col items-center justify-center px-[12%] text-center"
                            style={{ color: "#FFFFFF" }}
                          >
                            <div
                              style={{
                                fontSize: numeralSize,
                                fontWeight: 700,
                                lineHeight: 1,
                                letterSpacing: "-0.05em",
                              }}
                            >
                              {s(st.stepNumber, String(si + 1))}
                            </div>
                            <div
                              className="mt-2"
                              style={{
                                fontSize: stageNameSize,
                                fontWeight: 700,
                                lineHeight: 1.08,
                                letterSpacing: "-0.02em",
                                textTransform: "uppercase",
                              }}
                            >
                              {s(st.label)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Task chain ───────────────────────────────────── */}
                      <div
                        data-intro-item=""
                        data-intro-step={si * 2 + 2}
                        className="mt-8 flex w-full flex-col"
                        style={{ gap: 0 }}
                      >
                        {tasks.map((t, ti) => {
                          const TaskIcon = t.icon ? iconByName(s(t.icon)) : null;
                          const taskGap = wide ? 4 : 3;
                          return (
                            <React.Fragment key={ti}>
                              {ti > 0 && (
                                <div
                                  aria-hidden
                                  data-decorative
                                  className="flex items-center justify-center"
                                  style={{
                                    width: iconBox,
                                    height: wide ? 26 : 20,
                                    marginTop: taskGap,
                                    marginBottom: taskGap,
                                    color: accent,
                                  }}
                                >
                                  <ChevronsDown size={wide ? 24 : 18} strokeWidth={2.5} />
                                </div>
                              )}

                              <div className="flex items-center" style={{ gap: wide ? 24 : 18 }}>
                                <div
                                  className="relative flex shrink-0 items-center justify-center"
                                  style={{ width: iconBox, height: iconBox }}
                                >
                                  <div
                                    aria-hidden
                                    data-decorative
                                    className="absolute inset-0"
                                    style={{
                                      borderRadius: 18,
                                      backgroundImage: cardWashGradient(accent),
                                    }}
                                  />
                                  <div
                                    aria-hidden
                                    data-decorative
                                    className="absolute inset-0"
                                    style={openBottomFrame(accent, 18)}
                                  />
                                  <span className="relative" style={{ color: accent }}>
                                    {TaskIcon ? (
                                      <TaskIcon
                                        size={Math.round(iconBox * 0.46)}
                                        strokeWidth={1.7}
                                      />
                                    ) : (
                                      <span
                                        style={{ fontSize: fillPx(24, "body"), fontWeight: 700 }}
                                      >
                                        {ti + 1}
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div
                                  className="min-w-0"
                                  style={{
                                    fontSize: taskSize,
                                    fontWeight: 600,
                                    letterSpacing: "-0.015em",
                                    lineHeight: 1.2,
                                    color: ink.strong,
                                  }}
                                >
                                  {s(t.label)}
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROC-BEFORE-AFTER": {
      const before = obj(c.before);
      const after = obj(c.after);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="slide-fill-stretch mt-14 grid grid-cols-2 gap-16">
            <div
              className="flex flex-col pt-8"
              style={{ borderTop: "1px solid rgba(10,15,28,0.15)" }}
            >
              <Kicker brand={brand} color="color-mix(in oklab, currentColor 62%, transparent)">
                Before
              </Kicker>
              <div
                className="mt-8"
                style={{
                  fontSize: fillPx(40, "figure"),
                  fontWeight: 600,
                  color: ink.strong,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {s(before.title)}
              </div>
              <div
                className="mt-6"
                style={{
                  fontSize: fillPx(24, "body"),
                  lineHeight: 1.4,
                  color: "color-mix(in oklab, currentColor 72%, transparent)",
                }}
              >
                {s(before.body)}
              </div>
            </div>
            <div
              className="flex flex-col pt-8"
              style={{ borderTop: `2px solid ${brand.tokens.accent}` }}
            >
              <Kicker brand={brand}>After</Kicker>
              <div
                className="mt-8"
                style={{
                  fontSize: fillPx(40, "figure"),
                  fontWeight: 600,
                  color: ink.strong,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {s(after.title)}
              </div>
              <div
                className="mt-6"
                style={{
                  fontSize: fillPx(24, "body"),
                  lineHeight: 1.4,
                  color: "color-mix(in oklab, currentColor 82%, transparent)",
                }}
              >
                {s(after.body)}
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROC-ARC-FLOW": {
      // Arc flow: nodes alternate between an upper and lower band, joined by
      // swooping house arcs. Reads as a journey without the rigid rail of the
      // step chain, and takes 2-6 stages.
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const stages = arr(c.items).slice(0, 6);
      const count = Math.max(stages.length, 1);
      const STAGE_W = 1640;
      const STAGE_H = 540;
      const colW = STAGE_W / count;
      const nodeD = count >= 5 ? 92 : 108;
      const topY = 104;
      const botY = STAGE_H - 104;
      const labelSize = count >= 5 ? 24 : 27;
      const bodySize = count >= 5 ? 17 : 19;
      const centreOf = (i: number) => ({
        x: colW * (i + 0.5),
        y: i % 2 === 0 ? topY : botY,
      });
      // Copy sits inside its ring: narrower than the column and nudged toward
      // the partner node (the ring's centre) so the arc never crosses text.
      const copyW = colW - 96;
      const copyShift = (i: number) => {
        const partner = i < count - 1 ? i + 1 : i - 1;
        if (partner < 0) return 0;
        return Math.sign(centreOf(partner).x - centreOf(i).x) * colW * 0.16;
      };

      // House connector for this module: a true circular arc through both node
      // centres — the reference reads as a chain of open half/three-quarter
      // circles, not a soft bezier swoop. Each connector is a circle whose
      // diameter is the segment between the two nodes, drawn as a >180deg
      // sweep so the ring visibly opens around the stage, alternating side so
      // the whole row serpentines. Segments carry their own opacity so both
      // tails fade out (a linear gradient can't fade the ends of a curve).
      const ARC_SPAN_DEG = 250;
      const ARC_SEGMENTS = 30;
      const arcSegments = (
        a: { x: number; y: number },
        b: { x: number; y: number },
        dir: 1 | -1,
      ) => {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const r = Math.hypot(b.x - a.x, b.y - a.y) / 2;
        const from = Math.atan2(a.y - my, a.x - mx);
        const span = (ARC_SPAN_DEG * Math.PI) / 180;
        // Start a touch before the first node and end a touch after the last so
        // the ring overshoots the discs like the reference.
        const start = from - dir * ((span - Math.PI) / 2);
        const pt = (t: number) => {
          const ang = start + dir * span * t;
          return { x: mx + r * Math.cos(ang), y: my + r * Math.sin(ang) };
        };
        const out: { d: string; o: number }[] = [];
        for (let k = 0; k < ARC_SEGMENTS; k++) {
          const t0 = k / ARC_SEGMENTS;
          const t1 = (k + 1) / ARC_SEGMENTS;
          const p0 = pt(t0);
          const p1 = pt(t1);
          // Fade both tails, hold the body of the arc.
          const tm = (t0 + t1) / 2;
          const edge = Math.min(tm, 1 - tm) / 0.22;
          const o = 0.1 + 0.34 * Math.min(1, edge);
          out.push({
            d: `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
            o,
          });
        }
        return out;
      };

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div data-intro-item="" data-intro-step={0}>
            <SlideTitle brand={brand} title={s(c.title)} />
          </div>

          <div className="relative mt-6" style={{ height: STAGE_H, width: STAGE_W }}>
            {/* Arcs live behind the nodes and fade at both tails, matching the
                house connector treatment. */}
            <svg
              aria-hidden
              data-decorative
              className="absolute inset-0 overflow-visible"
              width={STAGE_W}
              height={STAGE_H}
              viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
              fill="none"
            >
              {/* Rings pair up (1-2, 3-4, 5-6) exactly like the reference, so
                  each half-circle reads as its own open loop instead of a
                  continuous overlapping chain. */}
              {stages.slice(0, -1).map((_, i) => {
                if (i % 2 !== 0) return null;
                const a = centreOf(i);
                const b = centreOf(i + 1);
                return (
                  <g key={i}>
                    {arcSegments(a, b, -1).map((seg, k) => (
                      <path
                        key={k}
                        d={seg.d}
                        stroke={accent}
                        strokeOpacity={seg.o}
                        strokeWidth={1.6}
                        strokeLinecap="round"
                      />
                    ))}
                  </g>
                );
              })}
              {/* Tiny vertical ellipsis marks the hand-off between two rings. */}
              {stages.slice(0, -1).map((_, i) =>
                i % 2 === 1 ? (
                  <g key={`dot-${i}`}>
                    {[-9, 0, 9].map((dy) => (
                      <circle
                        key={dy}
                        cx={colW * (i + 1)}
                        cy={STAGE_H / 2 + dy}
                        r={2}
                        fill={accent}
                        fillOpacity={0.34}
                      />
                    ))}
                  </g>
                ) : null,
              )}
            </svg>

            {stages.map((it, i) => {
              const { x, y } = centreOf(i);
              const StageIcon = it.icon ? iconByName(s(it.icon)) : null;
              const above = i % 2 === 0;
              return (
                <React.Fragment key={i}>
                  {/* Node disc — pinned to intro beat `i + 1` so the stage disc
                      and its copy land together, one stage per beat. */}
                  <div
                    data-intro-item=""
                    data-intro-step={i + 1}
                    className="absolute flex items-center justify-center rounded-full"
                    style={{
                      width: nodeD,
                      height: nodeD,
                      left: x - nodeD / 2,
                      top: y - nodeD / 2,
                      border: `1px solid color-mix(in oklab, ${accent} 48%, transparent)`,
                      backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${accent} ${isDark ? 30 : 18}%, transparent), color-mix(in oklab, ${accent} ${isDark ? 10 : 5}%, transparent))`,
                      zIndex: 3,
                    }}
                  >
                    {StageIcon ? (
                      <StageIcon
                        size={Math.round(nodeD * 0.4)}
                        strokeWidth={1.8}
                        color={accent}
                        aria-hidden
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: Math.round(nodeD * 0.36),
                          fontWeight: 800,
                          color: accent,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>
                  {/* Copy block sits opposite the node and is nudged toward the
                      centre of its ring, so the half-circle passes outside the
                      text instead of cutting through it (as in the reference). */}
                  <div
                    data-intro-item=""
                    data-intro-step={i + 1}
                    className="absolute"
                    style={{
                      width: copyW,
                      left: x + copyShift(i) - copyW / 2,
                      top: above ? y + nodeD / 2 + 26 : undefined,
                      bottom: above ? undefined : STAGE_H - (y - nodeD / 2 - 26),
                      textAlign: "center",
                      zIndex: 2,
                    }}
                  >
                    <div
                      aria-hidden
                      data-decorative
                      className="mx-auto"
                      style={{
                        height: SEAM_HEIGHT_PX,
                        width: 64,
                        marginBottom: 12,
                        borderRadius: SEAM_HEIGHT_PX,
                        backgroundImage: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                      }}
                    />
                    <div
                      style={{
                        fontSize: labelSize,
                        fontWeight: 700,
                        letterSpacing: "-0.025em",
                        lineHeight: 1.12,
                        color: ink.strong,
                      }}
                    >
                      <span style={{ color: accent, marginRight: 10 }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {s(it.label)}
                    </div>
                    {s(it.body) && (
                      <div
                        className="mt-2 mx-auto"
                        style={{
                          fontSize: bodySize,
                          lineHeight: 1.36,
                          maxWidth: copyW - 26,
                          color: "color-mix(in oklab, currentColor 68%, transparent)",
                        }}
                      >
                        {s(it.body)}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <SummaryBand
            {...readSummary(c.summary)}
            data-intro-item=""
            data-intro-step={stages.length + 1}
            accent={accent}
            leadTone={ink.strong}
            scale={0.8}
          />
        </SlideFrame>
      );
    }

    case "MV-PROC-TIMELINE-RAIL": {
      // Advanced horizontal timeline: one faded axis, icon (or numeral) nodes on
      // the axis, and cards alternating above/below so long journeys fit without
      // shrinking the copy. `item.meta` carries the date / duration marker.
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const stops = arr(c.items).slice(0, 7);
      const count = Math.max(stops.length, 1);
      const STAGE_W = 1640;
      const STAGE_H = 560;
      const colW = STAGE_W / count;
      const axisY = STAGE_H / 2;
      const nodeD = count >= 6 ? 78 : 92;
      const cardW = Math.min(colW - 28, 300);
      const cardGap = 46;
      // Vertical room a card owns on its side of the axis.
      const cardHalf = axisY - nodeD / 2 - cardGap;
      const labelSize = count >= 6 ? 22 : 25;
      const bodySize = count >= 6 ? 16 : 18;
      const bodyLines = count >= 6 ? 2 : 3;

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div data-intro-item="" data-intro-step={0}>
            <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.subtitle)} />
          </div>
          <div className="relative mt-10" style={{ width: STAGE_W, height: STAGE_H }}>
            {/* Axis — fades at both tails, house connector treatment. */}
            <div
              aria-hidden
              data-decorative
              className="absolute"
              style={{
                left: colW * 0.18,
                right: colW * 0.18,
                top: axisY,
                height: 1,
                backgroundImage: `linear-gradient(90deg, transparent 0%, color-mix(in oklab, ${accent} 46%, transparent) 22%, color-mix(in oklab, ${accent} 46%, transparent) 78%, transparent 100%)`,
              }}
            />
            {stops.map((it, i) => {
              const x = colW * (i + 0.5);
              const above = i % 2 === 0;
              const flagged = truthy(it.highlight);
              const line = flagged ? "#EC388A" : accent;
              const StopIcon = it.icon ? iconByName(s(it.icon)) : null;
              return (
                <React.Fragment key={i}>
                  <div
                    data-intro-item=""
                    data-intro-step={i + 1}
                    className="absolute flex items-center justify-center rounded-full"
                    style={{
                      width: nodeD,
                      height: nodeD,
                      left: x - nodeD / 2,
                      top: axisY - nodeD / 2,
                      zIndex: 3,
                      border: `1px solid color-mix(in oklab, ${line} 50%, transparent)`,
                      backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${line} ${isDark ? 30 : 17}%, transparent), color-mix(in oklab, ${line} ${isDark ? 9 : 4}%, transparent))`,
                    }}
                  >
                    {StopIcon ? (
                      <StopIcon
                        size={Math.round(nodeD * 0.42)}
                        strokeWidth={1.7}
                        color={line}
                        aria-hidden
                      />
                    ) : (
                      <span
                        className="tabular-nums"
                        style={{
                          fontSize: Math.round(nodeD * 0.38),
                          fontWeight: 800,
                          color: line,
                          letterSpacing: "-0.04em",
                        }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>
                  {/* Stem from the node to its card. */}
                  <div
                    aria-hidden
                    data-decorative
                    className="absolute"
                    style={{
                      left: x,
                      width: 1,
                      height: cardGap - 12,
                      top: above ? undefined : axisY + nodeD / 2 + 4,
                      bottom: above ? STAGE_H - (axisY - nodeD / 2 - 4) : undefined,
                      backgroundImage: `linear-gradient(${above ? "0deg" : "180deg"}, color-mix(in oklab, ${line} 46%, transparent), transparent)`,
                    }}
                  />
                  <div
                    data-intro-item=""
                    data-intro-step={i + 1}
                    className="absolute"
                    style={{
                      width: cardW,
                      left: x - cardW / 2,
                      top: above ? undefined : axisY + nodeD / 2 + cardGap,
                      bottom: above ? STAGE_H - (axisY - nodeD / 2 - cardGap) : undefined,
                      // A card taller than its half of the stage used to run past
                      // the axis and overprint the title above / summary band
                      // below. Cap it at the room it actually owns.
                      maxHeight: cardHalf,
                      overflow: "hidden",
                      zIndex: 2,
                    }}
                  >
                    <div
                      className="relative px-5 pb-7 pt-5"
                      style={{
                        borderRadius: 20,
                        backgroundImage: cardWashGradient(line),
                        maxHeight: cardHalf,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        aria-hidden
                        data-decorative
                        className="absolute inset-0"
                        style={openBottomFrame(line, "20px")}
                      />
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
                          backgroundImage: `linear-gradient(90deg, transparent, ${line}, transparent)`,
                          opacity: flagged ? 0.95 : 0.7,
                        }}
                      />
                      {s(it.meta) && (
                        <div
                          style={{
                            fontSize: fillPx(14, "kicker"),
                            fontWeight: 700,
                            letterSpacing: "0.16em",
                            textTransform: "uppercase",
                            color: line,
                          }}
                        >
                          {s(it.meta)}
                        </div>
                      )}
                      <div
                        className="mt-2"
                        style={{
                          fontSize: labelSize,
                          fontWeight: 700,
                          letterSpacing: "-0.02em",
                          lineHeight: 1.15,
                          color: flagged ? line : ink.strong,
                          ...clampLines(2),
                        }}
                      >
                        {s(it.label)}
                      </div>
                      {s(it.body) && (
                        <div
                          className="mt-2"
                          style={{
                            fontSize: bodySize,
                            lineHeight: 1.36,
                            color: "color-mix(in oklab, currentColor 68%, transparent)",
                            ...clampLines(bodyLines),
                          }}
                        >
                          {s(it.body)}
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <SummaryBand
            {...readSummary(c.summary)}
            data-intro-item=""
            data-intro-step={count + 1}
            accent={accent}
            leadTone={ink.strong}
            scale={0.8}
          />
        </SlideFrame>
      );
    }

    case "MV-PROC-JOURNEY-VERTICAL": {
      // Vertical journey: a single rail down the left with icon nodes, a phase
      // marker (item.meta) and room for a real paragraph per stage. Best for
      // 3-6 stages where each one needs explaining, not just naming.
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const stages = arr(c.items).slice(0, 6);
      const count = Math.max(stages.length, 1);
      const nodeD = count >= 5 ? 74 : 86;
      const labelSize = count >= 5 ? 27 : 31;
      const bodySize = count >= 5 ? 18 : 19;

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div data-intro-item="" data-intro-step={0}>
            <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.subtitle)} />
          </div>
          <div className="relative mt-8" style={{ width: 1560 }}>
            {/* Rail behind the nodes, fading at both ends. */}
            <div
              aria-hidden
              data-decorative
              className="absolute"
              style={{
                left: nodeD / 2,
                top: nodeD * 0.4,
                bottom: nodeD * 0.4,
                width: 1,
                backgroundImage: `linear-gradient(180deg, transparent, color-mix(in oklab, ${accent} 44%, transparent) 14%, color-mix(in oklab, ${accent} 44%, transparent) 86%, transparent)`,
              }}
            />
            <div className="flex flex-col" style={{ gap: count >= 5 ? 22 : 30 }}>
              {stages.map((it, i) => {
                const flagged = truthy(it.highlight);
                const line = flagged ? "#EC388A" : accent;
                const StageIcon = it.icon ? iconByName(s(it.icon)) : null;
                return (
                  <div
                    key={i}
                    data-intro-item=""
                    data-intro-step={i + 1}
                    className="relative flex items-start"
                    style={{ gap: 32 }}
                  >
                    <div
                      className="relative flex shrink-0 items-center justify-center rounded-full"
                      style={{
                        width: nodeD,
                        height: nodeD,
                        border: `1px solid color-mix(in oklab, ${line} 50%, transparent)`,
                        backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${line} ${isDark ? 30 : 17}%, transparent), color-mix(in oklab, ${line} ${isDark ? 9 : 4}%, transparent))`,
                        zIndex: 2,
                      }}
                    >
                      {StageIcon ? (
                        <StageIcon
                          size={Math.round(nodeD * 0.42)}
                          strokeWidth={1.7}
                          color={line}
                          aria-hidden
                        />
                      ) : (
                        <span
                          className="tabular-nums"
                          style={{
                            fontSize: Math.round(nodeD * 0.38),
                            fontWeight: 800,
                            color: line,
                            letterSpacing: "-0.04em",
                          }}
                        >
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <div
                      className="relative min-w-0 flex-1 px-7 pb-8 pt-6"
                      style={{ borderRadius: 22, backgroundImage: cardWashGradient(line) }}
                    >
                      <div
                        aria-hidden
                        data-decorative
                        className="absolute inset-0"
                        style={openBottomFrame(line, "22px")}
                      />
                      <div
                        aria-hidden
                        data-decorative
                        className="absolute"
                        style={{
                          top: 0,
                          left: `${SEAM_TICK_INSET_PCT}%`,
                          // Stop the seam well short of the stage pill on the
                          // right so the hairline never reads as a line struck
                          // through the badge.
                          right: s(it.meta) ? "34%" : `${SEAM_TICK_INSET_PCT}%`,
                          height: SEAM_HEIGHT_PX,
                          borderRadius: SEAM_HEIGHT_PX,
                          backgroundImage: `linear-gradient(90deg, transparent, ${line}, transparent)`,
                          opacity: flagged ? 0.95 : 0.7,
                        }}
                      />

                      <div className="flex items-baseline justify-between" style={{ gap: 24 }}>
                        <div
                          style={{
                            fontSize: labelSize,
                            fontWeight: 700,
                            letterSpacing: "-0.025em",
                            lineHeight: 1.1,
                            color: flagged ? line : ink.strong,
                          }}
                        >
                          {s(it.label)}
                        </div>
                        {s(it.meta) && (
                          <div
                            className="shrink-0 px-3 py-1"
                            style={{
                              fontSize: fillPx(14, "kicker"),
                              fontWeight: 700,
                              letterSpacing: "0.14em",
                              textTransform: "uppercase",
                              color: line,
                              borderRadius: 999,
                              border: `1px solid color-mix(in oklab, ${line} 40%, transparent)`,
                              backgroundColor: `color-mix(in oklab, ${line} ${isDark ? 16 : 8}%, transparent)`,
                            }}
                          >
                            {s(it.meta)}
                          </div>
                        )}
                      </div>
                      {s(it.body) && (
                        <div
                          className="mt-3"
                          style={{
                            fontSize: bodySize,
                            lineHeight: 1.4,
                            maxWidth: 1080,
                            color: "color-mix(in oklab, currentColor 70%, transparent)",
                          }}
                        >
                          {s(it.body)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <SummaryBand
            {...readSummary(c.summary)}
            data-intro-item=""
            data-intro-step={count + 1}
            accent={accent}
            leadTone={ink.strong}
            scale={0.8}
          />
        </SlideFrame>
      );
    }

    case "MV-PROC-SWIMLANE-FLOW": {
      // Swimlane flow: phases across the top, workstreams down the side, and an
      // icon chip per cell. Shows *who* does what *when* — the piece a single
      // rail can't carry.
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const phases = arr(c.phases).slice(0, 5);
      const lanes = arr(c.lanes).slice(0, 4);
      const pCount = Math.max(phases.length, 1);
      const railW = 260;

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div data-intro-item="" data-intro-step={0}>
            <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.subtitle)} />
          </div>
          <div className="mt-8" style={{ width: 1640 }}>
            {/* Phase header row */}
            <div
              data-intro-item=""
              data-intro-step={1}
              className="grid items-end"
              style={{
                gridTemplateColumns: `${railW}px repeat(${pCount}, minmax(0, 1fr))`,
                columnGap: 18,
              }}
            >
              <div />
              {phases.map((p, i) => (
                <div key={i} className="relative pb-3">
                  <div
                    style={{
                      fontSize: fillPx(15, "kicker"),
                      fontWeight: 700,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: accent,
                    }}
                  >
                    {s(typeof p === "string" ? p : (p as { meta?: unknown }).meta) ||
                      `Phase ${i + 1}`}
                  </div>
                  <div
                    className="mt-1"
                    style={{
                      fontSize: fillPx(23, "body"),
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      color: ink.strong,
                    }}
                  >
                    {s(typeof p === "string" ? p : (p as { label?: unknown }).label)}
                  </div>
                  <div
                    aria-hidden
                    data-decorative
                    className="absolute bottom-0 left-0 right-0"
                    style={{
                      height: SEAM_HEIGHT_PX,
                      borderRadius: SEAM_HEIGHT_PX,
                      backgroundImage: `linear-gradient(90deg, ${accent}, transparent)`,
                      opacity: 0.7,
                    }}
                  />
                </div>
              ))}
            </div>

            {lanes.map((laneRaw, li) => {
              const lane = obj(laneRaw);
              const cells = arr(lane.items).slice(0, pCount);
              const LaneIcon = lane.icon ? iconByName(s(lane.icon)) : null;
              return (
                <div
                  key={li}
                  data-intro-item=""
                  data-intro-step={li + 2}
                  className="grid items-stretch"
                  style={{
                    gridTemplateColumns: `${railW}px repeat(${pCount}, minmax(0, 1fr))`,
                    columnGap: 18,
                    marginTop: 20,
                  }}
                >
                  <div className="flex items-center" style={{ gap: 14 }}>
                    {LaneIcon && (
                      <LaneIcon size={30} strokeWidth={1.7} color={accent} aria-hidden />
                    )}
                    <div>
                      <div
                        style={{
                          fontSize: fillPx(22, "body"),
                          fontWeight: 700,
                          letterSpacing: "-0.02em",
                          color: ink.strong,
                        }}
                      >
                        {s(lane.label)}
                      </div>
                      {s(lane.meta) && (
                        <div
                          style={{
                            fontSize: fillPx(15, "kicker"),
                            lineHeight: 1.3,
                            color: "color-mix(in oklab, currentColor 62%, transparent)",
                          }}
                        >
                          {s(lane.meta)}
                        </div>
                      )}
                    </div>
                  </div>
                  {Array.from({ length: pCount }).map((_, ci) => {
                    const cell = obj(cells[ci]);
                    const text = s(cell.label);
                    const flagged = truthy(cell.highlight);
                    const line = flagged ? "#EC388A" : accent;
                    const CellIcon = cell.icon ? iconByName(s(cell.icon)) : null;
                    if (!text && !CellIcon) {
                      return (
                        <div
                          key={ci}
                          aria-hidden
                          data-decorative
                          className="flex items-center justify-center"
                          style={{ minHeight: 108 }}
                        >
                          <div
                            style={{
                              width: "62%",
                              height: 1,
                              backgroundImage: `linear-gradient(90deg, transparent, color-mix(in oklab, ${accent} 26%, transparent), transparent)`,
                            }}
                          />
                        </div>
                      );
                    }
                    return (
                      <div
                        key={ci}
                        className="relative flex items-start px-5 pb-6 pt-4"
                        style={{
                          minHeight: 108,
                          gap: 12,
                          borderRadius: 18,
                          backgroundImage: cardWashGradient(line),
                        }}
                      >
                        <div
                          aria-hidden
                          data-decorative
                          className="absolute inset-0"
                          style={openBottomFrame(line, "18px")}
                        />
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
                            backgroundImage: `linear-gradient(90deg, transparent, ${line}, transparent)`,
                            opacity: flagged ? 0.95 : 0.65,
                          }}
                        />
                        {CellIcon && (
                          <CellIcon
                            size={24}
                            strokeWidth={1.7}
                            color={line}
                            aria-hidden
                            className="mt-0.5 shrink-0"
                          />
                        )}
                        <div
                          className="min-w-0"
                          style={{
                            fontSize: fillPx(18, "body"),
                            fontWeight: 600,
                            lineHeight: 1.3,
                            color: flagged ? line : ink.strong,
                          }}
                        >
                          {text}
                          {s(cell.body) && (
                            <div
                              className="mt-1.5"
                              style={{
                                fontSize: fillPx(16, "body"),
                                fontWeight: 400,
                                lineHeight: 1.34,
                                color: "color-mix(in oklab, currentColor 66%, transparent)",
                              }}
                            >
                              {s(cell.body)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <SummaryBand
            {...readSummary(c.summary)}
            data-intro-item=""
            data-intro-step={lanes.length + 2}
            accent={accent}
            leadTone={ink.strong}
            scale={0.8}
          />
        </SlideFrame>
      );
    }

    case "MV-PROC-LAYER-STACK": {
      // Stacked architecture lanes. Each lane opens with an arrow-headed label
      // block (the direction cue is the block itself, so no stock arrow glyph)
      // and carries hairline-divided capability cells in the lane's own tone.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const lanes = arr(c.items).slice(0, 5);
      const laneTones = [
        accent,
        accentInk(isDark ? "#A1FBF9" : "#0E7A86", mode, 4.5),
        accentInk("#EC388A", mode, 4.5),
        accentInk(isDark ? "#C2A3FF" : "#5B3FBF", mode, 4.5),
        accentInk(isDark ? "#A6FA87" : "#2F7A3C", mode, 4.5),
      ];
      const laneCount = Math.max(lanes.length, 1);
      // Sized so 2–5 lanes plus the title block and summary band always land
      // inside the stage — no lane ever runs under the footer. Shared with the
      // exporter so lane/rail rounding matches 1:1.
      const { height: laneH, gap: laneGap } = laneLadderPx(laneCount);
      const laneRadiusPx = laneCornerRadiusPx(laneH);
      const laneRail = railBoxPx(laneH);

      const headW = 356;

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div data-intro-item="" data-intro-step={0}>
            <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.subtitle)} />
          </div>
          {s(c.question) && (
            <div
              data-title-subline
              className="mt-3"
              style={{
                fontSize: fillPx(28, "figure"),
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: ink.strong,
              }}
            >
              {s(c.question)}
            </div>
          )}
          <div className="mt-8 flex flex-col" style={{ gap: laneGap }}>
            {lanes.map((laneRaw, li) => {
              const lane = obj(laneRaw);
              // Authored per-lane tone wins over the rotation, and is still
              // contrast-corrected for the slide's appearance mode.
              const laneOverride = itemTone(lane);
              const tone = laneOverride
                ? accentInk(laneOverride, mode, 4.5)
                : laneTones[li % laneTones.length];
              const laneEndOverride = itemToneEnd(lane);
              const toneEnd = laneEndOverride ? accentInk(laneEndOverride, mode, 4.5) : null;

              const cells = arr(lane.cells).slice(0, 4);
              const LaneIcon = lane.icon ? iconByName(s(lane.icon)) : null;
              return (
                <div
                  key={li}
                  data-intro-item=""
                  data-intro-step={li + 1}
                  className="relative flex items-stretch"
                  style={{ height: laneH }}
                >
                  {/* Lane body wash + open-bottom frame */}
                  <div
                    aria-hidden
                    data-decorative
                    className="absolute inset-0"
                    style={{
                      borderRadius: laneRadiusPx,
                      backgroundImage: toneWashGradient(tone, toneEnd),
                    }}
                  />
                  <div
                    aria-hidden
                    data-decorative
                    className="absolute inset-0"
                    style={openBottomFrame(tone, laneRadiusPx)}
                  />
                  {/* Lane head — a quiet tone-tinted plate with a numeral rail.
                      No arrow wedge: the stack reads top-to-bottom already, and
                      the tinted plate keeps copy on slide ink so light and dark
                      modes both hold contrast without white-on-navy blocks. */}
                  <div
                    className="relative flex shrink-0 items-center"
                    style={{ width: headW, gap: 16, paddingLeft: 26, paddingRight: 22 }}
                  >
                    <div
                      aria-hidden
                      data-decorative
                      className="absolute inset-0"
                      style={{
                        borderTopLeftRadius: laneRadiusPx,
                        borderBottomLeftRadius: laneRadiusPx,
                        backgroundImage: `linear-gradient(90deg, color-mix(in oklab, ${tone} ${isDark ? 24 : 15}%, transparent) 0%, color-mix(in oklab, ${tone} ${isDark ? 8 : 5}%, transparent) 78%, transparent 100%)`,
                      }}
                    />
                    {/* Accent rail — a true pill inset from the lane's rounded
                        corners. A 4px bar cannot carry an 18px corner radius, so
                        the old version rendered as a pinched wedge at both ends. */}
                    <div
                      aria-hidden
                      data-decorative
                      className="absolute"
                      style={{
                        top: laneRail.inset,
                        height: laneRail.height,
                        left: 8,
                        width: laneRail.width,
                        borderRadius: laneRail.radius,
                        backgroundColor: tone,
                      }}
                    />

                    <div
                      className="relative flex shrink-0 items-center justify-center"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        border: `1px solid color-mix(in oklab, ${tone} 46%, transparent)`,
                        backgroundColor: `color-mix(in oklab, ${tone} ${isDark ? 22 : 12}%, transparent)`,
                        color: tone,
                      }}
                    >
                      {LaneIcon ? (
                        <LaneIcon size={22} strokeWidth={1.8} color={tone} aria-hidden />
                      ) : (
                        <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em" }}>
                          {li + 1}
                        </span>
                      )}
                    </div>
                    <div className="relative min-w-0">
                      <div
                        style={{
                          fontSize: fillPx(14, "body"),
                          fontWeight: 700,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: tone,
                        }}
                      >
                        {s(lane.meta) || `Layer ${li + 1}`}
                      </div>
                      <div
                        className="mt-1"
                        style={{
                          fontSize: laneCount > 4 ? 21 : laneCount > 3 ? 23 : 25,
                          fontWeight: 700,
                          letterSpacing: "-0.02em",
                          lineHeight: 1.16,
                          color: ink.strong,
                        }}
                      >
                        {s(lane.label)}
                      </div>
                    </div>
                  </div>
                  {/* Capability cells */}
                  <div
                    className="relative grid flex-1 items-center"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(cells.length, 1)}, minmax(0, 1fr))`,
                    }}
                  >
                    {cells.map((cellRaw, ci) => {
                      const cell = obj(cellRaw);
                      return (
                        <div
                          key={ci}
                          className="relative px-6"
                          style={{
                            fontSize: laneCount > 4 ? 18 : laneCount > 3 ? 19 : 21,
                            fontWeight: 700,
                            letterSpacing: "-0.015em",
                            lineHeight: 1.22,
                            color: ink.strong,
                          }}
                        >
                          {ci > 0 && (
                            <span
                              aria-hidden
                              data-decorative
                              className="absolute left-0"
                              style={{
                                top: "12%",
                                bottom: "12%",
                                width: 1,
                                backgroundImage: `linear-gradient(180deg, transparent, color-mix(in oklab, ${tone} 42%, transparent), transparent)`,
                              }}
                            />
                          )}
                          {s(typeof cellRaw === "string" ? cellRaw : cell.label)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <SummaryBand
            {...readSummary(c.summary)}
            data-intro-item=""
            data-intro-step={laneCount + 1}
            accent={accent}
            leadTone={ink.strong}
            scale={0.85}
          />
        </SlideFrame>
      );
    }

    case "MV-PROC-PROOF-PAIRS": {
      // Problem → outcome pairs. The left pill stays deliberately quiet (muted
      // frame, neutral ink); the right pill carries the accent wash so the
      // resolved state is the one the eye lands on.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const cool = isDark ? "#7FB3F5" : "#3E7BD1";
      const before = obj(c.before);
      const after = obj(c.after);
      const rows = arr(c.items).slice(0, 6);
      const rowCount = Math.max(rows.length, 1);
      // Fit the stack inside the stage: title + label row + summary band leave
      // roughly 560px for the pairs, so the row height (and the glyph disc that
      // rides inside it) steps down as rows are added instead of running off
      // the bottom of the page.
      const rowGap = rowCount > 4 ? 10 : 14;
      const rowH =
        rowCount > 5 ? 84 : rowCount > 4 ? 96 : rowCount > 3 ? 112 : rowCount > 2 ? 126 : 138;
      const rowFont = rowCount > 5 ? 20 : rowCount > 4 ? 22 : rowCount > 3 ? 24 : 28;
      const discSize = Math.min(88, rowH - 24);
      const XIcon = XMark;
      const CheckIcon = Check;

      const Pill = ({
        text,
        tone,
        emphasis,
        Glyph,
      }: {
        text: string;
        tone: string;
        emphasis: boolean;
        Glyph: typeof Check;
      }) => (
        <div className="relative flex items-center" style={{ height: rowH, gap: 22 }}>
          <div
            aria-hidden
            data-decorative
            className="absolute"
            style={{
              left: 44,
              right: 0,
              top: 8,
              bottom: 8,
              borderRadius: 22,
              backgroundImage: cardWashGradient(tone),
            }}
          />
          <div
            aria-hidden
            data-decorative
            className="absolute"
            style={{ left: 44, right: 0, top: 8, bottom: 8, ...openBottomFrame(tone, 22) }}
          />
          <div
            className="relative z-10 flex shrink-0 items-center justify-center rounded-full"
            style={{
              width: discSize,
              height: discSize,
              backgroundColor: emphasis ? tone : "transparent",
              border: `2px solid ${tone}`,
              color: emphasis ? fillInk(tone, brand.tokens.primary) : tone,
            }}
          >
            <Glyph size={Math.round(discSize * 0.45)} strokeWidth={2.4} aria-hidden />
          </div>
          <div
            className="relative min-w-0 pr-8"
            style={{
              fontSize: rowFont,
              fontWeight: emphasis ? 700 : 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: emphasis ? ink.strong : "color-mix(in oklab, currentColor 78%, transparent)",
            }}
          >
            {text}
          </div>
        </div>
      );

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div data-intro-item="" data-intro-step={0}>
            <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.subtitle)} />
          </div>
          {s(c.question) && (
            <div
              data-title-subline
              className="mt-3"
              style={{
                fontSize: fillPx(28, "body"),
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: accent,
              }}
            >
              {s(c.question)}
            </div>
          )}
          <div className="mt-8">
            {(s(before.label) || s(after.label)) && (
              <div
                data-intro-item=""
                data-intro-step={1}
                className="grid"
                style={{ gridTemplateColumns: "1fr 130px 1fr" }}
              >
                <div
                  style={{
                    fontSize: fillPx(17, "body"),
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: cool,
                    paddingLeft: 44,
                  }}
                >
                  {s(before.label)}
                </div>
                <div />
                <div
                  style={{
                    fontSize: fillPx(17, "body"),
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: accent,
                    paddingLeft: 44,
                  }}
                >
                  {s(after.label)}
                </div>
              </div>
            )}
            <div className="mt-5 flex flex-col" style={{ gap: rowGap }}>
              {rows.map((rowRaw, i) => {
                const row = obj(rowRaw);
                return (
                  <div
                    key={i}
                    data-intro-item=""
                    data-intro-step={i + 2}
                    className="grid items-center"
                    style={{ gridTemplateColumns: "1fr 130px 1fr" }}
                  >
                    <Pill text={s(row.before)} tone={cool} emphasis={false} Glyph={XIcon} />
                    <div className="flex items-center justify-center">
                      <HouseArrow tone={accent} length={92} thickness={2} headScale={0.9} />
                    </div>
                    <Pill text={s(row.after)} tone={accent} emphasis Glyph={CheckIcon} />
                  </div>
                );
              })}
            </div>
          </div>
          <SummaryBand
            {...readSummary(c.summary)}
            data-intro-item=""
            data-intro-step={rowCount + 2}
            accent={accent}
            leadTone={ink.strong}
            scale={0.85}
          />
        </SlideFrame>
      );
    }

    case "MV-PROC-PLATFORM-LOOP": {
      // Serpentine capability pipeline: the chain wraps across two rows, then
      // resolves into three pillar claims and a full-width promise band.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const cool = isDark ? "#7FB3F5" : "#3E7BD1";
      const chips = arr(c.items).slice(0, 16);
      const pillars = arr(c.pillars).slice(0, 3);
      const half = Math.ceil(chips.length / 2) || 1;
      const rowsOfChips = [chips.slice(0, half), chips.slice(half)].filter((r) => r.length);
      const perRow = Math.max(...rowsOfChips.map((r) => r.length), 1);
      const chipFont = perRow > 7 ? 17 : perRow > 5 ? 19 : 21;
      const pillarTones = [
        accent,
        accentInk(isDark ? "#A1FBF9" : "#0E7A86", mode, 4.5),
        accentInk("#EC388A", mode, 4.5),
      ];

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div data-intro-item="" data-intro-step={0}>
            <SlideTitle brand={brand} title={s(c.title)} kicker={s(c.subtitle)} />
          </div>
          {s(c.question) && (
            <div
              data-title-subline
              className="mt-3"
              style={{
                fontSize: fillPx(30, "figure"),
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: ink.strong,
              }}
            >
              {s(c.question)}
            </div>
          )}
          <div className="mt-8 flex flex-col" style={{ gap: 26 }}>
            {rowsOfChips.map((row, ri) => (
              <div
                key={ri}
                data-intro-item=""
                data-intro-step={ri + 1}
                className="relative grid items-stretch"
                style={{
                  gridTemplateColumns: `repeat(${perRow}, minmax(0, 1fr))`,
                  columnGap: 16,
                  marginLeft: ri === 1 ? 96 : 0,
                }}
              >
                {/* Dotted travel rail behind the row, fading at both ends */}
                <div
                  aria-hidden
                  data-decorative
                  className="absolute"
                  style={{
                    left: 0,
                    right: 0,
                    top: "50%",
                    height: 1,
                    backgroundImage: `repeating-linear-gradient(90deg, color-mix(in oklab, ${cool} 55%, transparent) 0 6px, transparent 6px 14px)`,
                    maskImage:
                      "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
                    WebkitMaskImage:
                      "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
                  }}
                />
                {row.map((chipRaw, ci) => {
                  const chip = obj(chipRaw);
                  return (
                    <div
                      key={ci}
                      className="relative flex items-center justify-center px-4 text-center"
                      style={{ minHeight: 118 }}
                    >
                      <div
                        aria-hidden
                        data-decorative
                        className="absolute inset-0"
                        style={{ borderRadius: 20, backgroundImage: cardWashGradient(cool) }}
                      />
                      <div
                        aria-hidden
                        data-decorative
                        className="absolute inset-0"
                        style={openBottomFrame(cool, 20)}
                      />
                      <div
                        className="relative"
                        style={{
                          fontSize: chipFont,
                          fontWeight: 700,
                          letterSpacing: "-0.015em",
                          lineHeight: 1.24,
                          color: ink.strong,
                        }}
                      >
                        {s(typeof chipRaw === "string" ? chipRaw : chip.label)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {pillars.length > 0 && (
            <div
              data-intro-item=""
              data-intro-step={rowsOfChips.length + 1}
              className="mt-9 grid"
              style={{
                gridTemplateColumns: `repeat(${pillars.length}, minmax(0, 1fr))`,
                columnGap: 18,
              }}
            >
              {pillars.map((pillarRaw, pi) => {
                const pillar = obj(pillarRaw);
                const pillarOverride = itemTone(pillar);
                const tone = pillarOverride
                  ? accentInk(pillarOverride, mode, 4.5)
                  : pillarTones[pi % pillarTones.length];
                const pillarEndOverride = itemToneEnd(pillar);
                const toneEnd = pillarEndOverride ? accentInk(pillarEndOverride, mode, 4.5) : null;

                return (
                  <div
                    key={pi}
                    className="relative flex items-center justify-center px-6"
                    style={{
                      minHeight: 96,
                      borderRadius: 20,
                      backgroundColor: tone,
                      backgroundImage: toneEnd ? tonePlateGradient(tone, toneEnd) : undefined,
                      color: fillInk(tone, brand.tokens.primary),
                    }}
                  >
                    <div
                      style={{
                        fontSize: fillPx(28, "body"),
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.15,
                        textAlign: "center",
                      }}
                    >
                      {s(typeof pillarRaw === "string" ? pillarRaw : pillar.label)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <SummaryBand
            {...readSummary(c.summary)}
            data-intro-item=""
            data-intro-step={rowsOfChips.length + 2}
            accent={accent}
            leadTone={ink.strong}
            scale={0.85}
          />
        </SlideFrame>
      );
    }

    case "MV-PROC-BEFORE-AFTER-SPLIT": {
      // Two-state split with a centre hub: the "without" column reads in muted
      // neutral ink, the "with" column carries the division accent, and the hub
      // holds the platform promise. Panels fade out at the bottom (no bottom
      // frame) to match every other module surface in the system.
      const before = obj(c.before);
      const after = obj(c.after);
      const hub = obj(c.hub);
      const summary = obj(c.summary);
      // Cosmetic-only arrow treatment ("echo" | "thin" | "bold" | "dashed").
      // Accepted on the module or nested under hub so themed decks can match
      // stroke weight without any layout shift.
      const arrowVariant = coerceEchoArrowVariant(c.arrowStyle ?? hub.arrowStyle);

      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const cool = isDark ? "#7FB3F5" : "#3E7BD1";
      const beforeRows = arr(before.items).slice(0, 5);
      const afterRows = arr(after.items).slice(0, 5);
      const hubLines = arr(hub.lines)
        .map((l) => s(typeof l === "string" ? l : (l as { text?: unknown })?.text))
        .filter(Boolean)
        .slice(0, 4);

      const Column = ({
        side,
        heading,
        rows,
        tone,
      }: {
        side: "before" | "after";
        heading: string;
        rows: ReturnType<typeof arr>;
        tone: string;
      }) => (
        <div className="flex min-w-0 flex-col">
          {/* Column head: a kicker + accent seam instead of a heavy solid bar,
              so the panel opens with the same signature as every module card. */}
          <div className="relative pb-4">
            <div
              className="text-center"
              style={{
                fontSize: fillPx(20, "body"),
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: tone,
              }}
            >
              {heading}
            </div>
            <div
              aria-hidden
              data-decorative
              className="mx-auto mt-4"
              style={{
                height: SEAM_HEIGHT_PX,
                width: "56%",
                borderRadius: SEAM_HEIGHT_PX,
                backgroundImage: `linear-gradient(90deg, transparent, ${tone}, transparent)`,
              }}
            />
          </div>
          <div className="relative flex flex-1 flex-col px-2 pt-6">
            {/* Panel wash + open-bottom frame from the shared surface tokens. */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ borderRadius: 24, backgroundImage: cardWashGradient(tone) }}
            />
            <div
              aria-hidden
              data-decorative
              className="absolute inset-0"
              style={openBottomFrame(tone, 24)}
            />
            {rows.map((it, i) => (
              <div
                key={i}
                className="relative flex items-start gap-4 px-5 py-3.5"
                style={
                  i > 0
                    ? {
                        borderTop: `1px solid color-mix(in oklab, ${tone} 14%, transparent)`,
                      }
                    : undefined
                }
              >
                {/* Marker plate: soft accent disc, hairline ring, glyph inside. */}
                <span
                  className="relative flex shrink-0 items-center justify-center rounded-full"
                  style={{
                    width: 40,
                    height: 40,
                    marginTop: 2,
                    border: `1px solid color-mix(in oklab, ${tone} ${side === "after" ? 55 : 34}%, transparent)`,
                    backgroundImage: `linear-gradient(180deg, color-mix(in oklab, ${tone} ${isDark ? 26 : 16}%, transparent), color-mix(in oklab, ${tone} ${isDark ? 8 : 4}%, transparent))`,
                    opacity: side === "after" ? 1 : 0.82,
                  }}
                >
                  {side === "after" ? (
                    <Check size={20} strokeWidth={2.6} color={tone} aria-hidden />
                  ) : (
                    <XMark size={18} strokeWidth={2.4} color={tone} aria-hidden />
                  )}
                </span>
                <span className="min-w-0">
                  <span
                    className="block"
                    style={{
                      fontSize: fillPx(23, "body"),
                      fontWeight: 700,
                      color: side === "after" ? tone : ink.strong,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.15,
                    }}
                  >
                    {s(it.label)}
                  </span>
                  {s(it.body) && (
                    <span
                      className="mt-1 block"
                      style={{
                        fontSize: fillPx(18, "body"),
                        lineHeight: 1.35,
                        color: "color-mix(in oklab, currentColor 68%, transparent)",
                      }}
                    >
                      {s(it.body)}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />
          <div className="relative mt-7">
            <div
              className="grid items-stretch"
              style={{ gridTemplateColumns: "1fr 430px 1fr", columnGap: 0 }}
            >
              <Column
                side="before"
                heading={s(before.label) || "Before"}
                rows={beforeRows}
                tone={cool}
              />
              {/* Centre hub column: house arrows out to each state, promise inside
                  a layered orbit disc. */}
              <div className="relative flex items-center justify-center">
                <OrbitDisc size={300} accent={accent} cool={cool} isDark={isDark}>
                  <div
                    style={{
                      fontSize: fillPx(33, "figure"),
                      fontWeight: 800,
                      letterSpacing: "-0.035em",
                      color: ink.strong,
                      lineHeight: 1.05,
                    }}
                  >
                    {s(hub.title)}
                  </div>
                  <div
                    aria-hidden
                    className="mt-4 mb-4"
                    style={{
                      height: 1,
                      width: 54,
                      backgroundColor: `color-mix(in oklab, ${accent} 45%, transparent)`,
                    }}
                  />
                  <div className="flex flex-col gap-1.5">
                    {hubLines.map((line, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: fillPx(22, "body"),
                          fontWeight: 600,
                          lineHeight: 1.2,
                          letterSpacing: "-0.01em",
                          color:
                            i === hubLines.length - 1
                              ? accent
                              : "color-mix(in oklab, currentColor 72%, transparent)",
                        }}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                </OrbitDisc>

                {/* Echo chevrons: contained in the hub column's own gutter so
                    they read as motion radiating out of the disc without ever
                    crossing over the state panels beside them. */}
                <EchoArrow
                  tone={cool}
                  direction="left"
                  size={34}
                  variant={arrowVariant}
                  className="absolute"
                  style={{ left: 8, zIndex: 3 }}
                />
                <EchoArrow
                  tone={accent}
                  direction="right"
                  size={34}
                  variant={arrowVariant}
                  className="absolute"
                  style={{ right: 8, zIndex: 3 }}
                />
              </div>
              <Column
                side="after"
                heading={s(after.label) || "After"}
                rows={afterRows}
                tone={accent}
              />
            </div>
            <SummaryBand
              lead={s(summary.lead)}
              emphasis={s(summary.emphasis)}
              accent={accent}
              leadTone={ink.strong}
              scale={0.8}
            />
          </div>
        </SlideFrame>
      );
    }

    // ── Proof & Data ──────────────────────────────────────────────────
    // The logo-wall family (MV-PROOF-LOGOS*, MV-CASE-LOGO-GRID) now lives in
    // `modules/logos.tsx` (module registry).

      default:
        return null;
    }
  },
});

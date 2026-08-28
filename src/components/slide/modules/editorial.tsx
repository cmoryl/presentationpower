// Editorial family — the typographic spreads and poster variants: editorial
// spread, split manifesto, numbers triptych, vs-list and slider comparisons,
// pull-quote stack, definition, principles, countdown, horizon and the
// MV-ED-* hero/divider/poster/stat/quote posters. Extracted from the legacy
// `VariantRenderer` switch onto the module registry.

import React, { Fragment } from "react";
import { registerSlideModule } from "../module-registry";
import { MediaTile, SlideFrame, SlideTitle, arr, obj, s, strs, truthy, type Item } from "../module-kit";
import {
  Attribution,
  DisplayTitle,
  Hairline,
  Kicker,
  MetaRow,
  QuoteMark,
  SlideNumeral,
  StatFigure,
  SupportingText,
} from "../primitives";
import { AuroraOrb, GlassTile } from "../flagship";
import { FlowArrow } from "../Connectors";
import { OrbitDisc } from "../OrbitDisc";
import { HeroScrim } from "../HeroScrim";
import { SummaryBand } from "../SummaryBand";
import { cardWashGradient, openBottomFrame, SEAM_HEIGHT_PX } from "@/lib/surface-tokens";
import { accentInk, hexA } from "@/lib/accent-tokens";
import { fillPx, statPx, clampLines } from "@/lib/open-space-fill";
import { useSlideInk } from "../SlideChrome";
import type { CSSProperties } from "react";

export type { CSSProperties as _KitCss, Item as _KitItem };

registerSlideModule({
  id: "family:editorial",
  variantIds: [
    "MV-EDITORIAL-SPREAD",
    "MV-SPLIT-MANIFESTO",
    "MV-NUMBERS-TRIPTYCH",
    "MV-COMPARE-VS-LISTS",
    "MV-COMPARE-SLIDER",
    "MV-PULL-QUOTE-STACK",
    "MV-DEFINITION",
    "MV-PRINCIPLES",
    "MV-COUNTDOWN",
    "MV-HORIZON",
    "MV-ED-HERO-BLEED",
    "MV-ED-HERO-ORB",
    "MV-ED-DIVIDER-XL",
    "MV-ED-KICKER-POSTER",
    "MV-ED-STAT-PHOTO",
    "MV-ED-QUOTE-BLEED",
  ],
  render: (args) => {
    const { slide, variant, brand, pageNumber, c, mode, clientName, clientLogoUrl, dash, bareSurfaces, isDark, ink, accentTone } = args;
    void slide; void clientLogoUrl; void dash; void accentTone; void clientName; void bareSurfaces; void mode; void isDark;
    switch (variant.id) {
    case "MV-EDITORIAL-SPREAD": {
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full gap-16" style={{ gridTemplateColumns: "40% 1fr" }}>
            <div className="flex flex-col justify-between">
              <Kicker brand={brand}>{s(c.kicker, "Editorial")}</Kicker>
              <div>
                <StatFigure
                  brand={brand}
                  value={s(c.pullValue, "3×")}
                  unit={s(c.pullUnit)}
                  label={s(c.pullLabel)}
                  size="xl"
                  icon={s(c.icon)}
                  iconSize={s(c.iconSize)}
                />
              </div>
              <MetaRow>
                <span>{s(c.folio)}</span>
              </MetaRow>
            </div>
            <div className="flex h-full flex-col">
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={120}
                thicknessPx={2}
                className="mb-6"
              />
              <DisplayTitle size="section" color={ink.strong} maxWidthPx={1080}>
                {s(c.title)}
              </DisplayTitle>
              <div
                className="slide-fill-stretch mt-10 grid items-start gap-12"
                style={{ gridTemplateColumns: "1fr 1px 1fr" }}
              >
                <div
                  style={{
                    fontSize: fillPx(22, "body"),
                    lineHeight: 1.5,
                    color: "color-mix(in oklab, currentColor 78%, transparent)",
                  }}
                >
                  {s(c.bodyLeft)}
                </div>
                <div style={{ background: "rgba(10,15,28,0.15)" }} />
                <div
                  style={{
                    fontSize: fillPx(22, "body"),
                    lineHeight: 1.5,
                    color: "color-mix(in oklab, currentColor 78%, transparent)",
                  }}
                >
                  {s(c.bodyRight)}
                </div>
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-SPLIT-MANIFESTO": {
      const items = arr(c.items).slice(0, 3);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div
            className="grid h-full gap-0"
            style={{
              gridTemplateColumns: "40% 1fr",
              margin: "-64px",
              minHeight: "calc(100% + 128px)",
            }}
          >
            <div
              className="relative flex flex-col justify-between overflow-hidden p-16"
              style={{ background: "#03002C", color: "#FFFFFF" }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full"
                style={{
                  background: `radial-gradient(circle, ${hexA(brand.tokens.accent, 0.2)}, transparent 70%)`,
                }}
              />
              <Kicker brand={brand} color={ink.strong}>
                {s(c.kicker, "Our belief")}
              </Kicker>
              <div className="relative">
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={96}
                  thicknessPx={2}
                  className="mb-8"
                />
                <DisplayTitle size="section" color={ink.strong}>
                  {s(c.statement)}
                </DisplayTitle>
              </div>
              <MetaRow>
                <span>{s(c.signoff, "TransPerfect")}</span>
              </MetaRow>
            </div>
            <div className="flex flex-col justify-center gap-12 p-16">
              {items.map((it, i) => (
                <div
                  key={i}
                  className="pt-6"
                  style={{ borderTop: `2px solid ${brand.tokens.accent}` }}
                >
                  <div className="flex items-baseline gap-6">
                    <SlideNumeral value={i + 1} sizePx={26} />
                    <div className="flex-1">
                      <div
                        style={{
                          fontSize: fillPx(34, "figure"),
                          fontWeight: 600,
                          color: ink.strong,
                          letterSpacing: "-0.015em",
                          lineHeight: 1.15,
                        }}
                      >
                        {s(it.title)}
                      </div>
                      <div
                        className="mt-2"
                        style={{
                          fontSize: fillPx(22, "body"),
                          lineHeight: 1.42,
                          color: "color-mix(in oklab, currentColor 72%, transparent)",
                        }}
                      >
                        {s(it.body)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-NUMBERS-TRIPTYCH": {
      const items = arr(c.items).slice(0, 3);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div
            className="slide-fill-stretch mt-16 grid"
            style={{ gridTemplateColumns: "1fr 1px 1fr 1px 1fr" }}
          >
            {items.map((it, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ background: ink.hairline }} />}
                <div className="flex h-full flex-col justify-between px-10 py-2">
                  <div
                    className="uppercase"
                    style={{
                      fontSize: fillPx(13, "kicker"),
                      letterSpacing: "0.28em",
                      fontWeight: 700,
                      color: "var(--slide-accent-text)",
                    }}
                  >
                    {s(it.label) || `0${i + 1}`}
                  </div>
                  <div
                    className="mt-6 tabular-nums flex items-baseline gap-2"
                    style={{
                      fontSize: fillPx(108, "display"),
                      fontWeight: 600,
                      lineHeight: 0.95,
                      letterSpacing: "-0.04em",
                      color: ink.strong,
                    }}
                  >
                    <span>{s(it.value) || "—"}</span>
                    {s(it.unit) && (
                      <span
                        style={{
                          fontSize: fillPx(52, "figure"),
                          fontWeight: 500,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {s(it.unit)}
                      </span>
                    )}
                  </div>
                  {s(it.note) && (
                    <div
                      className="mt-8"
                      style={{
                        fontSize: fillPx(20, "body"),
                        lineHeight: 1.5,
                        color: ink.muted,
                        maxWidth: 460,
                      }}
                    >
                      {s(it.note)}
                    </div>
                  )}
                  {s(it.source) && (
                    <div
                      className="mt-6 uppercase"
                      style={{
                        fontSize: fillPx(11, "kicker"),
                        letterSpacing: "0.24em",
                        color: ink.faint,
                        fontWeight: 600,
                      }}
                    >
                      {s(it.source)}
                    </div>
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
        </SlideFrame>
      );
    }

    case "MV-COMPARE-VS-LISTS": {
      // Two label lists set head-to-head with a centre VS disc. Panels use the
      // house open-bottom frame + accent seam head; the close line rides in a
      // SummaryBand so it matches every other module surface.
      const left = obj(c.left);
      const right = obj(c.right);
      const summary = obj(c.summary);
      // Mode-aware accent: on dark grounds the raw division accent (Blue 500)
      // is too deep to read as text or as a hairline, so lift it onto the
      // shared accentInk ramp. Light mode is unchanged.
      const accent = accentInk(brand.tokens.accent, mode, 4.5);
      const cool = isDark ? "#7FB3F5" : "#3E7BD1";
      const leftRows = arr(left.items).slice(0, 8);
      const rightRows = arr(right.items).slice(0, 8);
      const rowCount = Math.max(leftRows.length, rightRows.length, 1);
      const rowFont = rowCount > 7 ? 24 : rowCount > 5 ? 26 : 28;
      const rowPad = rowCount > 7 ? 12 : rowCount > 5 ? 16 : 20;

      const VsColumn = ({
        heading,
        rows,
        tone,
        emphasis,
      }: {
        heading: string;
        rows: ReturnType<typeof arr>;
        tone: string;
        emphasis: boolean;
      }) => (
        <div className="flex min-w-0 flex-col">
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
                width: "62%",
                borderRadius: SEAM_HEIGHT_PX,
                backgroundImage: `linear-gradient(90deg, transparent, ${tone}, transparent)`,
              }}
            />
          </div>
          <div className="relative flex flex-1 flex-col justify-center px-2 pt-5">
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
            {rows.map((it, i) => {
              const label = s(typeof it === "string" ? it : it.label);
              return (
                <div
                  key={i}
                  className="relative flex items-center gap-5 px-7"
                  style={{
                    paddingTop: rowPad,
                    paddingBottom: rowPad,
                    borderTop:
                      i > 0 ? `1px solid color-mix(in oklab, ${tone} 16%, transparent)` : undefined,
                  }}
                >
                  <span
                    aria-hidden
                    className="shrink-0 rounded-full"
                    style={{
                      width: 14,
                      height: 14,
                      backgroundColor: tone,
                      opacity: emphasis ? 1 : 0.85,
                      boxShadow: emphasis
                        ? `0 0 0 4px color-mix(in oklab, ${tone} 18%, transparent)`
                        : undefined,
                    }}
                  />
                  <span
                    className="min-w-0"
                    style={{
                      fontSize: rowFont,
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.15,
                      color: emphasis
                        ? ink.strong
                        : "color-mix(in oklab, currentColor 82%, transparent)",
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          {s(c.subtitle) && (
            <div
              data-title-subline
              className="mt-3"
              style={{
                fontSize: fillPx(30, "figure"),
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: accent,
              }}
            >
              {s(c.subtitle)}
            </div>
          )}
          <div className="relative mt-8">
            <div
              className="grid items-stretch"
              style={{ gridTemplateColumns: "1fr 170px 1fr", columnGap: 0 }}
            >
              <VsColumn
                heading={s(left.label) || "Option A"}
                rows={leftRows}
                tone={cool}
                emphasis={false}
              />
              <div className="relative flex items-center justify-center">
                <OrbitDisc size={130} accent={accent} cool={cool} isDark={isDark}>
                  <div
                    style={{
                      fontSize: fillPx(34, "figure"),
                      fontWeight: 800,
                      letterSpacing: "0.02em",
                      color: ink.strong,
                      lineHeight: 1,
                    }}
                  >
                    VS
                  </div>
                </OrbitDisc>
              </div>
              <VsColumn
                heading={s(right.label) || "Option B"}
                rows={rightRows}
                tone={accent}
                emphasis
              />
            </div>
            {(s(summary.lead) || s(summary.emphasis)) && (
              <SummaryBand
                lead={s(summary.lead)}
                emphasis={s(summary.emphasis)}
                accent={accent}
                leadTone={ink.strong}
                scale={0.85}
              />
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-COMPARE-SLIDER": {
      const before = obj(c.before);
      const after = obj(c.after);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <AuroraOrb x={92} y={32} size={880} />
          <div className="relative flex h-full flex-col">
            <SlideTitle brand={brand} title={s(c.title, variant.name)} />
            <div
              className="slide-fill-stretch relative mt-16 grid items-stretch gap-8"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              <GlassTile radius={26} padding="px-12 py-12" intensity={0.65}>
                <div style={{ opacity: 0.72 }}>
                  <div className="mb-6" style={{ height: 2, background: ink.axis, width: 96 }} />
                  <Kicker brand={brand} color={ink.muted}>
                    {s(before.label, "Before")}
                  </Kicker>
                  <div className="mt-8">
                    <StatFigure
                      brand={brand}
                      value={s(before.value)}
                      unit={s(before.unit)}
                      size="lg"
                      valueColor={ink.muted}
                      icon={s(before.icon)}
                      iconSize={s(before.iconSize)}
                    />
                  </div>
                  <div
                    className="mt-6"
                    style={{ fontSize: fillPx(22, "body"), lineHeight: 1.42, color: ink.muted }}
                  >
                    {s(before.body)}
                  </div>
                </div>
              </GlassTile>
              <GlassTile radius={26} padding="px-12 py-12">
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={96}
                  thicknessPx={2}
                  className="mb-6"
                />
                <Kicker brand={brand}>{s(after.label, "After")}</Kicker>
                <div className="mt-8">
                  <StatFigure
                    brand={brand}
                    value={s(after.value)}
                    unit={s(after.unit)}
                    size="xl"
                    icon={s(after.icon)}
                    iconSize={s(after.iconSize)}
                  />
                </div>
                <div
                  className="mt-6"
                  style={{ fontSize: fillPx(24, "body"), lineHeight: 1.42, color: ink.body }}
                >
                  {s(after.body)}
                </div>
              </GlassTile>
              <div
                aria-hidden
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: "50%" }}
              >
                <div
                  data-accent-glow
                  className="flex h-16 w-16 items-center justify-center rounded-full"
                  style={{
                    background: brand.tokens.accent,
                    color: ink.onSurface(brand.tokens.accent),
                    fontSize: fillPx(28, "body"),
                    fontWeight: 600,
                    boxShadow: `0 8px 32px -6px ${brand.tokens.accent}`,
                  }}
                >
                  <FlowArrow
                    size={26}
                    color={ink.onSurface(brand.tokens.accent)}
                    accent={brand.tokens.accent}
                  />
                </div>
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-PULL-QUOTE-STACK": {
      const hero = obj(c.hero);
      const items = arr(c.items).slice(0, 2);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="relative flex h-full flex-col justify-between">
            <QuoteMark
              color={"var(--slide-accent-text)"}
              size={520}
              className="absolute -left-6 -top-24"
            />
            <div className="relative">
              <Kicker brand={brand}>Voices</Kicker>
              <div
                className="mt-8 max-w-[1500px]"
                style={{
                  fontSize: fillPx(60, "display"),
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  fontWeight: 600,
                  color: ink.strong,
                }}
              >
                &ldquo;{s(hero.quote)}&rdquo;
              </div>
              <div className="mt-10">
                <Attribution
                  brand={brand}
                  name={s(hero.name)}
                  role={s(hero.role)}
                  org={s(hero.org)}
                />
              </div>
            </div>
          </div>
          <div className="mt-12 grid gap-12" style={{ gridTemplateColumns: "1fr 1px 1fr" }}>
            {items[0] && (
              <div className="pt-6" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                <div
                  style={{
                    fontSize: fillPx(26, "body"),
                    lineHeight: 1.35,
                    color: "color-mix(in oklab, currentColor 82%, transparent)",
                  }}
                >
                  &ldquo;{s(items[0].quote)}&rdquo;
                </div>
                <div className="mt-5">
                  <Attribution
                    brand={brand}
                    name={s(items[0].name)}
                    role={s(items[0].role)}
                    org={s(items[0].org)}
                  />
                </div>
              </div>
            )}
            <div style={{ background: `${ink.hairline}` }} />
            {items[1] && (
              <div className="pt-6" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                <div
                  style={{
                    fontSize: fillPx(26, "body"),
                    lineHeight: 1.35,
                    color: "color-mix(in oklab, currentColor 82%, transparent)",
                  }}
                >
                  &ldquo;{s(items[1].quote)}&rdquo;
                </div>
                <div className="mt-5">
                  <Attribution
                    brand={brand}
                    name={s(items[1].name)}
                    role={s(items[1].role)}
                    org={s(items[1].org)}
                  />
                </div>
              </div>
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-DEFINITION": {
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center" style={{ maxWidth: 1500 }}>
            <Kicker brand={brand}>Definition</Kicker>
            <div className="mt-6">
              <DisplayTitle size="section" color={ink.strong}>
                {s(c.term)}
              </DisplayTitle>
            </div>
            <div className="mt-6 flex flex-wrap items-baseline gap-6">
              <span
                className="uppercase"
                style={{
                  fontSize: fillPx(20, "body"),
                  letterSpacing: "0.28em",
                  color: ink.faint,
                  fontWeight: 500,
                }}
              >
                {s(c.pronunciation)}
              </span>
              <span
                style={{
                  fontSize: fillPx(24, "body"),
                  color: "var(--slide-accent-text)",
                  fontWeight: 600,
                }}
              >
                {s(c.partOfSpeech, "n.")}
              </span>
            </div>
            <div
              className="mt-10"
              style={{
                fontSize: fillPx(34, "figure"),
                lineHeight: 1.35,
                color: "color-mix(in oklab, currentColor 85%, transparent)",
                maxWidth: 1400,
              }}
            >
              {s(c.definition)}
            </div>
            {s(c.usage) && (
              <div
                className="mt-12 pt-8"
                style={{ borderTop: "1px solid rgba(10,15,28,0.15)", maxWidth: 1400 }}
              >
                <span
                  className="uppercase mr-4"
                  style={{
                    fontSize: fillPx(14, "kicker"),
                    letterSpacing: "0.28em",
                    color: "var(--slide-accent-text)",
                    fontWeight: 600,
                  }}
                >
                  Usage
                </span>
                <span
                  style={{
                    fontSize: fillPx(24, "body"),
                    lineHeight: 1.45,
                    color: "color-mix(in oklab, currentColor 65%, transparent)",
                  }}
                >
                  {s(c.usage)}
                </span>
              </div>
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-PRINCIPLES": {
      const items = arr(c.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-12">
            {items.map((it, i) => (
              <div
                key={i}
                className="relative grid items-center gap-8 py-8"
                style={{
                  gridTemplateColumns: "160px 1fr",
                  borderTop: i === 0 ? `1px solid ${ink.hairline}` : "none",
                  borderBottom: `1px solid ${ink.hairline}`,
                }}
              >
                <div
                  className="tabular-nums font-semibold"
                  style={{
                    fontSize: fillPx(120, "display"),
                    lineHeight: 1,
                    letterSpacing: "-0.03em",
                    color: "var(--slide-accent-text)",
                    opacity: 0.18,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: fillPx(40, "figure"),
                      fontWeight: 600,
                      color: ink.strong,
                      letterSpacing: "-0.015em",
                      lineHeight: 1.1,
                    }}
                  >
                    {s(it.statement)}
                  </div>
                  <div
                    className="mt-2"
                    style={{
                      fontSize: fillPx(22, "body"),
                      lineHeight: 1.42,
                      color: "color-mix(in oklab, currentColor 72%, transparent)",
                    }}
                  >
                    {s(it.body)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );
    }

    case "MV-COUNTDOWN": {
      const items = arr(c.items).slice(0, 3);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <AuroraOrb x={92} y={30} size={880} />
          <div className="relative grid h-full grid-cols-[1fr_1fr] items-center gap-16">
            <div>
              <Kicker brand={brand} color={"var(--slide-accent-text)"}>
                {s(c.kicker, "Three to remember")}
              </Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={120}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <DisplayTitle size="hero" color={ink.strong} maxWidthPx={880}>
                {s(c.title)}
              </DisplayTitle>
            </div>
            <GlassTile radius={28} padding="px-10 py-8">
              {items.map((it, i) => {
                const n = items.length - i;
                return (
                  <div
                    key={i}
                    className="grid items-center gap-8 py-6"
                    style={{
                      gridTemplateColumns: "140px 1fr",
                      borderTop: i === 0 ? "none" : `1px solid ${ink.hairline}`,
                    }}
                  >
                    <div
                      className="tabular-nums font-semibold"
                      style={{
                        fontSize: fillPx(96, "display"),
                        lineHeight: 0.95,
                        letterSpacing: "-0.025em",
                        color: "var(--slide-accent-text)",
                      }}
                    >
                      {n}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: fillPx(32, "figure"),
                          fontWeight: 600,
                          color: ink.strong,
                          letterSpacing: "-0.02em",
                          lineHeight: 1.12,
                        }}
                      >
                        {s(it.statement)}
                      </div>
                      <div
                        className="mt-2"
                        style={{ fontSize: fillPx(20, "body"), lineHeight: 1.42, color: ink.muted }}
                      >
                        {s(it.body)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </GlassTile>
          </div>
        </SlideFrame>
      );
    }

    case "MV-HORIZON": {
      const items = arr(c.items).slice(0, 3);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, variant.name)} />
          <div className="mt-10">
            {items.map((it, i) => {
              const itemInk = i === 0 ? ink.strong : i === 1 ? ink.muted : ink.faint;
              const labelColor = i === 0 ? "var(--slide-accent-text)" : ink.faint;
              return (
                <div
                  key={i}
                  className="grid gap-12 py-10"
                  style={{
                    gridTemplateColumns: "200px 1fr",
                    borderTop: `1px solid ${ink.hairline}`,
                    borderBottom: i === items.length - 1 ? `1px solid ${ink.hairline}` : "none",
                  }}
                >
                  <div
                    className="uppercase"
                    style={{
                      fontSize: fillPx(20, "body"),
                      letterSpacing: "0.28em",
                      color: labelColor,
                      fontWeight: 600,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: fillPx(44, "figure"),
                        fontWeight: 600,
                        color: itemInk,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.1,
                      }}
                    >
                      {s(it.headline)}
                    </div>
                    <div
                      className="mt-3"
                      style={{
                        fontSize: fillPx(22, "body"),
                        lineHeight: 1.42,
                        color: itemInk,
                        opacity: 0.85,
                        maxWidth: 1200,
                      }}
                    >
                      {s(it.body)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    // ── Dashboard family ────────────────────────────────────────────────
    // Every MV-DASH-* treatment now lives in `modules/dashboard.tsx`
    // (module registry).

    // ── Typographic statistics family ───────────────────────────────────
    // Every MV-STAT-* treatment now lives in `modules/stat.tsx`
    // (module registry).


    // ── Editorial hero tier ───────────────────────────────────────────────
    case "MV-ED-HERO-BLEED": {
      const _len = s(c.title).length;
      const _size = _len > 70 ? "title" : _len > 40 ? "section" : "cover";
      return (
        // The type stack owns the lower-left of the frame, so the lockup signs
        // off in the clear upper-right corner instead of sitting under the
        // title (LF-05 would otherwise pin it bottom-left).
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover" logoPosition="top-right">
          <MediaTile
            brand={brand}
            seed={s(c.mediaSeed, s(c.title, "editorial-bleed"))}
            overrideUrl={s(c.mediaUrl)}
            fit={s(c.mediaFit) || undefined}
            focus={s(c.mediaFocus) || undefined}
            zoom={Number(c.mediaZoom) || undefined}
            mediaPath={s(c.mediaPath)}
            className="absolute inset-0 h-full w-full rounded-none"
          />
          <HeroScrim brand={brand} anchor="bottom" />
          {/* Kicker keeps clear of the upper-right lockup. */}
          <div className="absolute inset-x-24 top-24 flex items-start pr-[380px]">
            {s(c.kicker) && (
              <Kicker brand={brand} tracking="0.36em">
                {s(c.kicker)}
              </Kicker>
            )}
          </div>
          {/* Copy stack sits above the locked footer band (bottom 40 + ~28px
              of type) so the title never collides with the meta line or the
              page number. Ink follows the slide mode — the bottom scrim is a
              white wash in light mode, so forcing white text made the title
              vanish. */}
          <div
            data-on-media
            className="absolute inset-x-24 flex flex-col"
            style={{ bottom: 148, color: ink.strong }}
          >
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={120}
              thicknessPx={2}
              className="mb-8"
            />
            <DisplayTitle size={_size} color={ink.strong} maxWidthPx={1500}>
              {s(c.title, "One line. Say it well.")}
            </DisplayTitle>
            {s(c.subtitle) && (
              <SupportingText size="lg" opacity={0.85} maxWidthPx={1240} className="mt-6">
                {s(c.subtitle)}
              </SupportingText>
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-ED-HERO-ORB": {
      // Two soft aurora orbs behind minimal type. Tokens are palette-locked.
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ background: isDark ? brand.tokens.primary : "#F4F7FD" }}
          >
            <div
              aria-hidden
              className="absolute"
              style={{
                width: 1100,
                height: 1100,
                left: -220,
                top: -260,
                borderRadius: "50%",
                background: `radial-gradient(circle at 30% 30%, ${hexA(brand.tokens.accent, isDark ? 0.8 : 0.34)} 0%, ${hexA(brand.tokens.accent, 0.0)} 60%)`,
                filter: "blur(60px)",
                opacity: isDark ? 0.85 : 0.7,
              }}
            />
            <div
              aria-hidden
              className="absolute"
              style={{
                width: 900,
                height: 900,
                right: -180,
                bottom: -220,
                borderRadius: "50%",
                background: `radial-gradient(circle at 60% 40%, ${hexA(brand.tokens.accent, isDark ? 0.502 : 0.24)} 0%, ${hexA(brand.tokens.accent, 0.0)} 60%)`,
                filter: "blur(80px)",
                opacity: isDark ? 0.75 : 0.6,
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background: isDark
                  ? `linear-gradient(180deg, ${brand.tokens.primary}00 0%, ${brand.tokens.primary}66 100%)`
                  : "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.86) 100%)",
              }}
            />
          </div>
          <div className="relative flex h-full flex-col justify-center">
            {s(c.kicker) && (
              <Kicker brand={brand} tracking="0.36em">
                {s(c.kicker)}
              </Kicker>
            )}
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={120}
              thicknessPx={2}
              className="mt-8"
            />
            <DisplayTitle size="hero" color={ink.strong} maxWidthPx={1620} className="mt-10">
              {s(c.title, "Signal through the noise.")}
            </DisplayTitle>
            {s(c.subtitle) && (
              <SupportingText size="xl" opacity={0.82} maxWidthPx={1180} className="mt-10">
                {s(c.subtitle)}
              </SupportingText>
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-ED-DIVIDER-XL": {
      const numeral = s(c.numeral, `0${Math.max(1, pageNumber)}`.slice(-2));
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="divider">
          <div className="grid h-full grid-cols-[auto_1fr] items-center gap-16">
            <div
              style={{
                fontSize: fillPx(360, "display"),
                lineHeight: 0.85,
                fontWeight: 700,
                letterSpacing: "-0.05em",
                color: "var(--slide-accent-text)",
                opacity: 0.9,
              }}
            >
              {numeral}
            </div>
            <div className="flex flex-col">
              {s(c.kicker) && (
                <Kicker brand={brand} tracking="0.36em">
                  {s(c.kicker, "Chapter")}
                </Kicker>
              )}
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={120}
                thicknessPx={2}
                className="mt-8"
              />
              <DisplayTitle size="section" color={ink.strong} maxWidthPx={1080} className="mt-8">
                {s(c.title, "New chapter")}
              </DisplayTitle>
              {s(c.subtitle) && (
                <SupportingText size="lg" opacity={0.78} maxWidthPx={960} className="mt-8">
                  {s(c.subtitle)}
                </SupportingText>
              )}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-ED-KICKER-POSTER": {
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="flex h-full flex-col justify-between py-4">
            <div
              className="uppercase"
              style={{
                fontSize: fillPx(44, "figure"),
                letterSpacing: "0.42em",
                color: "var(--slide-accent-text)",
                fontWeight: 600,
              }}
            >
              {s(c.kicker, "A briefing")}
            </div>
            <DisplayTitle size="hero" color={ink.strong} maxWidthPx={1720} className="uppercase">
              {s(c.title, "The Signal")}
            </DisplayTitle>
            <div className="flex items-center justify-between">
              <Hairline color={"var(--slide-accent-text)"} widthPx={200} thicknessPx={3} />
              <MetaRow>
                <span>{s(c.meta, "Confidential")}</span>
                <span>№ {String(pageNumber).padStart(2, "0")}</span>
              </MetaRow>
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-ED-STAT-PHOTO": {
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover" logoPosition="top-right">
          <MediaTile
            brand={brand}
            seed={s(c.mediaSeed, s(c.label, "stat-photo"))}
            overrideUrl={s(c.mediaUrl)}
            fit={s(c.mediaFit) || undefined}
            focus={s(c.mediaFocus) || undefined}
            zoom={Number(c.mediaZoom) || undefined}
            mediaPath={s(c.mediaPath)}
            className="absolute inset-0 h-full w-full rounded-none"
          />
          <HeroScrim brand={brand} anchor="bottom" />
          <div
            data-on-media
            className="absolute inset-x-24 bottom-48 flex items-end justify-between gap-16 text-white"
          >
            <div className="flex-shrink-0">
              <div
                style={{
                  fontSize: fillPx(260, "display"),
                  lineHeight: 0.88,
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  color: "var(--slide-accent-text)",
                }}
              >
                {s(c.stat, "97")}
                <span style={{ fontSize: fillPx(130, "display"), marginLeft: 8 }}>
                  {s(c.unit, "%")}
                </span>
              </div>
              {s(c.label) && (
                <div
                  className="mt-4 uppercase"
                  style={{ fontSize: fillPx(24, "body"), letterSpacing: "0.28em", opacity: 0.85 }}
                >
                  {s(c.label)}
                </div>
              )}
            </div>
            {s(c.narrative) && (
              <SupportingText size="lg" opacity={0.9} maxWidthPx={720} className="pb-4">
                {s(c.narrative)}
              </SupportingText>
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-ED-QUOTE-BLEED": {
      const quote = s(c.quote, "The best interfaces get out of the way.").replace(
        /^["'“”]|["'“”]$/g,
        "",
      );
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <MediaTile
            brand={brand}
            seed={s(c.mediaSeed, s(c.attribution, "quote-bleed"))}
            overrideUrl={s(c.mediaUrl)}
            fit={s(c.mediaFit) || undefined}
            focus={s(c.mediaFocus) || undefined}
            zoom={Number(c.mediaZoom) || undefined}
            mediaPath={s(c.mediaPath)}
            className="absolute inset-0 h-full w-full rounded-none"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${brand.tokens.primary}CC 0%, ${brand.tokens.primary}99 50%, ${brand.tokens.primary}E6 100%)`,
            }}
          />
          <div data-on-media className="relative flex h-full flex-col justify-center text-white">
            <QuoteMark color={"var(--slide-accent-text)"} />
            <div
              className="mt-6"
              style={{
                fontSize: quote.length > 160 ? 64 : quote.length > 100 ? 80 : 104,
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
                fontWeight: 500,
                maxWidth: 1620,
              }}
            >
              {quote}
            </div>
            <div className="mt-12">
              <Attribution
                brand={brand}
                name={s(c.attribution, "Attributed source")}
                role={s(c.role) || undefined}
              />
            </div>
          </div>
        </SlideFrame>
      );
    }

    // ── Locations (MV-LOC-*) ──────────────────────────────────────────────

    default:
      return null;
    }
  },
});

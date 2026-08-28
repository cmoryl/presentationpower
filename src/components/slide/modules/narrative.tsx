// Narrative family — context/challenge cards, solution pillars, insight
// callouts, proof stats and the testimonial spread. Extracted verbatim from the
// legacy `VariantRenderer` switch onto the module registry.
//
// `CardGrid`, `AuroraStatGrid`, `Card` and `IconBadge` are still owned by
// `VariantRenderer` (they depend on that file's style-pack + media plumbing),
// so this module renders the kit proxies rather than importing them, which
// would create a cycle.

import React from "react";
import { registerSlideModule } from "../module-registry";
import {
  AuroraStatGrid,
  Card,
  CardGrid,
  IconBadge,
  NumberedList,
  SlideFrame,
  SlideTitle,
  arr,
  lastWord,
  obj,
  s,
  strs,
  truthy,
} from "../module-kit";
import {
  Attribution,
  DisplayTitle,
  Hairline,
  SlideNumeral,
  SoftDivider,
  Kicker,
  MetaRow,
  QuoteMark,
  StatFigure,
  SupportingText,
} from "../primitives";
import {
  AuroraOrb,
  EditorialTitle,
  GlassTile,
  PullQuote,
  StatRail,
  moduleCardSurface,
} from "../flagship";
import { SummaryBand, readSummary } from "../SummaryBand";
import { accentInk, hexA } from "@/lib/accent-tokens";
import { iconByName } from "@/lib/icon-library";
import { fillPx } from "@/lib/open-space-fill";
import { statGradient } from "@/lib/stat-contrast";
import { SEAM_HEIGHT_PX } from "@/lib/surface-tokens";

registerSlideModule({
  id: "family:narrative",
  variantIds: [
    "MV-CTX-CARDS-2",
    "MV-CTX-CARDS-3",
    "MV-CTX-CARDS-4",
    "MV-CTX-COST",
    "MV-CTX-STAT-GRID",
    "MV-CTX-TREND",
    "MV-CTX-CHALLENGE-STACK",
    "MV-SOL-PILLARS-2",
    "MV-SOL-PILLARS-3",
    "MV-SOL-PILLARS-4",
    "MV-SOL-PILLARS-5",
    "MV-SOL-ARCHITECTURE",
    "MV-SOL-FEATURE-LIST",
    "MV-INS-CALLOUT",
    "MV-INS-BIG-IDEA",
    "MV-INS-SO-WHAT",
    "MV-INS-QUOTE",
    "MV-INS-OPPORTUNITY-SIZE",
    "MV-PROOF-STATS-2",
    "MV-PROOF-STATS-3",
    "MV-PROOF-STATS-4",
    "MV-PROOF-TESTIMONIAL",
  ],
  render: ({ variant, brand, pageNumber, c, mode, isDark, ink }) => {
    switch (variant.id) {
    case "MV-CTX-CARDS-3":
    case "MV-SOL-PILLARS-3":
      return (
        <CardGrid
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items)}
          cols={3}
        />
      );

    case "MV-CTX-CARDS-2":
    case "MV-SOL-PILLARS-2":
      return (
        <CardGrid
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items)}
          cols={2}
        />
      );

    case "MV-CTX-CARDS-4":
    case "MV-SOL-PILLARS-4":
      return (
        <CardGrid
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items)}
          cols={2}
          rows={2}
        />
      );

    case "MV-CTX-COST": {
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-[1.05fr_1fr] items-center gap-24">
            <div className="min-w-0">
              <Kicker brand={brand}>Cost of inaction</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={88}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <StatFigure
                brand={brand}
                value={s(c.stat)}
                unit={s(c.unit)}
                label={s(c.label)}
                size="xl"
                icon={s(c.icon)}
                iconSize={s(c.iconSize)}
              />
            </div>
            <SupportingText size="xl" opacity={0.85} maxWidthPx={720}>
              {s(c.narrative)}
            </SupportingText>
          </div>
        </SlideFrame>
      );
    }

    case "MV-PROOF-STATS-4":
      return (
        <AuroraStatGrid
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items)}
          cols={2}
          rows={2}
          align={s(c.align) === "center" ? "center" : "left"}
        />
      );

    case "MV-CTX-STAT-GRID":
      return (
        <AuroraStatGrid
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items)}
          cols={2}
          rows={2}
          align={s(c.align) === "center" ? "center" : "left"}
        />
      );

    case "MV-PROOF-STATS-2":
      return (
        <AuroraStatGrid
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items)}
          cols={2}
          align={s(c.align) === "center" ? "center" : "left"}
        />
      );

    case "MV-PROOF-STATS-3":
    case "MV-INS-OPPORTUNITY-SIZE":
      return (
        <AuroraStatGrid
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items)}
          cols={3}
          align={s(c.align) === "center" ? "center" : "left"}
        />
      );

    case "MV-CTX-TREND":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center">
            <Kicker brand={brand}>
              <span
                className="mr-4 inline-block align-[-0.15em]"
                style={{ fontSize: fillPx(44, "figure"), letterSpacing: 0 }}
              >
                {s(c.direction) === "down" ? "\u2193" : "\u2191"}
              </span>
              Trend
            </Kicker>
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={88}
              thicknessPx={2}
              className="mt-6 mb-8"
            />
            <DisplayTitle size="section" color={ink.strong} maxWidthPx={1500}>
              {s(c.headline)}
            </DisplayTitle>
            <SupportingText size="lg" opacity={0.8} maxWidthPx={1180} className="mt-10">
              {s(c.narrative)}
            </SupportingText>
          </div>
        </SlideFrame>
      );

    case "MV-CTX-CHALLENGE-STACK":
      return (
        <NumberedList
          brand={brand}
          pageNumber={pageNumber}
          title={s(c.title)}
          items={arr(c.items)}
        />
      );

    // ── Insight ────────────────────────────────────────────────────────
    case "MV-INS-CALLOUT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center">
            <Kicker brand={brand}>Insight</Kicker>
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={88}
              thicknessPx={2}
              className="mt-6 mb-10"
            />
            <DisplayTitle size="section" color={ink.strong} maxWidthPx={1520}>
              {s(c.insight)}
            </DisplayTitle>
            <SupportingText size="lg" opacity={0.8} maxWidthPx={1180} className="mt-10">
              {s(c.narrative)}
            </SupportingText>
          </div>
        </SlideFrame>
      );

    case "MV-INS-BIG-IDEA":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          {/* Ambient spotlight — a large diffuse glow behind the idea makes
              the hero moment breathe. Second, tighter halo adds focus. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(60% 55% at 22% 55%, ${brand.tokens.accent}${isDark ? "28" : "1A"} 0%, transparent 65%),
                radial-gradient(28% 26% at 22% 55%, ${brand.tokens.accent}${isDark ? "3A" : "22"} 0%, transparent 70%)
              `,
            }}
          />
          <div className="relative flex h-full flex-col justify-center">
            <div className="flex items-center gap-4 tp-rise">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  background: brand.tokens.accent,
                  boxShadow: `0 0 24px ${brand.tokens.accent}, 0 0 8px ${brand.tokens.accent}`,
                }}
              />
              <Kicker brand={brand}>{s(c.kicker, "The big idea")}</Kicker>
            </div>
            <div className="mt-10 flex items-start gap-8 tp-rise tp-rise-delay-1">
              <StatRail color={"var(--slide-accent-text)"} height={220} className="mt-4" />
              <div className="flex-1">
                <EditorialTitle
                  text={s(c.idea)}
                  emphasize={s(c.ideaEmphasis) || lastWord(s(c.idea))}
                  color={ink.strong}
                  accentColor={brand.tokens.accent}
                  size={124}
                  maxWidthPx={1580}
                />
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-INS-SO-WHAT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-center">
            <div className="grid grid-cols-3">
              {[
                { label: "Insight", body: s(c.insight) },
                { label: "So what", body: s(c.soWhat) },
                { label: "Now what", body: s(c.nowWhat) },
              ].map((b, i) => (
                <div
                  key={i}
                  className="px-10 first:pl-0 last:pr-0"
                  style={{
                    borderLeft: i === 0 ? undefined : "1px solid rgba(10,15,28,0.10)",
                  }}
                >
                  <Hairline
                    color={"var(--slide-accent-text)"}
                    widthPx={44}
                    thicknessPx={2}
                    className="mb-6"
                  />
                  <Kicker brand={brand}>{b.label}</Kicker>
                  <div
                    className="mt-6"
                    style={{
                      fontSize: fillPx(34, "figure"),
                      lineHeight: 1.28,
                      letterSpacing: "-0.01em",
                      color: ink.strong,
                    }}
                  >
                    {b.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-INS-QUOTE": {
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="relative flex h-full flex-col justify-center">
            <GlassTile radius={28} padding="px-24 py-24" className="relative overflow-visible">
              <div className="relative">
                <div className="flex items-center gap-4 tp-rise">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      background: brand.tokens.accent,
                      boxShadow: `0 0 20px ${brand.tokens.accent}`,
                    }}
                  />
                  <Kicker brand={brand}>In their words</Kicker>
                </div>
                <div className="mt-16 mb-16 tp-rise tp-rise-delay-1">
                  <PullQuote
                    quote={s(c.quote)}
                    brand={brand}
                    size={78}
                    color={ink.strong}
                    closingGlyph
                  />
                </div>
                <div
                  className="mt-10 h-[2px] w-[120px] rounded-full tp-rise tp-rise-delay-2"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${brand.tokens.accent} 0%, ${hexA(brand.tokens.accent, 0.0)} 100%)`,
                  }}
                />
                <div className="mt-8 tp-rise tp-rise-delay-3">
                  <Attribution brand={brand} name={s(c.attribution)} role={s(c.role)} />
                </div>
              </div>
            </GlassTile>
          </div>
        </SlideFrame>
      );
    }

    // ── Solution & Process ─────────────────────────────────────────────
    case "MV-SOL-PILLARS-5": {
      const hero = obj(c.hero);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <AuroraOrb x={92} y={30} size={820} />
          <div className="relative">
            <SlideTitle brand={brand} title={s(c.title)} />
            <div
              className="mt-10 grid grid-cols-2 gap-8"
              style={{ gridTemplateRows: "1fr 1fr", height: 760 }}
            >
              <GlassTile radius={26} padding="px-10 py-9" className="row-span-2 overflow-hidden">
                <Kicker brand={brand}>Hero</Kicker>
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={72}
                  thicknessPx={2}
                  className="mt-4 mb-6"
                />
                <div
                  style={{
                    fontSize: fillPx(48, "figure"),
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.05,
                    color: ink.strong,
                  }}
                >
                  {s(hero.title)}
                </div>
                <SupportingText size="md" opacity={0.78} className="mt-5" maxWidthPx={560}>
                  {s(hero.body)}
                </SupportingText>
              </GlassTile>
              {arr(c.items)
                .slice(0, 4)
                .map((it, i) => (
                  <Card
                    key={i}
                    brand={brand}
                    title={s(it.title)}
                    body={s(it.body)}
                    index={i + 1}
                    icon={s(it.icon)}
                  />
                ))}
            </div>
          </div>
        </SlideFrame>
      );
    }

    case "MV-SOL-ARCHITECTURE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <AuroraOrb x={92} y={72} size={820} />
          <div className="relative">
            <SlideTitle brand={brand} title={s(c.title)} />
            <GlassTile radius={26} padding="px-12 py-8" className="mt-12">
              {arr(c.items).map((it, i) => (
                <div key={i}>
                  {i > 0 && <SoftDivider />}
                  <div className="flex items-center gap-10 py-7">
                    <SlideNumeral value={i + 1} sizePx={26} className="w-16" />
                    <div
                      className="w-72"
                      style={{
                        fontSize: fillPx(30, "figure"),
                        fontWeight: 600,
                        letterSpacing: "-0.015em",
                        color: "var(--slide-ink)",
                      }}
                    >
                      {s(it.label)}
                    </div>
                    <SupportingText size="md" opacity={0.75} className="flex-1">
                      {s(it.body)}
                    </SupportingText>
                  </div>
                </div>
              ))}
            </GlassTile>
          </div>
        </SlideFrame>
      );

    case "MV-SOL-FEATURE-LIST":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <AuroraOrb x={90} y={28} size={860} />
          <div className="relative flex h-full flex-col">
            <SlideTitle brand={brand} title={s(c.title)} />
            <GlassTile
              radius={26}
              padding="px-12 py-12"
              className="slide-fill-stretch mt-12 flex flex-col"
            >
              <div
                className="slide-fill-stretch slide-fill-rows grid grid-cols-2 items-center gap-x-16 gap-y-8"
                style={{
                  gridTemplateRows: `repeat(${Math.max(1, Math.ceil(arr(c.items).length / 2))}, minmax(0, 1fr))`,
                }}
              >
                {arr(c.items).map((it, i) => (
                  <div key={i} className="flex items-start gap-5">
                    <IconBadge
                      brand={brand}
                      label={s(it.label)}
                      index={i}
                      size="md"
                      override={s(it.icon)}
                      sizeToken={s(it.iconSize)}
                    />
                    <div className="flex-1">
                      <div className="text-3xl font-semibold" style={{ color: ink.strong }}>
                        {s(it.label)}
                      </div>
                      <div className="mt-2 text-2xl opacity-80" style={{ color: ink.muted }}>
                        {s(it.body)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassTile>
          </div>
        </SlideFrame>
      );

    case "MV-PROOF-TESTIMONIAL":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="relative grid h-full grid-cols-[1.35fr_1fr] items-center gap-24">
            <QuoteMark
              color={"var(--slide-accent-text)"}
              size={560}
              className="absolute -top-6 -left-4"
            />
            <div className="relative">
              <Kicker brand={brand}>Testimonial</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={72}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <div
                style={{
                  fontSize: fillPx(60, "display"),
                  fontWeight: 500,
                  lineHeight: 1.2,
                  letterSpacing: "-0.015em",
                  color: ink.strong,
                  maxWidth: 980,
                }}
              >
                {s(c.quote)}
              </div>
              <div className="mt-12">
                <Attribution brand={brand} name={s(c.attribution)} role={s(c.role)} />
              </div>
            </div>
            <div className="flex flex-col items-start">
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={56}
                thicknessPx={2}
                className="mb-6"
              />
              <Kicker brand={brand}>Measurable outcome</Kicker>
              <div className="mt-8">
                <StatFigure
                  brand={brand}
                  value={s(c.metric)}
                  size="lg"
                  icon={s(c.icon)}
                  iconSize={s(c.iconSize)}
                />
              </div>
            </div>
          </div>
        </SlideFrame>
      );

    default:
      return null;
    }
  },
});

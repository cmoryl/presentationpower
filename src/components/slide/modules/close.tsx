// Closing / call-to-action family — extracted from the legacy
// `VariantRenderer` switch onto the module registry. Every close slide shares
// the same `variant="close"` frame plus the aurora orb + side-panel furniture,
// so one owner keeps thanks, Q&A, contact, next-steps and commitment slides in
// step with each other.

import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, s, type Item } from "../module-kit";
import { MediaTile } from "../module-primitives";
import {
  DisplayTitle,
  Hairline,
  Kicker,
  MetaRow,
  SoftDivider,
  StatFigure,
  SupportingText,
} from "../primitives";
import { FlowArrow } from "../Connectors";
import { Trophy } from "lucide-react";
import { AuroraOrb, AuroraSidePanel, GlassTile } from "../flagship";
import { hexA } from "@/lib/accent-tokens";
import { fillPx } from "@/lib/open-space-fill";

registerSlideModule({
  id: "family:close",
  variantIds: [
    "MV-CLOSE-CTA",
    "MV-CLOSE-THANKS",
    "MV-CLOSE-QNA",
    "MV-CLOSE-CONTACT",
    "MV-CLOSE-TIMELINE",
    "MV-CLOSE-CHECKLIST",
    "MV-CLOSE-DECISION",
    "MV-CLOSE-CALENDAR",
    "MV-CLOSE-STATEMENT",
    "MV-CLOSE-SPLIT",
    "MV-CLOSE-DUAL-CTA",
    "MV-CLOSE-METRIC-PROMISE",
  ],
  render: ({ variant, brand, pageNumber, c, mode, ink, isDark }) => {
    switch (variant.id) {
    case "MV-CLOSE-CTA": {
      const steps: Item[] =
        arr(c.items).length > 0
          ? arr(c.items)
          : s(c.nextSteps)
            ? s(c.nextSteps)
                .split(/\n+/)
                .filter(Boolean)
                .map((line) => ({ label: line }) as Item)
            : [];
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <AuroraOrb x={88} y={28} size={860} />
          <div className="relative grid h-full grid-cols-[1.1fr_0.9fr] items-center gap-24">
            <div>
              <div className="flex items-center gap-4">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    background: brand.tokens.accent,
                    boxShadow: `0 0 24px ${brand.tokens.accent}`,
                  }}
                />
                <Kicker brand={brand}>What happens next</Kicker>
              </div>
              <div
                className="mt-8 h-[2px] w-[160px] rounded-full"
                style={{
                  backgroundImage: `linear-gradient(90deg, ${brand.tokens.accent} 0%, ${hexA(brand.tokens.accent, 0.0)} 100%)`,
                }}
              />
              <DisplayTitle size="hero" color={ink.strong} maxWidthPx={1080} className="mt-10">
                {s(c.message, "Let's start.")}
              </DisplayTitle>
              {(s(c.owner) || s(c.followUp)) && (
                <MetaRow className="mt-14">
                  {s(c.owner) && <span>{s(c.owner)}</span>}
                  {s(c.followUp) && <span>{s(c.followUp)}</span>}
                </MetaRow>
              )}
            </div>
            {steps.length > 0 && (
              <AuroraSidePanel
                kicker="Next steps"
                items={steps
                  .slice(0, 4)
                  .map((it) => ({ label: s(it.label ?? it.title ?? it.body) }))}
              />
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-CLOSE-THANKS":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <div className="flex h-full flex-col justify-center">
            <Hairline color={"var(--slide-accent-text)"} widthPx={120} thicknessPx={2} />
            <DisplayTitle size="hero" color={ink.strong} maxWidthPx={1600} className="mt-10">
              {s(c.message, "Thank you.")}
            </DisplayTitle>
            {s(c.signoff) && (
              <SupportingText size="xl" opacity={0.72} maxWidthPx={1180} className="mt-10">
                {s(c.signoff)}
              </SupportingText>
            )}
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-QNA":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <div className="relative flex h-full flex-col items-center justify-center text-center">
            {/* Oversized quote glyph, low-opacity, sits behind the title */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                color: "var(--slide-accent-text)",
                fontSize: fillPx(520, "display"),
                lineHeight: 0.7,
                fontWeight: 600,
                opacity: 0.12,
                letterSpacing: "-0.06em",
              }}
            >
              ?
            </div>
            <div className="relative flex flex-col items-center">
              <Kicker brand={brand}>The floor is yours</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={72}
                thicknessPx={2}
                className="mt-6"
              />
              <DisplayTitle size="cover" color={ink.strong} maxWidthPx={1400} className="mt-10">
                {s(c.title, "Questions")}
              </DisplayTitle>
              {s(c.prompt) && (
                <SupportingText size="lg" opacity={0.7} maxWidthPx={980} className="mt-8">
                  {s(c.prompt)}
                </SupportingText>
              )}
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-CONTACT": {
      const people = arr(c.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <AuroraOrb x={90} y={30} size={880} />
          <div className="relative grid h-full grid-cols-[1.05fr_0.95fr] items-center gap-24">
            <div>
              <Kicker brand={brand}>Stay in touch</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={96}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <DisplayTitle size="hero" color={ink.strong} maxWidthPx={1080}>
                {s(c.title, "Let's keep the conversation going.")}
              </DisplayTitle>
              {s(c.subtitle) && (
                <SupportingText size="lg" opacity={0.78} className="mt-8" maxWidthPx={880}>
                  {s(c.subtitle)}
                </SupportingText>
              )}
            </div>
            {people.length > 0 && (
              <GlassTile radius={28} padding="px-12 py-12">
                <div
                  className="uppercase"
                  style={{
                    fontSize: fillPx(18, "body"),
                    letterSpacing: "0.28em",
                    fontWeight: 600,
                    color: ink.faint,
                  }}
                >
                  Your team
                </div>
                <div className="mt-10 space-y-10">
                  {people.slice(0, 4).map((p, i) => (
                    <div
                      key={i}
                      className={`tp-rise tp-rise-delay-${Math.min(i + 1, 3) as 1 | 2 | 3}`}
                    >
                      <div
                        style={{
                          fontSize: fillPx(30, "figure"),
                          fontWeight: 600,
                          letterSpacing: "-0.015em",
                          color: ink.strong,
                        }}
                      >
                        {s(p.name)}
                      </div>
                      <div
                        className="mt-1 uppercase"
                        style={{
                          color: "var(--slide-accent-text)",
                          fontSize: fillPx(15, "kicker"),
                          letterSpacing: "0.28em",
                          fontWeight: 600,
                        }}
                      >
                        {s(p.role)}
                      </div>
                      <div
                        className="mt-4 space-y-1"
                        style={{ fontSize: fillPx(20, "body"), color: ink.muted }}
                      >
                        <div>{s(p.email)}</div>
                        {s(p.phone) && <div style={{ opacity: 0.7 }}>{s(p.phone)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassTile>
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-CLOSE-TIMELINE": {
      const items = arr(c.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <AuroraOrb x={92} y={72} size={780} />
          <div className="relative grid h-full grid-cols-[1.05fr_0.95fr] items-center gap-24">
            <div>
              <Kicker brand={brand}>Timeline</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={96}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <DisplayTitle size="section" color={ink.strong} maxWidthPx={780}>
                {s(c.title, "What happens next.")}
              </DisplayTitle>
              {s(c.subtitle) && (
                <SupportingText size="lg" opacity={0.78} className="mt-8" maxWidthPx={720}>
                  {s(c.subtitle)}
                </SupportingText>
              )}
            </div>
            {items.length > 0 && (
              <AuroraSidePanel
                kicker="Milestones"
                items={items.slice(0, 4).map((it) => ({
                  label: s(it.label),
                  body: s(it.body),
                  meta: s(it.owner) ? `Owner · ${s(it.owner)}` : undefined,
                }))}
              />
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-CLOSE-CHECKLIST": {
      const items = arr(c.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <AuroraOrb x={90} y={30} size={820} />
          <div className="relative grid h-full grid-cols-[1fr_1fr] items-center gap-24">
            <div>
              <Kicker brand={brand}>Action plan</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={96}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <DisplayTitle size="section" color={ink.strong} maxWidthPx={780}>
                {s(c.title, "What happens next.")}
              </DisplayTitle>
              {s(c.subtitle) && (
                <SupportingText size="lg" opacity={0.78} className="mt-8" maxWidthPx={720}>
                  {s(c.subtitle)}
                </SupportingText>
              )}
            </div>
            {items.length > 0 && (
              <AuroraSidePanel
                kicker="Checklist"
                items={items.slice(0, 4).map((it) => ({
                  label: s(it.label),
                  meta: [s(it.owner), s(it.when)].filter(Boolean).join(" · ") || undefined,
                }))}
              />
            )}
          </div>
        </SlideFrame>
      );
    }

    case "MV-CLOSE-DECISION":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <AuroraOrb x={88} y={30} size={860} />
          <div className="relative grid h-full grid-cols-[1.15fr_0.85fr] items-center gap-24">
            <div>
              <Kicker brand={brand}>{s(c.kicker, "The ask")}</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={96}
                thicknessPx={2}
                className="mt-8 mb-10"
              />
              <DisplayTitle size="section" color={ink.strong} maxWidthPx={780}>
                {s(c.ask)}
              </DisplayTitle>
              <SupportingText size="lg" opacity={0.82} className="mt-8" maxWidthPx={720}>
                {s(c.rationale)}
              </SupportingText>
            </div>
            <GlassTile radius={28} padding="px-12 py-12">
              <div
                className="uppercase"
                style={{
                  fontSize: fillPx(18, "body"),
                  letterSpacing: "0.28em",
                  fontWeight: 600,
                  color: ink.faint,
                }}
              >
                Decision by
              </div>
              <div
                className="mt-8 tabular-nums"
                style={{
                  fontSize: fillPx(96, "display"),
                  lineHeight: 1,
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  color: "var(--slide-accent-text)",
                }}
              >
                {s(c.decisionBy, "—")}
              </div>
              {s(c.owner) && (
                <div className="mt-10 pt-8" style={{ borderTop: `1px solid ${ink.hairline}` }}>
                  <div
                    className="uppercase"
                    style={{
                      fontSize: fillPx(14, "kicker"),
                      letterSpacing: "0.28em",
                      fontWeight: 600,
                      color: ink.faint,
                    }}
                  >
                    Owner
                  </div>
                  <div
                    className="mt-2"
                    style={{ fontSize: fillPx(24, "body"), fontWeight: 600, color: ink.strong }}
                  >
                    {s(c.owner)}
                  </div>
                </div>
              )}
            </GlassTile>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-CALENDAR":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-[520px_1fr] items-center gap-20">
            <div className="flex flex-col items-center text-center">
              <Kicker brand={brand}>Kickoff</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={72}
                thicknessPx={2}
                className="mt-6 mb-10"
              />
              <div
                className="tabular-nums"
                style={{
                  fontSize: fillPx(200, "display"),
                  lineHeight: 0.92,
                  fontWeight: 600,
                  letterSpacing: "-0.035em",
                  color: ink.strong,
                }}
              >
                {s(c.date)}
              </div>
              <div
                className="mt-6"
                style={{
                  fontSize: fillPx(32, "figure"),
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: ink.strong,
                }}
              >
                {s(c.day)}
              </div>
              <div
                className="mt-2 uppercase"
                style={{
                  fontSize: fillPx(18, "body"),
                  letterSpacing: "0.28em",
                  color: "color-mix(in oklab, currentColor 60%, transparent)",
                }}
              >
                {s(c.monthYear)}
              </div>
            </div>
            <div>
              <Kicker brand={brand}>{s(c.title, "Kickoff")}</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={72}
                thicknessPx={2}
                className="mt-6 mb-8"
              />
              <div
                style={{
                  fontSize: fillPx(48, "figure"),
                  fontWeight: 600,
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                  color: ink.strong,
                }}
              >
                {s(c.body)}
              </div>
              <SoftDivider className="mt-10 mb-6" />
              <MetaRow>
                <span>{s(c.owner)}</span>
              </MetaRow>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-STATEMENT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <AuroraOrb x={86} y={68} size={900} />
          <div className="relative grid h-full grid-cols-[1.2fr_0.8fr] items-center gap-24">
            <div>
              <Kicker brand={brand}>{s(c.kicker, "A closing note")}</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={96}
                thicknessPx={2}
                className="mt-8 mb-10"
              />
              <DisplayTitle size="hero" color={ink.strong} maxWidthPx={1100}>
                {s(c.statement)}
              </DisplayTitle>
              <MetaRow className="mt-14">
                <span>{s(c.signoff)}</span>
              </MetaRow>
            </div>
            {(s(c.attribution) || s(c.role)) && (
              <GlassTile radius={28} padding="px-12 py-12">
                <div
                  className="uppercase"
                  style={{
                    fontSize: fillPx(18, "body"),
                    letterSpacing: "0.28em",
                    fontWeight: 600,
                    color: ink.faint,
                  }}
                >
                  Signed
                </div>
                <div
                  className="mt-8"
                  style={{
                    fontSize: fillPx(36, "figure"),
                    fontWeight: 600,
                    letterSpacing: "-0.015em",
                    color: ink.strong,
                    lineHeight: 1.15,
                  }}
                >
                  {s(c.attribution, s(c.signoff))}
                </div>
                {s(c.role) && (
                  <div
                    className="mt-3 uppercase"
                    style={{
                      color: "var(--slide-accent-text)",
                      fontSize: fillPx(15, "kicker"),
                      letterSpacing: "0.28em",
                      fontWeight: 600,
                    }}
                  >
                    {s(c.role)}
                  </div>
                )}
              </GlassTile>
            )}
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-SPLIT":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="grid h-full grid-cols-2 gap-16">
            <MediaTile
              overrideUrl={s(c.mediaUrl)}
              mediaPath={s(c.mediaPath)}
              brand={brand}
              seed={s(c.mediaSeed, s(c.title, "cta"))}
              className="h-full w-full"
            />
            <div className="flex flex-col justify-center">
              <Kicker brand={brand}>Next step</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={72}
                thicknessPx={2}
                className="mt-6 mb-8"
              />
              <DisplayTitle size="title" color={ink.strong}>
                {s(c.title)}
              </DisplayTitle>
              <SupportingText size="lg" opacity={0.82} className="mt-8" maxWidthPx={720}>
                {s(c.body)}
              </SupportingText>
              <div className="mt-12 pt-8" style={{ borderTop: `2px solid ${brand.tokens.accent}` }}>
                <Kicker brand={brand}>Call to action</Kicker>
                <div
                  className="mt-4"
                  style={{
                    fontSize: fillPx(44, "figure"),
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    color: ink.strong,
                  }}
                >
                  {s(c.ctaLabel)}
                </div>
                <SupportingText size="md" opacity={0.75} className="mt-3">
                  {s(c.ctaDetail)}
                </SupportingText>
              </div>
              <MetaRow className="mt-10">
                <span>{s(c.owner)}</span>
              </MetaRow>
            </div>
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-DUAL-CTA":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Two ways to start")} />
          <div className="mt-14 grid grid-cols-2 gap-16">
            {arr(c.items)
              .slice(0, 2)
              .map((it, i) => {
                const highlight = i === 0;
                return (
                  <div
                    key={i}
                    className="flex flex-col pt-8"
                    style={{
                      borderTop: `${highlight ? 3 : 1}px solid ${highlight ? brand.tokens.accent : `${ink.hairline}`}`,
                    }}
                  >
                    <Kicker
                      brand={brand}
                      color={highlight ? "var(--slide-accent-text)" : ink.faint}
                    >
                      {highlight ? "Recommended" : "Alternative"}
                    </Kicker>
                    <div
                      className="mt-6"
                      style={{
                        fontSize: fillPx(56, "display"),
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.05,
                        color: ink.strong,
                      }}
                    >
                      {s(it.label)}
                    </div>
                    <SupportingText
                      size="lg"
                      opacity={0.78}
                      className="mt-6 flex-1"
                      maxWidthPx={620}
                    >
                      {s(it.body)}
                    </SupportingText>
                    <div
                      className="mt-10 flex items-center gap-4"
                      style={{
                        fontSize: fillPx(24, "body"),
                        fontWeight: 600,
                        letterSpacing: "-0.005em",
                        color: highlight ? "var(--slide-accent-text)" : ink.strong,
                      }}
                    >
                      <span>{s(it.ctaLabel)}</span>
                      <FlowArrow
                        accent={highlight ? brand.tokens.accent : ink.strong}
                        color={highlight ? undefined : ink.strong}
                        size={22}
                      />
                    </div>
                    {s(it.note) && (
                      <MetaRow className="mt-6">
                        <span>{s(it.note)}</span>
                      </MetaRow>
                    )}
                  </div>
                );
              })}
          </div>
        </SlideFrame>
      );

    case "MV-CLOSE-METRIC-PROMISE":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="close">
          <div className="flex h-full flex-col justify-center">
            <Kicker brand={brand} color={"var(--slide-accent-text)"}>
              <Trophy size={20} className="mr-3 inline-block align-[-0.15em]" />
              {s(c.kicker, "Our commitment")}
            </Kicker>
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={120}
              thicknessPx={2}
              className="mt-8 mb-12"
            />
            <StatFigure
              brand={brand}
              value={s(c.metric)}
              unit={s(c.unit)}
              size="monumental"
              valueColor={ink.strong}
              icon={s(c.icon)}
              iconSize={s(c.iconSize)}
            />
            <div className="mt-14 max-w-[1500px]">
              <DisplayTitle size="section" color={ink.strong}>
                {s(c.promise)}
              </DisplayTitle>
            </div>
            {(s(c.timeframe) || s(c.owner)) && (
              <MetaRow className="mt-16">
                {s(c.timeframe) && <span>{s(c.timeframe)}</span>}
                {s(c.owner) && <span>{s(c.owner)}</span>}
              </MetaRow>
            )}
          </div>
        </SlideFrame>
      );

      default:
        return null;
    }
  },
});

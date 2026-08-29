// Image-forward family — full-bleed, split, caption, grid and matrix modules
// extracted from the legacy `VariantRenderer` switch onto the module registry so
// media framing, scrims and caption treatments have one owner.

import React from "react";
import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, lastWord, obj, s, strs, truthy } from "../module-kit";
import { MediaTile } from "../module-primitives";
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
import { HeroScrim } from "../HeroScrim";
import { CinematicScrim, EditorialTitle, GlassTile, GrainOverlay, StatRail } from "../flagship";
import { AccentRule } from "../Connectors";
import { hexA } from "@/lib/accent-tokens";
import { foregroundOn } from "@/lib/export-foreground";
import { clampLines, fillPx } from "@/lib/open-space-fill";
import { iconByName } from "@/lib/icon-library";
import { itemTone } from "@/lib/item-tone";

registerSlideModule({
  id: "family:image",
  variantIds: [
    "MV-IMG-FULL-BLEED",
    "MV-IMG-SPLIT",
    "MV-IMG-CAPTION",
    "MV-IMG-GRID-3",
    "MV-IMG-GRID-6",
    "MV-IMG-PORTRAIT",
    "MV-IMG-QUOTE-BG",
    "MV-IMG-BEFORE-AFTER",
    "MV-IMG-STAT-CALLOUT",
    "MV-IMG-STRIP",
    "MV-IMG-MATRIX-4",
    "MV-IMG-MATRIX-6",
  ],
  render: ({ variant, brand, pageNumber, c, mode, ink, accentTone, isDark }) => {
    switch (variant.id) {
      case "MV-IMG-FULL-BLEED": {
        const _titleLen = s(c.title).length + s(c.body).length;
        const _titleSize = _titleLen > 60 ? "title" : _titleLen > 30 ? "section" : "cover";
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
            <MediaTile
              brand={brand}
              seed={s(c.mediaSeed, s(c.title, "hero"))}
              overrideUrl={s(c.mediaUrl)}
              fit={s(c.mediaFit) || undefined}
              focus={s(c.mediaFocus) || undefined}
              zoom={Number(c.mediaZoom) || undefined}
              mediaPath={s(c.mediaPath)}
              videoUrl={s(c.videoUrl)}
              videoPosterUrl={s(c.videoPosterUrl)}
              videoPath={s(c.videoPath)}
              videoPosterPath={s(c.videoPosterPath)}
              videoAutoplay={c.videoAutoplay as boolean | undefined}
              videoLoop={c.videoLoop as boolean | undefined}
              videoMuted={c.videoMuted as boolean | undefined}
              videoControls={c.videoControls as boolean | undefined}
              className="absolute inset-0 h-full w-full rounded-none"
            />
            <HeroScrim brand={brand} anchor="bottom" />
            {/* Bottom offset clears the locked chrome band (wordmark lockup +
              confidentiality footer) so full-bleed copy never collides with it. */}
            <div
              data-on-media
              className="absolute inset-x-24 top-32 bottom-[208px] flex flex-col justify-end overflow-hidden text-white"
            >
              <Kicker brand={brand}>{s(c.kicker, "In focus")}</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={96}
                thicknessPx={2}
                className="mt-6 mb-6"
              />
              <DisplayTitle size={_titleSize} color={ink.strong} maxWidthPx={1600}>
                {s(c.title)}
              </DisplayTitle>
              <SupportingText
                size="lg"
                opacity={0.9}
                maxWidthPx={1180}
                className="mt-6 line-clamp-2"
              >
                {s(c.body)}
              </SupportingText>
            </div>
          </SlideFrame>
        );
      }
      case "MV-IMG-SPLIT":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="grid h-full grid-cols-2 gap-14">
              <MediaTile
                brand={brand}
                seed={s(c.mediaSeed, s(c.title, "split"))}
                overrideUrl={s(c.mediaUrl)}
                fit={s(c.mediaFit) || undefined}
                focus={s(c.mediaFocus) || undefined}
                zoom={Number(c.mediaZoom) || undefined}
                mediaPath={s(c.mediaPath)}
                videoUrl={s(c.videoUrl)}
                videoPosterUrl={s(c.videoPosterUrl)}
                videoPath={s(c.videoPath)}
                videoPosterPath={s(c.videoPosterPath)}
                videoAutoplay={c.videoAutoplay as boolean | undefined}
                videoLoop={c.videoLoop as boolean | undefined}
                videoMuted={c.videoMuted as boolean | undefined}
                videoControls={c.videoControls as boolean | undefined}
                className="h-full w-full"
              />
              <div className="flex flex-col justify-center">
                <SlideTitle brand={brand} title={s(c.title)} />
                <SupportingText size="lg" opacity={0.82} className="mt-8" maxWidthPx={720}>
                  {s(c.body)}
                </SupportingText>
                {s(c.caption) && (
                  <MetaRow className="mt-12">
                    <span>{s(c.caption)}</span>
                  </MetaRow>
                )}
              </div>
            </div>
          </SlideFrame>
        );
      case "MV-IMG-CAPTION":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="flex h-full flex-col items-center justify-center">
              <Kicker brand={brand}>{s(c.title, "In focus")}</Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={72}
                thicknessPx={2}
                className="mt-6 mb-8"
              />
              <MediaTile
                brand={brand}
                seed={s(c.mediaSeed, s(c.title, "framed"))}
                overrideUrl={s(c.mediaUrl)}
                fit={s(c.mediaFit) || undefined}
                focus={s(c.mediaFocus) || undefined}
                zoom={Number(c.mediaZoom) || undefined}
                mediaPath={s(c.mediaPath)}
                videoUrl={s(c.videoUrl)}
                videoPosterUrl={s(c.videoPosterUrl)}
                videoPath={s(c.videoPath)}
                videoPosterPath={s(c.videoPosterPath)}
                videoAutoplay={c.videoAutoplay as boolean | undefined}
                videoLoop={c.videoLoop as boolean | undefined}
                videoMuted={c.videoMuted as boolean | undefined}
                videoControls={c.videoControls as boolean | undefined}
                className="aspect-[16/9] w-[80%]"
              />
              <SupportingText
                size="lg"
                opacity={0.85}
                className="mt-10 text-center"
                maxWidthPx={1100}
              >
                {s(c.caption)}
              </SupportingText>
              {s(c.credit) && (
                <MetaRow className="mt-6">
                  <span>{s(c.credit)}</span>
                </MetaRow>
              )}
            </div>
          </SlideFrame>
        );
      case "MV-IMG-GRID-3":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "In practice")} />
            <div className="mt-12 grid grid-cols-3 gap-8">
              {arr(c.items).map((it, i) => (
                <div key={i}>
                  <MediaTile
                    overrideUrl={s(it.mediaUrl)}
                    mediaPath={s(it.mediaPath)}
                    brand={brand}
                    seed={s(it.seed, `grid3-${i}`)}
                    className="aspect-[4/3] w-full"
                  />
                  <div
                    className="mt-5"
                    style={{
                      fontSize: fillPx(26, "body"),
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      color: ink.strong,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  <SupportingText size="md" opacity={0.72} className="mt-2">
                    {s(it.caption)}
                  </SupportingText>
                </div>
              ))}
            </div>
          </SlideFrame>
        );
      case "MV-IMG-GRID-6":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "Selected work")} />
            <div className="mt-8 grid grid-cols-3 grid-rows-2 gap-4">
              {arr(c.items)
                .slice(0, 6)
                .map((it, i) => (
                  <div key={i}>
                    <MediaTile
                      overrideUrl={s(it.mediaUrl)}
                      mediaPath={s(it.mediaPath)}
                      brand={brand}
                      seed={s(it.seed, `grid6-${i}`)}
                      className="h-[286px] w-full"
                    />
                    {s(it.caption) && (
                      <div
                        className="mt-3 uppercase"
                        style={{
                          fontSize: fillPx(16, "body"),
                          letterSpacing: "0.28em",
                          color: "color-mix(in oklab, currentColor 60%, transparent)",
                        }}
                      >
                        {s(it.caption)}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </SlideFrame>
        );
      case "MV-IMG-PORTRAIT":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="grid h-full grid-cols-[1fr_1.3fr] gap-14">
              <MediaTile
                brand={brand}
                seed={s(c.mediaSeed, s(c.name, "portrait"))}
                pool="portrait"
                overrideUrl={s(c.mediaUrl)}
                fit={s(c.mediaFit) || undefined}
                focus={s(c.mediaFocus) || undefined}
                zoom={Number(c.mediaZoom) || undefined}
                mediaPath={s(c.mediaPath)}
                videoUrl={s(c.videoUrl)}
                videoPosterUrl={s(c.videoPosterUrl)}
                videoPath={s(c.videoPath)}
                videoPosterPath={s(c.videoPosterPath)}
                videoAutoplay={c.videoAutoplay as boolean | undefined}
                videoLoop={c.videoLoop as boolean | undefined}
                videoMuted={c.videoMuted as boolean | undefined}
                videoControls={c.videoControls as boolean | undefined}
                className="h-full w-full"
                portrait
              />
              <div className="flex flex-col justify-center">
                <Kicker brand={brand}>{s(c.role)}</Kicker>
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={72}
                  thicknessPx={2}
                  className="mt-6 mb-8"
                />
                <DisplayTitle size="section" color={ink.strong}>
                  {s(c.name)}
                </DisplayTitle>
                {s(c.quote) && (
                  <div
                    className="relative mt-10 pl-8"
                    style={{ borderLeft: `2px solid ${brand.tokens.accent}` }}
                  >
                    <div
                      style={{
                        fontSize: fillPx(34, "figure"),
                        fontWeight: 500,
                        lineHeight: 1.3,
                        letterSpacing: "-0.01em",
                        color: ink.strong,
                      }}
                    >
                      “{s(c.quote)}”
                    </div>
                  </div>
                )}
                <SupportingText size="lg" opacity={0.78} className="mt-8" maxWidthPx={720}>
                  {s(c.narrative)}
                </SupportingText>
              </div>
            </div>
          </SlideFrame>
        );
      case "MV-IMG-QUOTE-BG":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
            <MediaTile
              brand={brand}
              seed={s(c.mediaSeed, s(c.attribution, "quote"))}
              overrideUrl={s(c.mediaUrl)}
              fit={s(c.mediaFit) || undefined}
              focus={s(c.mediaFocus) || undefined}
              zoom={Number(c.mediaZoom) || undefined}
              mediaPath={s(c.mediaPath)}
              videoUrl={s(c.videoUrl)}
              videoPosterUrl={s(c.videoPosterUrl)}
              videoPath={s(c.videoPath)}
              videoPosterPath={s(c.videoPosterPath)}
              videoAutoplay={c.videoAutoplay as boolean | undefined}
              videoLoop={c.videoLoop as boolean | undefined}
              videoMuted={c.videoMuted as boolean | undefined}
              videoControls={c.videoControls as boolean | undefined}
              className="absolute inset-0 h-full w-full rounded-none"
            />
            <HeroScrim brand={brand} anchor="center" />
            <div data-on-media className="relative flex h-full flex-col justify-center text-white">
              <QuoteMark
                color={"var(--slide-accent-text)"}
                size={520}
                opacity={0.18}
                className="absolute -top-4 -left-4"
              />
              <div className="relative max-w-[1500px]">
                <Kicker brand={brand} color={"var(--slide-accent-text)"}>
                  In their words
                </Kicker>
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={72}
                  thicknessPx={2}
                  className="mt-6 mb-10"
                />
                <div
                  style={{
                    fontSize: fillPx(72, "display"),
                    fontWeight: 500,
                    lineHeight: 1.18,
                    letterSpacing: "-0.02em",
                    color: ink.strong,
                  }}
                >
                  {s(c.quote)}
                </div>
                <div className="mt-14">
                  <Attribution brand={brand} name={s(c.attribution)} role={s(c.role)} />
                </div>
              </div>
            </div>
          </SlideFrame>
        );
      case "MV-IMG-BEFORE-AFTER": {
        const before = obj(c.before);
        const after = obj(c.after);
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "What changes")} />
            <div className="mt-12 grid grid-cols-2 gap-8">
              {[
                { label: "Before", panel: before },
                { label: "After", panel: after },
              ].map((p, i) => (
                <div key={i} className="pt-0">
                  <MediaTile
                    overrideUrl={s(p.panel.mediaUrl)}
                    mediaPath={s(p.panel.mediaPath)}
                    brand={brand}
                    seed={s(p.panel.seed, `${p.label}-${s(p.panel.label)}`)}
                    className="aspect-[16/9] w-full rounded-[22px]"
                    muted={i === 0}
                  />
                  <div
                    className="mt-8 pt-6"
                    style={{
                      borderTop: `${i === 1 ? 2 : 1}px solid ${i === 1 ? brand.tokens.accent : `${ink.hairline}`}`,
                    }}
                  >
                    <Kicker brand={brand} color={i === 1 ? "var(--slide-accent-text)" : ink.faint}>
                      {p.label}
                    </Kicker>
                    <div
                      className="mt-4"
                      style={{
                        fontSize: fillPx(34, "figure"),
                        fontWeight: 600,
                        letterSpacing: "-0.015em",
                        color: ink.strong,
                      }}
                    >
                      {s(p.panel.label)}
                    </div>
                    <SupportingText size="md" opacity={0.72} className="mt-3">
                      {s(p.panel.body)}
                    </SupportingText>
                  </div>
                </div>
              ))}
            </div>
          </SlideFrame>
        );
      }
      case "MV-IMG-STAT-CALLOUT":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="grid h-full grid-cols-2 gap-16">
              <MediaTile
                overrideUrl={s(c.mediaUrl)}
                mediaPath={s(c.mediaPath)}
                brand={brand}
                seed={s(c.mediaSeed, s(c.label, "stat"))}
                className="h-full w-full"
              />
              <div className="flex flex-col justify-center">
                <Kicker brand={brand}>Signal</Kicker>
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={72}
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
                <SupportingText size="lg" opacity={0.8} maxWidthPx={560} className="mt-10">
                  {s(c.narrative)}
                </SupportingText>
              </div>
            </div>
          </SlideFrame>
        );
      case "MV-IMG-STRIP":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "A quick look")} />
            <div className="mt-14 grid grid-cols-5 gap-6">
              {arr(c.items)
                .slice(0, 5)
                .map((it, i) => (
                  <div key={i}>
                    <MediaTile
                      overrideUrl={s(it.mediaUrl)}
                      mediaPath={s(it.mediaPath)}
                      brand={brand}
                      seed={s(it.seed, `strip-${i}`)}
                      className="aspect-[3/4] w-full"
                    />
                    {s(it.caption) && (
                      <MetaRow className="mt-4">
                        <span>{s(it.caption)}</span>
                      </MetaRow>
                    )}
                  </div>
                ))}
            </div>
          </SlideFrame>
        );

      // ── Expanded quote layouts ────────────────────────────────────────
      // MV-QUOTE-MULTI/PORTRAIT/CARD/METRIC/POSTER now live in
      // `modules/quote.tsx` (module registry).
      case "MV-IMG-MATRIX-4":
        // Boxed media matrix: each pair is a card, not loose art + copy. Media is
        // a full-height plate inside the card, copy sits in the panel beside it.
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "In practice")} />
            <div
              className="slide-fill-stretch slide-fill-rows mt-10 grid grid-cols-2 gap-x-8 gap-y-8"
              style={{ gridTemplateRows: "repeat(2, minmax(0, 1fr))" }}
            >
              {arr(c.items)
                .slice(0, 4)
                .map((it, i) => (
                  <div key={i} data-intro-item="" data-intro-step={i} className="min-w-0">
                    <GlassTile radius={26} padding="p-6" className="flex h-full min-w-0 gap-7">
                      <MediaTile
                        overrideUrl={s(it.mediaUrl)}
                        mediaPath={s(it.mediaPath)}
                        brand={brand}
                        seed={s(it.seed, `mx-${i}`)}
                        className="h-full w-[236px] shrink-0 rounded-[18px]"
                      />
                      <div className="flex min-w-0 flex-1 flex-col justify-center pr-1">
                        <div className="flex items-center gap-3">
                          <div
                            className="grid place-items-center tabular-nums"
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 12,
                              background:
                                "color-mix(in oklab, var(--slide-accent-text) 14%, transparent)",
                              color: "var(--slide-accent-text)",
                              fontSize: fillPx(18, "body"),
                              fontWeight: 700,
                            }}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </div>
                          <div
                            aria-hidden
                            style={{
                              height: 2,
                              flex: 1,
                              background:
                                "linear-gradient(90deg, color-mix(in oklab, var(--slide-accent-text) 34%, transparent), transparent)",
                            }}
                          />
                        </div>
                        <div
                          className="mt-4"
                          style={{
                            fontSize: fillPx(30, "figure"),
                            fontWeight: 600,
                            letterSpacing: "-0.015em",
                            color: ink.strong,
                          }}
                        >
                          {s(it.label)}
                        </div>
                        <SupportingText size="md" opacity={0.75} className="mt-3">
                          {s(it.body)}
                        </SupportingText>
                      </div>
                    </GlassTile>
                  </div>
                ))}
            </div>
          </SlideFrame>
        );
      case "MV-IMG-MATRIX-6":
        // Six boxed cards in two rows: media plate on top, copy in the panel
        // below. Tile height stays fixed so the second row clears the footer.
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "Program surface area")} />
            <div className="mt-6 grid grid-cols-3 gap-x-7 gap-y-6">
              {arr(c.items)
                .slice(0, 6)
                .map((it, i) => (
                  <div key={i} data-intro-item="" data-intro-step={i} className="min-w-0">
                    <GlassTile radius={24} padding="p-5" className="flex h-full min-w-0 flex-col">
                      <div className="relative">
                        <MediaTile
                          overrideUrl={s(it.mediaUrl)}
                          mediaPath={s(it.mediaPath)}
                          brand={brand}
                          seed={s(it.seed, `mx6-${i}`)}
                          className="h-[196px] w-full rounded-[16px]"
                        />
                        <div
                          className="absolute left-3 top-3 grid place-items-center tabular-nums backdrop-blur"
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background:
                              "color-mix(in oklab, var(--slide-accent-text) 82%, transparent)",
                            color: "#ffffff",
                            fontSize: fillPx(15, "body"),
                            fontWeight: 700,
                          }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </div>
                      </div>
                      <div
                        className="mt-4 line-clamp-1"
                        style={{
                          fontSize: fillPx(24, "body"),
                          fontWeight: 600,
                          letterSpacing: "-0.01em",
                          color: ink.strong,
                        }}
                      >
                        {s(it.label)}
                      </div>
                      <SupportingText size="sm" opacity={0.72} className="mt-2 line-clamp-2">
                        {s(it.body)}
                      </SupportingText>
                    </GlassTile>
                  </div>
                ))}
            </div>
          </SlideFrame>
        );

      default:
        return null;
    }
  },
});

// Opening family — covers, dividers and agendas extracted from the legacy
// `VariantRenderer` switch onto the module registry so cover chrome and title
// treatments have a single owner.

import React from "react";
import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, lastWord, obj, s, strs, truthy } from "../module-kit";
import { MediaTile } from "../module-primitives";
import { DisplayTitle, Hairline, Kicker, MetaRow, SlideNumeral, SupportingText } from "../primitives";
import { HeroScrim } from "../HeroScrim";
import { CinematicScrim, EditorialTitle, GrainOverlay, StatRail } from "../flagship";
import { AccentRule } from "../Connectors";
import { hexA } from "@/lib/accent-tokens";
import { foregroundOn } from "@/lib/export-foreground";
import { fillPx } from "@/lib/open-space-fill";

registerSlideModule({
  id: "family:opening",
  variantIds: [
    "MV-OP-COVER",
    "MV-OP-COVER-MEDIA",
    "MV-OP-COVER-MINIMAL",
    "MV-OP-DIVIDER",
    "MV-OP-DIVIDER-NUMBERED",
    "MV-OP-AGENDA",
    "MV-OP-AGENDA-VERTICAL",
    "MV-OP-COVER-EDITORIAL",
    "MV-OP-COVER-SPLIT",
    "MV-OP-COVER-POSTER",
    "MV-OP-COVER-GRID",
    "MV-OP-COVER-DOSSIER",
    "MV-OP-COVER-GRADIENT",
    "MV-OP-COVER-MONOGRAM",
    "MV-OP-COVER-STACKED",
  ],
  render: ({ variant, brand, pageNumber, c, mode, ink, accentTone, isDark }) => {
    switch (variant.id) {
    case "MV-OP-COVER":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover" logoPosition="top-right">
          {/* Ambient depth — a soft spotlight glow drifting up from bottom-left,
              plus a low-opacity ring signature on the right. Keynote-grade. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(60% 55% at 12% 92%, ${hexA(brand.tokens.accent, 0.2)} 0%, transparent 62%),
                radial-gradient(45% 40% at 92% 8%, ${hexA(brand.tokens.accent, 0.11)} 0%, transparent 70%)
              `,
            }}
          />
          {isDark ? (
            <div
              aria-hidden
              className="pointer-events-none absolute -right-40 top-1/2 h-[820px] w-[820px] -translate-y-1/2 rounded-full"
              style={{
                border: `1px solid ${hexA(brand.tokens.accent, 0.133)}`,
                boxShadow: `inset 0 0 0 1px ${hexA(brand.tokens.accent, 0.067)}, inset 0 0 220px ${hexA(brand.tokens.accent, 0.094)}`,
              }}
            />
          ) : (
            /* Light covers drop the ringed sphere (it read as a hard white
               disc on white) in favour of our accent aura: two soft, heavily
               blurred accent orbs drifting in from the right edge. */
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div
                className="absolute -right-52 top-1/2 h-[760px] w-[760px] -translate-y-1/2 rounded-full"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${hexA(brand.tokens.accent, 0.3)} 0%, ${hexA(brand.tokens.accent, 0.12)} 45%, transparent 72%)`,
                  filter: "blur(90px)",
                }}
              />
              <div
                className="absolute -right-24 top-[22%] h-[380px] w-[380px] rounded-full"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${hexA(brand.tokens.primary, 0.22)} 0%, transparent 68%)`,
                  filter: "blur(70px)",
                }}
              />
            </div>
          )}
          <div className="relative flex h-full flex-col justify-end">
            <div className="flex items-center gap-4 tp-rise">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  background: brand.tokens.accent,
                  boxShadow: `0 0 24px ${brand.tokens.accent}, 0 0 8px ${brand.tokens.accent}`,
                }}
              />
              <Kicker brand={brand}>Prepared for {s(c.clientName)}</Kicker>
            </div>
            <div className="mt-8 flex items-end gap-8 tp-rise tp-rise-delay-1">
              <StatRail color={"var(--slide-accent-text)"} height={220} className="mb-6" />
              <EditorialTitle
                text={s(c.title, "Client")}
                emphasize={s(c.titleEmphasis) || lastWord(s(c.title, "Client"))}
                color={ink.strong}
                accentColor={brand.tokens.accent}
                size={132}
                maxWidthPx={1520}
              />
            </div>
            {s(c.subtitle) && (
              <SupportingText
                size="xl"
                opacity={0.86}
                maxWidthPx={1200}
                className="mt-10 tp-rise tp-rise-delay-2"
              >
                {s(c.subtitle)}
              </SupportingText>
            )}
            <MetaRow className="mt-16 tp-rise tp-rise-delay-3">
              {s(c.presenter) && <span>{s(c.presenter)}</span>}
              {s(c.date) && <span>{s(c.date)}</span>}
            </MetaRow>
          </div>
        </SlideFrame>
      );
    case "MV-OP-COVER-MEDIA": {
      const _titleLen = s(c.title).length + s(c.subtitle).length;
      const _titleSize = _titleLen > 60 ? "title" : _titleLen > 30 ? "section" : "cover";
      // Authored plate kits (Games) are finished compositions in the brand
      // palette. Running the photographic duotone + heavy cinematic scrim over
      // one flattened it back to plain navy, which is why Gaming title slides
      // read as empty. Plate covers get a light touch so the template artwork
      // stays visible.
      const platedCover = brand.id === "bm-tp-games" && !s(c.mediaUrl) && !s(c.mediaPath);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover" logoPosition="top-right">
          <MediaTile
            brand={brand}
            seed={s(c.mediaSeed, s(c.clientName, "cover-media"))}
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
            className="absolute inset-0 h-full w-full rounded-none tp-kenburns"
          />
          {/* Duotone-style color wash tinted to the brand accent, plus grain */}
          {!platedCover && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: brand.tokens.accent, mixBlendMode: "color", opacity: 0.28 }}
            />
          )}
          <GrainOverlay opacity={platedCover ? 0.05 : 0.09} />
          {platedCover ? (
            <CinematicScrim anchor="bottom" strength={0.5} tint="#03002C" vignette={0.12} />
          ) : (
            <CinematicScrim anchor="bottom" strength={0.9} tint="#050418" vignette={0.28} />
          )}

          <div
            data-on-media
            className="absolute inset-x-24 top-32 bottom-40 flex flex-col justify-end overflow-hidden text-white"
          >
            <div className="flex items-center gap-4 tp-rise">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  background: brand.tokens.accent,
                  boxShadow: `0 0 24px ${brand.tokens.accent}`,
                }}
              />
              <Kicker brand={brand} color="#ffffff">
                Prepared for {s(c.clientName)}
              </Kicker>
            </div>
            <div className="mt-6 flex items-end gap-6 tp-rise tp-rise-delay-1">
              <StatRail color={"#ffffff"} height={180} className="mb-4" />
              <EditorialTitle
                text={s(c.title)}
                emphasize={s(c.titleEmphasis) || lastWord(s(c.title))}
                color="#ffffff"
                accentColor="#ffffff"
                emphasisStyle="bold"
                size={_titleSize === "cover" ? 128 : _titleSize === "section" ? 96 : 72}
                maxWidthPx={1420}
              />
            </div>
            {s(c.subtitle) && (
              <SupportingText
                size="lg"
                opacity={0.92}
                maxWidthPx={1180}
                className="mt-6 line-clamp-2 tp-rise tp-rise-delay-2"
              >
                {s(c.subtitle)}
              </SupportingText>
            )}
            <MetaRow className="mt-10 tp-rise tp-rise-delay-3">
              {s(c.date) && <span>{s(c.date)}</span>}
            </MetaRow>
          </div>
        </SlideFrame>
      );
    }
    case "MV-OP-COVER-MINIMAL":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover" logoPosition="top-right">
          <div className="flex h-full flex-col justify-center">
            <StatRail color={"var(--slide-accent-text)"} height={120} className="tp-rise" />
            <div className="mt-12 tp-rise tp-rise-delay-1">
              <EditorialTitle
                text={s(c.title)}
                emphasize={s(c.titleEmphasis) || lastWord(s(c.title))}
                color={ink.strong}
                accentColor={brand.tokens.accent}
                size={132}
                maxWidthPx={1520}
              />
            </div>
            {s(c.subtitle) && (
              <SupportingText
                size="xl"
                opacity={0.72}
                maxWidthPx={1080}
                className="mt-8 tp-rise tp-rise-delay-2"
              >
                {s(c.subtitle)}
              </SupportingText>
            )}
            {s(c.date) && (
              <MetaRow className="mt-16 tp-rise tp-rise-delay-3">
                <span>{s(c.date)}</span>
              </MetaRow>
            )}
          </div>
        </SlideFrame>
      );
    case "MV-OP-DIVIDER":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="divider">
          <div className="flex h-full flex-col justify-center">
            <div className="tp-rise">
              <Kicker brand={brand}>{s(c.kicker, "Section")}</Kicker>
            </div>
            <div className="mt-8 tp-rise tp-rise-delay-1">
              <StatRail color={"var(--slide-accent-text)"} height={96} />
            </div>
            <div className="mt-10 tp-rise tp-rise-delay-2">
              <EditorialTitle
                text={s(c.title)}
                emphasize={s(c.titleEmphasis) || lastWord(s(c.title))}
                color={ink.strong}
                accentColor={brand.tokens.accent}
                size={116}
                maxWidthPx={1600}
              />
            </div>
          </div>
        </SlideFrame>
      );
    case "MV-OP-DIVIDER-NUMBERED":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="divider">
          <div className="flex h-full items-center gap-20">
            <div
              className="tabular-nums"
              style={{
                fontSize: fillPx(260, "display"),
                lineHeight: 0.85,
                fontWeight: 600,
                letterSpacing: "-0.05em",
                color: "var(--slide-accent-text)",
                opacity: 0.95,
              }}
            >
              {s(c.chapterNumber, "01")}
            </div>
            <div className="flex-1">
              <Kicker brand={brand} color={ink.muted}>
                {s(c.kicker, "Chapter")}
              </Kicker>
              <Hairline
                color={"var(--slide-accent-text)"}
                widthPx={64}
                thicknessPx={2}
                className="mt-6"
              />
              <DisplayTitle size="section" color={ink.strong} maxWidthPx={1100} className="mt-8">
                {s(c.title)}
              </DisplayTitle>
            </div>
          </div>
        </SlideFrame>
      );
    case "MV-OP-AGENDA": {
      const items = arr(c.items);
      const rule = isDark ? "rgba(255,255,255,0.10)" : "rgba(10,15,28,0.08)";
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          {/* Ambient glow anchoring the composition */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(38% 42% at 88% 12%, ${brand.tokens.accent}${isDark ? "1F" : "12"} 0%, transparent 70%)`,
            }}
          />
          <div className="relative flex h-full flex-col">
            <SlideTitle brand={brand} title={s(c.title, "Agenda")} kicker="Contents" />
            <div
              className="slide-fill-stretch slide-fill-rows mt-16 grid grid-cols-2 gap-x-24"
              style={{
                gridTemplateRows: `repeat(${Math.max(1, Math.ceil(items.length / 2))}, minmax(0, 1fr))`,
              }}
            >
              {items.map((it, i) => (
                <div
                  key={i}
                  className="group grid grid-cols-[96px_1fr_auto] items-center gap-6 py-7"
                  style={{ borderTop: `1px solid ${rule}` }}
                >
                  <SlideNumeral value={i + 1} sizePx={48} />
                  <div
                    style={{
                      fontSize: fillPx(34, "figure"),
                      lineHeight: 1.18,
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: ink.strong,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  <div
                    aria-hidden
                    className="h-[1px] w-10"
                    style={{
                      background: `linear-gradient(90deg, ${brand.tokens.accent} 0%, transparent 100%)`,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );
    }
    case "MV-OP-AGENDA-VERTICAL":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title, "Agenda")} kicker="Contents" />
          <div className="mt-12">
            {arr(c.items).map((it, i) => (
              <div key={i} className="relative flex items-baseline gap-10 py-7">
                <AccentRule
                  accent={brand.tokens.accent}
                  cap
                  capLength={90}
                  emphasis={0.28}
                  style={{ position: "absolute", left: 0, right: 0, top: 0, width: "auto" }}
                />
                <SlideNumeral value={i + 1} sizePx={40} style={{ minWidth: 90 }} />
                <div className="flex-1">
                  <div
                    style={{
                      fontSize: fillPx(34, "figure"),
                      fontWeight: 600,
                      letterSpacing: "-0.015em",
                      lineHeight: 1.15,
                    }}
                  >
                    {s(it.label)}
                  </div>
                  {s(it.body) && (
                    <div
                      className="mt-2"
                      style={{ fontSize: fillPx(24, "body"), opacity: 0.66, lineHeight: 1.35 }}
                    >
                      {s(it.body)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SlideFrame>
      );
    case "MV-OP-COVER-EDITORIAL":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="grid h-full grid-cols-[1.5fr_1fr] gap-16">
            <div className="flex flex-col justify-between">
              <Kicker brand={brand} tracking="0.32em">
                {s(c.kicker, "Vol. 01")}
              </Kicker>
              <div>
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={96}
                  thicknessPx={2}
                  className="mb-8"
                />
                <DisplayTitle size="cover" color={ink.strong} maxWidthPx={1080}>
                  {s(c.title)}
                </DisplayTitle>
                {s(c.subtitle) && (
                  <SupportingText size="xl" opacity={0.82} maxWidthPx={860} className="mt-8">
                    {s(c.subtitle)}
                  </SupportingText>
                )}
              </div>
              <MetaRow>
                <span>Prepared for {s(c.clientName)}</span>
                <span>{s(c.date)}</span>
              </MetaRow>
            </div>
            <div className="flex items-center">
              <MediaTile
                overrideUrl={s(c.mediaUrl)}
                mediaPath={s(c.mediaPath)}
                brand={brand}
                seed={s(c.mediaSeed, s(c.clientName, "editorial"))}
                className="aspect-[3/4] w-full"
              />
            </div>
          </div>
        </SlideFrame>
      );
    case "MV-OP-COVER-SPLIT": {
      // This half-sheet is a solid brand fill, independent of the surrounding
      // slide mode. Resolve its own foreground instead of inheriting the page
      // ink (and never lower contrast with parent opacity).
      const panelInk = `#${foregroundOn(brand.tokens.primary)}`;
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="-m-24 grid h-[calc(100%+192px)] grid-cols-2">
            <MediaTile
              overrideUrl={s(c.mediaUrl)}
              mediaPath={s(c.mediaPath)}
              brand={brand}
              seed={s(c.mediaSeed, s(c.clientName, "split"))}
              className="h-full w-full rounded-none"
            />
            <div
              data-on-fill
              className="relative flex flex-col justify-center p-24"
              style={{ backgroundColor: brand.tokens.primary, color: panelInk }}
            >
              {/* Subtle radial glow inside the primary panel */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(80% 60% at 20% 20%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 60%)`,
                }}
              />
              <div className="relative">
                <Kicker brand={brand} color={panelInk}>
                  Prepared for {s(c.clientName)}
                </Kicker>
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={72}
                  thicknessPx={2}
                  className="mt-6"
                />
                <DisplayTitle size="section" color={panelInk} maxWidthPx={720} className="mt-8">
                  {s(c.title)}
                </DisplayTitle>
                {s(c.subtitle) && (
                  <SupportingText size="lg" opacity={0.85} maxWidthPx={620} className="mt-8">
                    {s(c.subtitle)}
                  </SupportingText>
                )}
                <MetaRow className="mt-14" color={panelInk}>
                  <span>{s(c.date)}</span>
                </MetaRow>
              </div>
            </div>
          </div>
        </SlideFrame>
      );
    }
    case "MV-OP-COVER-POSTER":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="flex h-full flex-col justify-between">
            <Kicker brand={brand} tracking="0.42em">
              {s(c.kicker, "A briefing")}
            </Kicker>
            <DisplayTitle size="hero" color={ink.strong} className="uppercase">
              {s(c.title, "Signal")}
            </DisplayTitle>
            <div className="flex items-center justify-between">
              <Hairline color={"var(--slide-accent-text)"} widthPx={140} thicknessPx={2} />
              <MetaRow>
                <span>{s(c.meta, "Confidential")}</span>
                <span>№ 01</span>
              </MetaRow>
            </div>
          </div>
        </SlideFrame>
      );
    case "MV-OP-COVER-GRID": {
      const items = arr(c.items);
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover" logoPosition="top-left">
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-2 p-2">
            {(items.length ? items : [{}, {}, {}, {}]).slice(0, 4).map((it, i) => (
              <MediaTile
                overrideUrl={s(it.mediaUrl)}
                mediaPath={s(it.mediaPath)}
                key={i}
                brand={brand}
                seed={s(it.seed, `grid-${i}`)}
                className="h-full w-full rounded-none"
              />
            ))}
          </div>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(180deg, ${brand.tokens.primary}26 0%, ${brand.tokens.primary}8C 55%, ${brand.tokens.primary}E6 100%)`,
            }}
          />
          <div
            data-on-media
            data-media-backing
            className="relative flex h-full flex-col justify-end"
            style={{ color: "#ffffff" }}
          >
            <Kicker brand={brand} color="rgba(255,255,255,0.82)">
              {s(c.date, "Briefing")}
            </Kicker>
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={96}
              thicknessPx={2}
              className="mt-8"
            />
            <DisplayTitle size="cover" color="#ffffff" maxWidthPx={1520} className="mt-10">
              {s(c.title)}
            </DisplayTitle>
            {s(c.subtitle) && (
              <SupportingText size="xl" opacity={0.92} maxWidthPx={1180} className="mt-8">
                {s(c.subtitle)}
              </SupportingText>
            )}
          </div>
        </SlideFrame>
      );
    }
    case "MV-OP-COVER-DOSSIER":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <div className="flex h-full flex-col justify-between" style={{ color: ink.strong }}>
            <div className="flex items-start justify-between">
              <div
                className="uppercase"
                style={{ fontSize: fillPx(18, "body"), letterSpacing: "0.32em", opacity: 0.65 }}
              >
                Dossier · Ref {s(c.reference, "TP-0001")}
              </div>
              <div
                className="px-4 py-2 uppercase"
                style={{
                  border: `1px solid ${brand.tokens.accent}`,
                  color: "var(--slide-accent-text)",
                  fontSize: fillPx(18, "body"),
                  letterSpacing: "0.32em",
                  fontWeight: 600,
                }}
              >
                Confidential
              </div>
            </div>
            <div>
              <Hairline color={"var(--slide-accent-text)"} widthPx={120} thicknessPx={2} />
              <DisplayTitle size="cover" color={ink.strong} maxWidthPx={1520} className="mt-10">
                {s(c.title)}
              </DisplayTitle>
              <SupportingText size="lg" opacity={0.75} maxWidthPx={1180} className="mt-8">
                Prepared for {s(c.clientName)}
              </SupportingText>
            </div>
            <div className="relative grid grid-cols-3 gap-16 pt-8">
              <AccentRule
                accent={brand.tokens.accent}
                cap
                capLength={120}
                emphasis={0.32}
                style={{ position: "absolute", left: 0, right: 0, top: 0, width: "auto" }}
              />
              {[
                ["Prepared by", s(c.prepared, "TransPerfect")],
                ["Date", s(c.date)],
                ["Distribution", "Internal"],
              ].map(([label, value], i) => (
                <div key={i}>
                  <Kicker brand={brand} size={14} tracking="0.32em">
                    {label}
                  </Kicker>
                  <div
                    className="mt-3"
                    style={{ fontSize: fillPx(22, "body"), letterSpacing: "-0.01em" }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideFrame>
      );
    case "MV-OP-COVER-GRADIENT": {
      const _titleLen = s(c.title).length + s(c.subtitle).length;
      const _titleSize = _titleLen > 60 ? "title" : _titleLen > 30 ? "section" : "cover";
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <MediaTile
            overrideUrl={s(c.mediaUrl)}
            mediaPath={s(c.mediaPath)}
            brand={brand}
            seed={s(c.mediaSeed, s(c.clientName, "cover-image"))}
            className="absolute inset-0 h-full w-full rounded-none"
          />
          <HeroScrim brand={brand} anchor="bottom" />
          <div
            data-on-media
            className="absolute inset-x-24 top-32 bottom-24 flex flex-col justify-end overflow-hidden text-white"
          >
            <Kicker brand={brand} tracking="0.32em">
              Prepared for {s(c.clientName)}
            </Kicker>
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={96}
              thicknessPx={2}
              className="mt-6"
            />
            <DisplayTitle size={_titleSize} color={ink.strong} maxWidthPx={1520} className="mt-6">
              {s(c.title)}
            </DisplayTitle>
            {s(c.subtitle) && (
              <SupportingText
                size="lg"
                opacity={0.9}
                maxWidthPx={1180}
                className="mt-6 line-clamp-2"
              >
                {s(c.subtitle)}
              </SupportingText>
            )}
            <MetaRow className="mt-10">
              <span>{s(c.date)}</span>
            </MetaRow>
          </div>
        </SlideFrame>
      );
    }
    case "MV-OP-COVER-MONOGRAM":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="grid h-full grid-cols-[1.15fr_1fr] gap-16">
            <div
              className="relative flex items-center justify-center overflow-hidden"
              style={{
                backgroundImage: `radial-gradient(120% 90% at 20% 15%, ${brand.tokens.primary} 0%, ${brand.tokens.primary}DD 55%, ${brand.tokens.primary}66 100%)`,
                color: ink.strong,
              }}
            >
              <div
                className="relative"
                style={{
                  color: "var(--slide-accent-text)",
                  fontSize: fillPx(400, "display"),
                  lineHeight: 0.82,
                  fontWeight: 600,
                  letterSpacing: "-0.06em",
                  opacity: 0.9,
                }}
              >
                {s(c.monogram, "TP").slice(0, 2).toUpperCase()}
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <Hairline color={"var(--slide-accent-text)"} widthPx={72} thicknessPx={2} />
              <DisplayTitle size="section" color={ink.strong} maxWidthPx={720} className="mt-8">
                {s(c.title)}
              </DisplayTitle>
              {s(c.subtitle) && (
                <SupportingText size="lg" opacity={0.75} maxWidthPx={620} className="mt-6">
                  {s(c.subtitle)}
                </SupportingText>
              )}
              <MetaRow className="mt-14">
                <span>{s(c.date)}</span>
              </MetaRow>
            </div>
          </div>
        </SlideFrame>
      );
    case "MV-OP-COVER-STACKED":
      return (
        <SlideFrame brand={brand} pageNumber={pageNumber} variant="cover">
          <div className="flex h-full flex-col justify-between">
            <Kicker brand={brand}>{s(c.kicker, "A proposal")}</Kicker>
            <div className="grid grid-cols-[1fr_1.4fr] items-end gap-16">
              <MediaTile
                overrideUrl={s(c.mediaUrl)}
                mediaPath={s(c.mediaPath)}
                brand={brand}
                seed={s(c.mediaSeed, "stacked")}
                className="aspect-[4/5] w-full"
              />
              <div>
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={72}
                  thicknessPx={2}
                  className="mb-8"
                />
                <DisplayTitle size="section" color={ink.strong} maxWidthPx={1000}>
                  {s(c.title)}
                </DisplayTitle>
                {s(c.subtitle) && (
                  <SupportingText size="xl" opacity={0.82} maxWidthPx={880} className="mt-8">
                    {s(c.subtitle)}
                  </SupportingText>
                )}
              </div>
            </div>
            <MetaRow>
              <span>Prepared with care</span>
              <span>{s(c.date)}</span>
            </MetaRow>
          </div>
        </SlideFrame>
      );

    // ── Image-forward content ──────────────────────────────────────────

      default:
        return null;
    }
  },
});

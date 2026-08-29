// Business family — decision matrices and comparison tables, commercial
// pricing/investment, risk mitigation, case studies, governance (RACI),
// recommended next steps, product showcases and the client matrix/detail/
// comparison spreads. Extracted from the legacy `VariantRenderer` switch onto
// the module registry.

import React, { useContext } from "react";
import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, arr, obj, s, strs, truthy, type Item } from "../module-kit";
import { MediaTile } from "../module-primitives";
import {
  DisplayTitle,
  Hairline,
  Kicker,
  MetaRow,
  SlideNumeral,
  SoftDivider,
  StatFigure,
  SupportingText,
} from "../primitives";
import {
  AccentTick,
  AuroraOrb,
  GlassTile,
  IconWell,
  moduleCardSurface,
  moduleCardTint,
} from "../flagship";
import {
  DeviceFrame,
  DeviceScreenPlaceholder,
  deviceKindFrom,
} from "@/components/device/DeviceFrame";
import { ClientLogoImg } from "../client-logo";
import { useClientLogoMark } from "@/lib/client-logo-pool";
import { SlideModeContext, useSlideInk, type SlideMode } from "../SlideChrome";
import { accentInk, hexA } from "@/lib/accent-tokens";
import { statGradient } from "@/lib/stat-contrast";
import type { BrandMode } from "@/lib/taxonomy";
import { fillPx } from "@/lib/open-space-fill";

// 2x2 quadrant cell for the decision matrix. Moved here with the family.
function Quadrant({
  brand,
  label,
  highlight,
}: {
  brand: BrandMode;
  label: string;
  highlight?: boolean;
}) {
  const ink = useSlideInk();
  const mode = useContext(SlideModeContext);
  return (
    <div
      className="relative overflow-hidden flex items-center justify-center p-8 text-center"
      style={{
        ...moduleCardTint(brand.tokens.accent, mode, { emphasis: highlight ? 2.4 : 1 }),
        ...(highlight ? { border: `1px solid ${brand.tokens.accent}` } : null),
        color: ink.strong,
        fontSize: fillPx(30, "figure"),
        fontWeight: 600,
        letterSpacing: "-0.015em",
        lineHeight: 1.25,
      }}
    >
      <AccentTick accent={brand.tokens.accent} />
      {label}
    </div>
  );
}

// CLIENT logo chip for case-study modules. Resolution order: the deck"s real
// clientLogoUrl, then a deterministic mark from the LogoHub roster, then a
// neutral wordmark. A TransPerfect lockup is NEVER used here.
function ClientLogoChip({
  mode,
  clientName,
  clientLogoUrl,
  size = 40,
  label = "Client",
  accent,
  faint,
}: {
  mode: SlideMode;
  clientName?: string;
  clientLogoUrl?: string | null;
  size?: number;
  label?: string;
  accent: string;
  faint: string;
}) {
  const hubMark = useClientLogoMark({
    clientName,
    seed: clientName || "client",
    mode: mode === "dark" ? "dark" : "light",
  });
  const src = clientLogoUrl || hubMark?.url || null;
  const displayName = clientName || hubMark?.name || "Client";
  return (
    <div className="inline-flex items-center gap-3">
      <span
        className="uppercase font-semibold"
        style={{
          color: accentInk(accent, mode),
          fontSize: fillPx(11, "kicker"),
          letterSpacing: "0.28em",
        }}
      >
        {label}
      </span>
      <span aria-hidden className="inline-block h-3 w-px" style={{ background: faint }} />
      {src ? (
        <img
          src={src}
          alt={`${displayName} logo`}
          style={{ height: size, width: "auto", maxWidth: size * 4, objectFit: "contain" }}
        />
      ) : (
        <span
          className="uppercase"
          style={{
            fontSize: fillPx(15, "body"),
            fontWeight: 700,
            letterSpacing: "0.16em",
            color: mode === "dark" ? "rgba(255,255,255,0.92)" : "rgba(3,0,44,0.9)",
          }}
        >
          {displayName}
        </span>
      )}
    </div>
  );
}

registerSlideModule({
  id: "family:business",
  variantIds: [
    "MV-DEC-MATRIX",
    "MV-DEC-COMPARE-TABLE",
    "MV-DEC-CHECKLIST",
    "MV-COMM-PRICING",
    "MV-COMM-INVESTMENT",
    "MV-RISK-MITIGATION",
    "MV-CASE-SPREAD",
    "MV-CASE-METRICS",
    "MV-CASE-STORY",
    "MV-GOV-RACI",
    "MV-REC-NEXT",
    "MV-SHOW-LAPTOP",
    "MV-SHOW-MONITOR",
    "MV-CLIENT-MATRIX",
    "MV-CLIENT-DETAIL-3",
    "MV-CLIENT-COMPARE",
  ],
  render: (args) => {
    const {
      slide,
      variant,
      brand,
      pageNumber,
      c,
      mode,
      clientName,
      clientLogoUrl,
      dash,
      bareSurfaces,
      isDark,
      ink,
      accentTone,
    } = args;
    void slide;
    void clientLogoUrl;
    void dash;
    void accentTone;
    void clientName;
    void bareSurfaces;
    void mode;
    void isDark;
    switch (variant.id) {
      case "MV-DEC-MATRIX":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title)} />
            <div className="mt-10 grid h-[720px] grid-cols-[80px_1fr] grid-rows-[1fr_60px]">
              <div className="flex rotate-180 items-center justify-center text-2xl opacity-70 [writing-mode:vertical-rl]">
                {s(c.axisY)}
              </div>
              <div className="grid grid-cols-2 grid-rows-2 gap-4">
                <Quadrant brand={brand} label={s(c.q2)} />
                <Quadrant brand={brand} label={s(c.q1)} highlight />
                <Quadrant brand={brand} label={s(c.q3)} />
                <Quadrant brand={brand} label={s(c.q4)} />
              </div>
              <div />
              <div className="flex items-center justify-center text-2xl opacity-70">
                {s(c.axisX)}
              </div>
            </div>
          </SlideFrame>
        );

      case "MV-DEC-COMPARE-TABLE": {
        const columns = arr(c.columns);
        const rows = arr(c.items);
        const winnerIdx =
          typeof (c as { winnerIndex?: number }).winnerIndex === "number"
            ? (c as { winnerIndex?: number }).winnerIndex
            : undefined;
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <AuroraOrb x={92} y={28} size={860} />
            <div className="relative flex h-full flex-col">
              <SlideTitle brand={brand} title={s(c.title)} />
              <GlassTile
                radius={26}
                padding="px-12 py-10"
                className="slide-fill-stretch mt-12 flex flex-col"
              >
                <div
                  className="slide-fill-stretch slide-fill-rows grid items-center gap-x-8"
                  style={{ gridTemplateColumns: `2fr ${columns.map(() => "1fr").join(" ")}` }}
                >
                  <div
                    className="pb-4 uppercase"
                    style={{
                      fontSize: fillPx(18, "body"),
                      letterSpacing: "0.28em",
                      color: ink.faint,
                      fontWeight: 600,
                      borderBottom: `1px solid ${ink.hairlineStrong}`,
                    }}
                  >
                    Criteria
                  </div>
                  {columns.map((col, i) => (
                    <div
                      key={i}
                      className="pb-4 uppercase"
                      style={{
                        fontSize: fillPx(20, "body"),
                        letterSpacing: "0.24em",
                        fontWeight: 600,
                        color: winnerIdx === i ? "var(--slide-accent-text)" : ink.strong,
                        borderBottom: `${winnerIdx === i ? 2 : 1}px solid ${winnerIdx === i ? brand.tokens.accent : ink.hairlineStrong}`,
                      }}
                    >
                      {s(col.label)}
                    </div>
                  ))}
                  {rows.map((r, ri) => (
                    <div key={ri} className="contents">
                      <div
                        className="py-5"
                        style={{
                          fontSize: fillPx(24, "body"),
                          letterSpacing: "-0.01em",
                          color: ink.strong,
                          borderBottom: `1px solid ${ink.hairline}`,
                        }}
                      >
                        {s(r.criterion)}
                      </div>
                      {strs(r.values).map((v, ci) => (
                        <div
                          key={ci}
                          className="py-5"
                          style={{
                            fontSize: fillPx(24, "body"),
                            color: winnerIdx === ci ? ink.strong : ink.muted,
                            fontWeight: winnerIdx === ci ? 600 : 400,
                            borderBottom: `1px solid ${ink.hairline}`,
                            background:
                              winnerIdx === ci
                                ? `color-mix(in oklab, ${brand.tokens.accent} 8%, transparent)`
                                : undefined,
                          }}
                        >
                          {v}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </GlassTile>
            </div>
          </SlideFrame>
        );
      }

      case "MV-DEC-CHECKLIST":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title)} />
            <div className="slide-fill-stretch slide-fill-rows mt-12 grid grid-cols-2 gap-x-20 gap-y-0">
              {arr(c.items).map((it, i) => (
                <div
                  key={i}
                  className="flex items-center gap-6 py-6"
                  style={{ borderBottom: `1px solid ${ink.hairline}` }}
                >
                  <div
                    className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center"
                    style={{
                      border: `2px solid ${brand.tokens.accent}`,
                      color: "var(--slide-accent-text)",
                      fontSize: fillPx(18, "body"),
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: fillPx(26, "body"),
                        fontWeight: 600,
                        color: ink.strong,
                        letterSpacing: "-0.01em",
                        lineHeight: 1.25,
                      }}
                    >
                      {s(it.label)}
                    </div>
                    {s(it.note) && (
                      <div
                        className="mt-2"
                        style={{
                          fontSize: fillPx(20, "body"),
                          lineHeight: 1.4,
                          color: "color-mix(in oklab, currentColor 65%, transparent)",
                        }}
                      >
                        {s(it.note)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SlideFrame>
        );

      case "MV-COMM-PRICING":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "Investment options")} />
            <div className="mt-12 grid grid-cols-3 gap-12">
              {arr(c.items).map((tier, i) => {
                const featured = i === 1;
                return (
                  <div
                    key={i}
                    className="pt-8"
                    style={{
                      borderTop: `${featured ? 3 : 1}px solid ${featured ? brand.tokens.accent : `${ink.hairline}`}`,
                    }}
                  >
                    <Kicker brand={brand} color={featured ? "var(--slide-accent-text)" : ink.faint}>
                      {s(tier.name)}
                    </Kicker>
                    <div
                      className="mt-6 font-semibold tabular-nums"
                      style={{
                        fontSize: fillPx(88, "display"),
                        lineHeight: 0.95,
                        letterSpacing: "-0.03em",
                        color: ink.strong,
                      }}
                    >
                      {s(tier.price)}
                      {s(tier.unit) && (
                        <span
                          className="ml-2 font-medium"
                          style={{
                            fontSize: fillPx(26, "body"),
                            color: "var(--slide-accent-text)",
                            letterSpacing: "-0.01em",
                          }}
                        >
                          {s(tier.unit)}
                        </span>
                      )}
                    </div>
                    <div className="mt-8 space-y-4">
                      {strs(tier.features).map((f, k) => (
                        <div key={k}>
                          {k > 0 && <SoftDivider />}
                          <div
                            className="flex gap-4 py-3"
                            style={{ fontSize: fillPx(22, "body"), lineHeight: 1.35 }}
                          >
                            <span style={{ color: "var(--slide-accent-text)", fontWeight: 600 }}>
                              —
                            </span>
                            <span style={{ opacity: 0.82 }}>{f}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </SlideFrame>
        );

      case "MV-COMM-INVESTMENT":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="grid h-full grid-cols-2 items-center gap-24">
              <div className="min-w-0">
                <Kicker brand={brand}>{s(c.title, "Investment")}</Kicker>
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={88}
                  thicknessPx={2}
                  className="mt-6 mb-10"
                />
                <StatFigure
                  brand={brand}
                  value={s(c.amount)}
                  unit={s(c.unit)}
                  size="xl"
                  icon={s(c.icon)}
                  iconSize={s(c.iconSize)}
                />
              </div>
              <div className="min-w-0">
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={56}
                  thicknessPx={2}
                  className="mb-6"
                />
                <Kicker brand={brand}>Included</Kicker>
                <div className="mt-8 space-y-5">
                  {arr(c.items).map((it, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-5 pt-5"
                      style={{ borderTop: i === 0 ? "none" : "1px solid rgba(10,15,28,0.10)" }}
                    >
                      <span
                        className="mt-3 h-2 w-8 shrink-0"
                        style={{ backgroundColor: brand.tokens.accent }}
                      />
                      <span
                        style={{
                          fontSize: fillPx(26, "body"),
                          lineHeight: 1.3,
                          letterSpacing: "-0.01em",
                          color: ink.strong,
                        }}
                      >
                        {s(it.label)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SlideFrame>
        );

      case "MV-RISK-MITIGATION":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "Risk & mitigation")} />
            <div className="slide-fill-stretch mt-12 flex flex-col">
              <div
                className="grid grid-cols-[80px_1fr_1fr] gap-10 pb-4 uppercase"
                style={{
                  fontSize: fillPx(18, "body"),
                  letterSpacing: "0.28em",
                  color: ink.faint,
                  borderBottom: `1px solid ${brand.tokens.accent}`,
                }}
              >
                <div className="tabular-nums">№</div>
                <div>Risk</div>
                <div>Mitigation</div>
              </div>
              {arr(c.items).map((it, i) => (
                <div key={i} className="flex flex-1 flex-col justify-center">
                  {i > 0 && <SoftDivider />}
                  <div className="grid grid-cols-[80px_1fr_1fr] items-center gap-10 py-6">
                    <SlideNumeral value={i + 1} sizePx={26} />
                    <div
                      style={{
                        fontSize: fillPx(26, "body"),
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        color: ink.strong,
                      }}
                    >
                      {s(it.risk)}
                    </div>
                    <SupportingText size="md" opacity={0.72}>
                      {s(it.mitigation)}
                    </SupportingText>
                  </div>
                </div>
              ))}
            </div>
          </SlideFrame>
        );

      // ── Case Study ─────────────────────────────────────────────────────
      case "MV-CASE-SPREAD": {
        const rows: Array<{ label: string; body: string; icon: string }> = [
          { label: "Challenge", body: s(c.challenge), icon: "◇" },
          { label: "Solution", body: s(c.solution), icon: "◆" },
          { label: "Result", body: s(c.result), icon: "★" },
        ];
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <Kicker brand={brand}>Case study</Kicker>
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={88}
              thicknessPx={2}
              className="mt-6 mb-8"
            />
            <DisplayTitle size="section" color={ink.strong}>
              {s(c.client)}
            </DisplayTitle>
            <div className="mt-6">
              <ClientLogoChip
                mode={mode}
                clientName={clientName ?? s(c.client)}
                clientLogoUrl={clientLogoUrl}
                accent="var(--slide-accent-text)"
                faint={ink.faint}
                size={36}
              />
            </div>
            <div className="mt-10 grid grid-cols-3 gap-8">
              {rows.map((r, i) => (
                <GlassTile
                  key={i}
                  radius={22}
                  padding="px-8 py-8"
                  className={`tp-rise tp-rise-delay-${Math.min(i + 1, 3) as 1 | 2 | 3}`}
                >
                  <div className="flex items-center gap-4">
                    <IconWell accent={brand.tokens.accent}>
                      <span
                        style={{ fontSize: fillPx(20, "body"), color: "var(--slide-accent-text)" }}
                      >
                        {r.icon}
                      </span>
                    </IconWell>
                    <div
                      className="uppercase font-semibold"
                      style={{
                        color: "var(--slide-accent-text)",
                        fontSize: fillPx(12, "kicker"),
                        letterSpacing: "0.28em",
                      }}
                    >
                      {r.label}
                    </div>
                  </div>
                  <div
                    className="mt-6"
                    style={{
                      fontSize: fillPx(22, "body"),
                      lineHeight: 1.35,
                      color: ink.strong,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {r.body}
                  </div>
                </GlassTile>
              ))}
            </div>
            {s(c.metric) && (
              <div className="mt-10">
                <StatFigure
                  brand={brand}
                  value={s(c.metric)}
                  label="Outcome"
                  size="md"
                  icon={s(c.icon)}
                  iconSize={s(c.iconSize)}
                />
              </div>
            )}
          </SlideFrame>
        );
      }

      case "MV-CASE-METRICS":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <Kicker brand={brand}>Case study</Kicker>
            <Hairline
              color={"var(--slide-accent-text)"}
              widthPx={88}
              thicknessPx={2}
              className="mt-6 mb-8"
            />
            <DisplayTitle size="section" color={ink.strong}>
              {s(c.client)}
            </DisplayTitle>
            <div className="mt-6">
              <ClientLogoChip
                mode={mode}
                clientName={clientName ?? s(c.client)}
                clientLogoUrl={clientLogoUrl}
                accent="var(--slide-accent-text)"
                faint={ink.faint}
                size={36}
              />
            </div>
            <SupportingText size="lg" opacity={0.72} className="mt-8" maxWidthPx={1180}>
              {s(c.summary)}
            </SupportingText>
            <div className="slide-fill-stretch mt-14 grid grid-cols-3 items-center gap-14">
              {arr(c.items).map((it, i) => (
                <div
                  key={i}
                  className={i > 0 ? "slide-fill-center h-full pl-10" : "slide-fill-center h-full"}
                  style={i > 0 ? { borderLeft: `1px solid ${ink.hairline}` } : undefined}
                >
                  <StatFigure
                    brand={brand}
                    value={s(it.value)}
                    unit={s(it.unit)}
                    label={s(it.label)}
                    size="lg"
                    icon={s(it.icon)}
                    iconSize={s(it.iconSize)}
                  />
                </div>
              ))}
            </div>
          </SlideFrame>
        );

      case "MV-CASE-STORY":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="grid h-full grid-cols-2 gap-20">
              <div className="flex flex-col justify-center">
                <Kicker brand={brand}>Case study</Kicker>
                <Hairline
                  color={"var(--slide-accent-text)"}
                  widthPx={72}
                  thicknessPx={2}
                  className="mt-6 mb-8"
                />
                <DisplayTitle size="section" color={ink.strong}>
                  {s(c.client)}
                </DisplayTitle>
                <div className="mt-6">
                  <ClientLogoChip
                    mode={mode}
                    clientName={clientName ?? s(c.client)}
                    clientLogoUrl={clientLogoUrl}
                    accent="var(--slide-accent-text)"
                    faint={ink.faint}
                    size={36}
                  />
                </div>
                <div
                  className="mt-8"
                  style={{
                    fontSize: fillPx(42, "figure"),
                    fontWeight: 600,
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s(c.headline)}
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <SupportingText size="lg" opacity={0.82}>
                  {s(c.story)}
                </SupportingText>
                <div
                  className="mt-10 pt-8"
                  style={{ borderTop: `2px solid ${brand.tokens.accent}` }}
                >
                  <Kicker brand={brand}>Result</Kicker>
                  <div
                    className="mt-4"
                    style={{
                      fontSize: fillPx(40, "figure"),
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      color: ink.strong,
                    }}
                  >
                    {s(c.result)}
                  </div>
                </div>
              </div>
            </div>
          </SlideFrame>
        );

      // ── Governance & Close ─────────────────────────────────────────────
      case "MV-GOV-RACI":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "Governance model")} />
            <div className="slide-fill-stretch mt-12 flex flex-col">
              <div
                className="grid grid-cols-[1.3fr_1fr_2fr] gap-10 pb-4 uppercase"
                style={{
                  fontSize: fillPx(18, "body"),
                  letterSpacing: "0.28em",
                  color: ink.faint,
                  borderBottom: `1px solid ${brand.tokens.accent}`,
                }}
              >
                <div>Forum</div>
                <div>Cadence</div>
                <div>Purpose</div>
              </div>
              {arr(c.items).map((it, i) => (
                <div key={i} className="flex flex-1 flex-col justify-center">
                  {i > 0 && <SoftDivider />}
                  <div className="grid grid-cols-[1.3fr_1fr_2fr] items-center gap-10 py-6">
                    <div
                      style={{
                        fontSize: fillPx(26, "body"),
                        fontWeight: 600,
                        letterSpacing: "-0.01em",
                        color: ink.strong,
                      }}
                    >
                      {s(it.forum)}
                    </div>
                    <div
                      className="uppercase"
                      style={{
                        fontSize: fillPx(18, "body"),
                        letterSpacing: "0.28em",
                        color: "var(--slide-accent-text)",
                        fontWeight: 600,
                      }}
                    >
                      {s(it.cadence)}
                    </div>
                    <SupportingText size="md" opacity={0.72}>
                      {s(it.purpose)}
                    </SupportingText>
                  </div>
                </div>
              ))}
            </div>
          </SlideFrame>
        );

      case "MV-REC-NEXT":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title="Our recommendation" />
            <div className="slide-fill-stretch slide-fill-center mt-10">
              <div className="max-w-6xl text-5xl font-medium leading-tight">
                {s(c.recommendation)}
              </div>
              <div className="mt-8 max-w-5xl text-3xl opacity-75">{s(c.rationale)}</div>
            </div>
          </SlideFrame>
        );

      // The closing family (MV-CLOSE-*) now lives in `modules/close.tsx`.

      // ── Extended covers ────────────────────────────────────────────────
      case "MV-SHOW-LAPTOP":
      case "MV-SHOW-MONITOR": {
        const kind = deviceKindFrom(
          c.deviceKind,
          variant.id === "MV-SHOW-MONITOR" ? "monitor" : "laptop",
        );
        const tone = (["graphite", "silver", "ink"] as const).includes(
          s(c.deviceTone) as "graphite",
        )
          ? (s(c.deviceTone) as "graphite" | "silver" | "ink")
          : kind === "monitor"
            ? "ink"
            : "graphite";
        const hasMedia = Boolean(
          s(c.mediaUrl) || s(c.mediaPath) || s(c.videoUrl) || s(c.videoPath),
        );
        const screen = hasMedia ? (
          <MediaTile
            brand={brand}
            seed={s(c.mediaSeed, s(c.title, "device"))}
            overrideUrl={s(c.mediaUrl)}
            fit={s(c.mediaFit) || "cover"}
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
        ) : (
          <DeviceScreenPlaceholder accent="var(--slide-accent-text)" />
        );

        if (kind === "monitor") {
          return (
            <SlideFrame brand={brand} pageNumber={pageNumber}>
              <div className="flex h-full flex-col items-center justify-center">
                {s(c.eyebrow) && <Kicker brand={brand}>{s(c.eyebrow)}</Kicker>}
                <div className="mt-4 text-center">
                  <SlideTitle brand={brand} title={s(c.title)} />
                </div>
                <div className="mt-10 w-[64%]">
                  <DeviceFrame kind="monitor" tone={tone} accent="var(--slide-accent-text)">
                    {screen}
                  </DeviceFrame>
                </div>
                {s(c.body) && (
                  <SupportingText
                    size="lg"
                    opacity={0.85}
                    className="mt-10 text-center"
                    maxWidthPx={1000}
                  >
                    {s(c.body)}
                  </SupportingText>
                )}
                {s(c.caption) && (
                  <MetaRow className="mt-6">
                    <span>{s(c.caption)}</span>
                  </MetaRow>
                )}
              </div>
            </SlideFrame>
          );
        }

        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <div className="grid h-full grid-cols-[1.15fr_1fr] items-center gap-16">
              <DeviceFrame kind="laptop" tone={tone} accent="var(--slide-accent-text)">
                {screen}
              </DeviceFrame>
              <div className="flex flex-col justify-center">
                {s(c.eyebrow) && <Kicker brand={brand}>{s(c.eyebrow)}</Kicker>}
                <div className="mt-4">
                  <SlideTitle brand={brand} title={s(c.title)} />
                </div>
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
      }

      // The MV-INFO-* diagram family now lives in `modules/info.tsx`.

      // ── Client & image matrix layouts ─────────────────────────────────
      case "MV-CLIENT-MATRIX": {
        const rows = arr(c.items).slice(0, 6);
        // Two-row layouts have to fit the same 1080px stage as a single row, so
        // the card rhythm compresses instead of overflowing off the slide.
        const dense = rows.length > 3;
        const nums = rows.map((it) => Number(String(s(it.metric)).replace(/[^0-9.]/g, "")) || 0);
        const peak = Math.max(1, ...nums);
        // Contrast-guarded: stops are auto-corrected against the slide backdrop
        // and the glow is dropped when the accent has no headroom.
        const figureStat = statGradient(brand.tokens.accent, isDark ? "dark" : "light", "96deg", {
          ink: ink.strong,
        });
        const figureGradient = {
          backgroundImage: figureStat.backgroundImage,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: figureStat.filter,
        } as const;

        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "Client outcomes")} />
            <div className={`grid grid-cols-3 ${dense ? "mt-8 gap-5" : "mt-10 gap-6"}`}>
              {rows.map((it, i) => {
                const logoUrl = s(it.logoUrl);
                const logoPath = s(it.logoPath);
                const pct = Math.max(0.12, (nums[i] || 0) / peak);
                return (
                  <div
                    key={i}
                    className="relative overflow-hidden"
                    style={{
                      ...moduleCardSurface(brand.tokens.accent, isDark ? "dark" : "light", {
                        radius: 22,
                      }),
                      padding: dense ? 24 : 32,
                    }}
                  >
                    <AccentTick accent={brand.tokens.accent} height={3} radius={22} />

                    <div className="flex items-start justify-between gap-4">
                      <div
                        className="flex items-center justify-center"
                        style={{
                          height: 56,
                          minWidth: 96,
                          padding: "0 14px",
                          borderRadius: 12,
                          backgroundColor: "#FFFFFF",
                          border: `1px solid ${ink.hairline}`,
                        }}
                      >
                        {logoUrl || logoPath ? (
                          <ClientLogoImg
                            path={logoPath}
                            url={logoUrl}
                            alt={s(it.client) ? `${s(it.client)} logo` : "Client logo"}
                            style={{ maxHeight: 34, maxWidth: 130, objectFit: "contain" }}
                          />
                        ) : (
                          <span
                            className="tabular-nums"
                            style={{
                              fontSize: fillPx(20, "body"),
                              fontWeight: 700,
                              letterSpacing: "0.16em",
                              color: accentInk(brand.tokens.accent, mode),
                            }}
                          >
                            {s(it.client)
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .slice(0, 3)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span
                        className="uppercase"
                        style={{
                          fontSize: fillPx(14, "kicker"),
                          letterSpacing: "0.2em",
                          padding: `${fillPx(7, "plate")} ${fillPx(12, "plate")}`,
                          borderRadius: 999,
                          border: `1px solid ${ink.hairline}`,
                          color: ink.muted,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s(it.sector)}
                      </span>
                    </div>
                    <div
                      className={dense ? "mt-5" : "mt-7"}
                      style={{
                        fontSize: dense ? 26 : 30,
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        color: ink.strong,
                      }}
                    >
                      {s(it.client)}
                    </div>
                    <SupportingText size={dense ? "sm" : "md"} opacity={0.72} className="mt-3">
                      {s(it.result)}
                    </SupportingText>
                    <div
                      className={dense ? "mt-5 pt-4" : "mt-7 pt-6"}
                      style={{ borderTop: `1px solid ${ink.hairline}` }}
                    >
                      <StatFigure
                        brand={brand}
                        value={s(it.metric)}
                        unit={s(it.unit)}
                        size="sm"
                        shape="column"
                        progress={pct}
                        icon={s(it.icon)}
                        iconSize={s(it.iconSize)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </SlideFrame>
        );
      }

      case "MV-CLIENT-DETAIL-3":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <SlideTitle brand={brand} title={s(c.title, "Client engagements")} />
            <div className="mt-10 grid grid-cols-3 gap-8">
              {arr(c.items)
                .slice(0, 3)
                .map((it, i) => {
                  const logoUrl = s(it.logoUrl);
                  const logoPath = s(it.logoPath);
                  return (
                    <div key={i}>
                      {logoUrl || logoPath ? (
                        <div
                          className="flex aspect-[16/10] w-full items-center justify-center rounded-md"
                          style={{
                            backgroundColor: "#FFFFFF",
                            border: "1px solid rgba(10,15,28,0.08)",
                          }}
                        >
                          <ClientLogoImg
                            path={logoPath}
                            url={logoUrl}
                            alt={s(it.client) ? `${s(it.client)} logo` : "Client logo"}
                            style={{ maxHeight: "70%", maxWidth: "75%", objectFit: "contain" }}
                          />
                        </div>
                      ) : (
                        <MediaTile
                          overrideUrl={s(it.mediaUrl)}
                          mediaPath={s(it.mediaPath)}
                          brand={brand}
                          seed={s(it.seed, s(it.client, `client-${i}`))}
                          className="aspect-[16/10] w-full"
                        />
                      )}
                      <div
                        className="mt-6 pt-5"
                        style={{ borderTop: `2px solid ${brand.tokens.accent}` }}
                      >
                        <Kicker
                          brand={brand}
                          color="color-mix(in oklab, currentColor 62%, transparent)"
                          size={16}
                        >
                          {s(it.sector)}
                        </Kicker>
                        <div
                          className="mt-4"
                          style={{
                            fontSize: fillPx(30, "figure"),
                            fontWeight: 600,
                            letterSpacing: "-0.015em",
                            color: ink.strong,
                          }}
                        >
                          {s(it.client)}
                        </div>
                        <SupportingText size="md" opacity={0.78} className="mt-3">
                          {s(it.story)}
                        </SupportingText>
                        <div
                          className="mt-6"
                          style={{
                            fontSize: fillPx(22, "body"),
                            fontWeight: 600,
                            letterSpacing: "-0.01em",
                            color: "var(--slide-accent-text)",
                          }}
                        >
                          {s(it.metric)}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </SlideFrame>
        );

      case "MV-CLIENT-COMPARE":
        return (
          <SlideFrame brand={brand} pageNumber={pageNumber}>
            <AuroraOrb x={90} y={30} size={860} />
            <div className="relative">
              <SlideTitle brand={brand} title={s(c.title, "Three engagements")} />
              <div className="mt-10 grid grid-cols-3 gap-8">
                {arr(c.items)
                  .slice(0, 3)
                  .map((it, i) => {
                    const logoUrl = s(it.logoUrl);
                    const logoPath = s(it.logoPath);
                    return (
                      <GlassTile key={i} radius={24} padding="px-8 py-8" className="flex flex-col">
                        <Kicker brand={brand} color="var(--slide-accent-text)" size={16}>
                          Client · {String(i + 1).padStart(2, "0")}
                        </Kicker>
                        {/* The logo IS the client name — showing both duplicates the
                          brand. When a logo is present the wordmark carries the
                          identity and the text drops to an accessible label. */}
                        <div className="mt-4 flex items-center gap-4">
                          {logoUrl || logoPath ? (
                            <>
                              <ClientLogoImg
                                path={logoPath}
                                url={logoUrl}
                                alt={s(it.client) ? `${s(it.client)} logo` : "Client logo"}
                                style={{ maxHeight: 44, maxWidth: 190, objectFit: "contain" }}
                              />
                              <span className="sr-only">{s(it.client)}</span>
                            </>
                          ) : (
                            <div
                              style={{
                                fontSize: fillPx(28, "body"),
                                fontWeight: 600,
                                letterSpacing: "-0.015em",
                                color: ink.strong,
                              }}
                            >
                              {s(it.client)}
                            </div>
                          )}
                        </div>
                        <div className="mt-8">
                          <Kicker brand={brand} size={16}>
                            Challenge
                          </Kicker>
                          <SupportingText size="md" opacity={0.82} className="mt-3">
                            {s(it.challenge)}
                          </SupportingText>
                        </div>
                        <div className="mt-8 flex-1">
                          <Kicker brand={brand} size={16}>
                            Outcome
                          </Kicker>
                          <SupportingText size="md" opacity={0.82} className="mt-3">
                            {s(it.outcome)}
                          </SupportingText>
                        </div>
                        <div className="mt-10">
                          <StatFigure
                            brand={brand}
                            value={s(it.metric)}
                            size="md"
                            icon={s(it.icon)}
                            iconSize={s(it.iconSize)}
                          />
                        </div>
                      </GlassTile>
                    );
                  })}
              </div>
            </div>
          </SlideFrame>
        );

      default:
        return null;
    }
  },
});

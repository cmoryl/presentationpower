// Showcase family — two enterprise layouts extracted onto the module registry:
//
//  • MV-SOL-CAP-CARDS     photo card → label band → lead claim → ruled bullets
//  • MV-SHOW-DEVICE-QUAD  device screen beside a grid of icon benefits
//
// Both are fully structural: sections add, delete and reorder, each card owns
// its own image (upload / URL / seeded), and every knob lives in a style blob
// so the renderer, editor panel and PowerPoint export stay in lockstep.

import { registerSlideModule } from "../module-registry";
import { SlideFrame, SlideTitle, s } from "../module-kit";
import { MediaTile } from "../module-primitives";
import { DeviceFrame } from "@/components/device/DeviceFrame";
import { accentInk } from "@/lib/accent-tokens";
import { fillPx } from "@/lib/open-space-fill";
import { iconByName } from "@/lib/icon-library";
import { cardBaseGradient, cardWashGradient, openBottomFrame } from "@/lib/surface-tokens";
import {
  readBenefits,
  readCards,
  resolveCapCardStyle,
  resolveQuadStyle,
  type CapCardTone,
} from "@/lib/showcase-cards";

import { Cpu, Handshake, LayoutGrid, Sparkles } from "lucide-react";

const cssPx = (v: number | string) => (typeof v === "number" ? `${v}px` : v);
const AQUA = "#A1FBF9";
const LAVENDER = "#C2A3FF";
const DEEP_INK = "#03002C";

function toneFill(tone: CapCardTone, accent: string, isDark: boolean): string {
  switch (tone) {
    case "accent":
      return accent;
    case "aqua":
      return AQUA;
    case "lavender":
      return LAVENDER;
    default:
      return isDark ? "#0B1030" : DEEP_INK;
  }
}

function toneText(tone: CapCardTone): string {
  return tone === "aqua" || tone === "lavender" ? DEEP_INK : "#FFFFFF";
}

registerSlideModule({
  id: "family:showcase-cards",
  variantIds: ["MV-SOL-CAP-CARDS", "MV-SHOW-DEVICE-QUAD"],
  render: ({ variant, brand, pageNumber, c, mode, ink, isDark: isDarkMode }) => {
    // Dark grounds (dark mode or a per-slide dark backdrop) render white ink.
    const isDark = isDarkMode || /^(#fff(fff)?|white|rgba?\(255, ?255, ?255)/i.test(String(ink.strong).trim());
    const accent = accentInk(brand.tokens.accent, mode, 4.5);
    const hairline = isDark ? "rgba(255,255,255,0.16)" : "rgba(10,15,28,0.12)";
    const muted = isDark ? "rgba(255,255,255,0.62)" : "rgba(3,0,44,0.62)";

    // ── Capability cards ─────────────────────────────────────────────────
    if (variant.id === "MV-SOL-CAP-CARDS") {
      const st = resolveCapCardStyle(c.cardStyle);
      const cards = readCards(c.cards);
      const dense = st.density === "compact" || cards.length > 3;
      // House card grammar (see `moduleCardSurface` in components/slide/flagship):
      // a top-lit accent wash that fades to nothing before the bottom edge, with
      // a hairline frame on the top and sides only. The wash is carried by the
      // copy block (the photo plate covers the top of the card), and the frame is
      // drawn as its own masked layer so the copy never fades with it.
      const baseTint = isDark
        ? cardBaseGradient("255,255,255", 0.07)
        : cardBaseGradient("255,255,255", 0.62);

      return (
        <SlideFrame brand={brand} pageNumber={pageNumber}>
          <SlideTitle brand={brand} title={s(c.title)} />

          <div
            data-portrait={cards.length <= 3 ? "cap-stack" : undefined}
            className="mt-10 grid min-h-0 flex-1 items-stretch"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, cards.length)}, minmax(0, 1fr))`,
              gap: st.gap,
            }}
          >
            {cards.map((card, i) => {
              const fill = toneFill(card.tone, accent, isDark);
              const bandInk = toneText(card.tone);
              const leadColor =
                st.leadColor === "accent" ? accent : st.leadColor === "ink" ? ink.strong : fill;
              const frameLine = card.tone === "ink" ? hairline : fill;
              // Dark look: every word is white and each title sits on a glass
              // band lit by its own brand glow (blue / aqua / lavender).
              const glow = [accent, AQUA, LAVENDER][i % 3];
              const textInk = isDark ? "#FFFFFF" : ink.strong;
              void glow;
              const markFill = isDark ? AQUA : fill;
              return (
                <div
                  key={i}
                  data-intro-item=""
                  data-intro-step={i + 1}
                  className="relative flex min-w-0 flex-col overflow-hidden"
                  style={{ borderRadius: st.cardRadius }}
                >
                  {/* Hairline frame that dissolves along the bottom edge. */}
                  <div
                    aria-hidden
                    data-decorative
                    className="pointer-events-none absolute inset-0 z-10"
                    style={openBottomFrame(frameLine, st.cardRadius)}
                  />
                  {/* Photograph — each card owns its own image */}
                  <div
                    style={{
                      position: "relative",
                      flex: `0 0 ${Math.round(st.imageRatio * (isDark ? 84 : 100))}%`,
                      minHeight: 0,
                      overflow: "hidden",
                      borderTopLeftRadius: st.cardRadius,
                      borderTopRightRadius: st.cardRadius,
                    }}
                  >
                    <div
                      aria-hidden
                      data-decorative
                      className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[3px]"
                      style={{ background: "linear-gradient(90deg, transparent, var(--slide-accent-text), transparent)" }}
                    />
                    <MediaTile
                      brand={brand}
                      seed={s(card.mediaSeed, s(card.label, `capability-${i + 1}`))}
                      overrideUrl={card.mediaUrl}
                      mediaPath={card.mediaPath}
                      fit={card.mediaFit || "cover"}
                      focus={card.mediaFocus}
                      className="absolute inset-0 h-full w-full rounded-none"
                    />
                    {isDark && (
                      // Shared navy→violet duotone wash so the three photos read as one set.
                      <div
                        aria-hidden
                        data-decorative
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(3,0,44,0.10) 0%, rgba(3,0,44,0.35) 60%, rgba(3,0,44,0.75) 100%), linear-gradient(135deg, rgba(0,63,199,0.30) 0%, rgba(194,163,255,0.22) 100%)",
                          mixBlendMode: "normal",
                        }}
                      />
                    )}
                  </div>

                  {isDark && (() => {
                    const key = s(card.label).toLowerCase();
                    const Icon = key.includes("tech") ? Cpu : key.includes("serv") ? Handshake : key.includes("prod") ? LayoutGrid : Sparkles;
                    return (
                      // One drawing (disc + icon) wrapped in a glow filter, so the
                      // PowerPoint export lifts it as a single picture above the photo.
                      <div
                        aria-hidden
                        className="absolute z-20"
                        style={{
                          top: `calc(${Math.round(st.imageRatio * 84)}% - 34px)`,
                          left: 24,
                          width: 68,
                          height: 68,
                          filter: `drop-shadow(0 0 10px ${AQUA}66)`,
                        }}
                      >
                        <svg width={68} height={68} viewBox="0 0 68 68">
                          <circle cx={34} cy={34} r={33} fill="#A1FBF9" fillOpacity={0.12} />
                          <circle cx={34} cy={34} r={27} fill="#141A52" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.5} />
                          <Icon x={19} y={19} width={30} height={30} strokeWidth={1.8} color={AQUA} />
                        </svg>
                      </div>
                    );
                  })()}

                  {/* Label band */}
                  <div
                    className="relative flex items-center justify-center overflow-hidden"
                    style={
                      isDark
                        ? {
                            background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)",
                            backdropFilter: "blur(18px) saturate(140%)",
                            borderTop: "1px solid rgba(255,255,255,0.30)",
                            padding: dense ? "16px 18px" : "22px 22px",
                          }
                        : { background: fill, padding: dense ? "16px 18px" : "22px 22px" }
                    }
                  >
                    {isDark && (
                      <>
                        <span
                          aria-hidden
                          data-decorative
                          style={{
                            position: "absolute",
                            inset: "0 0 50% 0",
                            background: "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0))",
                            pointerEvents: "none",
                          }}
                        />
                        {/* Fine aqua→lavender glow rule — the deck's ring blend. */}
                        <span
                          aria-hidden
                          data-decorative
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: 2,
                            background: `linear-gradient(90deg, ${AQUA}, ${LAVENDER})`,
                            boxShadow: `0 0 12px ${AQUA}88`,
                            pointerEvents: "none",
                          }}
                        />
                      </>
                    )}
                    <span
                      style={{
                        fontSize: isDark ? (dense ? 36 : 42) : fillPx(dense ? 26 : 30, "display"),
                        fontWeight: 800,
                        lineHeight: 1.05,
                        letterSpacing: st.bandCase === "upper" ? "0.05em" : "-0.02em",
                        textTransform: st.bandCase === "upper" ? "uppercase" : "none",
                        color: isDark ? "#FFFFFF" : bandInk,
                        textAlign: "center",
                        position: "relative",
                        textShadow: isDark ? `0 0 18px ${AQUA}55` : undefined,
                      }}
                    >
                      {card.label}
                    </span>
                  </div>

                  {/* Copy block — carries the top-lit wash that fades out before
                      the bottom edge, so the card melts into the page. */}
                  <div
                    className="flex min-h-0 flex-1 flex-col"
                    style={{
                      padding: dense ? "22px 22px 24px" : isDark ? "34px 28px 30px" : "28px 28px 30px",
                      backgroundImage: isDark
                        ? "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0) 100%)"
                        : `${cardWashGradient(fill)}, ${baseTint}`,
                      backdropFilter: isDark ? "blur(16px) saturate(130%)" : undefined,
                    }}
                  >
                    {st.showBandRule && (
                      <div
                        aria-hidden
                        data-decorative
                        style={{ height: 3, width: 56, background: markFill, marginBottom: 16 }}
                      />
                    )}
                    {/* Dark look: reserve a two-line lead + two-line note so every
                        column's bullets start on the same line. */}
                    <div
                      style={
                        isDark && !dense
                          ? { minHeight: `calc(${cssPx(fillPx(25, "body"))} * 2.4 + 4px + ${cssPx(fillPx(24, "body"))} * 2.56 + 10px)` }
                          : undefined
                      }
                    >
                    {card.lead && (
                      <div
                        style={{
                          fontSize: fillPx(dense ? 22 : 25, "body"),
                          fontWeight: 800,
                          lineHeight: 1.2,
                          letterSpacing: "-0.01em",
                          color: isDark ? "#FFFFFF" : leadColor,
                        }}
                      >
                        {card.lead}
                      </div>
                    )}
                    {card.leadNote && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: fillPx(dense ? 21 : 24, "body"),
                          fontWeight: 500,
                          lineHeight: 1.28,
                          color: textInk,
                        }}
                      >
                        {card.leadNote}
                      </div>
                    )}
                    </div>


                    {card.bullets.length > 0 && (
                      <ul
                        className="mt-6 flex flex-col"
                        style={{ gap: dense ? 8 : 11, listStyle: "none", padding: 0, margin: isDark ? "18px 0 0" : 0 }}
                      >
                        {card.bullets.map((b, bi) => (
                          <li key={bi} className="flex" style={{ gap: 10 }}>
                            <span
                              aria-hidden
                              style={{
                                flex: "0 0 auto",
                                marginTop: st.bulletMark === "dot" ? 9 : 0,
                                width: st.bulletMark === "dot" ? 7 : undefined,
                                height: st.bulletMark === "dot" ? 7 : undefined,
                                borderRadius: st.bulletMark === "dot" ? 999 : undefined,
                                background: st.bulletMark === "dot" ? markFill : undefined,
                                color: markFill,
                                fontSize: st.bulletMark === "dot" ? undefined : fillPx(19, "body"),
                                fontWeight: 800,
                              }}
                            >
                              {st.bulletMark === "dash"
                                ? "—"
                                : st.bulletMark === "number"
                                  ? `${bi + 1}.`
                                  : ""}
                            </span>
                            <span
                              style={{
                                fontSize: fillPx(dense ? 19 : 21, "body"),
                                lineHeight: 1.32,
                                color: textInk,
                              }}
                            >
                              {b}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SlideFrame>
      );
    }

    // ── Device screen + benefit quad ─────────────────────────────────────
    const st = resolveQuadStyle(c.quadStyle);
    const benefits = readBenefits(c.benefits);
    const kind = s(c.deviceKind) === "monitor" ? "monitor" : "laptop";
    const tone = (["graphite", "silver", "ink"] as const).includes(s(c.deviceTone) as "graphite")
      ? (s(c.deviceTone) as "graphite" | "silver" | "ink")
      : "silver";
    const tileBg =
      st.tileLook === "tile"
        ? isDark
          ? "rgba(255,255,255,0.07)"
          : "rgba(3,0,44,0.04)"
        : undefined;
    const tileBorder = st.tileLook === "outline" ? `1px solid ${accent}` : undefined;
    const iconBox = Math.round(96 * st.iconScale);
    const centered = st.labelAlign === "center";

    const deviceCol = (
      <div
        className="flex min-w-0 items-center"
        style={{ order: st.deviceSide === "left" ? 1 : 2 }}
      >
        <DeviceFrame kind={kind} tone={tone} accent="var(--slide-accent-text)">
          <MediaTile
            brand={brand}
            seed={s(c.mediaSeed, s(c.title, "device"))}
            overrideUrl={s(c.mediaUrl)}
            mediaPath={s(c.mediaPath)}
            fit={s(c.mediaFit) || "cover"}
            focus={s(c.mediaFocus) || undefined}
            zoom={Number(c.mediaZoom) || undefined}
            className="h-full w-full rounded-none"
          />
        </DeviceFrame>
      </div>
    );

    const quadCol = (
      <div
        className="grid min-w-0 items-start content-center"
        style={{
          order: st.deviceSide === "left" ? 2 : 1,
          gridTemplateColumns: `repeat(${st.columns}, minmax(0, 1fr))`,
          columnGap: 52,
          rowGap: 48,
        }}
      >
        {benefits.map((b, i) => {
          const Icon = b.icon ? iconByName(b.icon) : null;
          return (
            <div
              key={i}
              data-intro-item=""
              data-intro-step={i + 2}
              className="flex min-w-0 flex-col"
              style={{ alignItems: centered ? "center" : "flex-start", gap: 18 }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: iconBox,
                  height: iconBox,
                  borderRadius: st.tileRadius,
                  background: tileBg,
                  border: tileBorder,
                  color: accent,
                }}
              >
                {Icon ? (
                  <Icon size={Math.round(iconBox * 0.5)} strokeWidth={1.4} aria-hidden />
                ) : (
                  <span style={{ fontSize: fillPx(28, "display"), fontWeight: 800 }}>
                    {String(i + 1)}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: fillPx(25, "body"),
                  fontWeight: 500,
                  lineHeight: 1.28,
                  color: ink.strong,
                  textAlign: centered ? "center" : "left",
                  maxWidth: 320,
                }}
              >
                {b.label}
              </span>
            </div>
          );
        })}
      </div>
    );

    return (
      <SlideFrame brand={brand} pageNumber={pageNumber}>
        <SlideTitle brand={brand} title={s(c.title)} />
        {st.showTitleRule && (
          <div
            aria-hidden
            data-decorative
            style={{ marginTop: 18, height: 2, width: 180, background: accent }}
          />
        )}
        {s(c.body) && (
          <div
            style={{
              marginTop: 14,
              maxWidth: 1080,
              fontSize: fillPx(24, "body"),
              lineHeight: 1.32,
              color: muted,
            }}
          >
            {s(c.body)}
          </div>
        )}
        <div
          className="mt-10 grid min-h-0 flex-1 items-center"
          style={{
            gridTemplateColumns:
              st.deviceSide === "left"
                ? `minmax(0, ${st.split}fr) minmax(0, 1fr)`
                : `minmax(0, 1fr) minmax(0, ${st.split}fr)`,
            gap: 72,
          }}
        >
          {deviceCol}
          {quadCol}
        </div>
      </SlideFrame>
    );
  },
});

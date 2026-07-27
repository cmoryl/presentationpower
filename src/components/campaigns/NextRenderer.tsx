// NextRenderer — renders a kit asset in the TransPerfect NEXT 2026 design
// language instead of the generic division/aurora look.
//
// Ground is the NEXT navy field, the track accent supplies the glow + CTA,
// and the official NEXT lockup SVG (white / reverse masters from the Dropbox
// set) sits in the corner. City Series is the default track — it uses the
// deeper City Series navy and the City Series lockup, so a city kit can be
// regenerated straight into on-brand NEXT designs.

import type { CSSProperties } from "react";
import type { SocialFormat } from "@/lib/social-formats";
import { aspectClass } from "@/lib/social-formats";
import type { CampaignCopy, EventFacts } from "@/lib/campaigns";
import {
  NEXT_DIVISIONS,
  NEXT_NAVY_ARTWORK,
  NEXT_NAVY_SPEC,
  getNextDivision,
  type NextLockup,
} from "@/lib/next-brand-guide";

export const NEXT_RENDER_TRACKS = NEXT_DIVISIONS.map((d) => ({ id: d.id, name: d.name }));

/** Navy ground per track — City Series gets its own deeper navy. */
function groundFor(trackId: string) {
  return trackId === "city-series" ? NEXT_NAVY_SPEC : NEXT_NAVY_ARTWORK;
}

/** Pick the widest white lockup for corner placement. */
function pickLockup(lockups: NextLockup[], stacked: boolean): NextLockup | undefined {
  const variant = lockups.filter((l) => l.variant === "white");
  const pool = variant.length ? variant : lockups;
  if (stacked) {
    return pool.find((l) => l.lockup === "stacked") ?? pool[0];
  }
  return (
    pool.find((l) => l.lockup === "side-by-side") ??
    pool.find((l) => l.lockup === "ssv1") ??
    pool.find((l) => l.lockup === "ssv2") ??
    pool[0]
  );
}

type Preset = {
  padPct: number;
  eyebrowPct: number;
  titlePct: number;
  summaryPct: number;
  ctaPct: number;
  lockupPct: number;
  showSummary: boolean;
  stackedLockup: boolean;
};

function presetFor(format: SocialFormat): Preset {
  switch (aspectClass(format)) {
    case "landscape-wide":
      return {
        padPct: 5,
        eyebrowPct: 2.4,
        titlePct: 9.5,
        summaryPct: 3.2,
        ctaPct: 2.6,
        lockupPct: 20,
        showSummary: false,
        stackedLockup: false,
      };
    case "landscape":
      return {
        padPct: 5.5,
        eyebrowPct: 2.4,
        titlePct: 8.5,
        summaryPct: 3.4,
        ctaPct: 2.6,
        lockupPct: 22,
        showSummary: true,
        stackedLockup: false,
      };
    case "square":
      return {
        padPct: 6,
        eyebrowPct: 2.6,
        titlePct: 8.5,
        summaryPct: 3.6,
        ctaPct: 2.8,
        lockupPct: 30,
        showSummary: true,
        stackedLockup: false,
      };
    case "portrait":
      return {
        padPct: 6,
        eyebrowPct: 2.6,
        titlePct: 8,
        summaryPct: 3.4,
        ctaPct: 2.8,
        lockupPct: 34,
        showSummary: true,
        stackedLockup: false,
      };
    case "portrait-tall":
      return {
        padPct: 7,
        eyebrowPct: 2.4,
        titlePct: 7.5,
        summaryPct: 3.2,
        ctaPct: 2.6,
        lockupPct: 40,
        showSummary: true,
        stackedLockup: true,
      };
  }
}

export type NextRendererProps = {
  format: SocialFormat;
  /** NEXT track id from next-brand-guide, e.g. "city-series". */
  trackId?: string;
  copy: CampaignCopy;
  facts?: Pick<EventFacts, "hashtag" | "registrationUrl" | "city">;
  displayShortEdge?: number;
};

export function NextRenderer({
  format,
  trackId = "city-series",
  copy,
  facts,
  displayShortEdge = 320,
}: NextRendererProps) {
  const track = getNextDivision(trackId) ?? NEXT_DIVISIONS[0];
  const accent = track.accentArtwork || track.accent;
  const ground = groundFor(track.id);
  const preset = presetFor(format);
  const short = Math.min(format.width, format.height);
  const scale = displayShortEdge / short;

  const wrapperStyle: CSSProperties = {
    width: format.width * scale,
    height: format.height * scale,
  };
  const inner: CSSProperties = {
    width: format.width,
    height: format.height,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
    background: ground,
  };

  const padPx = (short * preset.padPct) / 100;
  const safe = format.safeArea ?? {};
  const safeInset = {
    top: padPx + (safe.top ?? 0) * format.height,
    bottom: padPx + (safe.bottom ?? 0) * format.height,
    left: padPx + (safe.left ?? 0) * format.width,
    right: padPx + (safe.right ?? 0) * format.width,
  };

  const lockup = pickLockup(track.lockups, preset.stackedLockup);
  const lockupWidth = (format.width * preset.lockupPct) / 100;
  const showEyebrow = aspectClass(format) !== "landscape-wide";
  const showCta = copy.cta && aspectClass(format) !== "landscape-wide";
  const dim = "rgba(255,255,255,0.74)";

  return (
    <div
      className="relative overflow-hidden rounded-xl shadow-[0_6px_24px_rgba(3,0,44,0.24)]"
      style={wrapperStyle}
    >
      <div className="relative overflow-hidden" style={inner} data-kit-asset-frame="true">
        {/* Accent glow — NEXT ground is flat navy with one soft track-colour bloom */}
        <div
          className="absolute"
          style={{
            width: format.width * 0.9,
            height: format.width * 0.9,
            right: -format.width * 0.3,
            top: -format.width * 0.25,
            borderRadius: "9999px",
            background: `radial-gradient(circle, ${accent}66 0%, ${accent}00 68%)`,
          }}
        />
        {/* NEXT geometric line motif */}
        <img
          src="/next-2026/logos/nexst26lines-white.svg"
          alt=""
          aria-hidden="true"
          className="absolute"
          style={{
            width: format.width * 0.62,
            right: -format.width * 0.12,
            bottom: -format.width * 0.08,
            opacity: 0.1,
          }}
        />

        {/* Content stack */}
        <div
          className="absolute flex flex-col justify-end"
          style={{
            top: safeInset.top,
            bottom: safeInset.bottom,
            left: safeInset.left,
            right: safeInset.right,
            gap: (short * 2.4) / 100,
            color: "#FFFFFF",
          }}
        >
          {showEyebrow && (copy.eyebrow || facts?.city) && (
            <div
              style={{
                fontSize: (short * preset.eyebrowPct) / 100,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontWeight: 600,
                color: accent,
              }}
            >
              {copy.eyebrow || facts?.city}
            </div>
          )}

          <div
            style={{
              fontSize: (short * preset.titlePct) / 100,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              fontWeight: 700,
              display: "-webkit-box",
              WebkitLineClamp: aspectClass(format) === "landscape-wide" ? 2 : 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {copy.title}
          </div>

          {preset.showSummary && copy.summary && (
            <div
              style={{
                fontSize: (short * preset.summaryPct) / 100,
                lineHeight: 1.28,
                color: dim,
                maxWidth: format.width * 0.86,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {copy.summary}
            </div>
          )}

          {copy.stat && (
            <div className="flex items-baseline gap-3" style={{ marginTop: (short * 1.4) / 100 }}>
              <span
                style={{
                  fontSize: (short * preset.titlePct * 0.9) / 100,
                  fontWeight: 700,
                  color: accent,
                  letterSpacing: "-0.04em",
                }}
              >
                {copy.stat.value}
              </span>
              <span style={{ fontSize: (short * preset.summaryPct) / 100, color: dim }}>
                {copy.stat.label}
              </span>
            </div>
          )}

          <div
            className="flex flex-wrap items-center gap-3"
            style={{ marginTop: (short * 1.6) / 100 }}
          >
            {showCta && (
              <span
                style={{
                  fontSize: (short * preset.ctaPct) / 100,
                  padding: `${(short * 1.2) / 100}px ${(short * 2.2) / 100}px`,
                  borderRadius: 9999,
                  background: accent,
                  color: NEXT_NAVY_SPEC,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                }}
              >
                {copy.cta}
              </span>
            )}
            {facts?.hashtag && (
              <span
                style={{
                  fontSize: (short * preset.ctaPct * 0.95) / 100,
                  padding: `${(short * 1) / 100}px ${(short * 1.8) / 100}px`,
                  borderRadius: 9999,
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.24)",
                  color: "#FFFFFF",
                }}
              >
                {facts.hashtag}
              </span>
            )}
          </div>
        </div>

        {/* Official NEXT lockup, top-left, inside the clear-space margin */}
        {lockup && (
          <img
            src={lockup.src}
            alt={`${track.name} lockup`}
            className="absolute"
            style={{
              top: safeInset.top,
              left: safeInset.left,
              width: lockupWidth,
              height: lockupWidth / lockup.aspect,
            }}
          />
        )}
      </div>
    </div>
  );
}

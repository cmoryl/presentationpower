// One rendered concept ad for the Legal creative refresh.
//
// Everything is drawn — flat colour, type and line only. No stock photography,
// no icons, no gavels/scales, no blue-overlay imagery: the brief forbids all of
// it, so the motifs are SVG paths generated here instead.
//
// The frame scales with its container via an aspect-ratio box and viewport
// units, so the same component proofs at 1200×628 and 1080×1080.

import { useId } from "react";
import { getDivisionLogos } from "@/lib/division-logos";
import {
  LEGAL_REFRESH_CONCEPT,
  type LegalRefreshDirection,
  type LegalRefreshRenderMode,
} from "@/lib/social-legal-refresh";
import photoThorn from "@/assets/legal-refresh/human-thorn-line.jpg";
import photoRedacted from "@/assets/legal-refresh/human-redacted.jpg";
import photoKnot from "@/assets/legal-refresh/human-the-knot.jpg";
import photoThicket from "@/assets/legal-refresh/human-thicket-type.jpg";

/**
 * Commissioned campaign photography: real people in real, slightly absurd
 * working situations. Wry rather than beaming, no devices in hand, no gavels or
 * scales, no blue overlay — so the brief's forbidden list still holds while the
 * campaign gets its human warmth and its joke.
 */
const PHOTOS: Record<string, string> = {
  "thorn-line": photoThorn,
  redacted: photoRedacted,
  "the-knot": photoKnot,
  "thicket-type": photoThicket,
};

export function legalRefreshPhoto(directionId: string): string | undefined {
  return PHOTOS[directionId];
}

type Props = {
  direction: LegalRefreshDirection;
  /** Frame aspect. */
  w: number;
  h: number;
  /** Photographic art direction, or the drawn motif. Defaults to photographic. */
  mode?: LegalRefreshRenderMode;
  className?: string;
};

const SERIF = '"Instrument Serif", "Iowan Old Style", Georgia, serif';
const SANS = 'Geist, "Geist Variable", system-ui, sans-serif';
const MONO = '"Geist Mono", ui-monospace, monospace';

export function LegalRefreshAd({ direction: d, w, h, mode = "photo", className }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const logos = getDivisionLogos("bm-tp-legal");
  const photo = mode === "photo" ? legalRefreshPhoto(d.id) : undefined;
  // On the photographic route the lockup and copy have to survive the frame, so
  // the ink flips to whatever the shot can carry.
  const ink = photo ? d.photo.ink : d.palette.ink;
  const onDark = ink.toUpperCase() === "#FFFFFF";
  const lockup =
    photo || d.lockup === "white"
      ? onDark
        ? (logos?.white ?? logos?.color)
        : (logos?.color ?? logos?.white)
      : (logos?.color ?? "");
  const square = h >= w;
  // One type scale drives the whole frame so both aspects stay in proportion.
  const unit = Math.min(w, h);
  const px = (n: number) => `${(n / unit) * 100}cqmin`;
  const scrimStops = square
    ? `${d.palette.ground} 0%, ${d.palette.ground} 34%, transparent 78%`
    : `${d.palette.ground} 0%, ${d.palette.ground} 30%, transparent 72%`;

  return (
    <div
      className={className}
      style={{
        containerType: "size",
        position: "relative",
        aspectRatio: `${w} / ${h}`,
        width: "100%",
        overflow: "hidden",
        background: d.palette.ground,
        color: ink,
        fontFamily: SANS,
      }}
    >
      {photo ? (
        <>
          <img
            src={photo}
            alt=""
            aria-hidden
            loading="lazy"
            width={1920}
            height={1008}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: d.photo.focus,
              zIndex: 0,
            }}
          />
          {/* Ground-toned scrim — the brand ground, never a blue wash. */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              opacity: d.photo.scrim,
              background: `linear-gradient(${square ? "to top" : "to right"}, ${scrimStops})`,
            }}
          />
          {/* Lift the lockup corner off busy detail so the mark stays legible. */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              background: `radial-gradient(120% 90% at 100% 100%, ${d.palette.ground} 0%, transparent 46%)`,
              opacity: 0.62,
            }}
          />
        </>
      ) : (
        <Motif direction={d} square={square} uid={uid} />
      )}


      {/* Copy stack */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: px(square ? 72 : 56),
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontFamily: d.motif === "redaction" ? MONO : SANS,
            fontSize: px(square ? 20 : 17),
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            opacity: 0.6,
          }}
        >
          TransPerfect Legal
        </div>

        <div style={{ maxWidth: square ? "94%" : "68%" }}>
          <h3
            style={{
              margin: 0,
              fontFamily: d.headlineFont === "serif" ? SERIF : SANS,
              fontWeight: d.headlineFont === "serif" ? 400 : 600,
              fontSize: px(square ? 96 : 82),
              lineHeight: 1.02,
              letterSpacing: d.headlineFont === "serif" ? "-0.01em" : "-0.03em",
              textTransform: d.headlineCase === "caps" ? "uppercase" : "none",
              color: ink,
            }}
          >
            {d.headline}
          </h3>
          <p
            style={{
              margin: `${px(square ? 28 : 22)} 0 0`,
              fontSize: px(square ? 32 : 27),
              lineHeight: 1.35,
              maxWidth: "26em",
              opacity: 0.78,
            }}
          >
            {d.support}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: px(24) }}>
          <span
            style={{
              display: "inline-block",
              background: d.palette.accent,
              color: "#FFFFFF",
              fontSize: px(square ? 26 : 22),
              fontWeight: 500,
              padding: `${px(16)} ${px(30)}`,
              borderRadius: px(999),
            }}
          >
            {d.cta}
          </span>
          {lockup ? (
            <img
              src={lockup}
              alt="TransPerfect Legal"
              style={{ height: px(square ? 46 : 40), width: "auto", opacity: 0.95 }}
            />
          ) : (
            <span style={{ fontSize: px(20), opacity: 0.7 }}>{LEGAL_REFRESH_CONCEPT.division}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/** The drawn graphic device for each direction. */
function Motif({
  direction: d,
  square,
  uid,
}: {
  direction: LegalRefreshDirection;
  square: boolean;
  uid: string;
}) {
  const common = {
    position: "absolute" as const,
    inset: 0,
    width: "100%",
    height: "100%",
    zIndex: 1,
  };

  if (d.motif === "thorn") {
    return (
      <svg style={common} viewBox="0 0 1200 628" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <path
          d="M420 640 C 560 560, 600 400, 760 380 C 900 362, 940 500, 1060 470 C 1160 446, 1180 300, 1250 250"
          fill="none"
          stroke={d.palette.accent}
          strokeWidth="6"
        />
        {[
          [520, 566, -58],
          [640, 448, -70],
          [762, 380, 12],
          [880, 396, 58],
          [1000, 474, 42],
          [1092, 456, -34],
          [1180, 342, -62],
          [1236, 264, -56],
        ].map(([x, y, r], i) => (
          <path
            key={i}
            d="M0 0 L34 -12 L8 10 Z"
            fill={d.palette.accent}
            transform={`translate(${x} ${y}) rotate(${r})`}
            opacity={0.9}
          />
        ))}
        <path
          d="M380 700 C 620 640, 780 660, 960 606 C 1100 564, 1180 594, 1250 560"
          fill="none"
          stroke={d.palette.second}
          strokeWidth="4"
          opacity={0.7}
        />
      </svg>
    );
  }

  if (d.motif === "redaction") {
    const bars = square
      ? [
          [520, 300, 300, 54],
          [520, 380, 420, 54],
          [520, 460, 210, 54],
        ]
      : [
          [700, 190, 380, 52],
          [760, 270, 300, 52],
          [640, 350, 470, 52],
          [820, 430, 240, 52],
        ];
    return (
      <svg style={common} viewBox="0 0 1200 628" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {bars.map(([x, y, bw, bh], i) => (
          <rect
            key={i}
            x={x}
            y={y}
            width={bw}
            height={bh}
            fill={i === 1 ? d.palette.second : d.palette.accent}
            opacity={i === 1 ? 0.95 : 1}
          />
        ))}
        <rect x="0" y="0" width="1200" height="628" fill="none" />
      </svg>
    );
  }

  if (d.motif === "knot") {
    return (
      <svg style={common} viewBox="0 0 1200 628" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <path
          d="M760 470 C 700 340, 900 330, 900 430 C 900 530, 720 520, 740 400 C 760 280, 980 300, 1000 380 C 1020 460, 900 500, 880 420 C 862 348, 1010 330, 1060 348 C 1120 370, 1160 372, 1240 372"
          fill="none"
          stroke={d.palette.accent}
          strokeWidth="26"
          strokeLinecap="round"
        />
        <path
          d="M1000 528 C 1080 528, 1140 528, 1240 528"
          fill="none"
          stroke={d.palette.second}
          strokeWidth="14"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // thicket — the headline repeated, layered and cleared.
  return (
    <svg style={common} viewBox="0 0 1200 628" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <clipPath id={`clip-${uid}`}>
          <rect x="0" y="0" width="1200" height="628" />
        </clipPath>
      </defs>
      <g clipPath={`url(#clip-${uid})`} opacity={0.5}>
        {[
          [560, 120, -14, 96],
          [640, 250, 9, 118],
          [520, 372, -5, 104],
          [700, 496, 15, 92],
        ].map(([x, y, r, size], i) => (
          <text
            key={i}
            x={x}
            y={y}
            fontSize={size}
            fontFamily={SANS}
            fontWeight={700}
            fill="none"
            stroke={i % 2 === 0 ? d.palette.accent : d.palette.second}
            strokeWidth="1.6"
            transform={`rotate(${r} ${x} ${y})`}
          >
            messy
          </text>
        ))}
      </g>
    </svg>
  );
}

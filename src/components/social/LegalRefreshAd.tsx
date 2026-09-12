// One rendered concept ad for the Legal creative refresh.
//
// Two things are true of every frame here:
//   1. The art is either commissioned campaign photography or a DRAWN device —
//      never a stock library frame, never a blue overlay, no icons, no gavels or
//      scales, no smiling stock people, no hands on devices. The brief forbids
//      all of it, so the drawn motifs are SVG paths generated in this file.
//   2. Each direction owns its own COMPOSITION. The layout is what makes the
//      eight directions eight designs rather than eight colourways, so the copy
//      position, the art crop, the type scale and the footer all change per
//      layout — nothing is shared but the words.
//
// The frame scales with its container via an aspect-ratio box and container
// query units, so the same component proofs at 1200×628 and 1080×1080.

import { useId } from "react";
import { getDivisionLogos } from "@/lib/division-logos";
import {
  LEGAL_REFRESH_CONCEPT,
  type LegalRefreshDirection,
  type LegalRefreshRenderMode,
} from "@/lib/social-legal-refresh";
import photoThorn from "@/assets/legal-refresh/v2-thorn-line.jpg";
import photoRedacted from "@/assets/legal-refresh/v2-redacted.jpg";
import photoKnot from "@/assets/legal-refresh/v2-the-knot.jpg";
import photoThicket from "@/assets/legal-refresh/v2-thicket-type.jpg";
import photoTrail from "@/assets/legal-refresh/v2-paper-trail.jpg";
import photoCut from "@/assets/legal-refresh/v2-cut-through.jpg";
import photoFine from "@/assets/legal-refresh/v2-fine-print.jpg";
import photoMaze from "@/assets/legal-refresh/v2-the-maze.jpg";

/**
 * Commissioned campaign photography: real people in real, slightly absurd
 * everyday situations. Wry rather than beaming, no devices in hand, no gavels or
 * scales, no blue overlay — so the brief's forbidden list still holds while the
 * campaign gets its human warmth and its joke.
 */
const PHOTOS: Record<string, string> = {
  "thorn-line": photoThorn,
  redacted: photoRedacted,
  "the-knot": photoKnot,
  "thicket-type": photoThicket,
  "paper-trail": photoTrail,
  "cut-through": photoCut,
  "fine-print": photoFine,
  "the-maze": photoMaze,
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

type Px = (n: number) => string;

export function LegalRefreshAd({ direction: d, w, h, mode = "photo", className }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const logos = getDivisionLogos("bm-tp-legal");
  const photo = mode === "photo" ? legalRefreshPhoto(d.id) : undefined;
  const square = h >= w;
  const unit = Math.min(w, h);
  const px: Px = (n) => `${(n / unit) * 100}cqmin`;

  // Layouts that never lay type over art keep the palette ink; the rest flip to
  // whatever the photograph can carry.
  const onPanel = d.layout === "split-vertical" || d.layout === "bottom-band" || d.layout === "corner-plate";
  const ink = photo && !onPanel ? d.photo.ink : d.palette.ink;
  const onDark = ink.toUpperCase() === "#FFFFFF";
  const lockup = onDark ? (logos?.white ?? logos?.color ?? "") : (logos?.color ?? logos?.white ?? "");
  const mono = d.motif === "redaction" || d.motif === "trail" || d.motif === "fineprint";

  const art = (
    <Art d={d} photo={photo} square={square} uid={uid} />
  );
  const shared = { d, px, ink, mono, lockup, square } as const;

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
      {d.layout === "editorial-left" && <EditorialLeft {...shared} art={art} photo={!!photo} />}
      {d.layout === "poster-caps" && <PosterCaps {...shared} art={art} photo={!!photo} />}
      {d.layout === "bottom-band" && <BottomBand {...shared} art={art} />}
      {d.layout === "center-stack" && <CenterStack {...shared} art={art} photo={!!photo} />}
      {d.layout === "split-vertical" && <SplitVertical {...shared} art={art} />}
      {d.layout === "diagonal-band" && <DiagonalBand {...shared} art={art} photo={!!photo} />}
      {d.layout === "footnote" && <Footnote {...shared} art={art} photo={!!photo} />}
      {d.layout === "corner-plate" && <CornerPlate {...shared} art={art} />}
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

type Shared = {
  d: LegalRefreshDirection;
  px: Px;
  ink: string;
  mono: boolean;
  lockup: string;
  square: boolean;
};

function Eyebrow({ d, px, mono, size = 18 }: Shared & { size?: number }) {
  return (
    <div
      style={{
        fontFamily: mono ? MONO : SANS,
        fontSize: px(size),
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        opacity: 0.62,
      }}
    >
      {LEGAL_REFRESH_CONCEPT.division}
    </div>
  );
}

function Headline({ d, px, ink, size, align = "left" }: Shared & { size: number; align?: "left" | "center" }) {
  return (
    <h3
      style={{
        margin: 0,
        fontFamily: d.headlineFont === "serif" ? SERIF : SANS,
        fontWeight: d.headlineFont === "serif" ? 400 : 600,
        fontSize: px(size),
        lineHeight: d.headlineCase === "caps" ? 0.96 : 1.03,
        letterSpacing: d.headlineFont === "serif" ? "-0.01em" : "-0.03em",
        textTransform: d.headlineCase === "caps" ? "uppercase" : "none",
        textAlign: align,
        color: ink,
      }}
    >
      {d.headline}
    </h3>
  );
}

function Support({ d, px, size, align = "left" }: Shared & { size: number; align?: "left" | "center" }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: px(size),
        lineHeight: 1.35,
        maxWidth: "26em",
        marginInline: align === "center" ? "auto" : undefined,
        textAlign: align,
        opacity: 0.78,
      }}
    >
      {d.support}
    </p>
  );
}

function Cta({ d, px, size = 22 }: Shared & { size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        background: d.palette.accent,
        color: "#FFFFFF",
        fontSize: px(size),
        fontWeight: 500,
        padding: `${px(size * 0.72)} ${px(size * 1.35)}`,
        borderRadius: px(999),
        whiteSpace: "nowrap",
      }}
    >
      {d.cta}
    </span>
  );
}

function Lockup({ px, lockup, d, size = 40 }: Shared & { size?: number }) {
  if (!lockup) {
    return <span style={{ fontSize: px(20), opacity: 0.7 }}>{LEGAL_REFRESH_CONCEPT.division}</span>;
  }
  return (
    <img
      src={lockup}
      alt="TransPerfect Legal"
      style={{ height: px(size), width: "auto", opacity: 0.95, filter: d.layout === "corner-plate" ? "none" : undefined }}
    />
  );
}

/** Ground-toned scrim, shaped for where the copy sits. Never a blue wash. */
function Scrim({ d, direction, strength }: { d: LegalRefreshDirection; direction: string; strength: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1,
        opacity: strength,
        background: `linear-gradient(${direction}, ${d.palette.ground} 0%, ${d.palette.ground} 32%, transparent 74%)`,
      }}
    />
  );
}

/* ----------------------------------------------------------------- layouts */

// 01 · copy in the left third, art running right, one footer baseline.
function EditorialLeft(p: Shared & { art: React.ReactNode; photo: boolean }) {
  const { px, square, photo, d, art } = p;
  return (
    <>
      {art}
      {photo && <Scrim d={d} direction={square ? "to top" : "to right"} strength={d.photo.scrim} />}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          padding: px(square ? 70 : 56),
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Eyebrow {...p} size={square ? 20 : 17} />
        <div style={{ maxWidth: square ? "92%" : "60%", display: "grid", gap: px(square ? 26 : 22) }}>
          <Headline {...p} size={square ? 96 : 80} />
          <Support {...p} size={square ? 32 : 27} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: px(24) }}>
          <Cta {...p} size={square ? 26 : 22} />
          <Lockup {...p} size={square ? 46 : 40} />
        </div>
      </div>
    </>
  );
}

// 02 · poster: giant caps top, hairline rule, tight footer row.
function PosterCaps(p: Shared & { art: React.ReactNode; photo: boolean }) {
  const { px, square, photo, d, ink, art } = p;
  return (
    <>
      {art}
      {photo && <Scrim d={d} direction="to bottom" strength={d.photo.scrim} />}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          padding: px(square ? 64 : 52),
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          gap: px(square ? 24 : 18),
        }}
      >
        <Eyebrow {...p} size={square ? 19 : 16} />
        <div style={{ alignSelf: "start", maxWidth: "96%" }}>
          <Headline {...p} size={square ? 118 : 96} />
        </div>
        <div style={{ display: "grid", gap: px(square ? 22 : 18) }}>
          <div style={{ height: 1, background: ink, opacity: 0.35 }} />
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: px(24),
              flexWrap: "wrap",
            }}
          >
            <div style={{ maxWidth: "52%" }}>
              <Support {...p} size={square ? 28 : 24} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: px(28) }}>
              <Cta {...p} size={square ? 25 : 21} />
              <Lockup {...p} size={square ? 42 : 36} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// 03 · art full bleed above, solid ground band holding all copy below.
function BottomBand(p: Shared & { art: React.ReactNode }) {
  const { px, square, d, art } = p;
  const bandH = square ? "42%" : "36%";
  return (
    <>
      <div style={{ position: "absolute", inset: 0, bottom: bandH, overflow: "hidden", zIndex: 1 }}>{art}</div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: bandH,
          background: d.palette.ground,
          zIndex: 2,
          padding: `${px(square ? 40 : 34)} ${px(square ? 56 : 48)}`,
          display: "grid",
          gridTemplateColumns: square ? "1fr" : "1.35fr auto",
          alignItems: "end",
          gap: px(square ? 20 : 32),
        }}
      >
        <div style={{ display: "grid", gap: px(14) }}>
          <Eyebrow {...p} size={square ? 18 : 15} />
          <Headline {...p} size={square ? 76 : 62} />
          <Support {...p} size={square ? 28 : 24} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: square ? "space-between" : "flex-end",
            gap: px(26),
          }}
        >
          <Cta {...p} size={square ? 25 : 21} />
          <Lockup {...p} size={square ? 42 : 36} />
        </div>
      </div>
    </>
  );
}

// 04 · everything centred on the optical axis.
function CenterStack(p: Shared & { art: React.ReactNode; photo: boolean }) {
  const { px, square, photo, d, art } = p;
  return (
    <>
      {art}
      {photo && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            opacity: d.photo.scrim,
            background: `radial-gradient(78% 68% at 50% 50%, ${d.palette.ground} 0%, ${d.palette.ground} 46%, transparent 88%)`,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          padding: px(square ? 72 : 54),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: px(square ? 26 : 20),
        }}
      >
        <Eyebrow {...p} size={square ? 19 : 16} />
        <div style={{ maxWidth: square ? "88%" : "76%" }}>
          <Headline {...p} size={square ? 92 : 74} align="center" />
        </div>
        <Support {...p} size={square ? 30 : 25} align="center" />
        <div style={{ marginTop: px(6) }}>
          <Cta {...p} size={square ? 26 : 22} />
        </div>
        <div style={{ position: "absolute", bottom: px(square ? 56 : 42) }}>
          <Lockup {...p} size={square ? 40 : 34} />
        </div>
      </div>
    </>
  );
}

// 05 · hard vertical split, no overlap of type and art.
function SplitVertical(p: Shared & { art: React.ReactNode }) {
  const { px, square, d, art } = p;
  const split = square ? "54%" : "46%";
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: square ? split : 0,
          bottom: 0,
          left: square ? 0 : split,
          right: 0,
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        {art}
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: square ? 0 : `calc(100% - ${split})`,
          bottom: square ? `calc(100% - ${split})` : 0,
          background: d.palette.ground,
          zIndex: 2,
          padding: px(square ? 56 : 50),
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: px(20),
        }}
      >
        <Eyebrow {...p} size={square ? 18 : 15} />
        <div style={{ display: "grid", gap: px(18) }}>
          <Headline {...p} size={square ? 74 : 58} />
          <Support {...p} size={square ? 27 : 22} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: px(20) }}>
          <Cta {...p} size={square ? 24 : 20} />
          <Lockup {...p} size={square ? 38 : 32} />
        </div>
      </div>
    </>
  );
}

// 06 · skewed band carrying the headline, corners hold the rest.
function DiagonalBand(p: Shared & { art: React.ReactNode; photo: boolean }) {
  const { px, square, photo, d, art } = p;
  return (
    <>
      {art}
      {photo && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            opacity: d.photo.scrim,
            background: `linear-gradient(to top, ${d.palette.ground} 0%, transparent 70%)`,
          }}
        />
      )}
      {/* The band */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "-12%",
          right: "-12%",
          top: square ? "34%" : "30%",
          height: square ? "30%" : "34%",
          background: d.palette.accent,
          transform: `rotate(${square ? -8 : -6}deg)`,
          zIndex: 2,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "-12%",
          right: "-12%",
          top: square ? "31%" : "27%",
          height: px(6),
          background: d.palette.second,
          transform: `rotate(${square ? -8 : -6}deg)`,
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "4%",
          right: "4%",
          top: square ? "37%" : "33%",
          transform: `rotate(${square ? -8 : -6}deg)`,
          zIndex: 3,
        }}
      >
        <Headline {...p} ink="#FFFFFF" size={square ? 86 : 70} />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
          padding: px(square ? 60 : 48),
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          pointerEvents: "none",
        }}
      >
        <Eyebrow {...p} size={square ? 19 : 16} />
        <div style={{ display: "grid", gap: px(20) }}>
          <div style={{ maxWidth: square ? "82%" : "54%" }}>
            <Support {...p} size={square ? 29 : 24} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: px(24) }}>
            <Cta {...p} size={square ? 25 : 21} />
            <Lockup {...p} size={square ? 42 : 36} />
          </div>
        </div>
      </div>
    </>
  );
}

// 07 · headline anchored low left, fine-print column down the right edge.
function Footnote(p: Shared & { art: React.ReactNode; photo: boolean }) {
  const { px, square, photo, d, ink, art } = p;
  return (
    <>
      {art}
      {photo && <Scrim d={d} direction="to top" strength={d.photo.scrim} />}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          padding: px(square ? 62 : 50),
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: px(24) }}>
          <Eyebrow {...p} size={square ? 18 : 15} />
          <Lockup {...p} size={square ? 38 : 32} />
        </div>
        <div />
        <div style={{ display: "grid", gap: px(square ? 22 : 18) }}>
          <div style={{ height: 1, background: ink, opacity: 0.25 }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: square ? "1fr" : "1.5fr auto",
              alignItems: "end",
              gap: px(square ? 20 : 30),
            }}
          >
            <div style={{ display: "grid", gap: px(14) }}>
              <Headline {...p} size={square ? 72 : 58} />
              <Support {...p} size={square ? 27 : 23} />
            </div>
            <Cta {...p} size={square ? 24 : 21} />
          </div>
        </div>
      </div>
    </>
  );
}

// 08 · full-bleed art, all copy inside a floating plate in the lower left.
function CornerPlate(p: Shared & { art: React.ReactNode }) {
  const { px, square, d, art } = p;
  return (
    <>
      {art}
      <div
        style={{
          position: "absolute",
          left: px(square ? 48 : 44),
          bottom: px(square ? 48 : 44),
          width: square ? "72%" : "48%",
          background: d.palette.ground,
          zIndex: 3,
          padding: px(square ? 42 : 36),
          borderRadius: px(18),
          borderLeft: `${px(8)} solid ${d.palette.accent}`,
          display: "grid",
          gap: px(16),
          boxShadow: `0 ${px(18)} ${px(46)} rgba(3,0,44,0.28)`,
        }}
      >
        <Eyebrow {...p} size={square ? 17 : 15} />
        <Headline {...p} size={square ? 62 : 50} />
        <Support {...p} size={square ? 25 : 21} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: px(18) }}>
          <Cta {...p} size={square ? 23 : 20} />
          <Lockup {...p} size={square ? 36 : 30} />
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------------- art */

function Art({
  d,
  photo,
  square,
  uid,
}: {
  d: LegalRefreshDirection;
  photo?: string;
  square: boolean;
  uid: string;
}) {
  if (photo) {
    return (
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
    );
  }
  return <Motif direction={d} square={square} uid={uid} />;
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
  const svg = (children: React.ReactNode) => (
    <svg style={common} viewBox="0 0 1200 628" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {children}
    </svg>
  );

  if (d.motif === "thorn") {
    return svg(
      <>
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
      </>,
    );
  }

  if (d.motif === "redaction") {
    const bars = square
      ? [
          [420, 250, 420, 54],
          [420, 330, 540, 54],
          [420, 410, 300, 54],
        ]
      : [
          [520, 180, 520, 52],
          [600, 260, 440, 52],
          [460, 340, 610, 52],
          [700, 420, 300, 52],
        ];
    return svg(
      <>
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
      </>,
    );
  }

  if (d.motif === "knot") {
    return svg(
      <>
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
      </>,
    );
  }

  if (d.motif === "thicket") {
    return svg(
      <>
        <defs>
          <clipPath id={`clip-${uid}`}>
            <rect x="0" y="0" width="1200" height="628" />
          </clipPath>
        </defs>
        <g clipPath={`url(#clip-${uid})`} opacity={0.5}>
          {[
            [120, 130, -14, 108],
            [240, 268, 9, 126],
            [80, 404, -5, 116],
            [300, 540, 15, 100],
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
              messy · knotty · thorny
            </text>
          ))}
        </g>
      </>,
    );
  }

  if (d.motif === "trail") {
    return svg(
      <>
        <path
          d="M-40 470 C 220 470, 340 300, 620 300 C 860 300, 980 150, 1240 150"
          fill="none"
          stroke={d.palette.accent}
          strokeWidth="8"
          strokeDasharray="26 20"
        />
        {Array.from({ length: 9 }, (_, i) => (
          <rect
            key={i}
            x={120 + i * 120}
            y={520}
            width="8"
            height={i % 3 === 0 ? 60 : 34}
            fill={i % 3 === 0 ? d.palette.accent : d.palette.second}
            opacity={0.85}
          />
        ))}
      </>,
    );
  }

  if (d.motif === "cut") {
    return svg(
      <>
        <path d="M-60 520 L1260 180 L1260 300 L-60 640 Z" fill={d.palette.accent} opacity={0.9} />
        <path d="M-60 486 L1260 146" stroke={d.palette.second} strokeWidth="8" fill="none" />
      </>,
    );
  }

  if (d.motif === "fineprint") {
    return svg(
      <>
        {Array.from({ length: 26 }, (_, i) => (
          <rect
            key={i}
            x={860}
            y={70 + i * 19}
            width={i % 5 === 0 ? 200 : 280 - ((i * 37) % 120)}
            height="5"
            fill={i === 12 ? d.palette.second : d.palette.ink}
            opacity={i === 12 ? 0.9 : 0.22}
          />
        ))}
        <rect x={820} y={60} width="4" height="512" fill={d.palette.accent} opacity={0.85} />
      </>,
    );
  }

  // maze — plan-view walls with one clear route through.
  return svg(
    <>
      <g stroke={d.palette.ink} strokeWidth="6" fill="none" opacity={0.22}>
        {Array.from({ length: 7 }, (_, r) => (
          <path key={`h${r}`} d={`M${120 + (r % 2) * 90} ${80 + r * 78} H ${900 - (r % 3) * 120}`} />
        ))}
        {Array.from({ length: 8 }, (_, c) => (
          <path key={`v${c}`} d={`M${140 + c * 108} ${100 + (c % 3) * 70} V ${480 - (c % 2) * 110}`} />
        ))}
      </g>
      <path
        d="M120 560 H 400 V 380 H 620 V 220 H 900 V 120 H 1160"
        fill="none"
        stroke={d.palette.accent}
        strokeWidth="14"
        strokeLinecap="square"
      />
      <circle cx="1160" cy="120" r="16" fill={d.palette.second} />
    </>,
  );
}

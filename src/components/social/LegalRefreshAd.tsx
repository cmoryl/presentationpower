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
  legalRefreshFinish,
  legalRefreshGrade,
  legalRefreshModeIsDark,
  legalRefreshModeUsesPhoto,
  type LegalRefreshFinish,
  type LegalRefreshGrade,
  type LegalRefreshDirection,
  type LegalRefreshRenderMode,
} from "@/lib/social-legal-refresh";
import photoThorn from "@/assets/legal-refresh/v3-thorn-line.jpg";
import photoRedacted from "@/assets/legal-refresh/v3-redacted.jpg";
import photoKnot from "@/assets/legal-refresh/v3-the-knot.jpg";
import photoThicket from "@/assets/legal-refresh/v3-thicket-type.jpg";
import photoTrail from "@/assets/legal-refresh/v3-paper-trail.jpg";
import photoCut from "@/assets/legal-refresh/v3-cut-through.jpg";
import photoFine from "@/assets/legal-refresh/v3-fine-print.jpg";
import photoMaze from "@/assets/legal-refresh/v3-the-maze.jpg";
import cineThorn from "@/assets/legal-refresh/cine-thorn-line.jpg";
import cineRedacted from "@/assets/legal-refresh/cine-redacted.jpg";
import cineKnot from "@/assets/legal-refresh/cine-the-knot.jpg";
import cineThicket from "@/assets/legal-refresh/cine-thicket-type.jpg";
import cineTrail from "@/assets/legal-refresh/cine-paper-trail.jpg";
import cineCut from "@/assets/legal-refresh/cine-cut-through.jpg";
import cineFine from "@/assets/legal-refresh/cine-fine-print.jpg";
import cineMaze from "@/assets/legal-refresh/cine-the-maze.jpg";
import inkThorn from "@/assets/legal-refresh/ink-thorn-line.jpg";
import inkRedacted from "@/assets/legal-refresh/ink-redacted.jpg";
import inkKnot from "@/assets/legal-refresh/ink-the-knot.jpg";
import inkThicket from "@/assets/legal-refresh/ink-thicket-type.jpg";
import inkTrail from "@/assets/legal-refresh/ink-paper-trail.jpg";
import inkCut from "@/assets/legal-refresh/ink-cut-through.jpg";
import inkFine from "@/assets/legal-refresh/ink-fine-print.jpg";
import inkMaze from "@/assets/legal-refresh/ink-the-maze.jpg";
import risoThorn from "@/assets/legal-refresh/riso-thorn-line.jpg";
import risoRedacted from "@/assets/legal-refresh/riso-redacted.jpg";
import risoKnot from "@/assets/legal-refresh/riso-the-knot.jpg";
import risoThicket from "@/assets/legal-refresh/riso-thicket-type.jpg";
import risoTrail from "@/assets/legal-refresh/riso-paper-trail.jpg";
import risoCut from "@/assets/legal-refresh/riso-cut-through.jpg";
import risoFine from "@/assets/legal-refresh/riso-fine-print.jpg";
import risoMaze from "@/assets/legal-refresh/riso-the-maze.jpg";
import collageThorn from "@/assets/legal-refresh/collage-thorn-line.jpg";
import collageRedacted from "@/assets/legal-refresh/collage-redacted.jpg";
import collageKnot from "@/assets/legal-refresh/collage-the-knot.jpg";
import collageThicket from "@/assets/legal-refresh/collage-thicket-type.jpg";
import collageTrail from "@/assets/legal-refresh/collage-paper-trail.jpg";
import collageCut from "@/assets/legal-refresh/collage-cut-through.jpg";
import collageFine from "@/assets/legal-refresh/collage-fine-print.jpg";
import collageMaze from "@/assets/legal-refresh/collage-the-maze.jpg";

/**
 * One commissioned artwork set per concept. Each set covers all eight
 * directions in its own medium — a cinematic film still, an ink-and-wash
 * drawing, a two-ink riso print, a cut-paper collage — so switching concept
 * changes the artwork itself, not a filter over one photograph.
 */
const ART: Record<Exclude<LegalRefreshRenderMode, "drawn">, Record<string, string>> = {
  photo: {
    "thorn-line": photoThorn,
    redacted: photoRedacted,
    "the-knot": photoKnot,
    "thicket-type": photoThicket,
    "paper-trail": photoTrail,
    "cut-through": photoCut,
    "fine-print": photoFine,
    "the-maze": photoMaze,
  },
  cinematic: {
    "thorn-line": cineThorn,
    redacted: cineRedacted,
    "the-knot": cineKnot,
    "thicket-type": cineThicket,
    "paper-trail": cineTrail,
    "cut-through": cineCut,
    "fine-print": cineFine,
    "the-maze": cineMaze,
  },
  ink: {
    "thorn-line": inkThorn,
    redacted: inkRedacted,
    "the-knot": inkKnot,
    "thicket-type": inkThicket,
    "paper-trail": inkTrail,
    "cut-through": inkCut,
    "fine-print": inkFine,
    "the-maze": inkMaze,
  },
  riso: {
    "thorn-line": risoThorn,
    redacted: risoRedacted,
    "the-knot": risoKnot,
    "thicket-type": risoThicket,
    "paper-trail": risoTrail,
    "cut-through": risoCut,
    "fine-print": risoFine,
    "the-maze": risoMaze,
  },
  collage: {
    "thorn-line": collageThorn,
    redacted: collageRedacted,
    "the-knot": collageKnot,
    "thicket-type": collageThicket,
    "paper-trail": collageTrail,
    "cut-through": collageCut,
    "fine-print": collageFine,
    "the-maze": collageMaze,
  },
};

export function legalRefreshPhoto(
  directionId: string,
  mode: LegalRefreshRenderMode = "photo",
): string | undefined {
  if (mode === "drawn") return undefined;
  return ART[mode]?.[directionId];
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
  const photo = legalRefreshModeUsesPhoto(mode) ? legalRefreshPhoto(d.id, mode) : undefined;
  const finish = legalRefreshFinish(mode);
  // Concepts whose artwork runs dark carry white copy over art regardless of
  // what the daylight photograph could hold.
  const darkFinish = legalRefreshModeIsDark(mode);

  const square = h >= w;
  const unit = Math.min(w, h);
  const px: Px = (n) => `${(n / unit) * 100}cqmin`;

  // Layouts that never lay type over art keep the palette ink; the rest flip to
  // whatever the photograph can carry.
  const onPanel =
    d.layout === "split-vertical" || d.layout === "bottom-band" || d.layout === "corner-plate";
  const ink = photo && !onPanel ? (darkFinish ? "#FFFFFF" : d.photo.ink) : d.palette.ink;
  const onDark = ink.toUpperCase() === "#FFFFFF";
  const lockup = onDark
    ? (logos?.white ?? logos?.color ?? "")
    : (logos?.color ?? logos?.white ?? "");
  const mono = d.motif === "redaction" || d.motif === "trail" || d.motif === "fineprint";

  const grade = legalRefreshGrade(mode);
  const art = <Art d={d} photo={photo} square={square} uid={uid} finish={finish} grade={grade} />;
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

function Headline({
  d,
  px,
  ink,
  size,
  align = "left",
}: Shared & { size: number; align?: "left" | "center" }) {
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

function Support({
  d,
  px,
  size,
  align = "left",
}: Shared & { size: number; align?: "left" | "center" }) {
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
      style={{
        height: px(size),
        width: "auto",
        opacity: 0.95,
        filter: d.layout === "corner-plate" ? "none" : undefined,
      }}
    />
  );
}

/**
 * A curtain of the ground colour holding one edge of the frame. This is not a
 * light haze: the copy edge is effectively solid, so headline, support, CTA and
 * lockup all sit on flat colour and the picture is left clean everywhere else.
 * Ground-toned only — never a blue wash over photography.
 */
function Curtain({
  d,
  direction,
  strength,
  hold = 26,
  fade = 78,
}: {
  d: LegalRefreshDirection;
  direction: string;
  strength: number;
  /** How far the solid part of the curtain runs, in percent of the frame. */
  hold?: number;
  /** Where the curtain has fully cleared the picture. */
  fade?: number;
}) {
  const g = d.palette.ground;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1,
        background: `linear-gradient(${direction}, ${g} 0%, ${g} ${hold}%, ${withAlpha(g, 0.82 * strength)} ${hold + (fade - hold) * 0.3}%, ${withAlpha(g, 0.42 * strength)} ${hold + (fade - hold) * 0.62}%, transparent ${fade}%)`,
        opacity: Math.min(1, 0.55 + strength * 0.45),
      }}
    />
  );
}

/** A short curtain along one edge purely so a lockup or eyebrow stays legible. */
function EdgeHold({
  d,
  direction,
  strength = 0.6,
}: {
  d: LegalRefreshDirection;
  direction: string;
  strength?: number;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1,
        background: `linear-gradient(${direction}, ${withAlpha(d.palette.ground, strength)} 0%, transparent 26%)`,
      }}
    />
  );
}

/** #RRGGBB plus an alpha, for gradient stops of the ground colour. */
function withAlpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

/* ----------------------------------------------------------------- layouts */
//
// Every layout obeys three rules, because the earlier set broke all three:
//   1. Copy, CTA and lockup never sit on picture detail. They sit on a panel,
//      inside a plate, or on the solid part of a curtain.
//   2. Nothing is clipped. Copy blocks are sized to their container and the
//      footer always has reserved space of its own.
//   3. The artwork is the centrepiece. Curtains hold one edge only, so the
//      subject is never covered by a slab and the picture keeps the frame.

// 01 · copy in the left third, art running right, one footer baseline.
function EditorialLeft(p: Shared & { art: React.ReactNode; photo: boolean }) {
  const { px, square, photo, d, art } = p;
  return (
    <>
      {art}
      {photo && (
        <Curtain
          d={d}
          direction={square ? "to top" : "to right"}
          strength={d.photo.scrim}
          hold={square ? 30 : 34}
          fade={square ? 76 : 72}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          padding: px(square ? 68 : 56),
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          gap: px(square ? 24 : 20),
        }}
      >
        <Eyebrow {...p} size={square ? 20 : 17} />
        {/* Copy stays inside the solid part of the curtain at both trims. */}
        <div
          style={{
            alignSelf: "end",
            maxWidth: square ? "94%" : "54%",
            display: "grid",
            gap: px(square ? 24 : 20),
          }}
        >
          <Headline {...p} size={square ? 88 : 72} />
          <Support {...p} size={square ? 31 : 26} />
        </div>
        {/* CTA and lockup share the copy column, so the mark never lands on
            picture detail on the far side of the frame. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: px(square ? 34 : 30),
            maxWidth: square ? "94%" : "54%",
          }}
        >
          <Cta {...p} size={square ? 26 : 22} />
          <Lockup {...p} size={square ? 44 : 38} />
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
      {photo && (
        <>
          <Curtain d={d} direction="to bottom" strength={d.photo.scrim} hold={20} fade={64} />
          {/* The footer row gets its own hold so the lockup reads. */}
          <Curtain d={d} direction="to top" strength={d.photo.scrim} hold={12} fade={34} />
        </>
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          padding: px(square ? 62 : 52),
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          gap: px(square ? 22 : 18),
        }}
      >
        <Eyebrow {...p} size={square ? 19 : 16} />
        <div style={{ alignSelf: "start", maxWidth: square ? "94%" : "90%" }}>
          <Headline {...p} size={square ? 104 : 88} />
        </div>
        <div style={{ display: "grid", gap: px(square ? 20 : 16) }}>
          <div style={{ height: 1, background: ink, opacity: 0.35 }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: square ? "1fr" : "1fr auto",
              alignItems: "center",
              gap: px(square ? 18 : 26),
            }}
          >
            <Support {...p} size={square ? 27 : 23} />
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
        </div>
      </div>
    </>
  );
}

// 03 · art full bleed above, solid ground band holding all copy below.
function BottomBand(p: Shared & { art: React.ReactNode }) {
  const { px, square, d, art } = p;
  // Sized to the copy it has to hold: the old band clipped the support line and
  // ran the CTA into it.
  const bandH = square ? "46%" : "45%";
  return (
    <>
      <div style={{ position: "absolute", inset: 0, bottom: bandH, overflow: "hidden", zIndex: 1 }}>
        {art}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: bandH,
          background: d.palette.ground,
          zIndex: 2,
          padding: `${px(square ? 40 : 36)} ${px(square ? 54 : 48)}`,
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          gap: px(square ? 16 : 14),
          // A thin accent rule ties the band to the picture edge above it.
          borderTop: `${px(6)} solid ${d.palette.accent}`,
        }}
      >
        <Eyebrow {...p} size={square ? 18 : 15} />
        <div style={{ display: "grid", gap: px(square ? 14 : 12), alignContent: "start" }}>
          <Headline {...p} size={square ? 68 : 56} />
          <Support {...p} size={square ? 26 : 22} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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

// 04 · everything centred on the optical axis, inside a plate.
function CenterStack(p: Shared & { art: React.ReactNode; photo: boolean }) {
  const { px, square, photo, d, art } = p;
  return (
    <>
      {art}
      {photo && (
        // A quiet vignette so the picture reads as a full frame around the plate.
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background: `radial-gradient(120% 110% at 50% 50%, transparent 40%, ${withAlpha(d.palette.ink, 0.22)} 100%)`,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: px(square ? 56 : 44),
        }}
      >
        {/* The plate is what makes this readable: centred type over a
            photograph otherwise fights every detail underneath it. */}
        <div
          style={{
            width: square ? "84%" : "62%",
            background: photo ? withAlpha(d.palette.ground, 0.94) : d.palette.ground,
            backdropFilter: photo ? "blur(2px)" : undefined,
            padding: `${px(square ? 56 : 44)} ${px(square ? 50 : 44)}`,
            display: "grid",
            justifyItems: "center",
            gap: px(square ? 22 : 18),
            textAlign: "center",
            borderTop: `${px(6)} solid ${d.palette.accent}`,
            boxShadow: photo ? `0 ${px(20)} ${px(60)} rgba(3,0,44,0.26)` : undefined,
          }}
        >
          <Eyebrow {...p} size={square ? 19 : 16} />
          <Headline {...p} size={square ? 82 : 66} align="center" />
          <Support {...p} size={square ? 28 : 24} align="center" />
          <Cta {...p} size={square ? 26 : 22} />
          <div style={{ marginTop: px(square ? 10 : 6) }}>
            <Lockup {...p} size={square ? 40 : 34} />
          </div>
        </div>
      </div>
    </>
  );
}

// 05 · hard vertical split, no overlap of type and art.
function SplitVertical(p: Shared & { art: React.ReactNode }) {
  const { px, square, d, art } = p;
  const split = square ? "52%" : "46%";
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
          padding: px(square ? 54 : 50),
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          gap: px(18),
          borderRight: square ? undefined : `${px(6)} solid ${d.palette.accent}`,
          borderBottom: square ? `${px(6)} solid ${d.palette.accent}` : undefined,
        }}
      >
        <Eyebrow {...p} size={square ? 18 : 15} />
        <div style={{ display: "grid", gap: px(16), alignContent: "center" }}>
          <Headline {...p} size={square ? 68 : 54} />
          <Support {...p} size={square ? 26 : 21} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: px(20),
          }}
        >
          <Cta {...p} size={square ? 24 : 20} />
          <Lockup {...p} size={square ? 38 : 32} />
        </div>
      </div>
    </>
  );
}

// 06 · one skewed band carrying the headline, low across the frame.
function DiagonalBand(p: Shared & { art: React.ReactNode; photo: boolean }) {
  const { px, square, photo, d, art } = p;
  const tilt = square ? -7 : -5;
  // The band used to be 40% of the frame and sat straight over the subject.
  // Slimmed and dropped into the lower third so the picture still reads.
  const bandTop = square ? "50%" : "46%";
  const bandH = square ? "23%" : "26%";
  return (
    <>
      {art}
      {photo && (
        <>
          <Curtain d={d} direction="to top" strength={d.photo.scrim} hold={14} fade={44} />
          <EdgeHold d={d} direction="to bottom" strength={0.5} />
        </>
      )}
      {/* The band */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "-10%",
          right: "-10%",
          top: bandTop,
          height: bandH,
          background: d.palette.accent,
          transform: `rotate(${tilt}deg)`,
          zIndex: 2,
          boxShadow: `0 ${px(16)} ${px(40)} rgba(3,0,44,0.35)`,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "-10%",
          right: "-10%",
          top: `calc(${bandTop} - ${px(14)})`,
          height: px(6),
          background: d.palette.second,
          transform: `rotate(${tilt}deg)`,
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "7%",
          right: "7%",
          top: `calc(${bandTop} + ${square ? px(30) : px(26)})`,
          transform: `rotate(${tilt}deg)`,
          zIndex: 3,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Headline {...p} ink="#FFFFFF" size={square ? 62 : 52} />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
          padding: px(square ? 58 : 48),
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          pointerEvents: "none",
        }}
      >
        <Eyebrow {...p} size={square ? 19 : 16} />
        <div />
        <div style={{ display: "grid", gap: px(square ? 18 : 16) }}>
          <div style={{ maxWidth: square ? "84%" : "56%" }}>
            <Support {...p} size={square ? 28 : 23} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: px(24),
            }}
          >
            <Cta {...p} size={square ? 25 : 21} />
            <Lockup {...p} size={square ? 42 : 36} />
          </div>
        </div>
      </div>
    </>
  );
}

// 07 · headline anchored low, document reference at the top edge.
function Footnote(p: Shared & { art: React.ReactNode; photo: boolean }) {
  const { px, square, photo, d, ink, art } = p;
  return (
    <>
      {art}
      {photo && (
        <>
          <Curtain d={d} direction="to top" strength={d.photo.scrim} hold={26} fade={70} />
          <EdgeHold d={d} direction="to bottom" strength={0.55} />
        </>
      )}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          padding: px(square ? 60 : 50),
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: px(24),
          }}
        >
          <Eyebrow {...p} size={square ? 18 : 15} />
          <Lockup {...p} size={square ? 38 : 32} />
        </div>
        <div />
        <div style={{ display: "grid", gap: px(square ? 20 : 16) }}>
          <div style={{ height: 1, background: ink, opacity: 0.25 }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: square ? "1fr" : "1.4fr auto",
              alignItems: "end",
              gap: px(square ? 18 : 30),
            }}
          >
            <div style={{ display: "grid", gap: px(12) }}>
              <Headline {...p} size={square ? 66 : 54} />
              <Support {...p} size={square ? 26 : 22} />
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
          left: px(square ? 46 : 44),
          bottom: px(square ? 46 : 44),
          width: square ? "76%" : "54%",
          background: d.palette.ground,
          zIndex: 3,
          padding: px(square ? 42 : 38),
          borderRadius: px(18),
          borderLeft: `${px(8)} solid ${d.palette.accent}`,
          display: "grid",
          gap: px(16),
          boxShadow: `0 ${px(18)} ${px(46)} rgba(3,0,44,0.28)`,
        }}
      >
        <Eyebrow {...p} size={square ? 17 : 15} />
        <Headline {...p} size={square ? 58 : 48} />
        <Support {...p} size={square ? 25 : 21} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: px(18),
          }}
        >
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
  finish,
  grade,
}: {
  d: LegalRefreshDirection;
  photo?: string;
  square: boolean;
  uid: string;
  finish: LegalRefreshFinish;
  grade: LegalRefreshGrade;
}) {
  if (photo) {
    const tone = (c: LegalRefreshFinish["tints"][number]["color"]) =>
      c === "ink"
        ? d.palette.ink
        : c === "accent"
          ? d.palette.accent
          : c === "second"
            ? d.palette.second
            : d.palette.ground;
    return (
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
            // The square trim loses a third of the frame, so each direction
            // declares where the subject and the clear space sit in that crop.
            objectPosition: (square && d.photo.focusSquare) || d.photo.focus,
            filter: `${finish.filter} contrast(${grade.contrast}) saturate(${grade.saturate}) brightness(${grade.brightness})`,
            transform: "scale(1.02)",
            zIndex: 0,
          }}
        />
        {grade.vignette > 0 && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              background: `radial-gradient(120% 105% at 50% 42%, transparent 38%, rgba(3,0,44,${grade.vignette}) 100%)`,
            }}
          />
        )}
        {grade.bloom > 0 && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              mixBlendMode: "soft-light",
              opacity: grade.bloom,
              background: "radial-gradient(58% 52% at 62% 34%, #FFFFFF 0%, transparent 70%)",
            }}
          />
        )}
        {finish.tints.map((t, i) => (
          <div
            key={i}
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              background: tone(t.color),
              mixBlendMode: t.blend as React.CSSProperties["mixBlendMode"],
              opacity: t.opacity,
            }}
          />
        ))}
        {finish.grain > 0 && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              opacity: finish.grain,
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>\")",
              backgroundSize: "180px 180px",
              mixBlendMode: "overlay",
            }}
          />
        )}
      </>
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
          <path
            key={`h${r}`}
            d={`M${120 + (r % 2) * 90} ${80 + r * 78} H ${900 - (r % 3) * 120}`}
          />
        ))}
        {Array.from({ length: 8 }, (_, c) => (
          <path
            key={`v${c}`}
            d={`M${140 + c * 108} ${100 + (c % 3) * 70} V ${480 - (c % 2) * 110}`}
          />
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

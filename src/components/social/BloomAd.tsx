// One rendered ad from the Legal "bloom" variation.
//
// The anatomy is taken straight from the Canva master:
//   · a plain near-white ground, nothing printed on it
//   · a soft colour bloom leaning out of the picture's turned end
//   · the picture as a rectangle with TWO DIAGONALLY OPPOSITE corners turned
//     right over and the other two left perfectly square, focus held in frame
//   · a solid accent keyline sitting on the frame itself, as in the master
//   · the headline beside (wide trims) or under (tall trims) the picture, with
//     the turning word italic in the bloom's colour
//   · the Legal lockup in one corner — the division is never typed out
//
// Every measure is derived from the frame's short edge, so a banner and a story
// hold the same proportions.

import { getDivisionLogos } from "@/lib/division-logos";
import {
  bloomColour,
  bloomFrameAspect,
  bloomHeadline,
  bloomLean,
  bloomOptical,
  bloomShapeRadius,
  LEGAL_BLOOM_PALETTE as P,
  type BloomAperture,
  type BloomScene,
  type BloomSide,
} from "@/lib/social-legal-bloom";

type Props = {
  scene: BloomScene;
  w: number;
  h: number;
  /** Overrides for the board's per-card pickers. */
  aperture?: BloomAperture;
  side?: BloomSide;
};

export function BloomAd({ scene, w, h, aperture, side }: Props) {
  const logos = getDivisionLogos("bm-tp-legal");
  const lockup = logos?.color ?? logos?.white;
  const C = bloomColour(scene);
  const cut = aperture ?? scene.aperture;
  const copySide = side ?? scene.side;

  const short = Math.min(w, h);
  const ratio = w / h;
  // A very wide trim (banner) or a tall trim (portrait, story) changes how the
  // picture and copy sit together; everything else runs side by side.
  const mode: "beside" | "stacked" | "strip" =
    ratio >= 2.4 ? "strip" : ratio < 0.95 ? "stacked" : "beside";

  const headline = bloomHeadline(scene);
  const optical = bloomOptical(headline.length);
  const margin = short * (mode === "strip" ? 0.09 : 0.075);
  const frameAspect = bloomFrameAspect(scene.frame);
  // A landscape photograph is given a longer horizontal column than an upright
  // one, so the frame runs the way the picture does.
  const pictureFlex =
    mode === "stacked"
      ? undefined
      : mode === "strip"
        ? frameAspect > 1.2
          ? 0.5
          : 0.44
        : frameAspect > 1.2
          ? 0.56
          : frameAspect < 0.9
            ? 0.44
            : 0.48;
  // The headline is set to the column it actually has, so a square trim reads
  // three or four words a line instead of stacking one word at a time.
  const colW =
    mode === "stacked"
      ? w - margin * 2
      : (w - margin * 2) * (1 - (pictureFlex ?? 0.48)) - short * 0.03;
  const baseHead =
    mode === "strip" ? short * 0.155 : mode === "stacked" ? short * 0.105 : short * 0.098;
  const headPx = Math.min(baseHead * optical, colW * (mode === "stacked" ? 0.115 : 0.155));
  const supportPx = Math.max(10, Math.min(headPx * 0.3, short * 0.028));

  // Picture box geometry. The turned end is half the box's short edge, but it is
  // also held back on a tall box so the picture never reads as a half circle —
  // the master keeps the turn to a third of the long edge at most.
  // The box is fitted to the photograph's own aspect inside the space it has, so
  // "tricky" (landscape) runs long and horizontal while an upright shot stands up.
  const availW = (w - margin * 2) * (mode === "stacked" ? 0.9 : (pictureFlex ?? 0.48) * 0.94);
  const availH = (h - margin * 2) * (mode === "stacked" ? 0.6 : mode === "strip" ? 0.9 : 0.82);
  let boxW = availW;
  let boxH = boxW / frameAspect;
  if (boxH > availH) {
    boxH = availH;
    boxW = Math.min(availW, boxH * frameAspect);
  }
  const radius = bloomShapeRadius(cut, boxW, boxH);
  const lean = bloomLean(cut);
  // The keyline in the master is a solid accent stroke sitting on the frame
  // itself — measured at 9px on a 1920 x 1080 page.
  const strokePx = Math.max(1.5, short * 0.008);

  const picture = (
    <div
      style={{
        position: "relative",
        flex: mode === "stacked" ? "1 1 auto" : `0 0 ${(pictureFlex ?? 0.48) * 100}%`,
        width: mode === "stacked" ? "100%" : undefined,
        height: mode === "stacked" ? undefined : "100%",
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* the bloom — leaning out of the turned end, soft focus */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: `-${short * 0.11}px`,
          transform: `translate(${lean.x * 9}%, ${lean.y * 7}%)`,
          background: `radial-gradient(circle at 50% 48%, ${C.glow}FF 0%, ${C.glow}D6 22%, ${C.glow}73 42%, ${C.glow}2B 60%, ${C.glow}00 74%)`,
          filter: `blur(${short * 0.045}px)`,
        }}
      />
      {/* the quiet mark: abstracted from this ad's own layout, sharp, held at 20%,
          in front of the bloom and behind the picture */}
      <BloomMark
        motif={bloomMotif(scene)}
        colour={C.type}
        boxW={boxW}
        boxH={boxH}
        pad={short * 0.13}
        lean={lean}
      />
      {/* the picture, cut to the master frame: two diagonal corners turned, two square */}

      <div
        style={{
          position: "relative",
          width: `${boxW}px`,
          height: `${boxH}px`,
          borderRadius: radius,
          overflow: "hidden",
          boxSizing: "border-box",
          border: `${strokePx}px solid ${C.type}`,
          boxShadow: `0 ${short * 0.014}px ${short * 0.045}px ${P.ink}1A, 0 0 ${short * 0.05}px ${C.glow}59`,
        }}
      >
        <img
          src={scene.photo}
          alt={scene.shot}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: scene.focus,
            display: "block",
          }}
        />
      </div>
    </div>
  );

  const copy = (
    <div
      style={{
        flex: mode === "stacked" ? "0 0 auto" : "1 1 auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        textAlign: "left",
        gap: `${short * 0.026}px`,
        minWidth: 0,
        zIndex: 2,
      }}
    >
      <div
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontWeight: 700,
          color: P.ink,
          fontSize: `${headPx}px`,
          // the turning word is set much larger, so the line needs air under it
          lineHeight: headPx > short * 0.12 ? 1.14 : 1.2,
          letterSpacing: "-0.015em",
          maxWidth: "15em",
          textWrap: "balance",
        }}
      >
        {scene.lead}{" "}
        <span
          style={{
            display: "inline-block",
            fontStyle: "italic",
            color: C.type,
            fontSize: "1.62em",
            lineHeight: 0.92,
            letterSpacing: "-0.028em",
            // it sits slightly lower than the roman line so the big italic
            // reads as the called-out word rather than a broken line
            transform: "translateY(0.055em)",
          }}
        >
          {scene.turn}
        </span>
        {scene.tail ? ` ${scene.tail}` : ""}
      </div>
      <div
        style={{
          fontFamily: '"Instrument Sans", "Geist", system-ui, sans-serif',
          fontSize: `${supportPx}px`,
          lineHeight: 1.42,
          color: `${P.ink}B8`,
          maxWidth: "24em",
        }}
      >
        {scene.support}
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: "relative",
        width: `${w}px`,
        height: `${h}px`,
        overflow: "hidden",
        background: P.ground,
        fontKerning: "normal",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: `${margin}px`,
          display: "flex",
          flexDirection: mode === "stacked" ? "column" : copySide === "left" ? "row" : "row-reverse",
          alignItems: "center",
          gap: `${short * (mode === "stacked" ? 0.05 : 0.03)}px`,
        }}
      >
        {copy}
        {picture}
      </div>

      {/* the division lockup — one corner, never typed out */}
      {lockup ? (
        <img
          src={lockup}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            // On tall trims the picture fills the foot of the frame, so the
            // lockup sits at the head where the ground is clear.
            ...(mode === "stacked"
              ? { right: margin * 0.9, top: margin * 0.5 }
              : copySide === "left"
                ? { right: margin * 0.9, bottom: margin * 0.6 }
                : { left: margin * 0.9, bottom: margin * 0.6 }),
            height: `${Math.max(14, short * 0.042)}px`,
            width: "auto",
            opacity: 0.95,
            zIndex: 3,
          }}
        />
      ) : null}
    </div>
  );
}

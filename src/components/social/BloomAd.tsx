// One rendered ad from the Legal "bloom" variation.
//
// The anatomy is taken straight from the Canva master:
//   · a plain near-white ground, nothing printed on it
//   · a soft colour bloom leaning out of the picture's turned end
//   · the picture as a rectangle with ONE end turned right over and the other
//     corners left almost square, its own focus point held in frame
//   · a fine accent keyline — the same shape again, offset diagonally, running
//     out under the copy
//   · the headline beside (wide trims) or under (tall trims) the picture, with
//     the turning word italic in the bloom's colour
//   · the Legal lockup in one corner — the division is never typed out
//
// Every measure is derived from the frame's short edge, so a banner and a story
// hold the same proportions.

import { getDivisionLogos } from "@/lib/division-logos";
import {
  bloomColour,
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
  const pictureFlex = mode === "stacked" ? undefined : mode === "strip" ? 0.44 : 0.48;
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
  const boxW = (w - margin * 2) * (mode === "stacked" ? 0.84 : (pictureFlex ?? 0.48) * 0.88);
  const boxH = (h - margin * 2) * (mode === "stacked" ? 0.62 : mode === "strip" ? 0.88 : 0.7);
  const radiusPx = Math.min(
    Math.min(boxW, boxH) * 0.5,
    Math.max(boxW, boxH) * 0.3,
  );
  const radius = bloomShapeRadius(cut, radiusPx * 2);
  const lean = bloomLean(cut);
  // The keyline runs the other way from the bloom, out under the copy.
  const keyOff = short * 0.055;
  const keyX = copySide === "left" ? -keyOff : keyOff;

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
      {/* the accent keyline — the same shape, offset out under the copy */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          width: mode === "stacked" ? "84%" : "88%",
          height: mode === "stacked" ? "100%" : mode === "strip" ? "88%" : "70%",
          transform: `translate(${keyX}px, ${keyOff * 0.62}px)`,
          border: `1px solid ${C.type}66`,
          borderRadius: radius,
        }}
      />
      {/* the picture, cut to its turned shape */}
      <div
        style={{
          position: "relative",
          width: mode === "stacked" ? "84%" : "88%",
          height: mode === "stacked" ? "100%" : mode === "strip" ? "88%" : "70%",
          borderRadius: radius,
          overflow: "hidden",
          boxShadow: `0 ${short * 0.018}px ${short * 0.055}px ${P.ink}1F, 0 0 ${short * 0.05}px ${C.glow}4D`,
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
          lineHeight: headPx > short * 0.12 ? 0.98 : 1.04,
          letterSpacing: "-0.015em",
          maxWidth: "15em",
          textWrap: "balance",
        }}
      >
        {scene.lead}{" "}
        <span
          style={{
            fontStyle: "italic",
            color: C.type,
            fontSize: "1.24em",
            letterSpacing: "-0.02em",
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
            ...(copySide === "left"
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

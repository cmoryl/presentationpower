// One rendered ad from the Legal "bloom" variation.
//
// Anatomy, at every trim:
//   · near-white dotted ground
//   · a soft colour bloom, offset behind the picture
//   · the picture cut into an aperture, its own focus point held in frame
//   · a fine keyline bracket that ties picture and copy together
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
  bloomOptical,
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

function apertureRadius(aperture: BloomAperture, side: BloomSide, px: number): string {
  const big = `${px * 0.9}px`;
  const mid = `${px * 0.28}px`;
  const small = `${px * 0.09}px`;
  switch (aperture) {
    case "arch":
      return side === "left" ? `${small} ${big} ${big} ${small}` : `${big} ${small} ${small} ${big}`;
    case "lozenge":
      return big;
    case "soft":
      return small;
    case "rounded":
    default:
      return mid;
  }
}

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
  const baseHead = mode === "strip" ? short * 0.155 : mode === "stacked" ? short * 0.105 : short * 0.098;
  const headPx = baseHead * optical;
  const supportPx = Math.max(9, headPx * 0.2);
  const margin = short * (mode === "strip" ? 0.09 : 0.075);

  const pictureFlex = mode === "stacked" ? undefined : mode === "strip" ? 0.46 : 0.52;

  const picture = (
    <div
      style={{
        position: "relative",
        flex: pictureFlex === undefined ? undefined : `0 0 ${pictureFlex * 100}%`,
        width: mode === "stacked" ? "100%" : undefined,
        height: mode === "stacked" ? `${h * 0.46}px` : "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* the bloom — offset out past the picture on the open side */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: `-${short * 0.1}px`,
          transform:
            mode === "stacked"
              ? `translate(${copySide === "left" ? "6%" : "-6%"}, -6%)`
              : `translate(${copySide === "left" ? "9%" : "-9%"}, -4%)`,
          background: `radial-gradient(circle at 50% 45%, ${C.glow}F2 0%, ${C.glow}B8 26%, ${C.glow}59 48%, ${C.glow}1F 66%, ${C.glow}00 78%)`,
          filter: `blur(${short * 0.035}px)`,
        }}
      />
      {/* the picture, cut to its aperture */}
      <div
        style={{
          position: "relative",
          width: mode === "stacked" ? "84%" : "88%",
          height: mode === "stacked" ? "100%" : "72%",
          borderRadius: apertureRadius(cut, copySide, short),
          overflow: "hidden",
          border: `${Math.max(1, short * 0.0035)}px solid ${C.glow}CC`,
          boxShadow: `0 ${short * 0.02}px ${short * 0.06}px ${P.ink}1A`,
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
        flex: pictureFlex === undefined ? undefined : "1 1 auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: mode === "stacked" ? "flex-start" : copySide === "left" ? "flex-start" : "flex-start",
        gap: `${short * 0.028}px`,
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
      {/* one drawn-feeling rule, tinted to the bloom */}
      <div
        aria-hidden
        style={{
          width: `${short * 0.16}px`,
          height: `${Math.max(1.5, short * 0.006)}px`,
          borderRadius: 999,
          background: `linear-gradient(to right, ${C.type} 0%, ${C.glow} 62%, ${C.glow}00 100%)`,
        }}
      />
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

  const bracketSide = copySide === "left" ? { left: margin * 0.4 } : { right: margin * 0.4 };

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
      {/* dotted ground */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(${P.ink}12 ${Math.max(0.6, short * 0.0016)}px, transparent ${Math.max(0.6, short * 0.0016)}px)`,
          backgroundSize: `${short * 0.028}px ${short * 0.028}px`,
        }}
      />
      {/* keyline bracket */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: margin * 0.45,
          top: margin * 0.45,
          ...bracketSide,
          width: `${w - margin * 0.8}px`,
          borderLeft: copySide === "left" ? `1px solid ${C.glow}66` : undefined,
          borderRight: copySide === "right" ? `1px solid ${C.glow}66` : undefined,
          borderBottom: `1px solid ${C.glow}66`,
          borderTop: `1px solid ${C.glow}33`,
          borderRadius: `${short * 0.02}px`,
        }}
      />

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
            height: `${Math.max(14, short * 0.05)}px`,
            width: "auto",
            opacity: 0.95,
            zIndex: 3,
          }}
        />
      ) : null}
    </div>
  );
}

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
//   · the Legal lockup, black single line, always bottom left
//
// The picture frame and the copy block are placed from a layout (fractions of
// the trim), so the board can move and resize them per ad and per size. With no
// layout passed the composed automatic layout is used.

import tpLegalBlackRaw from "@/assets/legal-bloom/tp-legal-black.svg?raw";
import {
  bloomColour,
  bloomLean,
  bloomShapeRadius,
  LEGAL_BLOOM_PALETTE as P,
  type BloomAperture,
  type BloomScene,
  type BloomSide,
} from "@/lib/social-legal-bloom";
import { bloomAutoLayout, type BloomAdLayout } from "@/lib/social-legal-bloom-layout";

// The single-line Legal lockup, converted to solid black, inlined so the
// downloadable renders carry it without a second network fetch.
const tpLegalBlack = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tpLegalBlackRaw)}`;

type Props = {
  scene: BloomScene;
  w: number;
  h: number;
  /** Overrides for the board's per-card pickers. */
  aperture?: BloomAperture;
  side?: BloomSide;
  /** A saved or in-progress layout for this ad at this size. */
  layout?: BloomAdLayout;
};

export function BloomAd({ scene, w, h, aperture, side, layout }: Props) {
  const C = bloomColour(scene);
  const cut = aperture ?? scene.aperture;
  const copySide = side ?? scene.side;

  const short = Math.min(w, h);
  const L = layout ?? bloomAutoLayout(scene, w, h, cut, copySide);

  const boxW = L.picture.w * w;
  const boxH = L.picture.h * h;
  const radius = bloomShapeRadius(cut, boxW, boxH);
  const lean = bloomLean(cut);
  // The keyline in the master is a solid accent stroke sitting on the frame
  // itself — measured at 9px on a 1920 x 1080 page.
  const strokePx = Math.max(1.5, short * 0.008);
  const headPx = L.headPx * short;
  const supportPx = L.supportPx * short;

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
      {/* the picture, cut to the master frame: two diagonal corners turned, two square */}
      <div
        style={{
          position: "absolute",
          left: `${L.picture.x * w}px`,
          top: `${L.picture.y * h}px`,
          width: `${boxW}px`,
          height: `${boxH}px`,
          zIndex: 1,
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
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
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

      {/* the copy — beside, under, or straight over the picture */}
      <div
        style={{
          position: "absolute",
          left: `${L.copy.x * w}px`,
          top: `${L.copy.y * h}px`,
          width: `${L.copy.w * w}px`,
          height: `${L.copy.h * h}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          textAlign: "left",
          gap: `${short * 0.026}px`,
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
            maxWidth: "100%",
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

      {/* the division lockup — black single line, always bottom left */}
      <img
        src={tpLegalBlack}
        alt=""
        aria-hidden
        style={{
          position: "absolute",
          left: `${L.lockup.x * w}px`,
          bottom: `${L.lockup.y * h}px`,
          height: `${L.lockup.h * short}px`,
          width: "auto",
          opacity: 0.95,
          zIndex: 3,
        }}
      />
    </div>
  );
}

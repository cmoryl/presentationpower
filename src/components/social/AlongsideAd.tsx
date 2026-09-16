// One rendered ad from the "You're not on it alone." Legal set.
//
// The photograph is the ad. Copy never sits on picture detail and hopes for the
// best: every template either owns a solid area (band, split, plate) or lays a
// deep directional curtain of the ground colour over the frame's clear side.
//
// The frame scales with its container (container-query units), so the same
// component proofs at 1200×628, 1080×1080 and 1080×1350.

import { getDivisionLogos } from "@/lib/division-logos";
import {
  LEGAL_ALONGSIDE_CONCEPT,
  LEGAL_ALONGSIDE_PALETTE as P,
  type AlongsideClear,
  type AlongsideScene,
  type AlongsideTemplateId,
} from "@/lib/social-legal-alongside";

type Props = {
  scene: AlongsideScene;
  template: AlongsideTemplateId;
  w: number;
  h: number;
};

/** A deep gradient of the ground colour holding one edge of the frame. */
function curtain(clear: AlongsideClear, strength = 0.94): string {
  const to =
    clear === "left"
      ? "to right"
      : clear === "right"
        ? "to left"
        : clear === "top"
          ? "to bottom"
          : "to top";
  return `linear-gradient(${to}, ${P.ground}${Math.round(strength * 255)
    .toString(16)
    .padStart(2, "0")} 0%, ${P.ground}D9 34%, ${P.ground}59 62%, ${P.ground}00 88%)`;
}

export function AlongsideAd({ scene, template, w, h }: Props) {
  const logos = getDivisionLogos("bm-tp-legal");
  const lockup = logos?.white ?? logos?.color;
  const square = Math.abs(w / h - 1) < 0.2 || h > w;
  const focus = square ? scene.focusSquare : scene.focus;
  const clear = scene.clear;

  // Everything is sized in cqw so one component covers every trim.
  const u = (n: number) => `${n}cqw`;

  const photo = (
    <img
      src={scene.src}
      alt={`${scene.pair} — ${scene.theme}`}
      loading="lazy"
      className="absolute inset-0 size-full object-cover"
      style={{ objectPosition: focus, filter: "contrast(1.06) saturate(1.02)" }}
    />
  );

  const eyebrow = (
    <div
      style={{
        fontSize: u(1.5),
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontWeight: 600,
        opacity: 0.82,
      }}
    >
      {LEGAL_ALONGSIDE_CONCEPT.division}
    </div>
  );

  const footer = (color: string) => (
    <div
      className="flex items-end justify-between gap-4"
      style={{ color, fontSize: u(1.7) }}
    >
      <span
        style={{
          borderBottom: `${u(0.22)} solid ${P.accent}`,
          paddingBottom: u(0.5),
          fontWeight: 600,
        }}
      >
        {LEGAL_ALONGSIDE_CONCEPT.cta}
      </span>
      {lockup ? (
        <img
          src={lockup}
          alt="TransPerfect Legal"
          style={{ height: u(3.2), width: "auto", objectFit: "contain" }}
        />
      ) : null}
    </div>
  );

  const headline = (size: number, caps = false) => (
    <div
      style={{
        fontSize: u(size),
        lineHeight: 1.04,
        fontWeight: 600,
        letterSpacing: caps ? "0.01em" : "-0.02em",
        textTransform: caps ? "uppercase" : "none",
        textWrap: "balance",
      }}
    >
      {scene.headline}
    </div>
  );

  const support = (
    <div style={{ fontSize: u(1.85), lineHeight: 1.35, opacity: 0.85 }}>
      {LEGAL_ALONGSIDE_CONCEPT.support}
    </div>
  );

  let body: React.ReactNode = null;

  if (template === "editorial") {
    const onLeft = clear !== "right";
    body = (
      <>
        {photo}
        <div
          className="absolute inset-0"
          style={{ background: curtain(onLeft ? "left" : "right") }}
        />
        <div
          className="absolute inset-0 flex flex-col justify-between"
          style={{
            padding: u(5),
            color: P.ink,
            alignItems: onLeft ? "flex-start" : "flex-end",
            textAlign: onLeft ? "left" : "right",
          }}
        >
          {eyebrow}
          <div style={{ maxWidth: "52%", display: "grid", gap: u(1.6) }}>
            {headline(square ? 5.6 : 4.6)}
            {support}
          </div>
          <div style={{ width: "100%" }}>{footer(P.ink)}</div>
        </div>
      </>
    );
  } else if (template === "band") {
    body = (
      <>
        <div className="absolute inset-x-0 top-0" style={{ bottom: "34%" }}>
          {photo}
        </div>
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col justify-center"
          style={{ height: "34%", background: P.ground, color: P.ink, padding: u(4), gap: u(1.4) }}
        >
          {eyebrow}
          {headline(square ? 4.6 : 3.9)}
          {footer(P.ink)}
        </div>
      </>
    );
  } else if (template === "poster") {
    body = (
      <>
        {photo}
        <div className="absolute inset-0" style={{ background: curtain("top", 0.92) }} />
        <div
          className="absolute inset-0 flex flex-col justify-between"
          style={{ padding: u(5), color: P.ink }}
        >
          <div style={{ display: "grid", gap: u(1.8) }}>
            {eyebrow}
            {headline(square ? 5.4 : 4.4, true)}
            <div style={{ height: 1, background: `${P.ink}59` }} />
          </div>
          <div style={{ display: "grid", gap: u(1.2) }}>
            {support}
            {footer(P.ink)}
          </div>
        </div>
      </>
    );
  } else if (template === "plate") {
    const right = clear === "right";
    body = (
      <>
        {photo}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to top, ${P.ground}73, ${P.ground}00 55%)` }}
        />
        <div
          className="absolute"
          style={{
            bottom: u(4.5),
            left: right ? "auto" : u(4.5),
            right: right ? u(4.5) : "auto",
            width: square ? "72%" : "48%",
            background: P.ground,
            color: P.ink,
            padding: u(3.4),
            display: "grid",
            gap: u(1.4),
            borderTop: `${u(0.4)} solid ${P.accent}`,
          }}
        >
          {eyebrow}
          {headline(square ? 4.4 : 3.6)}
          {support}
          {footer(P.ink)}
        </div>
      </>
    );
  } else if (template === "split") {
    const panelLeft = clear !== "right";
    body = (
      <div className="absolute inset-0 flex" style={{ flexDirection: panelLeft ? "row" : "row-reverse" }}>
        <div
          className="relative flex flex-col justify-between"
          style={{
            width: square ? "50%" : "44%",
            background: P.ground,
            color: P.ink,
            padding: u(4),
          }}
        >
          {eyebrow}
          <div style={{ display: "grid", gap: u(1.4) }}>
            {headline(square ? 5 : 4)}
            {support}
          </div>
          {footer(P.ink)}
        </div>
        <div className="relative flex-1">{photo}</div>
      </div>
    );
  } else {
    body = (
      <>
        {photo}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(120% 90% at 50% 50%, ${P.ground}E6 0%, ${P.ground}B3 45%, ${P.ground}59 100%)`,
          }}
        />
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center"
          style={{ padding: u(6), color: P.ink, gap: u(2) }}
        >
          {eyebrow}
          {headline(square ? 5.8 : 4.8)}
          {support}
          <div style={{ width: "100%", marginTop: u(2) }}>{footer(P.ink)}</div>
        </div>
      </>
    );
  }

  return (
    <div
      className="relative overflow-hidden"
      style={{
        aspectRatio: `${w} / ${h}`,
        containerType: "inline-size",
        background: P.ground,
        fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {body}
    </div>
  );
}

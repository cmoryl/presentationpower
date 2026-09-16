// One rendered ad from the "You're not on it alone." Legal set.
//
// The photograph is the ad. Copy never sits on picture detail and hopes for the
// best: every template either owns a solid field (margin, plate, ledger, band)
// or lays a deep directional curtain of the ground colour over the frame's
// clear side.
//
// Composition grammar shared by every template:
//   · one outer margin token, so nothing ever crowds the trim
//   · one type scale, so headlines relate across the set
//   · a measured headline (max ~15em) so lines break like typeset copy
//   · hairlines and accent rules instead of boxes
//   · the master number set as a small numeral against the division line
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

const hex = (alpha: number) =>
  Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");

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
  return `linear-gradient(${to}, ${P.ground}${hex(strength)} 0%, ${P.ground}D9 34%, ${P.ground}59 62%, ${P.ground}00 88%)`;
}

export function AlongsideAd({ scene, template, w, h }: Props) {
  const logos = getDivisionLogos("bm-tp-legal");
  const lockup = logos?.white ?? logos?.color;
  const square = Math.abs(w / h - 1) < 0.2 || h > w;
  const tall = h > w * 1.1;
  const focus = square ? scene.focusSquare : scene.focus;
  const clear = scene.clear;

  // Everything is sized in cqw so one component covers every trim.
  const u = (n: number) => `${n}cqw`;

  // ---- one spacing + type scale, shared by every template ----------------
  const M = square ? 5.4 : 4.6; // outer margin
  const T = {
    eyebrow: square ? 1.5 : 1.3,
    numeral: square ? 1.5 : 1.3,
    display: square ? 5.2 : 4.3,
    displayTight: square ? 4.4 : 3.6,
    support: square ? 1.9 : 1.65,
    cta: square ? 1.75 : 1.55,
    micro: square ? 1.3 : 1.15,
    logo: square ? 3.3 : 2.9,
  };

  const photo = (extra?: React.CSSProperties) => (
    <img
      src={scene.src}
      alt={`${scene.pair} — ${scene.theme}`}
      loading="lazy"
      className="absolute inset-0 size-full object-cover"
      style={{ objectPosition: focus, filter: "contrast(1.06) saturate(1.02)", ...extra }}
    />
  );

  /** Division line with the master number set against it on a hairline. */
  const masthead = (align: "left" | "right" = "left", ink = P.ink) => (
    <div
      className="flex w-full items-baseline gap-3"
      style={{ color: ink, flexDirection: align === "right" ? "row-reverse" : "row" }}
    >
      <span
        style={{
          fontSize: u(T.eyebrow),
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {LEGAL_ALONGSIDE_CONCEPT.division}
      </span>
      <span aria-hidden className="flex-1" style={{ height: 1, background: `${ink}3D` }} />
      <span
        style={{
          fontSize: u(T.numeral),
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.14em",
          opacity: 0.7,
        }}
      >
        {scene.no}
      </span>
    </div>
  );

  const headline = (size: number, opts?: { caps?: boolean; ink?: string; measure?: number }) => (
    <div
      style={{
        fontSize: u(size),
        lineHeight: opts?.caps ? 1.02 : 1.06,
        fontWeight: 600,
        color: opts?.ink ?? P.ink,
        letterSpacing: opts?.caps ? "0.005em" : "-0.022em",
        textTransform: opts?.caps ? "uppercase" : "none",
        textWrap: "balance",
        maxWidth: `${opts?.measure ?? 15}em`,
      }}
    >
      {scene.headline}
    </div>
  );

  const support = (ink = P.ink) => (
    <div
      style={{
        fontSize: u(T.support),
        lineHeight: 1.42,
        color: ink,
        opacity: 0.82,
        maxWidth: "26em",
      }}
    >
      {LEGAL_ALONGSIDE_CONCEPT.support}
    </div>
  );

  const cta = (ink = P.ink) => (
    <span
      style={{
        fontSize: u(T.cta),
        fontWeight: 600,
        color: ink,
        borderBottom: `${u(0.22)} solid ${P.accent}`,
        paddingBottom: u(0.55),
        whiteSpace: "nowrap",
      }}
    >
      {LEGAL_ALONGSIDE_CONCEPT.cta}
    </span>
  );

  const mark = (h_ = T.logo) =>
    lockup ? (
      <img
        src={lockup}
        alt="TransPerfect Legal"
        style={{ height: u(h_), width: "auto", objectFit: "contain" }}
      />
    ) : null;

  const footer = (ink = P.ink) => (
    <div className="flex w-full items-end justify-between" style={{ gap: u(3) }}>
      {cta(ink)}
      {mark()}
    </div>
  );

  const accentRule = (widthPct = 18) => (
    <span aria-hidden style={{ display: "block", width: `${widthPct}%`, height: u(0.34), background: P.accent }} />
  );

  let body: React.ReactNode = null;

  if (template === "editorial") {
    // Art to the far edge; copy in a measured column on the clear side.
    const onLeft = clear !== "right";
    body = (
      <>
        {photo()}
        <div className="absolute inset-0" style={{ background: curtain(onLeft ? "left" : "right") }} />
        <div
          className="absolute inset-0 grid"
          style={{
            padding: u(M),
            gridTemplateColumns: onLeft ? "minmax(0,46%) 1fr" : "1fr minmax(0,46%)",
          }}
        >
          <div
            className="flex flex-col justify-between"
            style={{ gridColumn: onLeft ? 1 : 2, textAlign: "left" }}
          >
            {masthead()}
            <div style={{ display: "grid", gap: u(1.7), paddingBlock: u(2) }}>
              {accentRule(26)}
              {headline(tall ? T.display : T.displayTight, { measure: 13 })}
              {support()}
            </div>
            {footer()}
          </div>
        </div>
      </>
    );
  } else if (template === "inset") {
    // The photograph floats inside a deep ground margin. Nothing on the picture.
    const side = M * 1.15;
    body = (
      <div className="absolute inset-0" style={{ background: P.ground }}>
        <div
          className="absolute overflow-hidden"
          style={{
            top: u(side * 2.1),
            left: u(side),
            right: u(side),
            bottom: u(square ? side * 5.4 : side * 4.6),
          }}
        >
          {photo()}
        </div>
        <div className="absolute" style={{ top: u(side), left: u(side), right: u(side) }}>
          {masthead()}
        </div>
        <div
          className="absolute flex items-end justify-between"
          style={{ left: u(side), right: u(side), bottom: u(side), gap: u(3) }}
        >
          <div style={{ display: "grid", gap: u(1.2) }}>
            {headline(square ? 4.2 : 3.4, { measure: 16 })}
            <span style={{ fontSize: u(T.micro), letterSpacing: "0.16em", textTransform: "uppercase", color: P.ink, opacity: 0.55 }}>
              {scene.theme}
            </span>
          </div>
          <div style={{ display: "grid", justifyItems: "end", gap: u(1.3) }}>
            {cta()}
            {mark()}
          </div>
        </div>
      </div>
    );
  } else if (template === "spine") {
    // Narrow ground spine with rotated division line; headline on a soft wedge.
    const spineLeft = clear !== "right";
    const spine = square ? 9 : 7.5;
    body = (
      <>
        <div
          className="absolute inset-y-0 overflow-hidden"
          style={{ left: spineLeft ? u(spine) : 0, right: spineLeft ? 0 : u(spine) }}
        >
          {photo()}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(${spineLeft ? "to top right" : "to top left"}, ${P.ground}F2 0%, ${P.ground}B8 30%, ${P.ground}33 62%, ${P.ground}00 82%)`,
            }}
          />
        </div>
        <div
          className="absolute inset-y-0 flex items-center justify-center"
          style={{
            width: u(spine),
            left: spineLeft ? 0 : "auto",
            right: spineLeft ? "auto" : 0,
            background: P.ground,
            borderRight: spineLeft ? `${u(0.28)} solid ${P.accent}` : undefined,
            borderLeft: spineLeft ? undefined : `${u(0.28)} solid ${P.accent}`,
          }}
        >
          <div
            style={{
              writingMode: "vertical-rl",
              transform: spineLeft ? "rotate(180deg)" : "none",
              color: P.ink,
              fontSize: u(T.eyebrow),
              letterSpacing: "0.34em",
              textTransform: "uppercase",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: u(2.4),
            }}
          >
            <span>{LEGAL_ALONGSIDE_CONCEPT.division}</span>
            <span aria-hidden style={{ width: 1, height: u(6), background: `${P.ink}47` }} />
            <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.7 }}>{scene.no}</span>
          </div>
        </div>
        <div
          className="absolute flex flex-col justify-end"
          style={{
            inset: 0,
            paddingLeft: u(spineLeft ? spine + M : M),
            paddingRight: u(spineLeft ? M : spine + M),
            paddingBottom: u(M),
            paddingTop: u(M),
            gap: u(1.7),
            alignItems: spineLeft ? "flex-start" : "flex-end",
            textAlign: spineLeft ? "left" : "right",
          }}
        >
          {headline(square ? 5 : 4.1, { measure: 13 })}
          {support()}
          <div style={{ height: u(0.6) }} />
          {footer()}
        </div>
      </>
    );
  } else if (template === "ledger") {
    // Art above; a three-column ledger below, divided by hairlines.
    const ledger = square ? 34 : 38;
    body = (
      <>
        <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ bottom: `${ledger}%` }}>
          {photo()}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{ height: "34%", background: `linear-gradient(to top, ${P.ground}80, ${P.ground}00)` }}
          />
        </div>
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col"
          style={{
            height: `${ledger}%`,
            background: P.ground,
            padding: u(M),
            gap: u(1.6),
            borderTop: `${u(0.3)} solid ${P.accent}`,
          }}
        >
          {masthead()}
          <div
            className="grid flex-1"
            style={{
              gridTemplateColumns: tall ? "1fr" : "minmax(0,22%) minmax(0,52%) 1fr",
              gap: u(2.6),
              alignItems: "start",
            }}
          >
            <div style={{ color: P.ink, fontSize: u(T.micro), letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.6 }}>
              {scene.theme}
            </div>
            <div style={{ display: "grid", gap: u(1.1) }}>
              {headline(square ? 3.9 : 3.2, { measure: 17 })}
              {support()}
            </div>
            <div
              style={{
                display: "grid",
                justifyItems: tall ? "start" : "end",
                alignContent: "space-between",
                gap: u(1.4),
                height: "100%",
              }}
            >
              {cta()}
              {mark()}
            </div>
          </div>
        </div>
      </>
    );
  } else if (template === "stack") {
    // Inset art with a ground plate stepped off the lower corner.
    const right = clear === "right";
    body = (
      <div className="absolute inset-0" style={{ background: P.ground }}>
        <div
          className="absolute overflow-hidden"
          style={{
            top: 0,
            bottom: u(square ? 16 : 12),
            left: right ? 0 : u(square ? 7 : 6),
            right: right ? u(square ? 7 : 6) : 0,
          }}
        >
          {photo()}
        </div>
        <div
          className="absolute"
          style={{
            bottom: u(M),
            left: right ? u(M) : "auto",
            right: right ? "auto" : u(M),
            width: tall ? "78%" : square ? "72%" : "56%",
            background: P.ground,
            borderTop: `${u(0.34)} solid ${P.accent}`,
            padding: u(square ? 3.4 : 2.9),
            paddingTop: u(square ? 2.6 : 2.2),
            display: "grid",
            gap: u(1.5),
            boxShadow: `0 ${u(1.4)} ${u(4)} ${P.ground}80`,
          }}
        >
          {masthead()}
          {headline(square ? 4.2 : 3.4, { measure: 15 })}
          {support()}
          {footer()}
        </div>
      </div>
    );
  } else if (template === "poster") {
    // Caps headline in a ground masthead; picture opens beneath as a window.
    body = (
      <div className="absolute inset-0" style={{ background: P.ground }}>
        <div
          className="absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: square ? "44%" : "48%", padding: u(M), gap: u(1.6) }}
        >
          {masthead()}
          {headline(square ? 5 : 4.1, { caps: true, measure: 14 })}
        </div>
        <div
          className="absolute inset-x-0 overflow-hidden"
          style={{ top: square ? "44%" : "48%", bottom: u(square ? 11 : 9) }}
        >
          {photo()}
        </div>
        <div
          className="absolute inset-x-0 bottom-0 flex items-center"
          style={{ height: u(square ? 11 : 9), paddingInline: u(M) }}
        >
          <div className="flex w-full items-center justify-between" style={{ gap: u(3) }}>
            {support()}
            <div className="flex items-center" style={{ gap: u(2.6) }}>
              {cta()}
              {mark()}
            </div>
          </div>
        </div>
      </div>
    );
  } else if (template === "window") {
    // Frame cropped to a window on wide margins; copy set beneath on a baseline.
    const side = M * 1.3;
    body = (
      <div className="absolute inset-0" style={{ background: P.ground }}>
        <div className="absolute" style={{ top: u(side), left: u(side), right: u(side) }}>
          {masthead()}
        </div>
        <div
          className="absolute overflow-hidden"
          style={{
            top: u(side * 2.4),
            left: u(side),
            right: u(side),
            height: tall ? "44%" : square ? "46%" : "40%",
          }}
        >
          {photo()}
        </div>
        <div
          className="absolute flex flex-col"
          style={{
            left: u(side),
            right: u(side),
            top: `calc(${u(side * 2.4)} + ${tall ? "44%" : square ? "46%" : "40%"} + ${u(2.4)})`,
            bottom: u(side),
            gap: u(1.4),
          }}
        >
          {accentRule(14)}
          {headline(square ? 4.2 : 3.3, { measure: 18 })}
          <div className="mt-auto flex items-end justify-between" style={{ gap: u(3) }}>
            <span style={{ fontSize: u(T.micro), letterSpacing: "0.16em", textTransform: "uppercase", color: P.ink, opacity: 0.55 }}>
              {scene.theme}
            </span>
            <div className="flex items-center" style={{ gap: u(2.4) }}>
              {cta()}
              {mark()}
            </div>
          </div>
        </div>
      </div>
    );
  } else if (template === "field") {
    // Ground field with an accent bar; art stepped away from it.
    const fieldLeft = clear !== "right";
    const fieldW = tall ? 100 : square ? 52 : 44;
    body = (
      <div className="absolute inset-0" style={{ background: P.ground }}>
        <div
          className="absolute overflow-hidden"
          style={
            tall
              ? { inset: 0, bottom: "46%" }
              : {
                  top: u(M * 0.9),
                  bottom: u(M * 0.9),
                  left: fieldLeft ? `${fieldW}%` : 0,
                  right: fieldLeft ? 0 : `${fieldW}%`,
                }
          }
        >
          {photo()}
        </div>
        <div
          className="absolute flex flex-col justify-between"
          style={
            tall
              ? { inset: 0, top: "54%", padding: u(M) }
              : {
                  top: 0,
                  bottom: 0,
                  left: fieldLeft ? 0 : "auto",
                  right: fieldLeft ? "auto" : 0,
                  width: `${fieldW}%`,
                  padding: u(M),
                }
          }
        >
          {masthead()}
          <div style={{ display: "grid", gap: u(1.6) }}>
            {accentRule(30)}
            {headline(square ? 4.6 : 3.8, { measure: 12 })}
            {support()}
          </div>
          {footer()}
        </div>
      </div>
    );
  } else {
    // Centre axis between two accent rules over a deep scrim.
    body = (
      <>
        {photo()}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(118% 92% at 50% 48%, ${P.ground}E6 0%, ${P.ground}AD 46%, ${P.ground}5C 100%)`,
          }}
        />
        <div
          className="absolute inset-0 flex flex-col items-center justify-between"
          style={{ padding: u(M * 1.2) }}
        >
          {masthead()}
          <div
            className="flex flex-col items-center text-center"
            style={{ gap: u(2), maxWidth: "82%" }}
          >
            <span aria-hidden style={{ width: u(6), height: u(0.3), background: P.accent }} />
            {headline(square ? 5.2 : 4.3, { measure: 14 })}
            {support()}
            <span aria-hidden style={{ width: u(6), height: 1, background: `${P.ink}3D` }} />
          </div>
          {footer()}
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

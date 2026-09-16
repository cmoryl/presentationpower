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
// Horizontal measures are container-query units (cqw) and vertical measures are
// percentages of the frame, so a 1200×628 banner and a 1080×1350 story hold the
// same proportions instead of the banner running out of height.

import { getDivisionLogos } from "@/lib/division-logos";
import {
  alongsideHeadlineParts,
  LEGAL_ALONGSIDE_CONCEPT,
  LEGAL_ALONGSIDE_PALETTE as P,
  LEGAL_ALONGSIDE_TYPE,
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
  const TY = LEGAL_ALONGSIDE_TYPE[template];
  const square = Math.abs(w / h - 1) < 0.2 || h > w;
  const tall = h > w * 1.1;
  const wide = !square && !tall;
  const focus = square ? scene.focusSquare : scene.focus;
  const clear = scene.clear;

  // Everything horizontal is sized in cqw so one component covers every trim.
  const u = (n: number) => `${n}cqw`;

  // ---- one spacing + type scale, shared by every template ----------------
  const M = square ? 5.4 : 4.6; // outer margin
  const T = {
    eyebrow: square ? 1.5 : 1.3,
    numeral: square ? 1.5 : 1.3,
    display: square ? 5.2 : 4.3,
    displayTight: square ? 4.4 : 3.6,
    support: square ? 1.9 : 1.6,
    cta: square ? 1.75 : 1.5,
    micro: square ? 1.3 : 1.1,
    logo: square ? 3.3 : 2.7,
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
  const masthead = (ink = P.ink) => (
    <div className="flex w-full items-baseline gap-3" style={{ color: ink }}>
      <span
        style={{
          fontFamily: TY.eyebrow.family,
          fontSize: u(T.eyebrow),
          letterSpacing: TY.eyebrow.tracking,
          textTransform: "uppercase",
          fontWeight: TY.eyebrow.weight,
          whiteSpace: "nowrap",
        }}
      >
        {LEGAL_ALONGSIDE_CONCEPT.division}
      </span>
      <span aria-hidden className="flex-1" style={{ height: 1, background: `${ink}3D` }} />
      <span
        style={{
          fontFamily: TY.eyebrow.family,
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

  /**
   * The headline in the layout's display face, with its one emphasised phrase —
   * the turn — set in the contrasting face. Emphasis is always ink; the accent
   * appears only as a hairline under the phrase.
   */
  const headline = (size: number, opts?: { measure?: number }) => {
    const d = TY.display;
    const a = TY.action;
    const parts = alongsideHeadlineParts(scene.headline, scene.action);
    const px = size * d.scale;
    return (
      <div
        style={{
          fontFamily: d.family,
          fontSize: u(px),
          lineHeight: d.lineHeight,
          fontWeight: d.weight,
          color: P.ink,
          letterSpacing: d.tracking,
          textTransform: d.caps ? "uppercase" : "none",
          textWrap: "balance",
          maxWidth: `${opts?.measure ?? 15}em`,
        }}
      >
        {parts.before}
        {parts.action ? (
          <span
            style={{
              fontFamily: a.family,
              fontWeight: a.weight,
              fontStyle: a.italic ? "italic" : "normal",
              fontSize: a.scale ? u(px * a.scale) : undefined,
              letterSpacing: a.tracking ?? (a.italic ? "0em" : undefined),
              textTransform: a.caps ? "uppercase" : d.caps ? "uppercase" : "none",
              borderBottom: a.rule ? `${u(0.2)} solid ${P.accent}` : undefined,
              paddingBottom: a.rule ? u(0.3) : undefined,
              whiteSpace: "nowrap",
            }}
          >
            {parts.action}
          </span>
        ) : null}
        {parts.after}
      </div>
    );
  };

  const support = () => (
    <div
      style={{
        fontFamily: TY.support.family,
        fontWeight: TY.support.weight,
        fontStyle: TY.support.italic ? "italic" : "normal",
        fontSize: u(T.support),
        lineHeight: TY.support.lineHeight,
        color: P.ink,
        opacity: 0.82,
        maxWidth: "26em",
      }}
    >
      {LEGAL_ALONGSIDE_CONCEPT.support}
    </div>
  );

  const cta = () => (
    <span
      style={{
        fontFamily: TY.cta.family,
        fontSize: u(TY.cta.caps ? T.cta * 0.92 : T.cta),
        fontWeight: TY.cta.weight,
        letterSpacing: TY.cta.tracking,
        textTransform: TY.cta.caps ? "uppercase" : "none",
        color: P.ink,
        borderBottom: `${u(0.22)} solid ${P.accent}`,
        paddingBottom: u(0.55),
        whiteSpace: "nowrap",
      }}
    >
      {LEGAL_ALONGSIDE_CONCEPT.cta}
    </span>
  );

  const mark = (size = T.logo) =>
    lockup ? (
      <img
        src={lockup}
        alt="TransPerfect Legal"
        style={{ height: u(size), width: "auto", objectFit: "contain" }}
      />
    ) : null;

  const footer = () => (
    <div className="flex w-full items-end justify-between" style={{ gap: u(3) }}>
      {cta()}
      {mark()}
    </div>
  );

  const themeLabel = () => (
    <span
      style={{
        fontFamily: TY.eyebrow.family,
        fontWeight: TY.eyebrow.weight,
        fontSize: u(T.micro),
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: P.ink,
        opacity: 0.55,
        whiteSpace: "nowrap",
      }}
    >
      {scene.theme}
    </span>
  );

  const accentRule = (widthPct = 18) => (
    <span
      aria-hidden
      style={{ display: "block", width: `${widthPct}%`, height: u(0.34), background: P.accent }}
    />
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
          <div className="flex flex-col justify-between" style={{ gridColumn: onLeft ? 1 : 2 }}>
            {masthead()}
            <div style={{ display: "grid", gap: u(1.7), paddingBlock: u(1.6) }}>
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
    const side = M * 1.1;
    const imgTop = wide ? "17%" : "14%";
    const imgBottom = wide ? "33%" : square ? "27%" : "24%";
    body = (
      <div className="absolute inset-0" style={{ background: P.ground }}>
        <div
          className="absolute overflow-hidden"
          style={{ top: imgTop, bottom: imgBottom, left: u(side), right: u(side) }}
        >
          {photo()}
        </div>
        <div className="absolute" style={{ top: "6%", left: u(side), right: u(side) }}>
          {masthead()}
        </div>
        <div
          className="absolute flex items-end justify-between"
          style={{ left: u(side), right: u(side), bottom: "7%", gap: u(3) }}
        >
          <div style={{ display: "grid", gap: u(1.1) }}>
            {headline(square ? 4.2 : 3.2, { measure: 16 })}
            {themeLabel()}
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
            gap: u(1.6),
            alignItems: spineLeft ? "flex-start" : "flex-end",
            textAlign: spineLeft ? "left" : "right",
          }}
        >
          {headline(square ? 5 : 4, { measure: 13 })}
          {support()}
          <div style={{ height: u(0.4) }} />
          {footer()}
        </div>
      </>
    );
  } else if (template === "ledger") {
    // Art above; a ledger below, divided by a hairline grid.
    const ledger = tall ? 32 : square ? 34 : 42;
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
            paddingInline: u(M),
            paddingBlock: u(M * 0.7),
            gap: u(1.4),
            borderTop: `${u(0.3)} solid ${P.accent}`,
          }}
        >
          {masthead()}
          <div
            className="grid flex-1"
            style={{
              gridTemplateColumns: tall ? "1fr" : "minmax(0,20%) minmax(0,1fr) auto",
              gap: u(2.4),
              alignItems: "start",
            }}
          >
            <div style={{ paddingTop: u(0.5) }}>{themeLabel()}</div>
            <div style={{ display: "grid", gap: u(1) }}>
              {headline(square ? 3.7 : 2.9, { measure: 18 })}
              {!wide ? support() : null}
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
    // Full-width art stepped up off the base, with a ground plate set into the
    // margin below it — the plate overlaps the picture edge, never floats in it.
    const right = clear === "right";
    body = (
      <div className="absolute inset-0" style={{ background: P.ground }}>
        <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ bottom: wide ? "22%" : "18%" }}>
          {photo()}
        </div>
        <div
          className="absolute"
          style={{
            bottom: "7%",
            left: right ? u(M) : "auto",
            right: right ? "auto" : u(M),
            width: tall ? "80%" : square ? "74%" : "58%",
            background: P.ground,
            borderTop: `${u(0.34)} solid ${P.accent}`,
            paddingInline: u(square ? 3.2 : 2.6),
            paddingBlock: u(square ? 2.6 : 2),
            display: "grid",
            gap: u(1.3),
            boxShadow: `0 ${u(1.2)} ${u(4)} ${P.ground}8C`,
          }}
        >
          {masthead()}
          {headline(square ? 4 : 3.1, { measure: 16 })}
          {footer()}
        </div>
      </div>
    );
  } else if (template === "poster") {
    // Caps headline in a ground masthead; picture opens beneath as a window.
    const head = wide ? "46%" : "44%";
    body = (
      <div className="absolute inset-0" style={{ background: P.ground }}>
        <div
          className="absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: head, paddingInline: u(M), paddingBlock: u(M * 0.8) }}
        >
          {masthead()}
          {headline(square ? 4.8 : 3.8, { measure: 15 })}
        </div>
        <div className="absolute inset-x-0 overflow-hidden" style={{ top: head, bottom: "16%" }}>
          {photo()}
        </div>
        <div
          className="absolute inset-x-0 bottom-0 flex items-center"
          style={{ height: "16%", paddingInline: u(M) }}
        >
          <div className="flex w-full items-center justify-between" style={{ gap: u(3) }}>
            {support()}
            <div className="flex items-center" style={{ gap: u(2.4) }}>
              {cta()}
              {mark()}
            </div>
          </div>
        </div>
      </div>
    );
  } else if (template === "window") {
    // Frame cropped to a window on wide margins; copy set beneath on a baseline.
    const side = M * 1.25;
    const imgTop = wide ? 17 : 14;
    const imgH = tall ? 46 : square ? 46 : 42;
    body = (
      <div className="absolute inset-0" style={{ background: P.ground }}>
        <div className="absolute" style={{ top: "6%", left: u(side), right: u(side) }}>
          {masthead()}
        </div>
        <div
          className="absolute overflow-hidden"
          style={{ top: `${imgTop}%`, left: u(side), right: u(side), height: `${imgH}%` }}
        >
          {photo()}
        </div>
        <div
          className="absolute flex flex-col"
          style={{
            left: u(side),
            right: u(side),
            top: `${imgTop + imgH + 5}%`,
            bottom: "7%",
            gap: u(1.3),
          }}
        >
          {accentRule(14)}
          {headline(square ? 4 : 3, { measure: 20 })}
          <div className="mt-auto flex items-end justify-between" style={{ gap: u(3) }}>
            {themeLabel()}
            <div className="flex items-center" style={{ gap: u(2.2) }}>
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
    const fieldW = tall ? 100 : square ? 52 : 46;
    body = (
      <div className="absolute inset-0" style={{ background: P.ground }}>
        <div
          className="absolute overflow-hidden"
          style={
            tall
              ? { top: 0, left: 0, right: 0, bottom: "46%" }
              : {
                  top: "6%",
                  bottom: "6%",
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
              ? { top: "54%", bottom: 0, left: 0, right: 0, padding: u(M) }
              : {
                  top: 0,
                  bottom: 0,
                  left: fieldLeft ? 0 : "auto",
                  right: fieldLeft ? "auto" : 0,
                  width: `${fieldW}%`,
                  paddingInline: u(M),
                  paddingBlock: u(M * 0.9),
                }
          }
        >
          {masthead()}
          <div style={{ display: "grid", gap: u(1.5) }}>
            {accentRule(30)}
            {headline(square ? 4.4 : 3.5, { measure: 12 })}
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
          style={{ paddingInline: u(M * 1.2), paddingBlock: u(M) }}
        >
          {masthead()}
          <div className="flex flex-col items-center text-center" style={{ gap: u(1.8), maxWidth: "84%" }}>
            <span aria-hidden style={{ width: u(6), height: u(0.3), background: P.accent }} />
            {headline(square ? 5 : 4, { measure: 14 })}
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

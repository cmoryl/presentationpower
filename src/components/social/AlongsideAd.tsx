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
  alongsideSceneType,
  LEGAL_ALONGSIDE_CONCEPT,
  LEGAL_ALONGSIDE_PALETTE as P,
  LEGAL_ALONGSIDE_TYPE,
  applyAlongsideTypeSet,
  type AlongsideClear,
  type AlongsideScene,
  type AlongsideTemplateId,
} from "@/lib/social-legal-alongside";


type Props = {
  scene: AlongsideScene;
  template: AlongsideTemplateId;
  w: number;
  h: number;
  /** Google-font pairing applied over the layout's house treatment. */
  typeSet?: string;
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

export function AlongsideAd({ scene, template, w, h, typeSet = "house" }: Props) {
  const logos = getDivisionLogos("bm-tp-legal");
  const lockup = logos?.white ?? logos?.color;
  // Typographic integration: with the set left on "per photograph", each ad is
  // typeset in the voice chosen for its own picture. A named treatment from the
  // board overrides it for the whole set.
  const ST = alongsideSceneType(scene.id);
  const TY = applyAlongsideTypeSet(
    LEGAL_ALONGSIDE_TYPE[template],
    typeSet === "house" ? ST.voice : typeSet,
  );
  const aspect = w / h;

  const square = Math.abs(aspect - 1) < 0.2 || h > w;
  const tall = h > w * 1.1;
  const wide = !square && !tall;
  /** Ultra-wide strips (email / LinkedIn banners): height, not width, is scarce. */
  const banner = aspect >= 2.1;
  /** 9:16 and taller: the frame is so long that the base scale reads small. */
  const veryTall = h >= w * 1.6;
  /** One multiplier keeps the shared scale legible in every sizing format. */
  const k = banner ? 0.6 : veryTall ? 1.22 : 1;
  const focus = square ? scene.focusSquare : scene.focus;
  const clear = scene.clear;

  // Everything horizontal is sized in cqw so one component covers every trim.
  const u = (n: number) => `${n}cqw`;

  // ---- one spacing + type scale, shared by every template ----------------
  const M = (square ? 5.4 : 4.6) * (banner ? 0.72 : 1); // outer margin
  const T = {
    eyebrow: (square ? 1.5 : 1.3) * k,
    numeral: (square ? 1.5 : 1.3) * k,
    display: (square ? 5.2 : 4.3) * k,
    displayTight: (square ? 4.4 : 3.6) * k,
    support: (square ? 1.9 : 1.6) * k,
    cta: (square ? 1.75 : 1.5) * k,
    micro: (square ? 1.3 : 1.1) * k,
    logo: (square ? 3.3 : 2.7) * k,
  };


  // ---- crop engine --------------------------------------------------------
  // Every scene carries its own subject point (the two figures). A template
  // never crops blind: it declares what SHAPE of frame the picture is going
  // into, and the point is re-placed for that shape.
  //
  //   full    the picture is the whole frame — the subject is pushed away from
  //           the copy field so type never lands on it
  //   panel   an inset panel roughly the frame's own proportion — the scene's
  //           point is authoritative, used verbatim
  //   column  a tall narrow crop (arch, spine, field column) — subject held on
  //           its own x, lifted slightly so heads stay in
  //   band    a shallow strip (knockout base, poster window) — lifted harder,
  //           because a 32% band centred on 45% loses the figures entirely
  const clampPct = (n: number) => Math.max(0, Math.min(100, n));
  const subject = (() => {
    const [a, b] = focus.trim().split(/\s+/);
    const x = Number.parseFloat(a ?? "");
    const y = Number.parseFloat(b ?? "");
    return { x: Number.isFinite(x) ? x : 50, y: Number.isFinite(y) ? y : 50 };
  })();

  type PhotoFrame = "full" | "panel" | "column" | "band";

  const framePos = (kind: PhotoFrame): string => {
    const s = subject;
    if (kind === "panel") return `${s.x}% ${s.y}%`;
    if (kind === "column") return `${clampPct(s.x)}% ${clampPct(s.y - 5)}%`;
    if (kind === "band") return `${clampPct(s.x)}% ${clampPct(s.y - 10)}%`;
    const push = wide ? 13 : 9;
    const x =
      clear === "left" ? clampPct(s.x + push) : clear === "right" ? clampPct(s.x - push) : s.x;
    const y =
      clear === "top"
        ? clampPct(s.y + push * 0.5)
        : clear === "bottom"
          ? clampPct(s.y - push * 0.5)
          : s.y;
    return `${x}% ${y}%`;
  };

  /** A crop of the same frame offset from the subject, for pane/proof rows. */
  const offsetPos = (dx: number, dy = 0) =>
    `${clampPct(subject.x + dx)}% ${clampPct(subject.y + dy)}%`;

  const photo = (extra?: React.CSSProperties, kind: PhotoFrame = "full") => (
    <img
      src={scene.src}
      alt={`${scene.pair} — ${scene.theme}`}
      loading="lazy"
      className="absolute inset-0 size-full object-cover"
      style={{ objectPosition: framePos(kind), filter: "contrast(1.06) saturate(1.02)", ...extra }}
    />
  );

  /** Frame number on a hairline. The lockup names the division — never typed. */
  // The lockup owns one corner of every ad (top-right, or bottom-left when the
  // copy column sits on the right), so the masthead keeps the frame number on
  // the LEFT and never competes for that corner.
  const masthead = (ink: string = P.ink) => (
    <div
      className="flex w-full items-center gap-3"
      style={{ color: ink, paddingRight: clear === "right" ? undefined : u(26) }}
    >
      <span
        style={{
          fontFamily: TY.eyebrow.family,
          fontSize: u(T.numeral),
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.14em",
          fontWeight: TY.eyebrow.weight,
          opacity: 0.72,
        }}
      >
        {scene.no}
      </span>
      <span aria-hidden className="flex-1" style={{ height: 1, background: `${ink}3D` }} />
    </div>
  );


  /**
   * The headline in the layout's display face, with its one emphasised phrase —
   * the turn — set in the contrasting face. Emphasis is always ink; the accent
   * appears only as a hairline under the phrase.
   */
  const headline = (size: number, opts?: { measure?: number; color?: string }) => {
    const d = TY.display;
    const a = TY.action;
    const parts = alongsideHeadlineParts(scene.headline, scene.action);
    // ---- optical sizing -----------------------------------------------------
    // A display line is set to the LENGTH of the words in it, the way a
    // typographer would: a six-word line earns more size than a fourteen-word
    // one in the same slot. 46 characters is the reference line these layouts
    // were drawn against.
    const chars = scene.headline.trim().length;
    const optical =
      Math.max(0.74, Math.min(1.24, (46 / Math.max(chars, 12)) ** 0.42)) * ST.weight;
    const px = size * d.scale * optical;

    // Leading and tracking compensate for size: large type needs less of both.
    const baseLead = d.lineHeight ?? 1;
    const lead = Math.max(0.86, baseLead - (px > 4.6 ? 0.06 : px < 3 ? -0.04 : 0));
    // Measure follows size — a bigger face needs fewer ems to hold a good
    // 34–52 character line.
    const measure = opts?.measure ?? Math.max(11, Math.min(18, 15 * (1 / optical) ** 0.5));
    // No widows: the last two words are bound together so a single word can
    // never be left stranded on its own line.
    const noWidow = (s: string) => {
      // Trailing word space is kept: this fragment can be followed by the turn
      // phrase in another face, and losing the space runs the words together.
      const trail = /\s$/.test(s) ? "\u00A0" : "";
      const words = s.trimEnd().split(" ");
      if (words.length < 3) return s;
      const tail = words.slice(-2).join("\u00A0");
      return `${words.slice(0, -2).join(" ")} ${tail}${trail}`;
    };

    // A face switch only reads as emphasis on a SHORT phrase. When the turn is
    // most of the headline, swapping faces mid-line just looks like two
    // headlines colliding — so the phrase stays in the display face and is
    // emphasised by weight/italic instead.
    const longTurn = parts.action.length > scene.headline.length * 0.45;
    const a2 = longTurn
      ? {
          ...a,
          family: d.family,
          weight: Math.min(900, d.weight + (d.weight >= 700 ? 0 : 200)),
          italic: false,
          caps: d.caps,
          tracking: d.tracking,
          scale: 1,
        }
      : a;
    // Optical tracking: display sizes tighten, small sizes stay open. Only
    // applied when the treatment expresses tracking in em (so caps tracking
    // authored per layout is respected, not overwritten).
    const trackEm = (() => {
      const raw = typeof d.tracking === "string" ? d.tracking.trim() : "";
      const m = /^(-?[\d.]+)em$/.exec(raw);
      if (!m) return d.tracking;
      const base = Number.parseFloat(m[1]!);
      const comp = px > 4.6 ? -0.012 : px < 2.8 ? 0.008 : 0;
      return `${(base + comp).toFixed(4)}em`;
    })();
    // ---- word-level call-outs ----------------------------------------------
    // Besides the turn phrase, the one word the sentence pivots on is set apart:
    // an italic in the contrasting face, a heavier or lighter weight, tracked
    // caps, or an accent hairline. Call-outs are applied outside the turn only,
    // so a line never carries two competing emphases in the same breath.
    const calloutStyle = (treat: string): React.CSSProperties => {
      if (treat === "italic")
        return { fontFamily: a.family, fontStyle: "italic", letterSpacing: "0em" };
      if (treat === "bold") return { fontWeight: Math.min(900, d.weight + 200) };
      if (treat === "light") return { fontWeight: Math.max(200, d.weight - 300) };
      if (treat === "caps")
        return { textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.88em" };
      // Tracked: the word is opened up rather than restyled, so it slows the
      // reader down without breaking the line's texture.
      if (treat === "tracked") return { letterSpacing: "0.08em", fontWeight: d.weight };
      // Quiet: held back in weight and alpha so the words around it carry.
      if (treat === "quiet")
        return { fontWeight: Math.max(200, d.weight - 200), opacity: 0.72 };
      // Accent: the only place brand blue touches display copy — one word, never
      // body text, so contrast rules still hold.
      if (treat === "accent")
        return { color: P.accent, fontWeight: Math.min(900, d.weight + 100) };
      return { borderBottom: `${u(0.16)} solid ${P.accent}`, paddingBottom: u(0.16) };
    };
    // Word spaces either side of a call-out are bound, so the emphasis never
    // swallows the space between it and the next word.
    const ws = (s: string) => s.replace(/^ /, "\u00A0").replace(/ $/, "\u00A0");
    const deco = (s: string, depth = 0): React.ReactNode => {
      if (depth > 3) return s;
      const hay = s.replace(/\u00A0/g, " ");
      for (const c of ST.callouts ?? []) {
        const i = hay.indexOf(c.text);
        if (i < 0) continue;
        return (
          <>
            {ws(s.slice(0, i))}
            <span style={calloutStyle(c.treat)}>{s.slice(i, i + c.text.length)}</span>
            {deco(ws(s.slice(i + c.text.length)), depth + 1)}
          </>
        );
      }
      return s;
    };

    return (
      <div
        style={{
          fontFamily: d.family,
          fontSize: u(px),
          lineHeight: lead,
          fontWeight: d.weight,
          color: opts?.color ?? P.ink,
          letterSpacing: trackEm,
          textTransform: d.caps ? "uppercase" : "none",
          textWrap: "balance",
          fontOpticalSizing: "auto",
          hangingPunctuation: "first last",
          maxWidth: `${measure}em`,
        }}
      >
        {deco(parts.after ? parts.before : noWidow(parts.before))}
        {parts.action ? (
          <span
            style={{
              fontFamily: a2.family,
              fontWeight: a2.weight,
              fontStyle: a2.italic ? "italic" : "normal",
              fontSize: a2.scale && a2.scale !== 1 ? u(px * a2.scale) : undefined,
              letterSpacing: a2.tracking ?? (a2.italic ? "0em" : undefined),
              textTransform: a2.caps ? "uppercase" : d.caps ? "uppercase" : "none",
              borderBottom: a2.rule ? `${u(0.2)} solid ${P.accent}` : undefined,
              paddingBottom: a2.rule ? u(0.3) : undefined,
              whiteSpace: longTurn ? "normal" : "nowrap",
            }}
          >
            {parts.action}
          </span>
        ) : null}
        {parts.after ? deco(noWidow(parts.after)) : null}
      </div>
    );

  };

  // A wide banner has no room for a second line of copy — the headline and the
  // division line carry it, and the picture keeps the rest of the strip.
  const support = () =>
    banner ? null : (

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
      {supportRun()}
    </div>
  );

  /**
   * The campaign carries no call to action. Where one used to sit, a gradient
   * alpha rule fades out of the accent so the composition still resolves.
   *
   * The rule is not neutral: it echoes the strongest line in the photograph, so
   * the typography and the picture resolve on the same axis. A rising frame
   * lifts the rule, a falling one drops it, a vertical frame gets a short heavy
   * stub instead of a long horizontal.
   */
  const ruleTilt = ST.axis === "rising" ? -1.6 : ST.axis === "falling" ? 1.6 : 0;
  const alphaRule = (len = 22, from: string = P.accent) => (
    <span
      aria-hidden
      style={{
        display: "block",
        width: ST.axis === "vertical" ? `${Math.max(9, len * 0.5)}%` : `${len}%`,
        minWidth: u(ST.axis === "vertical" ? 6 : 10),
        height: u(ST.axis === "vertical" ? 0.48 : 0.3),
        transform: ruleTilt ? `rotate(${ruleTilt}deg)` : undefined,
        transformOrigin: "left center",
        background: `linear-gradient(to right, ${from} 0%, ${from}A6 38%, ${from}00 100%)`,
      }}
    />
  );


  const cta = () => alphaRule(38);

  // The lockup is no longer laid out inline by each template — it is pinned to
  // one corner of the frame (see cornerLockup below), so every ad in the set
  // signs off in the same place.
  const mark = (_size = T.logo): React.ReactNode => null;


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

  /** No call to action in the cut family either — a wider gradient alpha rule. */
  const ctaBlock = (opts?: { light?: boolean }) => alphaRule(46, opts?.light ? P.ink : P.accent);

  /** Frame number on a short accent rule, for use inside a cut field. */
  const cutMasthead = () => (
    <div className="flex items-center" style={{ gap: u(1.4) }}>
      <span
        style={{
          fontFamily: TY.eyebrow.family,
          fontWeight: TY.eyebrow.weight,
          fontSize: u(T.numeral),
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.14em",
          color: P.ink,
          opacity: 0.72,
        }}
      >
        {scene.no}
      </span>
      <span aria-hidden style={{ width: u(3.4), height: u(0.3), background: P.accent }} />
    </div>
  );

  let body: React.ReactNode = null;

  const parts = alongsideHeadlineParts(scene.headline, scene.action);
  const colourMark = logos?.color ?? lockup;

  /** Body copy in an arbitrary ink, for the light-field templates. */
  const supportIn = (ink: string) =>
    banner ? null : (

    <div
      style={{
        fontFamily: TY.support.family,
        fontWeight: TY.support.weight,
        fontSize: u(T.support),
        lineHeight: TY.support.lineHeight,
        color: ink,
        opacity: 0.78,
        maxWidth: "26em",
      }}
    >
      {LEGAL_ALONGSIDE_CONCEPT.support}
    </div>
  );

  if (template === "veil") {
    // A single long alpha veil drawn across the frame on the diagonal: the ground
    // colour falls from opaque to nothing in five stops, so the picture surfaces
    // as the copy runs out. An accent bloom is screened into the base.
    const dir = clear === "left" ? "108deg" : clear === "right" ? "252deg" : clear === "top" ? "180deg" : "0deg";
    const side = clear === "right" ? "flex-end" : "flex-start";
    body = (
      <>
        {photo()}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(${dir}, ${P.ground}F0 0%, ${P.ground}CC 20%, ${P.ground}85 40%, ${P.ground}2E 64%, ${P.ground}00 86%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${P.accent}66 0%, ${P.accent}1F 26%, ${P.accent}00 54%)`,
            mixBlendMode: "screen",
          }}
        />
        <div
          className="absolute inset-0 flex flex-col justify-between"
          style={{ padding: u(M), alignItems: "stretch", textAlign: "left" }}
        >
          {masthead()}
          <div
            style={{
              display: "grid",
              gap: u(1.5),
              maxWidth: wide ? "62%" : "88%",
              justifySelf: side === "flex-end" ? "end" : "start",
            }}
          >
            {alphaRule(64)}
            <div style={{ opacity: 0.96 }}>
              {headline(square ? T.display : T.displayTight * 1.04, { measure: 13 })}
            </div>
            <div style={{ opacity: 0.82 }}>{support()}</div>
            {alphaRule(40, P.ink)}
          </div>
          <div className="flex items-end justify-between" style={{ gap: u(2) }}>
            {themeLabel()}
            {mark(T.logo * 0.85)}
          </div>
        </div>
      </>
    );
  } else if (template === "strata") {
    // Four stacked alpha strata climb the frame, each one denser than the last
    // and each divided by a gradient hairline. The copy sits in the deepest band.
    const stops = [0.92, 0.58, 0.28, 0.1]; // densest at the base, under the copy
    const base = wide ? 62 : square ? 58 : 56; // % height held by the strata
    const bandH = base / stops.length;
    body = (
      <>
        {photo()}
        {stops.map((a, i) => (
          <div
            key={a}
            className="absolute inset-x-0"
            style={{
              bottom: `${i * bandH}%`,
              height: `${bandH}%`,
              background: `${P.ground}${hex(a)}`,
              borderTop: i === stops.length - 1 ? undefined : `1px solid transparent`,
              backgroundImage: `linear-gradient(${P.ground}${hex(a)}, ${P.ground}${hex(a)}), linear-gradient(to right, ${P.accent}5C 0%, ${P.accent}00 62%)`,
              backgroundSize: `100% 100%, 100% ${u(0.18)}`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "top left, top left",
            }}
          />
        ))}
        <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: u(M), textAlign: "left" }}>
          {masthead()}
          <div style={{ display: "grid", gap: u(1.4), maxWidth: wide ? "72%" : "94%" }}>
            {headline(square ? T.displayTight : T.displayTight * 0.9, { measure: 15 })}
            <div style={{ opacity: 0.78 }}>{support()}</div>
            <div className="flex items-end justify-between" style={{ gap: u(2) }}>
              {alphaRule(30)}
              {mark(T.logo * 0.85)}
            </div>
          </div>
        </div>
      </>
    );
  } else if (template === "bloom") {
    // A soft radial bloom of the ground colour behind the headline, the headline
    // itself doubled: a blurred low-alpha ghost under a near-solid face.
    const size = square ? T.display * 1.02 : T.displayTight * 1.06;
    const ghost = (
      <div
        aria-hidden
        className="absolute inset-x-0"
        style={{ top: 0, filter: `blur(${u(0.9)})`, opacity: 0.38 }}
      >
        {headline(size, { measure: 13 })}
      </div>
    );
    body = (
      <>
        {photo()}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(112% 88% at ${clear === "right" ? "78%" : "24%"} 64%, ${P.ground}F0 0%, ${P.ground}B3 30%, ${P.ground}4D 56%, ${P.ground}0A 80%, ${P.ground}00 100%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${P.ground}A6 0%, ${P.ground}00 34%)`,
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: u(M), textAlign: "left" }}>
          {masthead()}
          <div style={{ display: "grid", gap: u(1.6), maxWidth: wide ? "58%" : "92%" }}>
            {alphaRule(52, P.ink)}
            <div className="relative">
              {ghost}
              <div className="relative" style={{ opacity: 0.98 }}>
                {headline(size, { measure: 13 })}
              </div>
            </div>
            <div style={{ opacity: 0.76 }}>{support()}</div>
          </div>
          <div className="flex items-end justify-between" style={{ gap: u(2) }}>
            {alphaRule(26)}
            {mark(T.logo * 0.85)}
          </div>
        </div>
      </>
    );
  } else if (template === "knockout") {
    // The headline is cut out of a light field and the photograph shows through
    // the letterforms. A full-bleed strip of the same frame runs under it.
    const size = (square ? T.display * 1.5 : T.display * 1.2) * TY.display.scale;
    body = (
      <>
        <div className="absolute inset-0" style={{ background: P.ground }} />
        <div
          className="absolute overflow-hidden"
          style={{ left: 0, right: 0, bottom: 0, height: wide ? "32%" : square ? "40%" : "36%" }}
        >
          {photo(undefined, "band")}
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to top, ${P.ground}00 52%, ${P.ground}47 100%)` }}
          />
        </div>
        <div
          className="absolute inset-x-0 top-0 flex flex-col"
          style={{ padding: u(M), gap: u(1.8), bottom: wide ? "32%" : square ? "40%" : "36%" }}
        >
          {masthead()}
          <div className="flex flex-1 flex-col justify-end" style={{ gap: u(1.6), textAlign: "left" }}>
            <div
              style={{
                fontFamily: TY.display.family,
                fontWeight: TY.display.weight,
                fontSize: u(size),
                lineHeight: TY.display.lineHeight,
                letterSpacing: TY.display.tracking,
                textTransform: "uppercase",
                maxWidth: "13em",
                backgroundImage: `linear-gradient(${P.light}80, ${P.light}80), url(${scene.src})`,
                backgroundSize: "cover",
                backgroundPosition: framePos("band"),
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {parts.before}
              {parts.action}
              {parts.after}
            </div>
            {supportIn(P.ink)}
          </div>
          <div className="flex items-end justify-between" style={{ gap: u(2) }}>
            {ctaBlock()}
            {null}

          </div>
        </div>
      </>
    );
  } else if (template === "louvre") {
    // The frame is louvred into three panes of the same photograph, each cropped
    // differently, with the copy carried on an ink band across the base.
    const panes = [offsetPos(-26, 2), framePos("panel"), offsetPos(26, 2)];
    const bandTop = wide ? "50%" : square ? "58%" : "60%";
    body = (
      <>
        <div className="absolute inset-0 flex" style={{ gap: u(0.7), background: P.ground }}>
          {panes.map((pos, i) => (
            <div key={pos + i} className="relative flex-1 overflow-hidden">
              <img
                src={scene.src}
                alt=""
                className="absolute inset-0 size-full object-cover"
                style={{
                  objectPosition: pos,
                  filter: i === 1 ? "contrast(1.08) saturate(1.05)" : "contrast(1.02) saturate(0.62) brightness(0.88)",
                }}
              />
            </div>
          ))}
        </div>
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ top: bandTop, background: P.ground, borderTop: `${u(0.34)} solid ${P.accent}` }}
        />
        <div className="absolute inset-x-0 top-0 flex" style={{ padding: u(M), bottom: bandTop }}>
          {masthead()}
        </div>
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col justify-between"
          style={{ top: bandTop, padding: u(M), gap: u(1.4) }}
        >
          <div style={{ display: "grid", gap: u(1.3), textAlign: "left" }}>
            {headline(square ? T.displayTight : T.displayTight * 0.82, { measure: wide ? 18 : 14 })}
            {support()}
          </div>
          <div className="flex items-end justify-between" style={{ gap: u(2) }}>
            {ctaBlock()}
            {mark(T.logo * 0.85)}
          </div>
        </div>
      </>
    );
  } else if (template === "marquee") {
    // Duotone photograph under a stacked marquee: the headline repeated, the
    // middle line solid and the outer lines drawn in outline only.
    // The marquee word is set on one line, so its size is capped by how many
    // characters have to fit inside the margins — otherwise a long turn runs
    // straight off the right edge on square and story trims.
    const chars = Math.max(6, scene.action.replace(/\s+$/, "").length);
    const fit = (100 - M * 2.4) / (chars * 0.56);
    const size = Math.min((square ? T.display * 2.5 : T.display * 2.2) * TY.display.scale, fit);
    const line = (variant: "outline" | "solid") => (
      <div
        style={{
          fontFamily: TY.display.family,
          fontWeight: TY.display.weight,
          fontSize: u(size),
          lineHeight: 0.94,
          letterSpacing: TY.display.tracking,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          color: variant === "solid" ? P.ink : "transparent",
          WebkitTextStroke: variant === "outline" ? `${u(0.12)} ${P.ink}8A` : undefined,
        }}
      >
        {scene.action}
      </div>
    );
    body = (
      <>
        {photo({ filter: "grayscale(1) contrast(1.24) brightness(1.06)" })}
        <div className="absolute inset-0" style={{ background: `${P.accent}D9`, mixBlendMode: "multiply" }} />
        <div className="absolute inset-0" style={{ background: `${P.ground}1F` }} />
        <div
          className="absolute inset-0 flex flex-col justify-between overflow-hidden"
          style={{ padding: u(M) }}
        >
          {masthead()}
          <div style={{ display: "grid", gap: u(0.4), textAlign: "left", justifyItems: "start" }}>
            {banner ? null : line("outline")}
            {line("solid")}
            {banner ? null : line("outline")}
          </div>
          <div style={{ display: "grid", gap: u(1.6) }}>
            <div
              style={{
                fontFamily: TY.support.family,
                fontWeight: 500,
                fontSize: u(T.support * 1.15),
                lineHeight: 1.28,
                color: P.ink,
                maxWidth: "22em",
              }}
            >
              {scene.headline}
            </div>
            <div className="flex items-end justify-between" style={{ gap: u(2) }}>
              {ctaBlock({ light: true })}
              {mark(T.logo * 0.85)}
            </div>
          </div>
        </div>
      </>
    );
  } else if (template === "arch") {
    // The photograph held inside a tall arch on the ground field, an accent ring
    // struck around it and the copy set on the open side.
    const archStyle: React.CSSProperties = wide
      ? { top: u(M * 0.9), bottom: u(M * 0.9), right: u(M), width: "42%" }
      : { top: u(M * 1.1), left: u(M), right: u(M), height: square ? "54%" : "50%" };
    body = (
      <>
        <div className="absolute inset-0" style={{ background: P.ground }} />
        <div
          aria-hidden
          className="absolute"
          style={{
            ...archStyle,
            border: `${u(0.22)} solid ${P.accent}`,
            borderRadius: wide ? `${u(21)} ${u(21)} 0 0` : `${u(30)} ${u(30)} 0 0`,
            transform: `translate(${u(1.1)}, ${u(-1.1)})`,
          }}
        />
        <div
          className="absolute overflow-hidden"
          style={{ ...archStyle, borderRadius: wide ? `${u(21)} ${u(21)} 0 0` : `${u(30)} ${u(30)} 0 0` }}
        >
          {photo(undefined, wide ? "column" : "panel")}
        </div>
        <div
          className="absolute flex flex-col justify-between"
          style={
            wide
              ? { top: u(M), bottom: u(M), left: u(M), width: "48%" }
              : { left: u(M), right: u(M), bottom: u(M), top: square ? "58%" : "54%" }
          }
        >
          {masthead()}
          <div style={{ display: "grid", gap: u(1.5) }}>
            {headline(square ? T.display * 0.94 : T.displayTight, { measure: 12 })}
            {support()}
          </div>
          <div className="flex items-end justify-between" style={{ gap: u(2) }}>
            {ctaBlock()}
            {mark(T.logo * 0.85)}
          </div>
        </div>
      </>
    );
  } else if (template === "contact") {
    // A proof sheet: the frame plus two tighter crops of it in a mono data
    // column, the way a photographer marks up a take.
    const crops = [offsetPos(-20, -12), offsetPos(20, 12)];
    body = (
      <>
        <div className="absolute inset-0" style={{ background: P.ground }} />
        <div
          className="absolute overflow-hidden"
          style={
            wide
              ? { top: u(M), bottom: u(M), left: u(M), right: "34%" }
              : { top: u(M), left: u(M), right: u(M), height: square ? "42%" : "40%" }
          }
        >
          {photo(undefined, "panel")}
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to top, ${P.ground}94 0%, ${P.ground}00 46%)` }}
          />
          <div className="absolute" style={{ left: u(1.6), bottom: u(1.4) }}>
            <span
              style={{
                fontFamily: TY.eyebrow.family,
                fontSize: u(T.micro),
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: P.ink,
                opacity: 0.82,
              }}
            >
              {`FRAME ${scene.no} / ${scene.pair}`}
            </span>
          </div>
        </div>
        <div
          className="absolute flex flex-col justify-between"
          style={
            wide
              ? { top: u(M), bottom: u(M), right: u(M), width: "29%", gap: u(1.2) }
              : { left: u(M), right: u(M), bottom: u(M), top: square ? "47%" : "44%", gap: u(1.2) }
          }
        >
          <div style={{ display: "grid", gap: u(1.2) }}>
            {masthead()}
            {/* The proof crops need real height — a 396px banner strip has none. */}
            {banner ? null : (
              <div className="flex" style={{ gap: u(0.8) }}>
                {crops.map((pos) => (
                  <div
                    key={pos}
                    className="relative flex-1 overflow-hidden"
                    style={{ aspectRatio: "4 / 3", border: `1px solid ${P.ink}2E` }}
                  >
                    <img
                      src={scene.src}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                      style={{ objectPosition: pos, filter: "grayscale(0.6) contrast(1.1)" }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "grid", gap: u(1) }}>
            <div style={{ textAlign: "left" }}>
              {headline(square ? T.displayTight * 0.74 : T.displayTight * 0.62, { measure: 12 })}
            </div>
            {banner ? null : (
              <div
                style={{
                  fontFamily: TY.support.family,
                  fontSize: u(T.micro * 0.95),
                  lineHeight: 1.45,
                  color: P.ink,
                  opacity: 0.7,
                  borderTop: `1px solid ${P.ink}2E`,
                  paddingTop: u(1),
                }}
              >
                {scene.craft}
              </div>
            )}
          </div>
          <div style={{ display: "grid", justifyItems: "start", gap: u(1.4) }}>
            {ctaBlock()}
            {mark(T.logo * 0.8)}
          </div>
        </div>
      </>
    );
  } else if (template === "wedge" || template === "blade") {
    // A hard ink wedge cut diagonally into a full-bleed photograph. The copy
    // lives inside the cut; a curtain of ground colour keeps any descender that
    // crosses the diagonal legible against the picture.
    const fromLeft = template === "wedge" ? clear !== "right" : clear === "right";
    const shape = wide
      ? fromLeft
        ? "polygon(0 0, 52% 0, 34% 100%, 0 100%)"
        : "polygon(48% 0, 100% 0, 100% 100%, 66% 100%)"
      : square
        ? fromLeft
          ? "polygon(0 0, 96% 0, 0 98%)"
          : "polygon(4% 0, 100% 0, 100% 98%)"
        : "polygon(0 60%, 100% 44%, 100% 100%, 0 100%)";
    const copyBox: React.CSSProperties = wide
      ? {
          top: u(M),
          bottom: u(M),
          left: fromLeft ? u(M) : "auto",
          right: fromLeft ? "auto" : u(M),
          width: "40%",
        }
      : square
        ? {
            top: u(M),
            bottom: u(M * 1.2),
            left: fromLeft ? u(M) : "auto",
            right: fromLeft ? "auto" : u(M),
            width: "58%",
          }
        : { left: u(M), right: u(M), bottom: u(M), top: "62%" };
    body = (
      <>
        {photo()}
        <div className="absolute inset-0" style={{ background: curtain(tall ? "bottom" : fromLeft ? "left" : "right", 0.46) }} />
        <div className="absolute inset-0" style={{ background: P.ground, clipPath: shape }} />
        <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: template === "blade" ? P.accent : `${P.ink}66`,
              clipPath: wide
                ? fromLeft
                  ? "polygon(52% 0, 53.4% 0, 35.4% 100%, 34% 100%)"
                  : "polygon(46.6% 0, 48% 0, 66% 100%, 64.6% 100%)"
                : square
                  ? fromLeft
                    ? "polygon(80% 0, 81.6% 0, 0 89.4%, 0 88%)"
                    : "polygon(18.4% 0, 20% 0, 100% 89.4%, 100% 88%)"
                  : "polygon(0 60%, 100% 44%, 100% 45.4%, 0 61.4%)",
          }}
        />
        <div className="absolute flex flex-col justify-between" style={copyBox}>
          {cutMasthead()}
          <div style={{ display: "grid", gap: u(1.5), paddingBlock: u(1.4) }}>
            {headline(square ? T.display : tall ? T.display * 0.94 : T.displayTight, {
              measure: wide ? 9 : tall ? 13 : 11,
            })}
            {support()}
          </div>
          <div style={{ display: "grid", justifyItems: "start", gap: u(1.6) }}>
            {ctaBlock()}
            {mark(T.logo * 0.85)}
          </div>
        </div>
      </>
    );
  } else if (template === "shard") {
    // A triangular ink shard rising out of the base corner, with the frame
    // numeral set oversized in the picture above it.
    const fromLeft = clear !== "right";
    const shape = wide
      ? fromLeft
        ? "polygon(0 8%, 62% 100%, 0 100%)"
        : "polygon(100% 8%, 100% 100%, 38% 100%)"
      : square
        ? fromLeft
          ? "polygon(0 26%, 88% 100%, 0 100%)"
          : "polygon(100% 26%, 100% 100%, 12% 100%)"
        : "polygon(0 34%, 100% 62%, 100% 100%, 0 100%)";
    body = (
      <>
        {photo()}
        <div className="absolute inset-0" style={{ background: curtain(tall ? "bottom" : fromLeft ? "left" : "right", 0.55) }} />
        <div className="absolute inset-0" style={{ background: P.ground, clipPath: shape }} />
        <div
          aria-hidden
          className="absolute"
          style={{
            top: wide ? "9%" : "7%",
            right: fromLeft ? u(M) : "auto",
            left: fromLeft ? "auto" : u(M),
            fontFamily: TY.display.family,
            fontWeight: 800,
            fontSize: u(square ? 17 : 13),
            lineHeight: 0.8,
            letterSpacing: "-0.05em",
            color: `${P.ink}2E`,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {scene.no}
        </div>
        <div
          className="absolute"
          style={{ top: u(M), left: u(M), right: u(M * 5) }}
        >
          {cutMasthead()}
        </div>
        <div
          className="absolute flex flex-col"
          style={{
            left: u(M),
            right: wide ? "44%" : square ? u(M * 2) : u(M),
            bottom: u(M),
            gap: u(1.4),
            alignItems: "flex-start",
          }}
        >
          {accentRule(22)}
          {headline(square ? T.display * 0.94 : T.displayTight, { measure: wide ? 11 : 13 })}
          {tall || square ? support() : null}
          <div className="flex w-full items-end justify-between" style={{ gap: u(2), paddingTop: u(0.8) }}>
            {ctaBlock()}
            {mark(T.logo * 0.9)}
          </div>
        </div>
      </>
    );
  } else if (template === "chevron") {
    // An angled ink band driven across the frame, accent slabs on both cuts.
    const bandTop = wide ? 26 : square ? 30 : 34;
    const bandH = wide ? 52 : square ? 46 : 40;
    const skew = wide ? 7 : 5;
    const band = `polygon(0 ${bandTop + skew}%, 100% ${bandTop}%, 100% ${bandTop + bandH}%, 0 ${bandTop + bandH + skew}%)`;
    body = (
      <>
        {photo()}
        <div className="absolute inset-0" style={{ background: `${P.ground}2E` }} />
        <div className="absolute inset-0" style={{ background: P.ground, clipPath: band }} />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: P.accent,
            clipPath: `polygon(0 ${bandTop + skew}%, 100% ${bandTop}%, 100% ${bandTop + 1.4}%, 0 ${bandTop + skew + 1.4}%)`,
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: P.accent,
            clipPath: `polygon(0 ${bandTop + bandH + skew}%, 100% ${bandTop + bandH}%, 100% ${bandTop + bandH + 1}%, 0 ${bandTop + bandH + skew + 1}%)`,
          }}
        />
        <div className="absolute" style={{ top: u(M * 0.9), left: u(M), right: u(M) }}>
          {cutMasthead()}
        </div>
        <div
          className="absolute flex flex-col justify-center"
          style={{
            top: `${bandTop + 4}%`,
            height: `${bandH - 6}%`,
            left: u(M),
            right: u(M),
            gap: u(1.3),
          }}
        >
          {headline(square ? T.display : T.displayTight * 1.06, { measure: wide ? 14 : 11 })}
          {support()}
        </div>
        <div
          className="absolute flex items-end justify-between"
          style={{ left: u(M), right: u(M), bottom: u(M * 0.9), gap: u(2) }}
        >
          {ctaBlock()}
          {mark(T.logo * 0.9)}
        </div>
      </>
    );
  } else if (template === "editorial") {
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
          {photo(undefined, "panel")}
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
          {photo(undefined, "full")}
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
            {/* A banner strip is only ~400px tall — the rotated label won't fit. */}
            {banner ? null : <span style={{ whiteSpace: "nowrap" }}>{scene.theme}</span>}
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
    const ledger = tall ? 32 : square ? 34 : banner ? 56 : 42;
    body = (
      <>
        <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ bottom: `${ledger}%` }}>
          {photo(undefined, wide ? "band" : "panel")}
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
          {photo(undefined, "panel")}
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
          {photo(undefined, "band")}
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
    const imgTop = banner ? 12 : wide ? 17 : 14;
    const imgH = tall ? 46 : square ? 46 : banner ? 32 : 42;
    body = (
      <div className="absolute inset-0" style={{ background: P.ground }}>
        <div className="absolute" style={{ top: "6%", left: u(side), right: u(side) }}>
          {masthead()}
        </div>
        <div
          className="absolute overflow-hidden"
          style={{ top: `${imgTop}%`, left: u(side), right: u(side), height: `${imgH}%` }}
        >
          {photo(undefined, "panel")}
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
          {photo(undefined, tall ? "panel" : "column")}
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
            background: `radial-gradient(118% 92% at 50% 48%, ${P.ground}E0 0%, ${P.ground}94 44%, ${P.ground}3D 100%)`,
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

  // ---- one signature corner for the whole set -----------------------------
  // Top-right by default; bottom-left when the copy column is held on the
  // right, so the lockup always lands on clear ground.
  const lockupBottomLeft = clear === "right";
  const cornerLockup = lockup ? (
    <img
      src={lockup}
      alt="TransPerfect Legal"
      style={{
        position: "absolute",
        ...(lockupBottomLeft
          ? { bottom: u(M * 0.82), left: u(M) }
          : { top: u(M * 0.82), right: u(M) }),
        height: u(T.logo * 0.9),
        width: "auto",
        maxWidth: u(24),
        objectFit: "contain",
        pointerEvents: "none",
      }}
    />
  ) : null;

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
      {cornerLockup}
    </div>
  );

}

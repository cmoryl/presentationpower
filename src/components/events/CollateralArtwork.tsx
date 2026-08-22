// Collateral artwork renderer — turns every piece in a playbook's collateral
// catalog into a production-looking demo asset instead of an empty card.
//
// Each piece resolves to a `kind` (badge, retractable banner, tote, gobo …)
// which decides both the artwork trim size and the physical mockup treatment
// drawn around it (lanyard clip, stand base, shirt silhouette, browser chrome).
// Everything is vector/CSS so it stays crisp at any preview size and can be
// re-skinned per event by swapping the logo + tokens passed in.

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { eventLookById, type EventLook } from "@/lib/event-looks";
import { resolveSocialStyle, type SocialStyle } from "@/lib/social-styles";

export type CollateralContext = {
  eventName: string;
  city: string;
  venue: string;
  dateLine: string;
  hashtag: string;
  url: string;
  accent: string;
  /** Event lockups by orientation. */
  logoWide: { url: string; ratio: number };
  logoStacked: { url: string; ratio: number };
  /** Set when the supplied lockups are dark/colour files that must be
   *  knocked out to white on the dark artwork fields. */
  logoNeedsKnockout?: boolean;
  /** Art direction for this demo set — palette, motif, type case. When absent
   *  the NEXT City field is used so existing callers are unchanged. */
  lookId?: string;
  /** Fully-resolved art direction — outranks `lookId`. Demo pages pass a
   *  per-demo derived look so each set reads as its own campaign. */
  look?: EventLook;
  /**
   * Social template style id (see `social-styles.ts`). The digital and web
   * trims — hero, email, LinkedIn header, signature strip and every social
   * post — compose from this style, so a demo kit's digital/web pieces carry
   * the exact plate treatment, radius, type case and CTA shape as the
   * generated social assets for the same campaign. Omit for the default.
   */
  styleId?: string;
};

export type ArtKind =
  | "badge"
  | "lanyard"
  | "wristband"
  | "retractable"
  | "hall-banner"
  | "backdrop"
  | "tower"
  | "floor-decal"
  | "desk-runner"
  | "gobo"
  | "doc"
  | "rate-card"
  | "certificate"
  | "program"
  | "brochure"
  | "card"
  | "business-card"
  | "tent-card"
  | "email"
  | "zoom"
  | "linkedin-header"
  | "web-hero"
  | "tshirt"
  | "tote"
  | "notebook"
  | "bottle"
  | "stickers"
  | "video"
  | "video-vertical"
  // Social / digital-native trims. These are used by the social playbook
  // demos, where every card must render an asset rather than a blank tile.
  | "social-square"
  | "social-story"
  | "social-wide"
  | "signature-strip";

const SIZES: Record<ArtKind, { w: number; h: number }> = {
  badge: { w: 700, h: 900 },
  lanyard: { w: 200, h: 900 },
  wristband: { w: 1200, h: 150 },
  retractable: { w: 620, h: 1500 },
  "hall-banner": { w: 1400, h: 420 },
  backdrop: { w: 1400, h: 790 },
  tower: { w: 520, h: 1500 },
  "floor-decal": { w: 800, h: 800 },
  "desk-runner": { w: 1400, h: 700 },
  gobo: { w: 800, h: 800 },
  doc: { w: 850, h: 1100 },
  "rate-card": { w: 850, h: 1100 },
  certificate: { w: 1100, h: 850 },
  program: { w: 660, h: 1020 },
  brochure: { w: 1200, h: 900 },
  card: { w: 870, h: 615 },
  "business-card": { w: 1050, h: 600 },
  "tent-card": { w: 700, h: 1000 },
  email: { w: 700, h: 1000 },
  zoom: { w: 1400, h: 788 },
  "linkedin-header": { w: 1584, h: 396 },
  "web-hero": { w: 1500, h: 640 },
  tshirt: { w: 900, h: 1000 },
  tote: { w: 900, h: 1000 },
  notebook: { w: 720, h: 1000 },
  bottle: { w: 900, h: 900 },
  stickers: { w: 850, h: 1100 },
  video: { w: 1400, h: 788 },
  "video-vertical": { w: 620, h: 1100 },
  "social-square": { w: 1080, h: 1080 },
  "social-story": { w: 1080, h: 1920 },
  "social-wide": { w: 1280, h: 720 },
  "signature-strip": { w: 1200, h: 300 },
};

export function artKindFor(label: string, surface: string): ArtKind {
  const l = label.toLowerCase();
  if (l.includes("badge")) return "badge";
  if (l.includes("lanyard")) return "lanyard";
  if (l.includes("wristband")) return "wristband";
  if (l.includes("retractable")) return "retractable";
  if (l.includes("hall banner") || l.includes("large-format")) return "hall-banner";
  if (l.includes("backdrop")) return "backdrop";
  if (l.includes("wayfinding") || l.includes("tower")) return "tower";
  if (l.includes("floor")) return "floor-decal";
  if (l.includes("runner") || l.includes("desk")) return "desk-runner";
  if (l.includes("gobo")) return "gobo";
  if (l.includes("rate card")) return "rate-card";
  if (l.includes("certificate")) return "certificate";
  if (l.includes("program")) return "program";
  if (l.includes("brochure") || l.includes("tri-fold")) return "brochure";
  if (l.includes("business card")) return "business-card";
  if (l.includes("tent")) return "tent-card";
  if (l.includes("thank-you") || l.includes("thank you")) return "card";
  if (l.includes("t-shirt") || l.includes("tee")) return "tshirt";
  if (l.includes("tote")) return "tote";
  if (l.includes("notebook")) return "notebook";
  if (l.includes("bottle")) return "bottle";
  if (l.includes("sticker")) return "stickers";
  if (l.includes("zoom") || l.includes("teams")) return "zoom";
  // Social / digital-native mappings — checked before the generic hero/email
  // fallbacks so a social kit never lands on the document layout.
  if (l.includes("signature")) return "signature-strip";
  if (
    l.includes("story") ||
    l.includes("reel") ||
    l.includes("tiktok") ||
    l.includes("bumper") ||
    l.includes("screenshot") ||
    l.includes("vertical")
  )
    return "social-story";
  if (l.includes("podcast") || l.includes("square") || l.includes("carousel") || l.includes("post"))
    return "social-square";
  if (l.includes("linkedin newsletter")) return "social-wide";
  if (l.includes("linkedin")) return "linkedin-header";
  if (
    l.includes("thumbnail") ||
    l.includes("og ") ||
    l.includes("og/") ||
    l.includes("social-share") ||
    l.includes("cover") ||
    l.includes("banner") ||
    l.includes("paid-ad") ||
    l.includes("advocacy") ||
    l.includes("blog header") ||
    l.includes("press-release")
  )
    return "social-wide";
  if (l.includes("website") || l.includes("hero")) return "web-hero";
  if (l.includes("countdown") && surface === "video") return "video-vertical";
  if (surface === "video") return "video";
  if (surface === "email") return "email";
  if (surface === "merch") return "tote";
  if (surface === "signage") return "hall-banner";
  return "doc";
}

export function artSize(kind: ArtKind) {
  return SIZES[kind];
}

// ---------------------------------------------------------------------------
// Shared artwork primitives
// ---------------------------------------------------------------------------

/** Active art direction. Provided by CollateralArtwork from ctx.lookId so the
 *  primitives below theme themselves without threading props through the
 *  per-kind artwork switch. */
const LookContext = createContext<EventLook>(eventLookById(undefined));

function useLook(): EventLook {
  return useContext(LookContext);
}

/** Active social template style — the shared geometry/type contract between
 *  generated social assets and the digital/web trims in a demo kit. */
const StyleContext = createContext<SocialStyle>(resolveSocialStyle(undefined));

function useSocialStyle(): SocialStyle {
  return useContext(StyleContext);
}


/** Field graphic drawn behind the artwork — one geometry per look. */
function MotifField({ opacity, color }: { opacity?: number; color?: string }) {
  const look = useLook();
  const o = opacity ?? look.motifOpacity;
  const c = color ?? look.accent;
  if (o <= 0) return null;
  const common: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    opacity: o,
  };
  switch (look.motif) {
    case "grid":
      return (
        <svg aria-hidden viewBox="0 0 200 100" preserveAspectRatio="none" style={common}>
          {Array.from({ length: 21 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 10} y1={0} x2={i * 10} y2={100} stroke={c} strokeWidth={0.5} />
          ))}
          {Array.from({ length: 11 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 10} x2={200} y2={i * 10} stroke={c} strokeWidth={0.5} />
          ))}
        </svg>
      );
    case "arcs":
      return (
        <svg aria-hidden viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" style={common}>
          {[30, 55, 80, 105, 130].map((r) => (
            <circle key={r} cx={186} cy={12} r={r} fill="none" stroke={c} strokeWidth={2.2} />
          ))}
        </svg>
      );
    case "rays":
      return (
        <svg aria-hidden viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" style={common}>
          {Array.from({ length: 14 }).map((_, i) => (
            <path
              key={i}
              d={`M200 6 L${200 - 210} ${6 + i * 13} L${200 - 210} ${11 + i * 13} Z`}
              fill={c}
              opacity={1 - i * 0.05}
            />
          ))}
        </svg>
      );
    case "dots":
      return (
        <svg aria-hidden viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" style={common}>
          {Array.from({ length: 11 }).map((_, r) =>
            Array.from({ length: 21 }).map((_, cIdx) => (
              <circle key={`${r}-${cIdx}`} cx={cIdx * 10} cy={r * 10} r={1.6} fill={c} />
            )),
          )}
        </svg>
      );
    case "waves":
      return (
        <svg aria-hidden viewBox="0 0 200 100" preserveAspectRatio="none" style={common}>
          {[0, 18, 36, 54, 72, 90].map((y) => (
            <path
              key={y}
              d={`M0 ${y} C 40 ${y - 14}, 60 ${y + 14}, 100 ${y} S 160 ${y - 14}, 200 ${y}`}
              fill="none"
              stroke={c}
              strokeWidth={3}
            />
          ))}
        </svg>
      );
    case "terrazzo":
      return (
        <svg aria-hidden viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" style={common}>
          {Array.from({ length: 26 }).map((_, i) => {
            const x = (i * 37) % 200;
            const y = (i * 53) % 100;
            const s = 3 + ((i * 7) % 9);
            return i % 3 === 0 ? (
              <circle key={i} cx={x} cy={y} r={s / 1.6} fill={c} />
            ) : (
              <rect
                key={i}
                x={x}
                y={y}
                width={s}
                height={s / 1.5}
                fill={i % 3 === 1 ? c : look.accentAlt}
                transform={`rotate(${(i * 23) % 90} ${x} ${y})`}
              />
            );
          })}
        </svg>
      );
    case "bars":
      return (
        <svg aria-hidden viewBox="0 0 200 100" preserveAspectRatio="none" style={common}>
          {Array.from({ length: 24 }).map((_, i) => (
            <rect key={i} x={i * 8.4} y={0} width={1.4} height={100} fill={c} />
          ))}
        </svg>
      );
    case "chevron":
    default:
      return (
        <svg aria-hidden viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" style={common}>
          {[0, 34, 68, 102, 136, 170].map((x) => (
            <path
              key={x}
              d={`M${x} 10 L${x + 22} 50 L${x} 90 L${x + 12} 90 L${x + 34} 50 L${x + 12} 10 Z`}
              fill={c}
            />
          ))}
        </svg>
      );
  }
}

function darkFieldFor(look: EventLook, radial = true): CSSProperties {
  return {
    background: radial
      ? `radial-gradient(120% 120% at 82% 12%, ${look.accent}55 0%, ${look.deep} 58%, #05060F 100%)`
      : `linear-gradient(135deg, ${look.deep} 0%, #0B1226 100%)`,
  };
}

function Field({
  children,
  style,
  chevron,
  light = false,
}: {
  children?: ReactNode;
  style?: CSSProperties;
  /** Motif strength override; defaults to the look's own value. */
  chevron?: number;
  light?: boolean;
}) {
  const look = useLook();
  const motif = chevron ?? look.motifOpacity;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        color: light ? look.ink : "#FFFFFF",
        ...(light
          ? { background: `linear-gradient(160deg,${look.lightFrom} 0%,${look.lightTo} 100%)` }
          : darkFieldFor(look)),
        ...style,
      }}
    >
      <MotifField
        opacity={light ? motif * 0.55 : motif}
        color={light ? look.accent : look.accentAlt}
      />
      <div style={{ position: "relative", width: "100%", height: "100%" }}>{children}</div>
    </div>
  );
}

function Logo({
  ctx,
  stacked,
  width,
  colorway = "white",
  style,
}: {
  ctx: CollateralContext;
  stacked?: boolean;
  width: number;
  colorway?: "white" | "color";
  style?: CSSProperties;
}) {
  const entry = stacked ? ctx.logoStacked : ctx.logoWide;
  return (
    <img
      src={entry.url}
      alt=""
      aria-hidden
      style={{
        width,
        height: width / entry.ratio,
        objectFit: "contain",
        display: "block",
        filter:
          colorway === "white" || (colorway !== "color" && ctx.logoNeedsKnockout)
            ? "brightness(0) invert(1)"
            : undefined,
        ...style,
      }}
    />
  );
}

function Meta({
  ctx,
  size = 20,
  dim = "rgba(255,255,255,0.74)",
  gap = 6,
}: {
  ctx: CollateralContext;
  size?: number;
  dim?: string;
  gap?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, fontSize: size, color: dim }}>
      <span style={{ fontWeight: 700, letterSpacing: "0.06em" }}>{ctx.city}</span>
      <span>{ctx.dateLine}</span>
      <span>{ctx.venue}</span>
    </div>
  );
}

function Rule({ color, h = 6, w = "38%" }: { color?: string; h?: number; w?: number | string }) {
  const look = useLook();
  return (
    <div style={{ width: w, height: h, borderRadius: 99, background: color ?? look.accent }} />
  );
}

function Lines({
  n,
  w = "100%",
  color = "rgba(3,0,44,0.14)",
  h = 8,
  gap = 12,
}: {
  n: number;
  w?: number | string;
  color?: string;
  h?: number;
  gap?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, width: w }}>
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          style={{
            height: h,
            borderRadius: 99,
            background: color,
            width: `${100 - (i % 3) * 12}%`,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Social-style primitives (digital + web cohesion)
// ---------------------------------------------------------------------------
//
// The generated social assets compose from a SocialStyle: where the copy sits,
// what plate sits behind it, the plate radius, the headline case/weight, the
// eyebrow and the CTA shape. The digital and web trims below used to hardcode
// their own version of all of that, so a kit's web hero and email header never
// matched the posts they shipped alongside. These primitives read the active
// style so both channels compose from one contract.

/** Headline type tuned by the active style. */
function titleStyle(style: SocialStyle, basePx: number, maxWidth?: string): CSSProperties {
  return {
    fontSize: Math.round(basePx * style.titleScale),
    fontWeight: style.titleWeight,
    letterSpacing: style.titleTracking,
    textTransform: style.titleUppercase ? "uppercase" : undefined,
    lineHeight: 1.03,
    maxWidth,
  };
}

/** Plate behind the copy — glass / solid / band / aura / none, per style. */
function CopyPlate({
  children,
  shortEdge,
  pad = 44,
  dark = true,
}: {
  children: ReactNode;
  /** Short edge of the trim, used to scale the plate radius. */
  shortEdge: number;
  pad?: number;
  dark?: boolean;
}) {
  const style = useSocialStyle();
  const look = useLook();
  const radius = style.plateFullBleed ? 0 : Math.round(shortEdge * style.plateRadiusPct);
  const base: CSSProperties = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: Math.round(pad * 0.45),
    padding: style.plate === "none" ? 0 : pad,
    borderRadius: radius,
    marginInline: style.plateFullBleed && style.plate !== "none" ? -pad : 0,
    marginTop: style.copyAlign === "end" ? "auto" : undefined,
  };
  if (style.plate === "glass") {
    return (
      <div
        style={{
          ...base,
          background: dark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.62)",
          backdropFilter: "blur(18px)",
          border: `1px solid ${dark ? "rgba(255,255,255,0.22)" : "rgba(3,0,44,0.10)"}`,
        }}
      >
        {children}
      </div>
    );
  }
  if (style.plate === "solid") {
    return (
      <div style={{ ...base, background: dark ? `${look.deep}E6` : "#FFFFFF" }}>{children}</div>
    );
  }
  if (style.plate === "band") {
    return (
      <div
        style={{
          ...base,
          background: dark
            ? `linear-gradient(90deg, ${look.deep}F2 0%, ${look.deep}A6 78%, transparent 100%)`
            : `linear-gradient(90deg, #FFFFFFF2 0%, #FFFFFFB8 78%, transparent 100%)`,
        }}
      >
        {children}
      </div>
    );
  }
  if (style.plate === "aura") {
    return (
      <div
        style={{
          ...base,
          background: `radial-gradient(120% 160% at 12% 100%, ${look.accent}3d 0%, transparent 70%)`,
        }}
      >
        {children}
      </div>
    );
  }
  return <div style={base}>{children}</div>;
}

/** Accent rule / eyebrow bar — drawn only when the style calls for one. */
function StyleRule({ w = 132, h = 8 }: { w?: number; h?: number }) {
  const style = useSocialStyle();
  const look = useLook();
  if (!style.accentRule) return null;
  return <div style={{ width: w, height: h, borderRadius: 99, background: look.accent }} />;
}

function Eyebrow({ children, size = 24 }: { children: ReactNode; size?: number }) {
  const style = useSocialStyle();
  const look = useLook();
  if (style.eyebrow === "hidden") return null;
  if (style.eyebrow === "pill") {
    return (
      <span
        style={{
          alignSelf: "flex-start",
          padding: `${Math.round(size * 0.4)}px ${size}px`,
          borderRadius: 999,
          background: `${look.accent}2e`,
          border: `1px solid ${look.accent}66`,
          color: look.accent,
          fontSize: size,
          fontWeight: 700,
        }}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: size,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        fontWeight: 700,
        color: look.accent,
      }}
    >
      {children}
    </span>
  );
}

function Cta({ children, size = 22 }: { children: ReactNode; size?: number }) {
  const style = useSocialStyle();
  const look = useLook();
  const padY = Math.round(size * 0.7);
  const padX = Math.round(size * 1.5);
  if (style.cta === "underline") {
    return (
      <span
        style={{
          alignSelf: "flex-start",
          fontSize: size,
          fontWeight: 700,
          color: look.accent,
          borderBottom: `3px solid ${look.accent}`,
          paddingBottom: 6,
        }}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      style={{
        alignSelf: "flex-start",
        padding: `${padY}px ${padX}px`,
        borderRadius: style.cta === "pill" ? 999 : 6,
        background: look.accent,
        color: look.deep,
        fontSize: size,
        fontWeight: 800,
      }}
    >
      {children}
    </span>
  );
}

/** Lockup corner for the active style. */
function lockupRowStyle(style: SocialStyle): CSSProperties {
  return {
    display: "flex",
    justifyContent: style.lockup === "top-left" ? "flex-start" : "flex-end",
    order: style.lockup === "bottom-right" ? 2 : 0,
  };
}

// ---------------------------------------------------------------------------
// Per-kind artwork
// ---------------------------------------------------------------------------

function Artwork({ kind, ctx, label }: { kind: ArtKind; ctx: CollateralContext; label: string }) {
  const pad = 44;
  // Shadow the fallback tokens with the active look so every piece in the
  // switch below re-inks to this demo set's art direction.
  const look = useLook();
  const NAVY = look.deep;
  const BLUE = look.accent;
  const INK = look.ink;
  const darkField = (radial = true) => darkFieldFor(look, radial);
  const ChevronField = ({ opacity, color }: { opacity?: number; color?: string }) => (
    <MotifField opacity={opacity} color={color ?? look.accentAlt} />
  );
  // Active social template style. The digital/web/social trims below compose
  // from it so they render in the same visual language as the generated social
  // assets for this campaign.
  const sstyle = useSocialStyle();
  const lockupRow = lockupRowStyle(sstyle);


  switch (kind) {
    case "badge": {
      const track = label.toLowerCase().includes("speaker")
        ? { name: "SPEAKER", color: "#FFD166" }
        : label.toLowerCase().includes("sponsor") || label.toLowerCase().includes("staff")
          ? { name: "SPONSOR · STAFF", color: "#A6FA87" }
          : { name: "ATTENDEE", color: BLUE };
      return (
        <Field light chevron={0.07}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ background: NAVY, padding: "34px 30px 26px", display: "flex", justifyContent: "center" }}>
              <Logo ctx={ctx} stacked width={300} />
            </div>
            <div style={{ padding: "36px 34px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
              <div style={{ fontSize: 20, letterSpacing: "0.22em", color: "rgba(3,0,44,0.5)", fontWeight: 700 }}>
                {ctx.city.toUpperCase()}
              </div>
              <div style={{ fontSize: 62, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
                Alex Moreau
              </div>
              <div style={{ fontSize: 26, color: "rgba(3,0,44,0.62)" }}>
                VP Localization · Northwind Health
              </div>
              <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ width: 26, height: 26, borderRadius: 99, background: track.color }} />
                <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.16em", color: NAVY }}>
                  {track.name}
                </span>
              </div>
            </div>
            <div style={{ height: 66, background: track.color, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 30px", fontSize: 20, fontWeight: 700, color: INK }}>
              <span>{ctx.dateLine}</span>
              <span>{ctx.hashtag}</span>
            </div>
          </div>
        </Field>
      );
    }

    case "lanyard":
      return (
        <Field chevron={0}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-around", padding: "24px 0" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ transform: "rotate(-90deg)" }}>
                <Logo ctx={ctx} width={150} />
              </div>
            ))}
          </div>
        </Field>
      );

    case "wristband": {
      const tiers = ["VIP", "PRESS", "STAFF"];
      const tier = tiers[label.length % tiers.length];
      return (
        <Field chevron={0.1}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 40, padding: "0 40px" }}>
            <Logo ctx={ctx} width={320} />
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 34, fontWeight: 800, letterSpacing: "0.2em" }}>
              <span>{tier}</span>
              <span style={{ color: "#7FD0FF" }}>{ctx.city}</span>
              <span style={{ opacity: 0.7 }}>{ctx.hashtag}</span>
            </div>
          </div>
        </Field>
      );
    }

    case "retractable":
    case "tower":
      return (
        <Field>
          <div style={{ position: "absolute", inset: 0, padding: 56, display: "flex", flexDirection: "column", gap: 30 }}>
            <Logo ctx={ctx} stacked width={kind === "tower" ? 340 : 420} />
            <div style={{ marginTop: 30, fontSize: kind === "tower" ? 68 : 84, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.02 }}>
              {kind === "tower" ? "This way to the main stage" : "One brand system, every market."}
            </div>
            <Rule />
            <Meta ctx={ctx} size={30} />
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 26, color: "#7FD0FF", fontWeight: 700 }}>{ctx.hashtag}</span>
              <span style={{ fontSize: 22, color: "rgba(255,255,255,0.6)" }}>{ctx.url}</span>
            </div>
          </div>
        </Field>
      );

    case "hall-banner":
    case "desk-runner":
      return (
        <Field>
          <div style={{ position: "absolute", inset: 0, padding: 48, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Logo ctx={ctx} width={520} />
              <Rule w={180} />
              <div style={{ fontSize: 34, color: "rgba(255,255,255,0.8)" }}>
                {ctx.city} · {ctx.dateLine}
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 28, color: "#7FD0FF", fontWeight: 700 }}>
              {ctx.hashtag}
              <div style={{ fontSize: 22, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{ctx.url}</div>
            </div>
          </div>
        </Field>
      );

    case "backdrop":
    case "zoom":
    case "video":
      return (
        <Field>
          <div style={{ position: "absolute", inset: 0, padding: 64, display: "flex", flexDirection: "column", justifyContent: "center", gap: 26 }}>
            <Logo ctx={ctx} stacked width={430} />
            <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-0.02em", maxWidth: "70%" }}>
              {kind === "video" ? "Session sizzle · sponsor loop" : "One brand system, every market."}
            </div>
            <Meta ctx={ctx} size={26} />
            <div style={{ position: "absolute", right: 64, bottom: 56, fontSize: 26, color: "#7FD0FF", fontWeight: 700 }}>
              {ctx.hashtag}
            </div>
          </div>
        </Field>
      );

    case "video-vertical":
      return (
        <Field>
          <div style={{ position: "absolute", inset: 0, padding: 46, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 26, textAlign: "center" }}>
            <Logo ctx={ctx} stacked width={330} />
            <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1 }}>
              04:59
            </div>
            <div style={{ fontSize: 26, letterSpacing: "0.2em", color: "#7FD0FF", fontWeight: 700 }}>
              DOORS OPEN
            </div>
            <Meta ctx={ctx} size={22} />
          </div>
        </Field>
      );

    case "floor-decal":
      return (
        <Field chevron={0.18}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, borderRadius: "50%", overflow: "hidden" }}>
            <Logo ctx={ctx} stacked width={330} />
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "0.08em" }}>REGISTRATION →</div>
            <div style={{ fontSize: 24, color: "rgba(255,255,255,0.7)" }}>{ctx.city}</div>
          </div>
        </Field>
      );

    case "gobo":
      return (
        <div style={{ position: "absolute", inset: 0, background: "#05070F", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              width: "78%",
              height: "78%",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "radial-gradient(circle, rgba(127,208,255,0.22) 0%, rgba(127,208,255,0.05) 62%, rgba(0,0,0,0) 72%)",
              boxShadow: "0 0 120px rgba(127,208,255,0.35)",
            }}
          >
            <Logo ctx={ctx} stacked width={330} style={{ opacity: 0.95 }} />
          </div>
        </div>
      );

    case "rate-card":
      return (
        <Field light chevron={0.05}>
          <div style={{ position: "absolute", inset: 0, padding: pad, display: "flex", flexDirection: "column", gap: 22 }}>
            <Logo ctx={ctx} width={330} colorway="color" />
            <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-0.03em" }}>Sponsor rate card</div>
            <Rule w={120} h={5} />
            {[
              ["Platinum", "$75,000", "Stage · keynote · 6 passes"],
              ["Gold", "$40,000", "Track host · 4 passes"],
              ["Silver", "$22,000", "Expo pod · 2 passes"],
              ["Community", "$8,500", "Logo rail · 1 pass"],
            ].map(([tier, price, inc]) => (
              <div key={tier} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, borderBottom: "1px solid rgba(3,0,44,0.12)", paddingBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: NAVY }}>{tier}</div>
                  <div style={{ fontSize: 18, color: "rgba(3,0,44,0.6)" }}>{inc}</div>
                </div>
                <div style={{ fontSize: 30, fontWeight: 800, color: BLUE }}>{price}</div>
              </div>
            ))}
            <div style={{ marginTop: "auto", fontSize: 18, color: "rgba(3,0,44,0.55)" }}>
              {ctx.city} · {ctx.dateLine} · {ctx.url}
            </div>
          </div>
        </Field>
      );

    case "certificate":
      return (
        <Field light chevron={0.05}>
          <div style={{ position: "absolute", inset: 26, border: `4px solid ${NAVY}`, borderRadius: 8 }} />
          <div style={{ position: "absolute", inset: 0, padding: 76, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, textAlign: "center" }}>
            <Logo ctx={ctx} width={300} colorway="color" />
            <div style={{ fontSize: 22, letterSpacing: "0.3em", color: "rgba(3,0,44,0.55)", fontWeight: 700 }}>
              CERTIFICATE OF PARTNERSHIP
            </div>
            <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-0.03em" }}>Northwind Health</div>
            <div style={{ fontSize: 22, color: "rgba(3,0,44,0.62)", maxWidth: 640 }}>
              recognised as a Platinum partner of {ctx.eventName}, {ctx.city}.
            </div>
            <Rule w={140} h={5} />
            <div style={{ fontSize: 18, color: "rgba(3,0,44,0.5)" }}>{ctx.dateLine}</div>
          </div>
        </Field>
      );

    case "program":
    case "tent-card":
      return (
        <Field light chevron={0.05}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ background: NAVY, padding: 34 }}>
              <Logo ctx={ctx} width={300} />
            </div>
            <div style={{ padding: 34, display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
              <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}>
                {kind === "program" ? "Programme" : "Session 3 · Global content ops"}
              </div>
              <Rule w={90} h={5} />
              {["09:00 Doors + coffee", "09:45 Opening keynote", "11:00 Track sessions", "13:00 Partner lunch", "15:30 City spotlight"].map((row) => (
                <div key={row} style={{ display: "flex", gap: 12, fontSize: 20, color: "rgba(3,0,44,0.72)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 99, background: BLUE, marginTop: 8 }} />
                  {row}
                </div>
              ))}
              <div style={{ marginTop: "auto", fontSize: 18, color: "rgba(3,0,44,0.5)" }}>
                {ctx.city} · {ctx.venue}
              </div>
            </div>
          </div>
        </Field>
      );

    case "brochure":
      return (
        <Field light chevron={0}>
          <div style={{ position: "absolute", inset: 0, display: "flex" }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  padding: 32,
                  borderRight: i < 2 ? "1px dashed rgba(3,0,44,0.2)" : undefined,
                  background: i === 2 ? NAVY : undefined,
                  color: i === 2 ? "#fff" : undefined,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                {i === 2 ? (
                  <>
                    <Logo ctx={ctx} stacked width={230} />
                    <div style={{ fontSize: 24, fontWeight: 700 }}>{ctx.city}</div>
                    <div style={{ fontSize: 18, color: "rgba(255,255,255,0.7)" }}>{ctx.dateLine}</div>
                    <div style={{ marginTop: "auto", fontSize: 18, color: "#7FD0FF" }}>{ctx.hashtag}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>
                      {i === 0 ? "Why NEXT" : "Agenda"}
                    </div>
                    <Rule w={60} h={4} />
                    <Lines n={7} />
                  </>
                )}
              </div>
            ))}
          </div>
        </Field>
      );

    case "card":
    case "business-card":
      return (
        <Field chevron={0.1}>
          <div style={{ position: "absolute", inset: 0, padding: 46, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <Logo ctx={ctx} width={kind === "business-card" ? 340 : 380} />
            {kind === "business-card" ? (
              <div style={{ fontSize: 22, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 800, fontSize: 28 }}>Priya Raman</div>
                <div style={{ color: "rgba(255,255,255,0.7)" }}>City Series programme lead</div>
                <div style={{ color: "#7FD0FF" }}>{ctx.url}</div>
              </div>
            ) : (
              <div style={{ fontSize: 30, fontWeight: 700, maxWidth: "80%" }}>
                Thank you for joining us in {ctx.city}. Next stop soon.
              </div>
            )}
          </div>
        </Field>
      );

    case "email":
      return (
        <div style={{ position: "absolute", inset: 0, background: "#F4F6FB", display: "flex", flexDirection: "column" }}>
          <div style={{ position: "relative", height: 250, ...darkField() }}>
            <ChevronField opacity={0.14} />
            <div style={{ position: "relative", padding: 34, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={lockupRow}>
                <Logo ctx={ctx} width={280} />
              </div>
              <Eyebrow size={16}>{ctx.dateLine}</Eyebrow>
              <div style={{ color: "#fff", ...titleStyle(sstyle, 28) }}>
                Save the date · {ctx.city}
              </div>
            </div>
          </div>
          <div style={{ padding: 34, display: "flex", flexDirection: "column", gap: 18, color: INK }}>
            <div style={titleStyle(sstyle, 26)}>You&rsquo;re invited</div>
            <StyleRule w={104} h={6} />
            <Lines n={6} />
            <Cta size={18}>Reserve your seat</Cta>
            <Lines n={3} />
          </div>
        </div>
      );

    case "linkedin-header":
      return (
        <Field>
          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexDirection: sstyle.lockup === "top-left" ? "row" : "row-reverse",
            }}
          >
            <Logo ctx={ctx} width={520} />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                alignItems: sstyle.lockup === "top-left" ? "flex-end" : "flex-start",
              }}
            >
              <div style={titleStyle(sstyle, 30)}>{ctx.city}</div>
              <Eyebrow size={18}>{ctx.dateLine}</Eyebrow>
            </div>
          </div>
        </Field>
      );

    case "web-hero":
      return (
        <Field>
          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: 64,
              display: "flex",
              flexDirection: "column",
              gap: 22,
            }}
          >
            <div style={lockupRow}>
              <Logo ctx={ctx} width={460} />
            </div>
            <CopyPlate shortEdge={640} pad={40}>
              <StyleRule w={120} h={7} />
              <div style={titleStyle(sstyle, 54, "62%")}>{ctx.eventName}</div>
              <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
                {["06", "14", "22", "09"].map((n, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: sstyle.plateFullBleed ? 4 : 14,
                      padding: "14px 20px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 34, fontWeight: 800 }}>{n}</div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", letterSpacing: "0.14em" }}>
                      {["DAYS", "HRS", "MIN", "SEC"][i]}
                    </div>
                  </div>
                ))}
              </div>
              <Cta size={20}>Register free</Cta>
            </CopyPlate>
          </div>
        </Field>
      );


    case "tshirt":
      return (
        <Field chevron={0}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24 }}>
            <Logo ctx={ctx} stacked width={420} />
            <div style={{ fontSize: 26, letterSpacing: "0.28em", color: "#7FD0FF", fontWeight: 700 }}>
              {ctx.city.toUpperCase()}
            </div>
          </div>
        </Field>
      );

    case "tote":
    case "notebook":
      return (
        <Field chevron={kind === "tote" ? 0.12 : 0.08}>
          <div style={{ position: "absolute", inset: 0, padding: 56, display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 }}>
            <Logo ctx={ctx} stacked width={kind === "tote" ? 380 : 300} />
            <Rule w={120} />
            <div style={{ fontSize: 24, color: "rgba(255,255,255,0.72)" }}>
              {ctx.city} · {ctx.dateLine}
            </div>
          </div>
        </Field>
      );

    case "bottle":
      return (
        <Field chevron={0.12}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 60px" }}>
            <Logo ctx={ctx} width={420} />
            <div style={{ fontSize: 26, fontWeight: 700, color: "#7FD0FF" }}>{ctx.hashtag}</div>
          </div>
        </Field>
      );

    case "stickers":
      return (
        <Field light chevron={0.05}>
          <div style={{ position: "absolute", inset: 0, padding: 40, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, alignContent: "start" }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: i % 2 ? 24 : "50%",
                  border: "2px dashed rgba(3,0,44,0.25)",
                  background: i % 3 === 0 ? NAVY : i % 3 === 1 ? BLUE : "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                }}
              >
                <Logo ctx={ctx} stacked width={190} colorway={i % 3 === 2 ? "color" : "white"} />
              </div>
            ))}
          </div>
        </Field>
      );

    // ---- Social / digital-native trims ---------------------------------
    // These read the same ctx as the event pieces (name, division line,
    // hashtag, url, accent) so a social playbook card renders a finished
    // composition instead of an empty tile.
    case "social-square":
      return (
        <Field chevron={0.1} style={{ background: `linear-gradient(150deg, ${NAVY} 0%, #0B1226 62%, ${ctx.accent}44 100%)` }}>
          <div style={{ position: "absolute", inset: 0, padding: 84, display: "flex", flexDirection: "column", gap: 26}}>
            <div style={lockupRow}>
              <Logo ctx={ctx} width={360} />
            </div>
            <CopyPlate shortEdge={1080} pad={56}>
              <StyleRule />
              <div style={titleStyle(sstyle, 74)}>{ctx.eventName}</div>
              <div style={{ fontSize: 30, color: "rgba(255,255,255,0.72)", lineHeight: 1.3 }}>
                {ctx.city} · {ctx.venue}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26 }}>
                <span style={{ color: ctx.accent, fontWeight: 700 }}>{ctx.hashtag}</span>
                <span style={{ color: "rgba(255,255,255,0.55)" }}>{ctx.url}</span>
              </div>
            </CopyPlate>
          </div>
        </Field>
      );

    case "social-story":
      return (
        <Field chevron={0.09} style={{ background: `linear-gradient(190deg, ${NAVY} 0%, #0A1023 58%, ${ctx.accent}3d 100%)` }}>
          <div style={{ position: "absolute", inset: 0, padding: 92, display: "flex", flexDirection: "column", gap: 30}}>
            <div style={lockupRow}>
              <Logo ctx={ctx} width={340} />
            </div>
            <CopyPlate shortEdge={1080} pad={60}>
              <Eyebrow size={26}>{ctx.dateLine.toUpperCase()}</Eyebrow>
              <div style={titleStyle(sstyle, 96)}>{ctx.eventName}</div>
              <div style={{ fontSize: 34, color: "rgba(255,255,255,0.7)", lineHeight: 1.32 }}>{ctx.venue}</div>
              <Cta size={30}>{ctx.hashtag}</Cta>
            </CopyPlate>
          </div>
        </Field>
      );

    case "social-wide":
      return (
        <Field chevron={0.11} style={{ background: `linear-gradient(115deg, ${NAVY} 0%, #0B1226 55%, ${ctx.accent}3a 100%)` }}>
          <div style={{ position: "absolute", inset: 0, padding: 72, display: "flex", flexDirection: "column", gap: 22}}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", ...lockupRow }}>
              <Logo ctx={ctx} width={330} />
              <span style={{ fontSize: 22, letterSpacing: "0.18em", color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>
                {ctx.city.toUpperCase()}
              </span>
            </div>
            <CopyPlate shortEdge={628} pad={44}>
              <StyleRule w={120} h={7} />
              <div style={titleStyle(sstyle, 62, "82%")}>{ctx.eventName}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24 }}>
                <span style={{ color: "rgba(255,255,255,0.7)" }}>{ctx.venue}</span>
                <span style={{ color: ctx.accent, fontWeight: 700 }}>{ctx.hashtag}</span>
              </div>
            </CopyPlate>
          </div>
        </Field>
      );

    case "signature-strip":
      return (
        <Field chevron={0.07} style={{ background: `linear-gradient(100deg, ${NAVY} 0%, #0B1226 70%, ${ctx.accent}33 100%)` }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: "0 56px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 40,
              flexDirection: sstyle.lockup === "top-left" ? "row" : "row-reverse",
            }}
          >
            <Logo ctx={ctx} width={280} />
            <div style={{ width: 2, height: 120, background: `${ctx.accent}88` }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              <span style={titleStyle(sstyle, 34)}>{ctx.eventName}</span>
              <span style={{ fontSize: 24, color: "rgba(255,255,255,0.65)" }}>
                {ctx.city} · {ctx.url}
              </span>
            </div>
          </div>
        </Field>
      );


    case "doc":
    default:
      return (
        <Field light chevron={0.05}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ position: "relative", height: 330, ...darkField() }}>
              <ChevronField opacity={0.16} />
              <div style={{ position: "relative", padding: 44, display: "flex", flexDirection: "column", gap: 16 }}>
                <Logo ctx={ctx} width={340} />
                <div style={{ color: "#fff", fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em" }}>
                  {label}
                </div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 20 }}>
                  {ctx.city} · {ctx.dateLine}
                </div>
              </div>
            </div>
            <div style={{ padding: 44, display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: NAVY }}>Audience & reach</div>
              <div style={{ display: "flex", gap: 14 }}>
                {[["6", "cities"], ["180", "per stop"], ["600", "registrations"]].map(([n, l]) => (
                  <div key={l} style={{ flex: 1, border: "1px solid rgba(3,0,44,0.12)", borderRadius: 14, padding: 16 }}>
                    <div style={{ fontSize: 34, fontWeight: 800, color: BLUE }}>{n}</div>
                    <div style={{ fontSize: 16, color: "rgba(3,0,44,0.55)" }}>{l}</div>
                  </div>
                ))}
              </div>
              <Lines n={8} />
              <div style={{ marginTop: "auto", fontSize: 16, color: "rgba(3,0,44,0.5)" }}>{ctx.url}</div>
            </div>
          </div>
        </Field>
      );
  }
}

// ---------------------------------------------------------------------------
// Physical mockup treatments
// ---------------------------------------------------------------------------

/** Renders the trim artwork at natural size, scaled into `displayWidth`, and
 *  wraps it in the physical treatment for that kind. Themed by `ctx.lookId`. */
export function CollateralArtwork(props: {
  kind: ArtKind;
  ctx: CollateralContext;
  label: string;
  displayWidth: number;
}) {
  return (
    <LookContext.Provider value={props.ctx.look ?? eventLookById(props.ctx.lookId)}>
      <CollateralArtworkFramed {...props} />
    </LookContext.Provider>
  );
}

function CollateralArtworkFramed({
  kind,
  ctx,
  label,
  displayWidth,
}: {
  kind: ArtKind;
  ctx: CollateralContext;
  label: string;
  displayWidth: number;
}) {
  const look = useLook();
  const { w, h } = SIZES[kind];
  const scale = displayWidth / w;

  const art = (
    <div style={{ width: displayWidth, height: h * scale, position: "relative" }}>
      <div
        style={{
          width: w,
          height: h,
          position: "absolute",
          top: 0,
          left: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <Artwork kind={kind} ctx={ctx} label={label} />
      </div>
    </div>
  );

  const shadow = "0 24px 50px -24px rgba(3,0,44,0.55)";

  if (kind === "badge") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            width: displayWidth * 0.16,
            height: displayWidth * 0.2,
            borderRadius: 4,
            background: "linear-gradient(180deg,#8E99B5,#5E6A85)",
            backgroundColor: "#7C879F",
          }}
        />
        <div style={{ width: displayWidth * 0.1, height: displayWidth * 0.05, background: "#C7CEDD", borderRadius: 2 }} />
        <div style={{ borderRadius: 14, overflow: "hidden", boxShadow: shadow }}>{art}</div>
      </div>
    );
  }

  if (kind === "retractable" || kind === "tower") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ borderRadius: 6, overflow: "hidden", boxShadow: shadow }}>{art}</div>
        <div
          style={{
            width: displayWidth * 1.06,
            height: Math.max(8, displayWidth * 0.05),
            borderRadius: 6,
            background: "linear-gradient(180deg,#D7DDEA,#98A2B8)",
          }}
        />
      </div>
    );
  }

  if (kind === "tshirt") {
    return (
      <div
        style={{
          width: displayWidth,
          aspectRatio: "1 / 1.05",
          background: "linear-gradient(160deg,#1a2340,#0c1226)",
          clipPath:
            "polygon(20% 0%, 35% 4%, 50% 10%, 65% 4%, 80% 0%, 100% 16%, 88% 30%, 82% 24%, 82% 100%, 18% 100%, 18% 24%, 12% 30%, 0% 16%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: shadow,
        }}
      >
        <div style={{ width: displayWidth * 0.52, borderRadius: 6, overflow: "hidden" }}>
          <CollateralArtworkInner kind="tshirt" ctx={ctx} label={label} width={displayWidth * 0.52} />
        </div>
      </div>
    );
  }

  if (kind === "tote") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: displayWidth }}>
        <div style={{ display: "flex", gap: displayWidth * 0.3 }}>
          {[0, 1].map((i) => (
            <div
              key={i}
              style={{
                width: displayWidth * 0.06,
                height: displayWidth * 0.22,
                borderTopLeftRadius: 99,
                borderTopRightRadius: 99,
                border: "4px solid #6C7893",
                borderBottom: "none",
              }}
            />
          ))}
        </div>
        <div style={{ borderRadius: "4px 4px 12px 12px", overflow: "hidden", boxShadow: shadow, width: "100%" }}>
          {art}
        </div>
      </div>
    );
  }

  if (kind === "bottle") {
    return (
      <div
        style={{
          width: displayWidth,
          borderRadius: 999,
          overflow: "hidden",
          boxShadow: `${shadow}, inset 0 0 60px rgba(0,0,0,0.45)`,
          position: "relative",
        }}
      >
        {art}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.16) 32%, rgba(255,255,255,0.05) 60%, rgba(0,0,0,0.5) 100%)",
          }}
        />
      </div>
    );
  }

  if (kind === "gobo" || kind === "floor-decal") {
    return (
      <div style={{ width: displayWidth, borderRadius: "50%", overflow: "hidden", boxShadow: shadow }}>
        {art}
      </div>
    );
  }

  if (kind === "web-hero" || kind === "zoom" || kind === "video" || kind === "video-vertical") {
    return (
      <div style={{ width: displayWidth, borderRadius: 12, overflow: "hidden", boxShadow: shadow, background: "#0B1020" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: "#151C33" }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <span key={c} style={{ width: 8, height: 8, borderRadius: 99, background: c }} />
          ))}
        </div>
        <div style={{ position: "relative" }}>
          {art}
          {kind.startsWith("video") ? (
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 99,
                  background: "rgba(255,255,255,0.9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: look.deep,
                  fontSize: 20,
                }}
              >
                ▶
              </span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (kind === "lanyard") {
    return (
      <div style={{ width: displayWidth, borderRadius: 6, overflow: "hidden", boxShadow: shadow }}>{art}</div>
    );
  }

  return (
    <div style={{ width: displayWidth, borderRadius: 10, overflow: "hidden", boxShadow: shadow }}>{art}</div>
  );
}

/** Bare artwork without mockup chrome — used when a treatment nests artwork
 *  inside a physical shape (e.g. the print area on a shirt). */
function CollateralArtworkInner({
  kind,
  ctx,
  label,
  width,
}: {
  kind: ArtKind;
  ctx: CollateralContext;
  label: string;
  width: number;
}) {
  const { w, h } = SIZES[kind];
  const scale = width / w;
  return (
    <div style={{ width, height: h * scale, position: "relative" }}>
      <div
        style={{
          width: w,
          height: h,
          position: "absolute",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <Artwork kind={kind} ctx={ctx} label={label} />
      </div>
    </div>
  );
}

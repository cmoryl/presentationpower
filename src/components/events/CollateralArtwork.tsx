// Collateral artwork renderer — turns every piece in a playbook's collateral
// catalog into a production-looking demo asset instead of an empty card.
//
// Each piece resolves to a `kind` (badge, retractable banner, tote, gobo …)
// which decides both the artwork trim size and the physical mockup treatment
// drawn around it (lanyard clip, stand base, shirt silhouette, browser chrome).
// Everything is vector/CSS so it stays crisp at any preview size and can be
// re-skinned per event by swapping the logo + tokens passed in.

import type { CSSProperties, ReactNode } from "react";
import { NEXT_CITY_TOKENS } from "@/lib/next-city-logos";

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
  | "video-vertical";

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
  if (l.includes("linkedin")) return "linkedin-header";
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

const NAVY = NEXT_CITY_TOKENS.deep;
const BLUE = NEXT_CITY_TOKENS.blue;

/** NEXT chevron motif — the double ">>" from the logo, repeated as a
 *  large translucent field graphic. */
function ChevronField({ opacity = 0.14, color = BLUE }: { opacity?: number; color?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 100"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity }}
    >
      {[0, 34, 68, 102, 136, 170].map((x) => (
        <path
          key={x}
          d={`M${x} 10 L${x + 22} 50 L${x} 90 L${x + 12} 90 L${x + 34} 50 L${x + 12} 10 Z`}
          fill={color}
        />
      ))}
    </svg>
  );
}

function darkField(radial = true): CSSProperties {
  return {
    background: radial
      ? `radial-gradient(120% 120% at 82% 12%, ${BLUE}55 0%, ${NAVY} 58%, #070B1E 100%)`
      : `linear-gradient(135deg, ${NAVY} 0%, #0B1226 100%)`,
  };
}

function Field({
  children,
  style,
  chevron = 0.13,
  light = false,
}: {
  children?: ReactNode;
  style?: CSSProperties;
  chevron?: number;
  light?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        color: light ? NEXT_CITY_TOKENS.ink : "#FFFFFF",
        ...(light
          ? { background: "linear-gradient(160deg,#FFFFFF 0%,#EEF3FF 100%)" }
          : darkField()),
        ...style,
      }}
    >
      {chevron > 0 ? <ChevronField opacity={chevron} color={light ? BLUE : "#7FD0FF"} /> : null}
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
        filter: colorway === "white" ? "brightness(0) invert(1)" : undefined,
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

function Rule({ color = BLUE, h = 6, w = "38%" }: { color?: string; h?: number; w?: number | string }) {
  return <div style={{ width: w, height: h, borderRadius: 99, background: color }} />;
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
// Per-kind artwork
// ---------------------------------------------------------------------------

function Artwork({ kind, ctx, label }: { kind: ArtKind; ctx: CollateralContext; label: string }) {
  const pad = 44;

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
            <div style={{ height: 66, background: track.color, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 30px", fontSize: 20, fontWeight: 700, color: NEXT_CITY_TOKENS.ink }}>
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
                <Logo ctx={ctx} width={230} />
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
            <ChevronField opacity={0.14} color="#7FD0FF" />
            <div style={{ position: "relative", padding: 34, display: "flex", flexDirection: "column", gap: 14 }}>
              <Logo ctx={ctx} width={280} />
              <div style={{ color: "#fff", fontSize: 28, fontWeight: 700 }}>Save the date · {ctx.city}</div>
              <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 20 }}>{ctx.dateLine}</div>
            </div>
          </div>
          <div style={{ padding: 34, display: "flex", flexDirection: "column", gap: 18, color: NEXT_CITY_TOKENS.ink }}>
            <div style={{ fontSize: 26, fontWeight: 800 }}>You're invited</div>
            <Lines n={6} />
            <div style={{ alignSelf: "flex-start", background: BLUE, color: "#fff", padding: "14px 28px", borderRadius: 99, fontSize: 20, fontWeight: 700 }}>
              Reserve your seat
            </div>
            <Lines n={3} />
          </div>
        </div>
      );

    case "linkedin-header":
      return (
        <Field>
          <div style={{ position: "absolute", inset: 0, padding: 44, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Logo ctx={ctx} width={520} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 30, fontWeight: 700 }}>{ctx.city}</div>
              <div style={{ fontSize: 22, color: "#7FD0FF" }}>{ctx.dateLine}</div>
            </div>
          </div>
        </Field>
      );

    case "web-hero":
      return (
        <Field>
          <div style={{ position: "absolute", inset: 0, padding: 64, display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 }}>
            <Logo ctx={ctx} width={460} />
            <div style={{ fontSize: 54, fontWeight: 800, letterSpacing: "-0.035em", maxWidth: "62%" }}>
              The City Series lands in {ctx.city.split("·")[0].trim()}
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
              {["06", "14", "22", "09"].map((n, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 14, padding: "14px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 34, fontWeight: 800 }}>{n}</div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", letterSpacing: "0.14em" }}>
                    {["DAYS", "HRS", "MIN", "SEC"][i]}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ alignSelf: "flex-start", background: BLUE, borderRadius: 99, padding: "14px 30px", fontWeight: 700, fontSize: 20 }}>
              Register free
            </div>
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

    case "doc":
    default:
      return (
        <Field light chevron={0.05}>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ position: "relative", height: 330, ...darkField() }}>
              <ChevronField opacity={0.16} color="#7FD0FF" />
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
 *  wraps it in the physical treatment for that kind. */
export function CollateralArtwork({
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
                  color: NAVY,
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

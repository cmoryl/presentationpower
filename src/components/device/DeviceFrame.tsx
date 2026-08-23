/**
 * DEVICE FRAME — laptop screen / desktop monitor chassis
 * ---------------------------------------------------------------------------
 * One shared, presentation-agnostic device mockup used by BOTH sides of the
 * build:
 *
 *  - Presentation modules  → `MV-IMG-DEVICE-LAPTOP` / `MV-IMG-DEVICE-MONITOR`
 *  - Print section modules → `pm-device-*`
 *
 * Everything is inline-styled and sized in percentages + `aspect-ratio`, so the
 * chassis scales with whatever box it is dropped into (a 1920-wide slide stage,
 * a cq-scaled print page, or a 240px library thumbnail) without a single
 * hard-coded pixel — which is what keeps the rasterised PDF/PPTX exports
 * pixel-identical to the on-screen render.
 *
 * The screen is a plain positioned box: callers drop a `MediaTile`, an
 * `EditableImage`, a video, or the built-in wireframe placeholder into it, so
 * the *image on the monitor is always replaceable* by the host surface.
 */

import type { CSSProperties, ReactNode } from "react";

export type DeviceKind = "laptop" | "monitor";
export type DeviceTone = "graphite" | "silver" | "ink";

/** Screen aspect per device — laptop lids are taller than desktop panels. */
export function deviceScreenAspect(kind: DeviceKind): number {
  return kind === "laptop" ? 16 / 10 : 16 / 9;
}

/** Normalise loose authored values ("Laptop", "desktop", undefined). */
export function deviceKindFrom(value: unknown, fallback: DeviceKind = "laptop"): DeviceKind {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  if (v === "laptop" || v === "notebook") return "laptop";
  if (v === "monitor" || v === "desktop" || v === "display") return "monitor";
  return fallback;
}

function chassis(tone: DeviceTone): { body: string; edge: string; deep: string; ink: string } {
  if (tone === "silver") {
    return {
      body: "linear-gradient(160deg, #F3F5F9 0%, #D9DEE8 46%, #EEF1F6 100%)",
      edge: "rgba(3,0,44,0.16)",
      deep: "linear-gradient(180deg, #E6EAF1 0%, #C4CBD8 100%)",
      ink: "rgba(3,0,44,0.55)",
    };
  }
  if (tone === "ink") {
    return {
      body: "linear-gradient(160deg, #1B2333 0%, #0B1120 52%, #131A28 100%)",
      edge: "rgba(255,255,255,0.14)",
      deep: "linear-gradient(180deg, #232C3D 0%, #0A0F1B 100%)",
      ink: "rgba(255,255,255,0.5)",
    };
  }
  return {
    body: "linear-gradient(160deg, #3A4150 0%, #222936 50%, #2E3644 100%)",
    edge: "rgba(255,255,255,0.16)",
    deep: "linear-gradient(180deg, #444C5C 0%, #1C2230 100%)",
    ink: "rgba(255,255,255,0.55)",
  };
}

type Props = {
  kind?: DeviceKind;
  tone?: DeviceTone;
  /** Screen content — image, video, or `<DeviceScreenPlaceholder />`. */
  children?: ReactNode;
  /** Brand accent used for the ambient bloom under the device. */
  accent?: string;
  /** Soft ambient glow + contact shadow under the chassis. Off for print. */
  shadow?: boolean;
  /** Specular glass sheen over the screen. */
  glare?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * Device chassis with a live screen slot. Fills the width it is given; height
 * follows from the device geometry, so place it in a flex/grid cell and let it
 * find its own size.
 */
export function DeviceFrame({
  kind = "laptop",
  tone = "graphite",
  children,
  accent = "#003FC7",
  shadow = true,
  glare = true,
  className,
  style,
}: Props) {
  const c = chassis(tone);
  const aspect = deviceScreenAspect(kind);

  const screen = (
    <div
      data-device-screen={kind}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: `${aspect}`,
        overflow: "hidden",
        background: "#05070D",
        borderRadius: kind === "laptop" ? "0.6%" : "0.4%",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
      {glare && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(115deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.06) 18%, rgba(255,255,255,0) 38%, rgba(255,255,255,0) 100%)",
          }}
        />
      )}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.10)",
        }}
      />
    </div>
  );

  return (
    <div
      data-device-frame={kind}
      className={className}
      style={{ position: "relative", width: "100%", ...style }}
    >
      {shadow && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "-6%",
            right: "-6%",
            bottom: "-6%",
            height: "26%",
            pointerEvents: "none",
            background: `radial-gradient(60% 100% at 50% 100%, color-mix(in srgb, ${accent} 34%, transparent) 0%, rgba(3,0,44,0.16) 42%, rgba(3,0,44,0) 78%)`,
            filter: "blur(6px)",
          }}
        />
      )}

      {/* Lid / bezel */}
      <div
        style={{
          position: "relative",
          padding: kind === "laptop" ? "1.1%" : "1.4%",
          paddingBottom: kind === "laptop" ? "1.6%" : "3.2%",
          background: c.body,
          border: `1px solid ${c.edge}`,
          borderRadius: kind === "laptop" ? "1.6%" : "1.1%",
          boxShadow: shadow ? "0 2% 4% rgba(3,0,44,0.18)" : undefined,
        }}
      >
        {screen}
        {kind === "laptop" ? (
          // Lid chin + camera pinhole
          <div
            aria-hidden
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: "0.5%",
            }}
          >
            <span
              style={{
                width: "0.5%",
                aspectRatio: "1",
                borderRadius: "50%",
                background: c.ink,
                opacity: 0.75,
              }}
            />
          </div>
        ) : (
          // Monitor chin with a small brand tick
          <div
            aria-hidden
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: "0.8%",
            }}
          >
            <span
              style={{
                width: "6%",
                aspectRatio: "24 / 1",
                borderRadius: 999,
                background: c.ink,
                opacity: 0.5,
              }}
            />
          </div>
        )}
      </div>

      {kind === "laptop" ? (
        <>
          {/* Hinge deck — wider than the lid and tapered, as seen head-on */}
          <div
            aria-hidden
            style={{
              width: "112%",
              marginLeft: "-6%",
              aspectRatio: "112 / 2.6",
              background: c.deep,
              borderBottomLeftRadius: "40%",
              borderBottomRightRadius: "40%",
              borderTop: `1px solid ${c.edge}`,
              clipPath: "polygon(1.5% 0%, 98.5% 0%, 96% 100%, 4% 100%)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            {/* Trackpad notch */}
            <span
              style={{
                width: "14%",
                aspectRatio: "22 / 1",
                marginTop: "0.15%",
                borderBottomLeftRadius: 999,
                borderBottomRightRadius: 999,
                background: "rgba(0,0,0,0.35)",
              }}
            />
          </div>
          <div
            aria-hidden
            style={{
              width: "104%",
              marginLeft: "-2%",
              aspectRatio: "104 / 0.5",
              background: "rgba(3,0,44,0.22)",
              borderBottomLeftRadius: 999,
              borderBottomRightRadius: 999,
            }}
          />
        </>
      ) : (
        <>
          {/* Neck */}
          <div
            aria-hidden
            style={{
              width: "11%",
              margin: "0 auto",
              aspectRatio: "11 / 6",
              background: c.deep,
              clipPath: "polygon(16% 0%, 84% 0%, 100% 100%, 0% 100%)",
            }}
          />
          {/* Foot */}
          <div
            aria-hidden
            style={{
              width: "34%",
              margin: "0 auto",
              aspectRatio: "34 / 1.5",
              background: c.deep,
              borderRadius: 999,
              border: `1px solid ${c.edge}`,
            }}
          />
        </>
      )}
    </div>
  );
}

/**
 * Neutral product-UI wireframe shown when no screenshot has been supplied yet.
 * Deliberately abstract (chrome bar, rail, cards, chart) so a module reads as a
 * software screen in the library without shipping fake data.
 */
export function DeviceScreenPlaceholder({
  accent = "#003FC7",
  label,
}: {
  accent?: string;
  label?: string;
}) {
  const card = (h: string, o: number) => (
    <div
      style={{
        height: h,
        borderRadius: "2%",
        background: `color-mix(in srgb, ${accent} ${o}%, #FFFFFF)`,
      }}
    />
  );
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #FFFFFF 0%, #F2F5FB 100%)",
      }}
    >
      {/* Window chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.2%",
          padding: "1.6% 2.4%",
          borderBottom: "1px solid rgba(3,0,44,0.08)",
          background: "rgba(255,255,255,0.9)",
        }}
      >
        {[0.5, 0.35, 0.22].map((o, i) => (
          <span
            key={i}
            style={{
              width: "1.4%",
              aspectRatio: "1",
              borderRadius: "50%",
              background: `color-mix(in srgb, ${accent} ${o * 100}%, #E7ECF6)`,
            }}
          />
        ))}
        <span
          style={{
            marginLeft: "2%",
            height: "6%",
            minHeight: 4,
            flex: 1,
            borderRadius: 999,
            background: "rgba(3,0,44,0.06)",
          }}
        />
      </div>
      {/* Body: rail + content */}
      <div style={{ display: "flex", flex: 1, gap: "2.4%", padding: "2.4%" }}>
        <div style={{ width: "18%", display: "grid", gap: "8%", alignContent: "start" }}>
          {card("8%", 40)}
          {card("6%", 14)}
          {card("6%", 14)}
          {card("6%", 14)}
        </div>
        <div style={{ flex: 1, display: "grid", gap: "3%", gridTemplateRows: "22% 1fr" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3%" }}>
            {card("100%", 22)}
            {card("100%", 14)}
            {card("100%", 14)}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "2.5%",
              padding: "3%",
              borderRadius: "1.5%",
              background: "#FFFFFF",
              border: "1px solid rgba(3,0,44,0.08)",
            }}
          >
            {[38, 62, 48, 82, 58, 94, 70].map((h, i) => (
              <span
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  borderRadius: "6% 6% 0 0",
                  background: `color-mix(in srgb, ${accent} ${28 + i * 9}%, #E4EAF6)`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      {label && (
        <div
          style={{
            padding: "1.4% 2.4%",
            fontSize: "2.4%",
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: accent,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

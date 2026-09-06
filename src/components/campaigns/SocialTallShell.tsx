// SocialTallShell — the designed tall composition for thin strip modules.
//
// An inline quote, a credential pill row, an icon strip, a CTA band or a
// contact card is a horizontal band by construction: its height follows its
// width, so no amount of enlarging (the growth ladder) or padding (the air
// ladder) makes it fill a square, portrait or story frame. Rather than stretch
// it — which inflates the fill reading without designing anything — this shell
// gives the module editorial furniture that fills the frame honestly:
//
//   accent rule + marker            (head band)
//   ─────────────────────────────
//   ┌───────────────────────────┐
//   │                           │   raised panel spanning the safe rect,
//   │        the module         │   module centred inside it
//   │                           │
//   └───────────────────────────┘
//   hairline ticks + accent dots     (spec rail, clears the brand lockup)
//
// Geometry lives in `social-tall-layouts.ts` so the fit engine can budget the
// module against the panel's inner height instead of the whole frame.

import type { ReactNode } from "react";

import type { SocialTallShellGeometry } from "@/lib/social-tall-layouts";

export type SocialTallShellProps = {
  geometry: SocialTallShellGeometry;
  /** Safe rect the shell fills. */
  safe: { left: number; top: number; width: number; height: number };
  accent: string;
  mode: "light" | "dark";
  /** Small uppercase marker in the head band (module family, format, etc). */
  marker?: string;
  children: ReactNode;
};

export function SocialTallShell({
  geometry,
  safe,
  accent,
  mode,
  marker,
  children,
}: SocialTallShellProps) {
  const dark = mode === "dark";
  const ink = dark ? "#FFFFFF" : "#03002C";
  const gap = Math.round(safe.height * 0.025);
  const panelSurface = dark ? "rgba(255,255,255,0.07)" : "#FFFFFF";
  const panelEdge = dark ? "rgba(255,255,255,0.16)" : "rgba(3,0,44,0.08)";
  const hairline = dark ? "rgba(255,255,255,0.22)" : "rgba(3,0,44,0.14)";
  const tickCount = 9;

  return (
    <div
      style={{
        position: "absolute",
        left: safe.left,
        top: safe.top,
        width: safe.width,
        height: safe.height,
        display: "flex",
        flexDirection: "column",
        gap,
      }}
    >
      {/* Head band — an accent rule and marker; when the panel has collapsed
        onto a short strip the band inherits the slack and becomes a display
        stack (rule, marker, hairline grid) rather than empty space. */}
      <div
        style={{
          height: geometry.headHeight,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: Math.round(safe.height * 0.018),
        }}
      >
        {geometry.headHeight > safe.height * 0.16 ? (
          <div
            style={{
              flex: 1,
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: Math.round(safe.height * 0.014),
              overflow: "hidden",
            }}
          >
            {/* Oversized ghost marker — the editorial anchor of the tall frame. */}
            {marker ? (
              <span
                aria-hidden
                style={{
                  color: ink,
                  opacity: dark ? 0.16 : 0.1,
                  fontWeight: 700,
                  // Sized to the marker's own length so the ghost word always
                  // sits on one line inside the safe rect.
                  fontSize: Math.min(
                    Math.round(geometry.headHeight * 0.42),
                    Math.round((safe.width * 1.05) / Math.max(8, marker.length)),
                  ),
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "clip",
                }}
              >
                {marker}
              </span>
            ) : null}
            <div style={{ display: "flex", gap: Math.round(safe.width * 0.02), alignItems: "flex-end" }}>
              {[0.34, 0.2, 0.12, 0.07].map((h, i) => (
                <span
                  key={h}
                  style={{
                    flex: 1,
                    height: Math.round(geometry.headHeight * h),
                    background: i === 0 ? accent : hairline,
                    opacity: i === 0 ? 0.9 : 0.7,
                    borderRadius: 2,
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: Math.round(safe.width * 0.03),
          }}
        >
          <span
            style={{
              width: Math.round(safe.width * 0.13),
              height: Math.max(5, Math.round(safe.height * 0.007)),
              background: accent,
              borderRadius: 999,
            }}
          />
          <span style={{ flex: 1, height: 1, background: hairline }} />
          {marker ? (
            <span
              style={{
                color: ink,
                opacity: 0.6,
                fontSize: Math.round(safe.width * 0.026),
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {marker}
            </span>
          ) : null}
        </div>
      </div>


      {/* Raised panel — the module lives centred inside this. */}
      <div
        style={{
          height: geometry.panelHeight,
          borderRadius: geometry.radius,
          background: panelSurface,
          border: `1px solid ${panelEdge}`,
          boxShadow: dark
            ? "0 24px 60px rgba(0,0,0,0.34)"
            : "0 24px 60px rgba(3,0,44,0.12)",
          padding: geometry.panelPad,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Quiet accent corner so the panel is not a plain white box. */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: Math.round(safe.width * 0.34),
            height: Math.max(4, Math.round(safe.height * 0.005)),
            background: accent,
            opacity: dark ? 0.9 : 0.85,
          }}
        />
        <div style={{ width: "100%" }}>{children}</div>
      </div>

      {/* Spec rail — hairline spec rows and accent ticks under the panel. */}
      <div
        style={{
          height: geometry.railHeight,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          gap: Math.round(safe.height * 0.012),
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: Math.round(safe.width * 0.02) }}>
          {Array.from({ length: tickCount }).map((_, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: i % 3 === 0 ? Math.round(safe.height * 0.022) : Math.round(safe.height * 0.012),
                borderLeft: `1px solid ${i % 3 === 0 ? accent : hairline}`,
                opacity: i % 3 === 0 ? 0.85 : 1,
              }}
            />
          ))}
        </div>
        {geometry.railHeight > safe.height * 0.16
          ? Array.from(
              // Rows scale with the rail so the bottom of the frame is ruled all
              // the way down rather than trailing off into empty space.
              { length: Math.max(3, Math.min(8, Math.round(geometry.railHeight / (safe.height * 0.055)))) },
              (_, i) => 0.92 - i * 0.11,
            ).map((w, i) => (
              <div
                key={w}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: Math.round(safe.width * 0.02),
                  paddingTop: Math.round(safe.height * 0.008),
                  borderTop: `1px solid ${hairline}`,
                }}
              >
                <span
                  style={{
                    width: Math.max(4, Math.round(safe.width * 0.012)),
                    height: Math.max(4, Math.round(safe.width * 0.012)),
                    borderRadius: 999,
                    background: i === 0 ? accent : hairline,
                  }}
                />
                <span style={{ width: `${Math.max(0.2, w) * 100}%`, height: 1, background: hairline }} />
              </div>
            ))
          : null}
      </div>
    </div>
  );
}

// SocialFullBleedShell — the designed full-bleed portrait composition.
//
// Photo Fade hero and Desktop Monitor showcase are the two library modules whose
// subject is an image, not type. On a printed sheet the picture feathers into
// the stock and the monitor sits inside the type area; in a square, portrait or
// story frame that reads as a small object stranded on paper. This shell
// re-composes both for the shape:
//
//   photo   picture covers the whole frame, ground-up scrim, copy anchored low
//   device  brand ground, chassis over-scanned so the screen breaks both edges
//
// Geometry lives in `social-full-bleed.ts` so the fit engine can budget the
// module against the content box rather than the whole frame.

import type { ReactNode } from "react";

import type { SocialFullBleedGeometry } from "@/lib/social-full-bleed";

export type SocialFullBleedShellProps = {
  geometry: SocialFullBleedGeometry;
  /** Frame size in format px. */
  frame: { width: number; height: number };
  accent: string;
  mode: "light" | "dark";
  /** Photograph for the plate (photo kind). */
  imageUrl?: string;
  /** Focal point, 0–100. */
  focalX?: number;
  focalY?: number;
  children: ReactNode;
};

export function SocialFullBleedShell({
  geometry,
  frame,
  accent,
  mode,
  imageUrl,
  focalX = 50,
  focalY = 50,
  children,
}: SocialFullBleedShellProps) {
  const photo = geometry.kind === "photo";
  const ink = "#03002C";
  const ground = photo
    ? `linear-gradient(180deg, ${accent} 0%, ${ink} 100%)`
    : mode === "dark"
      ? `linear-gradient(180deg, ${ink} 0%, color-mix(in srgb, ${accent} 34%, ${ink}) 100%)`
      : `linear-gradient(180deg, #FFFFFF 0%, color-mix(in srgb, ${accent} 8%, #FFFFFF) 62%, color-mix(in srgb, ${accent} 16%, #FFFFFF) 100%)`;

  return (
    <>
      {/* Plate — always edge to edge, never inset by the safe rect. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: ground,
          overflow: "hidden",
        }}
      >
        {photo && imageUrl ? (
          <img
            alt=""
            src={imageUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: `${focalX}% ${focalY}%`,
              display: "block",
            }}
          />
        ) : null}
      </div>

      {photo ? (
        <>
          {/* Ground-up scrim: the copy zone earns its contrast from the picture
              itself rather than from a flat panel dropped on top of it. */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg, rgba(3,0,44,0.34) 0%, rgba(3,0,44,0.06) ${Math.round(
                geometry.scrimStart * 100,
              )}%, rgba(3,0,44,0.62) 74%, rgba(3,0,44,0.9) 100%)`,
            }}
          />
          {/* Accent hairline at the seam where the copy zone begins. */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: geometry.left,
              top: Math.max(0, geometry.top - Math.round(frame.height * 0.02)),
              width: Math.round(geometry.width * 0.22),
              height: Math.max(3, Math.round(frame.height * 0.005)),
              background: accent,
            }}
          />
        </>
      ) : (
        <>
          {/* Device ground furniture: a soft accent halo behind the chassis and
              a baseline rule so the over-scanned screen has something to sit on. */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: geometry.top,
              height: geometry.height,
              background: `radial-gradient(70% 46% at 50% 44%, color-mix(in srgb, ${accent} ${
                mode === "dark" ? 46 : 22
              }%, transparent) 0%, transparent 72%)`,
            }}
          />
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: geometry.top + geometry.height,
              height: Math.max(2, Math.round(frame.height * 0.003)),
              background: `color-mix(in srgb, ${accent} 55%, transparent)`,
            }}
          />
        </>
      )}

      <div
        style={{
          position: "absolute",
          left: geometry.left,
          top: geometry.top,
          width: geometry.width,
          height: geometry.height,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: photo ? "flex-end" : "center",
        }}
      >
        {children}
      </div>
    </>
  );
}

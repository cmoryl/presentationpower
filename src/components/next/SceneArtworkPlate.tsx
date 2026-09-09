// Light-matched artwork on an in-situ visualisation plate.
//
// The artwork rectangle is already measured and contain-fitted at the item's
// true trim ratio by the caller — this component only makes it *sit* in the
// photograph: it picks up the plate's light direction, ambient colour cast and
// exposure, gains a contact shadow against the surface, a thin substrate edge
// and, on laminated stock, a faint specular sheen.
//
// Artwork can be a flat image (London panel proofs) or live DOM (a NEXT MART
// PillarSign master), so the face accepts children and an optional ref.

import type { ReactNode, Ref } from "react";

import { sceneLighting, shadeAngle, shadowOffset } from "@/lib/scene-lighting";

export interface SceneArtworkPlateProps {
  /** Measured artwork box as fractions of the rendered plate. */
  box: { x: number; y: number; w: number; h: number };
  /** Scene id, used to look up the plate's light. */
  sceneId: string;
  /** The artwork itself — an <img> or a live master. */
  children: ReactNode;
  /** Ref on the face element, for callers that measure it. */
  faceRef?: Ref<HTMLDivElement>;
  /**
   * The full measured placement area. When the print's true trim ratio does
   * not use all of it, the leftover fixture is dressed with `substrate` so the
   * print reads as mounted on a banner or panel rather than floating in a
   * blank block.
   */
  face?: { x: number; y: number; w: number; h: number };
  /** A stretched, defocused copy of the artwork used to dress the fixture. */
  substrate?: ReactNode;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(4)}%`;
}

export function SceneArtworkPlate({
  box,
  sceneId,
  children,
  faceRef,
  face,
  substrate,
}: SceneArtworkPlateProps) {
  const light = sceneLighting(sceneId);
  const angle = shadeAngle(light.direction);
  const off = shadowOffset(light.direction);
  const portrait = box.h >= box.w;
  // Shadow spread scales with the smaller edge so a tall banner and a wide
  // fascia both cast a plausible shadow rather than one measured in plate px.
  const spread = Math.max(0.006, Math.min(box.w, box.h) * 0.09);
  const dropShadow =
    light.edge === "reveal"
      ? `inset 0 0 0 1px rgba(255,255,255,0.22), inset 0 0 0 2px rgba(3,0,44,0.10), 0 ${(spread * 40).toFixed(1)}px ${(spread * 90).toFixed(1)}px rgba(3,0,44,${(light.contact * 0.5).toFixed(3)})`
      : `0 ${(spread * 26).toFixed(1)}px ${(spread * 70).toFixed(1)}px rgba(3,0,44,${(light.contact * 0.35).toFixed(3)})`;

  return (
    <>
      {/* Contact shadow: sits behind the print, offset away from the light. */}
      <div
        aria-hidden="true"
        className="absolute"
        style={{
          left: pct(box.x + off.x),
          top: pct(box.y + off.y),
          width: pct(box.w),
          height: pct(box.h),
          background: "rgba(6,4,26,1)",
          opacity: light.contact,
          filter: `blur(${(spread * 100).toFixed(2)}px)`,
        }}
      />

      <div
        ref={faceRef}
        className="absolute overflow-hidden"
        style={{
          left: pct(box.x),
          top: pct(box.y),
          width: pct(box.w),
          height: pct(box.h),
          // Substrate edge: a printed panel shows a hairline reveal, an applied
          // vinyl or banner sits flush with no border at all.
          boxShadow: dropShadow,
        }}
      >
        {/* Exposure match only — hue and saturation stay effectively untouched
            so the brand colours in the proof remain the brand colours. */}
        <div
          className="absolute inset-0"
          style={{
            filter: `brightness(${light.exposure}) saturate(0.985) contrast(0.99)`,
          }}
        >
          {children}
        </div>

        {/* Ambient colour cast of the room, over the whole face. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: light.tint,
            opacity: light.tintStrength,
            mixBlendMode: "soft-light",
          }}
        />

        {/* Directional falloff across the face, away from the light source. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: `linear-gradient(${angle}deg, rgba(255,255,255,${(light.falloff * 0.5).toFixed(3)}) 0%, rgba(255,255,255,0) 38%, rgba(3,0,44,${(light.falloff * 0.55).toFixed(3)}) 100%)`,
            mixBlendMode: "overlay",
          }}
        />

        {/* Edge shading: every print darkens slightly where it turns away. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 120% at 50% 45%, rgba(255,255,255,0) 58%, rgba(3,0,44,0.16) 100%)",
            mixBlendMode: "multiply",
          }}
        />

        {/* Specular sheen for laminated stock, raked with the light. */}
        {light.sheen > 0.02 ? (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: portrait
                ? `linear-gradient(${angle + 12}deg, rgba(255,255,255,${light.sheen.toFixed(3)}) 0%, rgba(255,255,255,0) 26%, rgba(255,255,255,0) 74%, rgba(255,255,255,${(light.sheen * 0.5).toFixed(3)}) 100%)`
                : `linear-gradient(${angle + 78}deg, rgba(255,255,255,${light.sheen.toFixed(3)}) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 78%, rgba(255,255,255,${(light.sheen * 0.4).toFixed(3)}) 100%)`,
              mixBlendMode: "screen",
            }}
          />
        ) : null}
      </div>
    </>
  );
}

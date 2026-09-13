// Light-matched, perspective-mounted artwork on an in-situ scene plate.
//
// The artwork rectangle is already measured and contain-fitted at the item's
// true trim ratio by the caller. This component makes it *belong to* the
// photograph:
//
//  1. Geometry — when the scene carries a measured face quad (the four corners
//     of the printed face as they appear in the plate), the print is warped onto
//     it with a real projective transform, so a floor graphic lies on the floor
//     and a wall run recedes with the wall instead of floating square-on.
//  2. Light — it picks up the plate's light direction, ambient colour cast and
//     exposure, gains a contact shadow, an edge reveal on panel stock, floor
//     bounce along its bottom edge and a raked specular sheen on laminate.
//  3. Camera — it takes the plate's own sensor grain and a hair of lens
//     softness, scaled up on surfaces raked away from the lens, so it is not
//     digitally cleaner than the photograph it sits in.
//
// Artwork can be a flat image (London panel proofs) or live DOM (a NEXT MART
// PillarSign master), so the face accepts children and an optional ref.

import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";

import { castShadow, sceneLighting, sceneLightQuality, shadeAngle } from "@/lib/scene-lighting";
import { depthGradientAngle, depthMaskDirection, sceneSpace } from "@/lib/scene-space";
import {
  faceQuadTransform,
  isQuadSkewed,
  quadForeshortening,
  type SceneQuad,
} from "@/lib/scene-perspective";
import { sceneSurface, surfaceCastScale } from "@/lib/scene-surface";
import type { SceneKind } from "@/lib/next-london-scenes";

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
  /**
   * Measured corners of the printed face on the plate, clockwise from
   * top-left. Supplied for every surface seen at an angle.
   */
  quad?: SceneQuad;
  /**
   * What the print is installed on. This decides the substrate behaviour: a
   * flush vinyl casts nothing, a board on a standoff throws a real shadow, a
   * hung banner drapes, a floor graphic is walked on. Omitted falls back to a
   * board on a wall.
   */
  kind?: SceneKind;
  /** How the artwork is mounted on that surface, from the scene definition. */
  mount?: "edge" | "cover";
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(4)}%`;
}

/** Sensor grain, matched to the plate's own noise. */
const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='160' height='160' filter='url(#n)'/></svg>",
)}")`;

/** Live pixel size of the warp host, so the homography can be built in px. */
function useElementSize(enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const read = () => {
      const r = el.getBoundingClientRect();
      setSize((prev) =>
        Math.abs(prev.w - r.width) < 0.5 && Math.abs(prev.h - r.height) < 0.5
          ? prev
          : { w: r.width, h: r.height },
      );
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [enabled]);

  return { ref, size };
}

export function SceneArtworkPlate({
  box,
  sceneId,
  children,
  faceRef,
  face,
  substrate,
  quad,
  kind,
  mount,
}: SceneArtworkPlateProps) {
  const light = sceneLighting(sceneId);
  const quality = sceneLightQuality(sceneId);
  const angle = shadeAngle(light.direction);
  const portrait = box.h >= box.w;
  // What the print is mounted on. This, not a fixed drop shadow, decides how it
  // meets its surface.
  const finish = sceneSurface(kind, mount);
  const castScale = surfaceCastScale(finish);

  // Perspective: the print is warped from the measured face rectangle onto the
  // measured face quad. Frontal surfaces skip the warp entirely so their print
  // stays pixel-exact and unresampled.
  const warpDomain: Rect = face ?? box;
  const warped = isQuadSkewed(quad);
  const { ref: hostRef, size } = useElementSize(warped);
  const transform = useMemo(
    () => (warped ? faceQuadTransform(quad, warpDomain, size) : null),
    [warped, quad, warpDomain, size],
  );
  const fore = quad ? quadForeshortening(quad) : 1;
  // A raked surface reads flatter, so it needs a longer contact shadow, more
  // lens softness and a touch more falloff than a square-on wall.
  const rake = Math.min(1, Math.max(0, 1 - fore));
  const local = (r: Rect): Rect =>
    warped
      ? {
          x: (r.x - warpDomain.x) / (warpDomain.w || 1),
          y: (r.y - warpDomain.y) / (warpDomain.h || 1),
          w: r.w / (warpDomain.w || 1),
          h: r.h / (warpDomain.h || 1),
        }
      : r;

  const boxL = local(box);
  // Shadow spread scales with the smaller edge so a tall banner and a wide
  // fascia both cast a plausible shadow rather than one measured in plate px.
  const spread = Math.max(0.006, Math.min(boxL.w, boxL.h) * 0.09) * (1 + rake * 0.5);
  const contact = Math.min(0.85, light.contact * (1 + rake * 0.55));
  // The reveal and the drop only belong to a board standing off its surface. An
  // applied film, a hung textile and anything horizontal show neither: a flush
  // vinyl with a drop shadow under it is exactly what makes a render look pasted
  // on. Those substrates get an occlusion line along the edge they meet instead.
  const standoff = finish.contact === "standoff";
  const dropShadow = standoff
    ? `inset 0 0 0 1px rgba(255,255,255,${(0.14 + finish.gloss * 0.3).toFixed(3)}), inset 0 0 0 2px rgba(3,0,44,0.10), 0 ${(spread * 40 * castScale).toFixed(1)}px ${(spread * 90 * castScale).toFixed(1)}px rgba(3,0,44,${(contact * 0.5).toFixed(3)})`
    : finish.contact === "hung"
      ? `0 ${(spread * 30 * castScale).toFixed(1)}px ${(spread * 78 * castScale).toFixed(1)}px rgba(3,0,44,${(contact * 0.32).toFixed(3)})`
      : `inset 0 0 0 1px rgba(3,0,44,${(finish.occlusion * 0.45).toFixed(3)})`;
  const softness = Math.max(0, light.softness * (1 + rake * 0.8) * 0.6);
  // Cast shadow read from the plate's own light: direction from its azimuth,
  // length from its elevation, softness from how hard the source is — then
  // scaled by how far this substrate actually stands off its surface.
  const rawCast = castShadow(quality, contact);
  const cast = {
    ...rawCast,
    x: rawCast.x * castScale,
    y: rawCast.y * castScale,
    opacity: rawCast.opacity * Math.min(1, castScale),
  };
  const showCast = castScale > 0.12;
  // Occlusion along the fixed edge: light cannot reach the join, so a hung or
  // applied print is always slightly darker where it is fixed.
  const occlusionEdge =
    finish.fixedEdge === "top"
      ? "to bottom"
      : finish.fixedEdge === "bottom"
        ? "to top"
        : finish.fixedEdge === "left"
          ? "to right"
          : null;
  const texture: string | null =
    finish.texture <= 0.02
      ? null
      : finish.textureKind === "weave"
        ? "repeating-linear-gradient(0deg, rgba(3,0,44,0.5) 0px, rgba(3,0,44,0) 1px, rgba(3,0,44,0) 2px), repeating-linear-gradient(90deg, rgba(3,0,44,0.4) 0px, rgba(3,0,44,0) 1px, rgba(3,0,44,0) 2px)"
        : finish.textureKind === "board"
          ? "repeating-linear-gradient(90deg, rgba(255,255,255,0.16) 0px, rgba(255,255,255,0) 3px, rgba(3,0,44,0.12) 6px, rgba(3,0,44,0) 9px)"
          : finish.textureKind === "floor"
            ? "repeating-linear-gradient(58deg, rgba(255,255,255,0.13) 0px, rgba(255,255,255,0) 2px, rgba(3,0,44,0.1) 5px, rgba(3,0,44,0) 11px)"
            : "repeating-linear-gradient(12deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0) 6px, rgba(3,0,44,0.07) 13px, rgba(3,0,44,0) 22px)";

  // Spatial read of the surface: where the camera stood, which end of the print
  // is deeper into the room, and how much haze, shade and defocus that far end
  // has to take. A flat value across the print would still read as pasted on;
  // these run as a gradient down the depth axis.
  const space = quad ? sceneSpace(quad) : null;
  const depthAngle = space ? depthGradientAngle(space.depthAxis) : 180;
  const farSide = space ? depthMaskDirection(space.depthAxis) : "to bottom";
  const showDepth = !!space && space.depthAxis !== "none";
  const defocus = space && showDepth ? space.defocus : 0;

  // Dress the rest of the fixture when the print's true ratio leaves part of
  // the measured placement area unused.
  const dress =
    face && substrate && (face.w > box.w * 1.04 || face.h > box.h * 1.04) ? local(face) : null;

  const content = (
    <>
      {dress ? (
        <div
          aria-hidden="true"
          className="absolute overflow-hidden"
          style={{
            left: pct(dress.x),
            top: pct(dress.y),
            width: pct(dress.w),
            height: pct(dress.h),
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              filter: `blur(14px) brightness(${(light.exposure * 0.94).toFixed(3)}) saturate(1.02)`,
              transform: "scale(1.14)",
            }}
          >
            {substrate}
          </div>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 120% at 50% 45%, rgba(255,255,255,0) 55%, rgba(3,0,44,0.22) 100%)",
              mixBlendMode: "multiply",
            }}
          />
        </div>
      ) : null}

      {/* Cast shadow: thrown away from the light, at the length its elevation
          allows, softened to match the source, and only as far as this
          substrate's standoff actually lifts the print off its surface. */}
      {showCast ? (
        <div
          aria-hidden="true"
          className="absolute"
          style={{
            left: pct(boxL.x + cast.x),
            top: pct(boxL.y + cast.y),
            width: pct(boxL.w),
            height: pct(boxL.h),
            background: "rgba(6,4,26,1)",
            opacity: cast.opacity,
            filter: `blur(${(spread * 100 * cast.blur * 0.55).toFixed(2)}px)`,
          }}
        />
      ) : null}
      {/* Contact shadow: the tight, dark line right where the print meets the
          surface, present under every light no matter how soft. A flush film
          keeps only a hairline of it; nothing horizontal gets one at all. */}
      {finish.contact !== "ground" ? (
        <div
          aria-hidden="true"
          className="absolute"
          style={{
            left: pct(boxL.x),
            top: pct(boxL.y + Math.max(0.0015, cast.y * 0.28)),
            width: pct(boxL.w),
            height: pct(boxL.h),
            background: "rgba(6,4,26,1)",
            opacity: Math.min(0.7, contact * 0.55 * Math.max(0.22, castScale)),
            filter: `blur(${(spread * 26 * Math.max(0.4, castScale)).toFixed(2)}px)`,
          }}
        />
      ) : null}

      <div
        ref={faceRef}
        className="absolute overflow-hidden"
        style={{
          left: pct(boxL.x),
          top: pct(boxL.y),
          width: pct(boxL.w),
          height: pct(boxL.h),
          // Substrate edge: a printed panel shows a hairline reveal, an applied
          // vinyl or banner sits flush with no border at all.
          boxShadow: dropShadow,
        }}
      >
        {/* Exposure match and lens softness only — hue and saturation stay
            effectively untouched so brand colours stay brand colours. */}
        <div
          className="absolute inset-0"
          style={{
            filter: `brightness(${light.exposure}) saturate(0.985) contrast(0.99)${
              softness > 0.05 ? ` blur(${softness.toFixed(2)}px)` : ""
            }`,
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
            background: `linear-gradient(${angle}deg, rgba(255,255,255,${(light.falloff * 0.5).toFixed(3)}) 0%, rgba(255,255,255,0) 38%, rgba(3,0,44,${(light.falloff * (0.55 + rake * 0.25)).toFixed(3)}) 100%)`,
            mixBlendMode: "overlay",
          }}
        />

        {/* Floor bounce: light returning into the bottom edge of the print. */}
        {light.bounce > 0.02 ? (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: `linear-gradient(0deg, rgba(255,246,232,${light.bounce.toFixed(3)}) 0%, rgba(255,246,232,0) ${(18 + light.bounce * 60).toFixed(0)}%)`,
              mixBlendMode: "screen",
            }}
          />
        ) : null}

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

        {/* Substrate texture: fabric weave, film orange peel, board seams or
            anti-slip floor grain. It is what a print is actually made of. */}
        {texture ? (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage: texture,
              opacity: finish.texture * (1 - rake * 0.3),
              mixBlendMode: "overlay",
            }}
          />
        ) : null}

        {/* Drape: a hung textile is never a plane. Soft vertical relief, and a
            sag that shades the print away from its top pocket. */}
        {finish.drape > 0.02 ? (
          <>
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                backgroundImage: `repeating-linear-gradient(90deg, rgba(3,0,44,${(finish.drape * 0.16).toFixed(3)}) 0%, rgba(3,0,44,0) 6%, rgba(255,255,255,${(finish.drape * 0.12).toFixed(3)}) 11%, rgba(3,0,44,0) 17%)`,
                mixBlendMode: "soft-light",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, rgba(3,0,44,${(finish.drape * 0.2).toFixed(3)}) 0%, rgba(3,0,44,0) 22%)`,
                mixBlendMode: "multiply",
              }}
            />
          </>
        ) : null}

        {/* Occlusion at the fixed edge: light cannot reach the join, so the
            print is darkest exactly where it is held. */}
        {occlusionEdge && finish.occlusion > 0.05 ? (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: `linear-gradient(${occlusionEdge}, rgba(3,0,44,${(finish.occlusion * 0.5).toFixed(3)}) 0%, rgba(3,0,44,0) ${(10 + finish.occlusion * 24).toFixed(0)}%)`,
              mixBlendMode: "multiply",
            }}
          />
        ) : null}

        {/* Transmission: film on glazing is lit from behind as well as in front,
            so it glows on its light side instead of sitting opaque. */}
        {finish.transmit > 0.02 ? (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: `linear-gradient(${angle}deg, rgba(236,244,255,${(finish.transmit * 0.6).toFixed(3)}) 0%, rgba(236,244,255,${(finish.transmit * 0.18).toFixed(3)}) 62%, rgba(236,244,255,0) 100%)`,
              mixBlendMode: "screen",
            }}
          />
        ) : null}

        {/* Wear: floors are walked on, counters and desk fronts are rubbed at
            hand height. Strongest at the edges that actually take the traffic. */}
        {finish.wear > 0.04 ? (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                finish.contact === "ground"
                  ? `radial-gradient(90% 70% at 50% 78%, rgba(255,255,255,${(finish.wear * 0.5).toFixed(3)}) 0%, rgba(255,255,255,0) 62%)`
                  : `linear-gradient(0deg, rgba(226,232,244,${(finish.wear * 0.45).toFixed(3)}) 0%, rgba(226,232,244,0) 18%)`,
              mixBlendMode: "screen",
            }}
          />
        ) : null}

        {/* Specular sheen for laminated stock, raked with the light. */}
        {light.sheen + finish.gloss > 0.06 ? (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              // Gloss decides how strong the highlight is; anisotropy decides
              // whether it is a broad wash (matt board) or a stretched streak
              // (squeegeed film, laminated floor, glass).
              background: (() => {
                const s = Math.min(0.5, light.sheen + finish.gloss * 0.22);
                const rakeAngle = angle + (portrait ? 12 : 78) + finish.anisotropy * 14;
                const near = (26 - finish.anisotropy * 14).toFixed(0);
                const far = (74 + finish.anisotropy * 12).toFixed(0);
                return `linear-gradient(${rakeAngle}deg, rgba(255,255,255,${s.toFixed(3)}) 0%, rgba(255,255,255,0) ${near}%, rgba(255,255,255,0) ${far}%, rgba(255,255,255,${(s * 0.45).toFixed(3)}) 100%)`;
              })(),
              mixBlendMode: "screen",
            }}
          />
        ) : null}

        {/* Open shade filling the shadow side, so the dark half is never dead. */}
        {quality.ambientLift > 0.02 ? (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: `linear-gradient(${angle + 180}deg, rgba(214,228,246,${(quality.ambientLift * 0.5).toFixed(3)}) 0%, rgba(214,228,246,0) 62%)`,
              mixBlendMode: "screen",
            }}
          />
        ) : null}

        {/* Far-end defocus: at a real aperture the deep end of a raked surface
            falls slightly out of focus. Masked so only that end softens. */}
        {defocus > 0.4 ? (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              filter: `blur(${defocus.toFixed(2)}px) brightness(${light.exposure})`,
              maskImage: `linear-gradient(${farSide}, rgba(0,0,0,0) 34%, rgba(0,0,0,1) 100%)`,
              WebkitMaskImage: `linear-gradient(${farSide}, rgba(0,0,0,0) 34%, rgba(0,0,0,1) 100%)`,
            }}
          >
            {children}
          </div>
        ) : null}

        {/* Aerial perspective: the far end is further through the room's air, so
            it hazes and shades a little. This is the depth cue the eye reads
            first. */}
        {showDepth && space ? (
          <>
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background: `linear-gradient(${depthAngle}deg, rgba(3,0,44,${space.farShade.toFixed(3)}) 0%, rgba(3,0,44,0) 62%)`,
                mixBlendMode: "multiply",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background: `linear-gradient(${depthAngle}deg, rgba(226,234,246,${space.haze.toFixed(3)}) 0%, rgba(226,234,246,0) 58%)`,
              }}
            />
          </>
        ) : null}

        {/* Camera grade: highlights roll off, blacks lift, the lens vignettes.
            This is what stops a print looking digitally cleaner than the shot
            it sits in. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: `radial-gradient(130% 130% at 50% 42%, rgba(255,255,255,${(quality.rolloff * 0.22).toFixed(3)}) 0%, rgba(255,255,255,0) 46%, rgba(3,0,44,${(quality.vignette * 0.34).toFixed(3)}) 100%)`,
          }}
        />
        {quality.blackLift > 0.02 ? (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: `rgba(126,138,168,${(quality.blackLift * 0.3).toFixed(3)})`,
              mixBlendMode: "lighten",
            }}
          />
        ) : null}

        {/* Sensor grain, so the print is not cleaner than the photograph. */}
        {light.grain > 0.01 ? (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage: GRAIN_URL,
              backgroundSize: "160px 160px",
              opacity: light.grain,
              mixBlendMode: "overlay",
            }}
          />
        ) : null}
      </div>
    </>
  );

  if (!warped) return content;

  // The warp host stays un-transformed so it can be measured; its child carries
  // the projective transform that lands the face on the photographed surface.
  return (
    <div
      ref={hostRef}
      aria-hidden={false}
      className="absolute"
      style={{
        left: pct(warpDomain.x),
        top: pct(warpDomain.y),
        width: pct(warpDomain.w),
        height: pct(warpDomain.h),
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: transform ?? undefined,
          transformOrigin: "0 0",
          backfaceVisibility: "hidden",
        }}
      >
        {content}
      </div>
    </div>
  );
}

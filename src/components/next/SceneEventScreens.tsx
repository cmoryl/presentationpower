// NEXT 2026 London content on the working displays inside a scene plate.
//
// Every measured display in `next-london-screens.ts` is filled with an
// event-specific frame — the NEXT lockup on an approved ground, with the real
// event dates and venue — so a render never shows another organisation's slide.
//
// The frame is made to belong to the photograph the same way printed artwork is:
//
//  1. Geometry — the frame is warped onto the display's measured quad with a
//     projective transform, so it recedes with the screen instead of being
//     pasted on square.
//  2. Emission — a display emits rather than reflects, so it carries a panel
//     bloom, a black floor no darker than a real panel, and (on LED) the pixel
//     grid and column banding a camera actually resolves.
//  3. Optics — screen glass takes a raked reflection of the room, a projection
//     screen takes the projector hotspot and its fabric, and both take the
//     plate's own grain, exposure and colour cast.
//  4. Spill — the display throws its own light into the room around it, which is
//     the cue that stops a screen looking like a sticker.

import { useEffect, useMemo, useRef, useState } from "react";

import { NEXT_EVENT } from "@/lib/next-event";
import {
  screenCaption,
  screenStops,
  sceneScreens,
  type LondonSceneScreen,
} from "@/lib/next-london-screens";
import { pickNextLogo } from "@/lib/next-logo-vectors";
import { sceneLightQuality, sceneLighting } from "@/lib/scene-lighting";
import { faceQuadTransform, quadBounds } from "@/lib/scene-perspective";

function pct(n: number): string {
  return `${(n * 100).toFixed(4)}%`;
}

const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='160' height='160' filter='url(#n)'/></svg>",
)}")`;

/** Live pixel size of the warp host, so the homography can be built in px. */
function useHostSize() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
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
  }, []);
  return { ref, size };
}

/** The NEXT lockup as inline vector, at the colourway the frame needs. */
function Lockup({ aspect, height }: { aspect: number; height: string }) {
  const { art } = useMemo(() => pickNextLogo("transperfect", aspect, "white", "side"), [aspect]);
  return (
    <svg
      viewBox={`0 0 ${art.w} ${art.h}`}
      style={{ height, width: "auto", display: "block" }}
      aria-hidden="true"
      focusable="false"
    >
      {art.paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill} fillRule={p.fillRule ?? "nonzero"} />
      ))}
    </svg>
  );
}

/** The event-specific frame itself — brand ground, lockup and real event facts. */
function ScreenFrame({ screen }: { screen: LondonSceneScreen }) {
  const stops = screenStops(screen);
  const ground = `linear-gradient(118deg, ${stops.join(", ")})`;
  const ink = "#03002C";

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: ground, containerType: "size" }}
    >
      {/* Deep brand ink behind the copy end of the ground, so white copy holds. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(118deg, ${ink}F2 0%, ${ink}99 42%, ${ink}00 78%)`,
        }}
      />

      {screen.content === "title" ? (
        <div className="absolute inset-0 flex flex-col justify-center gap-[3cqh] px-[7cqw]">
          <Lockup aspect={3.2} height="22cqh" />
          <div
            style={{
              color: "#fff",
              fontSize: "7cqh",
              lineHeight: 1.25,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            {NEXT_EVENT.datesLabel}
          </div>
          <div
            style={{
              color: "#A1FBF9",
              fontSize: "5.4cqh",
              lineHeight: 1.3,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            {NEXT_EVENT.venue}
          </div>
        </div>
      ) : null}

      {screen.content === "session" ? (
        <div className="absolute inset-0 flex flex-col justify-end gap-[2.5cqh] px-[6cqw] pb-[8cqh]">
          <Lockup aspect={3.2} height="16cqh" />
          <div className="flex items-baseline gap-[3cqw]">
            <span
              style={{
                background: "#A1FBF9",
                color: ink,
                fontSize: "6cqh",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "0.6cqh 1.6cqw",
              }}
            >
              Live
            </span>
            <span
              style={{
                color: "#fff",
                fontSize: "6.6cqh",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {NEXT_EVENT.hashtag}
            </span>
          </div>
        </div>
      ) : null}

      {screen.content === "agenda" ? (
        <div className="absolute inset-0 flex flex-col justify-center gap-[2cqh] px-[7cqw]">
          <Lockup aspect={3.2} height="15cqh" />
          {["09:30 Opening plenary", "11:00 Division breakouts", "16:00 Expo zone"].map((row) => (
            <div
              key={row}
              style={{
                color: "#fff",
                fontSize: "6cqh",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {row}
            </div>
          ))}
        </div>
      ) : null}

      {screen.content === "loop" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[4cqh]">
          <Lockup aspect={3.2} height="26cqh" />
          <div
            style={{
              color: "#A1FBF9",
              fontSize: "6cqh",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {NEXT_EVENT.city}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ScreenPlate({ screen, sceneId }: { screen: LondonSceneScreen; sceneId: string }) {
  const light = sceneLighting(sceneId);
  const quality = sceneLightQuality(sceneId);
  const bounds = quadBounds(screen.quad);
  const { ref, size } = useHostSize();
  const transform = useMemo(
    () => faceQuadTransform(screen.quad, bounds, size),
    [screen.quad, bounds, size],
  );

  const emissive = screen.brightness;
  const projection = screen.kind === "projection";
  // A projection screen is a lit surface: lower contrast, lifted blacks, and
  // the projector's own hotspot. An LED panel is a source: higher contrast,
  // a resolvable pixel grid, and a harder bloom.
  const grade = projection
    ? `brightness(${(0.86 + emissive * 0.2).toFixed(3)}) contrast(0.9) saturate(0.94)`
    : `brightness(${(0.94 + emissive * 0.26).toFixed(3)}) contrast(1.04) saturate(1.05)`;

  return (
    <div
      ref={ref}
      className="absolute"
      style={{
        left: pct(bounds.x),
        top: pct(bounds.y),
        width: pct(bounds.w),
        height: pct(bounds.h),
        zIndex: 20,
      }}
      aria-hidden="true"
    >
      {/* Screen spill: the display's own light on the surfaces around it. */}
      {screen.spill > 0.02 ? (
        <div
          className="absolute"
          style={{
            left: "-22%",
            top: "-22%",
            width: "144%",
            height: "144%",
            background:
              "radial-gradient(60% 60% at 50% 50%, rgba(150,190,255,1) 0%, rgba(150,190,255,0) 72%)",
            opacity: screen.spill * 0.55,
            mixBlendMode: "screen",
            filter: "blur(14px)",
          }}
        />
      ) : null}

      <div
        className="absolute inset-0"
        style={{
          transform: transform ?? undefined,
          transformOrigin: "0 0",
          backfaceVisibility: "hidden",
        }}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            // A monitor has a real bezel; a projection screen has none.
            boxShadow: projection
              ? `0 0 0 1px rgba(255,255,255,0.14), 0 10px 26px rgba(3,0,44,${(quality.vignette * 0.4).toFixed(3)})`
              : `0 0 0 1.5px rgba(8,8,14,0.9), 0 0 0 3px rgba(30,30,40,0.7), 0 14px 30px rgba(3,0,44,0.4)`,
          }}
        >
          <div className="absolute inset-0" style={{ filter: grade }}>
            <ScreenFrame screen={screen} />
          </div>

          {/* Panel black floor: no display renders true black on camera. */}
          <div
            className="absolute inset-0"
            style={{
              background: `rgba(140,152,182,${projection ? 0.1 : 0.05})`,
              mixBlendMode: "lighten",
            }}
          />

          {/* Projector hotspot, or LED pixel grid and column banding. */}
          {projection ? (
            <>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(70% 70% at 50% 42%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 68%)",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0) 2px)",
                  opacity: 0.5,
                }}
              />
            </>
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 2px), repeating-linear-gradient(90deg, rgba(0,0,0,0.14) 0px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 2px)",
                  opacity: 0.55,
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.05) 48%, rgba(255,255,255,0.04) 100%)",
                  mixBlendMode: "overlay",
                }}
              />
            </>
          )}

          {/* Glass: a raked reflection of the room, brighter on the light side. */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(${projection ? 104 : 118}deg, rgba(255,255,255,${(0.1 + light.sheen * 0.5).toFixed(3)}) 0%, rgba(255,255,255,0) 34%, rgba(255,255,255,0) 72%, rgba(255,255,255,${(0.05 + light.sheen * 0.3).toFixed(3)}) 100%)`,
              mixBlendMode: "screen",
            }}
          />

          {/* Ambient cast of the room, so the display sits in the same air. */}
          <div
            className="absolute inset-0"
            style={{
              background: light.tint,
              opacity: light.tintStrength * 0.7,
              mixBlendMode: "soft-light",
            }}
          />

          {/* Camera grade and sensor grain, matched to the plate. */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(130% 130% at 50% 42%, rgba(255,255,255,${(quality.rolloff * 0.18).toFixed(3)}) 0%, rgba(255,255,255,0) 48%, rgba(3,0,44,${(quality.vignette * 0.3).toFixed(3)}) 100%)`,
            }}
          />
          {light.grain > 0.01 ? (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: GRAIN_URL,
                backgroundSize: "160px 160px",
                opacity: light.grain * 1.1,
                mixBlendMode: "overlay",
              }}
            />
          ) : null}

          {/* Panel bloom: the halo a bright display puts into the lens. */}
          <div
            className="absolute inset-0"
            style={{
              boxShadow: `inset 0 0 ${(14 + emissive * 26).toFixed(0)}px rgba(190,215,255,${(emissive * 0.22).toFixed(3)})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export interface SceneEventScreensProps {
  sceneId: string;
}

/**
 * Fills every measured display in this plate with NEXT 2026 London content.
 * Renders nothing when the plate has no display in shot.
 */
export function SceneEventScreens({ sceneId }: SceneEventScreensProps) {
  const screens = sceneScreens(sceneId);
  if (screens.length === 0) return null;
  return (
    <>
      {screens.map((screen) => (
        <ScreenPlate key={screen.id} screen={screen} sceneId={sceneId} />
      ))}
    </>
  );
}

/** Caption fragment listing the displays running event content in this plate. */
export function sceneScreensCaption(sceneId: string): string | null {
  const screens = sceneScreens(sceneId);
  if (screens.length === 0) return null;
  return screens.map(screenCaption).join(" · ");
}

/**
 * Pure abstract 16:9 background preview for the Approved Visual Style Library.
 *
 * Deliberately renders NOTHING but the background: no headline, no chart, no
 * fake UI panel, no icon, no baked text. The card describes the language in
 * real metadata beside the image; the image is only the material, geometry,
 * lighting and colour rhythm. It calls the very same `pack.ground()` the deck
 * renderer and the exporters use, so what you pick is what you get on screen
 * and in PPTX/PDF/PNG.
 *
 * CRITICAL SIZING RULE: every `ground()` layer is authored in absolute pixels
 * against a 1280×720 slide. Painting those layers straight onto a ~240px card
 * shows only the top-left corner of the composition — which reads as a "half
 * image" wash rather than the style's real background. So we always paint the
 * background at true slide size and scale the whole plane down, exactly like
 * the slide stage does. The card then shows the COMPLETE background.
 */

import * as React from "react";
import type { StylePack } from "@/lib/style-packs";
import { packSheetPlanes } from "@/lib/pack-sheet";
import { useSkinBackdropVersion } from "@/lib/skin-backdrop-overrides";
import { useGroundReady } from "@/hooks/use-ground-ready";
import type { SkinScene } from "@/lib/skin-backgrounds";

const SLIDE_W = 1280;
const SLIDE_H = 720;

/**
 * Paints the look's PAGE at true 1280×720 and scales the plane to fill its
 * parent. Drop into any position:relative box that is already 16:9. Shared by
 * the library cards, the preview tiles and the lookbook so a background never
 * appears cropped at preview size.
 *
 * The plane stack comes from `packSheetPlanes` — the same description the slide
 * chrome and the export rasterizer use — so a preview can never show the raw
 * undamped ground while the real slide shows the damped, masked page.
 */
export function GroundPlane({
  pack,
  seed,
  layers,
}: {
  pack: StylePack;
  seed: string;
  /** Ground layers to paint instead of the pack's own (live tuner edits). */
  layers?: string[];
}) {
  // Repaint when an admin replaces this look's background artwork.
  const bdVersion = useSkinBackdropVersion();
  // Hold the plane until replacements have loaded (no stale-artwork flash).
  const groundReady = useGroundReady();
  const planes = React.useMemo(
    () => packSheetPlanes(pack, seed, layers ? { layers } : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pack, seed, layers, bdVersion],
  );
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(0);

  // Measure the host, not the viewport: the same plane is used at 200px in the
  // grid and at 900px in the lightbox.
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const w = host.clientWidth;
      if (w > 0) setScale(w / SLIDE_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}
    >
      {/* Hidden until measured so a mis-scaled first paint never flashes a
          cropped corner. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: SLIDE_W,
          height: SLIDE_H,
          transform: `scale(${scale || 0.0001})`,
          transformOrigin: "top left",
          opacity: scale && groundReady ? 1 : 0,
          transition: "opacity 120ms linear",
          willChange: "transform",
        }}
      >
        {planes.map((p) => (
          <div key={p.key} style={{ position: "absolute", inset: 0, ...p.style }} />
        ))}
      </div>
    </div>
  );
}


export function ApprovedStyleThumb({
  pack,
  scene = "cover",
  take = 0,
  className,
  radius,
  overrideUrl,
}: {
  pack: StylePack;
  /** Which section scene to preview. Hero scenes read best at card size. */
  scene?: SkinScene;
  take?: number;
  className?: string;
  radius?: number;
  /** Replacement art recorded for this scene × take; wins over `ground()`. */
  overrideUrl?: string | null;
}) {
  // The seed is the documented `ground()` contract: an explicit section scene
  // plus the alternate take index. Same call the slide stage makes.
  const seed = `scene:${scene} take:${((take % 4) + 4) % 4}`;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        backgroundColor: pack.tokens.surface,
        borderRadius: radius ?? Math.max(pack.card.radius, 8),
        aspectRatio: "16 / 9",
        width: "100%",
      }}
      aria-hidden
    >
      {overrideUrl ? (
        <img
          src={overrideUrl}
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          loading="lazy"
        />
      ) : (
        <GroundPlane pack={pack} seed={seed} />
      )}
    </div>
  );
}

const SCENES: SkinScene[] = [
  "cover",
  "statement",
  "closing",
  "agenda",
  "split",
  "quote",
  "section",
  "stats",
  "chart",
  "timeline",
  "bento",
];

/**
 * The four scene families every approved style must cover, in intensity order:
 * HERO → CONTENT → DATA → FLOW. This is the "background set" a card advertises,
 * so reviewers judge a whole visual language rather than one hero wash.
 */
export const APPROVED_SET_SCENES: { scene: SkinScene; label: string; tier: string }[] = [
  { scene: "cover", label: "Hero", tier: "0.72–0.90" },
  { scene: "agenda", label: "Content", tier: "0.28–0.48" },
  { scene: "stats", label: "Data", tier: "0.20–0.34" },
  { scene: "timeline", label: "Flow", tier: "0.30–0.40" },
];

/** Compact strip showing the style's full background set on the card. */
export function ApprovedStyleSet({
  pack,
  className = "",
  showLabels = false,
}: {
  pack: StylePack;
  className?: string;
  showLabels?: boolean;
}) {
  return (
    <div className={`grid grid-cols-4 gap-1 ${className}`}>
      {APPROVED_SET_SCENES.map((s) => (
        <div key={s.scene} className="min-w-0">
          <ApprovedStyleThumb pack={pack} scene={s.scene} radius={4} />
          {showLabels && (
            <div className="mt-0.5 truncate text-center text-[8px] uppercase tracking-wider text-black/40 dark:text-white/40">
              {s.label}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export { SCENES as APPROVED_PREVIEW_SCENES };

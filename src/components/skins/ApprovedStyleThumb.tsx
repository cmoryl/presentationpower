/**
 * Pure abstract 16:9 background preview for the Approved Visual Style Library.
 *
 * Deliberately renders NOTHING but the background: no headline, no chart, no
 * fake UI panel, no icon, no baked text. The card describes the language in
 * real metadata beside the image; the image is only the material, geometry,
 * lighting and colour rhythm. It calls the very same `pack.ground()` the deck
 * renderer and the exporters use, so what you pick is what you get on screen
 * and in PPTX/PDF/PNG.
 */

import * as React from "react";
import type { StylePack } from "@/lib/style-packs";
import type { SkinScene } from "@/lib/skin-backgrounds";

export function ApprovedStyleThumb({
  pack,
  scene = "cover",
  take = 0,
  className,
  radius,
}: {
  pack: StylePack;
  /** Which section scene to preview. Hero scenes read best at card size. */
  scene?: SkinScene;
  take?: number;
  className?: string;
  radius?: number;
}) {
  // `ground` is seeded by scene + take in the same way the slide stage seeds it.
  const seed = React.useMemo(() => sceneSeed(scene, take), [scene, take]);
  const background = React.useMemo(() => pack.ground(seed).join(", "), [pack, seed]);

  return (
    <div
      className={className}
      style={{
        background,
        backgroundColor: pack.tokens.surface,
        borderRadius: radius ?? Math.max(pack.card.radius, 8),
        aspectRatio: "16 / 9",
        width: "100%",
      }}
      aria-hidden
    />
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

function sceneSeed(scene: SkinScene, take: number) {
  const i = Math.max(0, SCENES.indexOf(scene));
  return i * 4 + (((take % 4) + 4) % 4);
}

export { SCENES as APPROVED_PREVIEW_SCENES };

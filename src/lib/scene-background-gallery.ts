// -----------------------------------------------------------------------------
// CURATED SCENE BACKGROUND GALLERY
//
// The skin library (src/lib/skin-backgrounds.ts) already composes an
// art-directed backdrop for every catalog visual language × every deck section.
// Those compositions were only reachable when a whole deck was dressed in a
// style pack — there was no way to *browse* them and drop one onto a single
// slide.
//
// This module flattens that matrix into a browsable gallery of standard
// `BackgroundPreset`s (28 visual languages × 11 scenes). Because each entry is a
// plain preset with `css` + `solid` + `darkChrome`, everything downstream —
// SlideChrome rendering, the raster path and the native PPTX background fill —
// works unchanged.
// -----------------------------------------------------------------------------

import type { BackgroundPreset } from "./background-library";
import { DESIGN_SKINS, type DesignSkin } from "./design-skins";
import {
  MOTIF_LABEL,
  SKIN_BG_TAKES,
  SKIN_SCENES,
  TAKE_LABEL,
  motifFamilyFor,
  skinBackgroundLayers,
  type MotifFamily,
  type SkinScene,
} from "./skin-backgrounds";


export const SCENE_LABEL: Record<SkinScene, string> = {
  cover: "Cover",
  agenda: "Agenda",
  statement: "Statement",
  stats: "Stat wall",
  split: "Split media",
  bento: "Bento",
  chart: "Chart",
  quote: "Quote",
  timeline: "Timeline",
  closing: "Closing",
  section: "Section",
};

/** Scene order for the gallery — narrative order, not alphabetical. */
export const GALLERY_SCENES: SkinScene[] = SKIN_SCENES;

function isDark(hex: string): boolean {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.55;
}

/** Palette stops as printed on the catalog sheet: field, ink, then accents. */
function rolesFor(skin: DesignSkin) {
  const [field, ink, a1, a2] = skin.palette;
  return {
    surface: field,
    ink,
    accent: a1 ?? ink,
    accentAlt: a2 ?? a1 ?? ink,
    dark: skin.mode === "dark" || isDark(field),
  };
}

/** Stable id, e.g. "scene-s04-cover" (take 0) or "scene-s04-cover-b". */
export function sceneBackgroundId(code: string, scene: SkinScene, take = 0): string {
  const base = `scene-${code.toLowerCase()}-${scene}`;
  return take === 0 ? base : `${base}-${"abcd"[take] ?? take}`;
}

export type SceneBackgroundPreset = BackgroundPreset & {
  skinCode: string;
  skinName: string;
  reference: string;
  scene: SkinScene;
  family: MotifFamily;
  familyLabel: string;
  mode: "light" | "dark";
  palette: string[];
  bestFit: string;
  /** 0-based alternate composition of the same visual language. */
  take: number;
  takeLabel: string;
};

function buildGallery(): SceneBackgroundPreset[] {
  const out: SceneBackgroundPreset[] = [];
  for (const skin of DESIGN_SKINS) {
    const r = rolesFor(skin);
    const family = motifFamilyFor(skin);
    for (const scene of GALLERY_SCENES) {
      for (let take = 0; take < SKIN_BG_TAKES; take++) {
        out.push({
          id: sceneBackgroundId(skin.code, scene, take),
          name: `${skin.name} · ${SCENE_LABEL[scene]}${take === 0 ? "" : ` · ${TAKE_LABEL[take]}`}`,
          category: "Atmosphere",
          darkChrome: r.dark,
          solid: r.surface,
          css: skinBackgroundLayers(skin, scene, r, take).join(", "),
          skinCode: skin.code,
          skinName: skin.name,
          reference: skin.reference,
          scene,
          family,
          familyLabel: MOTIF_LABEL[family],
          mode: r.dark ? "dark" : "light",
          palette: skin.palette,
          bestFit: skin.bestFit,
          take,
          takeLabel: TAKE_LABEL[take] ?? `Take ${take + 1}`,
        });
      }
    }
  }
  return out;
}

/** The full gallery, built once at module load (pure string composition). */
export const SCENE_BACKGROUNDS: SceneBackgroundPreset[] = buildGallery();

const BY_ID = new Map(SCENE_BACKGROUNDS.map((p) => [p.id, p]));

export function sceneBackgroundById(
  id: string | null | undefined,
): SceneBackgroundPreset | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}


/** Distinct motif families present in the gallery, with labels, for filters. */
export const GALLERY_FAMILIES: { id: MotifFamily; label: string; count: number }[] = (() => {
  const counts = new Map<MotifFamily, number>();
  for (const p of SCENE_BACKGROUNDS) counts.set(p.family, (counts.get(p.family) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, count]) => ({ id, label: MOTIF_LABEL[id], count }))
    .sort((a, b) => a.label.localeCompare(b.label));
})();

/** Filter + search the gallery. Empty filters mean "everything". */
export function filterSceneBackgrounds(opts: {
  scene?: SkinScene | "all";
  family?: MotifFamily | "all";
  mode?: "light" | "dark" | "all";
  take?: number | "all";
  query?: string;
}): SceneBackgroundPreset[] {
  const q = (opts.query ?? "").trim().toLowerCase();
  return SCENE_BACKGROUNDS.filter((p) => {
    if (opts.scene && opts.scene !== "all" && p.scene !== opts.scene) return false;
    if (opts.family && opts.family !== "all" && p.family !== opts.family) return false;
    if (opts.mode && opts.mode !== "all" && p.mode !== opts.mode) return false;
    if (opts.take !== undefined && opts.take !== "all" && p.take !== opts.take) return false;
    if (!q) return true;
    return [
      p.skinCode,
      p.skinName,
      p.reference,
      p.familyLabel,
      p.bestFit,
      p.takeLabel,
      SCENE_LABEL[p.scene],
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

/** All alternate compositions of one skin × scene, in take order. */
export function sceneTakes(code: string, scene: SkinScene): SceneBackgroundPreset[] {
  return SCENE_BACKGROUNDS.filter(
    (p) => p.skinCode.toLowerCase() === code.toLowerCase() && p.scene === scene,
  ).sort((a, b) => a.take - b.take);
}


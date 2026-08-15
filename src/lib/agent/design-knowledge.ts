/**
 * VISUAL KNOWLEDGE MAP for the Presentation Agent.
 *
 * The design system already knows, per visual language, its palette roles,
 * typographic character, box geometry, section layouts and per-section backdrop
 * presets. This module compiles that into a compact, model-readable "knowledge
 * map" so the agent can reason about the LOOK of a one-off deck the same way it
 * reasons about the story: pick a language for the audience, then assign each
 * slide a section scene whose backdrop intensity and layout fit its job.
 *
 * Pure data + tools. No rendering, no React — safe inside the chat route.
 */

import { tool, type ToolSet } from "ai";
import { z } from "zod";
import {
  DESIGN_SKINS,
  INDUSTRY_RECIPES,
  designSkinByCode,
  industryRecipeById,
  matchRecipes,
  recommendSkins,
  type DesignSkin,
} from "../design-skins";
import {
  MOTIF_LABEL,
  SCENE_INTENSITY,
  SKIN_SCENES,
  motifFamilyFor,
  sceneFromSeed,
  type SkinScene,
} from "../skin-backgrounds";
import { SCAFFOLD_LABEL, SHAPE_LABEL, SKIN_GEOMETRY, type PackGeometry } from "../pack-geometry";
import { skinPackId, skinCodeFromPackId, isSkinPackId } from "../design-skin-pack";

/* ------------------------------------------------------------------ scenes */

/** What each section scene is for, and how loud its backdrop runs. */
export const SCENE_ROLE: Record<SkinScene, string> = {
  cover: "opening title — loudest backdrop, largest display type",
  agenda: "what we will cover — calm field, list rhythm",
  statement: "one big idea or manifesto line — high impact, minimal copy",
  stats: "metric wall / KPIs — restrained field so numbers read first",
  split: "copy beside imagery or media — backdrop weighted to one side",
  bento: "modular grid of related points — quiet field, busy foreground",
  chart: "data figure or table — quietest field for legibility",
  quote: "voice of the customer or leader — soft focal wash",
  timeline: "phases, process or roadmap — lateral field with left anchor",
  closing: "call to action / thank you — near-cover impact",
  section: "divider or general content — mid-weight field",
};

function loudness(scene: SkinScene): string {
  const g = SCENE_INTENSITY[scene] ?? 0.55;
  if (g >= 0.85) return "loud";
  if (g >= 0.6) return "medium-loud";
  if (g >= 0.45) return "medium";
  return "quiet";
}

export const SCENE_MAP = SKIN_SCENES.map((scene) => ({
  scene,
  role: SCENE_ROLE[scene],
  backdrop: loudness(scene),
}));

/* -------------------------------------------------------------- skin knowledge */

export interface SkinKnowledge {
  style_pack_id: string;
  code: string;
  name: string;
  reference: string;
  mode: "light" | "dark";
  description: string;
  best_fit: string;
  density: string;
  palette_roles: { page: string; ink: string; accent: string; accent_alt: string; support: string };
  typography: string;
  surface: string;
  imagery: string;
  motif: string;
  geometry: { card_shape: string; card_note: string; cover: string; stats: string; grid: string; rule: string };
}

function geometryFor(skin: DesignSkin): PackGeometry {
  return (
    SKIN_GEOMETRY[(skin.code ?? "").toUpperCase()] ?? {
      shape: "round",
      layout: { cover: "baseline", stats: "cards4", grid: "bento", rule: "bar" },
    }
  );
}

export function skinKnowledge(skin: DesignSkin): SkinKnowledge {
  const geo = geometryFor(skin);
  const p = skin.palette;
  return {
    style_pack_id: skinPackId(skin.code),
    code: skin.code,
    name: skin.name,
    reference: skin.reference,
    mode: skin.mode,
    description: skin.description,
    best_fit: skin.bestFit,
    density: skin.density,
    palette_roles: {
      page: p[0] ?? "",
      ink: p[1] ?? "",
      accent: p[3] ?? p[2] ?? "",
      accent_alt: p[4] ?? p[2] ?? "",
      support: p[2] ?? "",
    },
    typography: skin.typography,
    surface: skin.surfaceNote,
    imagery: skin.imagery,
    motif: `${MOTIF_LABEL[motifFamilyFor(skin)]} backdrop family, ${SKIN_SCENES.length} section presets`,
    geometry: {
      card_shape: geo.shape,
      card_note: SHAPE_LABEL[geo.shape],
      cover: geo.layout.cover,
      stats: geo.layout.stats,
      grid: geo.layout.grid,
      rule: geo.layout.rule,
      scaffold: geo.scaffold,
      scaffold_note: SCAFFOLD_LABEL[geo.scaffold],
      margin_device: geo.device,
      fill: geo.fill,
    },
  };
}

/** One compact line per language — cheap enough to browse the whole catalog. */
export function skinDigest(skin: DesignSkin): string {
  const geo = geometryFor(skin);
  return [
    `${skinPackId(skin.code)} · ${skin.name} (${skin.mode})`,
    skin.description,
    `boxes: ${SHAPE_LABEL[geo.shape]}`,
    `layouts: cover ${geo.layout.cover} / stats ${geo.layout.stats} / grid ${geo.layout.grid}`,
    `page scaffold: ${SCAFFOLD_LABEL[geo.scaffold]} (${geo.device} device, fill ${geo.fill.toFixed(1)})`,
    `backdrops: ${MOTIF_LABEL[motifFamilyFor(skin)]}`,
    `fits: ${skin.bestFit}`,
  ].join(" — ");
}

/** Accept a code (S04), a pack id (skin-s04) or a language name. */
export function resolveSkin(ref: string): DesignSkin | null {
  const raw = (ref ?? "").trim();
  if (!raw) return null;
  if (isSkinPackId(raw)) return designSkinByCode(skinCodeFromPackId(raw));
  const byCode = designSkinByCode(raw);
  if (byCode) return byCode;
  const lower = raw.toLowerCase();
  return (
    DESIGN_SKINS.find((s) => s.name.toLowerCase() === lower) ??
    DESIGN_SKINS.find((s) => s.name.toLowerCase().includes(lower)) ??
    null
  );
}

/* ------------------------------------------------------------------- plans */

export const VisualPlanSchema = z.object({
  style_pack_id: z
    .string()
    .describe("Chosen visual language, as a style pack id like 'skin-s04' (or its S-code)"),
  design_recipe_id: z.string().optional().describe("Industry recipe id like 'R07', when one applies"),
  rationale: z.string().describe("One or two sentences: why this look suits this audience and story"),
  slides: z
    .array(
      z.object({
        title: z.string().describe("Slide title, matching the approved outline"),
        scene: z.string().describe(`Section scene: one of ${SKIN_SCENES.join(", ")}`),
        visual_note: z.string().optional().describe("Short note on the imagery or emphasis for this slide"),
      }),
    )
    .describe("Visual assignment per slide, in deck order"),
});

export type VisualPlan = z.infer<typeof VisualPlanSchema>;

export interface ResolvedVisualPlanSlide {
  title: string;
  scene: SkinScene;
  backdrop: string;
  role: string;
  visual_note?: string;
}

export interface ResolvedVisualPlan {
  skin: SkinKnowledge;
  recipe: string | null;
  rationale: string;
  slides: ResolvedVisualPlanSlide[];
  warnings: string[];
}

function coerceScene(value: string, title: string): SkinScene {
  const v = (value ?? "").trim().toLowerCase() as SkinScene;
  if (SKIN_SCENES.includes(v)) return v;
  return sceneFromSeed(`${value} ${title}`);
}

/** Validate an agent-authored visual plan against the real design system. */
export function resolveVisualPlan(plan: VisualPlan): ResolvedVisualPlan | { error: string } {
  const skin = resolveSkin(plan.style_pack_id);
  if (!skin)
    return {
      error: `Unknown visual language "${plan.style_pack_id}". Call design_knowledge_map first and use one of the returned style_pack_id values.`,
    };
  const recipe = industryRecipeById(plan.design_recipe_id ?? null);
  const warnings: string[] = [];
  const slides = plan.slides.map((s, i) => {
    const scene = coerceScene(s.scene, s.title);
    if (scene !== (s.scene ?? "").trim().toLowerCase())
      warnings.push(`Slide ${i + 1} ("${s.title}"): scene "${s.scene}" mapped to "${scene}".`);
    return {
      title: s.title,
      scene,
      backdrop: loudness(scene),
      role: SCENE_ROLE[scene],
      ...(s.visual_note ? { visual_note: s.visual_note } : {}),
    } satisfies ResolvedVisualPlanSlide;
  });

  const loud = slides.filter((s) => s.backdrop === "loud").length;
  if (slides.length > 4 && loud > Math.ceil(slides.length / 3))
    warnings.push(
      "Too many loud backdrops: keep cover/statement/closing impact scenes to roughly a third of the deck so content slides stay legible.",
    );
  if (slides.length && slides[0]!.scene !== "cover")
    warnings.push("First slide is usually the 'cover' scene.");

  return {
    skin: skinKnowledge(skin),
    recipe: recipe ? `${recipe.id} · ${recipe.name} — ${recipe.tone}` : null,
    rationale: plan.rationale,
    slides,
    warnings,
  };
}

/* ------------------------------------------------------------------- tools */

export const VISUAL_PLAN_TOOL_NAME = "plan_visual_design";

export function buildDesignKnowledgeToolSet(): ToolSet {
  return {
    design_knowledge_map: tool({
      description:
        "Read the visual knowledge map: the design languages available for a deck, narrowed to the audience/industry, plus the section scenes (cover, stats, chart, quote…) with what each is for and how loud its backdrop runs. Call this before choosing a look for a new or one-off deck.",
      inputSchema: z.object({
        intent: z
          .string()
          .optional()
          .describe("Free text about audience, industry, tone or objective, e.g. 'life sciences board review, sober'"),
        mode: z.enum(["light", "dark"]).optional().describe("Preferred page field"),
        limit: z.number().int().min(1).max(28).optional().describe("How many languages to return (default 6)"),
        include_all: z.boolean().optional().describe("Return the whole catalog instead of a shortlist"),
      }),
      execute: async ({ intent, mode, limit, include_all }) => {
        const recipes = matchRecipes(intent ?? "", 4);
        const skins = include_all
          ? DESIGN_SKINS
          : recommendSkins({
              intent: intent ?? "",
              mode: mode ?? null,
              recipeId: recipes[0]?.id ?? null,
              limit: limit ?? 6,
            });
        return {
          recommended: skins.map(skinDigest),
          industry_recipes: (recipes.length ? recipes : INDUSTRY_RECIPES.slice(0, 4)).map(
            (r) => `${r.id} · ${r.name} — ${r.summary} (tone: ${r.tone}; languages: ${r.dna.join(", ")})`,
          ),
          section_scenes: SCENE_MAP,
          how_to_use:
            "Pick one style_pack_id for the whole deck, then assign every slide a section scene with plan_visual_design. Inspect a language with inspect_design_skin when you need its palette roles, box shape or layout families.",
        };
      },
    }),

    inspect_design_skin: tool({
      description:
        "Get the full visual knowledge map for one design language: palette roles, typographic character, box shape, section layout families, backdrop motif and imagery direction.",
      inputSchema: z.object({
        style_pack_id: z.string().describe("Style pack id like 'skin-s04', an S-code, or the language name"),
      }),
      execute: async ({ style_pack_id }) => {
        const skin = resolveSkin(style_pack_id);
        if (!skin)
          return {
            error: `No design language matches "${style_pack_id}". Call design_knowledge_map for valid ids.`,
          };
        return { ...skinKnowledge(skin), section_scenes: SCENE_MAP };
      },
    }),

    [VISUAL_PLAN_TOOL_NAME]: tool({
      description:
        "Record the visual design plan for this deck: the chosen design language plus a section scene for every slide, in order. Call this after the outline is approved and before create_deck / generate_deck, then pass the chosen style_pack_id (and design_recipe_id if any) into that call and use the scenes when picking slide layouts.",
      inputSchema: VisualPlanSchema,
      execute: async (input) => resolveVisualPlan(VisualPlanSchema.parse(input)),
    }),
  };
}

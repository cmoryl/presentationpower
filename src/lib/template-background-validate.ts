/**
 * BUILD-TIME TEMPLATE BACKGROUND VALIDATION.
 *
 * A deck slide asks the ground engine for a background by seed
 * (`scene:<name> take:<n>`, plus an optional `mod:<variant>` scope). The
 * approved background directory (`industry-backgrounds.ts`) publishes exactly
 * 11 scenes × 4 takes per system. If a template, section framework or authored
 * example ever names a scene the directory does not publish, the slide silently
 * falls back to another composition — the class of bug that made DataForce
 * covers paint the wrong art.
 *
 * This module turns that into a hard, deterministic check that runs in the
 * test/build gate: every scene a deck can reference for a look must exist in
 * that look's approved set, and every published composition must round-trip
 * through the same seed parser the renderers and exporters use.
 */

import {
  INDUSTRY_BG_COMBOS,
  allBackgroundSets,
  industryBgSeed,
  type IndustryBackgroundSet,
} from "./industry-backgrounds";
import { isModuleScene } from "./skin-backdrop-overrides";
import { SKIN_BG_TAKES, SKIN_SCENES, sceneFromSeed, type SkinScene } from "./skin-backgrounds";
import { LEVEL_ROLE, TEMPLATE_LEVELS, templateLibraryForIndustry } from "./section-templates";

export interface BackgroundRefIssue {
  lookCode: string;
  /** Where the reference came from, e.g. `section-template SF-01/headline`. */
  source: string;
  scene: string;
  take: number;
  reason: string;
}

export interface BackgroundRefReport {
  lookCode: string;
  ok: boolean;
  /** Distinct scene names the look's deck surfaces can request. */
  scenesChecked: string[];
  compositions: number;
  issues: BackgroundRefIssue[];
}

interface SceneRef {
  source: string;
  scene: string;
  take?: number;
}

/** Every scene a deck built on this look can request, with its origin. */
export function deckSceneRefs(lookCode: string): SceneRef[] {
  const refs: SceneRef[] = [];
  for (const level of TEMPLATE_LEVELS) {
    refs.push({ source: `level-role ${level}`, scene: LEVEL_ROLE[level].scene });
  }
  for (const t of templateLibraryForIndustry(lookCode)) {
    refs.push({ source: `section-template ${t.sectionId}/${t.level}`, scene: t.scene });
  }
  return refs;
}

/** Validate one approved background system against everything decks can ask for. */
export function validateBackgroundRefs(set: IndustryBackgroundSet): BackgroundRefReport {
  const issues: BackgroundRefIssue[] = [];
  const published = new Set(set.compositions.map((c) => `${c.scene}:${c.take}`));
  const refs = deckSceneRefs(set.recipeId);

  for (const ref of refs) {
    const take = ref.take ?? 0;
    const add = (reason: string) =>
      issues.push({ lookCode: set.recipeId, source: ref.source, scene: ref.scene, take, reason });
    if (isModuleScene(ref.scene)) continue; // module-scoped replacement, not a directory scene
    if (!(SKIN_SCENES as readonly string[]).includes(ref.scene)) {
      add("scene is not one of the 11 approved scene roles");
      continue;
    }
    if (take < 0 || take >= SKIN_BG_TAKES) {
      add(`take ${take} is outside the approved 0–${SKIN_BG_TAKES - 1} range`);
      continue;
    }
    if (!published.has(`${ref.scene}:${take}`)) {
      add("composition is missing from the approved background directory");
    }
  }

  // Directory integrity: each published composition's seed must parse back to
  // the same scene the directory advertises, or the renderer and the gallery
  // disagree about what a card is showing.
  if (set.compositions.length !== INDUSTRY_BG_COMBOS) {
    issues.push({
      lookCode: set.recipeId,
      source: "directory",
      scene: "*",
      take: -1,
      reason: `expected ${INDUSTRY_BG_COMBOS} compositions, found ${set.compositions.length}`,
    });
  }
  for (const c of set.compositions) {
    const seed = industryBgSeed(c.scene, c.take);
    const parsed: SkinScene = sceneFromSeed(seed);
    if (parsed !== c.scene) {
      issues.push({
        lookCode: set.recipeId,
        source: "directory",
        scene: c.scene,
        take: c.take,
        reason: `seed "${seed}" resolves to scene "${parsed}"`,
      });
    }
  }

  return {
    lookCode: set.recipeId,
    ok: issues.length === 0,
    scenesChecked: [...new Set(refs.map((r) => r.scene))].sort(),
    compositions: set.compositions.length,
    issues,
  };
}

/** Validate one look by code (`R03`, `skin-r03`, `S12`). */
export function validateLookBackgroundRefs(code: string): BackgroundRefReport | null {
  const wanted = /^skin-/i.test(code.trim()) ? code.trim().slice(-3).toUpperCase() : code.trim().toUpperCase();
  const set = allBackgroundSets().find((s) => s.recipeId.toUpperCase() === wanted);
  return set ? validateBackgroundRefs(set) : null;
}

/** Validate every approved background system (core S-codes + industry R-codes). */
export function validateAllBackgroundRefs(): BackgroundRefReport[] {
  return allBackgroundSets().map(validateBackgroundRefs);
}

/** Human-readable failure text for the build gate. */
export function formatBackgroundRefIssues(reports: BackgroundRefReport[]): string {
  return reports
    .flatMap((r) => r.issues)
    .map((i) => `${i.lookCode} · ${i.source} · scene "${i.scene}" take ${i.take}: ${i.reason}`)
    .join("\n");
}

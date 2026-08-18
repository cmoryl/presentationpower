/**
 * TEMPLATE REGISTRY — runtime slot for admin-authored templates and background
 * overrides.
 *
 * This module deliberately imports NOTHING. `style-packs.ts` reads it when it
 * resolves a pack id, and `custom-templates.ts` writes to it once the published
 * catalog arrives from the database. Keeping the slot dependency-free avoids an
 * import cycle between the pack pipeline and the loader.
 */

import type { StylePack } from "./style-packs";

export interface TemplateBackgroundOverride {
  /** Skin/template code the override belongs to, e.g. "S02", "R14", "C01". */
  skinCode: string;
  /** Scene key from SKIN_SCENES, or "*" for every scene of the template. */
  scene: string;
  /** 0 = flat field, 1 = as authored, up to 2 = punchier. */
  intensity: number;
  /** Optional tint colour laid over the ground. */
  tint?: string | null;
  /** 0–1 strength of the tint veil. */
  tintStrength: number;
  /** Paint another scene's composition instead of this one's. */
  sceneSwap?: string | null;
  /** Custom/AI backdrop image painted behind the CSS layers. */
  imageUrl?: string | null;
  note?: string;
}

let customPacks: StylePack[] = [];
let overrides: TemplateBackgroundOverride[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function subscribeTemplateRegistry(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Version counter — components can re-render when the registry changes. */
let version = 0;
export function templateRegistryVersion(): number {
  return version;
}

export function setCustomPacks(packs: StylePack[]): void {
  customPacks = packs;
  version += 1;
  emit();
}

export function customTemplatePacks(): StylePack[] {
  return customPacks;
}

export function customPackById(id: string | null | undefined): StylePack | null {
  if (!id) return null;
  return customPacks.find((p) => p.id === id) ?? null;
}

export function setBackgroundOverrides(rows: TemplateBackgroundOverride[]): void {
  overrides = rows;
  version += 1;
  emit();
}

export function backgroundOverrides(): TemplateBackgroundOverride[] {
  return overrides;
}

/** Most specific override for a code × scene: exact scene beats the "*" rule. */
export function overrideFor(
  skinCode: string,
  scene: string,
): TemplateBackgroundOverride | null {
  const code = skinCode.toUpperCase();
  const mine = overrides.filter((o) => o.skinCode.toUpperCase() === code);
  return mine.find((o) => o.scene === scene) ?? mine.find((o) => o.scene === "*") ?? null;
}

/* ── approved mapping for admin-authored templates ─────────────────────────
 * A custom template only appears in normal user-facing galleries when it is
 * explicitly mapped to an approved core style (S01–S28) — and, where relevant,
 * to an industry background system (R01–R30). The pack itself carries no such
 * metadata, so the loader parks it here next to the packs.
 * ───────────────────────────────────────────────────────────────────────── */

export interface CustomTemplateMapping {
  /** Template code, e.g. "C04". */
  code: string;
  /** Approved core style code the template's typography/geometry follows. */
  baseSkinCode: string | null;
  /** Free text used to infer the industry background system. */
  bestFit: string;
  name: string;
}

let templateMappings: CustomTemplateMapping[] = [];

export function setCustomTemplateMappings(rows: CustomTemplateMapping[]): void {
  templateMappings = rows;
  version += 1;
  emit();
}

export function customTemplateMapping(
  code: string | null | undefined,
): CustomTemplateMapping | null {
  if (!code) return null;
  const key = code.toUpperCase();
  return templateMappings.find((m) => m.code.toUpperCase() === key) ?? null;
}

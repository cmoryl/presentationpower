// ---------------------------------------------------------------------------
// Module registry.
//
// `VariantRenderer.tsx` grew into a 20k-line file whose body is one switch over
// 212 variant branches. Every fix in one family risked a regression in another,
// because families share locals rather than a contract. The registry is the
// seam that lets families move OUT of that switch one at a time without a
// big-bang rewrite:
//
//   1. A family module registers a renderer (by exact variant id or predicate).
//   2. `renderVariantBody` consults the registry FIRST and falls back to the
//      legacy switch when nothing claims the variant.
//
// So extraction is incremental and always reversible: delete the registration
// and the legacy branch takes over again. The conformance matrix
// (`__tests__/module-conformance.test.tsx`) renders every variant through this
// path, so a family that moves must keep rendering identically-shaped output.
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";
import type { BrandMode, ModuleVariant } from "@/lib/taxonomy";
import type { SlideMode } from "./SlideChrome";
import type { DashLook } from "@/lib/dash-look";

/** Everything the legacy switch had in scope, passed explicitly. */
export type ModuleRenderArgs = {
  slide: unknown;
  variant: ModuleVariant;
  brand: BrandMode;
  pageNumber: number;
  /** Slide content bag. */
  c: Record<string, unknown>;
  mode: SlideMode;
  clientName?: string;
  clientLogoUrl?: string | null;
  dash: DashLook;
  /** Bare-surface skins (Organic Systems S21): no translucent content boxes. */
  bareSurfaces?: boolean;
};

export type ModuleRenderer = (args: ModuleRenderArgs) => ReactNode;

export type ModuleRegistration = {
  /** Stable id for diagnostics, e.g. `family:viz`. */
  id: string;
  /** Exact variant ids this renderer owns. */
  variantIds?: readonly string[];
  /** Predicate for whole families (`MV-VIZ-*`). Consulted after exact ids. */
  match?: (variantId: string) => boolean;
  render: ModuleRenderer;
};

const byVariantId = new Map<string, ModuleRegistration>();
const matchers: ModuleRegistration[] = [];

export function registerSlideModule(reg: ModuleRegistration): void {
  for (const id of reg.variantIds ?? []) byVariantId.set(id, reg);
  if (reg.match) {
    const existing = matchers.findIndex((m) => m.id === reg.id);
    if (existing >= 0) matchers[existing] = reg;
    else matchers.push(reg);
  }
}

export function findSlideModule(variantId: string): ModuleRegistration | null {
  return byVariantId.get(variantId) ?? matchers.find((m) => m.match!(variantId)) ?? null;
}

/** Which variant ids the registry currently owns — used by the audit tests. */
export function registeredModuleIds(): string[] {
  return [...byVariantId.keys()].sort();
}

export function registeredModuleFamilies(): string[] {
  return matchers.map((m) => m.id).sort();
}

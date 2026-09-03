// ---------------------------------------------------------------------------
// REGRESSION GUARD — module registry must survive hot updates.
//
// A hot update to `module-registry.ts` used to allocate fresh empty maps while
// the already-evaluated family modules stayed cached, so every library card
// fell back to a title/description placeholder until a full reload. The fix is
// storing the registry on globalThis under a stable Symbol.for key. These tests
// fail if anyone reintroduces module-local registry state.
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";

import "../modules/register-all";
import { findSlideModule, registeredModuleFamilies, registeredModuleIds } from "../module-registry";

const REGISTRY_KEY = Symbol.for("transperfect-element.slide-module-registry");

describe("module registry persistence", () => {
  it("registers every family via the side-effect barrel", () => {
    expect(registeredModuleFamilies().length).toBeGreaterThan(0);
    expect(registeredModuleIds().length).toBeGreaterThan(50);
  });

  it("keeps registrations on a stable globalThis slot", () => {
    const store = (globalThis as Record<PropertyKey, unknown>)[REGISTRY_KEY] as {
      byVariantId: Map<string, unknown>;
      matchers: unknown[];
    };
    expect(store).toBeTruthy();
    expect(store.byVariantId.size).toBe(registeredModuleIds().length);
    expect(store.matchers.length).toBe(registeredModuleFamilies().length);
  });

  it("survives a fresh evaluation of the registry module (HMR simulation)", async () => {
    const before = registeredModuleIds().length;
    const familiesBefore = registeredModuleFamilies().length;

    // Re-evaluating ONLY the registry module (families stay cached) is exactly
    // what a hot update did. Registrations must still be there afterwards.
    const reloaded = await import(/* @vite-ignore */ `../module-registry.ts?hmr=${Date.now()}`);

    expect(reloaded.registeredModuleIds().length).toBe(before);
    expect(reloaded.registeredModuleFamilies().length).toBe(familiesBefore);
    expect(reloaded.findSlideModule(registeredModuleIds()[0]!)).toBeTruthy();
    expect(findSlideModule(registeredModuleIds()[0]!)).toBeTruthy();
  });
});

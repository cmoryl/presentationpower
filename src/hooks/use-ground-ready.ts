/**
 * GROUND READINESS — the single artifact guard every ground-painting surface
 * reads before it paints artwork.
 *
 * Two async sources decide what a template's ground looks like:
 *   1. the replaced-background registry (admin uploads / AI backdrops), and
 *   2. the published template + background-override catalog.
 *
 * Painting before EITHER has answered shows the template's pre-update artwork —
 * the "old template" artifacts admins were seeing on the modules page (that
 * page never even asked for the catalog, so the stale ground was permanent).
 *
 * This hook both kicks the catalog load off and reports when it is safe to
 * paint, so every surface that renders a ground is self-sufficient.
 */

import { useEffect, useSyncExternalStore } from "react";

import { useSkinBackdropsReady } from "@/lib/skin-backdrop-overrides";
import {
  subscribeTemplateRegistry,
  templateRegistryReady,
  templateRegistryVersion,
} from "@/lib/template-registry";
import { loadTemplateRegistry } from "@/lib/template-loader";

function useTemplateRegistryReady(): boolean {
  const version = useSyncExternalStore(subscribeTemplateRegistry, templateRegistryVersion, () => 0);
  useEffect(() => {
    void loadTemplateRegistry();
  }, []);
  // `version` is only here to re-read the flag on every registry publish.
  void version;
  return templateRegistryReady();
}

/** True once replaced backgrounds AND published templates are both known. */
export function useGroundReady(): boolean {
  const backdrops = useSkinBackdropsReady();
  const registry = useTemplateRegistryReady();
  return backdrops && registry;
}

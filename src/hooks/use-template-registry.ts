/**
 * TEMPLATE REGISTRY SUBSCRIPTION
 *
 * Published templates and admin background overrides land in the runtime
 * registry *after* first render. Any component that resolved a pack with
 * `useMemo(..., [packId])` therefore kept painting the pack it built before the
 * update — the stale/stacked-background class of bug. Resolving through these
 * hooks keys the memo on the registry version too, so an updated background
 * invalidates everywhere the moment the registry changes.
 */

import { useMemo, useSyncExternalStore } from "react";

import { stylePackById, type StylePack } from "@/lib/style-packs";
import { subscribeTemplateRegistry, templateRegistryVersion } from "@/lib/template-registry";

/** Increments whenever templates, mappings or background overrides change. */
export function useTemplateRegistryVersion(): number {
  // Server snapshot is 0 and the registry only loads client-side after mount,
  // so the first client render still matches the server output.
  return useSyncExternalStore(
    subscribeTemplateRegistry,
    templateRegistryVersion,
    () => 0,
  );
}

/** Resolve a pack id, re-resolving when the registry updates. */
export function useResolvedStylePack(id: string | null | undefined): StylePack | null {
  const version = useTemplateRegistryVersion();
  return useMemo(() => stylePackById(id ?? null), [id, version]);
}

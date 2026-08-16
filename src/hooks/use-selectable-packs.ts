/**
 * Every look a user may choose, including admin-authored templates published
 * through the Alternate-Look intake. The registry is filled asynchronously at
 * boot, so this subscribes and re-renders when published templates land.
 */

import { useSyncExternalStore } from "react";
import { allSelectablePacks, BUILTIN_SELECTABLE_PACKS, type StylePack } from "@/lib/style-packs";
import { subscribeTemplateRegistry, templateRegistryVersion } from "@/lib/template-registry";

const emptySubscribe = () => () => {};

export function useSelectablePacks(): StylePack[] {
  useSyncExternalStore(
    subscribeTemplateRegistry,
    templateRegistryVersion,
    () => 0,
  );
  // Admin-published templates only exist client-side, so the first client render
  // must match the server's built-in-only list to avoid a hydration mismatch.
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  return hydrated ? allSelectablePacks() : BUILTIN_SELECTABLE_PACKS;
}


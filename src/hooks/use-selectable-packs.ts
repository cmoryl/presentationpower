/**
 * Every look a user may choose, including admin-authored templates published
 * through the Alternate-Look intake. The registry is filled asynchronously at
 * boot, so this subscribes and re-renders when published templates land.
 */

import { useSyncExternalStore } from "react";
import { allSelectablePacks, type StylePack } from "@/lib/style-packs";
import { subscribeTemplateRegistry, templateRegistryVersion } from "@/lib/template-registry";

export function useSelectablePacks(): StylePack[] {
  useSyncExternalStore(
    subscribeTemplateRegistry,
    templateRegistryVersion,
    () => 0,
  );
  return allSelectablePacks();
}

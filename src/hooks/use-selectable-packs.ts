/**
 * Every look a user may choose, including admin-authored templates published
 * through the Alternate-Look intake. The registry is filled asynchronously at
 * boot, so this subscribes and re-renders when published templates land.
 *
 * Sales-enablement (create-only) users are Enterprise-mode only: they see just
 * the approved Enterprise light and dark packs.
 */

import { useSyncExternalStore } from "react";
import {
  allSelectablePacks,
  ALL_STYLE_PACKS,
  resolvedPack,
  type StylePack,
} from "@/lib/style-packs";
import { subscribeTemplateRegistry, templateRegistryVersion } from "@/lib/template-registry";
import { useWorkspaceCapabilities } from "@/hooks/use-workspace-capabilities";
import { salesApprovedPackIds } from "@/lib/sales-deck-looks";

const emptySubscribe = () => () => {};

export function useSelectablePacks(): StylePack[] {
  useSyncExternalStore(subscribeTemplateRegistry, templateRegistryVersion, () => 0);
  const caps = useWorkspaceCapabilities();
  // Admin-published templates only exist client-side, so the first client render
  // must match the server's built-in-only list to avoid a hydration mismatch.
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const packs = hydrated ? allSelectablePacks() : ALL_STYLE_PACKS.map(resolvedPack);
  if (caps.createOnly) {
    const allowed = salesApprovedPackIds();
    const only = packs.filter((p) => allowed.includes(p.id));
    if (only.length) return only;
  }
  return packs;
}

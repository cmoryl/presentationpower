/**
 * TEMPLATE REGISTRY LOADER — pulls published templates and background overrides
 * from the database and installs them in the runtime registry so every render
 * surface (library, agent previews, present/share, exports) resolves them.
 *
 * Reads are anonymous-safe by policy, so this runs for signed-out viewers too.
 */

import { supabase } from "@/integrations/supabase/client";
import { parseOverrideRow, parseTemplateRow } from "./templates.functions";
import { templateToPack, type CustomTemplate } from "./custom-templates";
import {
  setBackgroundOverrides,
  setCustomPacks,
  setCustomTemplateMappings,
} from "./template-registry";

let loaded: Promise<void> | null = null;

export async function loadTemplateRegistry(force = false): Promise<void> {
  if (loaded && !force) return loaded;
  loaded = (async () => {
    const [tpl, ovr] = await Promise.all([
      supabase.from("custom_templates").select("*").eq("status", "published"),
      supabase.from("template_background_overrides").select("*"),
    ]);
    const templates: CustomTemplate[] = ((tpl.data as Record<string, unknown>[]) ?? []).map(
      parseTemplateRow,
    );
    setCustomPacks(templates.map(templateToPack));
    setBackgroundOverrides(
      ((ovr.data as Record<string, unknown>[]) ?? []).map(parseOverrideRow),
    );
  })().catch(() => {
    // A registry miss must never break rendering — the built-in catalog stands.
    loaded = null;
  });
  return loaded;
}

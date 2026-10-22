import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getModuleCatalogue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireCatalogueAdmin, readCatalogue } = await import("./module-catalogue.server");
    await requireCatalogueAdmin(context.supabase, context.userId);
    return readCatalogue(context.supabase);
  });

export const getModuleHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ table: z.enum(["module_overrides", "custom_modules", "print_page_templates"]), key: z.string().min(1) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { requireCatalogueAdmin } = await import("./module-catalogue.server");
    await requireCatalogueAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase.from("module_catalogue_versions").select("*").eq("source_table", data.table).eq("source_key", data.key).order("revision", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const restoreModuleHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.number().int().positive(), expectedRevision: z.number().int().positive() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { requireCatalogueAdmin } = await import("./module-catalogue.server");
    await requireCatalogueAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.rpc("restore_module_catalogue_version", { _id: data.id, _expected_revision: data.expectedRevision });
    if (error) throw new Error(error.message);
    const { logLearningSignal } = await import("./learning.server");
    await logLearningSignal(context.supabase, context.userId, { source: "edit", subjectType: "module", subjectId: String(data.id), summary: "Restored a saved module version with review safeguards", detail: { revision: data.expectedRevision } });
    return { ok: true };
  });

export const setCatalogueVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ scope: z.enum(["deck", "print", "team", "template"]), id: z.string().min(2), retired: z.boolean(), acknowledgeImpact: z.boolean().default(false) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { requireCatalogueAdmin, readCatalogue, checkRetirement } = await import("./module-catalogue.server");
    await requireCatalogueAdmin(context.supabase, context.userId);
    const estate = data.retired ? await checkRetirement(context.supabase, data.id, data.acknowledgeImpact) : await readCatalogue(context.supabase);
    const known = data.scope === "deck" ? estate.variants : data.scope === "team" ? estate.custom : data.scope === "template" ? estate.templates : null;
    if (known && !known.some((r) => r.id === data.id)) throw new Error("Module not found");
    if (data.scope === "print") {
      const { PRINT_SECTION_MODULES } = await import("./print-library/section-modules");
      if (!PRINT_SECTION_MODULES.some((m) => m.id === data.id)) throw new Error("Print module not found");
    }
    if (data.scope === "team") {
      const row = estate.custom.find((r) => r.id === data.id);
      if (!data.retired && row?.review_status !== "approved") throw new Error("This team module needs approval before returning to the library.");
      const { error } = await context.supabase.from("custom_modules").update({ status: data.retired ? "archived" : "published" }).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else if (data.scope === "template") {
      const { error } = await context.supabase.from("print_page_templates").update({ hidden: data.retired }).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("module_overrides").upsert({ scope: data.scope, module_id: data.id, hidden: data.retired, updated_by: context.userId }, { onConflict: "scope,module_id" });
      if (error) throw new Error(error.message);
    }
    const { logLearningSignal } = await import("./learning.server");
    await logLearningSignal(context.supabase, context.userId, { source: "edit", subjectType: "module", subjectId: data.id, summary: `${data.retired ? "Retired" : "Restored visibility of"} ${data.scope} module`, detail: { acknowledgedImpact: data.acknowledgeImpact } });
    return { ok: true };
  });
// Admin-curated sample content for module-library variants.
//
// The library normally renders each variant with deterministic seeded
// content (`seedDivisionContent`). A master admin can override that sample
// per variant (optionally per brand mode) so the library, public library and
// detail modal show curated copy instead of generated filler.

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type SampleContent = Record<string, any>;

export type VariantSample = {
  variantId: string;
  brandModeId: string;
  content: SampleContent;
  updatedAt: string;
};

/** "*" = applies to every brand mode. */
export const ALL_BRANDS = "*";

type Row = {
  variant_id: string;
  brand_mode_id: string;
  content: unknown;
  updated_at: string;
};

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function toSample(r: Row): VariantSample {
  return {
    variantId: r.variant_id,
    brandModeId: r.brand_mode_id,
    content: (r.content as SampleContent) ?? {},
    updatedAt: r.updated_at,
  };
}

/** Public read — curated samples are visible to everyone (public library). */
export const listVariantSamples = createServerFn({ method: "GET" }).handler(
  async (): Promise<VariantSample[]> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("module_variant_samples")
      .select("variant_id, brand_mode_id, content, updated_at");
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(toSample);
  },
);

type Ctx = {
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
    from: (t: string) => any;
  };
  userId: string;
};

async function assertAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden: admin required");
}

/** Is the caller a master admin? Drives the library's edit affordances. */
export const amIModuleAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const ctx = context as unknown as Ctx;
    const { data } = await ctx.supabase.rpc("has_role", {
      _user_id: ctx.userId,
      _role: "admin",
    });
    return !!data;
  });

export const saveVariantSample = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { variantId: string; brandModeId?: string; content: SampleContent }) => {
      if (!input?.variantId) throw new Error("variantId is required");
      if (!input.content || typeof input.content !== "object") {
        throw new Error("content must be an object");
      }
      return input;
    },
  )
  .handler(async ({ data, context }): Promise<VariantSample> => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { data: row, error } = await ctx.supabase
      .from("module_variant_samples")
      .upsert(
        {
          variant_id: data.variantId,
          brand_mode_id: data.brandModeId ?? ALL_BRANDS,
          content: data.content,
          updated_by: ctx.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "variant_id,brand_mode_id" },
      )
      .select("variant_id, brand_mode_id, content, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return toSample(row as Row);
  });

export const deleteVariantSample = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { variantId: string; brandModeId?: string }) => {
    if (!input?.variantId) throw new Error("variantId is required");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    const { error } = await ctx.supabase
      .from("module_variant_samples")
      .delete()
      .eq("variant_id", data.variantId)
      .eq("brand_mode_id", data.brandModeId ?? ALL_BRANDS);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

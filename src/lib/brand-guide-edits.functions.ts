// Read/write server functions for live brand-guide edits.
//
// Reads are public (guide pages are shareable and render during SSR), writes
// require an authenticated brand lead / brand reviewer / admin.

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  sanitizeBrandGuidePatch,
  colorEditsRetheme,
  type BrandGuideEditRow,
  type BrandGuidePatch,
} from "@/lib/brand-guide-edits";

type AnySupabase = { from: (t: string) => any; rpc: (n: string, a: unknown) => any };

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
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

/** One guide's live edit — used by the public guide page loader. */
export const getBrandGuideEdit = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(raw))
  .handler(async ({ data }): Promise<BrandGuideEditRow | null> => {
    const sb = publicClient() as unknown as AnySupabase;
    const { data: row, error } = await sb
      .from("brand_guide_edits")
      .select("slug, division_id, patch, updated_at")
      .eq("slug", data.slug)
      .maybeSingle();
    // A read failure must not blank the guide — fall back to the authored baseline.
    if (error || !row) return null;
    return {
      slug: row.slug as string,
      divisionId: row.division_id as string,
      patch: sanitizeBrandGuidePatch(row.patch),
      updatedAt: (row.updated_at as string) ?? null,
    };
  });

/** Every live edit — used by the guides index to flag edited guides. */
export const listBrandGuideEdits = createServerFn({ method: "GET" }).handler(
  async (): Promise<BrandGuideEditRow[]> => {
    const sb = publicClient() as unknown as AnySupabase;
    const { data: rows, error } = await sb
      .from("brand_guide_edits")
      .select("slug, division_id, patch, updated_at");
    if (error || !rows) return [];
    return (rows as Array<Record<string, unknown>>).map((r) => ({
      slug: r["slug"] as string,
      divisionId: r["division_id"] as string,
      patch: sanitizeBrandGuidePatch(r["patch"]),
      updatedAt: (r["updated_at"] as string) ?? null,
    }));
  },
);

async function assertBrandEditor(supabase: AnySupabase, userId: string) {
  const roles = ["admin", "brand_lead", "brand_reviewer"] as const;
  for (const role of roles) {
    const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: role });
    if (data) return;
  }
  throw new Error("Only a brand lead can edit a brand guide.");
}

export const saveBrandGuideEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        slug: z.string().min(1).max(120),
        divisionId: z.string().min(1).max(120),
        patch: z.record(z.string(), z.any()),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as unknown as AnySupabase;
    await assertBrandEditor(supabase, context.userId);

    const patch: BrandGuidePatch = sanitizeBrandGuidePatch(data.patch);
    patch.editedAt = new Date().toISOString().slice(0, 7);

    const { error } = await supabase.from("brand_guide_edits").upsert(
      {
        slug: data.slug,
        division_id: data.divisionId,
        patch,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    );
    if (error) throw new Error(error.message);

    // Colour edits re-theme decks and print only where the division keeps its
    // own palette; TransPerfect divisions all render the enterprise palette.
    let retheme: { applied: boolean; reason?: string } = { applied: false };
    const lead = patch.primaryColors?.[0]?.hex;
    const accent = patch.secondaryColors?.[0]?.hex;
    if (colorEditsRetheme(data.divisionId) && (lead || accent)) {
      const { data: mode } = await supabase
        .from("brand_modes")
        .select("id, tokens")
        .eq("id", data.divisionId)
        .maybeSingle();
      if (mode) {
        const tokens = { ...((mode.tokens as Record<string, string>) ?? {}) };
        if (lead) tokens["primary"] = lead;
        if (accent) tokens["accent"] = accent;
        const neutral = patch.neutrals?.[0]?.hex;
        if (neutral) tokens["surface"] = neutral;
        const { error: modeErr } = await supabase
          .from("brand_modes")
          .update({ tokens })
          .eq("id", data.divisionId);
        if (modeErr) retheme = { applied: false, reason: modeErr.message };
        else retheme = { applied: true };
      } else {
        retheme = { applied: false, reason: "No render palette is linked to this guide." };
      }
    } else if (lead || accent) {
      retheme = {
        applied: false,
        reason:
          "TransPerfect divisions all render in the approved enterprise palette, so this colour change updates the guide only.",
      };
    }

    return { ok: true, patch, retheme };
  });

export const resetBrandGuideEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(raw))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as unknown as AnySupabase;
    await assertBrandEditor(supabase, context.userId);
    const { error } = await supabase.from("brand_guide_edits").delete().eq("slug", data.slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

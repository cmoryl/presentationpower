// Live demo overrides — the saved, admin-edited version of a showcase demo.
//
// Demo pages are public, so reads go through a publishable-key server client
// (narrow public SELECT policy). Writes are admin-only: the middleware gives us
// the caller, and we re-verify `has_role(auth.uid(), 'admin')` before touching
// the table.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export type DemoKind = "deck" | "print";

export type DemoOverrideRow = {
  demoKind: DemoKind;
  demoId: string;
  divisionKey: string;
  payload: Record<string, unknown>;
  label: string | null;
  updatedAt: string;
};

const Key = z.object({
  demoKind: z.enum(["deck", "print"]),
  demoId: z.string().min(1).max(200),
  divisionKey: z.string().max(120).default(""),
});

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
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

/** Public read: every saved override for one demo (all divisions). */
export const listDemoOverrides = createServerFn({ method: "GET" })
  .inputValidator((input: { demoKind: DemoKind; demoId: string }) =>
    z.object({ demoKind: z.enum(["deck", "print"]), demoId: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data }): Promise<DemoOverrideRow[]> => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from("demo_overrides")
      .select("demo_kind, demo_id, division_key, payload, label, updated_at")
      .eq("demo_kind", data.demoKind)
      .eq("demo_id", data.demoId);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        demoKind: row["demo_kind"] as DemoKind,
        demoId: row["demo_id"] as string,
        divisionKey: (row["division_key"] as string) ?? "",
        payload: (row["payload"] as Record<string, unknown>) ?? {},
        label: (row["label"] as string | null) ?? null,
        updatedAt: (row["updated_at"] as string) ?? "",
      };
    });
  });

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const sb = context.supabase as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message?: string } | null }>;
  };
  const { data, error } = await sb.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message ?? "Role check failed");
  if (data !== true) throw new Error("Admins only");
}

/** Admin write: publish the current editor state as the live demo. */
export const saveDemoOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    demoKind: DemoKind;
    demoId: string;
    divisionKey?: string;
    payload: Record<string, unknown>;
    label?: string;
  }) =>
    Key.extend({
      payload: z.record(z.unknown()),
      label: z.string().max(200).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as { supabase: unknown; userId: string });
    const sb = context.supabase as unknown as {
      from: (t: string) => {
        upsert: (
          row: Record<string, unknown>,
          opts: { onConflict: string },
        ) => PromiseLike<{ error: { message?: string } | null }>;
      };
    };
    const { error } = await sb.from("demo_overrides").upsert(
      {
        demo_kind: data.demoKind,
        demo_id: data.demoId,
        division_key: data.divisionKey ?? "",
        payload: data.payload,
        label: data.label ?? null,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "demo_kind,demo_id,division_key" },
    );
    if (error) throw new Error(error.message ?? "Could not publish this demo");
    return { ok: true };
  });

/** Admin write: drop the override so the demo falls back to the authored build. */
export const clearDemoOverride = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { demoKind: DemoKind; demoId: string; divisionKey?: string }) =>
    Key.parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as { supabase: unknown; userId: string });
    const sb = context.supabase as unknown as {
      from: (t: string) => {
        delete: () => {
          eq: (c: string, v: unknown) => {
            eq: (c: string, v: unknown) => {
              eq: (c: string, v: unknown) => PromiseLike<{ error: { message?: string } | null }>;
            };
          };
        };
      };
    };
    const { error } = await sb
      .from("demo_overrides")
      .delete()
      .eq("demo_kind", data.demoKind)
      .eq("demo_id", data.demoId)
      .eq("division_key", data.divisionKey ?? "");
    if (error) throw new Error(error.message ?? "Could not reset this demo");
    return { ok: true };
  });

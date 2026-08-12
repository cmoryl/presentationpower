// "My Files" — one aggregated, owner-scoped view of everything a user has
// created or edited across the app: presentation decks, print assets, saved
// modules, and social/email surfaces. Each source table is owner_id scoped and
// RLS-protected, so the authenticated Supabase client already filters to the
// caller.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type MyFileKind = "deck" | "print" | "module" | "surface";

export type MyFile = {
  id: string;
  kind: MyFileKind;
  title: string;
  subtitle: string | null;
  status: string | null;
  href: string;
  thumbnailUrl: string | null;
  updatedAt: string;
  createdAt: string;
};

const PRINT_LABELS: Record<string, string> = {
  "case-study": "Case study",
  spotlight: "Product spotlight",
  ebrochure: "E-brochure",
  "adaptor-brief": "Adaptor brief",
};

export const listMyFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [decks, prints, modules, surfaces] = await Promise.all([
      supabase
        .from("decks")
        .select("id, title, status, updated_at, created_at, archetype_id")
        .order("updated_at", { ascending: false })
        .limit(300),
      supabase
        .from("print_assets")
        .select("id, title, kind, status, updated_at, created_at")
        .order("updated_at", { ascending: false })
        .limit(300),
      supabase
        .from("saved_modules")
        .select("id, title, variant_id, save_kind, thumbnail_url, updated_at, created_at")
        .order("updated_at", { ascending: false })
        .limit(300),
      supabase
        .from("surfaces")
        .select("id, title, kind, format, thumbnail_url, updated_at, created_at")
        .order("updated_at", { ascending: false })
        .limit(300),
    ]);

    const firstError = decks.error ?? prints.error ?? modules.error ?? surfaces.error;
    if (firstError) throw firstError;

    const items: MyFile[] = [];

    for (const d of decks.data ?? []) {
      const row = d as Record<string, unknown>;
      items.push({
        id: String(row.id),
        kind: "deck",
        title: (row.title as string) || "Untitled deck",
        subtitle: (row.archetype_id as string) ?? "Presentation",
        status: (row.status as string) ?? null,
        href: `/decks/${row.id}`,
        thumbnailUrl: null,
        updatedAt: String(row.updated_at ?? row.created_at),
        createdAt: String(row.created_at),
      });
    }

    for (const p of prints.data ?? []) {
      const row = p as Record<string, unknown>;
      const kind = String(row.kind ?? "");
      items.push({
        id: String(row.id),
        kind: "print",
        title: (row.title as string) || "Untitled print asset",
        subtitle: PRINT_LABELS[kind] ?? kind ?? "Print",
        status: (row.status as string) ?? null,
        href: `/asset/${row.id}`,
        thumbnailUrl: null,
        updatedAt: String(row.updated_at ?? row.created_at),
        createdAt: String(row.created_at),
      });
    }

    for (const m of modules.data ?? []) {
      const row = m as Record<string, unknown>;
      items.push({
        id: String(row.id),
        kind: "module",
        title: (row.title as string) || "Saved module",
        subtitle: (row.variant_id as string) ?? "Module",
        status: (row.save_kind as string) ?? null,
        href: "/library/my",
        thumbnailUrl: (row.thumbnail_url as string) ?? null,
        updatedAt: String(row.updated_at ?? row.created_at),
        createdAt: String(row.created_at),
      });
    }

    for (const s of surfaces.data ?? []) {
      const row = s as Record<string, unknown>;
      items.push({
        id: String(row.id),
        kind: "surface",
        title: (row.title as string) || "Untitled surface",
        subtitle: [row.kind, row.format].filter(Boolean).join(" · ") || "Surface",
        status: null,
        href: row.kind === "email" ? "/social" : "/social",
        thumbnailUrl: (row.thumbnail_url as string) ?? null,
        updatedAt: String(row.updated_at ?? row.created_at),
        createdAt: String(row.created_at),
      });
    }

    items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return items;
  });

const deleteInput = z.object({
  kind: z.enum(["deck", "print", "module", "surface"]),
  id: z.string().uuid(),
});

const TABLE_FOR_KIND: Record<MyFileKind, "decks" | "print_assets" | "saved_modules" | "surfaces"> = {
  deck: "decks",
  print: "print_assets",
  module: "saved_modules",
  surface: "surfaces",
};

export const deleteMyFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteInput.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from(TABLE_FOR_KIND[data.kind])
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

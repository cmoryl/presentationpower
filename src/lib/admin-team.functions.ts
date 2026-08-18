// Admin "Team" view — a super-admin, cross-user roll-up of everything created
// in the workspace: decks, print assets, saved slides/modules, and surfaces.
// Admin-only: the caller's admin role is verified via has_role() before any
// read, and reads go through the admin client so ownership is not filtered.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TeamFileKind = "deck" | "print" | "module" | "slide" | "surface";

export type TeamFile = {
  id: string;
  kind: TeamFileKind;
  title: string;
  subtitle: string | null;
  status: string | null;
  href: string;
  ownerId: string | null;
  updatedAt: string;
  createdAt: string;
  fileName?: string | null;
  fileSize?: number | null;
};

export type TeamMember = {
  userId: string;
  email: string | null;
  displayName: string | null;
  roles: string[];
  lastSignInAt: string | null;
  counts: Record<TeamFileKind, number>;
  total: number;
};

export type TeamOverview = {
  members: TeamMember[];
  files: TeamFile[];
  totals: Record<TeamFileKind, number>;
};

type AnyClient = {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  auth: {
    admin: {
      listUsers: (opts?: { page?: number; perPage?: number }) => Promise<{
        data: {
          users: Array<{
            id: string;
            email?: string;
            created_at: string;
            last_sign_in_at: string | null;
          }>;
        };
        error: unknown;
      }>;
    };
  };
};

const PRINT_LABELS: Record<string, string> = {
  "case-study": "Case study",
  spotlight: "Product spotlight",
  ebrochure: "E-brochure",
  "adaptor-brief": "Adaptor brief",
};

const emptyCounts = (): Record<TeamFileKind, number> => ({
  deck: 0,
  print: 0,
  module: 0,
  slide: 0,
  surface: 0,
});

export const getTeamOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TeamOverview> => {
    // 1. Verify the caller really is an admin, through the *user* client.
    const userClient = context.supabase as unknown as AnyClient;
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin required");

    // 2. Read across all owners with the privileged client.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as unknown as AnyClient;

    const [decks, prints, modules, surfaces, profiles, roles, usersRes] = await Promise.all([
      sa
        .from("decks")
        .select("id, title, status, owner_id, archetype_id, updated_at, created_at")
        .order("updated_at", { ascending: false })
        .limit(1000),
      sa
        .from("print_assets")
        .select("id, title, kind, status, owner_id, updated_at, created_at")
        .order("updated_at", { ascending: false })
        .limit(1000),
      sa
        .from("saved_modules")
        .select(
          "id, title, variant_id, save_kind, owner_id, content, source_slide_id, file_path, file_name, file_size, updated_at, created_at",
        )
        .order("updated_at", { ascending: false })
        .limit(1000),
      sa
        .from("surfaces")
        .select("id, title, kind, format, owner_id, updated_at, created_at")
        .order("updated_at", { ascending: false })
        .limit(1000),
      sa.from("profiles").select("id, display_name"),
      sa.from("user_roles").select("user_id, role"),
      sa.auth.admin.listUsers({ page: 1, perPage: 200 }),
    ]);

    const files: TeamFile[] = [];

    for (const row of (decks.data ?? []) as Record<string, unknown>[]) {
      files.push({
        id: String(row.id),
        kind: "deck",
        title: (row.title as string) || "Untitled deck",
        subtitle: (row.archetype_id as string) ?? "Presentation",
        status: (row.status as string) ?? null,
        href: `/decks/${row.id}`,
        ownerId: (row.owner_id as string) ?? null,
        updatedAt: String(row.updated_at ?? row.created_at),
        createdAt: String(row.created_at),
      });
    }

    for (const row of (prints.data ?? []) as Record<string, unknown>[]) {
      const kind = String(row.kind ?? "");
      files.push({
        id: String(row.id),
        kind: "print",
        title: (row.title as string) || "Untitled print asset",
        subtitle: PRINT_LABELS[kind] ?? kind ?? "Print",
        status: (row.status as string) ?? null,
        href: `/asset/${row.id}`,
        ownerId: (row.owner_id as string) ?? null,
        updatedAt: String(row.updated_at ?? row.created_at),
        createdAt: String(row.created_at),
      });
    }

    for (const row of (modules.data ?? []) as Record<string, unknown>[]) {
      const content = (row.content ?? {}) as Record<string, unknown>;
      const blocks = content["__canvasBlocks"];
      const composition = content["composition"] as Record<string, unknown> | undefined;
      const compositionItems = composition?.["items"];
      const isSlide =
        Boolean(row.source_slide_id) ||
        content["__slideOrigin"] === "deck" ||
        (Array.isArray(blocks) && blocks.length > 0) ||
        (Array.isArray(compositionItems) && compositionItems.length > 0);
      files.push({
        id: String(row.id),
        kind: isSlide ? "slide" : "module",
        title: (row.title as string) || (isSlide ? "Saved slide" : "Saved module"),
        subtitle: (row.variant_id as string) ?? (isSlide ? "Slide" : "Module"),
        status: (row.save_kind as string) ?? null,
        href: "/library/my",
        ownerId: (row.owner_id as string) ?? null,
        fileName: row.file_path ? ((row.file_name as string) ?? "slide.pptx") : null,
        fileSize: (row.file_size as number) ?? null,
        updatedAt: String(row.updated_at ?? row.created_at),
        createdAt: String(row.created_at),
      });
    }

    for (const row of (surfaces.data ?? []) as Record<string, unknown>[]) {
      files.push({
        id: String(row.id),
        kind: "surface",
        title: (row.title as string) || "Untitled surface",
        subtitle: [row.kind, row.format].filter(Boolean).join(" · ") || "Surface",
        status: null,
        href: "/social",
        ownerId: (row.owner_id as string) ?? null,
        updatedAt: String(row.updated_at ?? row.created_at),
        createdAt: String(row.created_at),
      });
    }

    files.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

    const nameById = new Map<string, string | null>();
    for (const p of ((profiles.data ?? []) as Record<string, unknown>[]) ?? []) {
      nameById.set(String(p.id), (p.display_name as string) ?? null);
    }
    const rolesById = new Map<string, string[]>();
    for (const r of ((roles.data ?? []) as Record<string, unknown>[]) ?? []) {
      const key = String(r.user_id);
      rolesById.set(key, [...(rolesById.get(key) ?? []), String(r.role)]);
    }

    const authUsers = usersRes?.data?.users ?? [];
    const memberMap = new Map<string, TeamMember>();
    const ensure = (userId: string): TeamMember => {
      let m = memberMap.get(userId);
      if (!m) {
        m = {
          userId,
          email: null,
          displayName: nameById.get(userId) ?? null,
          roles: rolesById.get(userId) ?? [],
          lastSignInAt: null,
          counts: emptyCounts(),
          total: 0,
        };
        memberMap.set(userId, m);
      }
      return m;
    };

    for (const u of authUsers) {
      const m = ensure(u.id);
      m.email = u.email ?? null;
      m.lastSignInAt = u.last_sign_in_at ?? null;
    }

    const totals = emptyCounts();
    for (const f of files) {
      totals[f.kind] += 1;
      if (!f.ownerId) continue;
      const m = ensure(f.ownerId);
      m.counts[f.kind] += 1;
      m.total += 1;
    }

    const members = [...memberMap.values()].sort(
      (a, b) => b.total - a.total || (a.email ?? "").localeCompare(b.email ?? ""),
    );

    return { members, files, totals };
  });

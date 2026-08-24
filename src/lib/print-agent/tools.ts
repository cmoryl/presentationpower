// Tool set for the print agent. Everything here is scoped to the print
// library and the caller's own print_assets rows (RLS applies through the
// user-token Supabase client handed in as context).
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  PRINT_LIBRARY_ITEMS,
  PRINT_TYPES,
  matchesQuery,
  type PrintLibraryItem,
} from "@/lib/print-library/catalog";
import {
  PRINT_SECTION_MODULES,
  PRINT_MODULE_FAMILY_ORDER,
  findPrintModule,
  printModuleFamilyMeta,
  printModuleMatches,
  type PrintModuleFamily,
} from "@/lib/print-library/section-modules";
import { toEditableContent, editableContextFor } from "@/lib/print-library/editable";
import {
  emptyCaseStudy,
  emptySpotlight,
  emptyEBrochure,
  emptyAdaptorBrief,
  emptyMsaPartnership,
  emptySolutionProposal,
} from "@/lib/print-assets.types";

export const PRINT_PROPOSAL_TOOL_NAME = "propose_print_piece";
/** Reuse-first: ranked existing pieces the user can start from. */
export const PRINT_SUGGEST_TOOL_NAME = "suggest_existing_pieces";
/** Visual look & feel proposal — palette, hero imagery options, module plan. */
export const PRINT_LOOK_TOOL_NAME = "propose_look_and_feel";
/** The module/variation palette for a print kind. */
export const PRINT_MODULES_TOOL_NAME = "list_module_variations";
/** Renders a live, to-scale preview of the piece inside the chat. */
export const PRINT_PREVIEW_TOOL_NAME = "preview_print_asset";

const KindEnum = z.enum([
  "case-study",
  "spotlight",
  "ebrochure",
  "adaptor-brief",
  "msa-partnership",
  "solution-proposal",
]);


export type PrintToolContext = {
  supabase: SupabaseClient;
  userId: string;
};

type Rec = Record<string, unknown>;

function slim(item: PrintLibraryItem) {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    blurb: item.blurb,
    divisionId: item.divisionId,
    collection: item.collection ?? null,
    source: item.source,
    editable: Boolean(toEditableContent(item)),
    tags: item.tags ?? [],
  };
}

function seedContent(
  kind: z.infer<typeof KindEnum>,
  data: {
    title: string;
    prospect?: string;
    industry?: string;
    audience?: string;
    objective?: string;
  },
): Rec {
  const summary = data.objective ?? "";
  if (kind === "spotlight")
    return emptySpotlight({
      productName: data.prospect || data.title,
      summary,
    }) as unknown as Rec;
  if (kind === "ebrochure") return emptyEBrochure({ title: data.title, summary }) as unknown as Rec;
  if (kind === "adaptor-brief")
    return emptyAdaptorBrief({ title: data.title, summary }) as unknown as Rec;
  if (kind === "msa-partnership")
    return emptyMsaPartnership({ partner: data.prospect || "" }) as unknown as Rec;
  if (kind === "solution-proposal")
    return emptySolutionProposal({
      title: data.title,
      summary,
      preparedFor: { label: "Prepared for:", company: data.prospect || "Client Company" },
    }) as unknown as Rec;
  return emptyCaseStudy({
    client: data.prospect || "",
    industry: data.industry || "",
    audience: data.audience || "",
    summary,
  }) as unknown as Rec;
}

export function buildPrintAgentToolSet(ctx: PrintToolContext): ToolSet {
  const { supabase, userId } = ctx;

  const loadAsset = async (assetId: string) => {
    const { data, error } = await supabase
      .from("print_assets")
      .select("id, kind, title, brand_mode_id, content")
      .eq("id", assetId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("That print piece was not found.");
    return data as {
      id: string;
      kind: string;
      title: string;
      brand_mode_id: string | null;
      content: Rec;
    };
  };

  return {
    list_print_types: tool({
      description:
        "List the print asset types this app can build (case study, spotlight, e-brochure, MSA partnership, solution proposal, adaptor brief).",
      inputSchema: z.object({}),
      execute: async () => PRINT_TYPES,
    }),

    list_print_divisions: tool({
      description:
        "List the brand modes / divisions a print piece can be branded for, with their id, name and description.",
      inputSchema: z.object({}),
      execute: async () =>
        BRAND_MODES.map((m) => ({ id: m.id, name: m.name, description: m.description })),
    }),

    search_print_library: tool({
      description:
        "Search the curated print library (templates + curated masters). Filter by free text, print kind and/or division brand-mode id.",
      inputSchema: z.object({
        query: z.string().optional(),
        kind: KindEnum.optional(),
        divisionId: z.string().optional(),
        limit: z.number().int().min(1).max(40).optional(),
      }),
      execute: async ({ query, kind, divisionId, limit }) => {
        const hits = PRINT_LIBRARY_ITEMS.filter((i) => {
          if (kind && i.kind !== kind) return false;
          if (divisionId && i.divisionId !== null && i.divisionId !== divisionId) return false;
          return matchesQuery(i, query ?? "");
        });
        return {
          total: hits.length,
          items: hits.slice(0, limit ?? 12).map(slim),
        };
      },
    }),

    search_print_modules: tool({
      description:
        "Search the print section-module library (hero, stats, quote, features, narrative, table, contact, logo grid, device …). Returns module ids usable with add_print_module.",
      inputSchema: z.object({
        query: z.string().optional(),
        family: z.string().optional(),
        kind: KindEnum.optional(),
        limit: z.number().int().min(1).max(40).optional(),
      }),
      execute: async ({ query, family, kind, limit }) => {
        const hits = PRINT_SECTION_MODULES.filter((m) => {
          if (family && m.family !== family) return false;
          if (kind && !m.bestFor.includes(kind)) return false;
          return query ? printModuleMatches(m, query) : true;
        });
        return {
          total: hits.length,
          modules: hits.slice(0, limit ?? 15).map((m) => ({
            id: m.id,
            family: m.family,
            variantId: m.variantId,
            label: m.label,
            description: m.description,
            density: m.density,
            bestFor: m.bestFor,
          })),
        };
      },
    }),

    [PRINT_PROPOSAL_TOOL_NAME]: tool({
      description:
        "Show the user a structured proposal for the print piece before building it: type, division, title and the ordered section modules. No side effects.",
      inputSchema: z.object({
        kind: KindEnum,
        title: z.string().min(1),
        divisionId: z.string().min(1),
        rationale: z.string().max(400).optional(),
        sections: z
          .array(
            z.object({
              moduleId: z.string().optional(),
              label: z.string().min(1),
              note: z.string().max(200).optional(),
            }),
          )
          .min(1)
          .max(12),
      }),
      execute: async (input) => ({ ok: true, proposal: input }),
    }),

    [PRINT_SUGGEST_TOOL_NAME]: tool({
      description:
        "REUSE FIRST. Given the user's need, return the best already-existing starting points: curated/approved library pieces and the user's own saved print pieces, each with a one-line reason. The chat renders these as live visual preview cards, so call this before proposing anything new.",
      inputSchema: z.object({
        need: z.string().min(2).max(400),
        kind: KindEnum.optional(),
        divisionId: z.string().optional(),
        limit: z.number().int().min(1).max(8).optional(),
      }),
      execute: async ({ need, kind, divisionId, limit }) => {
        const words = need
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((w) => w.length > 2)
          .slice(0, 12);
        const cap = limit ?? 4;

        const scoreItem = (i: PrintLibraryItem) => {
          let s = 0;
          for (const w of words) if (matchesQuery(i, w)) s += 2;
          if (kind && i.kind === kind) s += 6;
          if (divisionId && i.divisionId === divisionId) s += 4;
          if (i.divisionId === null) s += 1;
          if (toEditableContent(i)) s += 3;
          if (i.source === "curated") s += 2;
          return s;
        };
        const library = PRINT_LIBRARY_ITEMS.filter((i) => !kind || i.kind === kind)
          .map((i) => ({ i, s: scoreItem(i) }))
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, cap)
          .map(({ i, s }) => ({
            ...slim(i),
            score: s,
            why:
              (kind && i.kind === kind ? "same type" : i.kind) +
              (divisionId && i.divisionId === divisionId ? " · same division" : "") +
              (toEditableContent(i) ? " · fully editable copy" : ""),
          }));

        const { data: mineRows } = await supabase
          .from("print_assets")
          .select("id, kind, title, brand_mode_id, updated_at")
          .eq("owner_id", userId)
          .order("updated_at", { ascending: false })
          .limit(40);
        const mine = ((mineRows ?? []) as Array<Rec>)
          .map((r) => {
            const title = String(r["title"] ?? "").toLowerCase();
            let s = 0;
            for (const w of words) if (title.includes(w)) s += 2;
            if (kind && r["kind"] === kind) s += 5;
            if (divisionId && r["brand_mode_id"] === divisionId) s += 3;
            return { r, s };
          })
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, cap)
          .map(({ r, s }) => ({
            assetId: String(r["id"]),
            kind: String(r["kind"]),
            title: String(r["title"]),
            divisionId: (r["brand_mode_id"] as string | null) ?? null,
            updatedAt: String(r["updated_at"] ?? ""),
            score: s,
            why: "you already own this — duplicate or keep editing it",
          }));

        return {
          ok: true,
          need,
          library,
          mine,
          note:
            library.length + mine.length === 0
              ? "Nothing close enough exists — build from a brief."
              : "Offer these before building from scratch.",
        };
      },
    }),

    [PRINT_MODULES_TOOL_NAME]: tool({
      description:
        "Show the user which section modules and variations exist (optionally narrowed to a print kind or family). The chat renders this as a grouped module palette with every variation chip, so use it whenever the user asks what sections/modules are supported.",
      inputSchema: z.object({
        kind: KindEnum.optional(),
        family: z.string().optional(),
      }),
      execute: async ({ kind, family }) => {
        const pool = PRINT_SECTION_MODULES.filter((m) => {
          if (kind && !m.bestFor.includes(kind)) return false;
          if (family && m.family !== family) return false;
          return true;
        });
        const families = PRINT_MODULE_FAMILY_ORDER.map((fam: PrintModuleFamily) => {
          const meta = printModuleFamilyMeta(fam);
          const variants = pool.filter((m) => m.family === fam);
          return {
            family: fam,
            label: meta?.label ?? fam,
            description: meta?.description ?? "",
            variants: variants.map((m) => ({
              moduleId: m.id,
              variantId: m.variantId,
              label: m.label,
              density: m.density,
            })),
          };
        }).filter((f) => f.variants.length > 0);
        return {
          ok: true,
          ...(kind ? { kind } : {}),
          familyCount: families.length,
          moduleCount: pool.length,
          totalInLibrary: PRINT_SECTION_MODULES.length,
          families,
        };
      },
    }),

    list_hero_imagery: tool({
      description:
        "List approved hero imagery available for a division (the shared imagery pool). Use the returned urls as heroOptions in propose_look_and_feel and as heroImageUrl in set_print_look.",
      inputSchema: z.object({
        divisionId: z.string().min(1),
        limit: z.number().int().min(1).max(12).optional(),
      }),
      execute: async ({ divisionId, limit }) => {
        const { data, error } = await supabase
          .from("division_imagery")
          .select("id, filename, note, tags, kind, storage_path, variants, template_kinds")
          .eq("division_id", divisionId)
          .eq("approved", true)
          .order("created_at", { ascending: false })
          .limit(limit ?? 8);
        if (error) return { error: error.message };
        const rows = (data ?? []) as Array<Rec>;
        const signed = await Promise.all(
          rows.map(async (r) => {
            const variants = (r["variants"] ?? {}) as Record<string, { path?: string }>;
            const path =
              variants["landscape"]?.path ??
              variants["thumb"]?.path ??
              String(r["storage_path"] ?? "");
            const res = path
              ? await supabase.storage.from("division-imagery").createSignedUrl(path, 60 * 60 * 24)
              : null;
            return {
              id: String(r["id"]),
              label: String(r["note"] || r["filename"] || "Hero image"),
              kind: (r["kind"] as string | null) ?? null,
              tags: (r["tags"] as string[] | null) ?? [],
              url: res?.data?.signedUrl ?? null,
            };
          }),
        );
        const images = signed.filter((i) => Boolean(i.url));
        return {
          ok: true,
          divisionId,
          count: images.length,
          images,
          note:
            images.length === 0
              ? "No approved imagery in this division pool — the piece falls back to the division aura/gradient hero."
              : undefined,
        };
      },
    }),

    [PRINT_LOOK_TOOL_NAME]: tool({
      description:
        "Show the user the LOOK AND FEEL you intend to use before/while building: division brand palette, light or dark page mode, page size + density, the hero imagery options (urls from list_hero_imagery), and the ordered section modules with their variations. The chat renders this as a visual card with real swatches and hero thumbnails.",
      inputSchema: z.object({
        divisionId: z.string().min(1),
        mode: z.enum(["light", "dark"]),
        pageSize: z.enum(["A4","Letter","Square","HalfLetter","A5"]).optional(),
        density: z.enum(["compact", "standard", "airy"]).optional(),
        rationale: z.string().max(400).optional(),
        heroOptions: z
          .array(
            z.object({
              label: z.string().min(1),
              url: z.string().optional(),
              note: z.string().max(160).optional(),
              recommended: z.boolean().optional(),
            }),
          )
          .max(6)
          .optional(),
        modules: z
          .array(
            z.object({
              moduleId: z.string().optional(),
              label: z.string().min(1),
              note: z.string().max(160).optional(),
            }),
          )
          .max(12)
          .optional(),
      }),
      execute: async (input) => {
        const brand = BRAND_MODES.find((m) => m.id === input.divisionId);
        if (!brand)
          return { error: `Unknown division "${input.divisionId}". Call list_print_divisions.` };
        const modules = (input.modules ?? []).map((m) => {
          const mod = m.moduleId ? findPrintModule(m.moduleId) : undefined;
          return {
            ...m,
            resolvedLabel: mod?.label ?? m.label,
            family: mod?.family ?? null,
            variantId: mod?.variantId ?? null,
            density: mod?.density ?? null,
          };
        });
        return {
          ok: true,
          look: {
            ...input,
            modules,
            brandName: brand.name,
            palette: brand.tokens,
          },
        };
      },
    }),

    set_print_look: tool({
      description:
        "Apply look and feel to an existing print piece: page mode (light/dark), page size, density and the hero image. Call this after the user picks a direction, then call preview_print_asset so they see it.",
      inputSchema: z.object({
        assetId: z.string().uuid(),
        mode: z.enum(["light", "dark"]).optional(),
        pageSize: z.enum(["A4","Letter","Square","HalfLetter","A5"]).optional(),
        density: z.enum(["compact", "standard", "airy"]).optional(),
        heroImageUrl: z.string().optional(),
        heroHeightPct: z.number().min(20).max(70).optional(),
        overlayOpacity: z.number().min(0).max(1).optional(),
      }),
      execute: async ({
        assetId,
        mode,
        pageSize,
        density,
        heroImageUrl,
        heroHeightPct,
        overlayOpacity,
      }) => {
        const { data, error: readErr } = await supabase
          .from("print_assets")
          .select("id, content, context")
          .eq("id", assetId)
          .maybeSingle();
        if (readErr) return { error: readErr.message };
        if (!data) return { error: "That print piece was not found." };
        const row = data as { content: Rec | null; context: Rec | null };
        const content = { ...(row.content ?? {}) } as Rec;
        const context = { ...(row.context ?? {}) } as Rec;
        if (mode) context["editorMode"] = mode;
        if (pageSize) context["pageSize"] = pageSize;
        if (density) context["density"] = density;
        if (heroImageUrl || heroHeightPct !== undefined || overlayOpacity !== undefined) {
          const hero = { ...((content["heroMedia"] ?? {}) as Rec) };
          if (heroImageUrl) hero["imageUrl"] = heroImageUrl;
          if (heroHeightPct !== undefined) hero["heightPct"] = heroHeightPct;
          if (overlayOpacity !== undefined) hero["overlayOpacity"] = overlayOpacity;
          content["heroMedia"] = hero;
        }
        const { error } = await supabase
          .from("print_assets")
          .update({
            content: content as never,
            context: context as never,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", assetId);
        if (error) return { error: error.message };
        return {
          ok: true,
          print_asset_id: assetId,
          applied: { mode, pageSize, density, heroImageUrl: Boolean(heroImageUrl) },
        };
      },
    }),

    [PRINT_PREVIEW_TOOL_NAME]: tool({
      description:
        "Render a live, to-scale preview of a print piece the user owns directly in the chat. Call this after every build step (create, add/remove module, copy pass, look change) so the user sees the page update as you work.",
      inputSchema: z.object({
        assetId: z.string().uuid(),
        note: z.string().max(200).optional(),
        page: z.number().int().min(0).max(40).optional(),
      }),
      execute: async ({ assetId, note, page }) => {
        const asset = await loadAsset(assetId);
        const content = (asset.content ?? {}) as Rec;
        const modules = Array.isArray(content["modules"]) ? (content["modules"] as Rec[]) : [];
        return {
          ok: true,
          print_asset_id: asset.id,
          kind: asset.kind,
          title: asset.title,
          divisionId: asset.brand_mode_id,
          moduleCount: modules.length,
          ...(note ? { note } : {}),
          ...(page !== undefined ? { page } : {}),
        };
      },
    }),



    list_my_print_assets: tool({
      description: "List the print pieces the signed-in user already owns.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(50).optional() }),
      execute: async ({ limit }) => {
        const { data, error } = await supabase
          .from("print_assets")
          .select("id, kind, title, brand_mode_id, updated_at")
          .eq("owner_id", userId)
          .order("updated_at", { ascending: false })
          .limit(limit ?? 20);
        if (error) throw new Error(error.message);
        return data ?? [];
      },
    }),

    create_print_asset_from_template: tool({
      description:
        "Create a fully editable copy of a curated print library item for the user. Use this whenever a library item matches the ask.",
      inputSchema: z.object({
        libraryItemId: z.string().min(1),
        title: z.string().min(1).max(200).optional(),
      }),
      execute: async ({ libraryItemId, title }) => {
        const item = PRINT_LIBRARY_ITEMS.find((i) => i.id === libraryItemId);
        if (!item) return { error: `Unknown library item "${libraryItemId}".` };
        const content = toEditableContent(item);
        if (!content) return { error: "That library item has no editable content yet." };
        const { data, error } = await supabase
          .from("print_assets")
          .insert({
            owner_id: userId,
            kind: item.kind,
            title: title ?? item.title,
            brand_mode_id: item.divisionId ?? "bm-enterprise",
            content: content as never,
            context: editableContextFor(item) as never,
          })
          .select("id, kind, title")
          .single();
        if (error) return { error: error.message };
        const row = data as { id: string; kind: string; title: string };
        return {
          ok: true,
          print_asset_id: row.id,
          kind: row.kind,
          title: row.title,
          editorPath: `/asset/${row.id}`,
        };
      },
    }),

    create_print_asset_from_brief: tool({
      description:
        "Create a new print piece from scratch for a given kind + division, seeded with brand-correct starting structure. Use when no library item fits.",
      inputSchema: z.object({
        kind: KindEnum,
        title: z.string().min(1).max(200),
        divisionId: z.string().min(1),
        prospect: z.string().max(160).optional(),
        industry: z.string().max(120).optional(),
        audience: z.string().max(160).optional(),
        objective: z.string().max(600).optional(),
      }),
      execute: async (input) => {
        const known = BRAND_MODES.some((m) => m.id === input.divisionId);
        if (!known)
          return {
            error: `Unknown division "${input.divisionId}". Call list_print_divisions first.`,
          };
        const content = seedContent(input.kind, input);
        const { data, error } = await supabase
          .from("print_assets")
          .insert({
            owner_id: userId,
            kind: input.kind,
            title: input.title,
            brand_mode_id: input.divisionId,
            content: content as never,
            context: { createdBy: "print-agent" } as never,
          })
          .select("id, kind, title")
          .single();
        if (error) return { error: error.message };
        const row = data as { id: string; kind: string; title: string };
        return {
          ok: true,
          print_asset_id: row.id,
          kind: row.kind,
          title: row.title,
          editorPath: `/asset/${row.id}`,
        };
      },
    }),

    add_print_module: tool({
      description:
        "Append (or insert) a section module from the print module library onto an existing print piece. Module ids come from search_print_modules.",
      inputSchema: z.object({
        assetId: z.string().uuid(),
        moduleId: z.string().min(1),
        position: z.number().int().min(0).optional(),
      }),
      execute: async ({ assetId, moduleId, position }) => {
        const mod = findPrintModule(moduleId);
        if (!mod) return { error: `Unknown module "${moduleId}".` };
        const asset = await loadAsset(assetId);
        const content = { ...(asset.content ?? {}) } as Rec;
        const modules = Array.isArray(content["modules"])
          ? [...(content["modules"] as unknown[])]
          : [];
        const block = mod.make() as unknown;
        const at = position === undefined ? modules.length : Math.min(position, modules.length);
        modules.splice(at, 0, block);
        content["modules"] = modules;
        const { error } = await supabase
          .from("print_assets")
          .update({ content: content as never, updated_at: new Date().toISOString() } as never)
          .eq("id", assetId);
        if (error) return { error: error.message };
        return { ok: true, print_asset_id: assetId, added: mod.label, moduleCount: modules.length };
      },
    }),

    remove_print_module: tool({
      description: "Remove a section module from a print piece by its zero-based index.",
      inputSchema: z.object({ assetId: z.string().uuid(), index: z.number().int().min(0) }),
      execute: async ({ assetId, index }) => {
        const asset = await loadAsset(assetId);
        const content = { ...(asset.content ?? {}) } as Rec;
        const modules = Array.isArray(content["modules"])
          ? [...(content["modules"] as unknown[])]
          : [];
        if (index >= modules.length) return { error: `There is no module at index ${index}.` };
        modules.splice(index, 1);
        content["modules"] = modules;
        const { error } = await supabase
          .from("print_assets")
          .update({ content: content as never, updated_at: new Date().toISOString() } as never)
          .eq("id", assetId);
        if (error) return { error: error.message };
        return { ok: true, print_asset_id: assetId, moduleCount: modules.length };
      },
    }),

    read_print_asset: tool({
      description:
        "Read a print piece the user owns: its kind, title, division and the shape of its content (top-level fields + module list).",
      inputSchema: z.object({ assetId: z.string().uuid() }),
      execute: async ({ assetId }) => {
        const asset = await loadAsset(assetId);
        const content = (asset.content ?? {}) as Rec;
        const modules = Array.isArray(content["modules"]) ? (content["modules"] as Rec[]) : [];
        return {
          print_asset_id: asset.id,
          kind: asset.kind,
          title: asset.title,
          divisionId: asset.brand_mode_id,
          fields: Object.fromEntries(
            Object.entries(content)
              .filter(([k]) => k !== "modules")
              .map(([k, v]) => [
                k,
                typeof v === "string"
                  ? v.slice(0, 400)
                  : Array.isArray(v)
                    ? `[${v.length} items]`
                    : typeof v,
              ]),
          ),
          modules: modules.map((m, i) => ({
            index: i,
            kind: m["kind"] ?? null,
            variantId: m["variantId"] ?? null,
          })),
        };
      },
    }),

    write_print_copy: tool({
      description:
        "Replace copy on a print piece. `fields` is merged over the top level of the content object (e.g. summary, eyebrow, client, tagline, stats, challenge, solution, result). Only send the fields you are changing.",
      inputSchema: z.object({
        assetId: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        fields: z.record(z.string(), z.unknown()),
      }),
      execute: async ({ assetId, title, fields }) => {
        const asset = await loadAsset(assetId);
        const next = { ...(asset.content ?? {}), ...fields } as Rec;
        const patch: Rec = { content: next, updated_at: new Date().toISOString() };
        if (title) patch["title"] = title;
        const { error } = await supabase
          .from("print_assets")
          .update(patch as never)
          .eq("id", assetId);
        if (error) return { error: error.message };
        return { ok: true, print_asset_id: assetId, updated: Object.keys(fields) };
      },
    }),
  };
}

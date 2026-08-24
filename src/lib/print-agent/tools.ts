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

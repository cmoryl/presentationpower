// Tool set for the events / social agents. Everything is scoped to the format
// catalog, the playbook library and the caller's own campaign_kits rows (RLS
// applies through the user-token Supabase client handed in as context).
import { tool, type ToolSet } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  KIT_PROFILES,
  PLATFORM_LABELS,
  SOCIAL_FORMATS,
  SOCIAL_FORMATS_BY_ID,
} from "@/lib/social-formats";
import type { KitSurface } from "./threads";

export const KIT_PROPOSAL_TOOL_NAME = "propose_kit";

type Rec = Record<string, unknown>;

const CopySchema = z.object({
  title: z.string().max(400).optional(),
  summary: z.string().max(1200).optional(),
  cta: z.string().max(120).optional(),
  statValue: z.string().max(40).optional(),
  statLabel: z.string().max(120).optional(),
});

const FactsSchema = z.object({
  name: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  venue: z.string().max(200).optional(),
  startDate: z.string().max(40).optional(),
  endDate: z.string().max(40).optional(),
  registrationUrl: z.string().max(400).optional(),
  hashtag: z.string().max(80).optional(),
  tone: z.enum(["confident", "curious", "authoritative", "warm"]).optional(),
  speakers: z
    .array(z.object({ name: z.string().max(120), role: z.string().max(160).optional() }))
    .max(20)
    .optional(),
  sponsors: z
    .array(
      z.object({
        name: z.string().max(120),
        tier: z.enum(["title", "gold", "silver", "supporter"]).optional(),
      }),
    )
    .max(30)
    .optional(),
});

const ModeEnum = z.enum(["light", "dark", "both"]);

function editorPathFor(surface: KitSurface, kitId: string) {
  return surface === "social" ? `/social/new?kit=${kitId}` : `/events/new?kit=${kitId}`;
}

function slimFormat(id: string) {
  const f = SOCIAL_FORMATS_BY_ID[id];
  if (!f) return { id, label: id };
  return {
    id: f.id,
    label: f.label,
    platform: f.platform,
    category: f.category,
    size: `${f.width}×${f.height}`,
    intent: f.intent,
  };
}

export function buildKitAgentToolSet({
  supabase,
  userId,
  surface,
}: {
  supabase: SupabaseClient;
  userId: string;
  surface: KitSurface;
}): ToolSet {
  async function loadKit(kitId: string) {
    const { data, error } = await supabase
      .from("campaign_kits")
      .select("*")
      .eq("id", kitId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("That kit does not exist or is not yours.");
    return data as Rec;
  }

  return {
    list_divisions: tool({
      description: "List the TransPerfect division brand modes available for a kit.",
      inputSchema: z.object({}),
      execute: async () =>
        BRAND_MODES.map((m) => ({ id: m.id, name: m.name, description: m.description })),
    }),

    list_kit_profiles: tool({
      description:
        "List the approved kit profiles (bundles of formats) with the format ids each one ships.",
      inputSchema: z.object({}),
      execute: async () =>
        KIT_PROFILES.map((p) => ({
          id: p.id,
          label: p.label,
          description: p.description,
          formatIds: p.formatIds,
        })),
    }),

    list_kit_formats: tool({
      description:
        "List/search the approved format presets (aspect ratios and geometries) usable in a kit. Filter by platform, category or free text.",
      inputSchema: z.object({
        platform: z.string().optional(),
        category: z.enum(["social", "email", "signage", "screen", "kit"]).optional(),
        query: z.string().optional(),
        limit: z.number().int().min(1).max(60).optional(),
      }),
      execute: async ({ platform, category, query, limit }) => {
        const q = (query ?? "").trim().toLowerCase();
        const hits = SOCIAL_FORMATS.filter((f) => {
          if (platform && f.platform !== platform) return false;
          if (category && f.category !== category) return false;
          if (!q) return true;
          return `${f.id} ${f.label} ${f.platform} ${f.intent ?? ""}`.toLowerCase().includes(q);
        });
        return {
          total: hits.length,
          platforms: Object.entries(PLATFORM_LABELS).map(([id, label]) => ({ id, label })),
          formats: hits.slice(0, limit ?? 24).map((f) => slimFormat(f.id)),
        };
      },
    }),

    search_playbooks: tool({
      description:
        surface === "social"
          ? "Search the curated social playbook library (angle, division, kit profile, seeded copy). Use these as the grounding for a new kit."
          : "Search the curated event playbook library (event kind, division, kit profile, event facts, deliverables). Use these as the grounding for a new kit.",
      inputSchema: z.object({
        query: z.string().optional(),
        divisionId: z.string().optional(),
        limit: z.number().int().min(1).max(30).optional(),
      }),
      execute: async ({ query, divisionId, limit }) => {
        const q = (query ?? "").trim().toLowerCase();
        if (surface === "social") {
          const { SOCIAL_PLAYBOOKS } = await import("@/lib/social-playbooks");
          const hits = SOCIAL_PLAYBOOKS.filter((p) => {
            if (divisionId && p.subBrand !== divisionId) return false;
            if (!q) return true;
            return `${p.id} ${p.name} ${p.tagline} ${p.intent} ${p.angle}`.toLowerCase().includes(q);
          });
          return {
            total: hits.length,
            playbooks: hits.slice(0, limit ?? 10).map((p) => ({
              id: p.id,
              name: p.name,
              angle: p.angle,
              tagline: p.tagline,
              divisionId: p.subBrand,
              kitProfileId: p.kitProfileId,
              copy: p.copy,
              demoPath: `/social/demo/${p.id}`,
            })),
          };
        }
        const { EVENT_PLAYBOOKS } = await import("@/lib/event-playbooks");
        const hits = EVENT_PLAYBOOKS.filter((p) => {
          if (divisionId && p.subBrand !== divisionId) return false;
          if (!q) return true;
          return `${p.id} ${p.name} ${p.tagline} ${p.intent} ${p.kind}`.toLowerCase().includes(q);
        });
        return {
          total: hits.length,
          playbooks: hits.slice(0, limit ?? 10).map((p) => ({
            id: p.id,
            name: p.name,
            kind: p.kind,
            tagline: p.tagline,
            divisionId: p.subBrand,
            kitProfileId: p.kitProfileId,
            facts: p.facts,
            demoPath: `/events/demo/${p.id}`,
          })),
        };
      },
    }),

    [KIT_PROPOSAL_TOOL_NAME]: tool({
      description:
        "Show the user a structured proposal for the kit before building it: name, division, mode, formats and the copy. No side effects.",
      inputSchema: z.object({
        name: z.string().min(1).max(120),
        divisionId: z.string().min(1),
        mode: ModeEnum.default("light"),
        profileId: z.string().min(1),
        formatIds: z.array(z.string().max(80)).min(1).max(50),
        copy: CopySchema,
        rationale: z.string().max(400).optional(),
      }),
      execute: async (input) => ({ ok: true, proposal: { surface, ...input } }),
    }),

    list_my_kits: tool({
      description: "List the kits the signed-in user already owns on this channel.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(50).optional() }),
      execute: async ({ limit }) => {
        const { data, error } = await supabase
          .from("campaign_kits")
          .select("id, name, surface, brand_id, mode, profile_id, format_ids, updated_at")
          .eq("user_id", userId)
          .eq("surface", surface)
          .order("updated_at", { ascending: false })
          .limit(limit ?? 20);
        if (error) throw new Error(error.message);
        return data ?? [];
      },
    }),

    read_kit: tool({
      description: "Read one of the user's kits: division, mode, formats, copy and event facts.",
      inputSchema: z.object({ kitId: z.string().uuid() }),
      execute: async ({ kitId }) => {
        const kit = await loadKit(kitId);
        return {
          kit_id: kit["id"],
          name: kit["name"],
          surface: kit["surface"],
          divisionId: kit["brand_id"],
          mode: kit["mode"],
          profileId: kit["profile_id"],
          formatIds: kit["format_ids"],
          copy: kit["copy"],
          eventFacts: kit["event_facts"],
          attachEvent: kit["attach_event"],
          editorPath: editorPathFor(surface, String(kit["id"])),
        };
      },
    }),

    create_kit: tool({
      description:
        "Create a real, fully editable kit for the user. Format ids come from list_kit_formats or a kit profile; the division id from list_divisions.",
      inputSchema: z.object({
        name: z.string().min(1).max(120),
        divisionId: z.string().min(1),
        mode: ModeEnum.default("light"),
        profileId: z.string().min(1),
        formatIds: z.array(z.string().max(80)).max(50).optional(),
        copy: CopySchema,
        eventFacts: FactsSchema.optional(),
      }),
      execute: async (input) => {
        if (!BRAND_MODES.some((m) => m.id === input.divisionId))
          return { error: `Unknown division "${input.divisionId}". Call list_divisions first.` };
        const profile = KIT_PROFILES.find((p) => p.id === input.profileId);
        if (!profile)
          return { error: `Unknown kit profile "${input.profileId}". Call list_kit_profiles first.` };
        const formatIds = (input.formatIds?.length ? input.formatIds : profile.formatIds).filter(
          (id) => SOCIAL_FORMATS_BY_ID[id],
        );
        if (formatIds.length === 0)
          return { error: "None of those format ids exist. Call list_kit_formats first." };

        const facts = input.eventFacts ?? {};
        const eventFacts = {
          ...facts,
          subBrand: input.divisionId,
          speakers: facts.speakers ?? [],
          sponsors: facts.sponsors ?? [],
        };
        const { data, error } = await supabase
          .from("campaign_kits")
          .insert({
            user_id: userId,
            name: input.name,
            surface,
            brand_id: input.divisionId,
            mode: input.mode,
            profile_id: input.profileId,
            format_ids: formatIds,
            copy: input.copy as never,
            event_facts: eventFacts as never,
            attach_event: surface === "event",
          } as never)
          .select("id, name")
          .single();
        if (error) return { error: error.message };
        const row = data as { id: string; name: string };
        return {
          ok: true,
          kit_id: row.id,
          name: row.name,
          formats: formatIds.map(slimFormat),
          editorPath: editorPathFor(surface, row.id),
        };
      },
    }),

    update_kit: tool({
      description:
        "Update an existing kit: rename it, change division/mode/profile, swap the format list, rewrite the copy, or merge in event facts.",
      inputSchema: z.object({
        kitId: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        divisionId: z.string().min(1).optional(),
        mode: ModeEnum.optional(),
        profileId: z.string().min(1).optional(),
        formatIds: z.array(z.string().max(80)).max(50).optional(),
        copy: CopySchema.optional(),
        eventFacts: FactsSchema.optional(),
      }),
      execute: async (input) => {
        const kit = await loadKit(input.kitId);
        const patch: Rec = { updated_at: new Date().toISOString() };
        if (input.name) patch["name"] = input.name;
        if (input.divisionId) {
          if (!BRAND_MODES.some((m) => m.id === input.divisionId))
            return { error: `Unknown division "${input.divisionId}".` };
          patch["brand_id"] = input.divisionId;
        }
        if (input.mode) patch["mode"] = input.mode;
        if (input.profileId) {
          if (!KIT_PROFILES.some((p) => p.id === input.profileId))
            return { error: `Unknown kit profile "${input.profileId}".` };
          patch["profile_id"] = input.profileId;
        }
        if (input.formatIds) {
          const ids = input.formatIds.filter((id) => SOCIAL_FORMATS_BY_ID[id]);
          if (ids.length === 0) return { error: "None of those format ids exist." };
          patch["format_ids"] = ids;
        }
        if (input.copy)
          patch["copy"] = { ...((kit["copy"] as Rec) ?? {}), ...input.copy } as never;
        if (input.eventFacts)
          patch["event_facts"] = {
            ...((kit["event_facts"] as Rec) ?? {}),
            ...input.eventFacts,
          } as never;

        const { error } = await supabase
          .from("campaign_kits")
          .update(patch as never)
          .eq("id", input.kitId);
        if (error) return { error: error.message };
        return {
          ok: true,
          kit_id: input.kitId,
          updated: Object.keys(patch).filter((k) => k !== "updated_at"),
          editorPath: editorPathFor(surface, input.kitId),
        };
      },
    }),
  };
}

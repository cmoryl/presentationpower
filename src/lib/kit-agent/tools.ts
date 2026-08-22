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
import {
  BRAND_LOOK_ID,
  DEFAULT_EVENT_LOOK_ID,
  EVENT_LOOKS,
  EVENT_LOOKS_BY_ID,
} from "@/lib/event-looks";
import { DEFAULT_SOCIAL_STYLE_ID, SOCIAL_STYLES } from "@/lib/social-styles";
import { BriefSchema, briefGaps, mergeBrief, readBrief, writeBrief } from "./brief";
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
  threadId,
}: {
  supabase: SupabaseClient;
  userId: string;
  surface: KitSurface;
  /** Conversation the tools belong to — the brief is stored on this row. */
  threadId: string;
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

    // ---------------------------------------------------------------------
    // CONVERSATION MEMORY — the brief. Read at the start of every turn,
    // written whenever the user gives a new fact, so a long conversation
    // keeps building ONE campaign instead of restarting each turn.
    // ---------------------------------------------------------------------
    read_brief: tool({
      description:
        "Read the saved campaign brief for THIS conversation (facts, audience, message, art direction, kits already built). Call this first on every turn before asking the user anything.",
      inputSchema: z.object({}),
      execute: async () => {
        const brief = await readBrief(supabase, threadId);
        return {
          brief,
          missing: briefGaps(brief, surface),
          hasBrief: Object.keys(brief).length > 0,
        };
      },
    }),

    save_brief: tool({
      description:
        "Merge new facts into the saved campaign brief for this conversation. Call it immediately after the user gives or confirms anything (name, audience, message, dates, look, CTA, deliverables, constraints). Empty values never erase stored facts.",
      inputSchema: BriefSchema,
      execute: async (patch) => {
        const current = await readBrief(supabase, threadId);
        const next = mergeBrief(current, patch);
        await writeBrief(supabase, threadId, next);
        return { ok: true, brief: next, missing: briefGaps(next, surface) };
      },
    }),

    // ---------------------------------------------------------------------
    // ART DIRECTION — one look per campaign, shared across every channel.
    // ---------------------------------------------------------------------
    list_looks: tool({
      description:
        "List the approved art directions (looks) and social template styles. A look sets palette, motif, type case and corner character; the style sets the layout/geometry contract. Every asset in one campaign must use the SAME look + style.",
      inputSchema: z.object({ divisionId: z.string().optional() }),
      execute: async ({ divisionId }) => {
        const suggestedLookId = divisionId
          ? (BRAND_LOOK_ID[divisionId] ?? DEFAULT_EVENT_LOOK_ID)
          : DEFAULT_EVENT_LOOK_ID;
        return {
          suggestedLookId,
          looks: EVENT_LOOKS.map((l) => ({
            id: l.id,
            label: l.label,
            tag: l.tag,
            blurb: l.blurb,
            palette: { deep: l.deep, accent: l.accent, accentAlt: l.accentAlt },
            motif: l.motif,
            uppercase: l.uppercase,
            styleId: l.styleId,
          })),
          styles: SOCIAL_STYLES.map((s) => ({ id: s.id, label: s.label, blurb: s.blurb })),
          defaultStyleId: DEFAULT_SOCIAL_STYLE_ID,
        };
      },
    }),

    set_kit_look: tool({
      description:
        "Lock the art direction on a kit so every rendered asset — and every asset generated later on other channels for this division — uses the same palette, motif and layout style.",
      inputSchema: z.object({
        kitId: z.string().uuid(),
        lookId: z.string().min(1),
        styleId: z.string().optional(),
      }),
      execute: async ({ kitId, lookId, styleId }) => {
        if (!EVENT_LOOKS_BY_ID[lookId])
          return { error: `Unknown look "${lookId}". Call list_looks first.` };
        const resolvedStyle = styleId ?? EVENT_LOOKS_BY_ID[lookId]!.styleId;
        if (!SOCIAL_STYLES.some((s) => s.id === resolvedStyle))
          return { error: `Unknown style "${resolvedStyle}". Call list_looks first.` };
        const kit = await loadKit(kitId);
        const facts = { ...((kit["event_facts"] as Rec) ?? {}) };
        facts["look"] = { lookId, styleId: resolvedStyle };
        const { error } = await supabase
          .from("campaign_kits")
          .update({
            event_facts: facts as never,
            updated_at: new Date().toISOString(),
          } as never)
          .eq("id", kitId);
        if (error) return { error: error.message };
        const brief = await readBrief(supabase, threadId);
        await writeBrief(supabase, threadId, mergeBrief(brief, { lookId, styleId: resolvedStyle }));
        return {
          ok: true,
          kit_id: kitId,
          lookId,
          styleId: resolvedStyle,
          editorPath: editorPathFor(surface, kitId),
        };
      },
    }),

    // ---------------------------------------------------------------------
    // COVERAGE — never close a build turn on a half-filled kit.
    // ---------------------------------------------------------------------
    audit_kit: tool({
      description:
        "Check a kit for cohesion and completeness: missing copy slots, missing event facts, unset art direction, and channel coverage gaps. Call this before you tell the user a kit is done, and fix what it reports with update_kit / set_kit_look.",
      inputSchema: z.object({ kitId: z.string().uuid() }),
      execute: async ({ kitId }) => {
        const kit = await loadKit(kitId);
        const copy = (kit["copy"] as Rec) ?? {};
        const facts = (kit["event_facts"] as Rec) ?? {};
        const formatIds = Array.isArray(kit["format_ids"]) ? (kit["format_ids"] as string[]) : [];
        const kitSurface = String(kit["surface"] ?? surface) as KitSurface;

        const issues: string[] = [];
        const need = (key: string, label: string) => {
          const value = copy[key];
          if (typeof value !== "string" || value.trim() === "") issues.push(`copy.${key} (${label})`);
        };
        need("title", "headline every format shows");
        need("summary", "support line");
        need("cta", "call to action");
        if (!copy["statValue"] || !copy["statLabel"])
          issues.push("copy.statValue + copy.statLabel (proof point — number on one line, label on another)");

        if (kitSurface === "event") {
          for (const [key, label] of [
            ["name", "event name"],
            ["city", "city"],
            ["startDate", "start date"],
            ["hashtag", "hashtag"],
            ["registrationUrl", "registration URL"],
          ] as const) {
            const value = facts[key];
            if (typeof value !== "string" || value.trim() === "")
              issues.push(`eventFacts.${key} (${label})`);
          }
        }

        const look = facts["look"] as { lookId?: string; styleId?: string } | undefined;
        if (!look?.lookId)
          issues.push("art direction not locked — call set_kit_look so every asset matches");

        const categories = new Set(
          formatIds.map((id) => SOCIAL_FORMATS_BY_ID[id]?.category).filter(Boolean) as string[],
        );
        const coverage =
          kitSurface === "event"
            ? (["signage", "screen", "social", "email"] as const)
            : (["social", "email"] as const);
        const missingCoverage = coverage.filter((c) => !categories.has(c));

        return {
          kit_id: kitId,
          name: kit["name"],
          formats: formatIds.length,
          lookId: look?.lookId ?? null,
          styleId: look?.styleId ?? null,
          issues,
          missingCoverage,
          ready: issues.length === 0,
          editorPath: editorPathFor(kitSurface, kitId),
        };
      },
    }),

    create_companion_kit: tool({
      description:
        "Spin the campaign onto the other channel while keeping it cohesive: copies this kit's division, mode, copy, event facts and art direction into a kit on the other surface (event -> social, social -> event) with a format profile sized for that channel.",
      inputSchema: z.object({
        kitId: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        profileId: z.string().optional(),
      }),
      execute: async ({ kitId, name, profileId }) => {
        const kit = await loadKit(kitId);
        const from = String(kit["surface"] ?? surface) as KitSurface;
        const to: KitSurface = from === "event" ? "social" : "event";
        const fallbackProfile = to === "event" ? "event-kit" : KIT_PROFILES[0]?.id;
        const profile =
          KIT_PROFILES.find((p) => p.id === (profileId ?? fallbackProfile)) ?? KIT_PROFILES[0];
        if (!profile) return { error: "No kit profiles available." };
        const { data, error } = await supabase
          .from("campaign_kits")
          .insert({
            user_id: userId,
            name: name ?? `${String(kit["name"] ?? "Campaign")} — ${to === "event" ? "event" : "social"}`,
            surface: to,
            brand_id: kit["brand_id"],
            mode: kit["mode"],
            profile_id: profile.id,
            format_ids: profile.formatIds,
            copy: (kit["copy"] ?? {}) as never,
            event_facts: (kit["event_facts"] ?? {}) as never,
            attach_event: to === "event",
          } as never)
          .select("id, name")
          .single();
        if (error) return { error: error.message };
        const row = data as { id: string; name: string };
        return {
          ok: true,
          kit_id: row.id,
          name: row.name,
          surface: to,
          formats: profile.formatIds.map(slimFormat),
          editorPath: editorPathFor(to, row.id),
        };
      },
    }),
  };
}

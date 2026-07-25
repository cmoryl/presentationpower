// Print asset server functions. Case Study is the v1 kind; the schema and
// helpers here accept the other kinds so Spotlight / E-Brochure / Adaptor Brief
// drop in later without another migration.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CaseStudyContent, PrintAssetContext, PrintAssetKind, PrintAssetRow } from "./print-assets.types";
import { emptyCaseStudy, emptySpotlight, emptyEBrochure, emptyAdaptorBrief } from "./print-assets.types";

const KindEnum = z.enum(["case-study", "spotlight", "ebrochure", "adaptor-brief"]);

// ---- CREATE ----------------------------------------------------------------

const CreateInput = z.object({
  kind: KindEnum.default("case-study"),
  title: z.string().min(1).max(200),
  brandModeId: z.string().min(1),
  briefId: z.string().uuid().optional(),
  sourceDeckId: z.string().uuid().optional(),
  sourceSlideIds: z.array(z.string().uuid()).optional().default([]),
  sourceModuleIds: z.array(z.string()).optional().default([]),
  content: z.record(z.string(), z.unknown()).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const createPrintAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => CreateInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const content: CaseStudyContent = {
      ...emptyCaseStudy(),
      ...(data.content as Partial<CaseStudyContent> | undefined),
    } as CaseStudyContent;
    const { data: row, error } = await supabase
      .from("print_assets")
      .insert({
        owner_id: userId,
        kind: data.kind,
        title: data.title,
        brand_mode_id: data.brandModeId,
        brief_id: data.briefId ?? null,
        source_deck_id: data.sourceDeckId ?? null,
        source_slide_ids: data.sourceSlideIds ?? [],
        source_module_ids: data.sourceModuleIds ?? [],
        content: content as never,
        context: (data.context ?? {}) as never,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as PrintAssetRow;
  });

// ---- LIST ------------------------------------------------------------------

export const listMyPrintAssets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("print_assets")
      .select("id, kind, title, brand_mode_id, status, updated_at, created_at")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---- LOAD ------------------------------------------------------------------

export const loadPrintAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ assetId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("print_assets")
      .select("*")
      .eq("id", data.assetId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Print asset not found");
    return row as unknown as PrintAssetRow;
  });

// ---- UPDATE ----------------------------------------------------------------

const UpdateInput = z.object({
  assetId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  brandModeId: z.string().min(1).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  status: z.string().optional(),
});

export const updatePrintAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => UpdateInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.brandModeId !== undefined) patch.brand_mode_id = data.brandModeId;
    if (data.content !== undefined) patch.content = data.content;
    if (data.context !== undefined) patch.context = data.context;
    if (data.status !== undefined) patch.status = data.status;

    const { data: row, error } = await supabase
      .from("print_assets")
      .update(patch as never)
      .eq("id", data.assetId)
      .eq("owner_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as PrintAssetRow;
  });

// ---- BULK: apply hero media to all print assets of a kind+division ---------
//
// Powers the "Apply to all in this template" one-click action in the hero
// picker — sets `content.heroMedia` on every asset the user owns matching the
// same `kind` and `brand_mode_id`. Returns the number of rows updated.

const ApplyHeroInput = z.object({
  kind: KindEnum,
  brandModeId: z.string().min(1),
  heroMedia: z.record(z.string(), z.unknown()),
  excludeAssetId: z.string().uuid().optional(),
  // When true (default), only overwrite hero blocks whose existing hero has
  // no user-tuned focal/scrim/wash overrides. Blocks the user has customized
  // are left untouched.
  onlyUncustomized: z.boolean().optional().default(true),
});

// Keys that indicate a user tuned the focal point, scrim, or wash.
// If an existing heroMedia has any of these, we treat it as customized.
const HERO_CUSTOM_KEYS = [
  "focalPoint",
  "focalX",
  "focalY",
  "overlayColor",
  "overlayOpacity",
  "washStrength",
  "scrimOpacity",
  "scrim",
  "blendMode",
  "autoScrim",
  "autoScrimThreshold",
] as const;

function isHeroCustomized(hero: unknown): boolean {
  if (!hero || typeof hero !== "object") return false;
  const h = hero as Record<string, unknown>;
  return HERO_CUSTOM_KEYS.some((k) => h[k] !== undefined);
}

export const applyHeroToAllPrintAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => ApplyHeroInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let query = supabase
      .from("print_assets")
      .select("id, content")
      .eq("owner_id", userId)
      .eq("kind", data.kind)
      .eq("brand_mode_id", data.brandModeId);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const candidates = (rows ?? []).filter((r) => r.id !== data.excludeAssetId);
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];
    // Prior heroMedia snapshots for the rows we actually update — feeds the
    // client-side "Undo apply to all" action.
    const undoSnapshots: Array<{ id: string; heroMedia: unknown }> = [];
    for (const r of candidates) {
      const existing = (r.content as Record<string, unknown>)?.heroMedia;
      if (data.onlyUncustomized && isHeroCustomized(existing)) {
        skipped += 1;
        continue;
      }
      const nextContent = {
        ...((r.content as Record<string, unknown>) ?? {}),
        heroMedia: data.heroMedia,
      };
      const { error: uErr } = await supabase
        .from("print_assets")
        .update({ content: nextContent as never })
        .eq("id", r.id)
        .eq("owner_id", userId);
      if (!uErr) {
        updated += 1;
        undoSnapshots.push({ id: r.id, heroMedia: existing ?? null });
      } else {
        errors.push(uErr.message);
      }
    }
    // Serialize snapshots as a JSON string — heroMedia is opaque JSONB and the
    // server-fn serializable-map check rejects unknown-typed fields. The
    // client parses this back into an array before calling the undo fn.
    return {
      updated,
      scanned: candidates.length,
      skipped,
      errors,
      undoToken: undoSnapshots.length > 0 ? JSON.stringify(undoSnapshots) : null,
    };
  });

// ---- UNDO: restore prior heroMedia values from an apply-to-all snapshot ---
//
// Reads each row's current content, swaps heroMedia back to the pre-apply
// snapshot (or removes it if the prior value was null/undefined), and writes.
// Scoped to owner_id so a user can only restore their own assets.

const UndoApplyInput = z.object({
  snapshots: z
    .array(z.object({ id: z.string().uuid(), heroMedia: z.unknown() }))
    .min(1)
    .max(500),
});

export const undoApplyHeroToAllPrintAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => UndoApplyInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ids = data.snapshots.map((s) => s.id);
    const { data: rows, error } = await supabase
      .from("print_assets")
      .select("id, content")
      .eq("owner_id", userId)
      .in("id", ids);
    if (error) throw new Error(error.message);
    const byId = new Map<string, Record<string, unknown>>();
    for (const r of rows ?? []) {
      byId.set(r.id, (r.content as Record<string, unknown>) ?? {});
    }
    let restored = 0;
    const errors: string[] = [];
    for (const snap of data.snapshots) {
      const current = byId.get(snap.id);
      if (!current) {
        errors.push(`Asset ${snap.id} not found`);
        continue;
      }
      const nextContent: Record<string, unknown> = { ...current };
      if (snap.heroMedia === null || snap.heroMedia === undefined) {
        delete nextContent.heroMedia;
      } else {
        nextContent.heroMedia = snap.heroMedia;
      }
      const { error: uErr } = await supabase
        .from("print_assets")
        .update({ content: nextContent as never })
        .eq("id", snap.id)
        .eq("owner_id", userId);
      if (!uErr) {
        restored += 1;
      } else {
        errors.push(uErr.message);
      }
    }
    return { restored, scanned: data.snapshots.length, errors };
  });

// ---- PREVIEW: which sibling assets would update vs be skipped -------------
//
// Feeds the confirmation modal's "before you apply" list so the user sees
// exactly which templates are in scope and which will be left alone.

const PreviewApplyHeroInput = z.object({
  kind: KindEnum,
  brandModeId: z.string().min(1),
  excludeAssetId: z.string().uuid().optional(),
  onlyUncustomized: z.boolean().optional().default(true),
});

export const previewApplyHeroToAllPrintAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => PreviewApplyHeroInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("print_assets")
      .select("id, title, content, updated_at")
      .eq("owner_id", userId)
      .eq("kind", data.kind)
      .eq("brand_mode_id", data.brandModeId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const candidates = (rows ?? []).filter((r) => r.id !== data.excludeAssetId);
    // heroMedia serialized as JSON string per row — same reason as the apply
    // fn's undoToken: server-fn output rejects opaque `unknown` values.
    const toUpdate: Array<{ id: string; title: string; heroMediaJson: string | null }> = [];
    const toSkip: Array<{ id: string; title: string; reason: "customized"; heroMediaJson: string | null }> = [];
    for (const r of candidates) {
      const existing = (r.content as Record<string, unknown>)?.heroMedia;
      const title = (r as { title?: string }).title ?? "Untitled";
      const heroMediaJson =
        existing === undefined || existing === null ? null : JSON.stringify(existing);
      if (data.onlyUncustomized && isHeroCustomized(existing)) {
        toSkip.push({ id: r.id, title, reason: "customized", heroMediaJson });
      } else {
        toUpdate.push({ id: r.id, title, heroMediaJson });
      }
    }
    return { toUpdate, toSkip, scanned: candidates.length };
  });



export const deletePrintAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ assetId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("print_assets")
      .delete()
      .eq("id", data.assetId)
      .eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- SEED FROM BRIEF (writes a briefs row + creates the asset) -------------

const SeedFromBriefInput = z.object({
  kind: KindEnum.default("case-study"),
  title: z.string().min(1).max(200),
  brandModeId: z.string().min(1),
  prospect: z.string().default(""),
  industry: z.string().optional(),
  audience: z.string().optional(),
  meetingObjective: z.string().optional(),
  subCompany: z.string().optional(),
  knownFacts: z.string().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  sourceDeckId: z.string().uuid().optional(),
  sourceSlideIds: z.array(z.string().uuid()).optional().default([]),
  sourceModuleIds: z.array(z.string()).optional().default([]),
});

export const createPrintAssetWithBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => SeedFromBriefInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: brief, error: bErr } = await supabase
      .from("briefs")
      .insert({
        owner_id: userId,
        title: data.title,
        prospect: data.prospect || null,
        industry: data.industry || null,
        audience: data.audience || null,
        meeting_objective: data.meetingObjective || null,
        brand_mode_id: data.brandModeId,
        sub_company: data.subCompany || null,
        known_facts: data.knownFacts || null,
      })
      .select("id")
      .single();
    if (bErr) throw new Error(bErr.message);

    let initialContent: Record<string, unknown>;
    if (data.kind === "spotlight") {
      initialContent = emptySpotlight({
        productName: data.prospect || data.title,
        tagline: data.audience || "",
        summary: data.meetingObjective || "",
        ...(data.content as Record<string, unknown> | undefined),
      }) as unknown as Record<string, unknown>;
    } else if (data.kind === "ebrochure") {
      initialContent = emptyEBrochure({
        title: data.title,
        summary: data.meetingObjective || "",
        ...(data.content as Record<string, unknown> | undefined),
      }) as unknown as Record<string, unknown>;
    } else if (data.kind === "adaptor-brief") {
      initialContent = emptyAdaptorBrief({
        title: data.title,
        summary: data.meetingObjective || "",
        ...(data.content as Record<string, unknown> | undefined),
      }) as unknown as Record<string, unknown>;
    } else {
      const seedContent: Partial<CaseStudyContent> = {
        client: data.prospect || "",
        industry: data.industry || "",
        audience: data.audience || "",
        summary: data.meetingObjective || "",
        ...(data.content as Partial<CaseStudyContent> | undefined),
      };
      initialContent = emptyCaseStudy(seedContent) as unknown as Record<string, unknown>;
    }

    const { data: row, error } = await supabase
      .from("print_assets")
      .insert({
        owner_id: userId,
        kind: data.kind,
        title: data.title,
        brand_mode_id: data.brandModeId,
        brief_id: brief.id,
        source_deck_id: data.sourceDeckId ?? null,
        source_slide_ids: data.sourceSlideIds ?? [],
        source_module_ids: data.sourceModuleIds ?? [],
        content: initialContent as never,
        context: (data.context ?? {}) as never,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as PrintAssetRow;
  });

// ---- SYNTHESIZE FROM DIVISION KNOWLEDGE ------------------------------------
//
// Draft Challenge / Solution / Result from the unified division context via
// the same LOVABLE_AI_GATEWAY_URL / LOVABLE_API_KEY path the rest of the app
// uses. Fails soft — returns null blocks on any provider error so the editor
// falls back to whatever the user has already written.

const SynthInput = z.object({
  assetId: z.string().uuid(),
  brief: z.object({
    prospect: z.string().default(""),
    industry: z.string().optional(),
    audience: z.string().optional(),
    summary: z.string().optional(),
  }),
  knowledgeSnippets: z.array(z.string()).optional().default([]),
});

export const synthesizeCaseStudy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => SynthInput.parse(raw))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { challenge: null, solution: null, result: null, error: "AI gateway not configured" };

    const context = data.knowledgeSnippets.slice(0, 8).map((s, i) => `[${i + 1}] ${s}`).join("\n");
    const prompt = `You are drafting a print-ready case study for TransPerfect.
Client: ${data.brief.prospect}
Industry: ${data.brief.industry ?? "unspecified"}
Audience: ${data.brief.audience ?? "unspecified"}
Engagement: ${data.brief.summary ?? "unspecified"}

Division knowledge snippets:
${context || "(none)"}

Return strict JSON with three keys — challenge, solution, result — each an
object { heading, body }. Body is 2–3 tight sentences, no marketing fluff, no
lists. Headings are short and declarative.`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      if (!res.ok) return { challenge: null, solution: null, result: null, error: `Gateway ${res.status}` };
      const json = await res.json();
      const raw = json?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      return {
        challenge: parsed.challenge ?? null,
        solution: parsed.solution ?? null,
        result: parsed.result ?? null,
      };
    } catch (e) {
      return { challenge: null, solution: null, result: null, error: (e as Error).message };
    }
  });

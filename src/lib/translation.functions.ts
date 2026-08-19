import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  extractStrings,
  protectStrings,
  unprotectStrings,
  applyGlossaryOverrides,
  contentHash,
  type GlossaryTerm,
} from "@/lib/translation-glossary";

// Tables are new — types.ts regenerates after migration. Use loose casts until then.
type AnySupabase = any; // eslint-disable-line @typescript-eslint/no-explicit-any

// ---------------------------------------------------------------------------
// Public read: engines + languages + glossary
// ---------------------------------------------------------------------------

export const listTranslationEngines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { listEngines } = await import("@/lib/translation-engine.server");
    return listEngines();
  });

export const listLanguages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as AnySupabase;
    const { data, error } = await supabase
      .from("languages")
      .select("id, label, native, rtl, active, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string;
      label: string;
      native: string;
      rtl: boolean;
      active: boolean;
      sort_order: number;
    }>;
  });

export const listGlossary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        scope: z.enum(["global", "division", "deck"]).optional(),
        scopeId: z.string().optional(),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;
    let q = supabase
      .from("glossary_terms")
      .select("id, term, do_not_translate, translations, scope, scope_id, notes, updated_at");
    if (data.scope) q = q.eq("scope", data.scope);
    if (data.scopeId) q = q.eq("scope_id", data.scopeId);
    const { data: rows, error } = await q.order("term", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as GlossaryTerm[] &
      Array<{ id: string; scope: string; scope_id: string | null; notes: string | null }>;
  });

export const upsertGlossaryTerm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        id: z.string().uuid().optional(),
        term: z.string().min(1).max(200),
        do_not_translate: z.boolean().default(true),
        translations: z.record(z.string(), z.string()).default({}),
        scope: z.enum(["global", "division", "deck"]).default("global"),
        scope_id: z.string().optional().nullable(),
        notes: z.string().max(1000).optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;
    const row = {
      ...data,
      scope_id: data.scope === "global" ? null : (data.scope_id ?? null),
      created_by: context.userId,
    };
    const { data: saved, error } = data.id
      ? await supabase.from("glossary_terms").update(row).eq("id", data.id).select().maybeSingle()
      : await supabase.from("glossary_terms").insert(row).select().maybeSingle();
    if (error) throw new Error(error.message);
    return saved;
  });

export const deleteGlossaryTerm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;
    const { error } = await supabase.from("glossary_terms").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Core translation pipeline for a single slide's `content` blob
// ---------------------------------------------------------------------------

async function loadRelevantGlossary(
  supabase: AnySupabase,
  divisionId: string | null,
  deckId: string,
): Promise<GlossaryTerm[]> {
  const conditions: string[] = ["scope.eq.global"];
  if (divisionId) conditions.push(`and(scope.eq.division,scope_id.eq.${divisionId})`);
  conditions.push(`and(scope.eq.deck,scope_id.eq.${deckId})`);
  const { data, error } = await supabase
    .from("glossary_terms")
    .select("term, do_not_translate, translations")
    .or(conditions.join(","));
  if (error) throw new Error(error.message);
  return (data ?? []) as GlossaryTerm[];
}

async function translateContent(
  content: unknown,
  targetLang: string,
  glossary: GlossaryTerm[],
  engineId: "globallink" | "ai",
  humanReview: boolean,
): Promise<{ content: unknown; jobRef?: string }> {
  const { runTranslationBatched, resolveEngine } = await import("@/lib/translation-engine.server");
  const engine = resolveEngine(engineId);

  const { strings, replace } = extractStrings(content);
  if (strings.length === 0) return { content };
  const protectedSrc = protectStrings(strings, glossary);
  const { translated, jobRef } = await runTranslationBatched(engine, {
    strings: protectedSrc,
    targetLang,
    sourceLang: "en",
    humanReview,
  });
  const unprotected = unprotectStrings(translated);
  const withOverrides = applyGlossaryOverrides(unprotected, glossary, targetLang);
  return { content: replace(withOverrides), jobRef };
}

// ---------------------------------------------------------------------------
// Per-slide translation (preview / accept)
// ---------------------------------------------------------------------------

export const translateSlide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        slideId: z.string().uuid(),
        targetLang: z.string().min(2).max(10),
        engine: z.enum(["globallink", "ai"]).optional(),
        humanReview: z.boolean().default(false),
        apply: z.boolean().default(false),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;
    const { data: slide, error } = await supabase
      .from("deck_slides")
      .select("id, deck_id, content, decks:deck_id(brand_mode_id, owner_id)")
      .eq("id", data.slideId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!slide) throw new Error("Slide not found");

    const deckId = slide.deck_id as string;
    const divisionId = (slide.decks?.brand_mode_id as string | null) ?? null;
    const glossary = await loadRelevantGlossary(supabase, divisionId, deckId);
    const engine = data.engine ?? "globallink";

    const { content: translated, jobRef } = await translateContent(
      slide.content,
      data.targetLang,
      glossary,
      engine,
      data.humanReview,
    );

    await supabase.from("slide_translations").upsert(
      {
        slide_id: data.slideId,
        target_lang: data.targetLang,
        source_hash: contentHash(slide.content),
        translated_content: translated,
        status: "ready",
        engine,
        job_ref: jobRef ?? null,
      },
      { onConflict: "slide_id,target_lang" },
    );

    if (data.apply) {
      await supabase.from("deck_slides").update({ content: translated }).eq("id", data.slideId);
    }

    return { translatedJson: JSON.stringify(translated ?? null), jobRef: jobRef ?? null };
  });

// ---------------------------------------------------------------------------
// Deck translation: in-place / copy / batch
// ---------------------------------------------------------------------------

async function loadDeckBundle(supabase: AnySupabase, deckId: string) {
  const { data: deck, error: dErr } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .maybeSingle();
  if (dErr) throw new Error(dErr.message);
  if (!deck) throw new Error("Deck not found");
  const { data: slides, error: sErr } = await supabase
    .from("deck_slides")
    .select("*")
    .eq("deck_id", deckId)
    .order("position", { ascending: true });
  if (sErr) throw new Error(sErr.message);
  return { deck, slides: slides ?? [] };
}

export class TranslationCancelledError extends Error {
  constructor() {
    super("Translation cancelled");
    this.name = "TranslationCancelledError";
  }
}

// Translate slides one at a time, writing per-slide status to
// slide_translations (keyed by source slide id) and bumping
// deck_translations.progress_current. Between slides we re-read the tracking
// row's status so a `cancelled` flag from another request stops the loop.
async function translateAllSlides(
  supabase: AnySupabase,
  slides: Array<{ id: string; content: unknown }>,
  targetLang: string,
  glossary: GlossaryTerm[],
  engineId: "globallink" | "ai",
  humanReview: boolean,
  trackingId: string | undefined,
): Promise<Array<{ id: string; content: unknown; ok: boolean; error?: string }>> {
  const out: Array<{ id: string; content: unknown; ok: boolean; error?: string }> = [];
  let done = 0;
  for (const s of slides) {
    // Cancel check
    if (trackingId) {
      const { data: cur } = await supabase
        .from("deck_translations")
        .select("status")
        .eq("id", trackingId)
        .maybeSingle();
      if (cur?.status === "cancelled") throw new TranslationCancelledError();
    }
    try {
      const { content, jobRef } = await translateContent(
        s.content,
        targetLang,
        glossary,
        engineId,
        humanReview,
      );
      await supabase.from("slide_translations").upsert(
        {
          slide_id: s.id,
          target_lang: targetLang,
          source_hash: contentHash(s.content),
          translated_content: content,
          status: "ready",
          engine: engineId,
          job_ref: jobRef ?? null,
          error: null,
        },
        { onConflict: "slide_id,target_lang" },
      );
      out.push({ id: s.id, content, ok: true });
    } catch (e) {
      const msg = (e as Error).message.slice(0, 500);
      await supabase.from("slide_translations").upsert(
        {
          slide_id: s.id,
          target_lang: targetLang,
          source_hash: contentHash(s.content),
          translated_content: {},
          status: "failed",
          engine: engineId,
          error: msg,
        },
        { onConflict: "slide_id,target_lang" },
      );
      out.push({ id: s.id, content: s.content, ok: false, error: msg });
    }
    done += 1;
    if (trackingId) {
      await supabase
        .from("deck_translations")
        .update({ progress_current: done })
        .eq("id", trackingId);
    }
  }
  return out;
}

export const translateDeckInPlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        deckId: z.string().uuid(),
        targetLang: z.string().min(2).max(10),
        engine: z.enum(["globallink", "ai"]).optional(),
        humanReview: z.boolean().default(false),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;
    const { deck, slides } = await loadDeckBundle(supabase, data.deckId);
    if (deck.owner_id !== context.userId) throw new Error("Forbidden");

    // Auto-snapshot for undo
    try {
      await supabase.from("deck_versions").insert({
        deck_id: deck.id,
        created_by: context.userId,
        label: `Before translation → ${data.targetLang}`,
        payload: { deck, slides },
      });
    } catch {
      // Non-fatal — some deployments store versions differently.
    }

    const divisionId = deck.brand_mode_id as string | null;
    const glossary = await loadRelevantGlossary(supabase, divisionId, deck.id);
    const engine = data.engine ?? "globallink";

    // Insert tracking row
    const { data: trackingRow } = await supabase
      .from("deck_translations")
      .insert({
        source_deck_id: deck.id,
        target_lang: data.targetLang,
        mode: "in_place",
        status: "translating",
        engine,
        human_review: data.humanReview,
        progress_total: slides.length,
        translated_deck_id: deck.id,
        created_by: context.userId,
      })
      .select()
      .maybeSingle();
    const trackingId = trackingRow?.id as string | undefined;

    try {
      const translated = await translateAllSlides(
        supabase,
        slides,
        data.targetLang,
        glossary,
        engine,
        data.humanReview,
        trackingId,
      );
      const failed = translated.filter((t) => !t.ok);
      // Apply only successful slides so a partial run still updates what worked.
      for (const t of translated) {
        if (t.ok) await supabase.from("deck_slides").update({ content: t.content }).eq("id", t.id);
      }
      // Tag deck with locale + rtl in context
      const { data: lang } = await supabase
        .from("languages")
        .select("rtl")
        .eq("id", data.targetLang)
        .maybeSingle();
      const nextContext = {
        ...(deck.context ?? {}),
        locale: data.targetLang,
        dir: lang?.rtl ? "rtl" : "ltr",
      };
      await supabase.from("decks").update({ context: nextContext }).eq("id", deck.id);

      if (trackingId) {
        await supabase
          .from("deck_translations")
          .update({
            status: failed.length === 0 ? "ready" : "failed",
            progress_current: translated.length,
            error: failed.length === 0 ? null : `${failed.length} slide(s) failed`,
          })
          .eq("id", trackingId);
      }
      return { ok: true, deckId: deck.id, failed: failed.length };
    } catch (e) {
      const isCancel = e instanceof TranslationCancelledError;
      if (trackingId) {
        await supabase
          .from("deck_translations")
          .update({
            status: isCancel ? "cancelled" : "failed",
            error: isCancel ? null : (e as Error).message.slice(0, 500),
          })
          .eq("id", trackingId);
      }
      if (isCancel) return { ok: false, cancelled: true };
      throw e;
    }
  });

export const translateDeckToCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        deckId: z.string().uuid(),
        targetLang: z.string().min(2).max(10),
        engine: z.enum(["globallink", "ai"]).optional(),
        humanReview: z.boolean().default(false),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;
    const { deck, slides } = await loadDeckBundle(supabase, data.deckId);
    if (deck.owner_id !== context.userId) throw new Error("Forbidden");

    const divisionId = deck.brand_mode_id as string | null;
    const glossary = await loadRelevantGlossary(supabase, divisionId, deck.id);
    const engine = data.engine ?? "globallink";

    const { data: lang } = await supabase
      .from("languages")
      .select("label, rtl")
      .eq("id", data.targetLang)
      .maybeSingle();
    const langLabel = lang?.label ?? data.targetLang;

    // Duplicate deck row
    const newTitle = `${deck.title} · ${langLabel}`;
    const newContext = {
      ...(deck.context ?? {}),
      locale: data.targetLang,
      dir: lang?.rtl ? "rtl" : "ltr",
      translatedFromDeckId: deck.id,
    };
    const { data: newDeck, error: cErr } = await supabase
      .from("decks")
      .insert({
        owner_id: context.userId,
        brief_id: deck.brief_id,
        title: newTitle,
        archetype_id: deck.archetype_id,
        brand_mode_id: deck.brand_mode_id,
        status: "draft",
        context: newContext,
        is_template: false,
      })
      .select()
      .maybeSingle();
    if (cErr || !newDeck) throw new Error(cErr?.message ?? "Failed to create translated deck");

    // Tracking row
    const { data: trackingRow } = await supabase
      .from("deck_translations")
      .insert({
        source_deck_id: deck.id,
        target_lang: data.targetLang,
        mode: "copy",
        status: "translating",
        engine,
        human_review: data.humanReview,
        progress_total: slides.length,
        translated_deck_id: newDeck.id,
        created_by: context.userId,
      })
      .select()
      .maybeSingle();
    const trackingId = trackingRow?.id as string | undefined;

    try {
      const translated = await translateAllSlides(
        supabase,
        slides,
        data.targetLang,
        glossary,
        engine,
        data.humanReview,
        trackingId,
      );
      const failed = translated.filter((t) => !t.ok);
      const rows = (slides as Array<Record<string, unknown>>).map((s, i) => ({
        deck_id: newDeck.id,
        position: s.position,
        section_id: s.section_id,
        variant_id: s.variant_id,
        layout_id: s.layout_id,
        content: translated[i].content,
        notes: s.notes,
      }));
      if (rows.length > 0) {
        const { error: iErr } = await supabase.from("deck_slides").insert(rows);
        if (iErr) throw new Error(iErr.message);
      }
      if (trackingId) {
        await supabase
          .from("deck_translations")
          .update({
            status: failed.length === 0 ? "ready" : "failed",
            progress_current: translated.length,
            error: failed.length === 0 ? null : `${failed.length} slide(s) failed`,
          })
          .eq("id", trackingId);
      }
      return { ok: true, deckId: newDeck.id, title: newTitle, failed: failed.length };
    } catch (e) {
      const isCancel = e instanceof TranslationCancelledError;
      if (trackingId) {
        await supabase
          .from("deck_translations")
          .update({
            status: isCancel ? "cancelled" : "failed",
            error: isCancel ? null : (e as Error).message.slice(0, 500),
          })
          .eq("id", trackingId);
      }
      // Clean up the empty deck row so failure/cancel doesn't leave orphaned shells.
      await supabase.from("decks").delete().eq("id", newDeck.id);
      if (isCancel) return { ok: false, cancelled: true };
      throw e;
    }
  });

export const translateDeckBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        deckId: z.string().uuid(),
        targetLangs: z.array(z.string().min(2).max(10)).min(1).max(20),
        engine: z.enum(["globallink", "ai"]).optional(),
        humanReview: z.boolean().default(false),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const results: Record<
      string,
      { ok: true; deckId: string; title: string } | { ok: false; error: string }
    > = {};
    for (const lang of data.targetLangs) {
      try {
        const { supabase } = context as { supabase: AnySupabase };
        const { deck, slides } = await loadDeckBundle(supabase, data.deckId);
        if (deck.owner_id !== context.userId) throw new Error("Forbidden");
        const divisionId = deck.brand_mode_id as string | null;
        const glossary = await loadRelevantGlossary(supabase, divisionId, deck.id);
        const engine = data.engine ?? "globallink";
        const { data: langRow } = await supabase
          .from("languages")
          .select("label, rtl")
          .eq("id", lang)
          .maybeSingle();
        const langLabel = langRow?.label ?? lang;
        const newTitle = `${deck.title} · ${langLabel}`;
        const newContext = {
          ...(deck.context ?? {}),
          locale: lang,
          dir: langRow?.rtl ? "rtl" : "ltr",
          translatedFromDeckId: deck.id,
        };
        const { data: newDeck } = await supabase
          .from("decks")
          .insert({
            owner_id: context.userId,
            brief_id: deck.brief_id,
            title: newTitle,
            archetype_id: deck.archetype_id,
            brand_mode_id: deck.brand_mode_id,
            status: "draft",
            context: newContext,
            is_template: false,
          })
          .select()
          .maybeSingle();
        if (!newDeck) throw new Error("Failed to create translated deck");
        const translated = await translateAllSlides(
          supabase,
          slides,
          lang,
          glossary,
          engine,
          data.humanReview,
          undefined,
        );
        const rows = (slides as Array<Record<string, unknown>>).map((s, i) => ({
          deck_id: newDeck.id,
          position: s.position,
          section_id: s.section_id,
          variant_id: s.variant_id,
          layout_id: s.layout_id,
          content: translated[i].content,
          notes: s.notes,
        }));
        if (rows.length > 0) await supabase.from("deck_slides").insert(rows);
        await supabase.from("deck_translations").insert({
          source_deck_id: deck.id,
          target_lang: lang,
          mode: "batch",
          status: "ready",
          engine,
          human_review: data.humanReview,
          progress_total: slides.length,
          progress_current: slides.length,
          translated_deck_id: newDeck.id,
          created_by: context.userId,
        });
        results[lang] = { ok: true, deckId: newDeck.id, title: newTitle };
      } catch (e) {
        results[lang] = { ok: false, error: (e as Error).message.slice(0, 300) };
      }
    }
    return results;
  });

export const listDeckTranslations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ deckId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;
    const { data: rows, error } = await supabase
      .from("deck_translations")
      .select(
        "id, target_lang, mode, status, engine, translated_deck_id, progress_current, progress_total, error, updated_at",
      )
      .eq("source_deck_id", data.deckId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------------------------------------------------------------------------
// Non-destructive per-slide translation cache.
// Populates public.slide_translations for every slide in a deck so the editor
// and share viewer can switch languages at render time without re-running jobs.
// ---------------------------------------------------------------------------

export const cacheDeckTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        deckId: z.string().uuid(),
        targetLang: z.string().min(2).max(10),
        engine: z.enum(["globallink", "ai"]).optional(),
        humanReview: z.boolean().default(false),
        force: z.boolean().default(false),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;
    const { deck, slides } = await loadDeckBundle(supabase, data.deckId);
    if (deck.owner_id !== context.userId) throw new Error("Forbidden");

    const divisionId = deck.brand_mode_id as string | null;
    const glossary = await loadRelevantGlossary(supabase, divisionId, deck.id);
    const engine = data.engine ?? "ai";

    const slideIds: string[] = (slides as Array<{ id: string }>).map((s) => s.id);
    const existingByKey = new Map<string, { source_hash: string; status: string }>();
    if (slideIds.length > 0) {
      const { data: existing } = await supabase
        .from("slide_translations")
        .select("slide_id, source_hash, status")
        .eq("target_lang", data.targetLang)
        .in("slide_id", slideIds);
      for (const r of (existing ?? []) as Array<{
        slide_id: string;
        source_hash: string;
        status: string;
      }>) {
        existingByKey.set(r.slide_id, { source_hash: r.source_hash, status: r.status });
      }
    }

    let translatedCount = 0;
    let skippedCount = 0;
    for (const s of slides as Array<{ id: string; content: unknown }>) {
      const hash = contentHash(s.content);
      const prior = existingByKey.get(s.id);
      if (!data.force && prior && prior.status === "ready" && prior.source_hash === hash) {
        skippedCount++;
        continue;
      }
      try {
        const { content: translated, jobRef } = await translateContent(
          s.content,
          data.targetLang,
          glossary,
          engine,
          data.humanReview,
        );
        await supabase.from("slide_translations").upsert(
          {
            slide_id: s.id,
            target_lang: data.targetLang,
            source_hash: hash,
            translated_content: translated,
            status: "ready",
            engine,
            job_ref: jobRef ?? null,
            error: null,
          },
          { onConflict: "slide_id,target_lang" },
        );
        translatedCount++;
      } catch (e) {
        await supabase.from("slide_translations").upsert(
          {
            slide_id: s.id,
            target_lang: data.targetLang,
            source_hash: hash,
            translated_content: null,
            status: "failed",
            engine,
            error: (e as Error).message.slice(0, 500),
          },
          { onConflict: "slide_id,target_lang" },
        );
      }
    }

    return {
      ok: true,
      deckId: deck.id,
      targetLang: data.targetLang,
      total: slides.length,
      translated: translatedCount,
      skipped: skippedCount,
    };
  });

// Which locales are cached for this deck, and how complete each is.
export const listCachedLocales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ deckId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;
    const { data: slides } = await supabase
      .from("deck_slides")
      .select("id")
      .eq("deck_id", data.deckId);
    const slideIds: string[] = ((slides ?? []) as Array<{ id: string }>).map((s) => s.id);
    const total = slideIds.length;
    if (total === 0)
      return {
        total: 0,
        locales: [] as Array<{
          target_lang: string;
          ready: number;
          total: number;
          updated_at: string;
        }>,
      };
    const { data: rows } = await supabase
      .from("slide_translations")
      .select("target_lang, status, updated_at")
      .in("slide_id", slideIds);
    const agg = new Map<string, { ready: number; updated_at: string }>();
    for (const r of (rows ?? []) as Array<{
      target_lang: string;
      status: string;
      updated_at: string;
    }>) {
      const cur = agg.get(r.target_lang) ?? { ready: 0, updated_at: r.updated_at };
      if (r.status === "ready") cur.ready += 1;
      if (r.updated_at > cur.updated_at) cur.updated_at = r.updated_at;
      agg.set(r.target_lang, cur);
    }
    const locales = Array.from(agg.entries())
      .map(([target_lang, v]) => ({ target_lang, ready: v.ready, total, updated_at: v.updated_at }))
      .sort((a, b) => (a.target_lang < b.target_lang ? -1 : 1));
    return { total, locales };
  });

// Per-slide-per-locale status matrix for the editor badges.
export const listSlideTranslationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ deckId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;
    const { data: slides } = await supabase
      .from("deck_slides")
      .select("id, position")
      .eq("deck_id", data.deckId);
    const list = (slides ?? []) as Array<{ id: string; position: number }>;
    if (list.length === 0)
      return [] as Array<{
        position: number;
        target_lang: string;
        status: string;
        updated_at: string;
      }>;
    const idToPos = new Map(list.map((s) => [s.id, s.position]));
    const { data: rows } = await supabase
      .from("slide_translations")
      .select("slide_id, target_lang, status, updated_at")
      .in(
        "slide_id",
        list.map((s) => s.id),
      );
    const out: Array<{
      position: number;
      target_lang: string;
      status: string;
      updated_at: string;
    }> = [];
    for (const r of (rows ?? []) as Array<{
      slide_id: string;
      target_lang: string;
      status: string;
      updated_at: string;
    }>) {
      const pos = idToPos.get(r.slide_id);
      if (pos == null) continue;
      out.push({
        position: pos,
        target_lang: r.target_lang,
        status: r.status,
        updated_at: r.updated_at,
      });
    }
    return out;
  });

// Fetch translated content keyed by slide position for the editor overlay.
export const getDeckSlideTranslations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ deckId: z.string().uuid(), targetLang: z.string().min(2).max(10) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;
    const { data: rows, error } = await supabase
      .from("deck_slides")
      .select("id, position, slide_translations!inner(translated_content, status, target_lang)")
      .eq("deck_id", data.deckId)
      .eq("slide_translations.target_lang", data.targetLang)
      .eq("slide_translations.status", "ready");
    if (error) throw new Error(error.message);
    const out: Array<{ position: number; content: Record<string, never> }> = [];
    for (const r of (rows ?? []) as Array<{
      position: number;
      slide_translations: Array<{ translated_content: unknown }>;
    }>) {
      const t = r.slide_translations?.[0]?.translated_content;
      if (t && typeof t === "object")
        out.push({ position: r.position, content: t as Record<string, never> });
    }
    out.sort((a, b) => a.position - b.position);
    return out;
  });

// Public: fetch translated content for a share token. Uses SECURITY DEFINER RPC.
export const getSharedDeckTranslations = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z.object({ token: z.string().min(16), targetLang: z.string().min(2).max(10) }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const url = process.env.SUPABASE_URL!;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: rows, error } = await client.rpc("get_shared_deck_translations", {
      _token: data.token,
      _lang: data.targetLang,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{ position: number; content: Record<string, never> }>;
  });

// Public: list cached locales for a shared deck (token-gated).
export const listSharedLocales = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ token: z.string().min(16) }).parse(raw))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const url = process.env.SUPABASE_URL!;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
            h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: rows, error } = await client.rpc("get_shared_deck_locales", {
      _token: data.token,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{ target_lang: string; ready: number; total: number }>;
  });

// ---------------------------------------------------------------------------
// Job history + per-slide progress + cancel/retry
// ---------------------------------------------------------------------------

// Detailed per-slide breakdown for one deck_translations job. Joins
// slide_translations by (source slide id, target_lang) so partial progress,
// per-slide errors, and unfinished slides are all visible.
export const getDeckTranslationJobDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ jobId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;
    const { data: job, error: jErr } = await supabase
      .from("deck_translations")
      .select(
        "id, source_deck_id, translated_deck_id, target_lang, mode, status, engine, human_review, progress_current, progress_total, error, created_at, updated_at",
      )
      .eq("id", data.jobId)
      .maybeSingle();
    if (jErr) throw new Error(jErr.message);
    if (!job) throw new Error("Job not found");

    const { data: slides } = await supabase
      .from("deck_slides")
      .select("id, position")
      .eq("deck_id", job.source_deck_id)
      .order("position", { ascending: true });
    const slideList = (slides ?? []) as Array<{ id: string; position: number }>;
    const ids = slideList.map((s) => s.id);
    let trByKey = new Map<string, { status: string; error: string | null; updated_at: string }>();
    if (ids.length > 0) {
      const { data: trs } = await supabase
        .from("slide_translations")
        .select("slide_id, status, error, updated_at")
        .in("slide_id", ids)
        .eq("target_lang", job.target_lang);
      trByKey = new Map(
        (
          (trs ?? []) as Array<{
            slide_id: string;
            status: string;
            error: string | null;
            updated_at: string;
          }>
        ).map((r) => [r.slide_id, { status: r.status, error: r.error, updated_at: r.updated_at }]),
      );
    }
    const slidesOut = slideList.map((s) => {
      const t = trByKey.get(s.id);
      return {
        slideId: s.id,
        position: s.position,
        status: (t?.status ?? "pending") as "pending" | "ready" | "failed",
        error: t?.error ?? null,
        updatedAt: t?.updated_at ?? null,
      };
    });
    return { job, slides: slidesOut };
  });

// Flip a running job to `cancelled`. The translation loop re-reads the row's
// status between slides and throws TranslationCancelledError to stop.
export const cancelDeckTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ jobId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;
    const { data: job } = await supabase
      .from("deck_translations")
      .select("id, source_deck_id, status")
      .eq("id", data.jobId)
      .maybeSingle();
    if (!job) throw new Error("Job not found");
    // RLS scopes writes to deck owners; still, only mark active jobs.
    if (job.status !== "translating" && job.status !== "draft") {
      return { ok: false, reason: "not_running" as const, status: job.status };
    }
    const { error } = await supabase
      .from("deck_translations")
      .update({ status: "cancelled" })
      .eq("id", data.jobId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Re-run failed / pending slides for an existing job. For in_place jobs,
// updated slides land on the source deck. For copy jobs, updates land on
// translated_deck_id at the same position. Batch jobs are treated like copy.
export const retryDeckTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ jobId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as AnySupabase;
    const { data: job, error: jErr } = await supabase
      .from("deck_translations")
      .select("*")
      .eq("id", data.jobId)
      .maybeSingle();
    if (jErr) throw new Error(jErr.message);
    if (!job) throw new Error("Job not found");

    const { data: deck } = await supabase
      .from("decks")
      .select("owner_id, brand_mode_id")
      .eq("id", job.source_deck_id)
      .maybeSingle();
    if (!deck || deck.owner_id !== context.userId) throw new Error("Forbidden");

    const { data: slides } = await supabase
      .from("deck_slides")
      .select("id, position, content")
      .eq("deck_id", job.source_deck_id)
      .order("position", { ascending: true });
    const slideList = (slides ?? []) as Array<{ id: string; position: number; content: unknown }>;

    // Find which slides need work: not 'ready' in slide_translations for this lang.
    const { data: trs } = await supabase
      .from("slide_translations")
      .select("slide_id, status")
      .in(
        "slide_id",
        slideList.map((s) => s.id),
      )
      .eq("target_lang", job.target_lang);
    const readySet = new Set(
      ((trs ?? []) as Array<{ slide_id: string; status: string }>)
        .filter((r) => r.status === "ready")
        .map((r) => r.slide_id),
    );
    const todo = slideList.filter((s) => !readySet.has(s.id));
    if (todo.length === 0) {
      await supabase
        .from("deck_translations")
        .update({ status: "ready", progress_current: slideList.length, error: null })
        .eq("id", job.id);
      return { ok: true, retried: 0 };
    }

    // Reset job → translating, seed progress to already-ready count.
    const startingDone = slideList.length - todo.length;
    await supabase
      .from("deck_translations")
      .update({
        status: "translating",
        progress_current: startingDone,
        progress_total: slideList.length,
        error: null,
      })
      .eq("id", job.id);

    const glossary = await loadRelevantGlossary(
      supabase,
      deck.brand_mode_id as string | null,
      job.source_deck_id,
    );
    const engine = (job.engine ?? "globallink") as "globallink" | "ai";

    try {
      const results: Array<{ id: string; content: unknown; ok: boolean; error?: string }> = [];
      let done = startingDone;
      for (const s of todo) {
        // cancel check
        const { data: cur } = await supabase
          .from("deck_translations")
          .select("status")
          .eq("id", job.id)
          .maybeSingle();
        if (cur?.status === "cancelled") throw new TranslationCancelledError();
        try {
          const { content, jobRef } = await translateContent(
            s.content,
            job.target_lang,
            glossary,
            engine,
            !!job.human_review,
          );
          await supabase.from("slide_translations").upsert(
            {
              slide_id: s.id,
              target_lang: job.target_lang,
              source_hash: contentHash(s.content),
              translated_content: content,
              status: "ready",
              engine,
              job_ref: jobRef ?? null,
              error: null,
            },
            { onConflict: "slide_id,target_lang" },
          );
          results.push({ id: s.id, content, ok: true });
        } catch (e) {
          const msg = (e as Error).message.slice(0, 500);
          await supabase.from("slide_translations").upsert(
            {
              slide_id: s.id,
              target_lang: job.target_lang,
              source_hash: contentHash(s.content),
              translated_content: {},
              status: "failed",
              engine,
              error: msg,
            },
            { onConflict: "slide_id,target_lang" },
          );
          results.push({ id: s.id, content: s.content, ok: false, error: msg });
        }
        done += 1;
        await supabase
          .from("deck_translations")
          .update({ progress_current: done })
          .eq("id", job.id);
      }

      // Apply the fresh content depending on job mode.
      const okResults = results.filter((r) => r.ok);
      if (job.mode === "in_place") {
        for (const r of okResults) {
          await supabase.from("deck_slides").update({ content: r.content }).eq("id", r.id);
        }
      } else if (job.translated_deck_id) {
        // Map source slide id → position, then update the copy at that position.
        const positionById = new Map(slideList.map((s) => [s.id, s.position] as const));
        for (const r of okResults) {
          const pos = positionById.get(r.id);
          if (pos == null) continue;
          await supabase
            .from("deck_slides")
            .update({ content: r.content })
            .eq("deck_id", job.translated_deck_id)
            .eq("position", pos);
        }
      }

      const failed = results.filter((r) => !r.ok).length;
      await supabase
        .from("deck_translations")
        .update({
          status: failed === 0 ? "ready" : "failed",
          progress_current: slideList.length,
          error: failed === 0 ? null : `${failed} slide(s) failed`,
        })
        .eq("id", job.id);
      return { ok: true, retried: todo.length, failed };
    } catch (e) {
      const isCancel = e instanceof TranslationCancelledError;
      await supabase
        .from("deck_translations")
        .update({
          status: isCancel ? "cancelled" : "failed",
          error: isCancel ? null : (e as Error).message.slice(0, 500),
        })
        .eq("id", job.id);
      if (isCancel) return { ok: false, cancelled: true };
      throw e;
    }
  });

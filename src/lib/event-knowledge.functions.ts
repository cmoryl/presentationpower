// Event knowledge — server functions.
//
// `syncEventKnowledge` re-harvests the build's own data and the lesson log, so
// the store is never stale. `searchEventKnowledge` answers a new venue's
// question against it. `captureEventOutcome` records what actually shipped, and
// `embedEventKnowledgeBacklog` embeds anything captured without a vector.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  eventKnowledgeText,
  groupEventKnowledge,
  outcomeRecord,
  type EventKnowledgeFacts,
  type EventKnowledgeHit,
  type EventKnowledgeRecord,
} from "@/lib/event-knowledge";

const BRAND_ROLES = ["admin", "brand_lead", "brand_reviewer"] as const;

async function assertBrandTeam(
  supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: string }) => Promise<{ data: unknown }> },
  userId: string,
): Promise<void> {
  const roles = await Promise.all(
    BRAND_ROLES.map((role) => supabase.rpc("has_role", { _user_id: userId, _role: role })),
  );
  if (!roles.some((r) => r.data === true)) {
    throw new Error("Only the brand team can change event knowledge");
  }
}

/** How many records one sync call handles. Kept small deliberately: embedding
 * the whole venue in one request outlives the platform's request timeout, so the
 * work is resumable in slices and each slice is written before returning. */
const SYNC_SLICE = 40;

/** Re-harvest a slice of derivable records and upsert it by fingerprint. */
export const syncEventKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { offset?: number } | null) => ({
    offset: Math.max(0, Math.floor(input?.offset ?? 0)),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertBrandTeam(supabase as never, userId);

    const { embedEventKnowledge, embeddingLiteral, harvestLondonKnowledge, recordRow } =
      await import("@/lib/event-knowledge.server");
    const { EVENT_KNOWLEDGE_EMBEDDING_MODEL } = await import("@/lib/event-knowledge");

    const all = harvestLondonKnowledge();
    const records = all.slice(data.offset, data.offset + SYNC_SLICE);
    if (!records.length) {
      return { total: all.length, offset: all.length, written: 0, embedded: 0, pending: 0, done: true, failures: [] as string[] };
    }

    const { vectors, failures } = await embedEventKnowledge(records.map(eventKnowledgeText));

    const rows = records.map((record, i) => ({
      ...recordRow(record, userId),
      embedding: vectors[i] ? (embeddingLiteral(vectors[i]!) as never) : null,
      model: vectors[i] ? EVENT_KNOWLEDGE_EMBEDDING_MODEL : null,
    }));

    const { error } = await supabase
      .from("event_venue_knowledge")
      .upsert(rows as never, { onConflict: "fingerprint" });
    if (error) throw new Error(error.message);

    const offset = data.offset + records.length;
    return {
      total: all.length,
      offset,
      written: records.length,
      embedded: vectors.filter(Boolean).length,
      // Surfaced, never swallowed: an un-embedded record cannot be found.
      pending: vectors.filter((v) => !v).length,
      done: offset >= all.length,
      failures: failures.map((f) => f.message),
    };
  });


export type EventKnowledgeSearchInput = {
  question: string;
  city?: string | null;
  kind?: string | null;
  limit?: number;
};

/** Semantic search over everything past events have taught. */
export const searchEventKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: EventKnowledgeSearchInput) => {
    const question = (input?.question ?? "").trim();
    if (question.length < 3) throw new Error("Ask a longer question");
    return {
      question: question.slice(0, 2000),
      city: input.city?.trim() || null,
      kind: input.kind?.trim() || null,
      limit: Math.min(Math.max(input.limit ?? 12, 1), 40),
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { embedEventKnowledge, embeddingLiteral } = await import("@/lib/event-knowledge.server");

    const { vectors, failures } = await embedEventKnowledge([data.question]);
    const vector = vectors[0];
    if (!vector) {
      throw new Error(failures[0]?.message ?? "The question could not be embedded");
    }

    const { data: rows, error } = await supabase.rpc("match_event_knowledge", {
      query_embedding: embeddingLiteral(vector) as never,
      match_count: data.limit,
      filter_city: data.city ?? undefined,
      filter_kind: data.kind ?? undefined,
    });
    if (error) throw new Error(error.message);

    const hits: EventKnowledgeHit[] = ((rows ?? []) as never[]).map((row: never) => {
      const r = row as unknown as {
        id: string;
        event_id: string;
        city: string;
        venue: string;
        template_family_id: string | null;
        panel_id: string | null;
        kind: EventKnowledgeRecord["kind"];
        title: string;
        body: string;
        facts: EventKnowledgeFacts;
        source: EventKnowledgeRecord["source"];
        similarity: number;
      };
      return {
        id: r.id,
        eventId: r.event_id,
        city: r.city,
        venue: r.venue,
        templateFamilyId: r.template_family_id,
        panelId: r.panel_id,
        kind: r.kind,
        title: r.title,
        body: r.body,
        facts: r.facts ?? {},
        source: r.source,
        fingerprint: "",
        similarity: r.similarity,
      };
    });

    return { hits, brief: groupEventKnowledge(hits) };
  });

export type CaptureEventOutcomeInput = {
  panelId: string;
  panelName: string;
  templateFamilyId?: string | null;
  version: number;
  filename: string;
  trimW?: number | null;
  trimH?: number | null;
  note?: string | null;
};

/**
 * Records that a live file shipped. Called from the publish path, so it must be
 * cheap and must never block the publish: no embedding here, the row is picked
 * up by `embedEventKnowledgeBacklog`.
 */
export const captureEventOutcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CaptureEventOutcomeInput) => {
    if (!input?.panelId) throw new Error("A sign id is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { LONDON_HARVEST_VENUE, recordRow } = await import("@/lib/event-knowledge.server");

    const record = outcomeRecord({
      venue: LONDON_HARVEST_VENUE,
      panelId: data.panelId,
      panelName: data.panelName || data.panelId,
      templateFamilyId: data.templateFamilyId ?? null,
      version: data.version,
      filename: data.filename,
      trimW: data.trimW ?? null,
      trimH: data.trimH ?? null,
      note: data.note ?? null,
    });

    const { error } = await supabase
      .from("event_venue_knowledge")
      .upsert({ ...recordRow(record, userId), embedding: null, model: null } as never, {
        onConflict: "fingerprint",
      });
    if (error) throw new Error(error.message);
    return { captured: true };
  });

/** Embeds records captured without a vector — the search backlog. */
export const embedEventKnowledgeBacklog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertBrandTeam(supabase as never, userId);

    const { embedEventKnowledge, embeddingLiteral } = await import("@/lib/event-knowledge.server");
    const { EVENT_KNOWLEDGE_EMBEDDING_MODEL } = await import("@/lib/event-knowledge");

    const { data: rows, error } = await supabase
      .from("event_venue_knowledge")
      .select("id, event_id, city, venue, template_family_id, panel_id, kind, title, body, facts, source, fingerprint")
      .is("embedding", null)
      .limit(100);
    if (error) throw new Error(error.message);
    if (!rows?.length) return { embedded: 0, remaining: 0, failures: [] as string[] };

    const records = rows.map((row) => ({
      eventId: row.event_id,
      city: row.city,
      venue: row.venue,
      templateFamilyId: row.template_family_id,
      panelId: row.panel_id,
      kind: row.kind as EventKnowledgeRecord["kind"],
      title: row.title,
      body: row.body,
      facts: (row.facts ?? {}) as EventKnowledgeFacts,
      source: row.source as EventKnowledgeRecord["source"],
      fingerprint: row.fingerprint,
    }));

    const { vectors, failures } = await embedEventKnowledge(records.map(eventKnowledgeText));

    let embedded = 0;
    for (let i = 0; i < rows.length; i += 1) {
      const vector = vectors[i];
      if (!vector) continue;
      const { error: writeError } = await supabase
        .from("event_venue_knowledge")
        .update({
          embedding: embeddingLiteral(vector) as never,
          model: EVENT_KNOWLEDGE_EMBEDDING_MODEL,
        } as never)
        .eq("id", rows[i].id);
      if (writeError) throw new Error(writeError.message);
      embedded += 1;
    }

    const { count } = await supabase
      .from("event_venue_knowledge")
      .select("id", { count: "exact", head: true })
      .is("embedding", null);

    return { embedded, remaining: count ?? 0, failures: failures.map((f) => f.message) };
  });

/** Coverage read for the knowledge page: how much each event has taught. */
export const eventKnowledgeCoverage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("event_venue_knowledge")
      .select("city, kind, embedding, updated_at")
      .limit(5000);
    if (error) throw new Error(error.message);

    const byCity = new Map<
      string,
      { city: string; total: number; embedded: number; kinds: Record<string, number>; updatedAt: string | null }
    >();
    for (const row of data ?? []) {
      const entry =
        byCity.get(row.city) ??
        { city: row.city, total: 0, embedded: 0, kinds: {}, updatedAt: null };
      entry.total += 1;
      if (row.embedding) entry.embedded += 1;
      entry.kinds[row.kind] = (entry.kinds[row.kind] ?? 0) + 1;
      if (!entry.updatedAt || row.updated_at > entry.updatedAt) entry.updatedAt = row.updated_at;
      byCity.set(row.city, entry);
    }
    return { cities: [...byCity.values()].sort((a, b) => b.total - a.total) };
  });

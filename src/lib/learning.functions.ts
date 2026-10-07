import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const logOutcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        subjectType: z.enum(["event", "print", "deck", "social", "other"]),
        divisionId: z.string().max(80).optional(),
        eventId: z.string().max(80).optional(),
        city: z.string().max(120).optional(),
        phase: z.enum(["planning", "design", "print", "onsite", "post-event"]).optional(),
        whatWorked: z.string().max(2000).optional(),
        whatWentWrong: z.string().max(2000).optional(),
      })
      .refine((v) => (v.whatWorked ?? "").trim() || (v.whatWentWrong ?? "").trim(), "Tell us what worked or what went wrong.")
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { logLearningSignal } = await import("./learning.server");
    await logLearningSignal(context.supabase, context.userId, {
      source: "outcome",
      subjectType: data.subjectType,
      divisionId: data.divisionId ?? null,
      eventId: data.eventId ?? null,
      city: data.city ?? null,
      summary: [data.phase && `[${data.phase}]`, data.eventId && `Event ${data.eventId}${data.city ? ` (${data.city})` : ""}:`, data.whatWorked && `Worked: ${data.whatWorked}`, data.whatWentWrong && `Went wrong: ${data.whatWentWrong}`]
        .filter(Boolean)
        .join(" "),
      detail: { phase: data.phase ?? null, whatWorked: data.whatWorked ?? null, whatWentWrong: data.whatWentWrong ?? null },
    });
    return { ok: true };
  });

export const listLearning = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const [{ data: sugg, error }, { count: waiting }, { count: total }] = await Promise.all([
      sb.from("learning_suggestions").select("*").order("created_at", { ascending: false }).limit(200),
      sb.from("learning_signals").select("id", { count: "exact", head: true }).is("distilled_at", null),
      sb.from("learning_signals").select("id", { count: "exact", head: true }),
    ]);
    if (error) throw new Error(error.message);
    return { suggestions: sugg ?? [], waitingSignals: waiting ?? 0, totalSignals: total ?? 0 };
  });

export const distillLearning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase: sb, userId } = context;
    const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Only admins can run learning.");
    const { data: signals, error } = await sb
      .from("learning_signals")
      .select("id, source, subject_type, division_id, event_id, city, summary, detail")
      .is("distilled_at", null)
      .order("created_at")
      .limit(80);
    if (error) throw new Error(error.message);
    if (!signals?.length) return { created: 0, read: 0 };

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");
    const prompt = signals
      .map((s) => `[${s.id}] (${s.source}/${s.subject_type ?? "-"}${s.division_id ? `/${s.division_id}` : ""}${s.event_id ? ` event=${s.event_id}` : ""}${s.city ? ` city=${s.city}` : ""}) ${s.summary}${s.source === "edit" || s.source === "approval" ? ` ${JSON.stringify(s.detail).slice(0, 1200)}` : ""}`)
      .join("\n");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You turn feedback from a TransPerfect brand content system into reusable learning. Input: people's text corrections, reviewer approvals/rejections with reasons, and event/print outcome reports. Output JSON {\"suggestions\":[{\"kind\":\"rule\"|\"lesson\"|\"knowledge\"|\"template_idea\",\"title\":string,\"body\":string,\"division_id\":string|null,\"event_id\":string|null,\"city\":string|null,\"evidence\":[signal ids]}]}. rule = a do/don't for future generation drawn from repeated corrections or rejections; lesson = an event/print lesson; knowledge = a reusable fact or wording people consistently prefer; template_idea = repeated custom work worth making a template. Number corrections flagged 'possible invented figure' are high priority: propose a rule naming the kind of figure the AI invented and that it must come from verified knowledge. Repeated module switches away from one module in a section, repeated custom canvas pieces, repeated print layout or hero changes, and saved page templates are evidence for rules or template_idea (say which module/section/print kind). Module review notes become rules for future modules. Events: turn venue intake, research confirmations/rejections and event debriefs into lessons that help the NEXT event (what to ask the venue early, what research was wrong, print and onsite issues); set event_id/city when a lesson is specific to one, null when it applies to all events. Only propose what the evidence supports; never invent facts, numbers, dates or venues. Skip one-off typo fixes. Merge duplicates. Max 20.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(res.status === 429 ? "AI is busy, try again shortly." : res.status === 402 ? "AI credits are used up." : `AI error ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const Out = z.object({
      suggestions: z
        .array(
          z.object({
            kind: z.enum(["rule", "lesson", "knowledge", "template_idea"]),
            title: z.string().min(3).max(200),
            body: z.string().min(3).max(3000),
            division_id: z.string().max(80).nullable().optional(),
            event_id: z.string().max(80).nullable().optional(),
            city: z.string().max(120).nullable().optional(),
            evidence: z.array(z.string()).optional(),
          }),
        )
        .max(30),
    });
    let parsed: z.infer<typeof Out>;
    try {
      parsed = Out.parse(JSON.parse(json.choices?.[0]?.message?.content ?? "{}"));
    } catch {
      throw new Error("The AI reply couldn't be read. Nothing was changed — try again.");
    }
    const ids = new Set(signals.map((s) => s.id));
    // If every piece of evidence came from one event, the lesson belongs to it
    // even when the model forgot to say so.
    const byId = new Map(signals.map((x) => [x.id, x]));
    const inherit = (ev: string[] | undefined, key: "event_id" | "city") => {
      const vals = new Set((ev ?? []).map((e) => byId.get(e)?.[key]).filter(Boolean));
      return vals.size === 1 ? ([...vals][0] as string) : null;
    };
    const rows = parsed.suggestions.map((s) => ({
      kind: s.kind,
      title: s.title,
      body: s.body,
      division_id: s.division_id ?? null,
      event_id: s.event_id ?? inherit(s.evidence, "event_id"),
      city: s.city ?? inherit(s.evidence, "city"),
      evidence_signal_ids: (s.evidence ?? []).filter((e) => ids.has(e)),
      created_by: userId,
    }));
    if (rows.length) {
      const { error: insErr } = await sb.from("learning_suggestions").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }
    await sb.from("learning_signals").update({ distilled_at: new Date().toISOString() }).in("id", [...ids]);
    return { created: rows.length, read: signals.length };
  });

export const decideSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "rejected"]),
        note: z.string().max(1000).optional(),
        title: z.string().min(3).max(200).optional(),
        body: z.string().min(3).max(3000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase: sb, userId } = context;
    const { data: s, error } = await sb.from("learning_suggestions").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!s) throw new Error("Suggestion not found (admins only).");
    if (s.status !== "pending") throw new Error("This suggestion was already decided.");
    let entryId: string | null = null;
    let eventEntryId: string | null = null;
    if (data.status === "approved") {
      const title = data.title ?? s.title;
      const body = data.body ?? s.body;
      const { data: entry, error: kErr } = await sb
        .from("knowledge_entries")
        .insert({
          title,
          body,
          kind: s.kind === "rule" ? "policy" : s.kind === "knowledge" ? "fact" : "note",
          owner_division_id: s.division_id ?? "global",
          visibility: "global",
          tags: ["learned", `learned-${s.kind}`],
          sources: ["Learning loop (admin approved)"],
          created_by: userId,
        })
        .select("id")
        .single();
      if (kErr) throw new Error(kErr.message);
      entryId = entry.id;
      // Event lessons also go into the event knowledge the events assistant
      // searches before any new venue or signage work.
      if (s.kind === "lesson" || s.event_id || s.city) {
        const { data: ek, error: eErr } = await sb
          .from("event_venue_knowledge")
          .insert({
            event_id: s.event_id ?? "all-events",
            city: s.city ?? "All events",
            kind: "lesson",
            title,
            body,
            source: "learned",
            fingerprint: `learned:${s.id}`,
            facts: { evidence_signal_ids: s.evidence_signal_ids, approved_by: userId } as never,
            created_by: userId,
          })
          .select("id")
          .single();
        if (eErr) throw new Error(`Saved to knowledge, but couldn't add to event knowledge: ${eErr.message}`);
        eventEntryId = ek.id;
      }
    }
    const { error: uErr } = await sb
      .from("learning_suggestions")
      .update({
        status: data.status,
        decision_note: data.note?.trim() || null,
        decided_by: userId,
        decided_at: new Date().toISOString(),
        knowledge_entry_id: entryId,
        event_knowledge_id: eventEntryId,
        ...(data.title ? { title: data.title } : {}),
        ...(data.body ? { body: data.body } : {}),
      })
      .eq("id", data.id);
    if (uErr) throw new Error(uErr.message);
    return { ok: true, knowledgeEntryId: entryId };
  });

export const listEventLessons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ city: z.string().max(120).optional(), eventId: z.string().max(80).optional() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("event_venue_knowledge")
      .select("id, event_id, city, title, body, kind, source, updated_at")
      .in("kind", ["lesson"])
      .order("updated_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const city = data.city?.toLowerCase();
    // This event first, then lessons for all events, then other cities.
    const rank = (r: (typeof list)[number]) =>
      r.event_id === data.eventId ? 0 : r.event_id === "all-events" ? 1 : city && r.city?.toLowerCase() === city ? 1 : 2;
    return list.sort((a, b) => rank(a) - rank(b)).slice(0, 40);
  });

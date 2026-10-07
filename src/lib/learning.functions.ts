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
      summary: [data.whatWorked && `Worked: ${data.whatWorked}`, data.whatWentWrong && `Went wrong: ${data.whatWentWrong}`]
        .filter(Boolean)
        .join(" | "),
      detail: { whatWorked: data.whatWorked ?? null, whatWentWrong: data.whatWentWrong ?? null },
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
      .select("id, source, subject_type, division_id, summary, detail")
      .is("distilled_at", null)
      .order("created_at")
      .limit(80);
    if (error) throw new Error(error.message);
    if (!signals?.length) return { created: 0, read: 0 };

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");
    const prompt = signals
      .map((s) => `[${s.id}] (${s.source}/${s.subject_type ?? "-"}${s.division_id ? `/${s.division_id}` : ""}) ${s.summary}${s.source === "edit" ? ` ${JSON.stringify(s.detail).slice(0, 1200)}` : ""}`)
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
              "You turn feedback from a TransPerfect brand content system into reusable learning. Input: people's text corrections, reviewer approvals/rejections with reasons, and event/print outcome reports. Output JSON {\"suggestions\":[{\"kind\":\"rule\"|\"lesson\"|\"knowledge\"|\"template_idea\",\"title\":string,\"body\":string,\"division_id\":string|null,\"evidence\":[signal ids]}]}. rule = a do/don't for future generation drawn from repeated corrections or rejections; lesson = an event/print lesson; knowledge = a reusable fact or wording people consistently prefer; template_idea = repeated custom work worth making a template. Only propose what the evidence supports; never invent facts, numbers, dates or venues. Skip one-off typo fixes. Merge duplicates. Max 12.",
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
            evidence: z.array(z.string()).optional(),
          }),
        )
        .max(20),
    });
    let parsed: z.infer<typeof Out>;
    try {
      parsed = Out.parse(JSON.parse(json.choices?.[0]?.message?.content ?? "{}"));
    } catch {
      throw new Error("The AI reply couldn't be read. Nothing was changed — try again.");
    }
    const ids = new Set(signals.map((s) => s.id));
    const rows = parsed.suggestions.map((s) => ({
      kind: s.kind,
      title: s.title,
      body: s.body,
      division_id: s.division_id ?? null,
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
    }
    const { error: uErr } = await sb
      .from("learning_suggestions")
      .update({
        status: data.status,
        decision_note: data.note?.trim() || null,
        decided_by: userId,
        decided_at: new Date().toISOString(),
        knowledge_entry_id: entryId,
        ...(data.title ? { title: data.title } : {}),
        ...(data.body ? { body: data.body } : {}),
      })
      .eq("id", data.id);
    if (uErr) throw new Error(uErr.message);
    return { ok: true, knowledgeEntryId: entryId };
  });

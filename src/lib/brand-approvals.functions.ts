// Brand / compliance approval workflow.
//
// A submitter sends a deck, print asset, social/event asset or campaign kit for
// review with a snapshot of the automated brand checks. Admins and brand
// reviewers work the queue: read, comment, approve or request changes. Export
// surfaces read `getApprovalState` to show whether an item is cleared to ship.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const APPROVAL_SUBJECT_TYPES = ["deck", "print", "social", "event", "kit"] as const;
export type ApprovalSubjectType = (typeof APPROVAL_SUBJECT_TYPES)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "changes_requested"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export type ApprovalCheck = {
  id: string;
  label: string;
  severity: "blocking" | "warning" | "info";
  detail?: string;
};

const CheckSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().min(1).max(300),
  severity: z.enum(["blocking", "warning", "info"]),
  detail: z.string().max(1000).optional(),
});

const SubjectType = z.enum(APPROVAL_SUBJECT_TYPES);
const Status = z.enum(APPROVAL_STATUSES);

async function reviewerFlags(
  supabase: {
    from: (t: "user_roles") => {
      select: (c: string) => {
        eq: (
          c: string,
          v: string,
        ) => { in: (c: string, v: string[]) => Promise<{ data: { role: string }[] | null }> };
      };
    };
  },
  userId: string,
) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "brand_reviewer"]);
  const roles = (data ?? []).map((r) => r.role);
  return { isAdmin: roles.includes("admin"), isReviewer: roles.length > 0 };
}

/** Submit (or re-submit) an item for brand/compliance review. */
export const requestApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        subjectType: SubjectType,
        subjectId: z.string().min(1).max(200),
        title: z.string().min(1).max(300),
        subjectPath: z.string().max(500).optional(),
        priority: z.enum(["normal", "high"]).optional(),
        summary: z.string().max(2000).optional(),
        checks: z.array(CheckSchema).max(60).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Re-submitting the same item reopens the existing request so the comment
    // thread and history stay in one place.
    const { data: existing } = await supabase
      .from("approval_requests")
      .select("id, status")
      .eq("subject_type", data.subjectType)
      .eq("subject_id", data.subjectId)
      .eq("requested_by", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const patch = {
      title: data.title.trim(),
      subject_path: data.subjectPath ?? null,
      priority: data.priority ?? "normal",
      summary: data.summary ?? null,
      checks: (data.checks ?? []) as unknown as never,
      status: "pending",
      decided_by: null,
      decided_at: null,
      decision_note: null,
    };

    if (existing) {
      const { error } = await supabase
        .from("approval_requests")
        .update(patch)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { id: existing.id, reopened: true as const };
    }

    const { data: row, error } = await supabase
      .from("approval_requests")
      .insert({
        subject_type: data.subjectType,
        subject_id: data.subjectId,
        requested_by: userId,
        ...patch,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, reopened: false as const };
  });

/** The reviewer queue. Reviewers see everything; others see their own submissions. */
export const listApprovalRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({ status: Status.optional(), subjectType: SubjectType.optional() })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isAdmin, isReviewer } = await reviewerFlags(supabase, userId);

    const sel = (s: string): string => s;
    let q = supabase
      .from("approval_requests")
      .select(
        sel(
          "id, subject_type, subject_id, title, subject_path, requested_by, status, priority, checks, summary, decided_by, decided_at, decision_note, created_at, updated_at",
        ),
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    if (data.subjectType) q = q.eq("subject_type", data.subjectType);

    const { data: rows, error } = await q.returns<ApprovalRequestRow[]>();
    if (error) throw new Error(error.message);

    const ids = Array.from(
      new Set(
        (rows ?? []).flatMap((r) => [r.requested_by, r.decided_by].filter(Boolean) as string[]),
      ),
    );
    let people: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      people = Object.fromEntries((profs ?? []).map((p) => [p.id, p.display_name ?? "Member"]));
    }

    const { data: counts } = await supabase
      .from("approval_comments")
      .select("request_id")
      .in("request_id", (rows ?? []).map((r) => r.id).slice(0, 200));
    const commentCounts: Record<string, number> = {};
    (counts ?? []).forEach((c) => {
      commentCounts[c.request_id] = (commentCounts[c.request_id] ?? 0) + 1;
    });

    return {
      requests: rows ?? [],
      people,
      commentCounts,
      isReviewer,
      isAdmin,
    };
  });

export type ApprovalRequestRow = {
  id: string;
  subject_type: string;
  subject_id: string;
  title: string;
  subject_path: string | null;
  requested_by: string;
  status: string;
  priority: string;
  checks: ApprovalCheck[] | null;
  summary: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
  updated_at: string;
};

/** Latest approval state for one item — used to gate/annotate export surfaces. */
export const getApprovalState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ subjectType: SubjectType, subjectId: z.string().min(1).max(200) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("approval_requests")
      .select("id, status, decided_at, decision_note, updated_at")
      .eq("subject_type", data.subjectType)
      .eq("subject_id", data.subjectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { request: row ?? null };
  });

/** Approve or request changes. Reviewer-only. */
export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "changes_requested", "pending"]),
        note: z.string().max(2000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isReviewer } = await reviewerFlags(supabase, userId);
    if (!isReviewer) throw new Error("Forbidden: reviewer role required");

    const decided = data.status !== "pending";
    const { error } = await supabase
      .from("approval_requests")
      .update({
        status: data.status,
        decision_note: data.note?.trim() || null,
        decided_by: decided ? userId : null,
        decided_at: decided ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.note?.trim()) {
      await supabase.from("approval_comments").insert({
        request_id: data.id,
        author_id: userId,
        body: `[${
          data.status === "approved"
            ? "Approved"
            : data.status === "changes_requested"
              ? "Changes requested"
              : "Reopened"
        }] ${data.note.trim()}`,
      });
    }
    return { ok: true, status: data.status };
  });

export const bulkDecideApprovals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(50),
        status: z.enum(["approved", "changes_requested"]),
        note: z.string().max(2000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isReviewer } = await reviewerFlags(supabase, userId);
    if (!isReviewer) throw new Error("Forbidden: reviewer role required");
    const { error } = await supabase
      .from("approval_requests")
      .update({
        status: data.status,
        decision_note: data.note?.trim() || null,
        decided_by: userId,
        decided_at: new Date().toISOString(),
      })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

// ---------- Comment thread ----------

export const listApprovalComments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ requestId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("approval_comments")
      .select("id, request_id, author_id, body, resolved, created_at")
      .eq("request_id", data.requestId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).map((r) => r.author_id)));
    let people: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      people = Object.fromEntries((profs ?? []).map((p) => [p.id, p.display_name ?? "Member"]));
    }
    return { comments: rows ?? [], people };
  });

export const postApprovalComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({ requestId: z.string().uuid(), body: z.string().min(1).max(4000) })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("approval_comments").insert({
      request_id: data.requestId,
      author_id: userId,
      body: data.body.trim(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resolveApprovalComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), resolved: z.boolean() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("approval_comments")
      .update({ resolved: data.resolved })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

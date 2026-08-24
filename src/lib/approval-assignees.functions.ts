// Per-reviewer assignment on approval requests.
//
// Reviewers (admin / brand_reviewer) assign named people to an approval item and
// each assignee records their own decision. The overall request status still
// lives on approval_requests; these rows track individual sign-off so a queue
// item can show "2 of 3 reviewers approved".
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ASSIGNEE_LANES = ["brand", "marketing", "compliance", "admin"] as const;
export type AssigneeLane = (typeof ASSIGNEE_LANES)[number];

export const ASSIGNEE_DECISIONS = ["pending", "approved", "changes_requested"] as const;
export type AssigneeDecision = (typeof ASSIGNEE_DECISIONS)[number];

export type ApprovalAssigneeRow = {
  id: string;
  request_id: string;
  assignee_id: string;
  assigned_by: string;
  lane: string;
  decision: string;
  decision_note: string | null;
  decided_at: string | null;
  created_at: string;
};

type RoleRow = { user_id?: string; role: string };

function reviewerFlags(rows: RoleRow[] | null) {
  const roles = (rows ?? []).map((r) => String(r.role));
  return {
    isAdmin: roles.includes("admin"),
    isReviewer: roles.includes("admin") || roles.includes("brand_reviewer"),
  };
}

const REVIEWER_ROLES = ["admin", "brand_reviewer", "brand_lead", "content_owner"] as const;

const LANE_BY_ROLE: Record<string, AssigneeLane> = {
  admin: "admin",
  brand_reviewer: "brand",
  brand_lead: "brand",
  content_owner: "marketing",
};

/** People who can be assigned as reviewers, with a suggested lane. */
export const listAssignableReviewers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: roleRows, error } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", REVIEWER_ROLES as unknown as string[]);
    if (error) throw new Error(error.message);

    const byUser = new Map<string, Set<string>>();
    (roleRows ?? []).forEach((r) => {
      const id = String(r.user_id);
      if (!byUser.has(id)) byUser.set(id, new Set());
      byUser.get(id)!.add(String(r.role));
    });

    const ids = Array.from(byUser.keys());
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      names = Object.fromEntries((profs ?? []).map((p) => [p.id, p.display_name ?? "Member"]));
    }

    const reviewers = ids
      .map((id) => {
        const roles = Array.from(byUser.get(id) ?? []);
        const lane =
          roles.map((r) => LANE_BY_ROLE[r]).find((l): l is AssigneeLane => Boolean(l)) ?? "brand";
        return { id, name: names[id] ?? "Member", roles, lane };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return { reviewers };
  });

/** All assignment rows for a set of requests (queue badges + detail panel). */
export const listApprovalAssignees = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ requestIds: z.array(z.string().uuid()).max(200) }).parse(raw ?? { requestIds: [] }),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.requestIds.length === 0) {
      return { assignees: [] as ApprovalAssigneeRow[], people: {}, userId };
    }
    const { data: rows, error } = await supabase
      .from("approval_assignees")
      .select(
        "id, request_id, assignee_id, assigned_by, lane, decision, decision_note, decided_at, created_at",
      )
      .in("request_id", data.requestIds)
      .order("created_at", { ascending: true })
      .returns<ApprovalAssigneeRow[]>();
    if (error) throw new Error(error.message);

    const ids = Array.from(
      new Set((rows ?? []).flatMap((r) => [r.assignee_id, r.assigned_by])),
    );
    let people: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", ids);
      people = Object.fromEntries((profs ?? []).map((p) => [p.id, p.display_name ?? "Member"]));
    }
    return { assignees: rows ?? [], people, userId };
  });

/** Assign a reviewer to a request. Reviewer-only. */
export const assignApprovalReviewer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        assigneeId: z.string().uuid(),
        lane: z.enum(ASSIGNEE_LANES).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (!reviewerFlags(roleRows as RoleRow[] | null).isReviewer) {
      throw new Error("Forbidden: reviewer role required");
    }

    const { error } = await supabase.from("approval_assignees").upsert(
      {
        request_id: data.requestId,
        assignee_id: data.assigneeId,
        assigned_by: userId,
        lane: data.lane ?? "brand",
      },
      { onConflict: "request_id,assignee_id" },
    );
    if (error) throw new Error(error.message);

    const { data: req } = await supabase
      .from("approval_requests")
      .select("title")
      .eq("id", data.requestId)
      .maybeSingle();

    const { notifyAssignee } = await import("./notify-approvals.server");
    await notifyAssignee(data.requestId, data.assigneeId, req?.title ?? "an asset", userId);

    await (await import("./approval-events.server")).logApprovalEvent(supabase, {
      requestId: data.requestId,
      actorId: userId,
      kind: "commented",
      note: null,
      meta: { assigned: data.assigneeId, lane: data.lane ?? "brand" },
    });

    return { ok: true as const };
  });

/** Remove an assignment. Reviewer-only. */
export const unassignApprovalReviewer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (!reviewerFlags(roleRows as RoleRow[] | null).isReviewer) {
      throw new Error("Forbidden: reviewer role required");
    }
    const { error } = await supabase.from("approval_assignees").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** The assigned reviewer records their own decision. */
export const recordAssigneeDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(ASSIGNEE_DECISIONS),
        note: z.string().max(2000).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error: readErr } = await supabase
      .from("approval_assignees")
      .select("id, request_id, assignee_id")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) throw new Error("Assignment not found");

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const { isReviewer } = reviewerFlags(roleRows as RoleRow[] | null);
    if (row.assignee_id !== userId && !isReviewer) {
      throw new Error("Forbidden: this decision belongs to another reviewer");
    }

    const decided = data.decision !== "pending";
    const { error } = await supabase
      .from("approval_assignees")
      .update({
        decision: data.decision,
        decision_note: data.note?.trim() || null,
        decided_at: decided ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (decided) {
      await (await import("./approval-events.server")).logApprovalEvent(supabase, {
        requestId: row.request_id,
        actorId: userId,
        kind: data.decision === "approved" ? "approved" : "changes_requested",
        note: data.note?.trim() || null,
        meta: { individual: true, assignmentId: row.id },
      });
    }

    // Roll-up: every assignee approved → mark the request approved so export
    // gates clear without a second manual click.
    const { data: siblings } = await supabase
      .from("approval_assignees")
      .select("decision")
      .eq("request_id", row.request_id);
    const all = siblings ?? [];
    const allApproved = all.length > 0 && all.every((s) => s.decision === "approved");
    const anyChanges = all.some((s) => s.decision === "changes_requested");

    if (allApproved || anyChanges) {
      await supabase
        .from("approval_requests")
        .update({
          status: allApproved ? "approved" : "changes_requested",
          decided_by: userId,
          decided_at: new Date().toISOString(),
        })
        .eq("id", row.request_id);
    }

    return {
      ok: true as const,
      rolledUpTo: allApproved ? "approved" : anyChanges ? "changes_requested" : null,
    };
  });

// Approval-event notification fan-out (server-only).
//
// Alerts are best-effort: a delivery failure never fails the review action that
// produced it.
import { notifyUsers } from "./notify.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function notifyReviewers(requestId: string, title: string, actorId: string) {
  try {
    const { data: reviewers } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "brand_reviewer"]);
    await notifyUsers({
      userIds: (reviewers ?? []).map((r) => r.user_id as string),
      kind: "submitted",
      title,
      body: "Sent for brand and compliance review.",
      link: `/approvals?request=${requestId}`,
      requestId,
      actorId,
    });
  } catch (e) {
    console.error("[approvals] reviewer notify failed:", e);
  }
}

export async function notifyRequesters(
  ids: string[],
  status: "approved" | "changes_requested" | "pending",
  actorId: string,
  note: string | null,
) {
  if (status === "pending") return;
  try {
    const { data: rows } = await supabaseAdmin
      .from("approval_requests")
      .select("id, title, requested_by, subject_type, subject_id")
      .in("id", ids);
    for (const row of rows ?? []) {
      await notifyUsers({
        userIds: [row.requested_by as string],
        kind: status,
        title: row.title as string,
        body:
          note ??
          (status === "approved"
            ? "Approved — cleared to export."
            : "Sent back for changes before export."),
        link: `/approvals?request=${row.id}`,
        subjectType: row.subject_type as string,
        subjectId: row.subject_id as string,
        requestId: row.id as string,
        actorId,
      });
    }
  } catch (e) {
    console.error("[approvals] decision notify failed:", e);
  }
}

export async function notifyThread(requestId: string, actorId: string, body: string) {
  try {
    const { data: req } = await supabaseAdmin
      .from("approval_requests")
      .select("id, title, requested_by, subject_type, subject_id")
      .eq("id", requestId)
      .maybeSingle();
    if (!req) return;
    // Everyone already in the thread, plus the submitter.
    const { data: authors } = await supabaseAdmin
      .from("approval_comments")
      .select("author_id")
      .eq("request_id", requestId);
    const userIds = [
      req.requested_by as string,
      ...(authors ?? []).map((a) => a.author_id as string),
    ];
    await notifyUsers({
      userIds,
      kind: "comment",
      title: req.title as string,
      body: body.length > 240 ? `${body.slice(0, 240)}…` : body,
      link: `/approvals?request=${requestId}`,
      subjectType: req.subject_type as string,
      subjectId: req.subject_id as string,
      requestId,
      actorId,
    });
  } catch (e) {
    console.error("[approvals] comment notify failed:", e);
  }
}

/** Tell one person they have been put on the hook for a review. */
export async function notifyAssignee(
  requestId: string,
  assigneeId: string,
  title: string,
  actorId: string,
) {
  try {
    await notifyUsers({
      userIds: [assigneeId],
      kind: "submitted",
      title,
      body: "You were assigned as a reviewer on this item.",
      link: `/approvals?request=${requestId}`,
      requestId,
      actorId,
    });
  } catch (e) {
    console.error("[approvals] assignee notify failed:", e);
  }
}

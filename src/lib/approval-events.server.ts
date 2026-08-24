// Append-only audit log for the brand/compliance approval workflow.
//
// Every submission, reviewer decision, reopen and comment writes one row so
// export surfaces can render a complete, ordered timeline of who did what,
// when, and with which note.
import type { SupabaseClient } from "@supabase/supabase-js";

export type ApprovalEventKind =
  | "submitted"
  | "resubmitted"
  | "approved"
  | "changes_requested"
  | "reopened"
  | "comment";

export type ApprovalEventInput = {
  requestId: string;
  actorId: string;
  kind: ApprovalEventKind;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
  meta?: Record<string, unknown>;
};

/** Best-effort: an audit write must never fail the user's action. */
export async function logApprovalEvent(
  // The generated client is typed; the audit table shape is narrow enough that
  // a loose client type keeps this helper reusable from any caller.
  supabase: SupabaseClient<never, "public", never>,
  input: ApprovalEventInput,
): Promise<void> {
  try {
    await (supabase as unknown as SupabaseClient).from("approval_events").insert({
      request_id: input.requestId,
      actor_id: input.actorId,
      kind: input.kind,
      from_status: input.fromStatus ?? null,
      to_status: input.toStatus ?? null,
      note: input.note ?? null,
      meta: input.meta ?? {},
    });
  } catch (err) {
    console.error("logApprovalEvent failed", err);
  }
}

export async function logApprovalEvents(
  supabase: SupabaseClient<never, "public", never>,
  inputs: ApprovalEventInput[],
): Promise<void> {
  for (const input of inputs) await logApprovalEvent(supabase, input);
}

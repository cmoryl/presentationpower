// Append-only audit log for the brand/compliance approval workflow.
//
// Every submission, reviewer decision, reopen and comment writes one row so
// export surfaces can render a complete, ordered timeline of who did what,
// when, and with which note.
/** Minimal shape we need — keeps this helper usable with any Supabase client. */
type InsertClient = {
  from: (table: string) => { insert: (values: Record<string, unknown>) => Promise<unknown> };
};

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
  meta?: Record<string, string | number | boolean | null>;
};

/** Best-effort: an audit write must never fail the user's action. */
export async function logApprovalEvent(
  supabase: unknown,
  input: ApprovalEventInput,
): Promise<void> {
  try {
    await (supabase as InsertClient).from("approval_events").insert({
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
  supabase: unknown,
  inputs: ApprovalEventInput[],
): Promise<void> {
  for (const input of inputs) await logApprovalEvent(supabase, input);
}

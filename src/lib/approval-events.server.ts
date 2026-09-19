// Append-only audit log for the brand/compliance approval workflow.
//
// Every submission, reviewer decision, reopen and comment writes one row so
// export surfaces can render a complete, ordered timeline of who did what,
// when, and with which note.
/** Minimal shape we need — keeps this helper usable with any Supabase client. */
type InsertClient = {
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => Promise<{ error?: { message?: string } | null }>;
  };
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
  /** Structured reviewer reasons (see review-reasons.ts) for this decision. */
  changeReasons?: readonly string[] | null;
  meta?: Record<string, string | number | boolean | null>;
};

/**
 * An audit write must never fail the user's action, but a silent failure means
 * the timeline quietly stops being complete. Failures are returned so the
 * caller can tell the user the history entry is missing.
 */
export async function logApprovalEvent(
  supabase: unknown,
  input: ApprovalEventInput,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await (supabase as InsertClient).from("approval_events").insert({
      request_id: input.requestId,
      actor_id: input.actorId,
      kind: input.kind,
      from_status: input.fromStatus ?? null,
      to_status: input.toStatus ?? null,
      note: input.note ?? null,
      change_reasons: input.changeReasons ? [...input.changeReasons] : [],
      meta: input.meta ?? {},
    });
    if (res?.error) {
      console.error("logApprovalEvent failed", res.error);
      return { ok: false, error: res.error.message ?? "history write failed" };
    }
    return { ok: true };
  } catch (err) {
    console.error("logApprovalEvent failed", err);
    return { ok: false, error: err instanceof Error ? err.message : "history write failed" };
  }
}

export async function logApprovalEvents(
  supabase: unknown,
  inputs: ApprovalEventInput[],
): Promise<{ ok: boolean; failed: number }> {
  let failed = 0;
  for (const input of inputs) {
    const res = await logApprovalEvent(supabase, input);
    if (!res.ok) failed += 1;
  }
  return { ok: failed === 0, failed };
}


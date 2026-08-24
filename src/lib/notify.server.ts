// Server-only notification fan-out.
//
// One entry point (`notifyUsers`) writes the in-app inbox rows and, when the
// project has email sending configured, mails the same message. Notifications
// are written for *other* people, so this uses the admin client (RLS only lets
// a member read/update their own rows).
import type { Database } from "@/integrations/supabase/types";

export type NotifyKind =
  | "comment"
  | "approved"
  | "changes_requested"
  | "submitted"
  /** Custom message broadcast by an admin. */
  | "admin_alert";

export type NotifyInput = {
  /** Recipient user ids. Duplicates and the actor are filtered out. */
  userIds: string[];
  kind: NotifyKind;
  title: string;
  body?: string | null;
  /** In-app deep link, e.g. `/approvals?request=<id>`. */
  link?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  requestId?: string | null;
  /** Whoever triggered it — never notified about their own action. */
  actorId?: string | null;
};

type PrefRow = { user_id: string; inapp_enabled: boolean; email_enabled: boolean };

/** Human label for each event, used in email subjects and inbox grouping. */
export const NOTIFY_LABEL: Record<NotifyKind, string> = {
  comment: "New comment",
  approved: "Approved",
  changes_requested: "Changes requested",
  submitted: "Sent for review",
  admin_alert: "Announcement",
};

export async function notifyUsers(input: NotifyInput): Promise<{ delivered: number }> {
  const recipients = Array.from(new Set(input.userIds.filter(Boolean))).filter(
    (id) => id !== input.actorId,
  );
  if (!recipients.length) return { delivered: 0 };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Missing pref rows mean "not configured yet" → both channels on.
  const { data: prefRows } = await supabaseAdmin
    .from("notification_prefs")
    .select("user_id, inapp_enabled, email_enabled")
    .in("user_id", recipients);
  const prefs = new Map<string, PrefRow>(
    ((prefRows ?? []) as PrefRow[]).map((r) => [r.user_id, r]),
  );
  const wants = (id: string, channel: "inapp_enabled" | "email_enabled") =>
    prefs.get(id)?.[channel] ?? true;

  const inAppTargets = recipients.filter((id) => wants(id, "inapp_enabled"));
  if (inAppTargets.length) {
    const rows: Database["public"]["Tables"]["notifications"]["Insert"][] = inAppTargets.map(
      (userId) => ({
        user_id: userId,
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        subject_type: input.subjectType ?? null,
        subject_id: input.subjectId ?? null,
        request_id: input.requestId ?? null,
        actor_id: input.actorId ?? null,
      }),
    );
    const { error } = await supabaseAdmin.from("notifications").insert(rows);
    // A notification failure must never fail the action that caused it.
    if (error) console.error("[notify] in-app insert failed:", error.message);
  }

  const emailTargets = recipients.filter((id) => wants(id, "email_enabled"));
  if (emailTargets.length) {
    await sendNotificationEmails(emailTargets, input).catch((e: unknown) => {
      console.error("[notify] email send failed:", e);
    });
  }

  return { delivered: recipients.length };
}

/**
 * Email delivery. Managed sending needs a verified sender domain for this
 * project; until one is configured there is nothing to send from, so this
 * resolves quietly and the in-app inbox carries the alert on its own.
 */
async function sendNotificationEmails(userIds: string[], input: NotifyInput): Promise<void> {
  const mod = await loadEmailSender();
  if (!mod) return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const site = process.env["SITE_URL"] ?? "";
  for (const userId of userIds) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = data.user?.email;
    if (!email) continue;
    await mod.sendApprovalNotificationEmail({
      to: email,
      kind: input.kind,
      title: input.title,
      body: input.body ?? "",
      url: input.link ? `${site}${input.link}` : site,
    });
  }
}

type EmailSender = {
  sendApprovalNotificationEmail: (args: {
    to: string;
    kind: NotifyKind;
    title: string;
    body: string;
    url: string;
  }) => Promise<unknown>;
};

/**
 * The email template module is scaffolded once a sender domain exists. Loading
 * it lazily keeps notifications working before that point.
 */
async function loadEmailSender(): Promise<EmailSender | null> {
  const mod = (await import("./notify-email.server")) as unknown as EmailSender;
  return typeof mod.sendApprovalNotificationEmail === "function" ? mod : null;
}

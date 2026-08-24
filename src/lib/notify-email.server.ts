// Server-only email delivery for approval notifications.
//
// Managed sending requires a verified sender domain for this project. Until one
// is set up there is no address to send from, so this resolves as "skipped" and
// the in-app inbox carries the alert on its own. Once the sender domain is
// verified, this file renders and sends the branded email — the call sites in
// `notify.server.ts` do not change.
import { NOTIFY_LABEL, type NotifyKind } from "./notify.server";

export type ApprovalEmail = {
  to: string;
  kind: NotifyKind;
  title: string;
  body: string;
  url: string;
};

function senderConfigured(): boolean {
  return Boolean(process.env["LOVABLE_EMAIL_SENDER"] ?? process.env["EMAIL_SENDER_DOMAIN"]);
}

/** Subject line shared by the email and any future digest. */
export function approvalEmailSubject(mail: Pick<ApprovalEmail, "kind" | "title">): string {
  return `${NOTIFY_LABEL[mail.kind]} — ${mail.title}`;
}

/** Plain-text fallback body; the HTML template reuses the same copy. */
export function approvalEmailText(mail: ApprovalEmail): string {
  return [
    approvalEmailSubject(mail),
    "",
    mail.body,
    "",
    `Open in TransPerfect Element: ${mail.url}`,
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

export async function sendApprovalNotificationEmail(
  mail: ApprovalEmail,
): Promise<{ sent: boolean; reason?: string }> {
  if (!senderConfigured()) {
    return { sent: false, reason: "sender_domain_not_configured" };
  }
  // Sender domain present: hand the rendered message to managed delivery.
  const { sendManagedEmail } = await import("./managed-email.server");
  return sendManagedEmail({
    to: mail.to,
    subject: approvalEmailSubject(mail),
    text: approvalEmailText(mail),
  });
}

// Thin wrapper over Lovable's managed email delivery.
//
// Kept behind its own module so notification code never depends on the email
// SDK being installed: this posts to the managed email API directly with the
// project's API key. Delivery, retries, suppression and unsubscribe are handled
// on Lovable's side.
export type ManagedEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendManagedEmail(
  mail: ManagedEmail,
): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { sent: false, reason: "missing_api_key" };

  const res = await fetch("https://api.lovable.dev/email/v1/send", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      ...(mail.html ? { html: mail.html } : {}),
    }),
  });

  if (res.status === 429) {
    const retry = Number(res.headers.get("retry-after") ?? "60");
    return { sent: false, reason: `rate_limited_retry_after_${retry}` };
  }
  if (!res.ok) {
    return { sent: false, reason: `http_${res.status}` };
  }
  return { sent: true };
}

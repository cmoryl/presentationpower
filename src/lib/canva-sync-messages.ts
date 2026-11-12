// Turns raw Canva / storage failures into a plain explanation plus the next step.
export interface SyncProblem { what: string; next: string }

/** One recorded sync run, as returned by the server. */
export interface CanvaRunRow {
  startedAt: string;
  finishedAt: string | null;
  trigger: string;
  checked: number;
  synced: number;
  failed: number;
  remaining: number;
  stoppedReason: string | null;
}

export interface CanvaLastRun { lastCheckedAt: string | null; run: CanvaRunRow | null }

const stamp = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null;

/** One plain line: when Canva was last checked and what the last update run did. */
export function describeLastRun(x: CanvaLastRun): string | null {
  const parts: string[] = [];
  const checked = stamp(x.lastCheckedAt);
  if (checked) parts.push(`Last check: ${checked}`);
  const r = x.run;
  if (r) {
    const at = stamp(r.finishedAt ?? r.startedAt);
    const bits = [`${r.synced} updated`, `${r.checked} checked`];
    if (r.failed > 0) bits.push(`${r.failed} with problems`);
    if (r.remaining > 0) bits.push(`${r.remaining} still waiting`);
    parts.push(`Last update run: ${at ?? "unknown"} (${r.trigger === "daily" ? "automatic" : "manual"}) — ${bits.join(", ")}`);
    if (r.stoppedReason) parts.push(`Stopped early: ${r.stoppedReason}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

/** What the public "pictures last updated" line needs: dates and where they came from. */
export interface CanvaPictureStamp {
  picturesUpdated: string | null;
  source: "canva" | "original" | null;
  lastCheckedAt: string | null;
}

/** One plain line for every visitor: when the pictures shown here last changed. */
export function describePictureStamp(x: CanvaPictureStamp): string | null {
  const at = stamp(x.picturesUpdated);
  if (!at) return null;
  const base = x.source === "canva" ? `Pictures last updated from Canva ${at}` : `Pictures are the original calendar set, saved ${at}`;
  const checked = stamp(x.lastCheckedAt);
  return checked ? `${base} · checked with Canva ${checked}` : base;
}

export function explainSyncError(raw: string): SyncProblem {
  const m = raw.toLowerCase();
  const code = raw.match(/\[(\d{3})\]/)?.[1];
  if (m.includes("isn't connected")) return { what: "The shared Canva account isn't connected.", next: "An admin connects it on Admin → Canva." };
  if (m.includes("ai label")) return { what: "Hidden AI labels couldn't be removed, so the picture wasn't published.", next: "Re-export from Canva or tell the team; the old picture stays live." };
  if (m.includes("not found in the shared")) return { what: "This design isn't in the shared Canva account (deleted, or owned by someone else).", next: "Share it into the San Juan Bowl folder, or ignore it." };
  if (m.includes("design check failed") && (code === "429" || m.includes("rate") || m.includes("limit"))) return { what: "Canva asked us to slow down while checking.", next: "Wait a few minutes, then check again; nothing was changed." };
  if (code === "429" || m.includes("rate") || m.includes("quota") || m.includes("limit")) return { what: "Canva's daily download allowance is used up.", next: "Try again tomorrow; nothing was changed." };
  if (code === "401" || m.includes("invalid_grant") || m.includes("refresh")) return { what: "Canva sign-in for the shared account has expired.", next: "An admin reconnects on Admin → Canva." };
  if (code === "403") return { what: "Canva didn't allow this download.", next: "An admin reconnects on Admin → Canva and approves picture downloads." };
  if (code && code.startsWith("5")) return { what: "Canva had a temporary problem.", next: "Try again in a few minutes." };
  if (m.includes("did not finish")) return { what: "Canva didn't finish making the picture in time.", next: "Try this design again." };
  if (m.includes("verification")) return { what: "The new picture was saved but didn't pass the after-update check, so it isn't counted as live.", next: "Try this design again." };
  if (m.includes("failed to fetch") || m.includes("network")) return { what: "The connection dropped before Canva answered.", next: "Check your internet and try again." };
  if (m.includes("only admins")) return { what: "Only admins can update pictures from Canva.", next: "Sign in with an admin account." };
  return { what: "Something unexpected went wrong.", next: "Try again; if it repeats, share the detail below with the team." };
}

// Turns raw Canva / storage failures into a plain explanation plus the next step.
export interface SyncProblem { what: string; next: string }

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

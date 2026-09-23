// Which saved version each open deck editor is working from.
//
// Deck saves are guarded against overwriting someone else's work, and the guard
// needs the `updated_at` the editor last saw. That stamp is set when a deck is
// opened from the account and refreshed after every successful save. It is
// deliberately in-memory only: a stale stamp from a previous session would be
// worse than no stamp, because it would refuse saves that are perfectly safe.

const stamps = new Map<string, string>();

/** Record the saved version a local deck id is now in step with. */
export function setDeckStamp(localDeckId: string, updatedAt: string | null | undefined) {
  if (!localDeckId) return;
  if (updatedAt) stamps.set(localDeckId, updatedAt);
  else stamps.delete(localDeckId);
}

/** The saved version this editor believes it holds, if known. */
export function getDeckStamp(localDeckId: string): string | undefined {
  return stamps.get(localDeckId);
}

export function clearDeckStamp(localDeckId: string) {
  stamps.delete(localDeckId);
}

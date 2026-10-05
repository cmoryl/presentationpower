// Saved-version checkpoints for shared master decks.
//
// Masters are edited through autosave, which never recorded a version, so a
// master had no history to roll back to. Before a save overwrites a master,
// the state it is about to replace is kept as a version — at most one every
// CHECKPOINT_GAP_MS so a burst of autosaves doesn't fill the history with
// near-identical copies. Version pruning (deck-versions.functions.ts) always
// leaves at least MIN_MASTER_VERSIONS behind.

export const CHECKPOINT_GAP_MS = 10 * 60 * 1000;
export const MIN_MASTER_VERSIONS = 3;

/** True when a new checkpoint is due, given the newest version's timestamp. */
export function checkpointDue(lastCreatedAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastCreatedAt) return true;
  const t = new Date(lastCreatedAt).getTime();
  return !Number.isFinite(t) || now - t >= CHECKPOINT_GAP_MS;
}

type Sb = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (t: string) => any;
};

/** Record the master's current saved state as a version, if one is due. Never throws. */
export async function checkpointMaster(supabase: unknown, deckUuid: string, userId: string): Promise<void> {
  const sb = supabase as Sb;
  try {
    const { data: last } = await sb
      .from("deck_versions")
      .select("version_number, created_at")
      .eq("deck_id", deckUuid)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!checkpointDue(last?.created_at)) return;
    const { data: deck } = await sb.from("decks").select("*").eq("id", deckUuid).maybeSingle();
    if (!deck) return;
    const { data: slides } = await sb
      .from("deck_slides")
      .select("*")
      .eq("deck_id", deckUuid)
      .order("position", { ascending: true });
    if (!slides || slides.length === 0) return;
    await sb.from("deck_versions").insert({
      deck_id: deckUuid,
      version_number: (last?.version_number ?? 0) + 1,
      snapshot: { deck, slides, brief: null },
      change_summary: "Saved master (before edits)",
      created_by: userId,
    });
  } catch {
    // A missing checkpoint must not block the save itself.
  }
}

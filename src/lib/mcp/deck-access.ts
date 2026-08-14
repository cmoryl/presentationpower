// Shared deck/slide access helpers for the MCP tools. Every query runs through
// the caller-scoped Supabase client, so RLS decides what is visible.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SlideContent } from "@/lib/slide-ops";

export type SlideRow = {
  id: string;
  deck_id: string;
  position: number;
  section_id: string | null;
  variant_id: string;
  layout_id: string;
  notes: string | null;
  content: SlideContent;
};

const SLIDE_COLS = "id, deck_id, position, section_id, variant_id, layout_id, notes, content";

/** Load one slide of a deck by 0-based position. */
export async function loadSlide(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  deckId: string,
  position: number,
): Promise<{ ok: true; slide: SlideRow } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("deck_slides")
    .select(SLIDE_COLS)
    .eq("deck_id", deckId)
    .eq("position", position)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: `No slide at position ${position} in deck ${deckId}` };
  const row = data as unknown as SlideRow;
  return {
    ok: true,
    slide: { ...row, content: (row.content ?? {}) as SlideContent },
  };
}

/** Load every slide of a deck in presentation order. */
export async function loadSlides(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  deckId: string,
): Promise<{ ok: true; slides: SlideRow[] } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("deck_slides")
    .select(SLIDE_COLS)
    .eq("deck_id", deckId)
    .order("position", { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, slides: ((data ?? []) as unknown as SlideRow[]) };
}

/** Touch the deck so the app's lists and version history see the change. */
export async function touchDeck(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  deckId: string,
): Promise<void> {
  await supabase
    .from("decks")
    .update({ updated_at: new Date().toISOString() } as never)
    .eq("id", deckId);
}

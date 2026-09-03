// Client side of the AI copy-fit pass: find the QA warnings whose only clean
// fix is tighter phrasing (title/body over the variant's char cap), send them
// to the server rewrite function, and apply the returned copy through the
// normal deck-store actions so history/undo keep working.

import { runQa } from "./qa";
import { MODULE_VARIANTS, byId } from "./taxonomy";
import type { Deck } from "./deck-store";
import { useDeckStore } from "./deck-store";
import { rewriteForCharCaps } from "./qa-ai-fix.functions";

export interface CopyFitTask {
  slideId: string;
  /** "title" or an items index like "items[2].body". */
  field: string;
  text: string;
  maxChars: number;
}

/** Fields still over their char cap after the deterministic auto-fix pass. */
export function collectCopyFitTasks(deck: Deck): CopyFitTask[] {
  const issues = runQa(deck.slides, deck.brandModeId);
  const tasks: CopyFitTask[] = [];
  for (const issue of issues) {
    if (issue.code !== "title-too-long" && issue.code !== "body-too-long") continue;
    const slide = deck.slides.find((s) => s.id === issue.slideId);
    if (!slide) continue;
    const variant = byId(MODULE_VARIANTS, slide.variantId);
    if (!variant) continue;

    if (issue.code === "title-too-long" && variant.capacity.titleChars) {
      const t = slide.content.title;
      if (typeof t === "string" && t.length > variant.capacity.titleChars) {
        tasks.push({
          slideId: slide.id,
          field: "title",
          text: t,
          maxChars: variant.capacity.titleChars,
        });
      }
    }

    if (issue.code === "body-too-long" && variant.capacity.bodyChars) {
      const cap = variant.capacity.bodyChars;
      const items = Array.isArray(slide.content.items)
        ? (slide.content.items as Array<Record<string, unknown>>)
        : [];
      items.forEach((it, i) => {
        const key = typeof it.body === "string" ? "body" : "description";
        const b = it[key];
        if (typeof b === "string" && b.length > cap) {
          tasks.push({ slideId: slide.id, field: `items[${i}].${key}`, text: b, maxChars: cap });
        }
      });
    }
  }
  return tasks;
}

/** Rewrite + apply. Returns the number of fields updated. */
export async function applyAiCopyFit(deckId: string, deck: Deck): Promise<number> {
  const tasks = collectCopyFitTasks(deck);
  if (tasks.length === 0) return 0;
  const { items } = await rewriteForCharCaps({ data: { items: tasks } });
  const store = useDeckStore.getState();

  // Group item-body edits per slide so each items array is written once.
  const bodyEdits = new Map<string, Map<number, { key: string; text: string }>>();
  let applied = 0;

  for (const fix of items) {
    if (fix.field === "title") {
      store.updateSlideField(deckId, fix.slideId, "title", fix.text);
      applied += 1;
      continue;
    }
    const m = /^items\[(\d+)\]\.(body|description)$/.exec(fix.field);
    if (!m) continue;
    const idx = Number(m[1]);
    if (!bodyEdits.has(fix.slideId)) bodyEdits.set(fix.slideId, new Map());
    bodyEdits.get(fix.slideId)!.set(idx, { key: m[2]!, text: fix.text });
  }

  for (const [slideId, edits] of bodyEdits) {
    const slide = useDeckStore.getState().decks[deckId]?.slides.find((s) => s.id === slideId);
    if (!slide || !Array.isArray(slide.content.items)) continue;
    const nextItems = (slide.content.items as Array<Record<string, unknown>>).map((it, i) => {
      const edit = edits.get(i);
      return edit ? { ...it, [edit.key]: edit.text } : it;
    });
    store.updateSlideField(deckId, slideId, "items", nextItems);
    applied += edits.size;
  }

  return applied;
}

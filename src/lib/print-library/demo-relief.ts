// MEASURED RELIEF LADDER (approved print demos)
// ---------------------------------------------------------------------------
// `approvePrintDemoContent` normalizes a demo against the *predictive* capacity
// model, and the content-fit frame recovers space by pulling margins and
// shrinking type. Both can still land short: the capacity model estimates
// weights, and the fit knobs bottom out at their readability floors. A demo
// that is 30% over its trim therefore still clipped on first paint.
//
// This module supplies the last stage: a deterministic, purely content-side
// relief ladder driven by MEASURED overflow. The renderer walks one step at a
// time until the page measures clean, so an approved demo always shows a fully
// laid-out page with no clipped module — never a partially cut story.
//
// The ladder is ordered least-destructive first:
//   1-2. slim the hero band (photo real estate is the cheapest space)
//   3-4. tighten body copy (two progressively tighter ceilings)
//   5+.  shed the least essential supporting module (logos → devices → quotes
//        → expertise → stats), keeping the narrative spine and the CTA
//
// Pure and idempotent: step 0 returns the same object identity.

import type { PrintAssetKind, PrintHeroMedia, PrintSection } from "@/lib/print-assets.types";

import { shedLeastEssential, tighten } from "./demo-approve";

/** How many relief steps a renderer may walk before it stops trying. */
export const DEMO_RELIEF_MAX_STEPS = 9;

/** Overflow fraction a demo page is allowed to keep (≈1% of the trim). */
export const DEMO_RELIEF_TOLERANCE = 0.012;

type Bag = Record<string, unknown>;

/** Hero band heights for the first two steps (percent of page height). */
const HERO_LADDER = [34, 26];

/** Copy ceilings for the two tightening steps. */
const COPY_LADDER: Array<Record<string, number>> = [
  { summary: 150, intro: 140, note: 320, body: 210, quote: 220, block: 340 },
  { summary: 110, intro: 100, note: 220, body: 130, quote: 150, block: 240 },
];

function tightenItems(section: PrintSection, max: number): PrintSection {
  const bag = section as PrintSection & Bag;
  const items = bag["items"];
  if (!Array.isArray(items)) return section;
  let touched = false;
  const next = items.map((it) => {
    if (!it || typeof it !== "object") return it;
    const rec = it as Bag;
    const body = rec["body"];
    if (typeof body !== "string" || body.length <= max) return it;
    touched = true;
    return { ...rec, body: tighten(body, max) };
  });
  return touched ? ({ ...bag, items: next } as PrintSection) : section;
}

function tightenSection(section: PrintSection, caps: Record<string, number>): PrintSection {
  let next = tightenItems(section, caps["body"]!);
  const bag = next as PrintSection & Bag;
  const text = bag["text"];
  if (typeof text === "string" && text.length > caps["quote"]!) {
    next = { ...bag, text: tighten(text, caps["quote"]!) } as PrintSection;
  }
  return next;
}

function tightenTopCopy(bag: Bag, caps: Record<string, number>): Bag {
  let next = bag;
  const set = (key: string, value: unknown) => {
    next = { ...next, [key]: value };
  };
  for (const key of ["summary", "tagline", "subtitle"]) {
    const v = next[key];
    if (typeof v === "string" && v.length > caps["summary"]!) set(key, tighten(v, caps["summary"]!));
  }
  for (const key of ["intro"]) {
    const v = next[key];
    if (typeof v === "string" && v.length > caps["intro"]!) set(key, tighten(v, caps["intro"]!));
  }
  for (const key of ["note", "timelineNote", "costNote"]) {
    const v = next[key];
    if (typeof v === "string" && v.length > caps["note"]!) set(key, tighten(v, caps["note"]!));
  }
  for (const key of ["challenge", "solution", "result"]) {
    const block = next[key];
    if (block && typeof block === "object") {
      const body = (block as Bag)["body"];
      if (typeof body === "string" && body.length > caps["block"]!) {
        set(key, { ...(block as Bag), body: tighten(body, caps["block"]!) });
      }
    }
  }
  const quote = next["quote"];
  if (quote && typeof quote === "object") {
    const text = (quote as Bag)["text"];
    if (typeof text === "string" && text.length > caps["quote"]!) {
      set("quote", { ...(quote as Bag), text: tighten(text, caps["quote"]!) });
    }
  }
  return next;
}

/**
 * Apply `step` relief steps to already-approved demo content. Step 0 is a
 * no-op (same object identity), so callers can render the authored piece first
 * and only walk the ladder when the DOM actually measures overflow.
 */
export function relievePrintDemoContent<T>(_kind: PrintAssetKind, content: T, step: number): T {
  if (step <= 0 || !content || typeof content !== "object") return content;
  const steps = Math.min(step, DEMO_RELIEF_MAX_STEPS);
  let bag = { ...(content as unknown as Bag) };

  // 1-2 — slim the hero band.
  const hero = bag["heroMedia"] as PrintHeroMedia | undefined;
  if (hero?.imageUrl) {
    const target = HERO_LADDER[Math.min(steps, HERO_LADDER.length) - 1];
    const current = Math.round(hero.heightPct ?? 46);
    if (typeof target === "number" && current > target) {
      bag["heroMedia"] = { ...hero, heightPct: target };
    }
  }

  // 3-4 — tighten copy, top-level and per module.
  const copyStep = Math.min(Math.max(steps - HERO_LADDER.length, 0), COPY_LADDER.length);
  if (copyStep > 0) {
    const caps = COPY_LADDER[copyStep - 1]!;
    bag = tightenTopCopy(bag, caps);
    const modules = bag["modules"];
    if (Array.isArray(modules)) {
      bag["modules"] = (modules as PrintSection[]).map((m) => tightenSection(m, caps));
    }
  }

  // 5+ — shed supporting modules one at a time.
  const shedCount = Math.max(steps - HERO_LADDER.length - COPY_LADDER.length, 0);
  if (shedCount > 0) {
    const modules = bag["modules"];
    if (Array.isArray(modules)) {
      let list = modules as PrintSection[];
      for (let i = 0; i < shedCount; i += 1) list = shedLeastEssential(list);
      bag["modules"] = list;
    }
  }

  return bag as unknown as T;
}

/** Human-readable note for the studio panel / audit readout. */
export function describeRelief(step: number): string {
  if (step <= 0) return "as authored";
  if (step <= HERO_LADDER.length) return "hero band slimmed to clear the trim";
  if (step <= HERO_LADDER.length + COPY_LADDER.length) return "body copy tightened to clear the trim";
  const shed = step - HERO_LADDER.length - COPY_LADDER.length;
  return `${shed} supporting module${shed === 1 ? "" : "s"} held back to clear the trim`;
}

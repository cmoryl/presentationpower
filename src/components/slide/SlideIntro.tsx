import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  INTRO_EASE,
  introBeatDelay,
  introRecipeFor,
  orderIntroItems,
  type IntroRecipe,
} from "@/lib/slide-intro";

/** Slide canvas area (1920x1080) used for the block-size heuristic. */
const SLIDE_AREA = 1920 * 1080;
const MIN_SHARE = 0.006;
const MAX_SHARE = 0.45;
const MAX_ITEMS = 18;

type Block = { el: HTMLElement; x: number; y: number; w: number };

/**
 * Collect the visually meaningful content blocks inside the slide. Walks the
 * tree breadth-first and stops descending as soon as a node is large enough to
 * count as a block, so a card animates as one unit instead of exploding into
 * its individual text runs.
 */
function collectBlocks(root: HTMLElement): Block[] {
  const tagged = Array.from(root.querySelectorAll<HTMLElement>("[data-intro-item]"));
  const rootRect = root.getBoundingClientRect();
  const scale = rootRect.width > 0 ? 1920 / rootRect.width : 1;
  const toBlock = (el: HTMLElement): Block => {
    const r = el.getBoundingClientRect();
    return {
      el,
      x: (r.left - rootRect.left) * scale,
      y: (r.top - rootRect.top) * scale,
      w: r.width * scale,
    };
  };
  if (tagged.length) return tagged.slice(0, MAX_ITEMS).map(toBlock);

  const out: Block[] = [];
  const queue: HTMLElement[] = Array.from(root.children) as HTMLElement[];
  while (queue.length && out.length < MAX_ITEMS) {
    const el = queue.shift()!;
    if (!(el instanceof HTMLElement)) continue;
    const r = el.getBoundingClientRect();
    // Zero-size wrappers (contents-only or absolutely-positioned parents)
    // carry the real blocks, so descend instead of dropping the subtree.
    if (r.width <= 0 || r.height <= 0) {
      queue.push(...(Array.from(el.children) as HTMLElement[]));
      continue;
    }
    const share = ((r.width * scale) * (r.height * scale)) / SLIDE_AREA;
    // Skip decorative full-bleed grounds and absolutely-positioned washes.
    const decorative = el.dataset.slideGround != null || el.getAttribute("aria-hidden") === "true";
    if (share >= MIN_SHARE && share <= MAX_SHARE && !decorative) {
      out.push(toBlock(el));
      continue;
    }
    queue.push(...(Array.from(el.children) as HTMLElement[]));
  }
  return out;
}

function applyIntro(root: HTMLElement, recipe: IntroRecipe) {
  const blocks = orderIntroItems(collectBlocks(root), recipe.order);
  const mid = 960;
  // Beats first: pinned steps let several elements share one beat, so the beat
  // count (not the element count) drives how much the stagger is compressed.
  const beats = blocks.map((b, i) => {
    const pinned = Number(b.el.dataset.introStep);
    return Number.isFinite(pinned) && pinned >= 0 ? pinned : i;
  });
  const beatCount = beats.length ? Math.max(...beats) + 1 : 1;
  blocks.forEach((b, i) => {
    const kf =
      recipe.split && b.x + b.w / 2 < mid
        ? "tp-in-left"
        : recipe.split
          ? "tp-in-right"
          : recipe.keyframe;
    // will-change promotes the layer BEFORE the delay elapses, so the first
    // frame of every beat is already on the compositor — this is what removes
    // the tiny hitch at the start of each move on big 1920x1080 tiles.
    b.el.style.willChange = "transform, opacity";
    b.el.style.backfaceVisibility = "hidden";
    b.el.style.animation = `${kf} ${recipe.durationMs}ms ${INTRO_EASE} ${introBeatDelay(
      recipe,
      beats[i],
      beatCount,
    )}ms both`;
    // Drop the layer hint once the item has landed: leaving will-change on
    // dozens of promoted tiles is what makes a settled slide feel heavy.
    b.el.addEventListener(
      "animationend",
      () => {
        b.el.style.willChange = "";
        b.el.style.backfaceVisibility = "";
      },
      { once: true },
    );
  });
  root.dataset.introApplied = String(blocks.length);
  return blocks.map((b) => b.el);
}

/**
 * Plays a layout-aware entrance choreography over the wrapped slide. Every
 * module gets one (recipe picked from the variant id), and it replays whenever
 * `replayKey` changes. Reduced-motion users get the finished state instantly.
 */
export function SlideIntro({
  variantId,
  replayKey,
  enabled = true,
  children,
}: {
  variantId: string;
  replayKey: string | number;
  enabled?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (!enabled || reduced) return;
    // Never animate inside the offscreen export stage: the rasterizer must
    // capture the settled slide, not a frame mid-cascade.
    if (root.closest("[data-exact-slide-stage]")) return;
    let touched: HTMLElement[] = [];
    // Wait for layout (fonts, images, container queries) before measuring.
    const raf = requestAnimationFrame(() => {
      touched = applyIntro(root, introRecipeFor(variantId));
    });
    return () => {
      cancelAnimationFrame(raf);
      for (const el of touched) el.style.animation = "";
    };
  }, [variantId, replayKey, enabled, reduced]);

  return (
    <div ref={ref} data-slide-intro={variantId} className="h-full w-full">
      {children}
    </div>
  );
}

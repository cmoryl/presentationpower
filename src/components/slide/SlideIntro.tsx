import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  ARC_DRAW_MS,
  ARC_EASE,
  ARC_MIN_DASH_PX,
  ARC_STEP_MS,
  HERO_STAT_DOMINANCE,
  HERO_STAT_EASE,
  HERO_STAT_MAX,
  HERO_STAT_MIN_PX,
  HERO_STAT_MS,
  HERO_STAT_OFFSET_MS,
  HERO_STAT_RECIPES,
  HERO_STAT_STEP_MS,
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

type ArcTarget = SVGCircleElement | SVGPathElement | SVGEllipseElement;

/**
 * Find the value-carrying arcs of any circular figure — donut segments, gauge
 * sweeps, dial progress, orbit rings. They are recognised by their dash
 * pattern: a two-part `stroke-dasharray` whose visible segment is long enough
 * to be a measurement rather than a dashed hairline. Authors can force or
 * suppress an element with `data-intro-arc="on" | "off"`.
 */
function collectArcs(root: HTMLElement): Array<{ el: ArcTarget; from: string; to: string }> {
  const out: Array<{ el: ArcTarget; from: string; to: string }> = [];
  const nodes = root.querySelectorAll<ArcTarget>("circle, path, ellipse");
  for (const el of Array.from(nodes)) {
    const flag = el.dataset.introArc;
    if (flag === "off") continue;
    const raw = el.getAttribute("stroke-dasharray");
    if (!raw) continue;
    const parts = raw.trim().split(/[\s,]+/).map(Number);
    if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n))) continue;
    if (flag !== "on" && parts[0]! < ARC_MIN_DASH_PX) continue;
    // Grow the visible segment from nothing to its authored length, holding the
    // period constant so the arc sweeps from its own start point.
    out.push({ el, from: `0 ${parts[0]! + parts[1]!}`, to: `${parts[0]} ${parts[1]}` });
    if (out.length >= 12) break;
  }
  return out;
}

/** Draw every ring in the figure on, trailing each other slightly. */
function applyArcDraw(root: HTMLElement, recipe: IntroRecipe) {
  const arcs = collectArcs(root);
  arcs.forEach(({ el, from, to }, i) => {
    el.style.setProperty("--tp-arc-from", from);
    el.style.setProperty("--tp-arc-to", to);
    el.style.animation = `tp-arc-draw ${ARC_DRAW_MS}ms ${ARC_EASE} ${
      recipe.leadMs + i * ARC_STEP_MS
    }ms both`;
    // Hand the property back to the element's own attribute once settled, so
    // the resting ring is the static design — not an animation fill state.
    el.addEventListener(
      "animationend",
      () => {
        el.style.animation = "";
        el.style.removeProperty("--tp-arc-from");
        el.style.removeProperty("--tp-arc-to");
      },
      { once: true },
    );
  });
  return arcs.map((a) => a.el);
}

/**
 * Find the headline statistic(s) on a figure-led slide. Preference order:
 * explicitly marked stat values (`data-stat-value="figure"`, or an author
 * override with `data-hero-stat`), else the largest leaf text run that reads as
 * a number. Sizes are measured in slide space (1920px) so the threshold means
 * the same thing at any preview scale. Everything within `HERO_STAT_DOMINANCE`
 * of the biggest figure is treated as a peer, so stat walls emphasise each
 * figure in turn instead of picking one arbitrarily.
 */
function collectHeroStats(root: HTMLElement): HTMLElement[] {
  const rootRect = root.getBoundingClientRect();
  const scale = rootRect.width > 0 ? 1920 / rootRect.width : 1;
  const forced = Array.from(root.querySelectorAll<HTMLElement>('[data-hero-stat="on"]'));
  if (forced.length) return forced.slice(0, HERO_STAT_MAX);

  let pool = Array.from(root.querySelectorAll<HTMLElement>('[data-stat-value="figure"]'));
  if (!pool.length) {
    pool = Array.from(root.querySelectorAll<HTMLElement>("div, span, p, strong, h1, h2, h3")).filter(
      (el) => {
        if (el.dataset.heroStat === "off" || el.dataset.decorative != null) return false;
        if (el.getAttribute("aria-hidden") === "true") return false;
        if (el.querySelector("*")) return false; // leaf text runs only
        const text = (el.textContent || "").trim();
        return text.length > 0 && text.length <= 14 && /\d/.test(text);
      },
    );
  }
  const sized = pool
    .filter((el) => el.dataset.heroStat !== "off")
    .map((el) => ({ el, px: parseFloat(getComputedStyle(el).fontSize || "0") * scale }))
    .filter((s) => s.px >= HERO_STAT_MIN_PX)
    .sort((a, b) => b.px - a.px);
  if (!sized.length) return [];
  const top = sized[0]!.px;
  return sized
    .filter((s) => s.px >= top / HERO_STAT_DOMINANCE)
    .slice(0, HERO_STAT_MAX)
    .map((s) => s.el);
}

/**
 * Give the headline figure(s) their own emphasis beat, timed just after the
 * block they live in starts landing. The swell ends on the element's authored
 * size, so nothing about the resting design changes.
 */
function applyHeroStats(root: HTMLElement, recipe: IntroRecipe) {
  if (!HERO_STAT_RECIPES.has(recipe.id)) return [];
  const stats = collectHeroStats(root);
  stats.forEach((el, i) => {
    const host = el.closest<HTMLElement>("[data-intro-delay]");
    const base = Number(host?.dataset.introDelay ?? recipe.leadMs) || recipe.leadMs;
    const align = getComputedStyle(el).textAlign;
    el.style.transformOrigin = align === "center" ? "50% 50%" : align === "right" ? "100% 50%" : "0% 50%";
    el.style.willChange = "transform, opacity, filter";
    el.style.backfaceVisibility = "hidden";
    el.style.animation = `tp-stat-hero ${HERO_STAT_MS}ms ${HERO_STAT_EASE} ${
      base + HERO_STAT_OFFSET_MS + i * HERO_STAT_STEP_MS
    }ms both`;
    el.addEventListener(
      "animationend",
      () => {
        el.style.animation = "";
        el.style.willChange = "";
        el.style.backfaceVisibility = "";
        el.style.transformOrigin = "";
      },
      { once: true },
    );
  });
  return stats;
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
    // Orbit satellites travel outward along their own radius from the hub, so
    // the direction of the move is measured per element rather than guessed.
    if (kf === "tp-in-orbit") {
      const dx = mid - (b.x + b.w / 2);
      const dy = 540 - b.y;
      const len = Math.hypot(dx, dy) || 1;
      const push = Math.min(72, len * 0.22);
      b.el.style.setProperty("--tp-ox", `${((dx / len) * push).toFixed(1)}px`);
      b.el.style.setProperty("--tp-oy", `${((dy / len) * push).toFixed(1)}px`);
    }
    b.el.style.willChange = "transform, opacity";
    b.el.style.backfaceVisibility = "hidden";
    const delay = introBeatDelay(recipe, beats[i], beatCount);
    // Published so a nested emphasis beat (headline stat) can chase its own
    // container instead of guessing the cascade timing.
    b.el.dataset.introDelay = String(delay);
    b.el.style.animation = `${kf} ${recipe.durationMs}ms ${INTRO_EASE} ${delay}ms both`;
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
    let arcs: ArcTarget[] = [];
    // Wait for layout (fonts, images, container queries) before measuring.
    const raf = requestAnimationFrame(() => {
      const recipe = introRecipeFor(variantId);
      touched = applyIntro(root, recipe);
      arcs = applyArcDraw(root, recipe);
    });
    return () => {
      cancelAnimationFrame(raf);
      for (const el of touched) el.style.animation = "";
      for (const el of arcs) {
        el.style.animation = "";
        el.style.removeProperty("--tp-arc-from");
        el.style.removeProperty("--tp-arc-to");
      }
    };
  }, [variantId, replayKey, enabled, reduced]);

  return (
    <div ref={ref} data-slide-intro={variantId} className="h-full w-full">
      {children}
    </div>
  );
}

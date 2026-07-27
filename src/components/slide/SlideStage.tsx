import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ScaledSlide } from "./ScaledSlide";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { SlideTransition, TransitionType } from "@/lib/deck-store";

/**
 * SlideStage — the shared transition wrapper for presentation surfaces
 * (present mode + share mode's presenting overlay).
 *
 * Owns the outgoing → incoming crossfade / push / zoom animation. Both
 * layers wrap a ScaledSlide so the 1920×1080 scale transform is preserved
 * — the transition composes on an OUTER wrapper that only touches
 * transform: translate/scale and opacity (GPU-compositable, no layout).
 *
 * Reduced motion → instant swap, no outgoing layer, regardless of type.
 * "cut" and "none" are also instant swaps.
 */

export type Direction = "forward" | "back";

type Props = {
  slideKey: string;
  direction: Direction;
  transition: SlideTransition;
  children: ReactNode;
};

type LayerState = {
  key: string;
  node: ReactNode;
} | null;

function isInstant(type: TransitionType): boolean {
  return type === "cut" || type === "none";
}

function enterPose(type: TransitionType, direction: Direction): CSSProperties {
  switch (type) {
    case "fade":
      return { opacity: 0 };
    case "zoom":
      return { opacity: 0, transform: "scale(0.92)" };
    case "push-left":
      return {
        transform: `translateX(${direction === "forward" ? "100%" : "-100%"})`,
      };
    case "push-right":
      return {
        transform: `translateX(${direction === "forward" ? "-100%" : "100%"})`,
      };
    default:
      return {};
  }
}

function currentPose(): CSSProperties {
  return { opacity: 1, transform: "translateX(0) scale(1)" };
}

function exitPose(type: TransitionType, direction: Direction): CSSProperties {
  switch (type) {
    case "fade":
      return { opacity: 0 };
    case "zoom":
      return { opacity: 0, transform: "scale(1.04)" };
    case "push-left":
      return {
        transform: `translateX(${direction === "forward" ? "-100%" : "100%"})`,
      };
    case "push-right":
      return {
        transform: `translateX(${direction === "forward" ? "100%" : "-100%"})`,
      };
    default:
      return {};
  }
}

export function SlideStage({ slideKey, direction, transition, children }: Props) {
  const reduced = useReducedMotion();
  const [current, setCurrent] = useState<LayerState>({ key: slideKey, node: children });
  const [previous, setPrevious] = useState<LayerState>(null);
  const [animating, setAnimating] = useState(false);
  const [activeDirection, setActiveDirection] = useState<Direction>(direction);
  const [activeType, setActiveType] = useState<TransitionType>(transition.type);
  const [durationMs, setDurationMs] = useState<number>(transition.durationMs ?? 400);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Track the latest node for the current key so live edits inside a slide
  // (content changes without slideKey change) keep flowing through.
  useEffect(() => {
    if (current && current.key === slideKey) {
      setCurrent({ key: slideKey, node: children });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  useEffect(() => {
    if (!current || current.key === slideKey) return;

    const type: TransitionType = reduced ? "cut" : transition.type;
    const dur = reduced ? 0 : (transition.durationMs ?? 400);

    if (isInstant(type) || dur <= 0) {
      setPrevious(null);
      setAnimating(false);
      setCurrent({ key: slideKey, node: children });
      return;
    }

    setActiveDirection(direction);
    setActiveType(type);
    setDurationMs(dur);
    setPrevious(current);
    setCurrent({ key: slideKey, node: children });
    setAnimating(false);

    // Two rAFs ensure the initial pose paints before we flip to the target
    // pose — otherwise the browser collapses the transition.
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => setAnimating(true));
    });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPrevious(null);
      setAnimating(false);
    }, dur + 40);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideKey]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const transitionCss = `transform ${durationMs}ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity ${durationMs}ms cubic-bezier(0.22, 0.61, 0.36, 1)`;

  const currentStyle: CSSProperties = previous
    ? animating
      ? { ...currentPose(), transition: transitionCss }
      : { ...enterPose(activeType, activeDirection), transition: transitionCss }
    : { ...currentPose() };

  const previousStyle: CSSProperties = animating
    ? { ...exitPose(activeType, activeDirection), transition: transitionCss }
    : { ...currentPose(), transition: transitionCss };

  return (
    <div className="relative h-full w-full overflow-hidden" data-slide-stage-root="">
      {previous && (
        <div
          key={`prev-${previous.key}`}
          data-slidestage-layer="previous"
          className="absolute inset-0 will-change-transform"
          style={previousStyle}
          aria-hidden="true"
        >
          <ScaledSlide>{previous.node}</ScaledSlide>
        </div>
      )}
      <div
        key={`cur-${current?.key ?? "empty"}`}
        data-slidestage-layer="current"
        className="absolute inset-0 will-change-transform"
        style={currentStyle}
      >
        {current && <ScaledSlide>{current.node}</ScaledSlide>}
      </div>
    </div>
  );
}

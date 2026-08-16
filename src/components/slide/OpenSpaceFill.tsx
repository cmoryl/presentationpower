// Open-space auto-fill provider.
//
// Wraps every module render (see VariantRenderer) and publishes the fill scale
// both as React context (so components that size things in JS — charts, media
// blocks — can read it) and as CSS custom properties on the slide frame (so the
// shared typographic primitives can multiply their authored px sizes).
//
// A client-only guard then verifies the result: if the grown page actually
// overflows its 1920×1080 sheet, the scale is relaxed one step at a time until
// it fits. Growth can therefore never crowd a slide, and the deterministic
// starting point keeps screen and PPTX export in agreement.
import * as React from "react";
import {
  NEUTRAL_FILL,
  clampFill,
  computeFill,
  fillCssVars,
  relaxFill,
  type FillFamily,
  type FillScale,
} from "@/lib/open-space-fill";

type FillContextValue = FillScale & {
  load: number;
  family: FillFamily;
  /** False when the slide opted out (thumbnails, canvas blocks, off switch). */
  active: boolean;
  /** Overflow-guard step, 0 = full growth. */
  relaxStep: number;
  /** Called by the guard host to report measured overflow. */
  reportOverflow: (overflowing: boolean) => void;
};

const NEUTRAL_CONTEXT: FillContextValue = {
  ...NEUTRAL_FILL,
  load: 0,
  family: "content",
  active: false,
  relaxStep: 0,
  reportOverflow: () => {},
};

const OpenSpaceFillContext = React.createContext<FillContextValue>(NEUTRAL_CONTEXT);

/** Read the active fill scale. Always safe — defaults to the authored scale. */
export function useOpenSpaceFill(): FillContextValue {
  return React.useContext(OpenSpaceFillContext);
}

/** CSS vars for the active scale, spread into a slide frame's style object. */
export function useFillCssVars(): Record<string, string> {
  const fill = useOpenSpaceFill();
  if (!fill.active) return {};
  return fillCssVars(fill);
}

const STEPS = [0, 0.34, 0.67, 1];

export function OpenSpaceFillProvider({
  content,
  variantId,
  density,
  scaleOverride,
  enabled = true,
  children,
}: {
  content: unknown;
  variantId?: string | null;
  density?: number;
  /**
   * Per-axis multipliers applied on top of the computed scale — this is how a
   * per-slide template override ("give this KPI figure more voice") reaches the
   * type: it rides the same clamped pipeline, so `clampFill` and the readability
   * bounds in `fillPx` still hold.
   */
  scaleOverride?: Partial<Record<keyof FillScale, number>> | null;
  enabled?: boolean;
  children: React.ReactNode;
}) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const overrideKey = React.useMemo(
    () => (scaleOverride ? JSON.stringify(scaleOverride) : ""),
    [scaleOverride],
  );
  const signature = React.useMemo(
    () => `${variantId ?? ""}:${JSON.stringify(content ?? {}).length}:${density ?? ""}:${overrideKey}`,
    [variantId, content, density, overrideKey],
  );
  // A new slide (or edited content) starts again at full growth.
  React.useEffect(() => setStepIndex(0), [signature]);

  const base = React.useMemo(
    () => computeFill({ content, variantId, density, enabled }),
    [content, variantId, density, enabled],
  );

  const value = React.useMemo<FillContextValue>(() => {
    const step = STEPS[Math.min(STEPS.length - 1, stepIndex)]!;
    const auto = enabled ? clampFill(relaxFill(base, step)) : NEUTRAL_FILL;
    // The override is an explicit author decision, so it is applied AFTER the
    // auto-fill caps and gets a wider band of its own (0.5–1.8). The absolute
    // readability floors/ceilings in `fillPx` still bound the rendered px, so a
    // deliberate boost can never make type illegible or billboard-sized.
    const scale = scaleOverride
      ? (Object.fromEntries(
          Object.entries(auto).map(([k, v]) => [
            k,
            typeof v === "number"
              ? Math.min(1.8, Math.max(0.5, v * (scaleOverride[k as keyof FillScale] ?? 1)))
              : v,
          ]),
        ) as FillScale)
      : auto;
    return {
      ...scale,
      load: base.load,
      family: base.family,
      active: enabled,
      relaxStep: step,
      reportOverflow: (overflowing: boolean) => {
        if (!overflowing) return;
        setStepIndex((i) => (i < STEPS.length - 1 ? i + 1 : i));
      },
    };
  }, [base, enabled, stepIndex, overrideKey, scaleOverride]);

  return (
    <OpenSpaceFillContext.Provider value={value}>{children}</OpenSpaceFillContext.Provider>
  );
}

/**
 * Attach to the slide frame root: measures the sheet after layout and asks the
 * provider to relax the scale while the content overflows. Cheap — it only runs
 * on layout changes and stops as soon as the page fits (or hits neutral).
 */
export function useOverflowGuard(ref: React.RefObject<HTMLElement | null>) {
  const { reportOverflow, relaxStep, active } = useOpenSpaceFill();
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !active || relaxStep >= 1) return;
    let raf = 0;
    const check = () => {
      // The frame is `overflow: hidden`, so scrollHeight/Width still report the
      // true content box. 6px of tolerance absorbs sub-pixel rounding.
      const overflowing =
        el.scrollHeight > el.clientHeight + 6 || el.scrollWidth > el.clientWidth + 6;
      if (overflowing) reportOverflow(true);
    };
    raf = requestAnimationFrame(() => {
      check();
      raf = requestAnimationFrame(check);
    });
    const obs = typeof ResizeObserver !== "undefined" ? new ResizeObserver(check) : null;
    obs?.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      obs?.disconnect();
    };
  }, [ref, active, relaxStep, reportOverflow]);
}

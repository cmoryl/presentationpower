// CONTENT-FIT FRAME
// ---------------------------------------------------------------------------
// Wraps a print page and drives the `--print-fit-scale` / `--print-fit-pad`
// variables from measured overflow. Purely presentational: content is never
// rewritten, so the fit travels into PDF/PNG exports (the vars are inline on a
// captured ancestor) and reverts the moment copy shrinks again.
//
// STABILITY CONTRACT (this is what stops the canvas flickering):
//   * `dep` is reduced to a string signature — an object identity that changes
//     every render must never reset the knobs.
//   * Our own knob writes change layout, which fires the ResizeObserver. Those
//     echoes are ignored inside a settle window, and a resize only restarts
//     fitting when the measured page geometry actually moved.
//   * `onChange` only fires when the knobs or the overflow bucket really
//     changed, so parents cannot be re-rendered in a loop.
//   * `override` pins a knob to a manual value and disables the auto ladder for
//     it, so author-chosen sizing is never fought by the measurement loop.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  NEUTRAL_FIT,
  fitStyleVars,
  nextFitStep,
  resolveContentFit,
  type PrintContentFitSettings,
  type PrintFitKnobs,
} from "@/lib/print-content-fit";
import { measurePrintPage, type PrintFitMeasurement } from "@/lib/print-fit-audit";

export type PrintFitOverride = { scale?: number; pad?: number };

/** Cheap, stable signature for an arbitrary dep value. */
function signature(dep: unknown): string {
  if (dep == null) return "none";
  if (typeof dep !== "object") return String(dep);
  try {
    const json = JSON.stringify(dep);
    let h = 0;
    for (let i = 0; i < json.length; i += 1) h = (h * 31 + json.charCodeAt(i)) | 0;
    return `${json.length}:${h}`;
  } catch {
    return "obj";
  }
}

function sameKnobs(a: PrintFitKnobs, b: PrintFitKnobs): boolean {
  return Math.abs(a.scale - b.scale) < 1e-4 && Math.abs(a.pad - b.pad) < 1e-4;
}

function applyOverride(k: PrintFitKnobs, o: PrintFitOverride | undefined): PrintFitKnobs {
  if (!o) return k;
  return {
    scale: typeof o.scale === "number" ? o.scale : k.scale,
    pad: typeof o.pad === "number" ? o.pad : k.pad,
  };
}

export function PrintContentFitFrame({
  settings,
  dep,
  override,
  onChange,
  onMeasure,
  children,
}: {
  settings?: Partial<PrintContentFitSettings>;
  /** Any value that should restart fitting (content, page size, density…). */
  dep?: unknown;
  /** Manual knob pins from the correction panel. */
  override?: PrintFitOverride;
  onChange?: (knobs: PrintFitKnobs, overflowFrac: number) => void;
  /** Latest live measurement of the page (quantised, so it is loop-safe). */
  onMeasure?: (m: PrintFitMeasurement) => void;
  children: ReactNode;
}) {
  const resolved = resolveContentFit(settings);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [knobs, setKnobs] = useState<PrintFitKnobs>(NEUTRAL_FIT);
  const knobsRef = useRef<PrintFitKnobs>(NEUTRAL_FIT);
  const cbRef = useRef(onChange);
  cbRef.current = onChange;
  const measureCbRef = useRef(onMeasure);
  measureCbRef.current = onMeasure;

  const depKey = useMemo(() => signature(dep), [dep]);
  const overrideKey = `${override?.scale ?? "a"}|${override?.pad ?? "a"}`;
  const key = `${resolved.enabled}|${resolved.threshold}|${resolved.minScale}|${resolved.minPad}|${resolved.marginRelief}|${overrideKey}`;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Start each convergence run from the manual pins (or neutral).
    const start = applyOverride(NEUTRAL_FIT, override);
    knobsRef.current = start;
    setKnobs(start);

    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let steps = 0;
    let settleUntil = 0;
    let lastGeom = "";
    let lastReport = "";

    const report = (m: PrintFitMeasurement) => {
      const sig = `${knobsRef.current.scale.toFixed(3)}|${knobsRef.current.pad.toFixed(3)}|${m.overflowPx}`;
      if (sig === lastReport) return;
      lastReport = sig;
      cbRef.current?.(knobsRef.current, m.overflowFrac);
      measureCbRef.current?.(m);
    };

    const tick = () => {
      if (cancelled) return;
      const m = measurePrintPage(host, knobsRef.current);
      if (!m) return;

      // Manual pins win: only auto-tune knobs the author has not pinned.
      const canScale = typeof override?.scale !== "number";
      const canPad = typeof override?.pad !== "number";
      const proposed = resolved.enabled
        ? nextFitStep(knobsRef.current, m.overflowFrac, resolved)
        : null;
      const next =
        proposed &&
        ((canScale && Math.abs(proposed.scale - knobsRef.current.scale) > 1e-6) ||
          (canPad && Math.abs(proposed.pad - knobsRef.current.pad) > 1e-6))
          ? applyOverride(proposed, override)
          : null;

      if (next && steps < 24 && !sameKnobs(next, knobsRef.current)) {
        steps += 1;
        knobsRef.current = next;
        setKnobs(next);
        // Our own write is about to resize the page — ignore that echo.
        settleUntil = Date.now() + 220;
        raf = requestAnimationFrame(tick);
        return;
      }

      settleUntil = Date.now() + 160;
      lastGeom = `${m.pageW}x${m.pageH}`;
      report(m);
    };

    const schedule = (fromObserver: boolean) => {
      if (fromObserver && Date.now() < settleUntil) return;
      if (fromObserver) {
        const page = host.querySelector<HTMLElement>("[data-print-page]");
        const geom = page ? `${Math.round(page.clientWidth)}x${Math.round(page.clientHeight)}` : "";
        // Layout echo from our own knob write: same page box, nothing to redo.
        if (geom && geom === lastGeom) return;
      }
      if (timer) clearTimeout(timer);
      cancelAnimationFrame(raf);
      timer = setTimeout(() => {
        steps = 0;
        raf = requestAnimationFrame(tick);
      }, fromObserver ? 120 : 0);
    };

    schedule(false);
    const ro =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => schedule(true));
    ro?.observe(host);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready?.then(() => schedule(false)).catch(() => {});

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey, key]);

  return (
    <div
      ref={hostRef}
      className="contents"
      data-print-fit={knobs.scale < 0.999 || knobs.pad < 0.999 ? "active" : "idle"}
      data-fit-scale={knobs.scale.toFixed(3)}
      data-fit-pad={knobs.pad.toFixed(3)}
      style={fitStyleVars(knobs) as React.CSSProperties}
    >
      {children}
    </div>
  );
}

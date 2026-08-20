// CONTENT-FIT FRAME
// ---------------------------------------------------------------------------
// Wraps a print page and drives the `--print-fit-scale` / `--print-fit-pad`
// variables from measured overflow. Purely presentational: content is never
// rewritten, so the fit travels into PDF/PNG exports (the vars are inline on a
// captured ancestor) and reverts the moment copy shrinks again.

import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  NEUTRAL_FIT,
  fitStyleVars,
  nextFitStep,
  resolveContentFit,
  type PrintContentFitSettings,
  type PrintFitKnobs,
} from "@/lib/print-content-fit";

/** Measure the worst clipped height inside the page root, in rendered px. */
function measureOverflow(host: HTMLElement): { px: number; height: number } {
  const page = host.querySelector<HTMLElement>("[data-print-page]");
  if (!page) return { px: 0, height: 0 };
  const height = page.clientHeight;
  let worst = Math.max(0, page.scrollHeight - page.clientHeight);
  const pageBottom = page.getBoundingClientRect().bottom;
  for (const el of Array.from(page.querySelectorAll<HTMLElement>("*"))) {
    const rect = el.getBoundingClientRect();
    if (rect.height === 0) continue;
    const past = rect.bottom - pageBottom;
    if (past > 2) worst = Math.max(worst, past);
  }
  return { px: Math.round(worst), height };
}

export function PrintContentFitFrame({
  settings,
  dep,
  onChange,
  children,
}: {
  settings?: Partial<PrintContentFitSettings>;
  /** Any value that should restart fitting (content, page size, density…). */
  dep?: unknown;
  onChange?: (knobs: PrintFitKnobs, overflowFrac: number) => void;
  children: ReactNode;
}) {
  const resolved = resolveContentFit(settings);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [knobs, setKnobs] = useState<PrintFitKnobs>(NEUTRAL_FIT);
  const knobsRef = useRef<PrintFitKnobs>(NEUTRAL_FIT);
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  const key = `${resolved.enabled}|${resolved.threshold}|${resolved.minScale}|${resolved.minPad}|${resolved.marginRelief}`;

  // Reset knobs whenever content or settings change, then re-converge.
  useEffect(() => {
    knobsRef.current = NEUTRAL_FIT;
    setKnobs(NEUTRAL_FIT);
  }, [dep, key]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (!resolved.enabled) {
      knobsRef.current = NEUTRAL_FIT;
      setKnobs(NEUTRAL_FIT);
      cbRef.current?.(NEUTRAL_FIT, 0);
      return;
    }

    let raf = 0;
    let cancelled = false;
    let steps = 0;

    const tick = () => {
      if (cancelled) return;
      const { px, height } = measureOverflow(host);
      const frac = height > 0 ? px / height : 0;
      const next = nextFitStep(knobsRef.current, frac, resolved);
      if (next && steps < 40) {
        steps += 1;
        knobsRef.current = next;
        setKnobs(next);
        raf = requestAnimationFrame(tick);
        return;
      }
      cbRef.current?.(knobsRef.current, frac);
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      steps = 0;
      raf = requestAnimationFrame(tick);
    };

    schedule();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    ro?.observe(host);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready?.then(schedule).catch(() => {});

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep, key]);

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

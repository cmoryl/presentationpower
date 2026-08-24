// APPROVED PRINT FRAME
// ---------------------------------------------------------------------------
// Renders a curated print example under the "approved demo" contract: the page
// must be fully laid out inside its trim on FIRST paint — nothing clipped, no
// manual "fit to page" click, no over-filled example.
//
// Two mechanisms cooperate:
//   1. PrintContentFitFrame recovers space presentationally (side margins,
//      then a uniform type/spacing scale) under a zero-tolerance threshold.
//   2. When those knobs hit their readability floors and the page STILL
//      measures overflow, the content relief ladder runs (hero band → copy →
//      supporting modules) until the measurement comes back clean.
//
// Callers supply a render callback so this works for any layout family.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { PrintContentFitFrame } from "@/components/print/PrintContentFitFrame";
import type { PrintAssetKind } from "@/lib/print-assets.types";
import {
  DEMO_RELIEF_MAX_STEPS,
  DEMO_RELIEF_TOLERANCE,
  relievePrintDemoContent,
} from "@/lib/print-library/demo-relief";

/** Zero-tolerance fit profile for curated examples. */
export const APPROVED_FIT_SETTINGS = {
  enabled: true,
  threshold: 0.01,
  minScale: 0.76,
  minPad: 0.62,
} as const;

export function ApprovedPrintFrame({
  kind,
  content,
  signature,
  render,
}: {
  kind: PrintAssetKind;
  content: unknown;
  /** Extra values (page size, density, page index…) that restart the ladder. */
  signature?: string;
  render: (content: unknown) => ReactNode;
}) {
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  stepRef.current = step;

  const key = useMemo(() => {
    try {
      return `${kind}|${signature ?? ""}|${JSON.stringify(content).length}`;
    } catch {
      return `${kind}|${signature ?? ""}`;
    }
  }, [kind, content, signature]);

  useEffect(() => {
    stepRef.current = 0;
    setStep(0);
  }, [key]);

  const shown = useMemo(() => relievePrintDemoContent(kind, content, step), [kind, content, step]);

  return (
    <PrintContentFitFrame
      settings={APPROVED_FIT_SETTINGS}
      dep={{ key, step }}
      onMeasure={(m) => {
        if (m.overflowFrac <= DEMO_RELIEF_TOLERANCE) return;
        if (stepRef.current >= DEMO_RELIEF_MAX_STEPS) return;
        const next = stepRef.current + 1;
        stepRef.current = next;
        setStep(next);
      }}
    >
      {render(shown)}
    </PrintContentFitFrame>
  );
}

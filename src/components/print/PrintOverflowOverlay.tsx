/**
 * Hard, unmissable overflow warning for the print editor canvas.
 *
 * Driven by measured DOM overflow (src/hooks/use-print-overflow.ts), not the
 * predictive capacity model — if content is actually being cut off at the page
 * edge, this paints a red clip line at the trim, hatches the lost area and
 * shows a badge with a one-click fix.
 */
import { AlertOctagon, Wand2 } from "lucide-react";
import type { PrintOverflowState } from "@/hooks/use-print-overflow";

export function PrintOverflowOverlay({
  state,
  onFix,
  fixLabel = "Shrink hero to fit",
}: {
  state: PrintOverflowState;
  onFix?: () => void;
  fixLabel?: string;
}) {
  if (!state.clipped) return null;
  const pct = Math.max(1, Math.round(state.overflowFrac * 100));

  return (
    <div
      className="pointer-events-none absolute inset-0 z-40"
      data-testid="print-overflow-overlay"
      data-overflow-px={state.overflowPx}
    >
      {/* Hatched band showing roughly how much content is lost off the page. */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: `${Math.min(40, Math.max(4, state.overflowFrac * 100))}%`,
          background:
            "repeating-linear-gradient(135deg, rgba(229,61,46,0.16) 0 8px, rgba(229,61,46,0.05) 8px 16px)",
          borderTop: "2px solid #E53D2E",
        }}
        aria-hidden
      />
      <div
        role="alert"
        className="pointer-events-auto absolute left-1/2 -translate-x-1/2 flex max-w-[92%] items-center gap-2 rounded-full border px-3 py-1.5 shadow-lg"
        style={{
          bottom: 12,
          background: "#E53D2E",
          borderColor: "#E53D2E",
          color: "#FFFFFF",
        }}
      >
        <AlertOctagon size={14} />
        <span className="text-[11px] font-semibold leading-tight">
          Content is cut off — about {pct}% of the page ({state.overflowPx}px) falls past the trim
          edge and will not print.
        </span>
        {onFix && (
          <button
            type="button"
            onClick={onFix}
            data-testid="print-overflow-fix"
            className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10.5px] font-semibold text-[#E53D2E] hover:bg-white"
          >
            <Wand2 size={11} /> {fixLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// Right-side drawer for inserting shared modules into a print asset.
// Supports both click-to-insert and drag-and-drop from the drawer onto
// the Shared modules panel drop zones.

import { useState } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import type {
  PrintSection,
  PrintStatsVariant,
} from "@/lib/print-assets.types";
import { PRINT_STATS_VARIANTS, PrintSectionRenderer } from "./PrintSectionRenderer";
import { X, GripVertical } from "lucide-react";

export const PRINT_SECTION_DND_MIME = "application/x-print-section";

export function makePrintStatsSection(variantId: PrintStatsVariant): PrintSection {
  const base = {
    id: `sec-${Math.random().toString(36).slice(2, 10)}`,
    kind: "stats" as const,
    variantId,
    eyebrow: "Impact at a glance",
    title: "By the numbers",
  };
  if (variantId === "stat-bento-portrait") {
    return {
      ...base,
      items: [
        { label: "Global markets supported end-to-end", value: "200", unit: "+", caption: "Reach" },
        { label: "Faster time to market", value: "3.4", unit: "x" },
        { label: "Reduction in review cycles", value: "62", unit: "%" },
      ],
    };
  }
  if (variantId === "stat-callout-row-portrait") {
    return {
      ...base,
      items: [
        { label: "Content refresh cycle", value: "48", unit: "hr", caption: "Down from 3 weeks" },
        { label: "Translation cost saved", value: "$1.2", unit: "M", caption: "Annualized" },
        { label: "Markets covered", value: "36", caption: "Live in Q1" },
      ],
    };
  }
  return {
    ...base,
    items: [
      { label: "Localization cost saved", value: "$1.2", unit: "M", delta: "+18%", trend: "up" },
      { label: "Faster time-to-market", value: "3.4", unit: "x", delta: "+12%", trend: "up" },
      { label: "Markets supported live", value: "36", delta: "+9%", trend: "up" },
      { label: "Review cycles removed", value: "62", unit: "%", delta: "-62%", trend: "down" },
    ],
  };
}

export function PrintSectionPicker({
  open, onClose, onInsert, brand, mode,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (section: PrintSection) => void;
  brand: BrandMode;
  mode: "light" | "dark";
}) {
  const [family] = useState<"stats">("stats");
  if (!open) return null;
  const accent = brand.tokens.accent || brand.tokens.primary;

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[520px] flex-col border-l border-black/10 bg-white shadow-2xl"
      role="dialog"
      aria-modal="false"
      aria-label="Shared module library"
    >
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-black/50">Add module</div>
          <h2 className="text-base font-semibold text-black">Shared module library</h2>
          <div className="mt-0.5 text-[11px] text-black/50">Click to insert, or drag onto the Shared modules list.</div>
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-black/60 hover:bg-black/5" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="flex gap-2 border-b border-black/10 px-5 py-2 text-xs">
        <button
          className={`rounded-full px-2.5 py-1 font-medium ${family === "stats" ? "bg-black text-white" : "text-black/60"}`}
        >
          Stats
        </button>
        <span className="rounded-full px-2.5 py-1 text-black/30">Quotes · soon</span>
        <span className="rounded-full px-2.5 py-1 text-black/30">Logo grids · soon</span>
      </div>

      <div className="grid flex-1 gap-4 overflow-auto p-5">
        {PRINT_STATS_VARIANTS.map((v) => {
          const preview = makePrintStatsSection(v.id);
          return (
            <div
              key={v.id}
              draggable
              onDragStart={(e) => {
                // Rebuild fresh each drag so ids stay unique per insert.
                const payload = makePrintStatsSection(v.id);
                e.dataTransfer.effectAllowed = "copy";
                e.dataTransfer.setData(PRINT_SECTION_DND_MIME, JSON.stringify(payload));
                // Fallback so browsers that ignore custom MIME still recognize a drag.
                e.dataTransfer.setData("text/plain", `print-section:${v.id}`);
              }}
              className="group flex cursor-grab flex-col overflow-hidden rounded-xl border border-black/10 bg-white text-left transition hover:border-black hover:shadow-lg active:cursor-grabbing"
            >
              <button
                type="button"
                onClick={() => { onInsert(makePrintStatsSection(v.id)); }}
                className="flex flex-col text-left"
              >
                <div
                  className="relative overflow-hidden [container-type:inline-size]"
                  style={{
                    aspectRatio: "8.5 / 6",
                    background: mode === "dark" ? "#111114" : "#FFFFFF",
                    padding: "5% 6%",
                  }}
                >
                  <PrintSectionRenderer section={preview} mode={mode} accent={accent} />
                </div>
                <div className="flex items-start gap-2 border-t border-black/5 p-3">
                  <GripVertical size={14} className="mt-0.5 shrink-0 text-black/30" aria-hidden />
                  <div>
                    <div className="text-sm font-semibold text-black">{v.label}</div>
                    <div className="mt-0.5 text-[11px] text-black/60">{v.description}</div>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

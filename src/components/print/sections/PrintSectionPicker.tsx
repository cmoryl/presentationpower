// Modal picker for inserting shared modules into a print asset. Phase 1
// exposes the Stats family only; the picker is designed to grow families
// (Quotes, Logo Grids, Timelines, Maps, Comparisons, Charts) without any
// caller changes — just add cases in PRINT_STATS_VARIANTS + renderer.

import { useState } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import type {
  PrintSection,
  PrintStatsVariant,
} from "@/lib/print-assets.types";
import { PRINT_STATS_VARIANTS, PrintSectionRenderer } from "./PrintSectionRenderer";
import { X } from "lucide-react";

function makeStatsSection(variantId: PrintStatsVariant): PrintSection {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-black/50">Add module</div>
            <h2 className="text-lg font-semibold text-black">Shared module library</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-black/60 hover:bg-black/5" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-4 border-b border-black/10 px-6 py-3 text-sm">
          <button
            className={`rounded-full px-3 py-1 font-medium ${family === "stats" ? "bg-black text-white" : "text-black/60"}`}
          >
            Stats
          </button>
          <span className="rounded-full px-3 py-1 text-black/30">Quotes · soon</span>
          <span className="rounded-full px-3 py-1 text-black/30">Logo grids · soon</span>
          <span className="rounded-full px-3 py-1 text-black/30">Timelines · soon</span>
          <span className="rounded-full px-3 py-1 text-black/30">Maps · soon</span>
        </div>

        <div className="grid max-h-[70vh] gap-6 overflow-auto p-6 md:grid-cols-3">
          {PRINT_STATS_VARIANTS.map((v) => {
            const preview = makeStatsSection(v.id);
            return (
              <button
                key={v.id}
                onClick={() => { onInsert(preview); onClose(); }}
                className="group flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white text-left transition hover:border-black hover:shadow-lg"
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
                <div className="border-t border-black/5 p-4">
                  <div className="text-sm font-semibold text-black">{v.label}</div>
                  <div className="mt-1 text-xs text-black/60">{v.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

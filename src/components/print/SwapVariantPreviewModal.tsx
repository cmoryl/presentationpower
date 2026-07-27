/**
 * Side-by-side before/after preview for a swap-variant capacity suggestion.
 * Renders the affected stats module twice — using the current variantId and
 * the proposed lighter one — so the user can verify the visual change before
 * applying. Read-only; delegates the mutation back to the caller via onConfirm.
 */

import { X, ArrowRight, Wand2 } from "lucide-react";
import type { PrintSection, PrintStatsSection, PrintStatsVariant } from "@/lib/print-assets.types";
import { PrintSectionRenderer, PRINT_STATS_VARIANTS } from "./sections/PrintSectionRenderer";

type Props = {
  open: boolean;
  moduleIndex: number;
  fromVariant: PrintStatsVariant;
  toVariant: PrintStatsVariant;
  frees: number;
  section: PrintStatsSection | undefined;
  mode: "light" | "dark";
  accent?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

function variantLabel(id: PrintStatsVariant): string {
  return PRINT_STATS_VARIANTS.find((v) => v.id === id)?.label ?? id;
}

function variantDescription(id: PrintStatsVariant): string {
  return PRINT_STATS_VARIANTS.find((v) => v.id === id)?.description ?? "";
}

export function SwapVariantPreviewModal({
  open,
  moduleIndex,
  fromVariant,
  toVariant,
  frees,
  section,
  mode,
  accent = "#003FC7",
  onCancel,
  onConfirm,
}: Props) {
  if (!open || !section) return null;

  const fromSection: PrintSection = { ...section, variantId: fromVariant };
  const toSection: PrintSection = { ...section, variantId: toVariant };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
      data-testid="swap-variant-preview-modal"
    >
      <div
        className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B0A26]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-3 dark:border-white/10">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
              Module {moduleIndex + 1} · Stats
            </div>
            <div className="mt-0.5 text-sm font-semibold text-[#03002C] dark:text-white">
              Preview swap: {variantLabel(fromVariant)} → {variantLabel(toVariant)}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1.5 text-icon-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
            aria-label="Close preview"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-[1fr_auto_1fr] md:items-start">
          {/* Before */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60 dark:text-white/60">
                Before
              </span>
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-black/70 dark:bg-white/10 dark:text-white/70">
                {variantLabel(fromVariant)}
              </span>
            </div>
            <div className="rounded-xl border border-black/10 bg-[#F2F2F2] p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <PrintSectionRenderer section={fromSection} mode={mode} accent={accent} />
            </div>
            <p className="mt-2 text-[11px] leading-snug text-black/60 dark:text-white/60">
              {variantDescription(fromVariant)}
            </p>
          </div>

          <div className="hidden self-center md:block" aria-hidden>
            <ArrowRight size={20} className="text-[#003FC7]" />
          </div>

          {/* After */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#003FC7]">
                After
              </span>
              <span className="rounded-full bg-[#003FC7]/10 px-2 py-0.5 text-[10px] font-semibold text-[#003FC7]">
                {variantLabel(toVariant)}
              </span>
            </div>
            <div className="rounded-xl border border-[#003FC7]/30 bg-[#F2F2F2] p-3 ring-1 ring-[#003FC7]/20 dark:bg-white/[0.03]">
              <PrintSectionRenderer section={toSection} mode={mode} accent={accent} />
            </div>
            <p className="mt-2 text-[11px] leading-snug text-black/60 dark:text-white/60">
              {variantDescription(toVariant)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-black/10 bg-black/[0.02] px-5 py-3 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="text-[11px] text-black/70 dark:text-white/70">
            Applying this swap frees{" "}
            <span className="font-semibold text-[#003FC7]">{frees.toFixed(1)} page units</span> of
            layout budget. Your stats data is preserved — only the visual variant changes.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-[11px] font-semibold text-[#03002C] hover:border-[#03002C] dark:border-white/15 dark:bg-white/[0.04] dark:text-white/85"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              data-testid="swap-variant-confirm"
              className="inline-flex items-center gap-1 rounded-full border border-[#003FC7] bg-[#003FC7] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#03002C] hover:border-[#03002C]"
            >
              <Wand2 size={12} />
              Apply swap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

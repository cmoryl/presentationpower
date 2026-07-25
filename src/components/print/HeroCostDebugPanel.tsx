/**
 * HeroCostDebugPanel
 * ------------------
 * Collapsible developer overlay that breaks down the hero band's cost model
 * layer-by-layer so we can see *why* the effective module budget shifted.
 *
 * Numbers come straight from src/lib/print-capacity.ts — this is a read-only
 * visualization, no state, no side effects. Rendered inside HeroMediaPanel
 * beneath the live preview.
 */

import { useState } from "react";
import type { PrintHeroMedia, PrintSection } from "@/lib/print-assets.types";
import {
  HERO_BASELINE_HEIGHT_PCT,
  HERO_COPY_RESERVE_SUMMARY,
  HERO_COPY_RESERVE_TITLE,
  HERO_FADE_SEAM_FRAC,
  HERO_UNITS_PER_PCT,
  PRINT_TEMPLATE_BUDGETS,
  type PrintTemplateKind,
  effectiveModuleBudget,
  heroCostBaseline,
  heroCostUnits,
  weightForSection,
} from "@/lib/print-capacity";

type Props = {
  kind: PrintTemplateKind;
  media: PrintHeroMedia | undefined;
  hasTitle: boolean;
  hasSummary: boolean;
  modules: PrintSection[] | undefined;
};

export function HeroCostDebugPanel({ kind, media, hasTitle, hasSummary, modules }: Props) {
  const [open, setOpen] = useState(false);

  const hasHero = !!media?.imageUrl;
  const hp = Math.max(22, Math.min(72, media?.heightPct ?? HERO_BASELINE_HEIGHT_PCT));
  const ws = Math.max(0, Math.min(1, media?.washStrength ?? 1));

  // Layer-by-layer breakdown (units)
  const photoBand = hasHero ? hp * HERO_UNITS_PER_PCT : 0;
  const fadeSeamRebate = hasHero ? -(hp * HERO_UNITS_PER_PCT * HERO_FADE_SEAM_FRAC * ws) : 0;
  const titleReserve = hasHero && hasTitle ? HERO_COPY_RESERVE_TITLE : 0;
  const summaryReserve = hasHero && hasSummary ? HERO_COPY_RESERVE_SUMMARY : 0;

  const copy = { hasTitle, hasSummary };
  const total = heroCostUnits(media, copy);
  const baseline = hasHero ? heroCostBaseline() : 0;
  const delta = total - baseline;

  const baseBudget = PRINT_TEMPLATE_BUDGETS[kind].moduleBudget;
  const effBudget = effectiveModuleBudget(kind, media, copy);
  const usedModules = (modules ?? []).reduce((n, m) => n + weightForSection(m), 0);
  const remaining = effBudget - usedModules;

  const fmt = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2);
  const fmtAbs = (n: number) => n.toFixed(2);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-md border border-dashed border-black/15 bg-black/[0.02] text-[11px] dark:border-white/15 dark:bg-white/[0.03]"
    >
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/60 dark:text-white/60">
        <span>Hero cost debug</span>
        <span className="font-mono text-[10px] normal-case tracking-normal text-black/50 dark:text-white/50">
          Δ {fmt(delta)} · eff {fmtAbs(effBudget)}/{fmtAbs(baseBudget)}
        </span>
      </summary>

      <div className="space-y-2 px-2 pb-2">
        {!hasHero ? (
          <div className="text-black/50 dark:text-white/50">
            No hero image — module budget matches the template base ({fmtAbs(baseBudget)} u).
          </div>
        ) : (
          <>
            <table className="w-full border-collapse font-mono text-[11px] text-black/75 dark:text-white/75">
              <thead className="text-[9px] uppercase tracking-[0.16em] text-black/45 dark:text-white/45">
                <tr>
                  <th className="py-0.5 text-left font-medium">Layer</th>
                  <th className="py-0.5 text-right font-medium">Formula</th>
                  <th className="py-0.5 text-right font-medium">Units</th>
                </tr>
              </thead>
              <tbody>
                <Row
                  label="Photo band"
                  formula={`${hp}% × ${HERO_UNITS_PER_PCT}`}
                  value={photoBand}
                />
                <Row
                  label="Fade seam rebate"
                  formula={`− ${hp}% × ${HERO_UNITS_PER_PCT} × ${HERO_FADE_SEAM_FRAC} × ${ws.toFixed(2)}`}
                  value={fadeSeamRebate}
                  tone="rebate"
                />
                <Row
                  label={`Title reserve${hasTitle ? "" : " (off)"}`}
                  formula={hasTitle ? `+ ${HERO_COPY_RESERVE_TITLE}` : "—"}
                  value={titleReserve}
                  dim={!hasTitle}
                />
                <Row
                  label={`Summary reserve${hasSummary ? "" : " (off)"}`}
                  formula={hasSummary ? `+ ${HERO_COPY_RESERVE_SUMMARY}` : "—"}
                  value={summaryReserve}
                  dim={!hasSummary}
                />
                <tr className="border-t border-black/10 dark:border-white/10">
                  <td className="py-1 font-semibold">Hero cost total</td>
                  <td className="py-1 text-right text-black/50 dark:text-white/50">
                    sum
                  </td>
                  <td className="py-1 text-right font-semibold">{fmtAbs(total)}</td>
                </tr>
                <tr>
                  <td className="py-0.5 text-black/60 dark:text-white/60">Baseline (46%, wash 1, title+summary)</td>
                  <td className="py-0.5 text-right text-black/40 dark:text-white/40">−</td>
                  <td className="py-0.5 text-right">{fmtAbs(baseline)}</td>
                </tr>
                <tr className="border-t border-black/10 dark:border-white/10">
                  <td className="py-1 font-semibold">Budget delta</td>
                  <td className="py-1 text-right text-black/50 dark:text-white/50">total − baseline</td>
                  <td
                    className={`py-1 text-right font-semibold ${
                      delta > 0
                        ? "text-[#E53D2E]"
                        : delta < 0
                          ? "text-[#0F5C1A] dark:text-[#A6FA87]"
                          : "text-black/70 dark:text-white/70"
                    }`}
                  >
                    {fmt(delta)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 rounded bg-black/[0.03] px-2 py-1.5 font-mono text-[10px] text-black/70 dark:bg-white/[0.05] dark:text-white/70">
              <span>Base budget</span>
              <span className="text-right">{fmtAbs(baseBudget)} u</span>
              <span>Effective budget</span>
              <span className="text-right font-semibold">{fmtAbs(effBudget)} u</span>
              <span>Modules used</span>
              <span className="text-right">{fmtAbs(usedModules)} u</span>
              <span>Remaining</span>
              <span
                className={`text-right font-semibold ${
                  remaining < 0
                    ? "text-[#E53D2E]"
                    : remaining < effBudget * 0.15
                      ? "text-[#B45309]"
                      : "text-[#0F5C1A] dark:text-[#A6FA87]"
                }`}
              >
                {fmt(remaining)} u
              </span>
            </div>

            <p className="text-[10px] leading-snug text-black/45 dark:text-white/45">
              1 unit ≈ 1 inch of vertical page real-estate. The fade seam is
              shared with the first module, so a stronger wash gives units back.
            </p>
          </>
        )}
      </div>
    </details>
  );
}

function Row({
  label,
  formula,
  value,
  tone,
  dim,
}: {
  label: string;
  formula: string;
  value: number;
  tone?: "rebate";
  dim?: boolean;
}) {
  return (
    <tr className={dim ? "opacity-50" : undefined}>
      <td className="py-0.5">{label}</td>
      <td className="py-0.5 text-right text-black/50 dark:text-white/50">{formula}</td>
      <td
        className={`py-0.5 text-right ${
          tone === "rebate" ? "text-[#0F5C1A] dark:text-[#A6FA87]" : ""
        }`}
      >
        {value >= 0 ? "+" : ""}
        {value.toFixed(2)}
      </td>
    </tr>
  );
}

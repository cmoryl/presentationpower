// PRINT FIT AUDIT PANEL
// ---------------------------------------------------------------------------
// The author-facing half of the correction pipeline: it shows what the live
// page actually measures, what is wrong with it, and the ranked corrections
// that fix each finding — plus manual resize knobs that pin the sizing so the
// auto ladder stops fighting an author's decision.

import { useMemo } from "react";
import { AlertTriangle, Check, Ruler, RotateCcw, Wand2 } from "lucide-react";

import {
  auditPrintPage,
  formatInches,
  type PrintFitAuditInput,
  type PrintFitFix,
  type PrintFitMeasurement,
} from "@/lib/print-fit-audit";
import type { PrintFitOverride } from "@/components/print/PrintContentFitFrame";

const SEV_STYLE: Record<string, string> = {
  critical: "border-[#E53D2E]/40 bg-[#E53D2E]/[0.06] text-[#E53D2E]",
  warning: "border-[#FF9B70]/50 bg-[#FF9B70]/[0.10] text-[#03002C]",
  info: "border-[#A6FA87]/60 bg-[#A6FA87]/[0.12] text-[#03002C]",
};

function Knob({
  label,
  value,
  min,
  max,
  onChange,
  onClear,
  pinned,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  onClear: () => void;
  pinned: boolean;
  hint: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-[#03002C] dark:text-white">{label}</span>
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-black/50 dark:text-white/50">
            {Math.round(value * 100)}%
          </span>
          {pinned && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-full border border-black/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-black/50 hover:border-black/40 hover:text-[#03002C] dark:border-white/20 dark:text-white/60"
            >
              Auto
            </button>
          )}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#003FC7]"
      />
      <p className="text-[10px] leading-[1.35] text-black/45 dark:text-white/45">{hint}</p>
    </div>
  );
}

export function PrintFitAuditPanel({
  measurement,
  input,
  override,
  onApply,
  onOverride,
}: {
  measurement: PrintFitMeasurement | null;
  input: PrintFitAuditInput;
  override: PrintFitOverride | undefined;
  onApply: (fix: PrintFitFix) => void;
  onOverride: (patch: PrintFitOverride | null) => void;
}) {
  const findings = useMemo(
    () => (measurement ? auditPrintPage(measurement, input) : []),
    [measurement, input],
  );

  if (!measurement) {
    return (
      <p className="text-[11px] text-black/50 dark:text-white/50">
        Measuring the live page… corrections appear once the canvas settles.
      </p>
    );
  }

  const m = measurement;
  const scaleValue = override?.scale ?? m.knobs.scale;
  const padValue = override?.pad ?? m.knobs.pad;

  return (
    <div className="space-y-3" data-testid="print-fit-audit">
      {/* MEASUREMENTS — read from the rendered page, not a capacity estimate. */}
      <div className="rounded-lg border border-black/10 bg-black/[0.02] p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/45 dark:text-white/45">
          <Ruler size={11} aria-hidden /> Live measurements
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          {[
            ["Trim height", `${m.pageH}px`],
            ["Content height", `${m.contentH}px`],
            [
              "Overflow",
              m.overflowPx > 6
                ? `${m.overflowPx}px · ${Math.round(m.overflowFrac * 100)}%`
                : "none",
            ],
            ["Side margin", formatInches(m.sideMarginPx, m, input.pageSize)],
            ["Smallest type", m.minFontPx ? `${m.minFontPx}px` : "—"],
            ["Applied fit", `${Math.round(m.knobs.scale * 100)}% / ${Math.round(m.knobs.pad * 100)}%`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-2">
              <dt className="text-black/50 dark:text-white/50">{k}</dt>
              <dd className="font-mono text-[#03002C] dark:text-white">{v}</dd>
            </div>
          ))}
        </dl>
        {m.offenders.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[10px] text-black/50 dark:text-white/50">
            {m.offenders.map((o) => (
              <li key={o.label} className="truncate">
                ↓ {o.label} — {o.pastPx}px past trim
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* FINDINGS + ranked corrections. */}
      <ul className="space-y-2">
        {findings.map((f) => (
          <li
            key={f.id}
            className={`rounded-lg border p-2.5 ${SEV_STYLE[f.severity] ?? SEV_STYLE.info}`}
          >
            <div className="flex items-start gap-1.5">
              {f.severity === "info" ? (
                <Check size={12} className="mt-0.5 shrink-0" aria-hidden />
              ) : (
                <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden />
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold leading-snug">{f.title}</p>
                <p className="mt-0.5 text-[10px] leading-[1.4] opacity-80">{f.detail}</p>
              </div>
            </div>
            {f.fixes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.fixes.map((fix) => (
                  <button
                    key={fix.id}
                    type="button"
                    title={fix.detail}
                    disabled={fix.advisory}
                    onClick={() => onApply(fix)}
                    className={
                      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium transition " +
                      (fix.advisory
                        ? "cursor-default border-black/10 bg-white/60 text-black/45"
                        : "border-transparent bg-[#003FC7] text-white hover:bg-[#03002C]")
                    }
                  >
                    {!fix.advisory && <Wand2 size={10} aria-hidden />}
                    {fix.label}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* MANUAL RESIZE — pins that outrank the auto ladder. */}
      <div className="space-y-2.5 rounded-lg border border-black/10 p-2.5 dark:border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/45 dark:text-white/45">
            Manual resize
          </span>
          {(override?.scale !== undefined || override?.pad !== undefined) && (
            <button
              type="button"
              onClick={() => onOverride(null)}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-black/50 hover:text-[#03002C] dark:text-white/50 dark:hover:text-white"
            >
              <RotateCcw size={10} aria-hidden /> Back to auto
            </button>
          )}
        </div>
        <Knob
          label="Type & icon scale"
          value={scaleValue}
          min={0.6}
          max={1}
          pinned={override?.scale !== undefined}
          onChange={(v) => onOverride({ scale: v })}
          onClear={() => onOverride({ scale: undefined })}
          hint="Scales every authored print value uniformly — typography, icons and spacing together."
        />
        <Knob
          label="Side margins"
          value={padValue}
          min={0.4}
          max={1}
          pinned={override?.pad !== undefined}
          onChange={(v) => onOverride({ pad: v })}
          onClear={() => onOverride({ pad: undefined })}
          hint="Pulls the live margin in to widen the measure. Below ~70% text starts sitting near the trim."
        />
      </div>
    </div>
  );
}

// Reviewer-facing WCAG contrast warnings for proposed slide colours.
//
// Presentational only — the audit itself lives in `src/lib/contrast-audit.ts`.
// Two surfaces: a deck-level roll-up under the reinterpretation controls, and
// a compact per-slide badge/panel inside each proposal card.

import { useState } from "react";
import { AlertTriangle, Check, ChevronDown, Contrast, Wand2 } from "lucide-react";
import type { ContrastAudit, DeckContrastAudit, WcagTarget } from "@/lib/contrast-audit";

const TONE: Record<
  ContrastAudit["level"],
  { chip: string; panel: string; label: string }
> = {
  pass: {
    chip: "border-[#A6FA87] bg-[#A6FA87]/25 text-[#03002C]",
    panel: "border-[#A6FA87]/50 bg-[#A6FA87]/10",
    label: "Contrast OK",
  },
  warn: {
    chip: "border-[#FFEB66] bg-[#FFEB66]/40 text-[#03002C]",
    panel: "border-[#FFEB66] bg-[#FFEB66]/20",
    label: "Low contrast",
  },
  fail: {
    chip: "border-[#E53D2E] bg-[#E53D2E]/10 text-[#E53D2E]",
    panel: "border-[#E53D2E]/40 bg-[#E53D2E]/[0.06]",
    label: "Fails contrast",
  },
};

function Swatch({ fg, bg }: { fg: string; bg: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-4 w-6 items-center justify-center rounded border border-black/15 text-[9px] font-semibold"
      style={{ background: bg, color: fg }}
    >
      Aa
    </span>
  );
}

/** Per-slide warning panel. Collapsed to a chip while everything passes. */
export function SlideContrastWarning({
  audit,
  onUseSafeAccent,
}: {
  audit: ContrastAudit;
  /** Applies the contrast-corrected accent as a per-slide override. */
  onUseSafeAccent?: (hex: string) => void;
}) {
  const [open, setOpen] = useState(audit.level === "fail");
  const tone = TONE[audit.level];
  const problems = audit.findings.filter((f) => f.level !== "pass");

  return (
    <div className={`mt-3 rounded-lg border p-3 ${tone.panel}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-black/55"
        >
          <Contrast size={11} />
          Colour accessibility
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] normal-case tracking-normal ${tone.chip}`}
          >
            {audit.level === "pass" ? <Check size={9} /> : <AlertTriangle size={9} />}
            {tone.label}
          </span>
          <ChevronDown
            size={11}
            className={`transition ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {audit.safeAccent && onUseSafeAccent && (
          <button
            type="button"
            onClick={() => onUseSafeAccent(audit.safeAccent!)}
            className="inline-flex items-center gap-1 rounded-full border border-[#003FC7] bg-white px-2 py-0.5 text-[11px] text-[#003FC7] hover:bg-[#003FC7]/5"
          >
            <Wand2 size={10} /> Use readable accent
            <span
              aria-hidden
              className="ml-0.5 h-3 w-3 rounded-full border border-black/15"
              style={{ background: audit.safeAccent }}
            />
          </button>
        )}
      </div>

      {!open && problems.length > 0 && (
        <p className="mt-1 text-xs text-black/60">
          {problems.length} pairing{problems.length === 1 ? "" : "s"} below WCAG AA on the{" "}
          {audit.mode} surface.
        </p>
      )}

      {open && (
        <ul className="mt-2 space-y-1.5">
          {audit.findings.map((f) => (
            <li key={f.id} className="flex items-start gap-2 text-xs">
              <Swatch fg={f.fg} bg={f.bg} />
              <span className="flex-1 text-black/65">
                <span className="font-medium text-[#03002C]">{f.label}</span> —{" "}
                <span
                  className={
                    f.level === "fail"
                      ? "text-[#E53D2E]"
                      : f.level === "warn"
                        ? "text-[#03002C]"
                        : "text-black/50"
                  }
                >
                  {f.ratio}:1 (needs {f.required}:1)
                </span>{" "}
                {f.detail}
              </span>
              {f.level === "pass" ? (
                <Check size={11} className="mt-0.5 shrink-0 text-black/30" aria-hidden />
              ) : (
                <AlertTriangle
                  size={11}
                  className={`mt-0.5 shrink-0 ${f.level === "fail" ? "text-[#E53D2E]" : "text-[#03002C]/50"}`}
                  aria-hidden
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** AA / AAA segmented control for the audit target. */
export function WcagTargetToggle({
  value,
  onChange,
}: {
  value: WcagTarget;
  onChange: (next: WcagTarget) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="WCAG target level"
      className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/70 p-0.5"
    >
      {(["AA", "AAA"] as const).map((t) => {
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(t)}
            title={
              t === "AA"
                ? "WCAG 2.1 AA — 4.5:1 body text, 3:1 large text"
                : "WCAG 2.1 AAA — 7:1 body text, 4.5:1 large text"
            }
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide transition ${
              active
                ? "bg-[#003FC7] text-white"
                : "text-black/55 hover:bg-black/[0.04]"
            }`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

/** Deck-level roll-up shown once, under the deck-wide controls. */
export function DeckContrastSummary({
  audit,
  className = "",
  target,
  onTargetChange,
}: {
  audit: DeckContrastAudit;
  className?: string;
  target?: WcagTarget;
  onTargetChange?: (next: WcagTarget) => void;
}) {
  const total = audit.bySlide.size;
  if (total === 0) return null;
  const tone = TONE[audit.level];
  const level = audit.target;
  const fmt = (list: number[]) =>
    list
      .slice(0, 8)
      .map((i) => i + 1)
      .join(", ") + (list.length > 8 ? `, +${list.length - 8} more` : "");

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-lg border p-3 ${tone.panel} ${className}`}
    >
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-wider text-black/55">
        <Contrast size={11} /> Accessibility contrast check
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] normal-case tracking-normal ${tone.chip}`}
        >
          {audit.level === "pass" ? <Check size={9} /> : <AlertTriangle size={9} />}
          {tone.label} · {level}
        </span>
        {target && onTargetChange && (
          <span className="ml-auto flex items-center gap-1.5 normal-case tracking-normal">
            <span className="text-[11px] text-black/45">Target</span>
            <WcagTargetToggle value={target} onChange={onTargetChange} />
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-black/65">
        {audit.level === "pass"
          ? `All ${total} proposed slide colour sets meet WCAG AA on their surface.`
          : [
              audit.failingSlides.length > 0
                ? `${audit.failingSlides.length} slide${audit.failingSlides.length === 1 ? "" : "s"} fail WCAG AA (slides ${fmt(audit.failingSlides)}).`
                : null,
              audit.warningSlides.length > 0
                ? `${audit.warningSlides.length} borderline (slides ${fmt(audit.warningSlides)}).`
                : null,
            ]
              .filter(Boolean)
              .join(" ")}
      </p>
      {audit.level !== "pass" && (
        <p className="mt-1 text-xs text-black/45">
          Open a slide's colour accessibility panel to see which pairing is at fault, or apply the
          suggested readable accent.
        </p>
      )}
    </div>
  );
}

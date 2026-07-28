// Live structure preview for Step 3 of the brief command center.
// Shows the exact block-by-block structure each selected artifact will be
// generated with, updating as brand mode / prospect / selections change.

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, LayoutTemplate, XCircle } from "lucide-react";
import type { StructurePreview } from "@/lib/brief-structure-preview";
import type { BriefValidation } from "@/lib/brief-validation";

export function StructurePreviewPanel({
  previews,
  accent = "#003FC7",
  validation,
}: {
  previews: StructurePreview[];
  accent?: string;
  validation?: BriefValidation;
}) {
  const [activeId, setActiveId] = useState<string | null>(previews[0]?.id ?? null);
  const [open, setOpen] = useState(true);

  // Keep the active tab valid when the selection changes.
  useEffect(() => {
    if (previews.length === 0) return;
    if (!previews.some((p) => p.id === activeId)) setActiveId(previews[0].id);
  }, [previews, activeId]);

  if (previews.length === 0 && !validation?.issues.length) return null;
  const active = previews.find((p) => p.id === activeId) ?? previews[0];
  const errorCount = validation?.errors.length ?? 0;
  const warnCount = validation?.warnings.length ?? 0;

  return (
    <div className="mt-4 rounded-xl border border-black/10 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-icon-muted" strokeWidth={1.75} aria-hidden />
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-black/55">
            Live structure preview
          </span>
          <span className="text-[11px] text-black/40">
            {previews.length} artifact{previews.length === 1 ? "" : "s"}
          </span>
          {errorCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E53D2E]/10 px-2 py-0.5 text-[10px] font-semibold text-[#E53D2E]">
              <XCircle className="h-3 w-3" strokeWidth={1.75} aria-hidden />
              {errorCount} blocking
            </span>
          )}
          {warnCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFEB66]/40 px-2 py-0.5 text-[10px] font-semibold text-black/70">
              <AlertTriangle className="h-3 w-3" strokeWidth={1.75} aria-hidden />
              {warnCount} to check
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-icon-muted transition ${open ? "rotate-180" : ""}`}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {open && (
        <div className="border-t border-black/10 p-4">
          {/* Pre-submit validation */}
          {validation && (
            <div className="mb-4" aria-live="polite">
              {validation.issues.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-[#A6FA87]/60 bg-[#A6FA87]/15 px-3 py-2 text-[12px] text-[#03002C]">
                  <CheckCircle2 className="h-4 w-4 text-icon" strokeWidth={1.75} aria-hidden />
                  Brief looks complete — nothing missing or conflicting.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {validation.issues.map((issue) => {
                    const isError = issue.level === "error";
                    const Icon = isError ? XCircle : AlertTriangle;
                    return (
                      <li
                        key={issue.id}
                        className={`flex gap-2.5 rounded-lg border px-3 py-2 ${
                          isError
                            ? "border-[#E53D2E]/35 bg-[#E53D2E]/[0.06]"
                            : "border-[#FFEB66]/70 bg-[#FFEB66]/[0.18]"
                        }`}
                      >
                        <Icon
                          className={`mt-0.5 h-4 w-4 shrink-0 ${isError ? "text-[#E53D2E]" : "text-black/60"}`}
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-baseline gap-2">
                            <span className="text-[12.5px] font-semibold leading-tight text-[#03002C]">
                              {issue.title}
                            </span>
                            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-black/45">
                              {issue.step}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-[11.5px] leading-snug text-black/60">
                            {issue.detail}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {previews.length === 0 ? null : (
          <>
          {/* Artifact tabs */}
          <div role="tablist" aria-label="Selected artifacts" className="flex flex-wrap gap-1.5">
            {previews.map((p) => {
              const on = p.id === active.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setActiveId(p.id)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                    on
                      ? "border-[#03002C] bg-[#03002C] text-white"
                      : "border-black/10 bg-white text-black/60 hover:border-black/30 hover:text-black"
                  }`}
                >
                  {p.label}
                  <span className={`ml-2 font-normal ${on ? "text-white/60" : "text-black/40"}`}>
                    {p.output}
                  </span>
                </button>
              );
            })}
          </div>

          {active.note && (
            <div className="mt-3 text-[11px] text-black/50">{active.note}</div>
          )}

          {/* Block rail */}
          <ol className="mt-3 max-h-[22rem] space-y-1.5 overflow-y-auto pr-1">
            {active.blocks.map((b, i) => (
              <li
                key={`${active.id}-${b.index}-${i}`}
                className="flex gap-3 rounded-lg border border-black/[0.07] bg-[#F2F2F2]/50 px-3 py-2"
              >
                <span
                  className="mt-0.5 shrink-0 font-mono text-[10px] font-semibold tracking-widest"
                  style={{ color: accent }}
                >
                  {b.index}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[12.5px] font-semibold leading-tight text-[#03002C]">
                      {b.title}
                    </span>
                    {b.meta && (
                      <span className="rounded-full bg-black/[0.05] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-black/50">
                        {b.meta}
                      </span>
                    )}
                  </span>
                  {b.detail && (
                    <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug text-black/55">
                      {b.detail}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-3 text-[11px] leading-relaxed text-black/45">
            This is the structure that will be generated. AI personalization rewrites the copy
            inside each block — the block order and layout stay as shown.
          </p>
          </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * PrintSectionLayoutControls — the per-section layout picker every print module
 * inspector shows, plus the admin-only token customiser for the selected
 * layout. Admin edits are workspace-local (see print-section-layouts.ts) and
 * apply to every module of that family using that layout.
 */
import { useEffect, useState } from "react";

import { useIsAdmin } from "@/hooks/use-is-admin";
import {
  loadPrintLayoutOverrides,
  printLayoutIsCustomised,
  printSectionLayouts,
  resetPrintLayoutOverride,
  resolvePrintSectionLayout,
  savePrintLayoutOverride,
  subscribePrintLayoutOverrides,
  PRINT_SECTION_HEADERS,
  PRINT_SECTION_SURFACES,
  type PrintSectionKind,
  type PrintSectionLayoutId,
  type PrintSectionLayoutTokens,
} from "@/lib/print-section-layouts";

const input =
  "w-full rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/90 outline-none focus-visible:ring-1 focus-visible:ring-white/40";
const label = "text-[9px] uppercase tracking-[0.14em] text-white/45";

export function PrintSectionLayoutControls({
  kind,
  layoutId,
  onChange,
}: {
  kind: PrintSectionKind;
  layoutId: PrintSectionLayoutId | undefined;
  onChange: (id: PrintSectionLayoutId) => void;
}) {
  const isAdmin = useIsAdmin();
  const [, force] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => subscribePrintLayoutOverrides(() => force((n) => n + 1)), []);
  useEffect(() => {
    loadPrintLayoutOverrides();
  }, []);

  const layouts = printSectionLayouts(kind);
  const active = layoutId ?? "layout-standard";
  const { tokens } = resolvePrintSectionLayout(kind, active);
  const customised = printLayoutIsCustomised(kind, active);

  const patch = (p: Partial<PrintSectionLayoutTokens>) =>
    savePrintLayoutOverride(kind, active, p);

  return (
    <div className="space-y-1.5">
      <div className={label}>Section layout</div>
      <select
        aria-label="Section layout"
        className={input}
        value={active}
        onChange={(e) => onChange(e.target.value as PrintSectionLayoutId)}
      >
        {layouts.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
            {printLayoutIsCustomised(kind, l.id) ? " ·  custom" : ""}
          </option>
        ))}
      </select>
      <p className="text-[10px] leading-snug text-white/45">
        {layouts.find((l) => l.id === active)?.desc}
      </p>

      {isAdmin && (
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-2">
          <button
            type="button"
            className="flex w-full items-center justify-between text-[10px] uppercase tracking-[0.14em] text-white/60"
            onClick={() => setOpen((v) => !v)}
          >
            <span>Customise layout {customised ? "· edited" : ""}</span>
            <span aria-hidden>{open ? "–" : "+"}</span>
          </button>
          {open && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <NumField
                title="Columns"
                value={tokens.cols}
                min={1}
                max={8}
                step={1}
                onChange={(cols) => patch({ cols })}
              />
              <NumField
                title="Gap"
                value={tokens.gap}
                min={0}
                max={48}
                step={1}
                onChange={(gap) => patch({ gap })}
              />
              <NumField
                title="Padding"
                value={tokens.pad}
                min={0}
                max={48}
                step={1}
                onChange={(pad) => patch({ pad })}
              />
              <NumField
                title="Scale %"
                value={Math.round(tokens.scale * 100)}
                min={80}
                max={130}
                step={1}
                onChange={(v) => patch({ scale: v / 100 })}
              />
              <SelField
                title="Surface"
                value={tokens.surface}
                options={PRINT_SECTION_SURFACES}
                onChange={(surface) => patch({ surface })}
              />
              <SelField
                title="Header"
                value={tokens.header}
                options={PRINT_SECTION_HEADERS}
                onChange={(header) => patch({ header })}
              />
              <SelField
                title="Align"
                value={tokens.align}
                options={["left", "center"] as const}
                onChange={(align) => patch({ align })}
              />
              <SelField
                title="Order"
                value={tokens.reverse ? "reversed" : "normal"}
                options={["normal", "reversed"] as const}
                onChange={(v) => patch({ reverse: v === "reversed" })}
              />
              <button
                type="button"
                className="col-span-2 rounded-md border border-white/15 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/60 hover:bg-white/5"
                onClick={() => resetPrintLayoutOverride(kind, active)}
              >
                Reset to shipped tokens
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NumField({
  title,
  value,
  min,
  max,
  step,
  onChange,
}: {
  title: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="space-y-1">
      <span className={label}>{title}</span>
      <input
        type="number"
        className={input}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
      />
    </label>
  );
}

function SelField<T extends string>({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="space-y-1">
      <span className={label}>{title}</span>
      <select
        aria-label={title}
        className={input}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

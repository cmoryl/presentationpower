// Editor fields for the growth-proof split module: the right-hand header text
// and, for every figure, its label, its value and how that value is formatted
// (prefix, suffix and decimal places).

import {
  DEFAULT_STAT_FORMAT,
  MAX_STAT_AFFIX_CHARS,
  MAX_STAT_DECIMALS,
  formatStatValue,
  isDefaultStatFormat,
  patchStatFormat,
  resolveStatFormat,
} from "@/lib/stat-format";
import { ReorderHandle, ReorderNudge, useReorder } from "./ReorderRow";
import { canMoveDown, canMoveUp } from "@/lib/reorder";
import { reorderOrbits } from "@/lib/orbit-layout";

type Row = Record<string, unknown>;

const rows = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
const str = (v: unknown) => (typeof v === "string" ? v : "");

const FIELD =
  "w-full rounded-lg border border-black/10 px-2.5 py-1.5 text-[12px] text-[#03002C] outline-none transition focus:border-[#003FC7]";
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45";

function StatRows({
  title,
  hint,
  items,
  onChange,
  keepPlacement,
}: {
  title: string;
  hint: string;
  items: Row[];
  onChange: (items: Row[]) => void;
  /** Keep ring placements with their slot so the content reflows in place. */
  keepPlacement?: boolean;
}) {
  const patch = (i: number, p: Row) =>
    onChange(items.map((row, k) => (k === i ? { ...row, ...p } : row)));
  const reorder = useReorder(
    items,
    onChange,
    keepPlacement
      ? (list, from, to) => reorderOrbits(list as Row[], from, to) as Row[]
      : undefined,
  );

  if (items.length === 0) {
    return (
      <div className="mt-4">
        <span className={LABEL}>{title}</span>
        <p className="mt-1 text-[11px] text-black/45">Nothing to format yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <span className={LABEL}>{title}</span>
      <p className="mt-1 text-[11px] text-black/55">
        {hint} Drag a row by its handle to change the order.
      </p>
      <div className="mt-2 space-y-3">
        {items.map((row, i) => {
          const fmt = resolveStatFormat(row);
          return (
            <div
              key={i}
              {...reorder.rowProps(i)}
              className="rounded-xl border border-black/10 p-3 data-[drop-target]:border-[#003FC7] data-[dragging]:opacity-60"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <ReorderHandle
                    draggable
                    {...reorder.handleProps(i, `Figure ${i + 1}`)}
                  />
                  <span className="text-[11px] font-semibold text-black/55">Figure {i + 1}</span>
                </span>
                <span className="flex items-center gap-2">
                  <ReorderNudge
                    onUp={() => reorder.moveUpRow(i)}
                    onDown={() => reorder.moveDownRow(i)}
                    upDisabled={!canMoveUp(i)}
                    downDisabled={!canMoveDown(i, items.length)}
                    label={`figure ${i + 1}`}
                  />
                  <span className="rounded-full bg-[#E0E8F5] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#03002C]">
                    {formatStatValue(row.value, row) || "—"}
                  </span>
                </span>
              </div>

              <label className="mt-2 flex flex-col gap-1">
                <span className={LABEL}>Label</span>
                <input
                  className={FIELD}
                  value={str(row.label)}
                  onChange={(e) => patch(i, { label: e.target.value })}
                  aria-label={`Figure ${i + 1} label`}
                />
              </label>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className={LABEL}>Value</span>
                  <input
                    className={FIELD}
                    value={str(row.value)}
                    onChange={(e) => patch(i, { value: e.target.value })}
                    aria-label={`Figure ${i + 1} value`}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={LABEL}>Decimals</span>
                  <select
                    className={FIELD}
                    value={fmt.decimals === null ? "auto" : String(fmt.decimals)}
                    onChange={(e) =>
                      patch(
                        i,
                        patchStatFormat(row, {
                          decimals: e.target.value === "auto" ? null : Number(e.target.value),
                        }) as Row,
                      )
                    }
                    aria-label={`Figure ${i + 1} decimal places`}
                  >
                    <option value="auto">As typed</option>
                    {Array.from({ length: MAX_STAT_DECIMALS + 1 }, (_, d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className={LABEL}>Prefix</span>
                  <input
                    className={FIELD}
                    maxLength={MAX_STAT_AFFIX_CHARS}
                    placeholder="+ or $"
                    value={fmt.prefix}
                    onChange={(e) =>
                      patch(i, patchStatFormat(row, { prefix: e.target.value }) as Row)
                    }
                    aria-label={`Figure ${i + 1} prefix`}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={LABEL}>Suffix</span>
                  <input
                    className={FIELD}
                    maxLength={MAX_STAT_AFFIX_CHARS}
                    placeholder="% or B"
                    value={fmt.suffix}
                    onChange={(e) =>
                      patch(i, patchStatFormat(row, { suffix: e.target.value }) as Row)
                    }
                    aria-label={`Figure ${i + 1} suffix`}
                  />
                </label>
              </div>

              {!isDefaultStatFormat(fmt) && (
                <button
                  type="button"
                  onClick={() => patch(i, { ...DEFAULT_STAT_FORMAT, decimals: null } as Row)}
                  className="mt-2 rounded-full border border-black/10 px-2.5 py-1 text-[10px] font-medium text-black/60 transition hover:border-[#003FC7] hover:text-[#003FC7]"
                >
                  ⟲ Reset formatting
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OrbitContentPanel({
  content,
  onChangeField,
}: {
  content: Record<string, unknown>;
  onChangeField: (field: string, value: unknown) => void;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4">
      <h3 className="text-[13px] font-semibold text-[#03002C]">Header &amp; figures</h3>
      <p className="text-[11px] text-black/55">
        Headline copy on the right-hand panel, plus each figure&apos;s label and number formatting.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2">
        <label className="flex flex-col gap-1">
          <span className={LABEL}>Header text</span>
          <input
            className={FIELD}
            value={str(content.statsTitle)}
            onChange={(e) => onChangeField("statsTitle", e.target.value)}
            aria-label="Header text"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={LABEL}>Header emphasis</span>
          <input
            className={FIELD}
            value={str(content.statsEmphasis)}
            onChange={(e) => onChangeField("statsEmphasis", e.target.value)}
            aria-label="Header emphasis"
          />
        </label>
      </div>

      <StatRows
        title="Orbit figures"
        hint="Prefix and suffix override whatever sits around the number; decimals round it."
        items={rows(content.orbits)}
        onChange={(next) => onChangeField("orbits", next)}
        keepPlacement
      />

      <StatRows
        title="Growth stats"
        hint="Same formatting controls for the numbered list on the left."
        items={rows(content.growth)}
        onChange={(next) => onChangeField("growth", next)}
      />
    </section>
  );
}

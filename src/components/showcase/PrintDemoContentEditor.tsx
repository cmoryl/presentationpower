// Full-piece copy editor for the print demo pages.
//
// Surfaces every author-visible string in the print content tree so the demo can
// be rewritten end to end; each keystroke flows straight back into the real
// layout so the rendered preview updates live.

import { useMemo, useState } from "react";
import { ChevronDown, RotateCcw, Type } from "lucide-react";

import {
  collectTextFields,
  groupTextFields,
  pathKey,
  setAtPath,
} from "@/lib/print-content-text";

type Props = {
  content: unknown;
  onChange: (next: unknown) => void;
  onReset: () => void;
  dirty: boolean;
  accent?: string;
};

export function PrintDemoContentEditor({ content, onChange, onReset, dirty, accent }: Props) {
  const groups = useMemo(() => groupTextFields(collectTextFields(content)), [content]);
  const [open, setOpen] = useState<string | null>(groups[0]?.group ?? null);

  if (!groups.length) {
    return (
      <p className="text-sm text-black/55 dark:text-white/55">
        This example has no editable copy fields.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Type size={15} className="shrink-0" />
          <span className="truncate text-sm font-semibold text-[#03002C] dark:text-white">
            Edit this piece
          </span>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={!dirty}
          className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border border-black/10 px-3 text-[12px] font-medium text-black/70 transition enabled:hover:bg-black/5 disabled:opacity-40 dark:border-white/15 dark:text-white/70 dark:enabled:hover:bg-white/10"
        >
          <RotateCcw size={13} /> Reset
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {groups.map((g) => {
          const isOpen = open === g.group;
          return (
            <div
              key={g.group}
              className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : g.group)}
                aria-expanded={isOpen}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-[#03002C] dark:text-white">
                    {g.group || "Piece"}
                  </span>
                  <span className="text-[11px] text-black/45 dark:text-white/45">
                    {g.fields.length} field{g.fields.length === 1 ? "" : "s"}
                  </span>
                </span>
                <ChevronDown
                  size={15}
                  className={`shrink-0 transition ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen ? (
                <div className="space-y-3 border-t border-black/10 p-3 dark:border-white/10">
                  {g.fields.map((f) => {
                    const id = `pf-${pathKey(f.path)}`;
                    return (
                      <div key={id}>
                        <label
                          htmlFor={id}
                          className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45 dark:text-white/45"
                        >
                          {f.key}
                        </label>
                        {f.multiline ? (
                          <textarea
                            id={id}
                            value={f.value}
                            rows={3}
                            onChange={(e) => onChange(setAtPath(content, f.path, e.target.value))}
                            className="mt-1 w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-[13px] leading-relaxed text-[#03002C] outline-none focus:border-[#003FC7] dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
                            style={accent ? { caretColor: accent } : undefined}
                          />
                        ) : (
                          <input
                            id={id}
                            value={f.value}
                            onChange={(e) => onChange(setAtPath(content, f.path, e.target.value))}
                            className="mt-1 min-h-[40px] w-full rounded-lg border border-black/10 bg-white px-2.5 text-[13px] text-[#03002C] outline-none focus:border-[#003FC7] dark:border-white/15 dark:bg-white/[0.06] dark:text-white"
                            style={accent ? { caretColor: accent } : undefined}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

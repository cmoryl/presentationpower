/**
 * Visual icon picker for print section items.
 *
 * Print layouts render icons from the fixed Heroicons-outline set in
 * `print-primitives` (ICON_PATHS), so the picker is scoped to exactly that
 * set — anything else silently falls back at render time. Replaces the
 * free-text "Icon" fields in the print editor's section inspectors.
 */

import { useEffect, useRef, useState } from "react";
import { ICON_PATHS, type IconName } from "./print-primitives";

const NAMES = Object.keys(ICON_PATHS) as IconName[];

function Glyph({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

function label(name: string) {
  return name.replace(/-/g, " ");
}

export function PrintIconPicker({
  value,
  onChange,
  title = "Icon",
}: {
  value: string | undefined;
  onChange: (name: string | undefined) => void;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const current = value && (NAMES as string[]).includes(value) ? (value as IconName) : null;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        data-testid="print-icon-picker"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={current ? `${title}: ${label(current)}` : `${title}: auto`}
        onClick={() => setOpen((v) => !v)}
        className="flex h-[30px] w-full items-center justify-center gap-1 rounded-md border border-black/10 bg-white px-2 text-[#03002C] transition hover:border-[#003FC7] dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
      >
        {current ? (
          <Glyph name={current} />
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-icon-subtle">
            Auto
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`${title} picker`}
          className="absolute right-0 z-50 mt-1 w-[228px] rounded-xl border border-black/10 bg-white p-2 shadow-xl dark:border-white/15 dark:bg-[#0d0b2a]"
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
              {title}
            </span>
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
              className="rounded-full border border-black/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-black/55 transition hover:border-[#003FC7] hover:text-[#003FC7] dark:border-white/15 dark:text-white/55"
            >
              Auto
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {NAMES.map((n) => (
              <button
                key={n}
                type="button"
                title={label(n)}
                aria-label={label(n)}
                aria-pressed={current === n}
                onClick={() => {
                  onChange(n);
                  setOpen(false);
                }}
                className={`flex h-8 items-center justify-center rounded-md border transition hover:border-[#003FC7] hover:text-[#003FC7] ${
                  current === n
                    ? "border-[#003FC7] bg-[#003FC7]/10 text-[#003FC7]"
                    : "border-black/10 text-[#03002C] dark:border-white/10 dark:text-white"
                }`}
              >
                <Glyph name={n} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

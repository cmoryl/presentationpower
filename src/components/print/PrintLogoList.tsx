/**
 * Editable logo *lists* for print layouts.
 *
 * `PrintImageEdit` makes a single picture replaceable. This module handles the
 * other half of the job: letting an author add, remove and re-order the logos
 * in a wall (causes, affinity groups, client walls) while the page keeps its
 * authored geometry.
 *
 * The layout owns the geometry; the editor owns the data. A layout renders each
 * entry inside `<LogoSlotChrome>` and drops one `<AddLogoButton>` next to the
 * wall. When a `PrintLogoListContext` is present those affordances appear and
 * write the whole array back through the editor's path-patch function; outside
 * the editor they render nothing at all, so exports never see chrome.
 */

import { createContext, useContext } from "react";
import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";

export type PrintLogoEntry = { id?: string; name?: string; url?: string };

type LogoListCtx = {
  active: boolean;
  /** Write an array back to a content path, e.g. `pages.11.causeLogos`. */
  onChange: (path: string, next: PrintLogoEntry[]) => void;
};

export const PrintLogoListContext = createContext<LogoListCtx | null>(null);

export function usePrintLogoList() {
  return useContext(PrintLogoListContext);
}

/** Stable slot id for an entry (falls back to a name slug, then the index). */
export function logoEntryId(entry: PrintLogoEntry, index: number): string {
  if (entry.id?.trim()) return entry.id.trim();
  const slug = (entry.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || `slot-${index + 1}`;
}

export function moveLogo(list: PrintLogoEntry[], from: number, to: number): PrintLogoEntry[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

const BTN =
  "pointer-events-auto grid h-5 w-5 place-items-center rounded-full bg-[#03002C] text-white shadow-sm hover:bg-[#003FC7] disabled:opacity-30";

/**
 * Overlay for one logo tile: reorder + remove. Renders `children` untouched
 * when no editor context is active.
 */
export function LogoSlotChrome({
  path,
  list,
  index,
  children,
}: {
  path: string;
  list: PrintLogoEntry[];
  index: number;
  children: React.ReactNode;
}) {
  const ctx = usePrintLogoList();
  if (!ctx?.active) return <>{children}</>;

  return (
    <div className="group relative h-full w-full">
      {children}
      <div
        data-export-ignore-chrome
        className="pointer-events-none absolute -top-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
      >
        <button
          type="button"
          className={BTN}
          disabled={index === 0}
          aria-label="Move logo earlier"
          onClick={() => ctx.onChange(path, moveLogo(list, index, index - 1))}
        >
          <ArrowLeft size={11} aria-hidden />
        </button>
        <button
          type="button"
          className={BTN}
          disabled={index === list.length - 1}
          aria-label="Move logo later"
          onClick={() => ctx.onChange(path, moveLogo(list, index, index + 1))}
        >
          <ArrowRight size={11} aria-hidden />
        </button>
        <button
          type="button"
          className={`${BTN} bg-[#E53D2E] hover:bg-[#b32b1f]`}
          aria-label="Remove logo"
          onClick={() => ctx.onChange(path, list.filter((_, i) => i !== index))}
        >
          <X size={11} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** "Add logo" affordance. Appends an empty slot the author can then drop onto. */
export function AddLogoButton({
  path,
  list,
  label = "Add logo",
  max = 24,
}: {
  path: string;
  list: PrintLogoEntry[];
  label?: string;
  max?: number;
}) {
  const ctx = usePrintLogoList();
  if (!ctx?.active) return null;
  const full = list.length >= max;

  return (
    <button
      type="button"
      data-export-ignore-chrome
      disabled={full}
      className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-dashed border-[#03002C]/40 bg-white/85 px-2 py-1 text-[10px] font-semibold text-[#03002C] shadow-sm hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-40"
      onClick={() =>
        ctx.onChange(path, [
          ...list,
          { id: `logo-${Date.now().toString(36)}-${list.length + 1}`, name: label, url: "" },
        ])
      }
    >
      <Plus size={11} aria-hidden /> {full ? "Full" : label}
    </button>
  );
}

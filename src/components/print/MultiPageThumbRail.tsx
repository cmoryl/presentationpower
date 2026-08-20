// Page navigator for multi-page print documents (solution proposals).
//
// The editor shows ONE page full size so the right-hand inspector stays in view;
// every other page lives here as a small, clickable thumbnail. Thumbnails render
// through the real layout at a tiny width — the layouts are container-query
// based, so they scale down faithfully with no separate preview code path.

import { MultiProposalLayout, pageNavLabel } from "@/components/print/MultiProposalLayout";
import type { SolutionProposalContent } from "@/lib/print-assets.types";
import type { BrandMode } from "@/lib/taxonomy";

export function MultiPageThumbRail({
  content,
  brand,
  mode = "light",
  active,
  onSelect,
}: {
  content: SolutionProposalContent;
  brand: BrandMode;
  mode?: "light" | "dark";
  active: number;
  onSelect: (index: number) => void;
}) {
  const pages = content.pages ?? [];
  if (pages.length < 2) return null;

  return (
    <nav aria-label="Document pages" className="mt-4" data-export-ignore>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
          Pages · {pages.length}
        </span>
        <span className="text-[11px] text-black/45">
          Click a page to open it above and edit it
        </span>
      </div>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {pages.map((page, i) => {
          const on = i === active;
          return (
            <li key={page.id || `${page.kind}-${i}`}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={on ? "page" : undefined}
                title={pageNavLabel(page, i)}
                className="group block w-full text-left focus:outline-none"
              >
                <div
                  className="overflow-hidden rounded-lg border bg-white transition"
                  style={{
                    borderColor: on ? "#003FC7" : "rgba(3,0,44,0.12)",
                    boxShadow: on
                      ? "0 0 0 2px rgba(0,63,199,0.28)"
                      : "0 1px 4px rgba(3,0,44,0.08)",
                  }}
                >
                  <div className="pointer-events-none">
                    <MultiProposalLayout
                      content={content}
                      brand={brand}
                      mode={mode}
                      pageIndex={i}
                    />
                  </div>
                </div>
                <span
                  className="mt-1 block truncate text-[10px] font-medium"
                  style={{ color: on ? "#003FC7" : "rgba(3,0,44,0.6)" }}
                >
                  {i + 1}. {pageNavLabel(page, i)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// SocialModulePicker — browse every print/deck section module in the library
// and drop one into a social frame. Each tile previews the module already
// adapted to the selected format (auto-fit relief applied), so the choice is
// made on what will actually ship.

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { useModalA11y } from "@/hooks/use-modal-a11y";
import { SocialModuleFrame } from "@/components/campaigns/SocialModuleFrame";
import type { CampaignCopy } from "@/lib/campaigns";
import type { SocialFormat } from "@/lib/social-formats";
import { aspectClass } from "@/lib/social-formats";
import {
  SOCIAL_MODULE_FAMILIES,
  buildSocialModuleSection,
  printModuleFamilyMeta,
  socialModuleMatches,
  socialModulesForFormat,
  type SocialModuleLayout,
} from "@/lib/social-module-layouts";
import { reliefAt } from "@/lib/social-module-fit";

export function SocialModulePicker({
  open,
  onClose,
  onSelect,
  format,
  brandId,
  mode,
  copy,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (layout: SocialModuleLayout) => void;
  format: SocialFormat;
  brandId: string;
  mode: "light" | "dark";
  copy: CampaignCopy;
}) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string>("all");
  const ref = useRef<HTMLDivElement>(null);
  useModalA11y({ open, onClose, containerRef: ref });

  useEffect(() => {
    if (!open) {
      setQuery("");
      setFamily("all");
    }
  }, [open]);

  const cls = aspectClass(format);
  const layouts = useMemo(() => {
    const all = socialModulesForFormat(format);
    return all.filter(
      (l) =>
        (family === "all" || l.family === family) &&
        (!query.trim() || socialModuleMatches(l, query)),
    );
  }, [format, family, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#03002C]/60 p-4 backdrop-blur-sm sm:p-8">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Choose a module layout"
        className="w-full max-w-6xl rounded-3xl border border-black/10 bg-white shadow-2xl"
      >
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-black/10 p-5 sm:flex sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#003FC7]">
              Module library · {format.label} · {format.width}×{format.height}
            </p>
            <h2 className="truncate text-xl font-black tracking-tight text-[#03002C]">
              Choose a module layout
            </h2>
            <p className="mt-1 text-xs text-black/60">
              {layouts.length} modules · previews are auto-fitted to this frame’s safe area.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full border border-black/10 p-2 text-[#03002C] transition hover:bg-black/5"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-black/10 p-4">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-black/10 px-3 py-1.5">
            <Search size={14} className="shrink-0 text-black/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search modules — stats, quote, logos, process…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {["all", ...SOCIAL_MODULE_FAMILIES].map((f) => {
              const label = f === "all" ? "All" : printModuleFamilyMeta(f as never).label;
              const active = family === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFamily(f)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                    active
                      ? "bg-[#03002C] text-white"
                      : "border border-black/10 text-[#03002C] hover:bg-black/5"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid max-h-[68vh] grid-cols-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-3">
          {layouts.map((layout) => {
            const section = buildSocialModuleSection({
              layout,
              copy,
              relief: reliefAt(0),
            });
            const suited = layout.suitedFor.includes(cls);
            return (
              <button
                key={layout.id}
                type="button"
                onClick={() => {
                  onSelect(layout);
                  onClose();
                }}
                className="group flex min-w-0 flex-col gap-2 rounded-2xl border border-black/10 bg-white p-3 text-left transition hover:border-[#003FC7]/50 hover:shadow-[0_18px_40px_-24px_rgba(3,0,44,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]"
              >
                <div className="flex h-[220px] items-center justify-center overflow-hidden rounded-xl bg-[#F2F2F2]">
                  <SocialModuleFrame
                    format={format}
                    section={section}
                    brandId={brandId}
                    mode={mode}
                    displayShortEdge={168}
                    hideLockup
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-bold text-[#03002C]">
                      {layout.label}
                    </span>
                    {suited ? (
                      <span className="shrink-0 rounded-full bg-[#003FC7]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-[#003FC7]">
                        Suited
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-black/60">
                    {layout.description}
                  </p>
                </div>
              </button>
            );
          })}
          {layouts.length === 0 ? (
            <p className="col-span-full py-10 text-center text-sm text-black/50">
              No modules match that search.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

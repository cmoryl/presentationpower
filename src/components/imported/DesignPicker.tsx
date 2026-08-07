import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DESIGN_CATALOG, type DesignCatalogEntry } from "@/lib/reinterpret-design";
import { LayoutThumb } from "./LayoutThumb";

/** Catalog grouped by content family, primary look first. */
const DESIGN_GROUPS: { group: string; entries: DesignCatalogEntry[] }[] = (() => {
  const map = new Map<string, DesignCatalogEntry[]>();
  for (const d of DESIGN_CATALOG) {
    const list = map.get(d.group) ?? [];
    list.push(d);
    map.set(d.group, list);
  }
  return [...map.entries()]
    .map(([group, entries]) => ({
      group,
      entries: [...entries].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
})();

/**
 * Visual layout picker: every option shows a schematic thumbnail so funnel,
 * timeline and stat-wall looks can be compared at a glance.
 */
export function DesignPicker({
  value,
  onChange,
  accent = "#003FC7",
}: {
  value: string;
  onChange: (variantId: string) => void;
  accent?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const current = DESIGN_CATALOG.find((d) => d.variantId === value);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return DESIGN_GROUPS;
    return DESIGN_GROUPS.map((g) => ({
      group: g.group,
      entries: g.entries.filter((d) =>
        `${d.name} ${d.variantId} ${d.group} ${d.description}`.toLowerCase().includes(needle),
      ),
    })).filter((g) => g.entries.length > 0);
  }, [q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="mt-1 flex w-full items-center gap-2 rounded-lg border border-black/15 bg-white px-2 py-1.5 text-left text-xs text-[#03002C] hover:border-[#003FC7]"
          aria-label="Change proposed design"
        >
          <LayoutThumb variantId={value} accent={accent} className="h-7 w-12 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {current ? (
              <>
                {current.isPrimary ? "★ " : ""}
                {current.name}
                <span className="text-black/40"> · {value}</span>
              </>
            ) : (
              <>
                {value} <span className="text-black/40">(unknown)</span>
              </>
            )}
          </span>
          <ChevronsUpDown size={12} className="shrink-0 text-black/35" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(560px,90vw)] p-0">
        <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2">
          <Search size={13} className="text-black/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search funnels, timelines, stat walls…"
            className="w-full bg-transparent text-xs outline-none placeholder:text-black/35"
          />
        </div>
        <div className="max-h-[380px] overflow-y-auto p-3">
          {groups.map((g) => (
            <div key={g.group} className="mb-4 last:mb-0">
              <div className="mb-1.5 text-[10px] uppercase tracking-widest text-black/40">
                {g.group}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {g.entries.map((d) => {
                  const active = d.variantId === value;
                  return (
                    <button
                      key={d.variantId}
                      type="button"
                      title={d.description}
                      onClick={() => {
                        onChange(d.variantId);
                        setOpen(false);
                      }}
                      className={`group relative rounded-lg border p-1.5 text-left transition ${
                        active
                          ? "border-[#003FC7] bg-[#003FC7]/[0.05]"
                          : "border-black/10 bg-white hover:border-[#003FC7]/60"
                      }`}
                    >
                      <LayoutThumb variantId={d.variantId} accent={accent} className="h-auto w-full" />
                      <div className="mt-1 flex items-start gap-1">
                        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#03002C]">
                          {d.isPrimary ? "★ " : ""}
                          {d.name}
                        </span>
                        {active && <Check size={11} className="mt-0.5 shrink-0 text-[#003FC7]" />}
                      </div>
                      <div className="truncate text-[9px] uppercase tracking-wider text-black/35">
                        {d.variantId}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <div className="py-6 text-center text-xs text-black/40">No layouts match “{q}”.</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

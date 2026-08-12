import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Filter, Pin, PinOff, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DESIGN_CATALOG, LOGO_GROUP, type DesignCatalogEntry } from "@/lib/reinterpret-design";
import { LayoutThumb } from "./LayoutThumb";
import { useDesignGroupPresets } from "@/lib/design-group-presets";

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

type AssetTypeFilter = "all" | "funnel" | "timeline" | "stat-wall" | "logos" | "other";

const ASSET_TYPE_FILTERS: { value: AssetTypeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "funnel", label: "Funnel" },
  { value: "timeline", label: "Timeline" },
  { value: "stat-wall", label: "Stat wall" },
  { value: "logos", label: "Client logos" },
  { value: "other", label: "Other" },
];

function groupMatchesAssetType(group: string, filter: AssetTypeFilter) {
  if (filter === "all") return true;
  const normalized = group.toLowerCase();
  const isLogos = normalized === LOGO_GROUP.toLowerCase();
  if (filter === "logos") return isLogos;
  if (filter === "funnel") return normalized.includes("funnel");
  if (filter === "timeline") return normalized.startsWith("time ·") || normalized.includes("journey");
  if (filter === "stat-wall") return normalized.startsWith("numbers ·");
  return !isLogos && !normalized.includes("funnel") && !normalized.startsWith("time ·") && !normalized.includes("journey") && !normalized.startsWith("numbers ·");
}

/** Extra words reviewers type that should match a layout's real name. */
const SEARCH_ALIASES: { test: (entry: DesignCatalogEntry) => boolean; words: string }[] = [
  {
    test: (d) => /LOGO/.test(d.variantId),
    words: "client logos logo wall brands partners customers proof marquee wordmarks",
  },
];

function searchHaystack(d: DesignCatalogEntry) {
  const extra = SEARCH_ALIASES.filter((a) => a.test(d)).map((a) => a.words).join(" ");
  return `${d.name} ${d.variantId} ${d.group} ${d.description} ${extra}`.toLowerCase();
}

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
  const [assetType, setAssetType] = useState<AssetTypeFilter>("all");
  const { presets, saveLook, clearLook } = useDesignGroupPresets();

  const current = DESIGN_CATALOG.find((d) => d.variantId === value);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return DESIGN_GROUPS
      .filter((g) => groupMatchesAssetType(g.group, assetType))
      .map((g) => ({
        group: g.group,
        entries: needle
          ? g.entries.filter((d) => searchHaystack(d).includes(needle))
          : g.entries,
      }))
      .filter((g) => g.entries.length > 0);
  }, [assetType, q]);


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
        <div className="flex items-center gap-1 overflow-x-auto border-b border-black/10 px-3 py-2" aria-label="Filter layouts by asset type">
          <Filter size={12} className="mr-1 shrink-0 text-black/35" aria-hidden="true" />
          {ASSET_TYPE_FILTERS.map((filter) => {
            const active = assetType === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={active}
                onClick={() => setAssetType(filter.value)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
                  active
                    ? "border-[#003FC7] bg-[#003FC7] text-white"
                    : "border-black/10 bg-white text-black/55 hover:border-[#003FC7]/60 hover:text-[#003FC7]"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <div className="max-h-[380px] overflow-y-auto p-3">
          {groups.map((g) => (
            <div key={g.group} className="mb-4 last:mb-0">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-black/40">
                {g.group}
                {presets[g.group] && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#003FC7]/10 px-1.5 py-0.5 text-[9px] tracking-normal text-[#003FC7]">
                    <Pin size={8} /> saved look
                  </span>
                )}
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
                      <span
                        role="button"
                        tabIndex={0}
                        title={
                          presets[d.group] === d.variantId
                            ? `Saved look for ${d.group} — click to forget`
                            : `Save as my default look for ${d.group}`
                        }
                        aria-label={
                          presets[d.group] === d.variantId
                            ? `Forget saved look for ${d.group}`
                            : `Save as default look for ${d.group}`
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          if (presets[d.group] === d.variantId) clearLook(d.group);
                          else saveLook(d.variantId);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          e.stopPropagation();
                          if (presets[d.group] === d.variantId) clearLook(d.group);
                          else saveLook(d.variantId);
                        }}
                        className={`absolute right-1.5 top-1.5 rounded-full border p-1 transition ${
                          presets[d.group] === d.variantId
                            ? "border-[#003FC7] bg-white text-[#003FC7]"
                            : "border-black/10 bg-white/85 text-black/35 opacity-0 hover:text-[#003FC7] group-hover:opacity-100"
                        }`}
                      >
                        {presets[d.group] === d.variantId ? <Pin size={10} /> : <PinOff size={10} />}
                      </span>
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

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  Clock,
  FileText,
  FolderOpen,
  Layers,
  Pencil,
  PenSquare,
  Rocket,
  Search,
  Trash2,
} from "lucide-react";
import type { BrandMode } from "@/lib/taxonomy";

export type PrintAssetSummary = {
  id: string;
  kind: string;
  title: string | null;
  brand_mode_id: string | null;
  status?: string | null;
  updated_at: string;
  created_at?: string;
};

const KIND_META: Record<string, { label: string; icon: React.ReactNode }> = {
  spotlight: { label: "Client Spotlight", icon: <Layers size={12} /> },
  "case-study": { label: "Case Study", icon: <FileText size={12} /> },
  ebrochure: { label: "E-Brochure", icon: <PenSquare size={12} /> },
  "adaptor-brief": { label: "Adaptor Brief", icon: <Rocket size={12} /> },
  "msa-partnership": { label: "MSA Partnership", icon: <Handshake size={12} /> },
};

export function PrintAssetDirectory({
  rows,
  brandModes,
  onDelete,
}: {
  rows: PrintAssetSummary[];
  brandModes: BrandMode[];
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (!q) return true;
      const brandName = brandModes.find((b) => b.id === r.brand_mode_id)?.name ?? "";
      return `${r.title ?? ""} ${brandName} ${r.kind}`.toLowerCase().includes(q);
    });
  }, [rows, query, kindFilter, brandModes]);

  const folders = useMemo(() => {
    const map = new Map<string, PrintAssetSummary[]>();
    for (const r of filtered) {
      const key = r.brand_mode_id ?? "unassigned";
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .map(([id, items]) => ({
        id,
        brand: brandModes.find((b) => b.id === id),
        items: items.sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
      }))
      .sort((a, b) => (a.brand?.name ?? "zzz").localeCompare(b.brand?.name ?? "zzz"));
  }, [filtered, brandModes]);

  const kinds = useMemo(() => Array.from(new Set(rows.map((r) => r.kind))), [rows]);

  return (
    <div>
      {/* Directory controls */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-icon-subtle"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search print materials by name or division…"
            aria-label="Search print materials"
            className="w-full rounded-full border border-black/15 bg-white py-2 pl-9 pr-3 text-xs text-[#03002C] outline-none focus:border-[#003FC7]"
          />
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {["all", ...kinds].map((k) => {
            const active = kindFilter === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] transition " +
                  (active
                    ? "border-[#003FC7] bg-[#003FC7] text-white"
                    : "border-black/15 bg-white text-black/60 hover:border-[#003FC7] hover:text-[#003FC7]")
                }
              >
                {k === "all" ? "All types" : (KIND_META[k]?.label ?? k)}
              </button>
            );
          })}
        </div>
      </div>

      {folders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center text-sm text-black/55">
          No print materials match that filter.
        </div>
      ) : (
        <div className="space-y-4">
          {folders.map((folder) => {
            const isCollapsed = collapsed[folder.id] ?? false;
            const accent = folder.brand?.tokens.accent ?? "#003FC7";
            const primary = folder.brand?.tokens.primary ?? "#03002C";
            return (
              <section
                key={folder.id}
                className="overflow-hidden rounded-2xl border border-black/10 bg-white"
              >
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [folder.id]: !isCollapsed }))}
                  aria-expanded={!isCollapsed}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-black/[0.02]"
                >
                  <span
                    aria-hidden
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}
                  >
                    <FolderOpen size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#03002C]">
                      {folder.brand?.name ?? "Unassigned division"}
                    </span>
                    <span className="block text-[11px] text-black/50">
                      {folder.items.length} print{" "}
                      {folder.items.length === 1 ? "material" : "materials"}
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    aria-hidden
                    className={
                      "text-icon-muted transition-transform " + (isCollapsed ? "-rotate-90" : "")
                    }
                  />
                </button>

                {isCollapsed ? null : (
                  <div className="grid grid-cols-1 gap-4 border-t border-black/5 p-4 md:grid-cols-2 xl:grid-cols-3">
                    {folder.items.map((row) => {
                      const meta = KIND_META[row.kind];
                      return (
                        <div
                          key={row.id}
                          className="group flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white transition hover:border-[#003FC7]/50 hover:shadow-md"
                        >
                          <div
                            className="relative h-20"
                            style={{
                              background: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`,
                            }}
                          >
                            <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#03002C]">
                              {meta?.icon} {meta?.label ?? row.kind}
                            </div>
                          </div>
                          <div className="flex flex-1 flex-col p-4">
                            <div className="line-clamp-2 text-sm font-medium text-[#03002C]">
                              {row.title || "Untitled"}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-black/50">
                              <Clock size={12} /> Updated{" "}
                              {new Date(row.updated_at).toLocaleDateString()}
                            </div>
                            <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                              <Link
                                to="/asset/$assetId"
                                params={{ assetId: row.id }}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#003FC7]/85"
                              >
                                <Pencil size={12} /> Open
                              </Link>
                              <button
                                type="button"
                                onClick={() => onDelete(row.id)}
                                aria-label={`Delete ${row.title || "print asset"}`}
                                className="inline-flex items-center gap-1 rounded-full border border-black/15 px-2.5 py-1.5 text-xs text-icon-muted hover:border-red-300 hover:text-red-600"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2, Bookmark, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { LazyMount } from "@/components/LazyMount";
import { SlideBackdropContext } from "@/components/slide/SlideChrome";
import { backdropForVariant } from "@/components/slide/variantBackdrop";
import { listMyModules, deleteSavedModule } from "@/lib/saved-modules.functions";
import { byId, MODULE_VARIANTS } from "@/lib/taxonomy";

export const Route = createFileRoute("/library/my")({
  head: () => ({
    meta: [
      { title: "My Modules · TransPerfect Modular" },
      { name: "description", content: "Your saved reusable module instances." },
    ],
  }),
  component: MyModules,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-red-600">My Modules failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

type SavedRow = {
  id: string;
  variant_id: string;
  save_kind: "populated" | "template";
  title: string;
  description: string | null;
  content: Record<string, unknown>;
  brand_mode: string | null;
  sub_company: string | null;
  division_id: string | null;
  backdrop: Record<string, unknown> | null;
  role: string | null;
  tags: string[];
  updated_at: string;
};

function MyModules() {
  const listFn = useServerFn(listMyModules);
  const delFn = useServerFn(deleteSavedModule);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["saved-modules"],
    queryFn: () => listFn(),
  });
  const rows = (data ?? []) as SavedRow[];

  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "populated" | "template">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const roles = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => { if (r.role) s.add(r.role); });
    return [...s].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (kindFilter !== "all" && r.save_kind !== kindFilter) return false;
      if (roleFilter !== "all" && r.role !== roleFilter) return false;
      if (!needle) return true;
      return (
        r.title.toLowerCase().includes(needle) ||
        (r.description ?? "").toLowerCase().includes(needle) ||
        r.variant_id.toLowerCase().includes(needle) ||
        r.tags.some((t) => t.toLowerCase().includes(needle))
      );
    });
  }, [rows, q, kindFilter, roleFilter]);

  const delMutation = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-modules"] }),
  });

  return (
    <AppShell>
      <div>
        <div className="flex items-center justify-between gap-4">
          <div className="text-xs uppercase tracking-[0.3em] text-black/50">Library · My Modules</div>
          <Link
            to="/library"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-black/70 transition hover:border-[#003FC7] hover:text-[#003FC7]"
          >
            ← All modules
          </Link>
        </div>
        <h1 className="mt-3 text-4xl font-semibold">Your saved modules.</h1>
        <p className="mt-3 max-w-2xl text-black/60">
          Reusable module instances you saved from previews or from live decks. Drop them into any deck, brochure, one-pager, or social surface.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-black/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, variant, or tag…"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 pl-8 text-sm shadow-sm focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/20"
            />
          </div>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All kinds</option>
            <option value="populated">Populated</option>
            <option value="template">Template</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All roles</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <span className="ml-auto text-xs text-black/50">{filtered.length} of {rows.length}</span>
        </div>

        <div className="mt-6">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-black/60">
              <Loader2 size={14} className="animate-spin" /> Loading your modules…
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {(error as Error).message}
            </div>
          )}
          {!isLoading && !error && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white/60 px-6 py-16 text-center">
              <Bookmark size={28} className="mx-auto text-black/30" />
              <div className="mt-3 text-sm font-medium text-black/70">
                {rows.length === 0 ? "No saved modules yet." : "No modules match your filters."}
              </div>
              <div className="mt-1 text-xs text-black/50">
                Preview any variant in the <Link to="/library" className="underline">Library</Link> and hit “Save as module”.
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((row) => (
              <SavedModuleCard
                key={row.id}
                row={row}
                onDelete={() => {
                  if (window.confirm(`Delete “${row.title}”?`)) delMutation.mutate(row.id);
                }}
                deleting={delMutation.isPending && delMutation.variables === row.id}
              />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SavedModuleCard({ row, onDelete, deleting }: { row: SavedRow; onDelete: () => void; deleting: boolean }) {
  const variant = byId(MODULE_VARIANTS, row.variant_id);
  const backdrop = backdropForVariant(row.variant_id);
  const content = row.content && Object.keys(row.content).length > 0 ? row.content : {};

  return (
    <div className="glass overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="relative aspect-[16/9] bg-[#0a0a1a]">
        <LazyMount>
          <SlideBackdropContext.Provider value={backdrop}>
            <ScaledSlide>
              {variant ? (
                <VariantRenderer
                  variant={variant}
                  content={content}
                  mode="light"
                  layoutId={variant.permittedLayoutIds[0]}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/70">
                  Variant not found: {row.variant_id}
                </div>
              )}
            </ScaledSlide>
          </SlideBackdropContext.Provider>
        </LazyMount>
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className="rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] text-white/90">
            {row.variant_id}
          </span>
          {row.save_kind === "template" && (
            <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
              Template
            </span>
          )}
        </div>
      </div>
      <div className="px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{row.title}</div>
            {row.description && (
              <div className="mt-0.5 line-clamp-2 text-xs text-black/60">{row.description}</div>
            )}
          </div>
          <button
            onClick={onDelete}
            disabled={deleting}
            aria-label="Delete"
            className="rounded-full border border-black/10 p-1.5 text-black/40 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {row.role && (
            <span className="rounded-full bg-[#003FC7]/10 px-2 py-0.5 text-[10px] font-medium text-[#003FC7]">
              {row.role}
            </span>
          )}
          {row.division_id && (
            <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] text-black/60">
              {row.division_id}
            </span>
          )}
          {row.tags.map((t) => (
            <span key={t} className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] text-black/60">#{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

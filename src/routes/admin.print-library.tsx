import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  listApprovedPrintVariants,
  publishAssetToLibrary,
  updateApprovedPrintVariant,
  deleteApprovedPrintVariant,
  listPrintVariantSuggestions,
  reviewPrintVariantSuggestion,
} from "@/lib/approved-print-variants.functions";
import { listMyPrintAssets } from "@/lib/print-assets.functions";
import type { PrintAssetKind } from "@/lib/print-assets.types";
import { Sparkle, Trash2, ArrowUpCircle, ArrowDownCircle, Archive, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/print-library")({
  head: () => ({ meta: [{ title: "Print library curator · Admin" }] }),
  component: PrintLibraryCurator,
});

const KINDS: { id: PrintAssetKind; label: string }[] = [
  { id: "spotlight", label: "Client Spotlight" },
  { id: "ebrochure", label: "E-Brochure" },
  { id: "adaptor-brief", label: "Adaptor Brief" },
  { id: "case-study", label: "Case Study" },
];

function PrintLibraryCurator() {
  const listFn = useServerFn(listApprovedPrintVariants);
  const publishFn = useServerFn(publishAssetToLibrary);
  const updateFn = useServerFn(updateApprovedPrintVariant);
  const delFn = useServerFn(deleteApprovedPrintVariant);
  const myAssetsFn = useServerFn(listMyPrintAssets);
  const listSugFn = useServerFn(listPrintVariantSuggestions);
  const reviewSugFn = useServerFn(reviewPrintVariantSuggestion);
  const qc = useQueryClient();

  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<PrintAssetKind | "all">("all");

  const variants = useQuery({
    queryKey: ["approved-print-variants", "admin", divisionFilter, kindFilter],
    queryFn: () =>
      listFn({
        data: {
          divisionId: divisionFilter === "all" ? undefined : divisionFilter,
          templateKind: kindFilter === "all" ? undefined : (kindFilter as PrintAssetKind),
          includeAll: true,
        },
      }),
  });
  const myAssets = useQuery({ queryKey: ["print-assets", "mine", "admin-picker"], queryFn: () => myAssetsFn() });
  const suggestions = useQuery({
    queryKey: ["print-variant-suggestions", "pending"],
    queryFn: () => listSugFn({ data: { status: "pending" } }),
  });

  const publishMutation = useMutation({
    mutationFn: (input: { assetId: string; divisionId: string | null; title?: string }) =>
      publishFn({ data: input }),
    onSuccess: () => {
      toast.success("Published to approved library");
      qc.invalidateQueries({ queryKey: ["approved-print-variants"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Publish failed"),
  });

  const patchMutation = useMutation({
    mutationFn: (input: { id: string; patch: Parameters<typeof updateFn>[0] extends { data: infer D } ? (D extends { patch: infer P } ? P : never) : never }) =>
      updateFn({ data: { id: input.id, patch: input.patch } as never }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approved-print-variants"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed from library");
      qc.invalidateQueries({ queryKey: ["approved-print-variants"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const reviewMutation = useMutation({
    mutationFn: (input: { id: string; status: "approved" | "rejected" }) => reviewSugFn({ data: input }),
    onSuccess: () => {
      toast.success("Reviewed");
      qc.invalidateQueries({ queryKey: ["print-variant-suggestions"] });
    },
  });

  // Publish picker state
  const [pickerAsset, setPickerAsset] = useState<string>("");
  const [pickerDivision, setPickerDivision] = useState<string>("");
  const [pickerTitle, setPickerTitle] = useState<string>("");

  const canRender = !(variants.error && isForbidden(variants.error));
  if (!canRender) return <AdminForbidden />;

  const rows = variants.data ?? [];
  const grouped = useMemo(() => {
    const m = new Map<PrintAssetKind, typeof rows>();
    for (const r of rows) {
      const arr = m.get(r.template_kind) ?? [];
      arr.push(r);
      m.set(r.template_kind, arr);
    }
    return m;
  }, [rows]);

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/50">Admin · Print library</div>
        <h1 className="mt-2 text-3xl font-semibold text-[#03002C] dark:text-white">Approved print variants.</h1>
        <p className="mt-2 max-w-2xl text-sm text-black/60 dark:text-white/60">
          Curate a shelf of division-approved templates. Users see published variants under each base template on{" "}
          <span className="font-mono text-[12px]">/library/print</span>.
        </p>
      </header>

      {/* Publish new snapshot */}
      <section className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#03002C] dark:text-white">
          <Sparkle size={14} /> Publish an existing asset as an approved variant
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="text-xs">
            <div className="mb-1 uppercase tracking-wider text-black/50">Source asset</div>
            <select
              value={pickerAsset}
              onChange={(e) => setPickerAsset(e.target.value)}
              className="w-full rounded-md border border-black/15 bg-white p-2 text-sm"
            >
              <option value="">Select a print asset…</option>
              {(myAssets.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.kind}] {a.title || "Untitled"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <div className="mb-1 uppercase tracking-wider text-black/50">Division</div>
            <select
              value={pickerDivision}
              onChange={(e) => setPickerDivision(e.target.value)}
              className="w-full rounded-md border border-black/15 bg-white p-2 text-sm"
            >
              <option value="">(from source asset)</option>
              {BRAND_MODES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs md:col-span-2">
            <div className="mb-1 uppercase tracking-wider text-black/50">Title override (optional)</div>
            <input
              value={pickerTitle}
              onChange={(e) => setPickerTitle(e.target.value)}
              className="w-full rounded-md border border-black/15 bg-white p-2 text-sm"
              placeholder="Auto-filled from source title"
            />
          </label>
        </div>
        <div className="mt-4">
          <button
            type="button"
            disabled={!pickerAsset || publishMutation.isPending}
            onClick={() =>
              publishMutation.mutate(
                {
                  assetId: pickerAsset,
                  divisionId: pickerDivision || null,
                  title: pickerTitle || undefined,
                },
                {
                  onSuccess: () => {
                    setPickerAsset("");
                    setPickerTitle("");
                  },
                },
              )
            }
            className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            <ArrowUpCircle size={12} /> Publish to library
          </button>
        </div>
      </section>

      {/* Suggestions inbox */}
      {(suggestions.data?.length ?? 0) > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="mb-3 text-sm font-semibold text-amber-900">
            Pending suggestions ({suggestions.data!.length})
          </div>
          <div className="space-y-2">
            {suggestions.data!.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-3 text-sm">
                <div>
                  <div className="font-mono text-[11px] text-black/60">Asset {s.asset_id.slice(0, 8)}…</div>
                  {s.note ? <div className="mt-1 text-black/70">{s.note}</div> : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => reviewMutation.mutate({ id: s.id, status: "approved" })}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-xs text-white"
                  >
                    <CheckCircle2 size={11} /> Approve
                  </button>
                  <button
                    onClick={() => reviewMutation.mutate({ id: s.id, status: "rejected" })}
                    className="inline-flex items-center gap-1 rounded-full border border-black/20 px-2.5 py-1 text-xs"
                  >
                    <XCircle size={11} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3 border-b border-black/10 pb-4">
        <div className="text-xs uppercase tracking-[0.24em] text-black/50">Filter</div>
        <select
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
          className="rounded-md border border-black/15 bg-white px-2 py-1 text-sm"
        >
          <option value="all">All divisions</option>
          {BRAND_MODES.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as PrintAssetKind | "all")}
          className="rounded-md border border-black/15 bg-white px-2 py-1 text-sm"
        >
          <option value="all">All templates</option>
          {KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <div className="ml-auto text-xs text-black/50">{rows.length} variants</div>
      </section>

      {/* Grouped list */}
      {variants.isLoading ? (
        <div className="text-sm text-black/50">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center text-sm text-black/60">
          No approved variants yet. Publish one above to seed the shelf.
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([kind, list]) => (
            <div key={kind}>
              <div className="mb-2 text-xs uppercase tracking-[0.24em] text-black/50">
                {KINDS.find((k) => k.id === kind)?.label ?? kind} · {list.length}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {list.map((v) => {
                  const brand = BRAND_MODES.find((b) => b.id === v.division_id);
                  return (
                    <div key={v.id} className="rounded-xl border border-black/10 bg-white p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-1 text-sm font-medium text-[#03002C]">{v.title}</div>
                          <div className="mt-0.5 text-[11px] text-black/50">
                            {brand?.name ?? "No division"} ·{" "}
                            <span className={v.status === "published" ? "text-emerald-700" : "text-black/40"}>
                              {v.status}
                            </span>{" "}
                            · {v.duplicate_count} uses · {v.download_count} DL
                          </div>
                        </div>
                        <span
                          aria-hidden
                          className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
                          style={{ background: brand?.tokens.accent ?? "#003FC7" }}
                        />
                      </div>
                      {v.description ? (
                        <div className="mt-2 line-clamp-2 text-[11px] text-black/60">{v.description}</div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {v.status !== "published" ? (
                          <button
                            onClick={() => patchMutation.mutate({ id: v.id, patch: { status: "published" } as never })}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] text-white"
                          >
                            <ArrowUpCircle size={10} /> Publish
                          </button>
                        ) : (
                          <button
                            onClick={() => patchMutation.mutate({ id: v.id, patch: { status: "draft" } as never })}
                            className="inline-flex items-center gap-1 rounded-full border border-black/15 px-2.5 py-1 text-[11px] text-black/60"
                          >
                            <ArrowDownCircle size={10} /> Unpublish
                          </button>
                        )}
                        <button
                          onClick={() => patchMutation.mutate({ id: v.id, patch: { status: "archived" } as never })}
                          className="inline-flex items-center gap-1 rounded-full border border-black/15 px-2.5 py-1 text-[11px] text-black/60"
                        >
                          <Archive size={10} /> Archive
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Delete this approved variant permanently?")) delMutation.mutate(v.id);
                          }}
                          className="ml-auto inline-flex items-center gap-1 rounded-full border border-black/15 px-2.5 py-1 text-[11px] text-red-600 hover:border-red-300"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ALL_BRANDS,
  countSampleStyle,
  extractSampleStyle,
  useVariantSampleMutations,
} from "@/hooks/use-variant-samples";
import { MODULE_VARIANTS, variantsForSection } from "@/lib/taxonomy";
import type { BrandMode, ModuleVariant } from "@/lib/taxonomy";

/**
 * Push the style layer of the slide you just styled onto many variants at
 * once. Copy never travels — only colours and per-mode ink — so each target
 * keeps its own words while the look becomes consistent instantly.
 */
export function BulkStylePanel({
  variant,
  brand,
  brandName,
  sectionId,
  draft,
  scopeToBrand,
}: {
  variant: ModuleVariant;
  brand: BrandMode;
  brandName: string;
  sectionId: string;
  /** Current studio draft — the style source. */
  draft: Record<string, unknown>;
  /** Studio's save scope, used as the default target scope. */
  scopeToBrand: boolean;
}) {
  const { bulkStyle } = useVariantSampleMutations();
  const style = useMemo(() => extractSampleStyle(draft ?? {}), [draft]);
  const ruleCount = countSampleStyle(style);

  const sectionVariants = useMemo(
    () => variantsForSection(sectionId).filter((v) => v.id !== variant.id),
    [sectionId, variant.id],
  );
  const familyVariants = useMemo(
    () => MODULE_VARIANTS.filter((v) => v.familyId === variant.familyId && v.id !== variant.id),
    [variant.familyId, variant.id],
  );

  const [scope, setScope] = useState<"brand" | "all">(scopeToBrand ? "brand" : "all");
  const [replace, setReplace] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [pool, setPool] = useState<"section" | "family" | "library">("section");

  const list = useMemo(() => {
    if (pool === "family") return familyVariants;
    if (pool === "library") return MODULE_VARIANTS.filter((v) => v.id !== variant.id);
    return sectionVariants;
  }, [pool, familyVariants, sectionVariants, variant.id]);

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const visibleIds = list.map((v) => v.id);
  const allVisiblePicked = visibleIds.length > 0 && visibleIds.every((id) => picked.includes(id));

  async function apply(targetIds: string[], what: string) {
    if (ruleCount === 0) {
      toast.warning("No style edits to apply", {
        description: "Recolour text or a scope in the Copy tab first.",
      });
      return;
    }
    if (targetIds.length === 0) {
      toast.warning("Pick at least one slide to update");
      return;
    }
    try {
      const res = await bulkStyle.mutateAsync({
        style,
        replace,
        label: `Bulk style from ${variant.id}`,
        targets: targetIds.map((id) => ({
          variantId: id,
          brandModeId: scope === "brand" ? brand.id : ALL_BRANDS,
        })),
      });
      toast.success(`Style applied to ${res.applied} slide${res.applied === 1 ? "" : "s"}`, {
        description:
          (res.failed.length ? `${res.failed.length} could not be written. ` : "") +
          `${what} · ${scope === "brand" ? brandName : "every division"}`,
      });
    } catch (err) {
      toast.error("Bulk apply failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-1 text-[10px] transition ${
      active
        ? "border-white bg-white text-[#03002C] font-semibold"
        : "border-white/25 text-white/65 hover:border-white/50 hover:text-white"
    }`;

  return (
    <div className="mt-3 space-y-3 text-[11px]">
      <div className="rounded-lg border border-white/10 bg-[#03002C]/40 p-3">
        <div className="font-semibold uppercase tracking-widest text-white/45">Style to push</div>
        <p className="mt-1.5 text-white/60">
          {ruleCount === 0
            ? "No colour overrides on this slide yet — recolour text in the Copy tab, then bulk apply."
            : `${ruleCount} colour rule${ruleCount === 1 ? "" : "s"} from ${variant.name}. Copy stays untouched on every target.`}
        </p>
        <label className="mt-2 flex items-center gap-2 text-white/70">
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
          Replace each target's existing colours (otherwise merge)
        </label>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#03002C]/40 p-3">
        <div className="font-semibold uppercase tracking-widest text-white/45">Apply for</div>
        <div className="mt-2 flex gap-1.5">
          <button type="button" onClick={() => setScope("brand")} className={chip(scope === "brand")}>
            {brandName} only
          </button>
          <button type="button" onClick={() => setScope("all")} className={chip(scope === "all")}>
            Every division
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#03002C]/40 p-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold uppercase tracking-widest text-white/45">Target slides</div>
          <button
            type="button"
            onClick={() => setPicked(allVisiblePicked ? [] : visibleIds)}
            className="text-[10px] underline decoration-dotted text-white/60 hover:text-white"
          >
            {allVisiblePicked ? "clear" : "select all"}
          </button>
        </div>
        <div className="mt-2 flex gap-1.5">
          {(["section", "family", "library"] as const).map((p) => (
            <button key={p} type="button" onClick={() => setPool(p)} className={chip(pool === p)}>
              {p === "section" ? "This section" : p === "family" ? "Same family" : "Whole library"}
            </button>
          ))}
        </div>
        <div className="mt-2 max-h-60 space-y-1 overflow-y-auto pr-1">
          {list.length === 0 && <p className="text-white/45">No other slides in this group.</p>}
          {list.map((v) => (
            <label
              key={v.id}
              className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-white/75 hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={picked.includes(v.id)}
                onChange={() => toggle(v.id)}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block truncate font-medium text-white">{v.name}</span>
                <span className="block font-mono text-[9px] text-white/40">{v.id}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => apply(picked, `${picked.length} selected slide${picked.length === 1 ? "" : "s"}`)}
          disabled={bulkStyle.isPending || ruleCount === 0 || picked.length === 0}
          className="w-full rounded-full bg-[#003FC7] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
        >
          {bulkStyle.isPending ? "Applying…" : `Apply to ${picked.length} selected`}
        </button>
        <button
          type="button"
          onClick={() => {
            const all = MODULE_VARIANTS.filter((v) => v.id !== variant.id).map((v) => v.id);
            if (
              !window.confirm(
                `Apply these colours to all ${all.length} library slides for ${
                  scope === "brand" ? brandName : "every division"
                }?`,
              )
            )
              return;
            void apply(all, "whole library");
          }}
          disabled={bulkStyle.isPending || ruleCount === 0}
          className="w-full rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-white/80 hover:border-white/60 hover:text-white disabled:opacity-40"
        >
          Apply to the whole {scope === "brand" ? brandName : "library"} ({MODULE_VARIANTS.length - 1})
        </button>
        <p className="text-[10px] text-white/40">
          Every target gets a restore point, so a bulk push can be rolled back per slide from its
          History tab.
        </p>
      </div>
    </div>
  );
}

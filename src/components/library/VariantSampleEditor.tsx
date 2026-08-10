// Master-admin editor for a module variant's library sample slide.
//
// The library preview normally renders deterministic seeded copy. An admin can
// rewrite any text field here; the draft live-updates the preview above and can
// be saved as the curated sample (globally, or for one brand mode only).

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ALL_BRANDS, useVariantSampleMutations } from "@/hooks/use-variant-samples";

export function collectStringPaths(v: unknown, prefix = ""): string[] {
  if (typeof v === "string") return v.trim() ? [prefix] : [];
  if (Array.isArray(v)) {
    const out: string[] = [];
    v.forEach((item, i) => out.push(...collectStringPaths(item, `${prefix}[${i}]`)));
    return out;
  }
  if (v && typeof v === "object") {
    const out: string[] = [];
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out.push(...collectStringPaths(val, prefix ? `${prefix}.${k}` : k));
    }
    return out;
  }
  return [];
}

function pathParts(path: string): (string | number)[] {
  return path.split(".").flatMap((p) => {
    const m = /^([^[]+)((\[\d+\])+)?$/.exec(p);
    if (!m) return [p];
    const out: (string | number)[] = [m[1] as string];
    for (const idx of m[2]?.match(/\d+/g) ?? []) out.push(Number(idx));
    return out;
  });
}

export function readPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of pathParts(path)) {
    if (cur == null) return undefined;
    cur = (cur as Record<string | number, unknown>)[key];
  }
  return cur;
}

export function setPath<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const parts = pathParts(path);
  const clone = structuredClone(obj);
  let cur: unknown = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = (cur as Record<string | number, unknown>)[parts[i] as string | number];
    if (cur == null) return clone;
  }
  (cur as Record<string | number, unknown>)[parts[parts.length - 1] as string | number] = value;
  return clone;
}

export function fieldLabel(path: string): string {
  return path.replace(/\[(\d+)\]/g, (_m, i) => ` ${Number(i) + 1}`).replace(/\./g, " · ");
}

export function VariantSampleEditor({
  variantId,
  brandModeId,
  brandName,
  seeded,
  draft,
  onDraftChange,
  hasSavedSample,
}: {
  variantId: string;
  brandModeId: string;
  brandName: string;
  /** Generated content with no curated override applied. */
  seeded: Record<string, unknown>;
  /** Currently previewed content (seeded + saved sample + local edits). */
  draft: Record<string, unknown>;
  onDraftChange: (next: Record<string, unknown> | null) => void;
  hasSavedSample: boolean;
}) {
  const { save, reset } = useVariantSampleMutations();
  const [scopeToBrand, setScopeToBrand] = useState(brandModeId !== ALL_BRANDS ? false : false);
  const [dirty, setDirty] = useState(false);

  // A different module was opened — drop local dirty state.
  useEffect(() => {
    setDirty(false);
  }, [variantId, brandModeId]);

  const fields = useMemo(() => collectStringPaths(draft), [draft]);

  const busy = save.isPending || reset.isPending;

  async function handleSave() {
    try {
      await save.mutateAsync({
        variantId,
        brandModeId: scopeToBrand ? brandModeId : ALL_BRANDS,
        content: draft,
      });
      setDirty(false);
      toast.success("Sample slide saved", {
        description: scopeToBrand ? `Applies to ${brandName} only` : "Applies to every brand mode",
      });
    } catch (err) {
      toast.error("Could not save sample", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  async function handleReset() {
    try {
      await reset.mutateAsync({
        variantId,
        brandModeId: scopeToBrand ? brandModeId : ALL_BRANDS,
      });
      onDraftChange(null);
      setDirty(false);
      toast.success("Reverted to generated sample");
    } catch (err) {
      toast.error("Could not reset sample", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return (
    <div className="rounded-xl border border-[#003FC7]/25 bg-[#003FC7]/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#003FC7]">
            Master admin · Edit sample slide
          </div>
          <p className="mt-0.5 text-xs text-black/60">
            {hasSavedSample
              ? "This module shows curated copy in the library."
              : "Editing the generated sample copy for this module."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || !dirty}
            className="rounded-full bg-[#003FC7] px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
          >
            {save.isPending ? "Saving…" : "Save sample"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={busy || (!hasSavedSample && !dirty)}
            className="rounded-full border border-black/15 bg-white px-3 py-1 text-xs font-medium text-black/70 hover:border-red-300 hover:text-red-700 disabled:opacity-40"
          >
            {reset.isPending ? "Resetting…" : "Reset"}
          </button>
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-black/70">
        <input
          type="checkbox"
          checked={scopeToBrand}
          onChange={(e) => setScopeToBrand(e.target.checked)}
        />
        Save for <span className="font-semibold">{brandName}</span> only (otherwise all brand modes)
      </label>

      <div className="mt-3 max-h-[38vh] space-y-2 overflow-y-auto pr-1">
        {fields.length === 0 && (
          <p className="text-xs text-black/50">This module has no editable text fields.</p>
        )}
        {fields.map((path) => {
          const value = String(readPath(draft, path) ?? "");
          const seedValue = String(readPath(seeded, path) ?? "");
          const changed = value !== seedValue;
          return (
            <label key={path} className="block">
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-black/45">
                {fieldLabel(path)}
                {changed && <span className="text-[#003FC7]">• edited</span>}
              </span>
              <textarea
                value={value}
                rows={value.length > 70 ? 3 : 1}
                onChange={(e) => {
                  onDraftChange(setPath(draft, path, e.target.value));
                  setDirty(true);
                }}
                className="mt-1 w-full resize-y rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-sm text-[#03002C] focus:border-[#003FC7] focus:outline-none"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

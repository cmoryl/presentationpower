// Full-screen slide studio for library module samples.
//
// Gives master admins the same editing surface the deck editor has:
// click-to-edit copy on the rendered slide (LiveEditOverlay), per-field and
// per-scope text colours, light/dark mode, background imagery toggle, a field
// inspector with per-field revert, and save / reset of the curated sample
// (all brand modes or a single division).

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { LiveEditOverlay } from "@/components/slide/LiveEditOverlay";
import { SlideBackdropContext, backdropForVariant } from "@/components/slide/variantBackdrop";
import {
  ALL_BRANDS,
  INK_KEY,
  INK_SCOPE_KEY,
  splitSampleContent,
  useVariantSampleMutations,
} from "@/hooks/use-variant-samples";
import {
  collectStringPaths,
  fieldLabel,
  readPath,
  setPath,
} from "@/components/library/VariantSampleEditor";
import type { ModuleVariant } from "@/lib/taxonomy";
import type { BrandMode } from "@/lib/brand";
import type { DeckSlide, SlideMode } from "@/lib/deck-store";

export function VariantSampleStudio({
  variant,
  brand,
  brandName,
  sectionId,
  seeded,
  draft,
  onDraftChange,
  hasSavedSample,
  onClose,
}: {
  variant: ModuleVariant;
  brand: BrandMode;
  brandName: string;
  sectionId: string;
  /** Generated content with no curated override applied (copy only). */
  seeded: Record<string, unknown>;
  /** Current draft = seeded + saved sample + local edits (may carry ink keys). */
  draft: Record<string, unknown>;
  onDraftChange: (next: Record<string, unknown> | null) => void;
  hasSavedSample: boolean;
  onClose: () => void;
}) {
  const { save, reset } = useVariantSampleMutations();
  const [liveEdit, setLiveEdit] = useState(true);
  const [mode, setMode] = useState<SlideMode>("light");
  const [showImagery, setShowImagery] = useState(true);
  const [scopeToBrand, setScopeToBrand] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { copy, ink } = useMemo(() => splitSampleContent(draft), [draft]);
  const fields = useMemo(() => collectStringPaths(copy), [copy]);
  const busy = save.isPending || reset.isPending;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // While live editing, Escape should only blur the focused field.
      const el = document.activeElement as HTMLElement | null;
      if (el?.isContentEditable) {
        el.blur();
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const patch = (next: Record<string, unknown>) => {
    onDraftChange(next);
    setDirty(true);
  };

  const setInk = (path: string, color: string | null) => {
    const map = { ...(ink.inkOverrides ?? {}) };
    if (color) map[path] = color;
    else delete map[path];
    patch({ ...draft, [INK_KEY]: map });
  };

  const setInkScope = (scope: string, color: string | null) => {
    const map = { ...(ink.inkScopeOverrides ?? {}) };
    if (color) map[scope] = color;
    else delete map[scope];
    patch({ ...draft, [INK_SCOPE_KEY]: map });
  };

  const previewSlide: DeckSlide = {
    id: `${variant.id}:studio`,
    position: 0,
    sectionId,
    variantId: variant.id,
    layoutId: variant.permittedLayoutIds[0] as string,
    content: copy,
    changes: [],
  } as DeckSlide;

  const backdrop = useMemo(
    () => (mode === "dark" || showImagery ? backdropForVariant(variant, brand.id, mode) : null),
    [variant, brand.id, mode, showImagery],
  );

  async function handleSave() {
    try {
      await save.mutateAsync({
        variantId: variant.id,
        brandModeId: scopeToBrand ? brand.id : ALL_BRANDS,
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
        variantId: variant.id,
        brandModeId: scopeToBrand ? brand.id : ALL_BRANDS,
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

  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1 text-[11px] font-medium transition ${
      active
        ? "border-white/80 bg-white text-[#03002C]"
        : "border-white/25 bg-white/5 text-white/70 hover:border-white/50 hover:text-white"
    }`;

  return (
    <div
      role="dialog"
      aria-label={`Slide studio · ${variant.name}`}
      className="fixed inset-0 z-[70] flex flex-col bg-[#03002C]/96 backdrop-blur-xl"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-3">
        <div className="mr-auto min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/45">
            Slide studio · {variant.id}
          </div>
          <div className="truncate text-sm font-semibold text-white">{variant.name}</div>
        </div>

        <button type="button" onClick={() => setLiveEdit((v) => !v)} className={pill(liveEdit)}>
          ✎ Live edit {liveEdit ? "on" : "off"}
        </button>
        <div className="flex overflow-hidden rounded-full border border-white/25">
          <button
            type="button"
            onClick={() => setMode("light")}
            aria-pressed={mode === "light"}
            className={`px-3 py-1 text-[11px] ${mode === "light" ? "bg-white text-[#03002C]" : "text-white/65"}`}
          >
            ☀ Light
          </button>
          <button
            type="button"
            onClick={() => setMode("dark")}
            aria-pressed={mode === "dark"}
            className={`px-3 py-1 text-[11px] ${mode === "dark" ? "bg-white text-[#03002C]" : "text-white/65"}`}
          >
            ☾ Dark
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowImagery((v) => !v)}
          aria-pressed={showImagery}
          className={pill(showImagery)}
        >
          ▤ Imagery
        </button>
        <span className="mx-1 h-5 w-px bg-white/15" aria-hidden="true" />
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !dirty}
          className="rounded-full bg-[#003FC7] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          {save.isPending ? "Saving…" : "Save sample"}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={busy || (!hasSavedSample && !dirty)}
          className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-medium text-white/75 hover:border-red-400/70 hover:text-red-300 disabled:opacity-40"
        >
          {reset.isPending ? "Resetting…" : "Reset"}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close slide studio"
          className="rounded-full border border-white/25 px-3 py-1.5 text-xs text-white/75 hover:border-white/60 hover:text-white"
        >
          ✕ Close
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5 lg:flex-row">
        {/* Stage */}
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div
            className={`w-full max-w-[1400px] overflow-hidden rounded-xl border shadow-2xl ${
              mode === "dark" ? "border-white/15 bg-[#03002C]" : "border-black/10 bg-white"
            }`}
          >
            <LiveEditOverlay
              enabled={liveEdit}
              slideId={previewSlide.id}
              content={copy}
              editableFields={variant.editableFields}
              inkOverrides={ink.inkOverrides}
              inkScopeOverrides={ink.inkScopeOverrides}
              onChange={(cp, value) => patch(setPath(draft, cp, value))}
              onSetInkColor={(cp, color) => setInk(cp, color)}
              onClearInkColor={(cp) => setInk(cp, null)}
              onSetInkScopeColor={(sc, color) => setInkScope(sc, color)}
              onClearInkScopeColor={(sc) => setInkScope(sc, null)}
            >
              <ScaledSlide className={mode === "dark" ? "bg-[#03002C]" : "bg-white"}>
                <SlideBackdropContext.Provider value={backdrop}>
                  <VariantRenderer
                    slide={previewSlide}
                    variant={variant}
                    brand={brand}
                    pageNumber={1}
                    mode={mode}
                  />
                </SlideBackdropContext.Provider>
              </ScaledSlide>
            </LiveEditOverlay>
          </div>
        </div>

        {/* Inspector */}
        <aside className="min-h-0 w-full shrink-0 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.04] p-4 lg:w-[340px]">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
            Field inspector
          </div>
          <p className="mt-1 text-[11px] text-white/50">
            {liveEdit
              ? "Click any text on the slide to edit in place, or type here."
              : "Live edit is off — type here to change copy."}
          </p>

          <label className="mt-3 flex items-center gap-2 text-[11px] text-white/70">
            <input
              type="checkbox"
              checked={scopeToBrand}
              onChange={(e) => setScopeToBrand(e.target.checked)}
            />
            Save for <span className="font-semibold text-white">{brandName}</span> only
          </label>

          <div className="mt-3 space-y-2">
            {fields.length === 0 && (
              <p className="text-[11px] text-white/45">This module has no editable text fields.</p>
            )}
            {fields.map((path) => {
              const value = String(readPath(copy, path) ?? "");
              const seedValue = String(readPath(seeded, path) ?? "");
              const changed = value !== seedValue;
              const color = ink.inkOverrides?.[path];
              return (
                <div key={path}>
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
                    <span className="truncate">{fieldLabel(path)}</span>
                    {color && (
                      <span
                        aria-label={`Colour ${color}`}
                        className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-white/40"
                        style={{ backgroundColor: color }}
                      />
                    )}
                    {changed && (
                      <button
                        type="button"
                        onClick={() => patch(setPath(draft, path, seedValue))}
                        className="ml-auto rounded-full border border-white/20 px-1.5 text-[9px] text-white/60 hover:border-white/50 hover:text-white"
                        title="Revert this field to the generated copy"
                      >
                        revert
                      </button>
                    )}
                  </div>
                  <textarea
                    value={value}
                    rows={value.length > 70 ? 3 : 1}
                    onChange={(e) => patch(setPath(draft, path, e.target.value))}
                    className="mt-1 w-full resize-y rounded-lg border border-white/15 bg-[#03002C]/60 px-2.5 py-1.5 text-sm text-white focus:border-[#A1FBF9] focus:outline-none"
                  />
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

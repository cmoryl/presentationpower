// Open Canvas Studio — a blank-slide, free-composition builder for admins.
// Preset modules, text fields, stat blocks, imagery and colour surfaces are all
// draggable onto one 1920×1080 stage and can be mixed freely.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { BRAND_MODES } from "@/lib/taxonomy";
import { useImageDrop } from "@/hooks/use-image-drop";
import { StudioPalette, type DragPayload } from "@/components/studio/StudioPalette";
import { StudioInspector } from "@/components/studio/StudioInspector";
import { CanvasStage } from "@/components/studio/CanvasStage";
import { StudioLayers } from "@/components/studio/StudioLayers";
import { saveModule, updateSavedModule } from "@/lib/saved-modules.functions";
import {
  STAGE_H,
  STAGE_W,
  makeItem,
  useCanvasStudio,
  type CanvasItem,
} from "@/lib/canvas-studio";

export const Route = createFileRoute("/admin_/canvas")({
  head: () => ({
    meta: [
      { title: "Open Canvas Studio · Admin · TransPerfect" },
      {
        name: "description",
        content:
          "Compose slides from scratch: drag preset modules, text fields, stat blocks and imagery onto one free-form 1920×1080 canvas.",
      },
      { property: "og:title", content: "Open Canvas Studio · TransPerfect" },
      {
        property: "og:description",
        content: "Free-form slide composition for admins — mix and match any preset module.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CanvasStudioPage,
});

function CanvasStudioPage() {
  const {
    compositions,
    activeId,
    selectedIds,
    createComposition,
    duplicateComposition,
    deleteComposition,
    setActive,
    patchComposition,
    addItem,
    patchItem,
    removeItem,
    duplicateItem,
    reorderItem,
    setSelected,
    clearItems,
  } = useCanvasStudio();

  const [brandId, setBrandId] = useState(BRAND_MODES[0]?.id ?? "");
  const [snapOn, setSnapOn] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  const comp = useMemo(
    () => compositions.find((c) => c.id === activeId) ?? compositions[0] ?? null,
    [compositions, activeId],
  );

  // Ensure there is always something to draw on.
  useEffect(() => {
    if (!comp) createComposition("Untitled slide", brandId);
  }, [comp, createComposition, brandId]);

  const brand = useMemo(
    () => BRAND_MODES.find((b) => b.id === (comp?.brandId ?? brandId)) ?? BRAND_MODES[0]!,
    [comp?.brandId, brandId],
  );

  const selectedItem = comp?.items.find((i) => i.id === selectedIds[0]) ?? null;

  const place = (payload: DragPayload, at: { x: number; y: number }) => {
    if (!comp) return;
    const item =
      payload.kind === "module"
        ? makeItem("module", at, { variantId: payload.variantId }, comp.items)
        : makeItem(payload.type, at, {}, comp.items);
    addItem(comp.id, item);
  };

  const imageDrop = useImageDrop({
    onApply: ({ url }, index) => {
      if (!comp) return;
      addItem(
        comp.id,
        makeItem(
          "image",
          { x: STAGE_W / 2 + index * 60, y: STAGE_H / 2 + index * 60 },
          { url },
          comp.items,
        ),
      );
    },
    defaultAddToLibrary: false,
  });

  const saveFn = useServerFn(saveModule);
  const updateFn = useServerFn(updateSavedModule);

  const saveToFiles = useMutation({
    mutationFn: async () => {
      if (!comp) throw new Error("Nothing to save");
      const payload = {
        variantId: `open-canvas:${comp.id}`,
        saveKind: "template" as const,
        title: comp.name?.trim() || "Untitled canvas slide",
        description: `Open Canvas composition · ${comp.items.length} layer${
          comp.items.length === 1 ? "" : "s"
        }`,
        content: { composition: comp } as Record<string, unknown>,
        brandMode: comp.mode,
        subCompany: comp.brandId,
        tags: ["open-canvas"],
      };
      if (comp.savedFileId) {
        await updateFn({ data: { id: comp.savedFileId, patch: payload } });
        return comp.savedFileId;
      }
      const row = (await saveFn({ data: payload })) as { id: string };
      return row.id;
    },
    onSuccess: (id) => {
      if (comp) patchComposition(comp.id, { savedFileId: id, savedAt: new Date().toISOString() });
      toast.success("Saved to My Files", { description: "Find it under Modules in My Files." });
    },
    onError: (e: unknown) =>
      toast.error("Could not save", {
        description: e instanceof Error ? e.message : "Please sign in and try again.",
      }),
  });

  if (!comp) return null;

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black/90 dark:text-white/90">
            Open Canvas Studio
          </h1>
          <p className="text-sm text-black/55 dark:text-white/55">
            Start from a blank slide and mix preset modules with your own text, stats and imagery.
          </p>
        </div>
        <Link to="/admin" className="text-xs font-semibold uppercase tracking-[0.2em] text-[#003FC7]">
          ← Admin console
        </Link>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-white/80 p-2 backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
        <select
          value={comp.id}
          onChange={(e) => setActive(e.target.value)}
          className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm dark:border-white/15 dark:bg-white/[0.06]"
        >
          {compositions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          value={comp.name}
          onChange={(e) => patchComposition(comp.id, { name: e.target.value })}
          aria-label="Composition name"
          className="w-48 rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm dark:border-white/15 dark:bg-white/[0.06]"
        />
        <button
          type="button"
          onClick={() => createComposition("Untitled slide", brandId)}
          className="rounded-lg bg-[#03002C] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white"
        >
          New blank slide
        </button>
        <button
          type="button"
          onClick={() => duplicateComposition(comp.id)}
          className="rounded-lg border border-black/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] dark:border-white/15"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={() => saveToFiles.mutate()}
          disabled={saveToFiles.isPending}
          className="rounded-lg bg-[#003FC7] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white disabled:opacity-60"
        >
          {saveToFiles.isPending ? "Saving…" : comp.savedFileId ? "Save changes" : "Save to my files"}
        </button>
        <Link
          to="/files"
          className="rounded-lg border border-black/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] dark:border-white/15"
        >
          My files
        </Link>
        <button
          type="button"
          onClick={() => clearItems(comp.id)}
          className="rounded-lg border border-black/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] dark:border-white/15"
        >
          Clear canvas
        </button>
        <button
          type="button"
          onClick={() => deleteComposition(comp.id)}
          className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-rose-600"
        >
          Delete slide
        </button>

        <span className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />

        <select
          value={comp.mode}
          onChange={(e) => patchComposition(comp.id, { mode: e.target.value as "light" | "dark" })}
          className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm dark:border-white/15 dark:bg-white/[0.06]"
        >
          <option value="light">Light mode</option>
          <option value="dark">Dark mode</option>
        </select>
        <select
          value={comp.brandId}
          onChange={(e) => {
            setBrandId(e.target.value);
            patchComposition(comp.id, { brandId: e.target.value });
          }}
          className="rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm dark:border-white/15 dark:bg-white/[0.06]"
        >
          {BRAND_MODES.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-black/70 dark:text-white/70">
          <input type="checkbox" checked={snapOn} onChange={(e) => setSnapOn(e.target.checked)} />
          Snap
        </label>
        <label className="flex items-center gap-1 text-xs text-black/70 dark:text-white/70">
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
          Grid
        </label>
        <span className="ml-auto text-[11px] text-black/45 dark:text-white/45">
          {comp.items.length} item{comp.items.length === 1 ? "" : "s"}
          {comp.savedAt ? " · saved" : ""}
          {imageDrop.busy ? " · uploading imagery…" : ""}
        </span>
      </div>

      <div className="flex min-h-[70vh] gap-3">
        <StudioPalette
          brand={brand}
          mode={comp.mode}
          onAdd={(payload) => place(payload, { x: STAGE_W / 2, y: STAGE_H / 2 })}
        />
        <div className="min-w-0 flex-1">
          <CanvasStage
            comp={comp}
            brand={brand}
            selectedIds={selectedIds}
            snapOn={snapOn}
            showGrid={showGrid}
            onSelect={setSelected}
            onPatch={(id, patch) => patchItem(comp.id, id, patch)}
            onDropPayload={place}
            onDropFiles={(files) => void imageDrop.ingest(files)}
            onDelete={(id) => removeItem(comp.id, id)}
          />
          {imageDrop.error && (
            <p className="mt-2 text-xs text-rose-600">{imageDrop.error}</p>
          )}
          <p className="mt-2 text-[11px] text-black/45 dark:text-white/45">
            Drag to move · corner handle to resize · shift-click for multi-select · arrows nudge ·
            Delete removes. Compositions save automatically in this browser.
          </p>
        </div>
        <StudioLayers
          items={comp.items}
          selectedIds={selectedIds}
          onSelect={setSelected}
          onPatch={(id, patch) => patchItem(comp.id, id, patch)}
          onRemove={(id) => removeItem(comp.id, id)}
          onDuplicate={(id) => duplicateItem(comp.id, id)}
          onOrder={(id, dir) => reorderItem(comp.id, id, dir)}
        />
        <StudioInspector
          item={(selectedItem as CanvasItem | null) ?? null}
          onPatch={(patch) => selectedItem && patchItem(comp.id, selectedItem.id, patch)}
          onRemove={() => selectedItem && removeItem(comp.id, selectedItem.id)}
          onDuplicate={() => selectedItem && duplicateItem(comp.id, selectedItem.id)}
          onOrder={(dir) => selectedItem && reorderItem(comp.id, selectedItem.id, dir)}
        />
      </div>
    </AppShell>
  );
}

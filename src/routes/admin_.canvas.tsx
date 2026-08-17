// Open Canvas Studio — a blank-slide, free-composition builder for admins.
// Preset modules, text fields, stat blocks, imagery and colour surfaces are all
// draggable onto one 1920×1080 stage and can be mixed freely.

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  EditorMenu,
  EditorMenuRow,
  EditorPageHeader,
  EditorToolbar,
  MetaDot,
  ToolbarSep,
} from "@/components/editor/EditorChrome";
import { BRAND_MODES } from "@/lib/taxonomy";
import { useImageDrop } from "@/hooks/use-image-drop";
import { StudioPalette, type DragPayload } from "@/components/studio/StudioPalette";
import { expandParts, expandPreset, presetById } from "@/lib/canvas-block-presets";
import { StudioSideAccordion } from "@/components/studio/StudioSideAccordion";
import { StudioInspector } from "@/components/studio/StudioInspector";
import { CanvasStage } from "@/components/studio/CanvasStage";
import { StudioLayers } from "@/components/studio/StudioLayers";
import { saveModule, updateSavedModule } from "@/lib/saved-modules.functions";
import { attachSlideFile } from "@/lib/slide-files.functions";
import { blobToBase64 } from "@/lib/blob-base64";
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

  // Always-fresh handle on the active composition: async work (such as
  // exploding a just-placed module) must not read a stale render closure.
  const compRef = useRef(comp);
  compRef.current = comp;

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
    if (payload.kind === "parts") {
      let pool = comp.items;
      for (const item of expandParts(payload.parts, at, (type, box, props) =>
        makeItem(type, { x: box.x + box.w / 2, y: box.y + box.h / 2 }, { ...props, ...box }, pool),
      )) {
        pool = [...pool, item];
        addItem(comp.id, item);
      }
      return;
    }
    if (payload.kind === "preset") {
      const preset = presetById(payload.presetId);
      if (!preset) return;
      // Build sequentially so each layer gets the next z above the last.
      let pool = comp.items;
      for (const item of expandPreset(preset, at, (type, box, props) =>
        makeItem(type, { x: box.x + box.w / 2, y: box.y + box.h / 2 }, { ...props, ...box }, pool),
      )) {
        pool = [...pool, item];
        addItem(comp.id, item);
      }
      return;
    }
    const item =
      payload.kind === "module"
        ? makeItem("module", at, { variantId: payload.variantId }, comp.items)
        : makeItem(payload.type, at, {}, comp.items);
    addItem(comp.id, item);
    // Dropping a preset module gives you a personal, fully editable copy of it:
    // the module template on the backend is never touched.
    if (payload.kind === "module") void autoMakeEditable(item.id);
  };

  /** Wait for the freshly placed module to render, then explode it into layers. */
  const autoMakeEditable = async (itemId: string) => {
    for (let attempt = 0; attempt < 24; attempt++) {
      await new Promise((r) => setTimeout(r, 120));
      const el = document.querySelector<HTMLElement>(`[data-studio-item="${itemId}"]`);
      if (el && el.getBoundingClientRect().height > 0 && el.querySelector("*")) {
        await makeEditable(itemId);
        return;
      }
    }
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

  /** Explode a placed module into fully editable personal layers. */
  const makeEditable = async (itemId: string) => {
    const comp = compRef.current;
    if (!comp) return;
    const item = comp.items.find((i) => i.id === itemId);
    if (!item || item.type !== "module") return;
    const el = document.querySelector<HTMLElement>(`[data-studio-item="${itemId}"]`);
    const stage = el?.closest<HTMLElement>('[role="application"]');
    if (!el || !stage) {
      toast.error("Could not read the module", { description: "Scroll it into view and try again." });
      return;
    }
    const { explodeModuleRender } = await import("@/lib/canvas-studio-explode");
    const startZ = comp.items.reduce((m, i) => Math.max(m, i.z), 0) + 1;
    const { items, counts, truncated } = explodeModuleRender(el, stage, startZ);
    if (!items.length) {
      toast.error("Nothing to convert", { description: "This module rendered no editable pieces." });
      return;
    }
    removeItem(comp.id, itemId);
    for (const next of items) addItem(comp.id, next);
    setSelected(items.map((i) => i.id));
    toast.success("Module is now yours to edit", {
      description: `${counts.text} text · ${counts.images} image${counts.images === 1 ? "" : "s"} · ${counts.surfaces} surface${counts.surfaces === 1 ? "" : "s"}${truncated ? " (trimmed to 160 layers)" : ""}`,
    });
  };

  const saveFn = useServerFn(saveModule);
  const updateFn = useServerFn(updateSavedModule);
  const attachFn = useServerFn(attachSlideFile);

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
      }
      let id = comp.savedFileId;
      if (!id) {
        const row = (await saveFn({ data: payload })) as { id: string };
        id = row.id;
      }
      // Write the real single-slide .pptx alongside the editable record so the
      // user can download and open this slide in PowerPoint from My files.
      let fileWarning: string | null = null;
      try {
        const { exportCompositionToPptx } = await import("@/lib/canvas-studio-export");
        const built = await exportCompositionToPptx(comp, brand, { output: "blob" });
        if (built.blob) {
          await attachFn({
            data: {
              moduleId: id,
              fileName: built.fileName ?? `${payload.title}.pptx`,
              fileBase64: await blobToBase64(built.blob),
            },
          });
        } else {
          fileWarning = "Saved, but the PowerPoint file could not be generated.";
        }
      } catch (err) {
        fileWarning = err instanceof Error ? err.message : "PowerPoint file could not be attached.";
      }
      return { id, fileWarning };
    },
    onSuccess: ({ id, fileWarning }) => {
      if (comp) patchComposition(comp.id, { savedFileId: id, savedAt: new Date().toISOString() });
      toast.success("Saved to My Files", {
        description:
          fileWarning ?? "Editable record + downloadable .pptx — find it under Slides in My Files.",
      });
    },
    onError: (e: unknown) =>
      toast.error("Could not save", {
        description: e instanceof Error ? e.message : "Please sign in and try again.",
      }),
  });

  const exportPptx = useMutation({
    mutationFn: async () => {
      if (!comp) throw new Error("Nothing to export");
      const { exportCompositionToPptx } = await import("@/lib/canvas-studio-export");
      return exportCompositionToPptx(comp, brand);
    },
    onSuccess: (res) =>
      toast.success("PowerPoint exported", {
        description: res.warnings.length
          ? res.warnings.slice(0, 2).join(" ")
          : `${res.blocks} editable layer${res.blocks === 1 ? "" : "s"} · ${res.fileName ?? "downloaded"}`,
      }),
    onError: (e: unknown) =>
      toast.error("Export failed", {
        description: e instanceof Error ? e.message : "Please try again.",
      }),
  });


  if (!comp) return null;

  return (
    <AppShell>
      <EditorPageHeader
        backTo="/admin"
        backLabel="← Admin console"
        title="Open Canvas Studio"
        meta={
          <>
            <span>{comp.items.length} layer{comp.items.length === 1 ? "" : "s"}</span>
            <MetaDot />
            <span>{brand.name}</span>
            <MetaDot />
            <span>{comp.mode === "dark" ? "Dark" : "Light"} mode</span>
          </>
        }
        status={
          <div className="flex items-center gap-3 text-[11px] text-black/50">
            <span>{comp.savedAt ? "Saved to My Files" : "Local draft"}</span>
            {imageDrop.busy ? <span>Uploading imagery…</span> : null}
          </div>
        }
      />

      <div className="mt-4">
        <EditorToolbar
          slideLabel="Canvas"
          deckRow={
            <>
              <select
                value={comp.id}
                onChange={(e) => setActive(e.target.value)}
                aria-label="Open composition"
                className="rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/60"
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
                className="w-52 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] text-black/80"
              />
              <ToolbarSep />
              <EditorMenu label="Slide" hint={`${compositions.length} in this browser`}>
                <EditorMenuRow label="New blank slide" hint="Start a fresh composition">
                  <StudioMenuBtn
                    label="New blank slide"
                    onClick={() => createComposition("Untitled slide", brandId)}
                  >
                    ＋
                  </StudioMenuBtn>
                </EditorMenuRow>
                <EditorMenuRow label="Duplicate slide" hint="Copy every layer">
                  <StudioMenuBtn
                    label="Duplicate slide"
                    onClick={() => duplicateComposition(comp.id)}
                  >
                    ⧉
                  </StudioMenuBtn>
                </EditorMenuRow>
                <EditorMenuRow label="Clear canvas" hint="Remove all layers, keep the slide">
                  <StudioMenuBtn label="Clear canvas" onClick={() => clearItems(comp.id)}>
                    ⌫
                  </StudioMenuBtn>
                </EditorMenuRow>
                <EditorMenuRow label="Delete slide" hint="Cannot be undone">
                  <StudioMenuBtn
                    label="Delete slide"
                    danger
                    onClick={() => deleteComposition(comp.id)}
                  >
                    ✕
                  </StudioMenuBtn>
                </EditorMenuRow>
              </EditorMenu>
            </>
          }
          deckRowEnd={
            <EditorMenu label="Distribute" hint={comp.savedFileId ? "Saved" : "Unsaved"}>
              <EditorMenuRow
                label={comp.savedFileId ? "Save changes" : "Save to My Files"}
                hint="Store this composition in the workspace"
              >
                <StudioMenuBtn
                  label="Save to My Files"
                  primary
                  disabled={saveToFiles.isPending}
                  onClick={() => saveToFiles.mutate()}
                >
                  ⤓
                </StudioMenuBtn>
              </EditorMenuRow>
              <EditorMenuRow label="Export PPTX" hint="Editable layers, native shapes">
                <StudioMenuBtn
                  label="Export PPTX"
                  disabled={exportPptx.isPending || comp.items.length === 0}
                  onClick={() => exportPptx.mutate()}
                >
                  ↗
                </StudioMenuBtn>
              </EditorMenuRow>
              <EditorMenuRow label="My files" hint="Browse saved modules and slides">
                <Link
                  to="/files"
                  aria-label="My files"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-black/60 transition hover:bg-black/[0.04] hover:text-primary"
                >
                  ☰
                </Link>
              </EditorMenuRow>
            </EditorMenu>
          }
          slideRow={
            <>
              <EditorMenu label="Appearance" hint={comp.mode === "dark" ? "Dark" : "Light"}>
                <div
                  role="group"
                  aria-label="Canvas appearance mode"
                  className="inline-flex items-center rounded-full bg-black/[0.04] p-0.5 text-[11px] font-medium"
                >
                  {(["light", "dark"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={comp.mode === m}
                      onClick={() => patchComposition(comp.id, { mode: m })}
                      className={`rounded-full px-3 py-1 transition ${
                        comp.mode === m
                          ? m === "dark"
                            ? "bg-[#03002C] text-white shadow-sm"
                            : "bg-white text-[#03002C] shadow-sm"
                          : "text-black/50 hover:text-black"
                      }`}
                    >
                      {m === "dark" ? "☾ Dark" : "☀ Light"}
                    </button>
                  ))}
                </div>
              </EditorMenu>

              <EditorMenu label="Brand" hint={brand.name}>
                <select
                  value={comp.brandId}
                  onChange={(e) => {
                    setBrandId(e.target.value);
                    patchComposition(comp.id, { brandId: e.target.value });
                  }}
                  aria-label="Division or sub-brand"
                  className="w-full rounded-lg border border-black/[0.08] bg-white px-2 py-1.5 text-[12px]"
                >
                  {BRAND_MODES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </EditorMenu>

              <EditorMenu label="View" hint={snapOn ? "Snap on" : "Snap off"}>
                <EditorMenuRow label="Snap" hint="Align to edges, centres and siblings">
                  <input
                    type="checkbox"
                    checked={snapOn}
                    aria-label="Snap"
                    onChange={(e) => setSnapOn(e.target.checked)}
                  />
                </EditorMenuRow>
                <EditorMenuRow label="Grid" hint="Show the snap grid">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    aria-label="Grid"
                    onChange={(e) => setShowGrid(e.target.checked)}
                  />
                </EditorMenuRow>
              </EditorMenu>
            </>
          }
          slideRowEnd={
            <span className="text-[11px] text-black/45">
              {comp.items.length} layer{comp.items.length === 1 ? "" : "s"}
              {selectedIds.length > 0 ? ` · ${selectedIds.length} selected` : ""}
            </span>
          }
        />
      </div>

      <div className="h-3" />

      <div className="flex h-[70vh] min-h-[540px] gap-3">
        <StudioPalette
          brand={brand}
          mode={comp.mode}
          onAdd={(payload) => place(payload, { x: STAGE_W / 2, y: STAGE_H / 2 })}
        />
        <div className="flex min-w-0 flex-1 flex-col justify-center">
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
            onExplode={(id) => void makeEditable(id)}
          />
          {imageDrop.error && (
            <p className="mt-2 text-xs text-rose-600">{imageDrop.error}</p>
          )}
          <p className="mt-2 text-[11px] text-black/45 dark:text-white/45">
            Drag to move · corner handle to resize · shift-click for multi-select · arrows nudge ·
            Delete removes. Double-click a placed module to make it fully editable. Compositions save automatically in this browser.
          </p>
        </div>
        <StudioSideAccordion
          layers={
            <StudioLayers
              className="h-full w-full border-0 bg-transparent"
              items={comp.items}
              selectedIds={selectedIds}
              onSelect={setSelected}
              onPatch={(id, patch) => patchItem(comp.id, id, patch)}
              onRemove={(id) => removeItem(comp.id, id)}
              onDuplicate={(id) => duplicateItem(comp.id, id)}
              onOrder={(id, dir) => reorderItem(comp.id, id, dir)}
            />
          }
          inspector={
            <StudioInspector
              className="h-full w-full border-0 bg-transparent"
              item={(selectedItem as CanvasItem | null) ?? null}
              onPatch={(patch) => selectedItem && patchItem(comp.id, selectedItem.id, patch)}
              onRemove={() => selectedItem && removeItem(comp.id, selectedItem.id)}
              onDuplicate={() => selectedItem && duplicateItem(comp.id, selectedItem.id)}
              onOrder={(dir) => selectedItem && reorderItem(comp.id, selectedItem.id, dir)}
              onExplode={
                selectedItem?.type === "module"
                  ? () => void makeEditable(selectedItem.id)
                  : undefined
              }
            />
          }
        />
      </div>
    </AppShell>
  );
}

/**
 * Icon-sized action button used inside EditorMenuRow, so the studio's menus
 * look and behave exactly like the deck editor's.
 */
function StudioMenuBtn({
  label,
  children,
  onClick,
  disabled,
  primary,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition disabled:opacity-40 ${
        primary
          ? "bg-[#003FC7] text-white hover:bg-[#003FC7]/90"
          : danger
            ? "text-rose-600 hover:bg-rose-50"
            : "text-black/60 hover:bg-black/[0.04] hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}

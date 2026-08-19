// Module Studio — the Open Canvas Studio, wired to a different destination.
// Same stage, palette, layers, inspector, history and shortcuts; instead of
// saving a one-off slide it publishes the composition into the module library
// (and exports it as a single editable module slide).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SaveActionButton } from "@/components/editor/SaveActionButton";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  EditorMenu,
  EditorMenuRow,
  EditorPageHeader,
  EditorToolbar,
  MetaDot,
  ToolbarSep,
} from "@/components/editor/EditorChrome";
import { BRAND_MODES, SECTION_FRAMEWORKS } from "@/lib/taxonomy";
import { useImageDrop } from "@/hooks/use-image-drop";
import { StudioPalette, type DragPayload } from "@/components/studio/StudioPalette";
import { expandParts, expandPreset, presetById } from "@/lib/canvas-block-presets";
import { StudioSideAccordion } from "@/components/studio/StudioSideAccordion";
import { StudioInspector } from "@/components/studio/StudioInspector";
import { CanvasStage } from "@/components/studio/CanvasStage";
import { StudioLayers } from "@/components/studio/StudioLayers";
import {
  CUSTOM_FAMILY_ID,
  canPublish,
  customModuleKey,
  normalizeCanvasBlocks,
  validateCustomModule,
  type CustomModuleRow,
} from "@/lib/custom-modules";
import {
  createCustomModule,
  deleteCustomModule,
  listCustomModules,
  updateCustomModule,
} from "@/lib/custom-modules.functions";
import { compositionToModuleParts, moduleToItems } from "@/lib/module-studio-bridge";
import {
  STAGE_H,
  STAGE_W,
  makeItem,
  useCanvasStudio,
  type CanvasItem,
} from "@/lib/canvas-studio";

export const Route = createFileRoute("/admin/module-studio")({
  head: () => ({
    meta: [
      { title: "Module Studio · Admin · TransPerfect" },
      {
        name: "description",
        content:
          "Compose a module on the free-form 1920×1080 canvas, then publish it to the module library or export it as a single editable module slide.",
      },
      { property: "og:title", content: "Module Studio · TransPerfect" },
      {
        property: "og:description",
        content: "Author, test and publish new slide modules for every deck builder.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ModuleStudioPage,
});

type Meta = {
  id: string | null;
  description: string;
  sectionId: string;
  tags: string;
  notes: string;
  status: "draft" | "published" | "archived";
};

function emptyMeta(): Meta {
  return {
    id: null,
    description: "",
    sectionId: SECTION_FRAMEWORKS[0]?.id ?? "SEC-01",
    tags: "",
    notes: "",
    status: "draft",
  };
}

function ModuleStudioPage() {
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
    patchItems,
    removeItem,
    duplicateItem,
    reorderItem,
    setSelected,
    clearItems,
    undo,
    redo,
    beginBatch,
    endBatch,
  } = useCanvasStudio();
  const canUndo = useCanvasStudio((s) => s.past.length > 0);
  const canRedo = useCanvasStudio((s) => s.future.length > 0);

  const [brandId, setBrandId] = useState(BRAND_MODES[0]?.id ?? "");
  const [snapOn, setSnapOn] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [meta, setMeta] = useState<Meta>(emptyMeta);
  const patchMeta = useCallback((p: Partial<Meta>) => setMeta((m) => ({ ...m, ...p })), []);

  const qc = useQueryClient();
  const list = useServerFn(listCustomModules);
  const create = useServerFn(createCustomModule);
  const update = useServerFn(updateCustomModule);
  const remove = useServerFn(deleteCustomModule);

  const modules = useQuery({
    queryKey: ["custom-modules"],
    queryFn: () => list() as Promise<CustomModuleRow[]>,
  });

  const comp = useMemo(
    () => compositions.find((c) => c.id === activeId) ?? compositions[0] ?? null,
    [compositions, activeId],
  );
  const compRef = useRef(comp);
  compRef.current = comp;

  useEffect(() => {
    if (!comp) createComposition("Untitled module", brandId);
  }, [comp, createComposition, brandId]);

  // Page-wide history shortcuts, never while typing into a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;
      const k = e.key.toLowerCase();
      if (k === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (k === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

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
    if (payload.kind === "module") void autoMakeEditable(item.id);
  };

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

  /** Explode a placed module into fully editable layers. */
  const makeEditable = async (itemId: string) => {
    const comp = compRef.current;
    if (!comp) return;
    const item = comp.items.find((i) => i.id === itemId);
    if (!item || item.type !== "module") return;
    const el = document.querySelector<HTMLElement>(`[data-studio-item="${itemId}"]`);
    const stage = el?.closest<HTMLElement>('[role="application"]');
    if (!el || !stage) {
      toast.error("Could not read the module", {
        description: "Scroll it into view and try again.",
      });
      return;
    }
    const { explodeModuleRender } = await import("@/lib/canvas-studio-explode");
    const startZ = comp.items.reduce((m, i) => Math.max(m, i.z), 0) + 1;
    const { items, counts, truncated } = explodeModuleRender(el, stage, startZ);
    if (!items.length) {
      toast.error("Nothing to convert", {
        description: "This module rendered no editable pieces.",
      });
      return;
    }
    removeItem(comp.id, itemId);
    for (const next of items) addItem(comp.id, next);
    setSelected(items.map((i) => i.id));
    toast.success("Module is now yours to edit", {
      description: `${counts.text} text · ${counts.images} image${counts.images === 1 ? "" : "s"} · ${counts.surfaces} surface${counts.surfaces === 1 ? "" : "s"}${truncated ? " (trimmed to 160 layers)" : ""}`,
    });
  };

  // ---- module record: validation, publish, export -------------------------

  const parts = useMemo(
    () => (comp ? compositionToModuleParts(comp, brand) : null),
    [comp, brand],
  );

  const issues = useMemo(
    () =>
      validateCustomModule({
        name: comp?.name ?? "",
        description: meta.description,
        baseVariantId: parts?.baseVariantId ?? "",
        blocks: parts?.canvasBlocks ?? [],
        content: parts?.content ?? {},
      }),
    [comp?.name, meta.description, parts],
  );
  const publishable = canPublish(issues);

  const save = useMutation({
    mutationFn: async (status: Meta["status"]) => {
      if (!comp || !parts) throw new Error("Nothing to save");
      const payload = {
        moduleKey: customModuleKey(comp.name),
        name: comp.name.trim(),
        description: meta.description.trim(),
        baseVariantId: parts.baseVariantId,
        familyId: CUSTOM_FAMILY_ID,
        sectionId: meta.sectionId,
        brandMode: comp.brandId,
        tags: meta.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        content: parts.content,
        canvasBlocks: parts.canvasBlocks as unknown as Array<Record<string, unknown>>,
        notes: meta.notes,
        status,
      };
      if (meta.id) {
        return (await update({ data: { id: meta.id, patch: payload } })) as CustomModuleRow;
      }
      return (await create({ data: payload })) as CustomModuleRow;
    },
    onSuccess: (row, status) => {
      patchMeta({ id: row.id, status });
      void qc.invalidateQueries({ queryKey: ["custom-modules"] });
      void qc.invalidateQueries({ queryKey: ["custom-modules", "published"] });
      toast.success(
        status === "published" ? "Published to the module library" : "Module draft saved",
        {
          description:
            status === "published"
              ? "Every builder can now insert it from Add slide."
              : "Keep composing — nothing is published yet.",
        },
      );
    },
    onError: (e: unknown) =>
      toast.error("Could not save the module", {
        description: e instanceof Error ? e.message : "Please sign in and try again.",
      }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["custom-modules"] });
      void qc.invalidateQueries({ queryKey: ["custom-modules", "published"] });
    },
  });

  /** Export the composition as a single, fully editable module slide. */
  const exportPptx = useMutation({
    mutationFn: async () => {
      if (!comp) throw new Error("Nothing to export");
      const { exportCompositionToPptx } = await import("@/lib/canvas-studio-export");
      return exportCompositionToPptx(comp, brand);
    },
    onSuccess: (res) =>
      toast.success("Module slide exported", {
        description: res.warnings.length
          ? res.warnings.slice(0, 2).join(" ")
          : `${res.blocks} editable layer${res.blocks === 1 ? "" : "s"} · ${res.fileName ?? "downloaded"}`,
      }),
    onError: (e: unknown) =>
      toast.error("Export failed", {
        description: e instanceof Error ? e.message : "Please try again.",
      }),
  });

  /** Pull a saved module back onto the canvas as editable layers. */
  const loadRow = (row: CustomModuleRow, asCopy = false) => {
    const mode = (row.brand_mode?.includes("dark") ? "dark" : "light") as "light" | "dark";
    const id = createComposition(asCopy ? `${row.name} copy` : row.name, row.brand_mode ?? brandId);
    patchComposition(id, { brandId: row.brand_mode ?? brandId, mode });
    for (const item of moduleToItems(row.base_variant_id, normalizeCanvasBlocks(row.canvas_blocks), mode)) {
      addItem(id, item);
    }
    setMeta({
      id: asCopy ? null : row.id,
      description: row.description ?? "",
      sectionId: row.section_id ?? SECTION_FRAMEWORKS[0]?.id ?? "SEC-01",
      tags: (row.tags ?? []).join(", "),
      notes: row.notes ?? "",
      status: asCopy ? "draft" : ((row.status as Meta["status"]) ?? "draft"),
    });
  };

  if (!comp) return null;

  return (
    <AppShell>
      <EditorPageHeader
        backTo="/admin"
        backLabel="← Admin console"
        title="Module Studio"
        meta={
          <>
            <span>
              {comp.items.length} layer{comp.items.length === 1 ? "" : "s"}
            </span>
            <MetaDot />
            <span>{brand.name}</span>
            <MetaDot />
            <span>{comp.mode === "dark" ? "Dark" : "Light"} mode</span>
          </>
        }
        status={
          <div className="flex items-center gap-3 text-[11px] text-black/50">
            <SaveActionButton
              state={save.isPending ? "saving" : "dirty"}
              onSave={() => save.mutate("draft")}
              label="Save draft"
              savedLabel="Save draft"
              disabled={comp.name.trim().length < 3}
              title="Save this module as a draft — ⌘S / Ctrl+S"
            />
            <button
              type="button"
              role="switch"
              aria-checked={comp.mode === "dark"}
              aria-label="Toggle dark mode"
              title={comp.mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() =>
                patchComposition(comp.id, { mode: comp.mode === "dark" ? "light" : "dark" })
              }
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition ${
                comp.mode === "dark"
                  ? "bg-[#03002C] text-white"
                  : "bg-black/[0.04] text-[#03002C] hover:bg-black/[0.07]"
              }`}
            >
              <span aria-hidden>{comp.mode === "dark" ? "☾" : "☀"}</span>
              {comp.mode === "dark" ? "Dark" : "Light"}
            </button>
            <span>{meta.id ? `Saved · ${meta.status}` : "New module draft"}</span>
            {imageDrop.busy ? <span>Uploading imagery…</span> : null}
          </div>
        }
      />

      <div className="mt-4">
        <EditorToolbar
          slideLabel="Module"
          deckRow={
            <>
              <select
                value={comp.id}
                onChange={(e) => setActive(e.target.value)}
                aria-label="Open module composition"
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
                aria-label="Module name"
                placeholder="Process loop — four stage"
                className="w-52 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[12px] text-black/80"
              />
              <ToolbarSep />
              <EditorMenu label="Module" hint={`${compositions.length} in this browser`}>
                <EditorMenuRow label="New blank module" hint="Start a fresh composition">
                  <StudioMenuBtn
                    label="New blank module"
                    onClick={() => {
                      createComposition("Untitled module", brandId);
                      setMeta(emptyMeta());
                    }}
                  >
                    ＋
                  </StudioMenuBtn>
                </EditorMenuRow>
                <EditorMenuRow label="Duplicate module" hint="Copy every layer">
                  <StudioMenuBtn
                    label="Duplicate module"
                    onClick={() => {
                      duplicateComposition(comp.id);
                      patchMeta({ id: null, status: "draft" });
                    }}
                  >
                    ⧉
                  </StudioMenuBtn>
                </EditorMenuRow>
                <EditorMenuRow label="Clear canvas" hint="Remove all layers, keep the module">
                  <StudioMenuBtn label="Clear canvas" onClick={() => clearItems(comp.id)}>
                    ⌫
                  </StudioMenuBtn>
                </EditorMenuRow>
                <EditorMenuRow label="Delete composition" hint="Cannot be undone">
                  <StudioMenuBtn
                    label="Delete composition"
                    danger
                    onClick={() => deleteComposition(comp.id)}
                  >
                    ✕
                  </StudioMenuBtn>
                </EditorMenuRow>
              </EditorMenu>
              <EditorMenu label="Details" hint={meta.sectionId}>
                <EditorMenuRow label="Description" hint="When should a builder reach for it?">
                  <textarea
                    value={meta.description}
                    onChange={(e) => patchMeta({ description: e.target.value })}
                    rows={2}
                    aria-label="Module description"
                    className="w-full rounded-lg border border-black/[0.08] bg-white px-2 py-1.5 text-[12px]"
                  />
                </EditorMenuRow>
                <EditorMenuRow label="Section" hint="Framework slot">
                  <select
                    value={meta.sectionId}
                    onChange={(e) => patchMeta({ sectionId: e.target.value })}
                    aria-label="Section framework"
                    className="w-full rounded-lg border border-black/[0.08] bg-white px-2 py-1.5 text-[12px]"
                  >
                    {SECTION_FRAMEWORKS.map((sf) => (
                      <option key={sf.id} value={sf.id}>
                        {sf.id} · {sf.name}
                      </option>
                    ))}
                  </select>
                </EditorMenuRow>
                <EditorMenuRow label="Tags" hint="Comma separated">
                  <input
                    value={meta.tags}
                    onChange={(e) => patchMeta({ tags: e.target.value })}
                    aria-label="Module tags"
                    className="w-full rounded-lg border border-black/[0.08] bg-white px-2 py-1.5 text-[12px]"
                  />
                </EditorMenuRow>
                <EditorMenuRow label="Usage notes" hint="Shown to builders">
                  <textarea
                    value={meta.notes}
                    onChange={(e) => patchMeta({ notes: e.target.value })}
                    rows={2}
                    aria-label="Usage notes"
                    className="w-full rounded-lg border border-black/[0.08] bg-white px-2 py-1.5 text-[12px]"
                  />
                </EditorMenuRow>
              </EditorMenu>
              <EditorMenu label="Library" hint={`${modules.data?.length ?? 0} custom`}>
                {modules.isLoading ? (
                  <p className="px-1 py-2 text-[11px] text-black/45">Loading…</p>
                ) : null}
                <div className="max-h-[46vh] w-64 space-y-1.5 overflow-y-auto">
                  {(modules.data ?? []).map((row) => (
                    <div
                      key={row.id}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 ${
                        meta.id === row.id ? "border-[#003FC7] bg-[#003FC7]/5" : "border-black/10"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => loadRow(row)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate text-xs font-semibold text-black/80">
                          {row.name}
                        </div>
                        <div className="truncate font-mono text-[10px] text-black/40">
                          {row.module_key} · {row.status}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => loadRow(row, true)}
                        aria-label={`Duplicate ${row.name}`}
                        className="rounded p-1 text-black/40 hover:bg-black/5 hover:text-black"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => del.mutate(row.id)}
                        aria-label={`Delete ${row.name}`}
                        className="rounded p-1 text-black/40 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {!modules.isLoading && (modules.data ?? []).length === 0 && (
                    <p className="py-3 text-center text-[11px] text-black/40">
                      No custom modules yet — compose one on the stage.
                    </p>
                  )}
                </div>
              </EditorMenu>
            </>
          }
          deckRowEnd={
            <EditorMenu label="Distribute" hint={publishable ? "Ready" : "Checks pending"}>
              <EditorMenuRow label="Save draft" hint="Keep working, nothing published">
                <StudioMenuBtn
                  label="Save draft"
                  disabled={save.isPending || comp.name.trim().length < 3}
                  onClick={() => save.mutate("draft")}
                >
                  ⤓
                </StudioMenuBtn>
              </EditorMenuRow>
              <EditorMenuRow label="Publish to library" hint="Every builder can insert it">
                <StudioMenuBtn
                  label="Publish to library"
                  primary
                  disabled={save.isPending || !publishable}
                  onClick={() => save.mutate("published")}
                >
                  ⇧
                </StudioMenuBtn>
              </EditorMenuRow>
              <EditorMenuRow label="Export module slide" hint="Editable layers, native shapes">
                <StudioMenuBtn
                  label="Export module slide"
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

              <EditorMenu
                label="Checks"
                hint={issues.length === 0 ? "Clear" : `${issues.length} open`}
              >
                {issues.length === 0 ? (
                  <p className="w-64 px-1 py-1 text-[12px] text-emerald-700">
                    All checks pass — ready to publish.
                  </p>
                ) : (
                  <ul className="w-64 space-y-1.5">
                    {issues.map((i, n) => (
                      <li
                        key={n}
                        className={`rounded-md px-2 py-1.5 text-[11px] ${
                          i.level === "error"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {i.level === "error" ? "Blocking · " : "Check · "}
                        {i.message}
                      </li>
                    ))}
                  </ul>
                )}
              </EditorMenu>

              <ToolbarSep />

              <div role="group" aria-label="History" className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={undo}
                  disabled={!canUndo}
                  title="Undo (⌘Z) — steps back through every canvas edit"
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-black/[0.08] bg-white px-2.5 text-[11px] font-semibold text-black/65 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                >
                  ⟲ Undo
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={!canRedo}
                  title="Redo (⇧⌘Z)"
                  className="inline-flex h-8 items-center gap-1 rounded-full border border-black/[0.08] bg-white px-2.5 text-[11px] font-semibold text-black/65 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                >
                  ⟳ Redo
                </button>
              </div>
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
            onPatchMany={(patches) => patchItems(comp.id, patches)}
            onDropPayload={place}
            onDropFiles={(files) => void imageDrop.ingest(files)}
            onDelete={(id) => removeItem(comp.id, id)}
            onExplode={(id) => void makeEditable(id)}
            onBeginBatch={beginBatch}
            onEndBatch={endBatch}
            onUndo={undo}
            onRedo={redo}
          />
          {imageDrop.error && <p className="mt-2 text-xs text-rose-600">{imageDrop.error}</p>}
          <p className="mt-2 text-[11px] text-black/45 dark:text-white/45">
            Drag to move · corner handle to resize · drag across empty canvas to lasso-select ·
            shift-click to add · ⌘A selects all · arrows nudge · Delete removes · ⌘Z / ⇧⌘Z steps
            through history. Double-click a placed module to make it fully editable. Publish to add
            this module to every builder's Add slide gallery, or export it as one editable module
            slide.
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

/** Icon-sized action button used inside EditorMenuRow. */
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

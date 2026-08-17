// Module Studio — admins author brand-new module slides from a blank canvas
// (or from an existing module as a starting point / guide) and publish them
// into the module library for every builder to insert.
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Upload, Eye, EyeOff, Copy } from "lucide-react";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { FreeCanvasEditor } from "@/components/slide/FreeCanvasEditor";
import { LazyMount } from "@/components/LazyMount";
import { SlideThumbnailContext } from "@/lib/slide-media-refresh";
import { BRAND_MODES, MODULE_VARIANTS, SECTION_FRAMEWORKS, byId } from "@/lib/taxonomy";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import type { CanvasBlock, DeckSlide, SlideContent } from "@/lib/deck-store";
import {
  BLANK_VARIANT_ID,
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

export const Route = createFileRoute("/admin/module-studio")({
  head: () => ({
    meta: [
      { title: "Module Studio · Admin · TransPerfect" },
      {
        name: "description",
        content:
          "Create new slide modules from a blank canvas, borrow layouts and assets from existing modules, test them and publish to the module library.",
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

type Draft = {
  id: string | null;
  name: string;
  description: string;
  baseVariantId: string;
  sectionId: string;
  brandModeId: string;
  tags: string;
  notes: string;
  status: "draft" | "published" | "archived";
  content: Record<string, unknown>;
  blocks: CanvasBlock[];
};

function emptyDraft(): Draft {
  return {
    id: null,
    name: "",
    description: "",
    baseVariantId: BLANK_VARIANT_ID,
    sectionId: SECTION_FRAMEWORKS[0]?.id ?? "SEC-01",
    brandModeId: BRAND_MODES[0]?.id ?? "bm-enterprise",
    tags: "",
    notes: "",
    status: "draft",
    content: {},
    blocks: [],
  };
}

function ModuleStudioPage() {
  const qc = useQueryClient();
  const list = useServerFn(listCustomModules);
  const create = useServerFn(createCustomModule);
  const update = useServerFn(updateCustomModule);
  const remove = useServerFn(deleteCustomModule);

  const modules = useQuery({
    queryKey: ["custom-modules"],
    queryFn: () => list() as Promise<CustomModuleRow[]>,
  });

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [guideVariantId, setGuideVariantId] = useState<string>("");
  const [traceGuide, setTraceGuide] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [studioDock, setStudioDock] = useState<HTMLDivElement | null>(null);
  const [tool, setTool] = useState<"text" | "objects">("objects");

  const patch = useCallback((p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p })), []);

  const brand = useMemo(
    () => BRAND_MODES.find((b) => b.id === draft.brandModeId) ?? BRAND_MODES[0]!,
    [draft.brandModeId],
  );
  const brief = useMemo(() => resolveDivisionBrief(brand), [brand]);
  const baseVariant = byId(MODULE_VARIANTS, draft.baseVariantId) ?? MODULE_VARIANTS[0]!;
  const sectionName = byId(SECTION_FRAMEWORKS, draft.sectionId)?.name ?? baseVariant.name;

  /** Content the stage renders: authored content, else seeded sample copy. */
  const stageContent = useMemo<SlideContent>(() => {
    if (Object.keys(draft.content).length > 0) return draft.content as SlideContent;
    if (draft.baseVariantId === BLANK_VARIANT_ID) return {} as SlideContent;
    return seedDivisionContent(draft.baseVariantId, brief, sectionName, brand);
  }, [draft.content, draft.baseVariantId, brief, sectionName, brand]);

  const stageSlide = useMemo<DeckSlide>(
    () => ({
      id: "module-studio-stage",
      position: 0,
      sectionId: draft.sectionId,
      variantId: baseVariant.id,
      layoutId: baseVariant.permittedLayoutIds[0] ?? "LF-01",
      content: stageContent,
      changes: [],
      canvasBlocks: draft.blocks,
    }),
    [draft.sectionId, draft.blocks, baseVariant, stageContent],
  );

  const issues = useMemo(
    () =>
      validateCustomModule({
        name: draft.name,
        description: draft.description,
        baseVariantId: draft.baseVariantId,
        blocks: draft.blocks,
        content: stageContent as Record<string, unknown>,
      }),
    [draft.name, draft.description, draft.baseVariantId, draft.blocks, stageContent],
  );
  const publishable = canPublish(issues);

  const save = useMutation({
    mutationFn: async (status: Draft["status"]) => {
      const payload = {
        moduleKey: customModuleKey(draft.name),
        name: draft.name.trim(),
        description: draft.description.trim(),
        baseVariantId: draft.baseVariantId,
        familyId: CUSTOM_FAMILY_ID,
        sectionId: draft.sectionId,
        brandMode: draft.brandModeId,
        tags: draft.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        content: stageContent as Record<string, unknown>,
        canvasBlocks: draft.blocks as unknown as Array<Record<string, unknown>>,
        notes: draft.notes,
        status,
      };
      if (draft.id) {
        return (await update({ data: { id: draft.id, patch: payload } })) as CustomModuleRow;
      }
      return (await create({ data: payload })) as CustomModuleRow;
    },
    onSuccess: (row, status) => {
      patch({ id: row.id, status: status });
      setSavedNote(status === "published" ? "Published to the module library." : "Draft saved.");
      void qc.invalidateQueries({ queryKey: ["custom-modules"] });
      void qc.invalidateQueries({ queryKey: ["custom-modules", "published"] });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["custom-modules"] });
      void qc.invalidateQueries({ queryKey: ["custom-modules", "published"] });
    },
  });

  function loadRow(row: CustomModuleRow) {
    setDraft({
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      baseVariantId: row.base_variant_id,
      sectionId: row.section_id ?? SECTION_FRAMEWORKS[0]?.id ?? "SEC-01",
      brandModeId: row.brand_mode ?? BRAND_MODES[0]?.id ?? "bm-enterprise",
      tags: (row.tags ?? []).join(", "),
      notes: row.notes ?? "",
      status: (row.status as Draft["status"]) ?? "draft",
      content: (row.content ?? {}) as Record<string, unknown>,
      blocks: normalizeCanvasBlocks(row.canvas_blocks),
    });
    setSavedNote(null);
  }

  function duplicateRow(row: CustomModuleRow) {
    loadRow(row);
    setDraft((d) => ({ ...d, id: null, name: `${row.name} copy`, status: "draft" }));
  }

  /** Borrow the layout + content of an existing module as a starting point. */
  function startFrom(variantId: string) {
    const mv = byId(MODULE_VARIANTS, variantId);
    if (!mv) return;
    patch({
      baseVariantId: variantId,
      content:
        variantId === BLANK_VARIANT_ID
          ? {}
          : (seedDivisionContent(variantId, brief, sectionName, brand) as Record<string, unknown>),
    });
  }

  const guideVariant = guideVariantId ? byId(MODULE_VARIANTS, guideVariantId) : undefined;

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.25em] text-[#003FC7]">Admin</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#03002C]">Module Studio</h1>
        <p className="mt-2 max-w-3xl text-sm text-black/60">
          Build a brand-new module slide from a blank stage, or start from an existing module and
          reshape it. Borrow objects and assets from any module with the canvas pick tool, test it
          at full size, then publish it to the module library so every builder can insert it.
        </p>
      </header>

      <StepGuide />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Stage */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-widest text-black/45">
              Base
            </label>
            <select
              value={draft.baseVariantId}
              onChange={(e) => startFrom(e.target.value)}
              className="min-w-56 rounded-md border border-black/15 px-2 py-1.5 text-xs"
            >
              <option value={BLANK_VARIANT_ID}>Blank canvas (start empty)</option>
              {MODULE_VARIANTS.filter((v) => v.id !== BLANK_VARIANT_ID).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} · {v.name}
                </option>
              ))}
            </select>

            <label className="ml-2 text-[11px] font-semibold uppercase tracking-widest text-black/45">
              Guide
            </label>
            <select
              value={guideVariantId}
              onChange={(e) => setGuideVariantId(e.target.value)}
              className="min-w-56 rounded-md border border-black/15 px-2 py-1.5 text-xs"
            >
              <option value="">None</option>
              {MODULE_VARIANTS.filter((v) => v.id !== BLANK_VARIANT_ID).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} · {v.name}
                </option>
              ))}
            </select>
            {guideVariant && (
              <button
                type="button"
                onClick={() => setTraceGuide((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-black/15 px-2 py-1.5 text-xs hover:border-[#003FC7]"
              >
                {traceGuide ? <EyeOff size={12} /> : <Eye size={12} />}
                {traceGuide ? "Hide trace" : "Trace on stage"}
              </button>
            )}
            <select
              value={draft.brandModeId}
              onChange={(e) => patch({ brandModeId: e.target.value })}
              className="ml-auto rounded-md border border-black/15 px-2 py-1.5 text-xs"
            >
              {BRAND_MODES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Docked studio toolbar lives above the stage so it never covers art */}
          <div ref={setStudioDock} className="min-h-0" />

          <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-[#03002C]">
            <FreeCanvasEditor
              brand={brand}
              blocks={draft.blocks}
              tool={tool}
              onToolChange={setTool}
              toolbarMount={studioDock}
              toolbarVariant="docked"
              onChange={(next) => patch({ blocks: next })}
            >
              <div className="relative">
                <ScaledSlide>
                  <VariantRenderer
                    slide={stageSlide}
                    variant={baseVariant}
                    brand={brand}
                    pageNumber={1}
                    mode="light"
                  />
                </ScaledSlide>
                {traceGuide && guideVariant && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-25 mix-blend-luminosity"
                  >
                    <ScaledSlide>
                      <VariantRenderer
                        slide={{
                          ...stageSlide,
                          id: "guide",
                          variantId: guideVariant.id,
                          layoutId: guideVariant.permittedLayoutIds[0] ?? "LF-01",
                          content: seedDivisionContent(
                            guideVariant.id,
                            brief,
                            sectionName,
                            brand,
                          ),
                          canvasBlocks: [],
                        }}
                        variant={guideVariant}
                        brand={brand}
                        pageNumber={1}
                        mode="light"
                      />
                    </ScaledSlide>
                  </div>
                )}
              </div>
            </FreeCanvasEditor>
          </div>

          {guideVariant && (
            <div className="rounded-2xl border border-black/10 bg-white p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-black/45">
                Guide example · {guideVariant.id}
              </div>
              <div
                className="relative w-full overflow-hidden rounded-lg bg-[#03002C]"
                style={{ aspectRatio: "16 / 9" }}
              >
                <LazyMount placeholder={null} className="absolute inset-0">
                  <SlideThumbnailContext.Provider value={true}>
                    <ScaledSlide>
                      <VariantRenderer
                        slide={{
                          ...stageSlide,
                          id: "guide-card",
                          variantId: guideVariant.id,
                          layoutId: guideVariant.permittedLayoutIds[0] ?? "LF-01",
                          content: seedDivisionContent(
                            guideVariant.id,
                            brief,
                            sectionName,
                            brand,
                          ),
                          canvasBlocks: [],
                        }}
                        variant={guideVariant}
                        brand={brand}
                        pageNumber={1}
                      />
                    </ScaledSlide>
                  </SlideThumbnailContext.Provider>
                </LazyMount>
              </div>
              <p className="mt-2 text-[11px] text-black/50">
                Use the canvas “pick from module” tool on the stage to lift any element from the
                base render into a movable object, then reshape it however you like.
              </p>
            </div>
          )}
        </section>

        {/* Inspector */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-black/45">
              Module details
            </div>
            <div className="mt-3 space-y-3">
              <Field label="Name">
                <input
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Process loop — four stage"
                  className="w-full rounded-md border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-[#003FC7]"
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  rows={3}
                  placeholder="When should a builder reach for this module?"
                  className="w-full rounded-md border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-[#003FC7]"
                />
              </Field>
              <Field label="Section">
                <select
                  value={draft.sectionId}
                  onChange={(e) => patch({ sectionId: e.target.value })}
                  className="w-full rounded-md border border-black/15 px-2 py-1.5 text-sm"
                >
                  {SECTION_FRAMEWORKS.map((sf) => (
                    <option key={sf.id} value={sf.id}>
                      {sf.id} · {sf.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tags (comma separated)">
                <input
                  value={draft.tags}
                  onChange={(e) => patch({ tags: e.target.value })}
                  placeholder="process, four-step, dark"
                  className="w-full rounded-md border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-[#003FC7]"
                />
              </Field>
              <Field label="Usage notes for builders">
                <textarea
                  value={draft.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-md border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-[#003FC7]"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-black/45">
              Pre-publish checks
            </div>
            {issues.length === 0 ? (
              <p className="mt-2 text-sm text-emerald-700">
                All checks pass — ready to publish.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {issues.map((i, n) => (
                  <li
                    key={n}
                    className={`rounded-md px-2 py-1.5 text-xs ${
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
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => save.mutate("draft")}
                disabled={save.isPending || draft.name.trim().length < 3}
                className="inline-flex items-center gap-1.5 rounded-md border border-black/15 px-3 py-1.5 text-xs font-medium hover:border-[#003FC7] disabled:opacity-50"
              >
                {save.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                Save draft
              </button>
              <button
                type="button"
                onClick={() => save.mutate("published")}
                disabled={save.isPending || !publishable}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#003FC7] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0033a3] disabled:opacity-50"
              >
                <Upload size={12} /> Publish to library
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(emptyDraft());
                  setSavedNote(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-black/15 px-3 py-1.5 text-xs hover:border-[#003FC7]"
              >
                <Plus size={12} /> New blank module
              </button>
            </div>
            {savedNote && <p className="mt-2 text-xs text-emerald-700">{savedNote}</p>}
            {save.isError && (
              <p className="mt-2 text-xs text-red-600">
                Save failed: {(save.error as Error).message}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-black/45">
                Custom modules
              </div>
              <span className="text-[11px] text-black/40">{modules.data?.length ?? 0}</span>
            </div>
            {modules.isLoading && (
              <p className="mt-2 text-xs text-black/45">Loading…</p>
            )}
            <ul className="mt-2 space-y-1.5">
              {(modules.data ?? []).map((row) => (
                <li
                  key={row.id}
                  className={`rounded-lg border px-2.5 py-2 ${
                    draft.id === row.id ? "border-[#003FC7] bg-[#003FC7]/5" : "border-black/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadRow(row)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="truncate text-xs font-semibold text-black/80">
                        {row.name}
                      </div>
                      <div className="truncate font-mono text-[10px] text-black/40">
                        {row.module_key} · {row.base_variant_id}
                      </div>
                    </button>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        row.status === "published"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-black/5 text-black/50"
                      }`}
                    >
                      {row.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => duplicateRow(row)}
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
                </li>
              ))}
              {!modules.isLoading && (modules.data ?? []).length === 0 && (
                <li className="py-4 text-center text-xs text-black/40">
                  No custom modules yet — build one above.
                </li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-black/55">{label}</span>
      {children}
    </label>
  );
}

const STEPS: Array<{ n: string; title: string; body: string }> = [
  {
    n: "1",
    title: "Pick a base",
    body: "Blank canvas for a from-scratch design, or an existing module when you want its structure, data wiring and brand chrome.",
  },
  {
    n: "2",
    title: "Choose a guide",
    body: "Set any module as a reference. Trace it on the stage at 25% opacity or study it in the card below the stage.",
  },
  {
    n: "3",
    title: "Compose",
    body: "Add text, shapes, icons, photos and SVGs from the studio toolbar. Pick from the base render to lift existing elements into movable objects.",
  },
  {
    n: "4",
    title: "Test",
    body: "Switch brand modes to check contrast, and clear the checks panel — off-stage objects, empty imagery and thin descriptions all get flagged.",
  },
  {
    n: "5",
    title: "Publish",
    body: "Publishing adds the module to the Add slide gallery for every builder. Insert it and export to PPTX: objects ship as native, editable shapes.",
  },
];

function StepGuide() {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-black/45">
          How to build and ship a module
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-black/15 px-2 py-1 text-[11px] hover:border-[#003FC7]"
        >
          {open ? "Hide steps" : "Show steps"}
        </button>
      </div>
      {open && (
        <ol className="mt-3 grid gap-3 md:grid-cols-5">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-xl bg-black/[0.03] p-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#003FC7] text-[11px] font-semibold text-white">
                {s.n}
              </div>
              <div className="mt-2 text-xs font-semibold text-black/80">{s.title}</div>
              <p className="mt-1 text-[11px] leading-relaxed text-black/55">{s.body}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

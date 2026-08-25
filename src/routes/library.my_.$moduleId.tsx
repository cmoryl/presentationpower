// Edit a saved module: click a card in "My library" to land here.
// Click-to-edit copy on the rendered slide, plus meta + look controls.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Loader2, RotateCcw, Save, Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { LiveEditOverlay } from "@/components/slide/LiveEditOverlay";
import { DeckPackScope, packBrand } from "@/components/slide/DeckPackScope";
import { SlideBackdropContext } from "@/components/slide/SlideChrome";
import { backdropForVariant } from "@/components/slide/variantBackdrop";
import { StyleLookPicker } from "@/components/skins/StyleLookPicker";
import { useEffectiveStylePack } from "@/hooks/use-template-registry";
import {
  collectStringPaths,
  fieldLabel,
  readPath,
  setPath,
} from "@/components/library/VariantSampleEditor";

import { listMyModules, updateSavedModule, deleteSavedModule } from "@/lib/saved-modules.functions";
import { byId, MODULE_VARIANTS, BRAND_MODES, type ModuleVariant } from "@/lib/taxonomy";
import type { ModuleInstance } from "@/lib/module-instance";

export const Route = createFileRoute("/library/my_/$moduleId")({
  head: () => ({
    meta: [
      { title: "Edit saved module · TransPerfect Element" },
      {
        name: "description",
        content: "Edit the copy, look and metadata of a module you saved to your library.",
      },
      { property: "og:title", content: "Edit saved module · TransPerfect Element" },
      {
        property: "og:description",
        content: "Click-to-edit copy, style pack and metadata for saved library modules.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditSavedModule,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-red-600">Module failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Saved module not found.</div>,
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

const RESERVED = ["__canvasBlocks", "__pack", "__designRecipe", "__mode"];

function splitContent(raw: Record<string, unknown>) {
  const content: Record<string, unknown> = {};
  const sidecars: Record<string, unknown> = {};
  Object.entries(raw ?? {}).forEach(([k, v]) => {
    if (RESERVED.includes(k)) sidecars[k] = v;
    else content[k] = v;
  });
  return { content, sidecars };
}

function EditSavedModule() {
  const { moduleId } = Route.useParams();
  const navigate = useNavigate();
  const listFn = useServerFn(listMyModules);
  const updateFn = useServerFn(updateSavedModule);
  const delFn = useServerFn(deleteSavedModule);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["saved-modules"],
    queryFn: () => listFn(),
  });
  const row = ((data ?? []) as SavedRow[]).find((r) => r.id === moduleId) ?? null;

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center gap-2 p-10 text-sm text-black/60">
          <Loader2 size={14} className="animate-spin" /> Loading module…
        </div>
      </AppShell>
    );
  }
  if (error) {
    return (
      <AppShell>
        <div className="p-10 text-sm text-red-600">{(error as Error).message}</div>
      </AppShell>
    );
  }
  if (!row) {
    return (
      <AppShell>
        <div className="p-10">
          <div className="text-sm text-black/70">That saved module no longer exists.</div>
          <Link to="/library/my" className="mt-3 inline-block text-sm text-[#003FC7] underline">
            Back to My library
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <Editor
      key={row.id}
      row={row}
      onSaved={() => queryClient.invalidateQueries({ queryKey: ["saved-modules"] })}
      save={updateFn}
      remove={async () => {
        await delFn({ data: { id: row.id } });
        await queryClient.invalidateQueries({ queryKey: ["saved-modules"] });
        navigate({ to: "/library/my" });
      }}
    />
  );
}

function Editor({
  row,
  save,
  remove,
  onSaved,
}: {
  row: SavedRow;
  save: (args: { data: unknown }) => Promise<unknown>;
  remove: () => Promise<void>;
  onSaved: () => void;
}) {
  const initial = useMemo(() => splitContent(row.content ?? {}), [row.content]);
  const sidecars = initial.sidecars;

  const [content, setContent] = useState<Record<string, unknown>>(initial.content);
  const [title, setTitle] = useState(row.title);
  const [description, setDescription] = useState(row.description ?? "");
  const [tagsText, setTagsText] = useState((row.tags ?? []).join(", "));
  const [packId, setPackId] = useState<string | null>(
    typeof sidecars.__pack === "string" ? (sidecars.__pack as string) : null,
  );
  const [recipeId, setRecipeId] = useState<string | null>(
    typeof sidecars.__designRecipe === "string" ? (sidecars.__designRecipe as string) : null,
  );
  const [mode, setMode] = useState<"light" | "dark">(sidecars.__mode === "dark" ? "dark" : "light");
  const [liveEdit, setLiveEdit] = useState(true);

  const variant: ModuleVariant | undefined = byId(MODULE_VARIANTS, row.variant_id);
  const pack = useEffectiveStylePack(packId, recipeId);
  const brand = packBrand(
    BRAND_MODES.find((b) => b.id === (row.brand_mode ?? "bm-enterprise")) ?? BRAND_MODES[0],
    pack,
  );
  const backdrop = variant ? backdropForVariant(variant, brand.id, mode) : null;
  const canvasBlocks = Array.isArray(sidecars.__canvasBlocks)
    ? (sidecars.__canvasBlocks as ModuleInstance["canvasBlocks"])
    : undefined;

  const paths = useMemo(() => collectStringPaths(content), [content]);

  const slide = variant
    ? {
        id: row.id,
        position: 0,
        sectionId: "generic",
        variantId: variant.id,
        layoutId: variant.permittedLayoutIds[0],
        content,
        changes: [],
        canvasBlocks,
      }
    : null;

  const saveMutation = useMutation({
    mutationFn: async () =>
      save({
        data: {
          id: row.id,
          patch: {
            title: title.trim() || row.title,
            description: description.trim() || null,
            content,
            canvasBlocks,
            pack: packId,
            designRecipe: recipeId,
            mode,
            tags: tagsText
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          },
        },
      }),
    onSuccess: () => {
      onSaved();
      toast.success("Module saved");
    },
    onError: (e: Error) => toast.error(e.message || "Could not save module"),
  });

  const delMutation = useMutation({
    mutationFn: remove,
    onSuccess: () => toast.success("Module deleted"),
    onError: (e: Error) => toast.error(e.message || "Could not delete module"),
  });

  function updatePath(path: string, value: unknown) {
    setContent((prev) => setPath(prev, path, value));
  }

  function resetAll() {
    setContent(initial.content);
    setTitle(row.title);
    setDescription(row.description ?? "");
    setTagsText((row.tags ?? []).join(", "));
    setPackId(typeof sidecars.__pack === "string" ? (sidecars.__pack as string) : null);
    setRecipeId(
      typeof sidecars.__designRecipe === "string" ? (sidecars.__designRecipe as string) : null,
    );
    setMode(sidecars.__mode === "dark" ? "dark" : "light");
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/library/my"
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-black/70 transition hover:border-[#003FC7] hover:text-[#003FC7]"
        >
          <ArrowLeft size={12} /> My library
        </Link>
        <span className="rounded-full bg-black/[0.06] px-2 py-0.5 font-mono text-[10px] text-black/60">
          {row.variant_id}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLiveEdit((v) => !v)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              liveEdit
                ? "border-[#003FC7] bg-[#003FC7]/10 text-[#003FC7]"
                : "border-black/10 bg-white text-black/60"
            }`}
          >
            {liveEdit ? "Click-to-edit on" : "Click-to-edit off"}
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-black/70 transition hover:border-black/30"
          >
            <RotateCcw size={12} /> Reset
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete “${row.title}”?`)) delMutation.mutate();
            }}
            disabled={delMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-black/60 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 size={12} /> Delete
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-4 py-1.5 text-xs font-medium text-white transition hover:bg-[#0030a0] disabled:opacity-60"
          >
            {saveMutation.isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Save size={12} />
            )}
            Save changes
          </button>
        </div>
      </div>

      <h1 className="mt-4 text-3xl font-semibold">Edit saved module.</h1>
      <p className="mt-2 max-w-2xl text-sm text-black/60">
        Click any text on the slide to rewrite it, or edit fields in the panel. Changing the look
        re-skins the module without touching the copy.
      </p>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative self-start overflow-hidden rounded-2xl border border-black/10 bg-[#0a0a1a] lg:sticky lg:top-4">
          <div className="aspect-[16/9]">
            <SlideBackdropContext.Provider value={backdrop}>
              <LiveEditOverlay
                enabled={liveEdit}
                slideId={row.id}
                content={content}
                editableFields={paths}
                onChange={updatePath}
              >
                <ScaledSlide>
                  {variant && slide ? (
                    <DeckPackScope pack={pack}>
                      <VariantRenderer
                        slide={slide}
                        variant={variant}
                        brand={brand}
                        pageNumber={1}
                        subCompany={row.sub_company ?? undefined}
                        mode={mode}
                      />
                    </DeckPackScope>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-white/70">
                      Variant not found: {row.variant_id}
                    </div>
                  )}
                </ScaledSlide>
              </LiveEditOverlay>
            </SlideBackdropContext.Provider>
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-black/45">Details</div>
            <label className="mt-3 block text-[11px] font-medium text-black/60">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm focus:border-[#003FC7] focus:outline-none"
            />
            <label className="mt-3 block text-[11px] font-medium text-black/60">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm focus:border-[#003FC7] focus:outline-none"
            />
            <label className="mt-3 block text-[11px] font-medium text-black/60">
              Tags (comma separated)
            </label>
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm focus:border-[#003FC7] focus:outline-none"
            />
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.2em] text-black/45">
                Look &amp; feel
              </div>
              <div className="flex rounded-full border border-black/10 p-0.5">
                {(["light", "dark"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-full px-2.5 py-1 text-[11px] capitalize transition ${
                      mode === m ? "bg-[#003FC7] text-white" : "text-black/60"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <StyleLookPicker
              className="mt-3"
              value={packId}
              onChange={setPackId}
              recipeId={recipeId}
              onRecipeChange={setRecipeId}
            />
          </section>

          <section className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-black/45">Copy fields</div>
            <div className="mt-3 space-y-3">
              {paths.length === 0 && (
                <div className="text-xs text-black/50">
                  This module has no editable text fields.
                </div>
              )}
              {paths.map((p) => {
                const value = String(readPath(content, p) ?? "");
                const long = value.length > 60;
                return (
                  <div key={p}>
                    <label className="block text-[11px] font-medium text-black/55">
                      {fieldLabel(p)}
                    </label>
                    {long ? (
                      <textarea
                        value={value}
                        rows={3}
                        onChange={(e) => updatePath(p, e.target.value)}
                        className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm focus:border-[#003FC7] focus:outline-none"
                      />
                    ) : (
                      <input
                        value={value}
                        onChange={(e) => updatePath(p, e.target.value)}
                        className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm focus:border-[#003FC7] focus:outline-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

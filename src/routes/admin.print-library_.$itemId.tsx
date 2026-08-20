// PRINT LIBRARY MASTER ITEM EDITOR (master admin)
// ---------------------------------------------------------------------------
// Full editing rights over every print library entry — the blank templates and
// every curated import (legal, media, games, life sciences, DataForce,
// GlobalLink Web, MSA …). Saves land in `module_overrides` under scope
// "library", which `applyLibraryOverride()` merges over the shipped catalog at
// read time. So an edit here changes the master everywhere: the library card,
// the preview overlay, and every new editable copy stamped from the item.
//
// Editable here: title, summary, collection folder, tags, hero image, the
// look & feel (mode, page size, margins, density, icons, accent / primary,
// icon scale) and the item's own content — every text leaf, click-to-edit, plus
// a JSON escape hatch. "Hide" removes the entry from the library for
// non-admins; "Reset" restores the shipped definition.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, RotateCcw, Save, Undo2 } from "lucide-react";

import { AdminForbidden, isForbidden } from "@/components/AdminShell";
import { AdminLoading } from "@/components/admin/AdminPage";
import { PrintKindPreview } from "@/components/print/PrintKindPreview";
import { PrintImageEditContext } from "@/components/print/PrintImageEdit";
import { PrintLogoListContext } from "@/components/print/PrintLogoList";
import { uploadSlideMedia } from "@/lib/slide-media";
import { MultiPageThumbRail } from "@/components/print/MultiPageThumbRail";
import { isMultiProposal } from "@/components/print/MultiProposalLayout";
import { contentWritePath } from "@/components/print/ContentInspector";
import { enumerateLeafPaths } from "@/lib/print-content-schema";
import { useTaxonomy } from "@/hooks/use-taxonomy";
import {
  PRINT_LIBRARY_ITEMS,
  printTypeMeta,
  type PrintLibraryItem,
} from "@/lib/print-library/catalog";
import { parseLook, type PrintLibraryLook } from "@/lib/print-library/look";
import {
  applyLibraryOverride,
  indexOverrides,
  type ModuleOverrideRow,
} from "@/lib/module-overrides";
import {
  deleteModuleOverride,
  listModuleOverrides,
  saveModuleOverride,
} from "@/lib/module-overrides.functions";
import { blankPrintContent } from "@/lib/print-assets.types";
import type {
  SolutionProposalContent,
  PrintDensity,
  PrintHeroMedia,
  PrintHeroRule,
  PrintHeroTitleType,
  PrintMode,
  PrintPageSize,
  PrintSection,
} from "@/lib/print-assets.types";
import { PrintPageProvider } from "@/components/print/print-page-context";
import { PrintDocModeProvider, resolvePrintIconStyle } from "@/components/print/print-doc-mode";
import { LiveEditOverlay } from "@/components/slide/LiveEditOverlay";
import {
  PrintContentFitFrame,
  type PrintFitOverride,
} from "@/components/print/PrintContentFitFrame";
import { PrintFitAuditPanel } from "@/components/print/PrintFitAuditPanel";
import { MastheadRuleTypeControls } from "@/components/print/sections/hero/HeroRuleTypeControls";
import {
  NEUTRAL_FIT,
  describeFit,
  resolveContentFit,
  type PrintFitKnobs,
} from "@/lib/print-content-fit";
import type { PrintFitAuditInput, PrintFitFix, PrintFitMeasurement } from "@/lib/print-fit-audit";
import { HeroResizeHandle } from "@/components/print/HeroResizeHandle";
import { PrintOverflowOverlay } from "@/components/print/PrintOverflowOverlay";
import { usePrintOverflow } from "@/hooks/use-print-overflow";
import { weightForSection } from "@/lib/print-capacity";

export const Route = createFileRoute("/admin/print-library_/$itemId")({
  head: () => ({ meta: [{ title: "Print library master editor · Admin" }] }),
  component: MasterItemEditorPage,
});

const PAGE_SIZES: PrintPageSize[] = ["Letter", "A4", "HalfLetter", "A5", "Square"];
const MARGINS = ["tight", "standard", "wide"] as const;
const DENSITIES: PrintDensity[] = ["compact", "standard", "airy"];

type Draft = {
  title: string;
  blurb: string;
  collection: string;
  tags: string;
  heroUrl: string;
  hidden: boolean;
  look: PrintLibraryLook;
  content: Record<string, unknown> | undefined;
};

function draftFrom(item: PrintLibraryItem, hidden: boolean): Draft {
  return {
    title: item.title,
    blurb: item.blurb,
    collection: item.collection ?? "",
    tags: (item.tags ?? []).join(", "),
    heroUrl: item.heroUrl ?? "",
    hidden,
    look: { ...(item.look ?? {}) },
    // Blank starting points ship without content — seed the kind's empty shape
    // so blank templates (MSA Partnership included) are previewable + editable.
    content: item.content
      ? (structuredClone(item.content) as Record<string, unknown>)
      : blankPrintContent(item.kind),
  };
}

function MasterItemEditorPage() {
  const { itemId } = Route.useParams();
  const qc = useQueryClient();
  const listFn = useServerFn(listModuleOverrides);
  const saveFn = useServerFn(saveModuleOverride);
  const deleteFn = useServerFn(deleteModuleOverride);
  const { brandModes } = useTaxonomy();

  const rowsQ = useQuery({
    queryKey: ["module-overrides"],
    queryFn: async () => (await listFn()) as unknown as ModuleOverrideRow[],
  });

  const shipped = PRINT_LIBRARY_ITEMS.find((i) => i.id === itemId);
  const override = useMemo(
    () => (rowsQ.data ? indexOverrides(rowsQ.data, "library").get(itemId) : undefined),
    [rowsQ.data, itemId],
  );
  const saved = useMemo(
    () => (shipped ? applyLibraryOverride(shipped, override) : null),
    [shipped, override],
  );

  const savedKey = saved ? JSON.stringify({ saved, hidden: override?.hidden ?? false }) : "";
  const [draft, setDraft] = useState<Draft | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  useEffect(() => {
    setDraft(saved ? draftFrom(saved, override?.hidden ?? false) : null);
    // savedKey captures every field the draft mirrors.
  }, [savedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [mode, setMode] = useState<PrintMode>("light");
  const [proposalPage, setProposalPage] = useState(0);
  const [fitKnobs, setFitKnobs] = useState<PrintFitKnobs>(NEUTRAL_FIT);
  const [fitMeasure, setFitMeasure] = useState<PrintFitMeasurement | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Live page canvas — the hero grip measures against this box and the
  // overflow hook watches the rendered page for real clipping.
  const canvasRef = useRef<HTMLDivElement>(null);
  const overflow = usePrintOverflow(canvasRef, {
    content: draft?.content ?? null,
    look: draft?.look ?? null,
    mode,
  });


  const brand = useMemo(
    () =>
      brandModes.find((b) => b.id === (shipped?.divisionId ?? "")) ??
      brandModes.find((b) => b.id === "bm-enterprise") ??
      brandModes[0],
    [brandModes, shipped],
  );

  const save = useMutation({
    mutationFn: async (d: Draft) =>
      saveFn({
        data: {
          scope: "library",
          moduleId: itemId,
          patch: {
            label: d.title.trim() || null,
            blurb: d.blurb.trim() || null,
            collection: d.collection.trim() || null,
            heroUrl: d.heroUrl.trim() || null,
            tags: d.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            hidden: d.hidden,
            look: Object.keys(d.look).length ? (d.look as Record<string, unknown>) : null,
            content: d.content ?? null,
          },
        },
      }),
    onSuccess: () => {
      toast.success("Master item updated — the whole library uses this now");
      void qc.invalidateQueries({ queryKey: ["module-overrides"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not save this item"),
  });

  const reset = useMutation({
    mutationFn: async () => deleteFn({ data: { scope: "library", moduleId: itemId } }),
    onSuccess: () => {
      toast.success("Restored the shipped definition");
      void qc.invalidateQueries({ queryKey: ["module-overrides"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not reset"),
  });

  if (rowsQ.isLoading) return <AdminLoading label="Loading library item…" />;
  if (isForbidden(rowsQ.error)) return <AdminForbidden />;

  if (!shipped || !saved || !draft || !brand) {
    return (
      <div className="pb-24">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#03002C]">
          Print library master editor
        </h1>
        <p className="mt-3 rounded-2xl border border-dashed border-black/15 bg-white p-6 text-sm text-black/60">
          No library item with id <span className="font-mono">{itemId}</span>.{" "}
          <Link to="/library/print" className="text-[#003FC7] underline">
            Back to the print library
          </Link>
        </p>
      </div>
    );
  }

  const patch = (p: Partial<Draft>) => setDraft((prev) => ({ ...(prev ?? draft), ...p }));
  const patchLook = (p: Partial<PrintLibraryLook>) =>
    setDraft((prev) => {
      const base = prev ?? draft;
      const look = { ...base.look, ...p };
      for (const [k, v] of Object.entries(look))
        if (v === undefined || v === "") delete (look as Record<string, unknown>)[k];
      return { ...base, look };
    });

  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFrom(saved, override?.hidden ?? false));

  const textPaths = draft.content
    ? enumerateLeafPaths(draft.content).filter((p) => {
        const v = readLeaf(draft.content!, p);
        return (
          typeof v === "string" && v.trim().length > 0 && !/(^|\.)(id|kind|variantId|url)$/.test(p)
        );
      })
    : [];

  const current: Draft = draft;
  const patchPath = (path: string, value: unknown) => {
    setDraft((prev): Draft => {
      const base: Draft = prev ?? current;
      if (!base.content) return base;
      return {
        ...base,
        content: contentWritePath(base.content, path, value) as Record<string, unknown>,
      };
    });
  };

  const previewMode = draft.look.mode ?? mode;
  // Multi-page documents (solution proposals) edit one page at a time so the
  // inspector on the right stays visible next to the page you are editing.
  const multiContent = draft.content as SolutionProposalContent | undefined;
  const multiPage = !!multiContent && isMultiProposal(multiContent);
  const pageCount = multiPage ? (multiContent?.pages?.length ?? 0) : 0;
  const activePage = multiPage ? Math.min(proposalPage, Math.max(0, pageCount - 1)) : 0;
  // Restart fitting whenever content or page geometry moves.
  const fitDep = {
    content: draft.content ?? null,
    pageSize: draft.look.pageSize ?? "Letter",
    margin: draft.look.marginPreset ?? "standard",
    density: draft.look.density ?? "standard",
    mode: previewMode,
  };
  const heroMedia = (draft.content as { heroMedia?: PrintHeroMedia } | undefined)?.heroMedia;
  const fit = resolveContentFit(draft.look.contentFit);
  const patchFit = (p: Record<string, unknown>) =>
    patchLook({ contentFit: { ...fit, ...p } as PrintLibraryLook["contentFit"] });
  const patchFitOverride = (next: PrintFitOverride | null) =>
    patchLook({ fitOverride: next ?? undefined });
  const patchContent = (p: Record<string, unknown>) =>
    setDraft((prev): Draft => {
      const base: Draft = prev ?? current;
      return { ...base, content: { ...(base.content ?? {}), ...p } };
    });

  // Replaceable pictures (logo walls, maps, headshots) inside the master preview.
  const imageOverrides = ((draft.content as { imageOverrides?: Record<string, string> } | undefined)
    ?.imageOverrides ?? {}) as Record<string, string>;
  const setImageOverride = (slot: string, url: string | null) => {
    const next = { ...imageOverrides };
    if (url) next[slot] = url;
    else delete next[slot];
    patchContent({ imageOverrides: next });
  };
  const onDropImage = async (slot: string, file: File) => {
    setImageBusy(true);
    try {
      const { signedUrl } = await uploadSlideMedia(file, file.name);
      setImageOverride(slot, signedUrl);
    } catch (err) {
      console.error("Image upload failed", err);
      toast.error("Could not upload that image");
    } finally {
      setImageBusy(false);
    }
  };

  return (
    <div className="pb-24">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/library/print"
            search={shipped.divisionId ? { division: shipped.divisionId } : {}}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-black/55 hover:text-[#003FC7]"
          >
            <ArrowLeft size={13} aria-hidden /> Print library
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#03002C]">
            {draft.title || saved.title}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-black/55">
            <span className="font-mono">{saved.id}</span>
            <span className="rounded-full bg-[#E0E8F5] px-2 py-0.5 font-medium text-[#03002C]">
              {printTypeMeta(saved.kind).label}
            </span>
            <span className="rounded-full bg-black/[0.06] px-2 py-0.5 font-medium text-black/60">
              {saved.source === "template" ? "Blank template" : "Curated import"}
            </span>
            {override ? (
              <span className="rounded-full bg-[#FFEB66] px-2 py-0.5 font-medium text-[#03002C]">
                Master edited
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {draft.content ? (
            <ExportProposalButton
              title={draft.title || saved.title}
              mode={previewMode}
              pageSize={draft.look.pageSize ?? "Letter"}
              label={multiPage ? "Export proposal" : "Export"}
              document={
                <PrintPageProvider
                  size={draft.look.pageSize ?? "Letter"}
                  margin={draft.look.marginPreset ?? "standard"}
                  density={draft.look.density ?? "standard"}
                >
                  <PrintDocModeProvider
                    icons={draft.look.icons ?? true}
                    iconStyle={resolvePrintIconStyle({
                      scale: draft.look.iconScale ?? 1,
                      ...(draft.look.accentOverride ? { accent: draft.look.accentOverride } : {}),
                    })}
                  >
                    <PrintImageEditContext.Provider
                      value={{
                        active: false,
                        overrides: imageOverrides,
                        onDropFile: async () => {},
                        onClear: () => {},
                      }}
                    >
                      <PrintKindPreview
                        kind={saved.kind}
                        content={draft.content}
                        brand={brand}
                        mode={previewMode}
                        pageSize={draft.look.pageSize ?? "Letter"}
                        density={draft.look.density ?? "standard"}
                      />
                    </PrintImageEditContext.Provider>
                  </PrintDocModeProvider>
                </PrintPageProvider>
              }
            />
          ) : null}
          <button

            type="button"
            onClick={() => setDraft(draftFrom(saved, override?.hidden ?? false))}
            disabled={!dirty}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3.5 py-1.5 text-xs font-medium text-[#03002C] transition hover:border-black/40 disabled:opacity-40"
          >
            <Undo2 size={13} aria-hidden /> Discard changes
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Restore the shipped definition? Every master edit is lost."))
                reset.mutate();
            }}
            disabled={!override || reset.isPending}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3.5 py-1.5 text-xs font-medium text-[#03002C] transition hover:border-[#E53D2E] hover:text-[#E53D2E] disabled:opacity-40"
          >
            <RotateCcw size={13} aria-hidden /> Reset to shipped
          </button>
          <button
            type="button"
            onClick={() => save.mutate(draft)}
            disabled={!dirty || save.isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#03002C] disabled:opacity-40"
          >
            <Save size={13} aria-hidden />
            {save.isPending ? "Updating…" : "Update master item"}
          </button>
        </div>
      </header>

      <p className="mt-3 max-w-3xl text-sm leading-[1.5] text-black/60">
        Every field here is the library master. Saving updates the card, the preview and every new
        editable copy made from this piece across all divisions. Copies people already made keep
        their own content.
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* ------------------------- Live page ------------------------- */}
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ControlGroup label="Preview mode">
              {(["light", "dark"] as PrintMode[]).map((m) => (
                <Chip key={m} on={previewMode === m} onClick={() => setMode(m)}>
                  {m}
                </Chip>
              ))}
            </ControlGroup>
            <span className="text-[11px] text-black/45">
              {brand.name} · {draft.look.pageSize ?? "Letter"}
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#f5f5f2] p-4">
            {draft.content ? (
              <div ref={canvasRef} className="relative">
                <PrintPageProvider
                  size={draft.look.pageSize ?? "Letter"}
                  margin={draft.look.marginPreset ?? "standard"}
                  density={draft.look.density ?? "standard"}
                >
                  <PrintContentFitFrame
                    settings={draft.look.contentFit}
                    dep={fitDep}
                    override={draft.look.fitOverride}
                    onChange={(knobs) => setFitKnobs(knobs)}
                    onMeasure={setFitMeasure}
                  >
                    <PrintDocModeProvider
                      icons={draft.look.icons ?? true}
                      iconStyle={resolvePrintIconStyle({
                        scale: draft.look.iconScale ?? 1,
                        ...(draft.look.accentOverride
                          ? { accent: draft.look.accentOverride }
                          : {}),
                      })}
                    >
                      <LiveEditOverlay
                        enabled
                        slideId={`library-master-${saved.id}`}
                        content={draft.content}
                        editableFields={textPaths}
                        onChange={(path, value) => patchPath(path, value)}
                      >
                        <PrintImageEditContext.Provider
                          value={{
                            active: true,
                            overrides: imageOverrides,
                            onDropFile: onDropImage,
                            onClear: (slot) => setImageOverride(slot, null),
                            busy: imageBusy,
                          }}
                        >
                          <PrintLogoListContext.Provider
                            value={{ active: true, onChange: (path, next) => patchPath(path, next) }}
                          >
                            <PrintKindPreview
                              kind={saved.kind}
                              content={draft.content}
                              brand={brand}
                              mode={previewMode}
                              pageSize={draft.look.pageSize ?? "Letter"}
                              density={draft.look.density ?? "standard"}
                              {...(multiPage ? { pageIndex: activePage } : {})}
                            />
                          </PrintLogoListContext.Provider>
                        </PrintImageEditContext.Provider>
                      </LiveEditOverlay>
                    </PrintDocModeProvider>
                  </PrintContentFitFrame>
                </PrintPageProvider>
                {/* Vertical pull-down grip for the hero band — content-aware
                    ceiling, keyboard nudges, cap warning colours. */}
                <HeroResizeHandle
                  canvasRef={canvasRef}
                  media={heroMedia}
                  onChange={(next) => patchContent({ heroMedia: next })}
                  kind={saved.kind as never}
                  usedModuleUnits={(
                    (draft.content as { modules?: PrintSection[] }).modules ?? []
                  ).reduce((n, m) => n + weightForSection(m), 0)}
                  hasTitle={!!(draft.content as { title?: string }).title}
                  hasSummary={!!(draft.content as { summary?: string }).summary}
                  disabledHint="Add hero media to this master to resize the band"
                />
                {/* Measured clipping alarm with a one-click hero relief fix. */}
                <PrintOverflowOverlay
                  state={overflow}
                  onFix={() => {
                    if (!heroMedia?.imageUrl) {
                      toast.error(
                        "Content overflows the page — remove a module or shorten copy.",
                      );
                      return;
                    }
                    const prev = heroMedia.heightPct ?? 46;
                    const next = Math.max(
                      22,
                      Math.round(prev - overflow.overflowFrac * 100 - 2),
                    );
                    if (next >= prev) {
                      toast.error(
                        "Hero is already at its minimum — remove a module or shorten copy.",
                      );
                      return;
                    }
                    patchContent({ heroMedia: { ...heroMedia, heightPct: next } });
                    toast.success(`Hero reduced to ${next}% to stop the page clipping`);
                  }}
                />
              </div>
            ) : (
              <p className="p-8 text-center text-sm text-black/55">
                This entry is a blank starting point — it has no stored content. Metadata and look &
                feel edits still apply to its library card and every asset started from it.
              </p>
            )}
          </div>

          {draft.content ? (
            <>
              <p className="mt-2 text-[11px] text-black/50">
                Click any text on the page to edit it in place. Drag the hero grip vertically to
                resize the band. Fit now: {describeFit(fitKnobs)}
                {fitMeasure && fitMeasure.overflowPx > 0
                  ? ` · ${fitMeasure.overflowPx}px past the trim`
                  : " · fits the trim"}
              </p>
              {overflow.clipped ? (
                <p
                  data-testid="master-overflow-note"
                  className="mt-2 rounded-xl border border-[#E53D2E]/40 bg-[#E53D2E]/8 px-3 py-2 text-[11px] font-medium text-[#E53D2E]"
                >
                  Page is clipping: {Math.round(overflow.overflowFrac * 100)}% (
                  {overflow.overflowPx}px) of content sits past the trim edge and will be cut in
                  print and PDF.
                </p>
              ) : null}
            </>
          ) : null}

          {multiPage && multiContent ? (
            <MultiPageThumbRail
              content={multiContent}
              brand={brand}
              mode={previewMode === "dark" ? "dark" : "light"}
              active={activePage}
              onSelect={setProposalPage}
            />
          ) : null}
        </section>


        {/* ------------------------- Inspector ------------------------- */}
        <aside className="space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto xl:pr-1">
          <Panel title="Identity">
            <Field label="Title">
              <input
                className={fieldCls}
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
              />
            </Field>
            <Field label="Summary">
              <textarea
                rows={3}
                className={fieldCls}
                value={draft.blurb}
                onChange={(e) => patch({ blurb: e.target.value })}
              />
            </Field>
            <Field label="Collection (sub-folder)">
              <input
                className={fieldCls}
                value={draft.collection}
                onChange={(e) => patch({ collection: e.target.value })}
                placeholder="e.g. Litigation"
              />
            </Field>
            <Field label="Tags (comma separated)">
              <input
                className={fieldCls}
                value={draft.tags}
                onChange={(e) => patch({ tags: e.target.value })}
              />
            </Field>
            <Field label="Hero image URL">
              <input
                className={fieldCls}
                value={draft.heroUrl}
                onChange={(e) => patch({ heroUrl: e.target.value })}
                placeholder="https://…"
              />
            </Field>
            <button
              type="button"
              onClick={() => patch({ hidden: !draft.hidden })}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-black/40"
            >
              {draft.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
              {draft.hidden ? "Hidden from the library" : "Visible in the library"}
            </button>
          </Panel>

          <Panel title="Look & feel">
            <ControlGroup label="Mode">
              <Chip on={!draft.look.mode} onClick={() => patchLook({ mode: undefined })}>
                Default
              </Chip>
              {(["light", "dark"] as PrintMode[]).map((m) => (
                <Chip key={m} on={draft.look.mode === m} onClick={() => patchLook({ mode: m })}>
                  {m}
                </Chip>
              ))}
            </ControlGroup>
            <ControlGroup label="Page">
              {PAGE_SIZES.map((s) => (
                <Chip
                  key={s}
                  on={draft.look.pageSize === s}
                  onClick={() => patchLook({ pageSize: draft.look.pageSize === s ? undefined : s })}
                >
                  {s}
                </Chip>
              ))}
            </ControlGroup>
            <ControlGroup label="Margins">
              {MARGINS.map((m) => (
                <Chip
                  key={m}
                  on={draft.look.marginPreset === m}
                  onClick={() =>
                    patchLook({ marginPreset: draft.look.marginPreset === m ? undefined : m })
                  }
                >
                  {m}
                </Chip>
              ))}
            </ControlGroup>
            <ControlGroup label="Density">
              {DENSITIES.map((d) => (
                <Chip
                  key={d}
                  on={draft.look.density === d}
                  onClick={() => patchLook({ density: draft.look.density === d ? undefined : d })}
                >
                  {d}
                </Chip>
              ))}
            </ControlGroup>
            <ControlGroup label="Icon chips">
              <Chip on={draft.look.icons === true} onClick={() => patchLook({ icons: true })}>
                On
              </Chip>
              <Chip on={draft.look.icons === false} onClick={() => patchLook({ icons: false })}>
                Off
              </Chip>
              <Chip
                on={draft.look.icons === undefined}
                onClick={() => patchLook({ icons: undefined })}
              >
                Default
              </Chip>
            </ControlGroup>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Accent">
                <input
                  type="color"
                  className="h-8 w-full cursor-pointer rounded-lg border border-black/15 bg-white"
                  value={draft.look.accentOverride ?? "#003FC7"}
                  onChange={(e) => patchLook({ accentOverride: e.target.value })}
                />
              </Field>
              <Field label="Primary">
                <input
                  type="color"
                  className="h-8 w-full cursor-pointer rounded-lg border border-black/15 bg-white"
                  value={draft.look.primaryOverride ?? "#03002C"}
                  onChange={(e) => patchLook({ primaryOverride: e.target.value })}
                />
              </Field>
            </div>
            <Field label={`Icon scale — ${(draft.look.iconScale ?? 1).toFixed(2)}×`}>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={draft.look.iconScale ?? 1}
                onChange={(e) => patchLook({ iconScale: Number(e.target.value) })}
                className="w-full"
              />
            </Field>
            <button
              type="button"
              onClick={() => patch({ look: {} })}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-black/40"
            >
              <RotateCcw size={12} /> Clear look overrides
            </button>
          </Panel>

          {draft.content ? (
            <>
              <Panel title="Fit audit & corrections">
                <PrintFitAuditPanel
                  measurement={fitMeasure}
                  input={
                    {
                      hasHero: Boolean(heroMedia?.imageUrl),
                      heroHeightPct: heroMedia?.heightPct ?? 46,
                      autoFitEnabled: fit.enabled,
                      minScale: fit.minScale,
                      minPad: fit.minPad,
                      pageSize: draft.look.pageSize ?? "Letter",
                      moduleCount:
                        ((draft.content as { modules?: PrintSection[] }).modules ?? []).length,
                    } satisfies PrintFitAuditInput
                  }
                  override={draft.look.fitOverride}
                  onApply={(fix: PrintFitFix) => {
                    if (fix.advisory) return;
                    if (fix.enableAutoFit)
                      patchFit({
                        enabled: true,
                        ...(fix.threshold !== undefined ? { threshold: fix.threshold } : {}),
                      });
                    if (fix.scale !== undefined || fix.pad !== undefined)
                      patchFitOverride({
                        ...(draft.look.fitOverride ?? {}),
                        ...(fix.scale !== undefined ? { scale: fix.scale } : {}),
                        ...(fix.pad !== undefined ? { pad: fix.pad } : {}),
                      });
                    if (fix.density) patchLook({ density: fix.density });
                    if (fix.heroHeightPct !== undefined && heroMedia)
                      patchContent({ heroMedia: { ...heroMedia, heightPct: fix.heroHeightPct } });
                    toast.success(fix.label);
                  }}
                  onOverride={(nextPatch) => {
                    if (nextPatch === null) {
                      patchFitOverride(null);
                      return;
                    }
                    const next: PrintFitOverride = { ...(draft.look.fitOverride ?? {}) };
                    if ("scale" in nextPatch) {
                      if (nextPatch.scale === undefined) delete next.scale;
                      else next.scale = nextPatch.scale;
                    }
                    if ("pad" in nextPatch) {
                      if (nextPatch.pad === undefined) delete next.pad;
                      else next.pad = nextPatch.pad;
                    }
                    patchFitOverride(
                      next.scale === undefined && next.pad === undefined ? null : next,
                    );
                  }}
                />
              </Panel>

              <Panel title="Content fit">
                <p className="text-[11px] leading-[1.5] text-black/55">
                  When the master page runs past the trim by more than the threshold, it pulls the
                  side margins in first, then shrinks typography and iconography together — down to
                  the floors below. Saved with the item, so every copy opens fitted.
                </p>
                <Row label="Auto-fit overflow">
                  <input
                    type="checkbox"
                    data-testid="master-toggle-content-fit"
                    checked={fit.enabled}
                    onChange={(e) => patchFit({ enabled: e.target.checked })}
                  />
                </Row>
                <Row label={`Threshold ${Math.round(fit.threshold * 100)}%`}>
                  <input
                    type="range"
                    aria-label="Content fit threshold"
                    min={2}
                    max={40}
                    step={1}
                    value={Math.round(fit.threshold * 100)}
                    onChange={(e) => patchFit({ threshold: Number(e.target.value) / 100 })}
                  />
                </Row>
                <Row label="Margin relief first">
                  <input
                    type="checkbox"
                    checked={fit.marginRelief}
                    onChange={(e) => patchFit({ marginRelief: e.target.checked })}
                  />
                </Row>
                <Row label={`Min side margin ${Math.round(fit.minPad * 100)}%`}>
                  <input
                    type="range"
                    aria-label="Minimum side margin"
                    min={40}
                    max={100}
                    step={2}
                    value={Math.round(fit.minPad * 100)}
                    onChange={(e) => patchFit({ minPad: Number(e.target.value) / 100 })}
                  />
                </Row>
                <Row label={`Min scale ${Math.round(fit.minScale * 100)}%`}>
                  <input
                    type="range"
                    aria-label="Minimum content scale"
                    min={60}
                    max={100}
                    step={1}
                    value={Math.round(fit.minScale * 100)}
                    onChange={(e) => patchFit({ minScale: Number(e.target.value) / 100 })}
                  />
                </Row>
                <Row label="Applied now">
                  <span className="text-[11px] font-medium text-black/60">
                    {describeFit(fitKnobs)}
                  </span>
                </Row>
              </Panel>

              <Panel title="Page masthead">
                <MastheadRuleTypeControls
                  rule={(draft.content as { heroRule?: PrintHeroRule }).heroRule}
                  titleType={(draft.content as { heroTitleType?: PrintHeroTitleType }).heroTitleType}
                  onChange={(next) =>
                    patchContent({
                      ...("rule" in next ? { heroRule: next.rule } : null),
                      ...("titleType" in next ? { heroTitleType: next.titleType } : null),
                    })
                  }
                />
                {heroMedia ? (
                  <Field label={`Hero height — ${Math.round(heroMedia.heightPct ?? 46)}%`}>
                    <input
                      type="range"
                      aria-label="Hero height"
                      min={20}
                      max={70}
                      step={1}
                      value={Math.round(heroMedia.heightPct ?? 46)}
                      onChange={(e) =>
                        patchContent({
                          heroMedia: { ...heroMedia, heightPct: Number(e.target.value) },
                        })
                      }
                      className="w-full"
                    />
                  </Field>
                ) : null}
              </Panel>
            </>
          ) : null}

          {draft.content ? (
            <Panel title={`Content — ${textPaths.length} text fields`}>
              <div className="max-h-[480px] space-y-2.5 overflow-y-auto pr-1">
                {textPaths.map((p) => {
                  const value = String(readLeaf(draft.content!, p) ?? "");
                  const long = value.length > 90;
                  return (
                    <label key={p} className="block">
                      <span className="block font-mono text-[10px] text-black/45">{p}</span>
                      {long ? (
                        <textarea
                          rows={3}
                          className={fieldCls}
                          value={value}
                          onChange={(e) => patchPath(p, e.target.value)}
                        />
                      ) : (
                        <input
                          className={fieldCls}
                          value={value}
                          onChange={(e) => patchPath(p, e.target.value)}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </Panel>
          ) : null}

          <Panel title="Raw content JSON">
            <button
              type="button"
              onClick={() => {
                setShowJson((v) => !v);
                setJsonText(JSON.stringify(draft.content ?? {}, null, 2));
                setJsonError(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-black/40"
            >
              {showJson ? "Hide JSON" : "Edit JSON"}
            </button>
            {showJson ? (
              <>
                <textarea
                  rows={14}
                  spellCheck={false}
                  className={`${fieldCls} font-mono text-[11px]`}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                />
                {jsonError ? <p className="text-[11px] text-[#E53D2E]">{jsonError}</p> : null}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(jsonText) as unknown;
                      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
                        throw new Error("Content must be a JSON object");
                      patch({ content: parsed as Record<string, unknown> });
                      setJsonError(null);
                      toast.success("Applied — review the page, then save");
                    } catch (e) {
                      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#03002C]"
                >
                  Apply JSON
                </button>
              </>
            ) : null}
          </Panel>

          {override?.look && !parseLook(override.look) ? (
            <p className="text-[11px] text-[#E53D2E]">
              The stored look payload has unrecognised values and is being ignored.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small UI atoms (local, matching the module studio)
// ---------------------------------------------------------------------------
const fieldCls =
  "w-full rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-xs text-[#03002C] outline-none focus:border-[#003FC7]";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-black/50">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-black/60">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-medium text-black/60">{label}</span>
      {children}
    </div>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] font-medium text-black/50">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
        on
          ? "border-[#003FC7] bg-[#003FC7] text-white"
          : "border-black/15 bg-white text-[#03002C] hover:border-black/40"
      }`}
    >
      {children}
    </button>
  );
}

/** Read a leaf value at a dotted/bracketed path. */
function readLeaf(root: Record<string, unknown>, path: string): unknown {
  let node: unknown = root;
  for (const part of path.split(".")) {
    const m = /^([^[]*)((\[\d+\])*)$/.exec(part);
    if (!m) return undefined;
    if (m[1]) node = (node as Record<string, unknown> | undefined)?.[m[1]];
    for (const idx of m[2]?.match(/\d+/g) ?? []) {
      node = (node as unknown[] | undefined)?.[Number(idx)];
    }
  }
  return node;
}

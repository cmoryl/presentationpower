// PRINT SECTION MODULE STUDIO (master admin)
// ---------------------------------------------------------------------------
// Full studio editor for one print section module (`pm-*`). Unlike the list
// editor at /admin/modules (which edits metadata: label, tags, density), this
// page edits the module's *master content* — the block every new asset and
// every picker insertion is stamped from — on a real page sheet with
// click-to-edit typography, a variant switcher, and page-format previews.
//
// Saves land in `module_overrides.content`, which `applyPrintOverride()` turns
// into the module's `make()` factory, so the change becomes the master default
// across the library, the insert drawer and `editable.ts` seeding. "Reset"
// restores the shipped code default.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw, Save, Undo2 } from "lucide-react";

import { AdminForbidden, isForbidden } from "@/components/AdminShell";
import { AdminLoading } from "@/components/admin/AdminPage";
import { LiveEditOverlay } from "@/components/slide/LiveEditOverlay";
import { PrintSectionPreviewFrame } from "@/components/print/sections/PrintSectionPreviewFrame";
import { contentWritePath } from "@/components/print/ContentInspector";
import { enumerateLeafPaths } from "@/lib/print-content-schema";
import {
  PRINT_SECTION_MODULES,
  findPrintModule,
  printModuleFamilyMeta,
} from "@/lib/print-library/section-modules";
import { sectionVariantsFor } from "@/lib/print-library/section-variants";
import type { PrintPageSize, PrintSection } from "@/lib/print-assets.types";
import type { PrintMarginPreset } from "@/lib/print-page-presets";
import { applyPrintOverride, indexOverrides, type ModuleOverrideRow } from "@/lib/module-overrides";
import { listModuleOverrides, saveModuleOverride } from "@/lib/module-overrides.functions";

export const Route = createFileRoute("/admin/modules_/print/$moduleId")({
  head: () => ({ meta: [{ title: "Module studio · Admin" }] }),
  component: PrintModuleStudioPage,
});

const ACCENT = "#003FC7";
const PAGE_SIZES: PrintPageSize[] = ["Letter", "A4", "HalfLetter", "A5"];
const MARGINS: PrintMarginPreset[] = ["tight", "standard", "wide"];

function PrintModuleStudioPage() {
  const { moduleId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(listModuleOverrides);
  const saveFn = useServerFn(saveModuleOverride);

  const rowsQ = useQuery({
    queryKey: ["module-overrides"],
    queryFn: async () => (await listFn()) as unknown as ModuleOverrideRow[],
  });

  const shipped = findPrintModule(moduleId);
  const override = useMemo(() => {
    if (!rowsQ.data) return undefined;
    return indexOverrides(rowsQ.data, "print").get(moduleId);
  }, [rowsQ.data, moduleId]);

  // The saved master block (override content when present, else the shipped
  // factory output) is the baseline the draft is reset to.
  const saved = useMemo<PrintSection | null>(() => {
    if (!shipped) return null;
    return applyPrintOverride(shipped, override).make();
  }, [shipped, override]);

  const [draft, setDraft] = useState<PrintSection | null>(null);
  // Re-seed whenever the saved baseline changes (first load, after save/reset).
  const savedKey = saved ? JSON.stringify(saved) : "";
  useEffect(() => {
    setDraft(saved ? (structuredClone(saved) as PrintSection) : null);
  }, [savedKey, saved]);

  const [pageSize, setPageSize] = useState<PrintPageSize>("Letter");
  const [marginPreset, setMarginPreset] = useState<PrintMarginPreset>("standard");
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [icons, setIcons] = useState(true);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async (content: PrintSection) =>
      saveFn({
        data: {
          scope: "print",
          moduleId,
          patch: { content: content as unknown as Record<string, unknown> },
        },
      }),
    onSuccess: () => {
      toast.success("Master module updated — every new insertion uses this block");
      void qc.invalidateQueries({ queryKey: ["module-overrides"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not save this module"),
  });

  const reset = useMutation({
    // Clear only the content patch — metadata overrides (label, tags, hidden)
    // set in the list editor stay intact.
    mutationFn: async () =>
      saveFn({ data: { scope: "print", moduleId, patch: { content: null } } }),
    onSuccess: () => {
      toast.success("Restored the shipped default");
      void qc.invalidateQueries({ queryKey: ["module-overrides"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not reset this module"),
  });

  if (rowsQ.isLoading) return <AdminLoading label="Loading module…" />;
  if (isForbidden(rowsQ.error)) return <AdminForbidden />;

  if (!shipped || !saved || !draft) {
    return (
      <div className="pb-24">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#03002C]">Module studio</h1>
        <p className="mt-3 rounded-2xl border border-dashed border-black/15 bg-white p-6 text-sm text-black/60">
          No print section module with id <span className="font-mono">{moduleId}</span>.{" "}
          <Link to="/admin/modules" className="text-[#003FC7] underline">
            Back to the module editor
          </Link>
        </p>
      </div>
    );
  }

  const merged = applyPrintOverride(shipped, override);
  const dirty = JSON.stringify(draft) !== savedKey;
  const variants = sectionVariantsFor(draft.kind);
  const textPaths = enumerateLeafPaths(draft as unknown as Record<string, unknown>).filter((p) => {
    const v = readLeaf(draft as unknown as Record<string, unknown>, p);
    return typeof v === "string" && v.trim().length > 0 && !/(^|\.)(id|kind|variantId)$/.test(p);
  });

  function patchPath(path: string, value: unknown) {
    setDraft(
      (prev) =>
        contentWritePath(
          (prev ?? draft) as unknown as Record<string, unknown>,
          path,
          value,
        ) as unknown as PrintSection,
    );
  }

  const studioIndex = PRINT_SECTION_MODULES.findIndex((m) => m.id === moduleId);
  const prev = PRINT_SECTION_MODULES[studioIndex - 1];
  const next = PRINT_SECTION_MODULES[studioIndex + 1];

  return (
    <div className="pb-24">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/admin/modules"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-black/55 hover:text-[#003FC7]"
          >
            <ArrowLeft size={13} aria-hidden /> Module editor
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#03002C]">
            {merged.label}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-black/55">
            <span className="font-mono">{merged.id}</span>
            <span className="rounded-full bg-[#E0E8F5] px-2 py-0.5 font-medium text-[#03002C]">
              {printModuleFamilyMeta(merged.family).label}
            </span>
            {override?.content ? (
              <span className="rounded-full bg-[#FFEB66] px-2 py-0.5 font-medium text-[#03002C]">
                Master content edited
              </span>
            ) : (
              <span className="rounded-full bg-black/[0.06] px-2 py-0.5 font-medium text-black/60">
                Shipped default
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {prev ? (
            <Link
              to="/admin/modules/print/$moduleId"
              params={{ moduleId: prev.id }}
              className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-black/40"
            >
              ← Previous
            </Link>
          ) : null}
          {next ? (
            <Link
              to="/admin/modules/print/$moduleId"
              params={{ moduleId: next.id }}
              className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-black/40"
            >
              Next →
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setDraft(structuredClone(saved) as PrintSection)}
            disabled={!dirty}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3.5 py-1.5 text-xs font-medium text-[#03002C] transition hover:border-black/40 disabled:opacity-40"
          >
            <Undo2 size={13} aria-hidden /> Discard changes
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm("Restore the shipped default block? Master content edits are lost.")
              )
                reset.mutate();
            }}
            disabled={!override?.content || reset.isPending}
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
            {save.isPending ? "Updating…" : "Update master module"}
          </button>
        </div>
      </header>

      <p className="mt-3 max-w-3xl text-sm leading-[1.5] text-black/60">
        Click any line on the page to edit it in place, swap the variant, and check the block against
        each page format. Saving updates the master block: the library preview, the insert drawer and
        every newly created asset stamp this content from now on. Assets already built keep their own
        copy.
      </p>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ---------------- Page sheet ---------------- */}
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ControlGroup label="Page">
              {PAGE_SIZES.map((s) => (
                <Chip key={s} on={pageSize === s} onClick={() => setPageSize(s)}>
                  {s}
                </Chip>
              ))}
            </ControlGroup>
            <ControlGroup label="Margins">
              {MARGINS.map((m) => (
                <Chip key={m} on={marginPreset === m} onClick={() => setMarginPreset(m)}>
                  {m}
                </Chip>
              ))}
            </ControlGroup>
            <ControlGroup label="Stock">
              <Chip on={mode === "light"} onClick={() => setMode("light")}>
                Light
              </Chip>
              <Chip on={mode === "dark"} onClick={() => setMode("dark")}>
                Ink
              </Chip>
            </ControlGroup>
            <ControlGroup label="Icons">
              <Chip on={icons} onClick={() => setIcons(true)}>
                On
              </Chip>
              <Chip on={!icons} onClick={() => setIcons(false)}>
                Off
              </Chip>
            </ControlGroup>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f5f5f2] p-6">
            <LiveEditOverlay
              enabled
              slideId={`module-studio-${moduleId}`}
              content={draft as unknown as Record<string, unknown>}
              editableFields={textPaths}
              onChange={(path, value) => patchPath(path, value)}
            >
              <PrintSectionPreviewFrame
                section={draft}
                mode={mode}
                accent={ACCENT}
                pageSize={pageSize}
                marginPreset={marginPreset}
                icons={icons}
                sheet
              />
            </LiveEditOverlay>
          </div>
        </section>

        {/* ---------------- Inspector ---------------- */}
        <aside className="space-y-4">
          <StudioPanel title="Variant">
            <div className="space-y-1.5">
              {variants.map((v) => {
                const on = draft.variantId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setDraft((p) => (p ? ({ ...p, variantId: v.id } as PrintSection) : p))
                    }
                    className={
                      "w-full rounded-xl border p-3 text-left transition " +
                      (on
                        ? "border-[#003FC7] bg-[#E0E8F5]"
                        : "border-black/12 bg-white hover:border-black/35")
                    }
                  >
                    <span className="block text-xs font-semibold text-[#03002C]">{v.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-[1.45] text-black/55">
                      {v.description}
                    </span>
                  </button>
                );
              })}
              {variants.length === 0 ? (
                <p className="text-xs text-black/50">This kind ships a single variant.</p>
              ) : null}
            </div>
          </StudioPanel>

          <StudioPanel title={`Copy (${textPaths.length} fields)`}>
            <div className="space-y-2.5">
              {textPaths.map((p) => {
                const value = String(readLeaf(draft as unknown as Record<string, unknown>, p) ?? "");
                const long = value.length > 60;
                return (
                  <label key={p} className="block">
                    <span className="mb-1 block font-mono text-[10px] text-black/45">{p}</span>
                    {long ? (
                      <textarea
                        rows={3}
                        value={value}
                        onChange={(e) => patchPath(p, e.target.value)}
                        className={fieldCls}
                      />
                    ) : (
                      <input
                        value={value}
                        onChange={(e) => patchPath(p, e.target.value)}
                        className={fieldCls}
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </StudioPanel>

          <StudioPanel title="Advanced (block JSON)">
            {showJson ? (
              <div className="space-y-2">
                <textarea
                  rows={16}
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    setJsonError(null);
                  }}
                  spellCheck={false}
                  className={`${fieldCls} font-mono text-[11px]`}
                />
                {jsonError ? <p className="text-[11px] text-[#E53D2E]">{jsonError}</p> : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(jsonText) as PrintSection;
                        if (!parsed || typeof parsed !== "object" || !parsed.kind) {
                          setJsonError("A section block needs a `kind` field.");
                          return;
                        }
                        setDraft(parsed);
                        setShowJson(false);
                      } catch (e) {
                        setJsonError(e instanceof Error ? e.message : "Invalid JSON");
                      }
                    }}
                    className="rounded-full bg-[#03002C] px-3 py-1.5 text-[11px] font-semibold text-white"
                  >
                    Apply JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJson(false)}
                    className="rounded-full border border-black/15 px-3 py-1.5 text-[11px] font-medium text-[#03002C]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setJsonText(JSON.stringify(draft, null, 2));
                  setJsonError(null);
                  setShowJson(true);
                }}
                className="rounded-full border border-black/15 px-3 py-1.5 text-[11px] font-medium text-[#03002C] hover:border-black/40"
              >
                Edit block JSON
              </button>
            )}
          </StudioPanel>

          <StudioPanel title="Where this lands">
            <ul className="space-y-1.5 text-[11px] leading-[1.5] text-black/60">
              <li>· Library preview at /library/print/modules</li>
              <li>· “Add section” drawer inside every print asset</li>
              <li>· Auto-seeded sections on imported print briefs</li>
            </ul>
            <div className="mt-3 flex gap-2">
              <Link
                to="/library/print/modules"
                className="rounded-full border border-black/15 px-3 py-1.5 text-[11px] font-medium text-[#03002C] hover:border-black/40"
              >
                Open library
              </Link>
              <button
                type="button"
                onClick={() => navigate({ to: "/library/print/audit" })}
                className="rounded-full border border-black/15 px-3 py-1.5 text-[11px] font-medium text-[#03002C] hover:border-black/40"
              >
                Fit audit
              </button>
            </div>
          </StudioPanel>
        </aside>
      </div>
    </div>
  );
}

const fieldCls =
  "w-full rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-xs text-[#03002C] outline-none focus:border-[#003FC7]";

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

function StudioPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4">
      <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">
        {label}
      </span>
      <div className="inline-flex gap-1">{children}</div>
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
      aria-pressed={on}
      onClick={onClick}
      className={
        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition " +
        (on
          ? "border-transparent bg-[#03002C] text-white"
          : "border-black/15 bg-white text-[#03002C] hover:border-black/40")
      }
    >
      {children}
    </button>
  );
}

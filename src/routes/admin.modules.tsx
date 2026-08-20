// Master-admin editor for library modules — print section modules (pm-*) and
// presentation module variants (MV-*). Edits are stored as overrides so the
// code registries stay intact and every change is reversible.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, RotateCcw, Save, Search } from "lucide-react";

import { AdminForbidden, isForbidden } from "@/components/AdminShell";
import { AdminLoading } from "@/components/admin/AdminPage";
import { PrintSectionPreviewFrame } from "@/components/print/sections/PrintSectionPreviewFrame";
import { PRINT_TYPES, printTypeMeta } from "@/lib/print-library/catalog";
import { PRINT_MODULE_FAMILIES, PRINT_SECTION_MODULES } from "@/lib/print-library/section-modules";
import { MODULE_FAMILIES, MODULE_VARIANTS } from "@/lib/taxonomy";
import type { PrintAssetKind } from "@/lib/print-assets.types";
import {
  applyPrintOverride,
  indexOverrides,
  type ModuleOverrideRow,
  type ModuleOverrideScope,
} from "@/lib/module-overrides";
import { PageTemplateCard } from "@/components/print/PageTemplateShelf";
import { updatePrintPageTemplate } from "@/lib/print-page-templates.functions";
import {
  PAGE_TEMPLATE_QUERY_KEY,
  pageTemplateMatches,
  usePrintPageTemplates,
  type PrintPageTemplate,
} from "@/lib/print-page-templates";
import {
  deleteModuleOverride,
  listModuleOverrides,
  saveModuleOverride,
} from "@/lib/module-overrides.functions";

export const Route = createFileRoute("/admin/modules")({
  head: () => ({ meta: [{ title: "Module editor · Admin" }] }),
  component: ModuleEditorPage,
});

const ACCENT = "#003FC7";
const DENSITIES = ["compact", "standard", "tall"] as const;

type Draft = {
  label: string;
  description: string;
  tags: string;
  density: string;
  bestFor: string[];
  hidden: boolean;
  notes: string;
};

function ModuleEditorPage() {
  const listFn = useServerFn(listModuleOverrides);
  const saveFn = useServerFn(saveModuleOverride);
  const delFn = useServerFn(deleteModuleOverride);
  const qc = useQueryClient();

  const [tab, setTab] = useState<ModuleOverrideScope | "page-templates">("print");
  const scope: ModuleOverrideScope = tab === "deck" ? "deck" : "print";
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const { templates } = usePrintPageTemplates();
  const visibleTemplates = useMemo(
    () => templates.filter((t) => pageTemplateMatches(t, query)),
    [templates, query],
  );

  const rowsQ = useQuery({
    queryKey: ["module-overrides"],
    queryFn: async () => (await listFn()) as unknown as ModuleOverrideRow[],
  });

  const save = useMutation({
    mutationFn: async (vars: { moduleId: string; draft: Draft }) =>
      saveFn({
        data: {
          scope,
          moduleId: vars.moduleId,
          patch: {
            label: vars.draft.label.trim() || null,
            description: vars.draft.description.trim() || null,
            tags: vars.draft.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            density: vars.draft.density || null,
            bestFor: vars.draft.bestFor.length ? vars.draft.bestFor : null,
            hidden: vars.draft.hidden,
            notes: vars.draft.notes.trim() || null,
          },
        },
      }),
    onSuccess: (_d, vars) => {
      toast.success("Module updated");
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[vars.moduleId];
        return next;
      });
      void qc.invalidateQueries({ queryKey: ["module-overrides"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not save this module"),
  });

  const reset = useMutation({
    mutationFn: async (moduleId: string) => delFn({ data: { scope, moduleId } }),
    onSuccess: () => {
      toast.success("Reset to the library default");
      void qc.invalidateQueries({ queryKey: ["module-overrides"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not reset this module"),
  });

  if (rowsQ.isLoading) return <AdminLoading label="Loading module overrides…" />;
  if (isForbidden(rowsQ.error)) return <AdminForbidden />;

  const overrides = indexOverrides(rowsQ.data ?? [], scope);

  const q = query.trim().toLowerCase();
  const printRows = PRINT_SECTION_MODULES.map((m) =>
    applyPrintOverride(m, overrides.get(m.id)),
  ).filter(
    (m) =>
      !q ||
      m.id.toLowerCase().includes(q) ||
      m.label.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q),
  );
  const deckRows = MODULE_VARIANTS.filter(
    (v) =>
      !q ||
      v.id.toLowerCase().includes(q) ||
      v.name.toLowerCase().includes(q) ||
      v.description.toLowerCase().includes(q),
  );

  const draftFor = (id: string, base: Draft): Draft => drafts[id] ?? base;
  const setDraft = (id: string, patch: Partial<Draft>, base: Draft) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? base), ...patch } }));

  return (
    <div className="pb-24">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/45">
          Master admin
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#03002C]">
          Module editor
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-[1.5] text-black/60">
          Rename, re-describe, retag, or retire any print section module and presentation module
          variant. Edits publish instantly to the libraries and pickers; ids never change, and every
          module can be reset to its shipped default.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5" role="tablist" aria-label="Module scope">
          {(
            [
              { id: "print" as const, label: `Print sections (${PRINT_SECTION_MODULES.length})` },
              { id: "deck" as const, label: `Presentation modules (${MODULE_VARIANTS.length})` },
              { id: "page-templates" as const, label: `Page templates (${templates.length})` },
            ] satisfies { id: ModuleOverrideScope | "page-templates"; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition " +
                (tab === t.id
                  ? "border-transparent bg-[#03002C] text-white"
                  : "border-black/15 bg-white text-[#03002C] hover:border-black/40")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5">
          <Search size={13} className="text-black/40" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules"
            aria-label="Search modules"
            className="w-48 bg-transparent text-xs text-[#03002C] outline-none placeholder:text-black/35"
          />
        </div>
      </div>

      {tab === "page-templates" ? (
        <div className="mt-6 space-y-4">
          <p className="max-w-2xl text-sm leading-[1.5] text-black/60">
            Page templates captured from real print pieces. Rename, retag, publish to everyone, or
            retire them — published templates appear in the print module library for every user.
          </p>
          {visibleTemplates.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-sm text-black/55">
              No page templates yet. Open a print piece and choose “Save as page template”.
            </p>
          ) : null}
          {visibleTemplates.map((t) => (
            <PageTemplateAdminRow key={t.id} template={t} />
          ))}
        </div>
      ) : tab === "print" ? (
        <div className="mt-6 space-y-4">
          {printRows.map((m) => {
            const ov = overrides.get(m.id);
            const base: Draft = {
              label: m.label,
              description: m.description,
              tags: m.tags.join(", "),
              density: m.density,
              bestFor: m.bestFor,
              hidden: ov?.hidden ?? false,
              notes: ov?.notes ?? "",
            };
            const d = draftFor(m.id, base);
            return (
              <article
                key={m.id}
                className="grid gap-5 rounded-2xl border border-black/10 bg-white p-5 lg:grid-cols-[1fr_360px]"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-black/45">{m.id}</span>
                    <span className="rounded-full bg-[#E0E8F5] px-2 py-0.5 text-[10px] font-medium text-[#03002C]">
                      {PRINT_MODULE_FAMILIES.find((f) => f.id === m.family)?.label ?? m.family}
                    </span>
                    {ov ? (
                      <span className="rounded-full bg-[#FFEB66] px-2 py-0.5 text-[10px] font-medium text-[#03002C]">
                        Edited
                      </span>
                    ) : null}
                  </div>

                  <Field label="Label">
                    <input
                      value={d.label}
                      onChange={(e) => setDraft(m.id, { label: e.target.value }, base)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Description">
                    <textarea
                      value={d.description}
                      rows={2}
                      onChange={(e) => setDraft(m.id, { description: e.target.value }, base)}
                      className={inputCls}
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Tags (comma separated)">
                      <input
                        value={d.tags}
                        onChange={(e) => setDraft(m.id, { tags: e.target.value }, base)}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Density">
                      <select
                        value={d.density}
                        onChange={(e) => setDraft(m.id, { density: e.target.value }, base)}
                        className={inputCls}
                      >
                        {DENSITIES.map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field label="Best for">
                    <div className="flex flex-wrap gap-1.5">
                      {PRINT_TYPES.map((t) => {
                        const on = d.bestFor.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              setDraft(
                                m.id,
                                {
                                  bestFor: on
                                    ? d.bestFor.filter((k) => k !== t.id)
                                    : [...d.bestFor, t.id as PrintAssetKind],
                                },
                                base,
                              )
                            }
                            className={
                              "rounded-full border px-2.5 py-1 text-[11px] transition " +
                              (on
                                ? "border-transparent bg-[#03002C] text-white"
                                : "border-black/15 text-[#03002C] hover:border-black/40")
                            }
                          >
                            {printTypeMeta(t.id).label}
                          </button>
                        );
                      })}
                    </div>
                  </Field>

                  <Field label="Admin note (internal)">
                    <input
                      value={d.notes}
                      onChange={(e) => setDraft(m.id, { notes: e.target.value }, base)}
                      className={inputCls}
                    />
                  </Field>

                  <div>
                    <Link
                      to="/admin/modules/print/$moduleId"
                      params={{ moduleId: m.id }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#003FC7]/30 bg-[#E0E8F5] px-3 py-1.5 text-[11px] font-semibold text-[#003FC7] transition hover:border-[#003FC7]"
                    >
                      Open in studio editor →
                    </Link>
                    <span className="ml-2 text-[11px] text-black/50">
                      Edit the master block: copy, variant, page fit
                    </span>
                  </div>

                  <RowActions
                    hidden={d.hidden}
                    edited={Boolean(ov)}
                    dirty={Boolean(drafts[m.id])}
                    busy={save.isPending || reset.isPending}
                    onToggleHidden={() => setDraft(m.id, { hidden: !d.hidden }, base)}
                    onSave={() => save.mutate({ moduleId: m.id, draft: d })}
                    onReset={() => reset.mutate(m.id)}
                  />
                </div>

                <div className="rounded-xl border border-black/10 bg-[#f5f5f2] p-3">
                  <PrintSectionPreviewFrame section={m.make()} mode="light" accent={ACCENT} />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {deckRows.map((v) => {
            const ov = overrides.get(v.id);
            const base: Draft = {
              label: ov?.label ?? v.name,
              description: ov?.description ?? v.description,
              tags: (ov?.tags ?? []).join(", "),
              density: "",
              bestFor: [],
              hidden: ov?.hidden ?? false,
              notes: ov?.notes ?? "",
            };
            const d = draftFor(v.id, base);
            return (
              <article key={v.id} className="rounded-2xl border border-black/10 bg-white p-5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-black/45">{v.id}</span>
                  <span className="rounded-full bg-[#E0E8F5] px-2 py-0.5 text-[10px] font-medium text-[#03002C]">
                    {MODULE_FAMILIES.find((f) => f.id === v.familyId)?.name ?? v.familyId}
                  </span>
                  {ov ? (
                    <span className="rounded-full bg-[#FFEB66] px-2 py-0.5 text-[10px] font-medium text-[#03002C]">
                      Edited
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <Field label="Name">
                    <input
                      value={d.label}
                      onChange={(e) => setDraft(v.id, { label: e.target.value }, base)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Tags (comma separated)">
                    <input
                      value={d.tags}
                      onChange={(e) => setDraft(v.id, { tags: e.target.value }, base)}
                      className={inputCls}
                    />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field label="Description">
                    <textarea
                      value={d.description}
                      rows={2}
                      onChange={(e) => setDraft(v.id, { description: e.target.value }, base)}
                      className={inputCls}
                    />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field label="Admin note (internal)">
                    <input
                      value={d.notes}
                      onChange={(e) => setDraft(v.id, { notes: e.target.value }, base)}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <RowActions
                  hidden={d.hidden}
                  edited={Boolean(ov)}
                  dirty={Boolean(drafts[v.id])}
                  busy={save.isPending || reset.isPending}
                  onToggleHidden={() => setDraft(v.id, { hidden: !d.hidden }, base)}
                  onSave={() => save.mutate({ moduleId: v.id, draft: d })}
                  onReset={() => reset.mutate(v.id)}
                />
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-[#03002C] outline-none focus:border-[#003FC7]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45">
        {label}
      </span>
      {children}
    </label>
  );
}

function RowActions({
  hidden,
  edited,
  dirty,
  busy,
  onToggleHidden,
  onSave,
  onReset,
}: {
  hidden: boolean;
  edited: boolean;
  dirty: boolean;
  busy: boolean;
  onToggleHidden: () => void;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        <Save size={12} /> {dirty ? "Save changes" : "Save"}
      </button>
      <button
        type="button"
        onClick={onToggleHidden}
        className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-black/40"
      >
        {hidden ? <EyeOff size={12} /> : <Eye size={12} />}
        {hidden ? "Hidden from library" : "Visible in library"}
      </button>
      {edited ? (
        <button
          type="button"
          onClick={onReset}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-black/60 hover:border-black/40 disabled:opacity-50"
        >
          <RotateCcw size={12} /> Reset to default
        </button>
      ) : null}
      {hidden ? (
        <span className="text-[11px] text-black/45">
          Hidden modules stay available to existing assets — they just leave the picker.
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page template admin row — metadata editing over the saved capture.
// ---------------------------------------------------------------------------
function PageTemplateAdminRow({ template }: { template: PrintPageTemplate }) {
  const updFn = useServerFn(updatePrintPageTemplate);
  const qc = useQueryClient();
  const [title, setTitle] = useState(template.title);
  const [description, setDescription] = useState(template.description ?? "");
  const [tags, setTags] = useState((template.tags ?? []).join(", "));

  const save = useMutation({
    mutationFn: async () =>
      updFn({
        data: {
          id: template.id,
          patch: {
            title: title.trim() || template.title,
            description: description.trim() || null,
            tags: tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          },
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PAGE_TEMPLATE_QUERY_KEY });
      toast.success("Page template updated");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not update template"),
  });

  const input =
    "w-full rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-xs text-[#03002C] outline-none focus:border-[#003FC7]";

  return (
    <article className="grid gap-5 rounded-2xl border border-black/10 bg-white p-5 lg:grid-cols-[1fr_420px]">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-black/45">{template.id.slice(0, 8)}</span>
          <span className="rounded-full bg-[#E0E8F5] px-2 py-0.5 text-[10px] font-medium text-[#03002C]">
            {template.scope === "shared" ? "Shared" : "Private"}
          </span>
          <span className="text-[10px] text-black/45">{template.kind}</span>
        </div>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
            Name
          </span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
            Description
          </span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={input}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50">
            Tags
          </span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} className={input} />
        </label>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#03002C] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          <Save size={12} /> {save.isPending ? "Saving…" : "Save"}
        </button>
      </div>
      <PageTemplateCard template={template} />
    </article>
  );
}

// PAGE TEMPLATES SHELF
// ---------------------------------------------------------------------------
// Renders saved print page templates (captured from real uploaded pieces)
// alongside the curated pm-* section modules. Each card previews the captured
// section stack at true print proportions and can be spun into a new,
// fully-editable print asset in one click.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Globe, Lock, Trash2 } from "lucide-react";

import { PrintSectionPreviewFrame } from "@/components/print/sections/PrintSectionPreviewFrame";
import { createPrintAsset } from "@/lib/print-assets.functions";
import type { PrintAssetKind } from "@/lib/print-assets.types";
import { printTypeMeta } from "@/lib/print-library/catalog";
import {
  deletePrintPageTemplate,
  updatePrintPageTemplate,
} from "@/lib/print-page-templates.functions";
import {
  PAGE_TEMPLATE_QUERY_KEY,
  instantiateTemplateContent,
  instantiateTemplateContext,
  pageTemplateKind,
  usePageTemplateAdmin,
  type PrintPageTemplate,
} from "@/lib/print-page-templates";

export function PageTemplateShelf({
  templates,
  mode = "light",
  emptyHint = true,
}: {
  templates: PrintPageTemplate[];
  mode?: "light" | "dark";
  emptyHint?: boolean;
}) {
  if (templates.length === 0) {
    if (!emptyHint) return null;
    return (
      <p className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-sm leading-relaxed text-black/55">
        No page templates yet. Open any print piece and choose{" "}
        <strong className="font-semibold text-[#03002C]">Save as page template</strong> to capture
        its section stack, layout, and typography as a reusable template — private to you, or
        published for everyone if you're an admin.
      </p>
    );
  }
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      {templates.map((t) => (
        <PageTemplateCard key={t.id} template={t} mode={mode} />
      ))}
    </div>
  );
}

export function PageTemplateCard({
  template,
  mode = "light",
}: {
  template: PrintPageTemplate;
  mode?: "light" | "dark";
}) {
  const isAdmin = usePageTemplateAdmin();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const createFn = useServerFn(createPrintAsset);
  const delFn = useServerFn(deletePrintPageTemplate);
  const updFn = useServerFn(updatePrintPageTemplate);
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  // "Reinterpret" = keep layout, hero art and typography; swap client-specific
  // copy for prompts, so the template behaves like a curated case study.
  const [reinterpret, setReinterpret] = useState(true);

  const kind = pageTemplateKind(template);
  const typeLabel = (() => {
    try {
      return printTypeMeta(kind as PrintAssetKind)?.label ?? kind;
    } catch {
      return kind;
    }
  })();
  const section = template.sections[Math.min(idx, template.sections.length - 1)];

  const remove = useMutation({
    mutationFn: async () => delFn({ data: { id: template.id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PAGE_TEMPLATE_QUERY_KEY });
      toast.success("Page template deleted");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not delete template"),
  });

  const toggleScope = useMutation({
    mutationFn: async () =>
      updFn({
        data: {
          id: template.id,
          patch: { scope: template.scope === "shared" ? "private" : "shared" },
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PAGE_TEMPLATE_QUERY_KEY });
      toast.success(
        template.scope === "shared" ? "Unpublished — now private" : "Published to everyone",
      );
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not change visibility"),
  });

  async function useTemplate() {
    if (busy) return;
    setBusy(true);
    try {
      const row = await createFn({
        data: {
          kind,
          title: template.title,
          brandModeId: template.division_id ?? "bm-enterprise",
          content: instantiateTemplateContent(template, { reinterpret }) as unknown as Record<
            string,
            unknown
          >,
          context: instantiateTemplateContext(template),
        },
      });
      toast.success("New piece created from page template");
      void navigate({ to: "/asset/$assetId", params: { assetId: row.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not use this template");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-black/[0.07] p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-[#003FC7]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#003FC7]">
              Page template
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-black/10 px-2 py-0.5 text-[10px] font-medium text-black/55">
              {template.scope === "shared" ? <Globe size={10} /> : <Lock size={10} />}
              {template.scope === "shared" ? "Shared" : "Private"}
            </span>
            <span className="text-[10px] font-medium text-black/45">{typeLabel}</span>
          </div>
          <h3 className="mt-2 truncate text-sm font-semibold text-[#03002C]">{template.title}</h3>
          {template.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-[1.45] text-black/55">
              {template.description}
            </p>
          ) : null}
          <p className="mt-1.5 text-[10px] text-black/40">
            {template.sections.length} section{template.sections.length === 1 ? "" : "s"} captured
            {template.tags && template.tags.length ? ` · ${template.tags.join(" · ")}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={() => void useTemplate()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#003FC7]/85 disabled:opacity-60"
          >
            <Copy size={12} /> {busy ? "Opening…" : "Use template"}
          </button>
          <label className="flex items-center gap-1.5 text-[10px] font-medium text-black/55">
            <input
              type="checkbox"
              checked={reinterpret}
              onChange={(e) => setReinterpret(e.target.checked)}
            />
            Reset copy to prompts
          </label>
          {isAdmin ? (
            <button
              type="button"
              onClick={() => toggleScope.mutate()}
              className="rounded-full border border-black/15 px-2.5 py-1 text-[11px] font-medium text-[#03002C] hover:border-black/40"
            >
              {template.scope === "shared" ? "Unpublish" : "Publish to everyone"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete page template "${template.title}"?`)) remove.mutate();
            }}
            className="inline-flex items-center gap-1 rounded-full border border-black/15 px-2.5 py-1 text-[11px] font-medium text-black/55 hover:border-red-400 hover:text-red-600"
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>
      </div>

      <div className="bg-black/[0.02] p-4">
        {section ? (
          <PrintSectionPreviewFrame section={section} mode={mode} />
        ) : (
          <p className="text-xs text-black/45">This template captured no sections.</p>
        )}
        {template.sections.length > 1 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {template.sections.map((s, i) => (
              <button
                key={s.id ?? i}
                type="button"
                onClick={() => setIdx(i)}
                aria-pressed={i === idx}
                className={
                  "rounded-full border px-2 py-0.5 text-[10px] font-medium transition " +
                  (i === idx
                    ? "border-transparent bg-[#03002C] text-white"
                    : "border-black/15 bg-white text-black/60 hover:border-black/40")
                }
              >
                {i + 1}. {s.kind}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

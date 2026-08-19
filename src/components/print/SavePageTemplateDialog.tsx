// "Save as page template" — captures a print piece's section stack + layout as
// a reusable, named template that appears in /library/print/modules.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import type { PrintAssetKind, PrintSection } from "@/lib/print-assets.types";
import { savePrintPageTemplate } from "@/lib/print-page-templates.functions";
import {
  PAGE_TEMPLATE_QUERY_KEY,
  usePageTemplateAdmin,
  type PrintPageTemplateLayout,
  type PrintPageTemplateScope,
} from "@/lib/print-page-templates";

export function SavePageTemplateDialog({
  open,
  onClose,
  kind,
  sections,
  layout,
  defaultTitle,
  sourceAssetId,
  sourceLibraryItemId,
  divisionId,
}: {
  open: boolean;
  onClose: () => void;
  kind: PrintAssetKind;
  sections: PrintSection[];
  layout: PrintPageTemplateLayout;
  defaultTitle: string;
  sourceAssetId?: string | null;
  sourceLibraryItemId?: string | null;
  divisionId?: string | null;
}) {
  const isAdmin = usePageTemplateAdmin();
  const saveFn = useServerFn(savePrintPageTemplate);
  const qc = useQueryClient();

  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [scope, setScope] = useState<PrintPageTemplateScope>("private");

  useEffect(() => {
    if (open) setTitle(defaultTitle);
  }, [open, defaultTitle]);

  const save = useMutation({
    mutationFn: async () =>
      saveFn({
        data: {
          title: title.trim() || defaultTitle,
          description: description.trim() || null,
          scope,
          kind,
          divisionId: divisionId ?? null,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          sections: sections as unknown as Record<string, unknown>[],
          layout: layout as unknown as Record<string, unknown>,
          sourceAssetId: sourceAssetId ?? null,
          sourceLibraryItemId: sourceLibraryItemId ?? null,
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PAGE_TEMPLATE_QUERY_KEY });
      toast.success(
        scope === "shared"
          ? "Published as a shared page template"
          : "Saved to your page templates",
        { description: "Find it under Print → Modules → Page templates." },
      );
      onClose();
    },
    onError: (e: unknown) =>
      toast.error("Could not save page template", {
        description: e instanceof Error ? e.message : String(e),
      }),
  });

  if (!open) return null;

  const input =
    "w-full rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-xs text-[#03002C] outline-none focus:border-[#003FC7] dark:border-white/15 dark:bg-white/[0.04] dark:text-white";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Save as page template"
      data-export-ignore
    >
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#0B0A2A]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#03002C] dark:text-white">
              Save as page template
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-black/55 dark:text-white/55">
              Captures {sections.length} section{sections.length === 1 ? "" : "s"} plus this
              piece's layout and typography as a reusable template.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-black/45 hover:bg-black/5 dark:text-white/45"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50 dark:text-white/50">
              Template name
            </span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50 dark:text-white/50">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="When should someone reach for this template?"
              className={input}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50 dark:text-white/50">
              Tags (comma separated)
            </span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="life sciences, spotlight, kpi"
              className={input}
            />
          </label>

          <fieldset className="rounded-xl border border-black/10 p-2.5 dark:border-white/10">
            <legend className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/50 dark:text-white/50">
              Visibility
            </legend>
            <label className="flex items-start gap-2 py-1 text-xs text-[#03002C] dark:text-white">
              <input
                type="radio"
                name="pt-scope"
                checked={scope === "private"}
                onChange={() => setScope("private")}
                className="mt-0.5"
              />
              <span>
                <strong className="font-semibold">Private</strong> — only you see it.
              </span>
            </label>
            <label className="flex items-start gap-2 py-1 text-xs text-[#03002C] dark:text-white">
              <input
                type="radio"
                name="pt-scope"
                checked={scope === "shared"}
                onChange={() => setScope("shared")}
                disabled={!isAdmin}
                className="mt-0.5"
              />
              <span className={isAdmin ? "" : "opacity-50"}>
                <strong className="font-semibold">Shared</strong> — published for everyone
                alongside the curated modules.
                {!isAdmin ? " Admin only." : ""}
              </span>
            </label>
          </fieldset>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-medium text-[#03002C] dark:border-white/15 dark:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || sections.length === 0}
            className="rounded-full bg-[#03002C] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-[#03002C]"
          >
            {save.isPending ? "Saving…" : "Save template"}
          </button>
        </div>
      </div>
    </div>
  );
}

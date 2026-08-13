import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, Bookmark, Check, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { saveModule } from "@/lib/saved-modules.functions";
import { inferRoleFromVariant, type ModuleRole } from "@/lib/module-instance";

const ROLES: { id: ModuleRole; label: string }[] = [
  { id: "hero", label: "Hero" },
  { id: "proof", label: "Proof" },
  { id: "stat", label: "Stat" },
  { id: "quote", label: "Quote" },
  { id: "cta", label: "CTA" },
  { id: "close", label: "Close" },
  { id: "logo", label: "Logo wall" },
  { id: "data", label: "Data" },
  { id: "story", label: "Story" },
  { id: "process", label: "Process" },
  { id: "team", label: "Team" },
  { id: "contact", label: "Contact" },
];

const TONES = ["confident", "warm", "technical", "playful", "editorial", "urgent", "trustworthy"];

export function SaveModuleDialog({
  open,
  onClose,
  variantId,
  variantName,
  content,
  brandMode,
  subCompany,
  divisionId,
  backdrop,
  canvasBlocks,
}: {
  open: boolean;
  onClose: () => void;
  variantId: string;
  variantName: string;
  content: Record<string, unknown>;
  brandMode?: string | null;
  subCompany?: string | null;
  divisionId?: string | null;
  backdrop?: Record<string, unknown> | null;
  /** Free-canvas edits authored on the slide; saved with the personal module. */
  canvasBlocks?: readonly Record<string, unknown>[] | null;
}) {
  const inferredRole = inferRoleFromVariant(variantId);
  const [title, setTitle] = useState(variantName);
  const [description, setDescription] = useState("");
  const [role, setRole] = useState<ModuleRole | "">(inferredRole ?? "");
  const [saveKind, setSaveKind] = useState<"populated" | "template">("populated");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [division, setDivision] = useState(divisionId ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(variantName);
      setDescription("");
      setRole(inferredRole ?? "");
      setSaveKind("populated");
      setTagInput("");
      setTags([]);
      setDivision(divisionId ?? "");
      setSaved(false);
    }
  }, [open, variantName, inferredRole, divisionId]);

  const queryClient = useQueryClient();
  const saveFn = useServerFn(saveModule);
  const mutation = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          variantId,
          title: title.trim() || variantName,
          description: description.trim() || null,
          content: saveKind === "template" ? {} : content,
          canvasBlocks:
            saveKind === "template" || !canvasBlocks?.length
              ? null
              : (canvasBlocks as Record<string, unknown>[]),
          brandMode: brandMode ?? null,
          subCompany: subCompany ?? null,
          divisionId: division.trim() || null,
          backdrop: (backdrop ?? null) as never,
          role: role || null,
          tags,
          saveKind,
        },
      }),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["saved-modules"] });
      window.setTimeout(onClose, 900);
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setTagInput("");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#03002C]/70 p-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Bookmark size={16} className="text-[#003FC7]" />
            <div className="text-sm font-semibold">Save to My Modules</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-icon-muted hover:bg-black/5"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-lg bg-black/[0.03] px-3 py-2 font-mono text-[11px] text-black/60">
            {variantId}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black/70">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/20"
              placeholder="e.g. Life Sciences · Bento overview"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black/70">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/20"
              placeholder="Optional note about when to use this"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-black/70">Save as</label>
              <select
                aria-label="Save Kind"
                value={saveKind}
                onChange={(e) => setSaveKind(e.target.value as "populated" | "template")}
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/20"
              >
                <option value="populated">Populated (with content)</option>
                <option value="template">Template (empty)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black/70">Role</label>
              <select
                aria-label="Role"
                value={role}
                onChange={(e) => setRole(e.target.value as ModuleRole | "")}
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/20"
              >
                <option value="">— none —</option>
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black/70">
              Division / sub-brand
            </label>
            <input
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/20"
              placeholder="e.g. globallink, trial-interactive"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-black/70">Tags</label>
            <div className="mb-1.5 flex flex-wrap gap-1">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    tags.includes(t) ? setTags(tags.filter((x) => x !== t)) : setTags([...tags, t])
                  }
                  className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                    tags.includes(t)
                      ? "border-[#003FC7] bg-[#003FC7] text-white"
                      : "border-black/15 bg-white text-black/60 hover:border-[#003FC7]/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="flex-1 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/20"
                placeholder="Add custom tag and press Enter"
              />
              <button
                type="button"
                onClick={addTag}
                className="rounded-lg border border-black/15 bg-white px-3 text-sm hover:border-[#003FC7] hover:text-[#003FC7]"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-[#003FC7]/10 px-2 py-0.5 text-[11px] text-[#003FC7]"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      aria-label={`Remove ${t}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {mutation.isError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {(mutation.error as Error)?.message ?? "Save failed."}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-black/10 bg-black/[0.02] px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-full border border-black/15 bg-white px-4 py-1.5 text-sm hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || saved}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-4 py-1.5 text-sm text-white transition hover:bg-[#002FA0] disabled:opacity-60"
          >
            {saved ? (
              <Check size={14} />
            ) : mutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Bookmark size={14} />
            )}
            {saved ? "Saved" : mutation.isPending ? "Saving…" : "Save module"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

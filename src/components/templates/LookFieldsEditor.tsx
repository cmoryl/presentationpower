// -----------------------------------------------------------------------------
// LOOK FIELDS EDITOR — the authoring form for one custom look (template row).
//
// Used by the all-in-one Alternate Looks page and the Template Studio. It owns
// nothing: the parent holds the draft, this renders the controls, runs the
// readiness suite and persists through the admin-only server functions.
// -----------------------------------------------------------------------------

import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { saveTemplate, deleteTemplate } from "@/lib/templates.functions";
import type { CustomTemplate } from "@/lib/custom-templates";
import { loadTemplateRegistry } from "@/lib/template-loader";
import { runTemplateTests, testSummary, BASE_CODES, type TemplateTest } from "@/lib/template-tests";
import { DESIGN_SKINS } from "@/lib/design-skins";
import { INDUSTRY_SKINS } from "@/lib/industry-skins";
import { Field, inputCls, PALETTE_LABELS, DENSITIES } from "./fields";

export function TestPanel({ tests }: { tests: TemplateTest[] }) {
  const dot: Record<string, string> = {
    pass: "bg-emerald-500",
    warn: "bg-amber-500",
    fail: "bg-red-500",
  };
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-[0.18em] opacity-60">
        Readiness suite
      </h3>
      <ul className="mt-2 space-y-1.5" aria-live="polite">
        {tests.map((t) => (
          <li key={t.id} className="flex items-start gap-2 text-xs">
            <span
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dot[t.status]}`}
              aria-hidden="true"
            />
            <span>
              <span className="font-medium">{t.label}</span>{" "}
              <span className="opacity-65">— {t.detail}</span>
              <span className="sr-only"> ({t.status})</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LookFieldsEditor({
  draft,
  onDraftChange,
  siblings,
  onSaved,
  onDeleted,
}: {
  draft: CustomTemplate;
  onDraftChange: (next: CustomTemplate) => void;
  /** Every other saved template — used for the duplicate-code check. */
  siblings: CustomTemplate[];
  onSaved: (saved: CustomTemplate) => void;
  onDeleted?: () => void;
}) {
  const save = useServerFn(saveTemplate);
  const remove = useServerFn(deleteTemplate);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof CustomTemplate>(k: K, v: CustomTemplate[K]) =>
    onDraftChange({ ...draft, [k]: v });

  const tests = useMemo(
    () =>
      runTemplateTests(draft, {
        existingCodes: siblings.filter((t) => t.id !== draft.id).map((t) => t.code),
      }),
    [draft, siblings],
  );
  const summary = testSummary(tests);

  async function persist(status: "draft" | "published") {
    if (status === "published" && !summary.ready) {
      toast.error("Fix every failing check before publishing.");
      return;
    }
    setBusy(true);
    try {
      const saved = await save({
        data: {
          id: draft.id || null,
          code: draft.code,
          name: draft.name,
          reference: draft.reference,
          description: draft.description,
          bestFit: draft.bestFit,
          mode: draft.mode,
          palette: draft.palette,
          typography: draft.typography,
          surfaceNote: draft.surfaceNote,
          imagery: draft.imagery,
          density: draft.density,
          baseSkinCode: draft.baseSkinCode,
          spec: draft.spec,
          status,
          notes: draft.notes,
        },
      });
      await loadTemplateRegistry(true);
      onSaved(saved);
      toast.success(status === "published" ? "Look published." : "Draft saved.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" hint="2–12 chars, e.g. C01">
          <input
            className={inputCls}
            value={draft.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Name">
          <input className={inputCls} value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Reference" hint="What the look is drawn from">
          <input
            className={inputCls}
            value={draft.reference}
            onChange={(e) => set("reference", e.target.value)}
          />
        </Field>
        <Field label="Best fit" hint="Industries · objectives">
          <input
            className={inputCls}
            value={draft.bestFit}
            onChange={(e) => set("bestFit", e.target.value)}
          />
        </Field>
        <Field label="Description" hint="One line the agent reads">
          <textarea
            rows={2}
            className={inputCls}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <Field label="Notes" hint="Internal — usage rules, do/don't">
          <textarea
            rows={2}
            className={inputCls}
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="text-xs font-medium uppercase tracking-[0.18em] opacity-60">Palette</legend>
        <div className="mt-2 grid grid-cols-5 gap-3">
          {draft.palette.map((c, i) => (
            <label key={i} className="block text-[11px]">
              <span className="opacity-60">{PALETTE_LABELS[i]}</span>
              <input
                type="color"
                aria-label={PALETTE_LABELS[i]}
                value={/^#[0-9a-f]{6}$/i.test(c) ? c : "#000000"}
                onChange={(e) => {
                  const next = [...draft.palette];
                  next[i] = e.target.value.toUpperCase();
                  set("palette", next);
                }}
                className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-black/10 bg-transparent dark:border-white/15"
              />
              <input
                className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1 font-mono text-[10px] dark:border-white/15 dark:bg-transparent"
                value={c}
                onChange={(e) => {
                  const next = [...draft.palette];
                  next[i] = e.target.value;
                  set("palette", next);
                }}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mode">
          <select
            className={inputCls}
            value={draft.mode}
            onChange={(e) => set("mode", e.target.value as "light" | "dark")}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </Field>
        <Field label="Density">
          <select
            className={inputCls}
            value={draft.density}
            onChange={(e) => set("density", e.target.value)}
          >
            {DENSITIES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Geometry base" hint="Inherits card shapes, motif and layout">
          <select
            className={inputCls}
            value={draft.baseSkinCode ?? ""}
            onChange={(e) => set("baseSkinCode", e.target.value || null)}
          >
            {BASE_CODES.map((c) => (
              <option key={c} value={c}>
                {c} · {[...DESIGN_SKINS, ...INDUSTRY_SKINS].find((s) => s.code === c)?.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Typography character">
          <input
            className={inputCls}
            value={draft.typography}
            onChange={(e) => set("typography", e.target.value)}
          />
        </Field>
        <Field label="Surface treatment" hint="glass · flat · paper · outline · raised · slab">
          <input
            className={inputCls}
            value={draft.surfaceNote}
            onChange={(e) => set("surfaceNote", e.target.value)}
          />
        </Field>
        <Field label="Imagery direction">
          <input
            className={inputCls}
            value={draft.imagery}
            onChange={(e) => set("imagery", e.target.value)}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4 dark:border-white/15">
        <button
          type="button"
          disabled={busy}
          onClick={() => persist("draft")}
          className="rounded-xl border border-black/15 px-4 py-2 text-sm disabled:opacity-50 dark:border-white/20"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : "Save draft"}
        </button>
        <button
          type="button"
          disabled={busy || !summary.ready}
          onClick={() => persist("published")}
          className="rounded-xl bg-[#003FC7] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {draft.status === "published" ? "Save & republish" : "Publish look"}
        </button>
        {draft.id && (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await remove({ data: { id: draft.id } });
                await loadTemplateRegistry(true);
                onDeleted?.();
                toast.success("Look deleted.");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-black/15 px-3 py-2 text-sm hover:border-red-400 disabled:opacity-40 dark:border-white/20"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
          </button>
        )}
        <span className="text-xs opacity-60">
          {summary.pass} pass · {summary.warn} warn · {summary.fail} fail
        </span>
      </div>

      <TestPanel tests={tests} />
    </div>
  );
}

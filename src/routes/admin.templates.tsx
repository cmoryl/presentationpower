// -----------------------------------------------------------------------------
// TEMPLATE STUDIO (admin)
//
// Three steps, in the order a template is actually shipped:
//   1. BUILD    author a new look (palette, type, surface, geometry base)
//   2. TEST     run the readiness suite, then publish
//   3. BACKGROUNDS  tune the section backgrounds of ANY look — the 58 catalog
//      skins included — with intensity, tint, section swap or a custom image.
// A fourth tab carries the written documentation and the step-by-step runbook.
// -----------------------------------------------------------------------------

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  listAllTemplates,
  saveTemplate,
  deleteTemplate,
  saveBackgroundOverride,
  deleteBackgroundOverride,
} from "@/lib/templates.functions";
import {
  templateToPack,
  templatePackId,
  type CustomTemplate,
} from "@/lib/custom-templates";
import { loadTemplateRegistry } from "@/lib/template-loader";
import type { TemplateBackgroundOverride } from "@/lib/template-registry";
import {
  composeOverrideLayers,
  defaultOverride,
  isNeutralOverride,
} from "@/lib/template-background";
import { runTemplateTests, testSummary, BASE_CODES, type TemplateTest } from "@/lib/template-tests";
import { SKIN_SCENES, type SkinScene } from "@/lib/skin-backgrounds";
import { DESIGN_SKINS } from "@/lib/design-skins";
import { INDUSTRY_SKINS } from "@/lib/industry-skins";
import { stylePackById } from "@/lib/style-packs";
import { LookPreviewTile } from "@/components/skins/SkinPreviewTile";
import { TemplateDocs } from "@/components/templates/TemplateDocs";
import { AlternateLookWizard } from "@/components/templates/AlternateLookWizard";


export const Route = createFileRoute("/admin/templates")({
  head: () => ({
    meta: [
      { title: "Template Studio · Admin · TransPerfect" },
      {
        name: "description",
        content:
          "Author new deck templates, run the readiness suite before publishing, and retune the section backgrounds of any existing template.",
      },
      { property: "og:title", content: "Template Studio · Admin" },
      {
        property: "og:description",
        content:
          "Build, document, test and publish deck templates — and edit the backgrounds of existing ones.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TemplateStudio,
});

type TabId = "build" | "intake" | "backgrounds" | "docs";
const TABS: Array<{ id: TabId; label: string; sub: string }> = [
  { id: "build", label: "Build & test", sub: "Author · validate · publish" },
  { id: "intake", label: "Alternate looks", sub: "Upload brand files · approve · publish" },
  { id: "backgrounds", label: "Backgrounds", sub: "Retune any template's sections" },
  { id: "docs", label: "Documentation", sub: "Runbook · field reference · QA" },
];


const BLANK: CustomTemplate = {
  id: "",
  code: "",
  name: "",
  reference: "",
  description: "",
  bestFit: "",
  mode: "light",
  palette: ["#F7F7F5", "#111214", "#003FC7", "#A1FBF9", "#E0E8F5"],
  typography: "Large scale · restrained weight",
  surfaceNote: "Flat canvas · one lifted plane",
  imagery: "Monumental crop · natural shadow",
  density: "Medium",
  baseSkinCode: "S01",
  spec: "",
  status: "draft",
  notes: "",
};

const PALETTE_LABELS = ["Page field", "Ink", "Accent", "Accent alt", "Support"];
const DENSITIES = ["Low", "Medium", "High"];

function TemplateStudio() {
  const [tab, setTab] = useState<TabId>("build");
  const load = useServerFn(listAllTemplates);

  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [overrides, setOverrides] = useState<TemplateBackgroundOverride[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    load()
      .then((r) => {
        setTemplates(r.templates);
        setOverrides(r.overrides);
      })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => refresh(), [refresh]);

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.25em] text-[#003FC7]">Admin</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.02em]">Template Studio</h1>
        <p className="mt-2 max-w-3xl text-sm text-black/60 dark:text-white/60">
          Add a template to the deck catalog, prove it with the readiness suite, publish it to
          everyone, and retune the section backgrounds of any existing look. Published templates
          appear everywhere a look can be chosen — library, agent, present, share and PowerPoint
          export.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Template Studio sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={`rounded-xl border px-4 py-2 text-left transition ${
              tab === t.id
                ? "border-[#003FC7] bg-[#003FC7] text-white"
                : "border-black/10 bg-white hover:border-[#003FC7]/40 dark:border-white/15 dark:bg-white/5"
            }`}
          >
            <div className="text-sm font-medium">{t.label}</div>
            <div className={`text-[11px] ${tab === t.id ? "text-white/75" : "opacity-60"}`}>
              {t.sub}
            </div>
          </button>
        ))}
        <button
          type="button"
          onClick={refresh}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-sm hover:border-[#003FC7]/40 dark:border-white/15"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Reload
        </button>
      </nav>

      {loading && (
        <p className="text-sm opacity-60" aria-live="polite">
          Loading templates…
        </p>
      )}

      {tab === "build" && (
        <BuildTab templates={templates} onChanged={refresh} />
      )}
      {tab === "intake" && (
        <AlternateLookWizard
          existingTemplateCodes={templates.map((t) => t.code)}
          onPublished={refresh}
        />
      )}
      {tab === "backgrounds" && (
        <BackgroundsTab templates={templates} overrides={overrides} onChanged={refresh} />
      )}
      {tab === "docs" && <TemplateDocs />}

    </div>
  );
}

/* ── 1 · BUILD & TEST ─────────────────────────────────────────────────── */

function BuildTab({
  templates,
  onChanged,
}: {
  templates: CustomTemplate[];
  onChanged: () => void;
}) {
  const save = useServerFn(saveTemplate);
  const remove = useServerFn(deleteTemplate);
  const [draft, setDraft] = useState<CustomTemplate>(BLANK);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof CustomTemplate>(k: K, v: CustomTemplate[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const pack = useMemo(() => {
    try {
      return templateToPack(draft.code ? draft : { ...draft, code: "preview" });
    } catch {
      return null;
    }
  }, [draft]);

  const tests = useMemo(
    () =>
      runTemplateTests(draft, {
        existingCodes: templates.filter((t) => t.id !== draft.id).map((t) => t.code),
      }),
    [draft, templates],
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
      setDraft(saved);
      await loadTemplateRegistry(true);
      onChanged();
      toast.success(status === "published" ? "Template published." : "Draft saved.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-5 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-white/5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {draft.id ? `Editing ${draft.code}` : "New template"}
          </h2>
          <button
            type="button"
            onClick={() => setDraft(BLANK)}
            className="inline-flex items-center gap-2 rounded-lg border border-black/10 px-3 py-1.5 text-xs dark:border-white/15"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Start blank
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" hint="2–12 chars, e.g. C01">
            <input
              className={inputCls}
              value={draft.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Name">
            <input
              className={inputCls}
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
            />
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
          <legend className="text-xs font-medium uppercase tracking-[0.18em] opacity-60">
            Palette
          </legend>
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
            Publish template
          </button>
          <span className="text-xs opacity-60">
            {summary.pass} pass · {summary.warn} warn · {summary.fail} fail
          </span>
        </div>

        <TestPanel tests={tests} />
      </section>

      <aside className="space-y-5">
        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-white/5">
          <h3 className="text-sm font-semibold">Live preview</h3>
          <div className="mt-3 space-y-3">
            {(["cover", "stats", "chart"] as SkinScene[]).map((scene) =>
              pack ? (
                <div key={scene}>
                  <div className="mb-1 text-[10px] uppercase tracking-[0.2em] opacity-50">
                    {scene}
                  </div>
                  <LookPreviewTile
                    pack={pack}
                    kicker={`${draft.code || "NEW"} · ${draft.density}`}
                    seed={scene}
                  />
                </div>
              ) : null,
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-white/5">
          <h3 className="text-sm font-semibold">Saved templates</h3>
          {templates.length === 0 && (
            <p className="mt-2 text-xs opacity-60">
              None yet. Fill the form and save a draft to see it here.
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 rounded-xl border border-black/10 p-2 dark:border-white/15"
              >
                <span
                  className="h-8 w-8 shrink-0 rounded-lg border border-black/10"
                  style={{
                    background: `linear-gradient(135deg, ${t.palette[0]} 0 50%, ${t.palette[2]} 50% 100%)`,
                  }}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setDraft(t)}
                >
                  <span className="block truncate text-sm">{t.name}</span>
                  <span className="block text-[10px] uppercase tracking-[0.16em] opacity-55">
                    {t.code} · {t.status}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${t.name}`}
                  onClick={async () => {
                    await remove({ data: { id: t.id } });
                    await loadTemplateRegistry(true);
                    onChanged();
                    toast.success("Template deleted.");
                  }}
                  className="rounded-lg border border-black/10 p-1.5 hover:border-red-400 dark:border-white/15"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function TestPanel({ tests }: { tests: TemplateTest[] }) {
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

/* ── 2 · BACKGROUNDS ──────────────────────────────────────────────────── */

function BackgroundsTab({
  templates,
  overrides,
  onChanged,
}: {
  templates: CustomTemplate[];
  overrides: TemplateBackgroundOverride[];
  onChanged: () => void;
}) {
  const save = useServerFn(saveBackgroundOverride);
  const remove = useServerFn(deleteBackgroundOverride);

  const options = useMemo(
    () => [
      ...templates.map((t) => ({ code: t.code, label: `${t.code} · ${t.name}`, packId: templatePackId(t.code) })),
      ...DESIGN_SKINS.map((s) => ({
        code: s.code,
        label: `${s.code} · ${s.name}`,
        packId: `skin-${s.code.toLowerCase()}`,
      })),
      ...INDUSTRY_SKINS.map((s) => ({
        code: s.code,
        label: `${s.code} · ${s.name}`,
        packId: `skin-${s.code.toLowerCase()}`,
      })),
    ],
    [templates],
  );

  const [code, setCode] = useState(options[0]?.code ?? "S01");
  const [scene, setScene] = useState<SkinScene>("cover");
  const [busy, setBusy] = useState(false);

  const selected = options.find((o) => o.code === code) ?? options[0];
  const basePack = stylePackById(selected?.packId);

  const saved = overrides.find(
    (o) => o.skinCode.toUpperCase() === code.toUpperCase() && o.scene === scene,
  );
  const [edit, setEdit] = useState<TemplateBackgroundOverride>(defaultOverride(code, scene));

  useEffect(() => {
    setEdit(saved ?? defaultOverride(code, scene));
  }, [code, scene, saved]);

  const previewLayers = useMemo(() => {
    if (!basePack) return [];
    const swap = edit.sceneSwap && (SKIN_SCENES as string[]).includes(edit.sceneSwap)
      ? edit.sceneSwap
      : scene;
    // basePack already carries the saved override; compose against the raw scene
    // so the panel shows exactly what the current sliders produce.
    return composeOverrideLayers(basePack.ground(swap), edit, basePack.tokens.surface);
  }, [basePack, edit, scene]);

  if (!basePack || !selected) return <p className="text-sm">No looks available.</p>;

  const upd = <K extends keyof TemplateBackgroundOverride>(
    k: K,
    v: TemplateBackgroundOverride[K],
  ) => setEdit((e) => ({ ...e, [k]: v }));

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="space-y-4 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-white/5">
        <h2 className="text-lg font-semibold">Edit a template background</h2>
        <Field label="Template">
          <select className={inputCls} value={code} onChange={(e) => setCode(e.target.value)}>
            {options.map((o) => (
              <option key={o.packId} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Section">
          <select
            className={inputCls}
            value={scene}
            onChange={(e) => setScene(e.target.value as SkinScene)}
          >
            {SKIN_SCENES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label={`Intensity — ${edit.intensity.toFixed(2)}`} hint="0 flat · 1 authored · 2 punchy">
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={edit.intensity}
            onChange={(e) => upd("intensity", Number(e.target.value))}
            className="w-full"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tint">
            <input
              type="color"
              value={edit.tint && /^#[0-9a-f]{6}$/i.test(edit.tint) ? edit.tint : "#003FC7"}
              onChange={(e) => upd("tint", e.target.value.toUpperCase())}
              className="h-9 w-full cursor-pointer rounded-lg border border-black/10 bg-transparent dark:border-white/15"
            />
          </Field>
          <Field label={`Tint strength — ${edit.tintStrength.toFixed(2)}`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={edit.tintStrength}
              onChange={(e) => upd("tintStrength", Number(e.target.value))}
              className="w-full"
            />
          </Field>
        </div>

        <Field label="Section swap" hint="Paint another section's composition here">
          <select
            className={inputCls}
            value={edit.sceneSwap ?? ""}
            onChange={(e) => upd("sceneSwap", e.target.value || null)}
          >
            <option value="">No swap</option>
            {SKIN_SCENES.filter((s) => s !== scene).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Backdrop image URL" hint="Optional — painted behind the CSS layers">
          <input
            className={inputCls}
            value={edit.imageUrl ?? ""}
            placeholder="/api/public/skin-backdrop?path=…"
            onChange={(e) => upd("imageUrl", e.target.value || null)}
          />
        </Field>

        <Field label="Note">
          <input
            className={inputCls}
            value={edit.note ?? ""}
            onChange={(e) => upd("note", e.target.value)}
          />
        </Field>

        <div className="flex flex-wrap gap-3 border-t border-black/10 pt-4 dark:border-white/15">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await save({
                  data: {
                    skinCode: code,
                    scene,
                    intensity: edit.intensity,
                    tint: edit.tint ?? null,
                    tintStrength: edit.tintStrength,
                    sceneSwap: edit.sceneSwap ?? null,
                    imageUrl: edit.imageUrl ?? null,
                    note: edit.note ?? "",
                  },
                });
                await loadTemplateRegistry(true);
                onChanged();
                toast.success(`${code} · ${scene} background saved.`);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-xl bg-[#003FC7] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Save background
          </button>
          <button
            type="button"
            disabled={!saved || busy}
            onClick={async () => {
              await remove({ data: { skinCode: code, scene } });
              await loadTemplateRegistry(true);
              onChanged();
              setEdit(defaultOverride(code, scene));
              toast.success("Reverted to the authored background.");
            }}
            className="rounded-xl border border-black/15 px-4 py-2 text-sm disabled:opacity-40 dark:border-white/20"
          >
            Revert to authored
          </button>
        </div>

        {overrides.length > 0 && (
          <div className="border-t border-black/10 pt-4 text-xs dark:border-white/15">
            <h3 className="font-medium uppercase tracking-[0.18em] opacity-60">Active overrides</h3>
            <ul className="mt-2 space-y-1">
              {overrides.map((o) => (
                <li key={`${o.skinCode}:${o.scene}`}>
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline"
                    onClick={() => {
                      setCode(o.skinCode);
                      setScene(o.scene as SkinScene);
                    }}
                  >
                    {o.skinCode} · {o.scene}
                  </button>{" "}
                  <span className="opacity-60">
                    ×{o.intensity.toFixed(2)}
                    {o.sceneSwap ? ` · swap ${o.sceneSwap}` : ""}
                    {o.imageUrl ? " · image" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <figure>
            <figcaption className="mb-1 text-[10px] uppercase tracking-[0.2em] opacity-50">
              Authored
            </figcaption>
            <div
              className="aspect-[16/9] w-full rounded-xl border border-black/10 dark:border-white/15"
              style={{ background: basePack.ground(scene).join(", ") }}
            />
          </figure>
          <figure>
            <figcaption className="mb-1 text-[10px] uppercase tracking-[0.2em] opacity-50">
              With your edits {isNeutralOverride(edit) ? "(no change yet)" : ""}
            </figcaption>
            <div
              className="aspect-[16/9] w-full rounded-xl border border-black/10 dark:border-white/15"
              style={{ background: previewLayers.join(", ") }}
            />
          </figure>
        </div>

        <div>
          <h3 className="text-xs font-medium uppercase tracking-[0.18em] opacity-60">
            Composition check — real slide furniture on the edited ground
          </h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <LookPreviewTile
              pack={{ ...basePack, ground: () => previewLayers }}
              kicker={`${code} · ${scene}`}
              seed={scene}
            />
            <LookPreviewTile
              pack={{ ...basePack, ground: () => previewLayers }}
              kicker={`${code} · statement`}
              seed="statement"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── shared bits ──────────────────────────────────────────────────────── */

const inputCls =
  "mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#003FC7] dark:border-white/15 dark:bg-transparent";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs">
      <span className="font-medium">{label}</span>
      {hint && <span className="ml-2 opacity-55">{hint}</span>}
      {children}
    </label>
  );
}

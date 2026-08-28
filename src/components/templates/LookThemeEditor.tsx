// -----------------------------------------------------------------------------
// LOOK THEME EDITOR — a focused "look and feel" surface for one template.
//
// The Edit look panel is the full authoring form (codes, copy, readiness gates).
// This is the designer's shortcut: palette swatches, light/dark field, surface
// and type character, with two live section slides repainting as you drag. It
// saves through the same admin server function and the same template registry,
// so the change lands in every preview, deck, present and export path — and it
// hands off straight into the Backgrounds tuner for per-section grounds.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ImageIcon } from "lucide-react";
import { SceneSlideStage } from "@/components/templates/SceneSlideStage";
import { saveTemplate } from "@/lib/templates.functions";
import { loadTemplateRegistry } from "@/lib/template-loader";
import { templateToPack, type CustomTemplate } from "@/lib/custom-templates";
import { Field, inputCls, PALETTE_LABELS, DENSITIES } from "./fields";

const TYPE_CHARACTER = [
  "Large scale · restrained weight",
  "Editorial serif headline · sans body",
  "Compact grotesk · tight tracking",
  "Wide display caps · airy body",
  "Mono accents · technical labels",
];

const SURFACE_CHARACTER = [
  "Flat canvas · one lifted plane",
  "Frosted glass · soft elevation",
  "Layered plates · visible hairlines",
  "Gradient field · no borders",
  "Paper tone · printed feel",
];

const IMAGERY_CHARACTER = [
  "Monumental crop · natural shadow",
  "Wide crop · duotone wash",
  "Abstract data texture",
  "Product macro · clean field",
  "No imagery · pure type and colour",
];

/** Loose hex input → canonical `#RRGGBB`, or "" when it isn't a hex at all. */
function normalizeHex(raw: string): string {
  const v = raw.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(v)) {
    return `#${v
      .split("")
      .map((ch) => ch + ch)
      .join("")}`.toUpperCase();
  }
  if (/^[0-9a-f]{6}$/i.test(v)) return `#${v}`.toUpperCase();
  return "";
}

function pickerValue(c: string): string {
  return /^#[0-9a-f]{6}$/i.test(c) ? c : "#000000";
}

export function LookThemeEditor({
  code,
  /** Saved row for this look, when it already has one. */
  template,
  /** Editable seed derived from the catalog pack, for looks with no row yet. */
  seed,
  onSaved,
  onOpenBackgrounds,
}: {
  code: string;
  template: CustomTemplate | null;
  seed: CustomTemplate;
  onSaved: (saved: CustomTemplate) => void;
  onOpenBackgrounds: () => void;
}) {
  const save = useServerFn(saveTemplate);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<CustomTemplate>(template ?? seed);

  // Follow the selection: switching looks must reload this editor's subject.
  useEffect(() => {
    setDraft(template ?? seed);
    // Keyed on the look code so typing in the form isn't clobbered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, template?.id]);

  const set = <K extends keyof CustomTemplate>(k: K, v: CustomTemplate[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const setStop = (i: number, value: string) =>
    setDraft((d) => {
      const palette = [...d.palette];
      palette[i] = value;
      return { ...d, palette };
    });

  // Live pack: the same adapter the catalog and deck renderers use — and then
  // the SAME background treatment (authored plates + admin replacement art +
  // tuning) every other surface applies, so the cover/stats slides below match
  // what the Backgrounds tuner saved instead of showing the untouched ground.
  const bdVersion = useSkinBackdropVersion();
  const livePack = useMemo(() => {
    try {
      const pack = templateToPack({
        ...draft,
        palette: draft.palette.map((c) => normalizeHex(c) || c),
      });
      return withOverrides(pack, (draft.code || code).trim().toUpperCase());
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, code, bdVersion]);

  async function persist() {
    setBusy(true);
    try {
      const saved = await save({
        data: {
          id: draft.id || null,
          code: (draft.code || code).trim().toUpperCase(),
          name: draft.name,
          reference: draft.reference,
          description: draft.description,
          bestFit: draft.bestFit,
          mode: draft.mode,
          palette: draft.palette.map((c) => normalizeHex(c) || c.trim()),
          typography: draft.typography,
          surfaceNote: draft.surfaceNote,
          imagery: draft.imagery,
          density: draft.density,
          baseSkinCode: draft.baseSkinCode,
          spec: draft.spec,
          status: "published",
          salesApproved: Boolean(draft.salesApproved),
          notes: draft.notes,
        },
      });
      await loadTemplateRegistry(true);
      setDraft(saved);
      onSaved(saved);
      toast.success("Theme applied — every preview and export now uses it.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-xs opacity-65">
        Set the colour, surface and type character for this look. The two slides below are the real
        renderer, so what you see is what decks and exports get. Section backgrounds are tuned
        separately.
      </p>

      {!template && (
        <p className="rounded-xl border border-[#003FC7]/25 bg-[#003FC7]/5 p-3 text-xs">
          This is still the shipped catalog look. Saving here creates the editable version under{" "}
          <strong>{(draft.code || code).toUpperCase()}</strong> and makes your theme the one every
          surface renders.
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-[0.18em] opacity-60">
              Palette
            </legend>
            <div className="mt-2 space-y-2">
              {draft.palette.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label={PALETTE_LABELS[i]}
                    value={pickerValue(c)}
                    onChange={(e) => setStop(i, e.target.value.toUpperCase())}
                    className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-black/10 bg-transparent dark:border-white/15"
                  />
                  <span className="w-24 shrink-0 text-[11px] opacity-60">{PALETTE_LABELS[i]}</span>
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-black/10 px-2 py-1.5 font-mono text-[11px] dark:border-white/15 dark:bg-transparent"
                    value={c}
                    aria-label={`${PALETTE_LABELS[i]} hex`}
                    onChange={(e) => setStop(i, e.target.value)}
                    onBlur={(e) => {
                      const normal = normalizeHex(e.target.value);
                      if (normal) setStop(i, normal);
                    }}
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-[0.18em] opacity-60">
              Field
            </legend>
            <div className="mt-2 inline-flex rounded-full border border-black/10 bg-white/70 p-1 dark:border-white/15 dark:bg-white/[0.03]">
              {(["light", "dark"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={draft.mode === m}
                  onClick={() => set("mode", m)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                    draft.mode === m ? "bg-[#003FC7] text-white shadow-sm" : "opacity-65"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </fieldset>

          <Field label="Type character">
            <select
              className={inputCls}
              value={draft.typography}
              onChange={(e) => set("typography", e.target.value)}
            >
              {[...new Set([draft.typography, ...TYPE_CHARACTER])].filter(Boolean).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Surface treatment">
            <select
              className={inputCls}
              value={draft.surfaceNote}
              onChange={(e) => set("surfaceNote", e.target.value)}
            >
              {[...new Set([draft.surfaceNote, ...SURFACE_CHARACTER])].filter(Boolean).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Imagery">
            <select
              className={inputCls}
              value={draft.imagery}
              onChange={(e) => set("imagery", e.target.value)}
            >
              {[...new Set([draft.imagery, ...IMAGERY_CHARACTER])].filter(Boolean).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Density">
            <select
              className={inputCls}
              value={draft.density}
              onChange={(e) => set("density", e.target.value)}
            >
              {[...new Set([draft.density, ...DENSITIES])].filter(Boolean).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={persist}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-[#003FC7] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Apply theme
            </button>
            <button
              type="button"
              onClick={onOpenBackgrounds}
              className="inline-flex items-center gap-2 rounded-xl border border-black/15 px-3 py-2 text-xs hover:border-[#003FC7] dark:border-white/20"
            >
              <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" /> Tune section backgrounds
            </button>
            <button
              type="button"
              onClick={() => setDraft(template ?? seed)}
              className="rounded-xl px-2 py-2 text-xs opacity-65 hover:opacity-100"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {livePack ? (
            (["cover", "stats"] as const).map((scene, i) => (
              <figure key={scene}>
                <figcaption className="mb-1 text-[10px] uppercase tracking-[0.2em] opacity-50">
                  {scene}
                </figcaption>
                <SceneSlideStage
                  pack={livePack}
                  scene={scene}
                  pageNumber={i + 1}
                  className="pointer-events-none"
                />
              </figure>
            ))
          ) : (
            <p className="text-sm opacity-65">Fix the palette values to see the live preview.</p>
          )}
        </div>
      </div>
    </div>
  );
}

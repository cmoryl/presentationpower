// -----------------------------------------------------------------------------
// BACKGROUND OVERRIDE EDITOR — retune one look's section backgrounds.
//
// Works for ANY look code: the 58 catalog skins as well as published custom
// looks. Intensity, tint, section swap and a custom/AI backdrop wrap the
// authored ground rather than replacing it, so every downstream surface
// (present, share, PPTX) stays on the same layer contract.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { saveBackgroundOverride, deleteBackgroundOverride } from "@/lib/templates.functions";
import { loadTemplateRegistry } from "@/lib/template-loader";
import type { TemplateBackgroundOverride } from "@/lib/template-registry";
import {
  composeOverrideLayers,
  defaultOverride,
  isNeutralOverride,
} from "@/lib/template-background";
import { SKIN_SCENES, type SkinScene } from "@/lib/skin-backgrounds";
import type { StylePack } from "@/lib/style-packs";
import { LookPreviewTile } from "@/components/skins/SkinPreviewTile";
import { Field, inputCls } from "./fields";
import { BackdropSourcePicker } from "./BackdropSourcePicker";

export function BackgroundOverrideEditor({
  code,
  pack,
  overrides,
  onChanged,
}: {
  /** Look code the override belongs to, e.g. "S02", "R14", "C01". */
  code: string;
  /** The look's pack (already carrying any saved override). */
  pack: StylePack;
  overrides: TemplateBackgroundOverride[];
  onChanged: () => void;
}) {
  const save = useServerFn(saveBackgroundOverride);
  const remove = useServerFn(deleteBackgroundOverride);
  const [scene, setScene] = useState<SkinScene>("cover");
  const [busy, setBusy] = useState(false);

  const saved = overrides.find(
    (o) => o.skinCode.toUpperCase() === code.toUpperCase() && o.scene === scene,
  );
  const [edit, setEdit] = useState<TemplateBackgroundOverride>(defaultOverride(code, scene));

  useEffect(() => {
    setEdit(saved ?? defaultOverride(code, scene));
  }, [code, scene, saved]);

  const previewLayers = useMemo(() => {
    const swap =
      edit.sceneSwap && (SKIN_SCENES as readonly string[]).includes(edit.sceneSwap)
        ? edit.sceneSwap
        : scene;
    return composeOverrideLayers(pack.ground(swap), edit, pack.tokens.surface);
  }, [pack, edit, scene]);

  const upd = <K extends keyof TemplateBackgroundOverride>(
    k: K,
    v: TemplateBackgroundOverride[K],
  ) => setEdit((e) => ({ ...e, [k]: v }));

  const mine = overrides.filter((o) => o.skinCode.toUpperCase() === code.toUpperCase());

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className="space-y-4">
        <div>
          <span className="text-xs font-medium">Section</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SKIN_SCENES.map((s) => {
              const tuned = mine.some((o) => o.scene === s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScene(s as SkinScene)}
                  aria-pressed={scene === s}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    scene === s
                      ? "border-[#003FC7] bg-[#003FC7] text-white"
                      : "border-black/12 hover:border-[#003FC7]/50 dark:border-white/15"
                  }`}
                >
                  {s}
                  {tuned && <span className="ml-1 opacity-70">•</span>}
                </button>
              );
            })}
          </div>
        </div>

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
              className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-black/10 bg-transparent dark:border-white/15"
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

        <Field
          label="Backdrop image"
          hint="Optional — painted behind the CSS layers. Upload one or pick from a division library."
        >
          <input
            className={inputCls}
            value={edit.imageUrl ?? ""}
            placeholder="/api/public/division-image?path=…"
            onChange={(e) => upd("imageUrl", e.target.value || null)}
          />
          <div className="mt-2">
            <BackdropSourcePicker
              value={edit.imageUrl}
              onPick={(url) => upd("imageUrl", url)}
            />
          </div>
          {edit.imageUrl && (
            <img
              src={edit.imageUrl}
              alt="Selected backdrop"
              className="mt-2 aspect-[16/9] w-full rounded-lg border border-black/10 object-cover dark:border-white/15"
            />
          )}
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
              setBusy(true);
              try {
                await remove({ data: { skinCode: code, scene } });
                await loadTemplateRegistry(true);
                onChanged();
                setEdit(defaultOverride(code, scene));
                toast.success("Reverted to the authored background.");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-xl border border-black/15 px-4 py-2 text-sm disabled:opacity-40 dark:border-white/20"
          >
            Revert to authored
          </button>
        </div>

        {mine.length > 0 && (
          <div className="border-t border-black/10 pt-4 text-xs dark:border-white/15">
            <h3 className="font-medium uppercase tracking-[0.18em] opacity-60">
              Tuned sections on {code}
            </h3>
            <ul className="mt-2 space-y-1">
              {mine.map((o) => (
                <li key={`${o.skinCode}:${o.scene}`}>
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline"
                    onClick={() => setScene(o.scene as SkinScene)}
                  >
                    {o.scene}
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
              style={{ background: pack.ground(scene).join(", ") }}
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
              pack={{ ...pack, ground: () => previewLayers }}
              kicker={`${code} · ${scene}`}
              seed={scene}
            />
            <LookPreviewTile
              pack={{ ...pack, ground: () => previewLayers }}
              kicker={`${code} · statement`}
              seed="statement"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

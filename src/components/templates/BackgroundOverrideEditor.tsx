// -----------------------------------------------------------------------------
// BACKGROUND OVERRIDE EDITOR — retune one look's section backgrounds.
//
// Works for ANY look code: the 58 catalog skins as well as published custom
// looks. Intensity, tint, section swap and a custom/AI backdrop wrap the
// authored ground rather than replacing it, so every downstream surface
// (present, share, PPTX) stays on the same layer contract.
//
// Layout contract: a scrolling control column of labelled step cards on the
// left, a sticky live-comparison rail on the right, so an admin always sees the
// authored vs edited ground while tuning.
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { inputCls } from "./fields";
import { BackdropSourcePicker } from "./BackdropSourcePicker";
import { BackdropLightbox, type BackdropShot } from "./BackdropLightbox";

/** One numbered step in the control column. */
function StepCard({
  step,
  title,
  hint,
  action,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/15 dark:bg-white/[0.03]">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#003FC7]/10 text-[10px] font-semibold text-[#003FC7]">
            {step}
          </span>
          <div>
            <h3 className="text-sm font-semibold leading-tight">{title}</h3>
            {hint && <p className="mt-0.5 text-[11px] leading-snug opacity-55">{hint}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Range input with a live value pill and end labels. */
function Slider({
  label,
  value,
  display,
  min,
  max,
  step,
  minLabel,
  maxLabel,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  minLabel: string;
  maxLabel: string;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium">{label}</span>
        <span className="rounded-full bg-[#003FC7]/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#003FC7]">
          {display}
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-[#003FC7]"
      />
      <div className="flex justify-between text-[10px] opacity-45">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

function SceneChip({
  scene,
  active,
  tuned,
  onClick,
}: {
  scene: string;
  active: boolean;
  tuned?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={tuned ? `${scene} — already tuned` : scene}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] capitalize transition ${
        active
          ? "border-[#003FC7] bg-[#003FC7] text-white shadow-sm"
          : "border-black/12 hover:border-[#003FC7]/50 hover:bg-[#003FC7]/[0.06] dark:border-white/15"
      }`}
    >
      {scene}
      {tuned && (
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-[#003FC7]"}`}
        />
      )}
    </button>
  );
}

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
  const [shot, setShot] = useState<BackdropShot | null>(null);
  const [applyScenes, setApplyScenes] = useState<string[]>([]);

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

  const baseline = saved ?? defaultOverride(code, scene);
  const dirty =
    edit.intensity !== baseline.intensity ||
    edit.tintStrength !== baseline.tintStrength ||
    (edit.tint ?? null) !== (baseline.tint ?? null) ||
    (edit.sceneSwap ?? null) !== (baseline.sceneSwap ?? null) ||
    (edit.imageUrl ?? null) !== (baseline.imageUrl ?? null) ||
    (edit.note ?? "") !== (baseline.note ?? "");

  async function persist(target: SkinScene | string, from: TemplateBackgroundOverride) {
    await save({
      data: {
        skinCode: code,
        scene: target,
        intensity: from.intensity,
        tint: from.tint ?? null,
        tintStrength: from.tintStrength,
        sceneSwap: from.sceneSwap ?? null,
        imageUrl: from.imageUrl ?? null,
        note: from.note ?? "",
      },
    });
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      {/* ── control column ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <StepCard
          step={1}
          title="Pick a section"
          hint="Each section of the deck keeps its own background tuning."
          action={
            mine.length > 0 ? (
              <span className="shrink-0 rounded-full bg-[#003FC7]/10 px-2 py-0.5 text-[10px] font-semibold text-[#003FC7]">
                {mine.length} tuned
              </span>
            ) : null
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {SKIN_SCENES.map((s) => (
              <SceneChip
                key={s}
                scene={s}
                active={scene === s}
                tuned={mine.some((o) => o.scene === s)}
                onClick={() => setScene(s as SkinScene)}
              />
            ))}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[10px] opacity-50">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#003FC7]" />
            dot = this section already has saved edits
          </p>
        </StepCard>

        <StepCard
          step={2}
          title="Tune the ground"
          hint="Strength of the authored gradient, plus an optional brand tint."
          action={
            !isNeutralOverride(edit) ? (
              <button
                type="button"
                onClick={() => {
                  const d = defaultOverride(code, scene);
                  setEdit({ ...d, imageUrl: edit.imageUrl ?? null, note: edit.note ?? "" });
                }}
                className="shrink-0 rounded-full border border-black/12 px-2 py-0.5 text-[10px] opacity-70 hover:border-[#003FC7]/50 hover:opacity-100 dark:border-white/15"
              >
                Reset values
              </button>
            ) : null
          }
        >
          <div className="space-y-4">
            <Slider
              label="Intensity"
              value={edit.intensity}
              display={`${edit.intensity.toFixed(2)}×`}
              min={0}
              max={2}
              step={0.05}
              minLabel="0 · flat"
              maxLabel="2 · punchy"
              onChange={(n) => upd("intensity", n)}
            />
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3">
              <label className="block">
                <span className="text-[11px] font-medium">Tint</span>
                <input
                  type="color"
                  aria-label="Tint colour"
                  value={edit.tint && /^#[0-9a-f]{6}$/i.test(edit.tint) ? edit.tint : "#003FC7"}
                  onChange={(e) => upd("tint", e.target.value.toUpperCase())}
                  className="mt-1.5 h-9 w-14 cursor-pointer rounded-lg border border-black/10 bg-transparent p-0.5 dark:border-white/15"
                />
              </label>
              <Slider
                label="Tint strength"
                value={edit.tintStrength}
                display={edit.tintStrength.toFixed(2)}
                min={0}
                max={1}
                step={0.02}
                minLabel="none"
                maxLabel="full"
                onChange={(n) => upd("tintStrength", n)}
              />
            </div>
          </div>
        </StepCard>

        <StepCard
          step={3}
          title="Borrow a composition"
          hint="Optional — paint another section's background shape onto this one."
        >
          <select
            aria-label="Section swap"
            className={`${inputCls} mt-0 capitalize`}
            value={edit.sceneSwap ?? ""}
            onChange={(e) => upd("sceneSwap", e.target.value || null)}
          >
            <option value="">No swap — keep this section's own</option>
            {SKIN_SCENES.filter((s) => s !== scene).map((s) => (
              <option key={s} value={s}>
                Use the {s} composition
              </option>
            ))}
          </select>
        </StepCard>

        <StepCard
          step={4}
          title="Backdrop image"
          hint="Optional photo or texture painted behind the CSS layers."
          action={
            edit.imageUrl ? (
              <button
                type="button"
                onClick={() => {
                  upd("imageUrl", null);
                  setApplyScenes([]);
                }}
                className="shrink-0 rounded-full border border-black/12 px-2 py-0.5 text-[10px] opacity-70 hover:border-red-400 hover:text-red-600 hover:opacity-100 dark:border-white/15"
              >
                Remove
              </button>
            ) : null
          }
        >
          <BackdropSourcePicker value={edit.imageUrl} onPick={(url) => upd("imageUrl", url)} />

          {edit.imageUrl ? (
            <button
              type="button"
              onClick={() => setShot({ url: edit.imageUrl!, label: `${code} · ${scene} backdrop` })}
              title="View larger"
              className="group relative mt-3 block w-full overflow-hidden rounded-xl"
            >
              <img
                src={edit.imageUrl}
                alt="Selected backdrop"
                className="aspect-[16/9] w-full rounded-xl border border-black/10 object-cover transition group-hover:brightness-95 dark:border-white/15"
              />
              <span className="absolute right-1.5 top-1.5 rounded-full bg-[#03002C]/70 px-2 py-0.5 text-[10px] text-white">
                ⤢ View larger
              </span>
            </button>
          ) : null}

          <details className="mt-3 text-[11px]">
            <summary className="cursor-pointer opacity-60 hover:opacity-100">
              Paste an image URL instead
            </summary>
            <input
              aria-label="Backdrop image URL"
              className={inputCls}
              value={edit.imageUrl ?? ""}
              placeholder="/api/public/division-image?path=…"
              onChange={(e) => upd("imageUrl", e.target.value || null)}
            />
          </details>

          {edit.imageUrl && (
            <div className="mt-3 rounded-xl border border-[#003FC7]/25 bg-[#003FC7]/[0.04] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold">Reuse in other sections</span>
                <button
                  type="button"
                  onClick={() =>
                    setApplyScenes(
                      applyScenes.length === SKIN_SCENES.length ? [] : ([...SKIN_SCENES] as string[]),
                    )
                  }
                  className="text-[10px] underline underline-offset-2 opacity-70 hover:opacity-100"
                >
                  {applyScenes.length === SKIN_SCENES.length ? "Clear all" : "Select all"}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SKIN_SCENES.map((s) => (
                  <SceneChip
                    key={s}
                    scene={s}
                    active={applyScenes.includes(s)}
                    onClick={() =>
                      setApplyScenes((prev) =>
                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                      )
                    }
                  />
                ))}
              </div>
              <button
                type="button"
                disabled={busy || applyScenes.length === 0}
                onClick={async () => {
                  setBusy(true);
                  try {
                    for (const target of applyScenes) {
                      const base =
                        overrides.find(
                          (o) =>
                            o.skinCode.toUpperCase() === code.toUpperCase() &&
                            o.scene === target,
                        ) ?? defaultOverride(code, target);
                      await persist(target, { ...base, imageUrl: edit.imageUrl ?? null });
                    }
                    await loadTemplateRegistry(true);
                    onChanged();
                    toast.success(
                      `Backdrop switched into ${applyScenes.length} section${
                        applyScenes.length === 1 ? "" : "s"
                      }.`,
                    );
                    setApplyScenes([]);
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
                className="mt-2.5 w-full rounded-xl border border-[#003FC7] px-3 py-1.5 text-xs font-semibold text-[#003FC7] transition hover:bg-[#003FC7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#003FC7]"
              >
                {applyScenes.length === 0
                  ? "Pick sections above to apply"
                  : `Apply to ${applyScenes.length} section${applyScenes.length === 1 ? "" : "s"}`}
              </button>
            </div>
          )}
        </StepCard>

        <StepCard step={5} title="Note" hint="Why this section was retuned — shown to other admins.">
          <input
            aria-label="Note"
            className={`${inputCls} mt-0`}
            placeholder="e.g. softened for dense stat walls"
            value={edit.note ?? ""}
            onChange={(e) => upd("note", e.target.value)}
          />
        </StepCard>

        {mine.length > 0 && (
          <div className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-55">
              Tuned sections on {code}
            </h3>
            <ul className="mt-2 space-y-1">
              {mine.map((o) => (
                <li key={`${o.skinCode}:${o.scene}`}>
                  <button
                    type="button"
                    onClick={() => setScene(o.scene as SkinScene)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-[11px] transition hover:bg-[#003FC7]/[0.06] ${
                      o.scene === scene ? "bg-[#003FC7]/[0.08]" : ""
                    }`}
                  >
                    <span className="font-medium capitalize">{o.scene}</span>
                    <span className="opacity-55">
                      ×{o.intensity.toFixed(2)}
                      {o.sceneSwap ? ` · swap ${o.sceneSwap}` : ""}
                      {o.imageUrl ? " · image" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── sticky live preview rail ────────────────────────────────── */}
      <div className="space-y-4 xl:sticky xl:top-4">
        <div className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-55">
              Live comparison · <span className="capitalize">{scene}</span>
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                dirty
                  ? "bg-amber-400/20 text-amber-700 dark:text-amber-300"
                  : saved
                    ? "bg-[#003FC7]/10 text-[#003FC7]"
                    : "bg-black/5 opacity-60 dark:bg-white/10"
              }`}
            >
              {dirty ? "Unsaved changes" : saved ? "Saved override" : "Authored default"}
            </span>
          </div>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
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
                With your edits {isNeutralOverride(edit) ? "· no change yet" : ""}
              </figcaption>
              <div
                className="aspect-[16/9] w-full rounded-xl border border-[#003FC7]/40"
                style={{ background: previewLayers.join(", ") }}
              />
            </figure>
          </div>

          <h3 className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-55">
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

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-black/10 pt-4 dark:border-white/15">
            <button
              type="button"
              disabled={busy || !dirty}
              onClick={async () => {
                setBusy(true);
                try {
                  await persist(scene, edit);
                  await loadTemplateRegistry(true);
                  onChanged();
                  toast.success(`${code} · ${scene} background saved.`);
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-xl bg-[#003FC7] px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
            >
              {busy ? "Saving…" : dirty ? "Save background" : "Saved"}
            </button>
            {dirty && (
              <button
                type="button"
                onClick={() => setEdit(baseline)}
                className="rounded-xl border border-black/15 px-3 py-2 text-xs dark:border-white/20"
              >
                Discard changes
              </button>
            )}
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
              className="ml-auto rounded-xl border border-black/15 px-3 py-2 text-xs disabled:opacity-40 dark:border-white/20"
            >
              Revert to authored
            </button>
          </div>
        </div>
      </div>

      <BackdropLightbox shot={shot} onClose={() => setShot(null)} />
    </div>
  );
}

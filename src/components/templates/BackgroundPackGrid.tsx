// -----------------------------------------------------------------------------
// BACKGROUND PACK GRID — every section of one look, listed at once.
//
// Companion to BackgroundOverrideEditor: instead of tuning a single section,
// this lists ALL sections of the pack side by side (authored ground vs the
// currently saved override) so an admin can see the whole set, then push a
// change into any one, a selected handful, or every section in the pack.
//
// Writes go through the same saveBackgroundOverride / deleteBackgroundOverride
// contract as the single-section editor, so downstream surfaces (present,
// share, PPTX) keep the identical layer contract.
// -----------------------------------------------------------------------------

import { useMemo, useState } from "react";
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
import { inputCls } from "./fields";
import { BackdropSourcePicker } from "./BackdropSourcePicker";

/** Which fields of the batch form get pushed into the selected sections. */
type Fields = { intensity: boolean; tint: boolean; backdrop: boolean; swap: boolean; note: boolean };

const ALL: readonly string[] = SKIN_SCENES as readonly string[];

function Check({
  on,
  label,
  hint,
  onToggle,
}: {
  on: boolean;
  label: string;
  hint?: string;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1 hover:bg-[#003FC7]/[0.05]">
      <input
        type="checkbox"
        checked={on}
        onChange={onToggle}
        className="mt-0.5 h-3.5 w-3.5 accent-[#003FC7]"
      />
      <span>
        <span className="text-[11px] font-medium">{label}</span>
        {hint && <span className="block text-[10px] leading-snug opacity-50">{hint}</span>}
      </span>
    </label>
  );
}

export function BackgroundPackGrid({
  code,
  pack,
  overrides,
  onChanged,
  onTune,
  onZoom,
}: {
  code: string;
  pack: StylePack;
  overrides: TemplateBackgroundOverride[];
  onChanged: () => void;
  /** Jump into the single-section editor for one scene. */
  onTune: (scene: SkinScene) => void;
  /** Open a backdrop image in the lightbox. */
  onZoom?: (shot: { url: string; label: string }) => void;
}) {
  const save = useServerFn(saveBackgroundOverride);
  const remove = useServerFn(deleteBackgroundOverride);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [fields, setFields] = useState<Fields>({
    intensity: true,
    tint: false,
    backdrop: false,
    swap: false,
    note: false,
  });
  const [form, setForm] = useState({
    intensity: 1,
    tint: "#003FC7",
    tintStrength: 0.18,
    imageUrl: null as string | null,
    sceneSwap: "" as string,
    note: "",
  });

  const mine = useMemo(
    () => overrides.filter((o) => o.skinCode.toUpperCase() === code.toUpperCase()),
    [overrides, code],
  );
  const savedFor = (scene: string) => mine.find((o) => o.scene === scene);

  const rows = useMemo(
    () =>
      ALL.map((scene) => {
        const saved = savedFor(scene);
        const eff = saved ?? defaultOverride(code, scene);
        const swap = eff.sceneSwap && ALL.includes(eff.sceneSwap) ? eff.sceneSwap : scene;
        return {
          scene,
          saved,
          authored: pack.ground(scene).join(", "),
          current: composeOverrideLayers(pack.ground(swap), eff, pack.tokens.surface).join(", "),
          eff,
        };
      }),
    [mine, pack, code],
  );

  const allPicked = picked.length === ALL.length;
  const targets = picked.length > 0 ? picked : [];

  async function persist(target: string, from: TemplateBackgroundOverride) {
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

  /** Merge only the ticked fields onto each target's existing override. */
  async function applyBatch(scenes: string[]) {
    if (scenes.length === 0) return;
    setBusy(true);
    try {
      for (const scene of scenes) {
        const base = savedFor(scene) ?? defaultOverride(code, scene);
        const next: TemplateBackgroundOverride = {
          ...base,
          ...(fields.intensity ? { intensity: form.intensity } : {}),
          ...(fields.tint ? { tint: form.tint, tintStrength: form.tintStrength } : {}),
          ...(fields.backdrop ? { imageUrl: form.imageUrl } : {}),
          ...(fields.swap
            ? { sceneSwap: form.sceneSwap && form.sceneSwap !== scene ? form.sceneSwap : null }
            : {}),
          ...(fields.note ? { note: form.note } : {}),
        };
        await persist(scene, next);
      }
      await loadTemplateRegistry(true);
      onChanged();
      toast.success(
        `${code} — updated ${scenes.length} section${scenes.length === 1 ? "" : "s"}.`,
      );
      setPicked([]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revert(scenes: string[]) {
    const withSaves = scenes.filter((s) => savedFor(s));
    if (withSaves.length === 0) {
      toast.info("Those sections are already on their authored background.");
      return;
    }
    setBusy(true);
    try {
      for (const scene of withSaves) await remove({ data: { skinCode: code, scene } });
      await loadTemplateRegistry(true);
      onChanged();
      toast.success(
        `Reverted ${withSaves.length} section${withSaves.length === 1 ? "" : "s"} to authored.`,
      );
      setPicked([]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const noneTicked = !Object.values(fields).some(Boolean);

  return (
    <div className="space-y-4">
      {/* ── header + selection ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/15 dark:bg-white/[0.03]">
        <div>
          <h3 className="text-sm font-semibold">All {ALL.length} section backgrounds on {code}</h3>
          <p className="mt-0.5 text-[11px] opacity-55">
            {mine.length} tuned · {ALL.length - mine.length} still authored. Tick sections, then
            update any, a few, or the whole pack at once.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#003FC7]/10 px-2.5 py-1 text-[10px] font-semibold text-[#003FC7]">
            {picked.length} selected
          </span>
          <button
            type="button"
            onClick={() => setPicked(allPicked ? [] : [...ALL])}
            className="rounded-full border border-black/12 px-3 py-1 text-[11px] hover:border-[#003FC7]/50 dark:border-white/15"
          >
            {allPicked ? "Clear all" : "Select whole pack"}
          </button>
          <button
            type="button"
            onClick={() => setPicked(mine.map((o) => o.scene))}
            disabled={mine.length === 0}
            className="rounded-full border border-black/12 px-3 py-1 text-[11px] disabled:opacity-40 hover:border-[#003FC7]/50 dark:border-white/15"
          >
            Select tuned
          </button>
        </div>
      </div>

      {/* ── the listing ──────────────────────────────────────────────── */}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => {
          const on = picked.includes(r.scene);
          return (
            <li
              key={r.scene}
              className={`rounded-2xl border p-3 transition ${
                on
                  ? "border-[#003FC7] bg-[#003FC7]/[0.05] shadow-sm"
                  : "border-black/10 hover:border-[#003FC7]/40 dark:border-white/15"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.scene}`}
                    checked={on}
                    onChange={() =>
                      setPicked((p) =>
                        p.includes(r.scene) ? p.filter((x) => x !== r.scene) : [...p, r.scene],
                      )
                    }
                    className="h-3.5 w-3.5 accent-[#003FC7]"
                  />
                  <span className="text-xs font-semibold capitalize">{r.scene}</span>
                </label>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                    r.saved
                      ? "bg-[#003FC7]/10 text-[#003FC7]"
                      : "bg-black/5 opacity-55 dark:bg-white/10"
                  }`}
                >
                  {r.saved ? "override" : "authored"}
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <figure>
                  <figcaption className="mb-1 text-[9px] uppercase tracking-[0.18em] opacity-45">
                    Authored
                  </figcaption>
                  <div
                    className="aspect-[16/9] w-full rounded-lg border border-black/10 dark:border-white/15"
                    style={{ background: r.authored }}
                  />
                </figure>
                <figure>
                  <figcaption className="mb-1 text-[9px] uppercase tracking-[0.18em] opacity-45">
                    Current
                  </figcaption>
                  <div
                    className="aspect-[16/9] w-full rounded-lg border border-[#003FC7]/40"
                    style={{ background: r.current }}
                  />
                </figure>
              </div>

              <p className="mt-2 truncate text-[10px] opacity-55">
                ×{r.eff.intensity.toFixed(2)}
                {r.eff.tintStrength > 0 ? ` · tint ${r.eff.tintStrength.toFixed(2)}` : ""}
                {r.eff.sceneSwap ? ` · swap ${r.eff.sceneSwap}` : ""}
                {r.eff.imageUrl ? " · backdrop" : ""}
                {isNeutralOverride(r.eff) && !r.eff.imageUrl ? " · untouched" : ""}
              </p>

              <div className="mt-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onTune(r.scene as SkinScene)}
                  className="flex-1 rounded-lg border border-black/12 px-2 py-1 text-[11px] font-medium hover:border-[#003FC7] hover:text-[#003FC7] dark:border-white/15"
                >
                  Tune this one
                </button>
                {r.eff.imageUrl && onZoom && (
                  <button
                    type="button"
                    onClick={() =>
                      onZoom({ url: r.eff.imageUrl!, label: `${code} · ${r.scene} backdrop` })
                    }
                    title="View backdrop larger"
                    className="rounded-lg border border-black/12 px-2 py-1 text-[11px] dark:border-white/15"
                  >
                    ⤢
                  </button>
                )}
                {r.saved && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => revert([r.scene])}
                    className="rounded-lg border border-black/12 px-2 py-1 text-[11px] hover:border-red-400 hover:text-red-600 disabled:opacity-40 dark:border-white/15"
                  >
                    Revert
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* ── batch update ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#003FC7]/25 bg-[#003FC7]/[0.04] p-4">
        <h3 className="text-sm font-semibold">Update the selected sections</h3>
        <p className="mt-0.5 text-[11px] opacity-60">
          Only the ticked properties are written — everything else each section already has is kept.
        </p>

        <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
          <div className="space-y-0.5">
            <Check
              on={fields.intensity}
              label="Ground intensity"
              onToggle={() => setFields((f) => ({ ...f, intensity: !f.intensity }))}
            />
            <Check
              on={fields.tint}
              label="Brand tint"
              onToggle={() => setFields((f) => ({ ...f, tint: !f.tint }))}
            />
            <Check
              on={fields.backdrop}
              label="Backdrop image"
              hint="Blank clears the image"
              onToggle={() => setFields((f) => ({ ...f, backdrop: !f.backdrop }))}
            />
            <Check
              on={fields.swap}
              label="Borrowed composition"
              onToggle={() => setFields((f) => ({ ...f, swap: !f.swap }))}
            />
            <Check
              on={fields.note}
              label="Note"
              onToggle={() => setFields((f) => ({ ...f, note: !f.note }))}
            />
          </div>

          <div className="space-y-3">
            {fields.intensity && (
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium">Intensity</span>
                  <span className="rounded-full bg-[#003FC7]/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#003FC7]">
                    {form.intensity.toFixed(2)}×
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Batch intensity"
                  min={0}
                  max={2}
                  step={0.05}
                  value={form.intensity}
                  onChange={(e) => setForm((f) => ({ ...f, intensity: Number(e.target.value) }))}
                  className="mt-1.5 w-full accent-[#003FC7]"
                />
              </div>
            )}

            {fields.tint && (
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-3">
                <label className="block">
                  <span className="text-[11px] font-medium">Tint</span>
                  <input
                    type="color"
                    aria-label="Batch tint colour"
                    value={form.tint}
                    onChange={(e) => setForm((f) => ({ ...f, tint: e.target.value.toUpperCase() }))}
                    className="mt-1.5 h-9 w-14 cursor-pointer rounded-lg border border-black/10 bg-transparent p-0.5 dark:border-white/15"
                  />
                </label>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium">Tint strength</span>
                    <span className="rounded-full bg-[#003FC7]/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#003FC7]">
                      {form.tintStrength.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Batch tint strength"
                    min={0}
                    max={1}
                    step={0.02}
                    value={form.tintStrength}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tintStrength: Number(e.target.value) }))
                    }
                    className="mt-1.5 w-full accent-[#003FC7]"
                  />
                </div>
              </div>
            )}

            {fields.backdrop && (
              <div>
                <BackdropSourcePicker
                  value={form.imageUrl}
                  onPick={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
                />
                <div className="mt-2 flex items-center gap-2">
                  <input
                    aria-label="Batch backdrop URL"
                    className={inputCls}
                    placeholder="…or paste an image URL"
                    value={form.imageUrl ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value || null }))}
                  />
                  {form.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, imageUrl: null }))}
                      className="shrink-0 rounded-lg border border-black/12 px-2 py-1 text-[10px] hover:border-red-400 hover:text-red-600 dark:border-white/15"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {fields.swap && (
              <label className="block">
                <span className="text-[11px] font-medium">Borrow this composition</span>
                <select
                  aria-label="Batch section swap"
                  className={`${inputCls} capitalize`}
                  value={form.sceneSwap}
                  onChange={(e) => setForm((f) => ({ ...f, sceneSwap: e.target.value }))}
                >
                  <option value="">No swap — keep each section's own</option>
                  {ALL.map((s) => (
                    <option key={s} value={s}>
                      Use the {s} composition
                    </option>
                  ))}
                </select>
              </label>
            )}

            {fields.note && (
              <label className="block">
                <span className="text-[11px] font-medium">Note</span>
                <input
                  aria-label="Batch note"
                  className={inputCls}
                  placeholder="e.g. softened across the pack for dense stat walls"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                />
              </label>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#003FC7]/20 pt-3">
          <button
            type="button"
            disabled={busy || noneTicked || targets.length === 0}
            onClick={() => applyBatch(targets)}
            className="rounded-xl bg-[#003FC7] px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
          >
            {busy
              ? "Saving…"
              : targets.length === 0
                ? "Select sections above"
                : `Apply to ${targets.length} selected`}
          </button>
          <button
            type="button"
            disabled={busy || noneTicked}
            onClick={() => applyBatch([...ALL])}
            className="rounded-xl border border-[#003FC7] px-4 py-2 text-sm font-semibold text-[#003FC7] transition hover:bg-[#003FC7] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#003FC7]"
          >
            Apply to whole pack ({ALL.length})
          </button>
          {noneTicked && (
            <span className="text-[11px] opacity-60">Tick a property on the left to enable.</span>
          )}
          <button
            type="button"
            disabled={busy || mine.length === 0}
            onClick={() => revert(targets.length > 0 ? targets : [...ALL])}
            className="ml-auto rounded-xl border border-black/15 px-3 py-2 text-xs disabled:opacity-40 dark:border-white/20"
          >
            Revert {targets.length > 0 ? `${targets.length} selected` : "whole pack"} to authored
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// BACKGROUND TUNER — the friendly, real-time face of background retuning.
//
// One screen, no numbered wizard: a big live slide that repaints as you drag, a
// filmstrip of every section painted with its own current ground, plain-language
// presets and sliders, and autosave. Hold "Compare" to see the authored ground.
//
// It edits the same `TemplateBackgroundOverride` contract as before, so present,
// share and PPTX stay untouched.
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { BackdropSourcePicker } from "./BackdropSourcePicker";
import type { BackdropShot } from "./BackdropLightbox";

const SCENE_LABEL: Record<string, string> = {
  cover: "Cover",
  agenda: "Agenda",
  statement: "Statement",
  stats: "Stat wall",
  split: "Split media",
  bento: "Bento",
  chart: "Chart",
  quote: "Quote",
  timeline: "Timeline",
  closing: "Closing",
  section: "Section break",
};

type Preset = {
  id: string;
  label: string;
  hint: string;
  apply: (o: TemplateBackgroundOverride, accent: string) => TemplateBackgroundOverride;
};

const PRESETS: Preset[] = [
  {
    id: "flat",
    label: "Almost plain",
    hint: "Nearly flat page — best behind dense data",
    apply: (o) => ({ ...o, intensity: 0.25, tint: null, tintStrength: 0 }),
  },
  {
    id: "soft",
    label: "Softer",
    hint: "Same design, quieter",
    apply: (o) => ({ ...o, intensity: 0.6, tintStrength: 0 }),
  },
  {
    id: "authored",
    label: "As designed",
    hint: "The look's own background, untouched",
    apply: (o) => ({ ...o, intensity: 1, tint: null, tintStrength: 0, sceneSwap: null }),
  },
  {
    id: "bold",
    label: "Bolder",
    hint: "Deepen the artwork for hero moments",
    apply: (o) => ({ ...o, intensity: 1.5 }),
  },
  {
    id: "brand",
    label: "Brand wash",
    hint: "Veil the page in the look's accent",
    apply: (o, accent) => ({ ...o, intensity: 1, tint: accent, tintStrength: 0.18 }),
  },
];

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

export function BackgroundTuner({
  code,
  pack,
  overrides,
  onChanged,
  onZoom,
  initialScene,
}: {
  code: string;
  pack: StylePack;
  overrides: TemplateBackgroundOverride[];
  onChanged: () => void;
  onZoom?: (shot: BackdropShot) => void;
  /** Section to open on, when arriving from the all-sections grid. */
  initialScene?: SkinScene;
}) {
  const save = useServerFn(saveBackgroundOverride);
  const remove = useServerFn(deleteBackgroundOverride);

  const [scene, setScene] = useState<SkinScene>(initialScene ?? "cover");
  const [compare, setCompare] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [zoomCompare, setZoomCompare] = useState(false);

  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [autosave, setAutosave] = useState(true);
  const [busy, setBusy] = useState(false);

  const mine = useMemo(
    () => overrides.filter((o) => o.skinCode.toUpperCase() === code.toUpperCase()),
    [overrides, code],
  );
  const saved = mine.find((o) => o.scene === scene);

  const [edit, setEdit] = useState<TemplateBackgroundOverride>(defaultOverride(code, scene));
  const skipNextSave = useRef(true);

  useEffect(() => {
    skipNextSave.current = true;
    setEdit(saved ?? defaultOverride(code, scene));
  }, [code, scene, saved]);

  const accent = pack.tokens.accent;

  const layersFor = useCallback(
    (o: TemplateBackgroundOverride, s: string) => {
      const swap =
        o.sceneSwap && (SKIN_SCENES as readonly string[]).includes(o.sceneSwap) ? o.sceneSwap : s;
      return composeOverrideLayers(pack.ground(swap), o, pack.tokens.surface);
    },
    [pack],
  );

  const previewLayers = useMemo(() => layersFor(edit, scene), [layersFor, edit, scene]);
  const authoredLayers = useMemo(() => pack.ground(scene), [pack, scene]);
  const shownLayers = compare ? authoredLayers : previewLayers;

  const persist = useCallback(
    async (target: string, from: TemplateBackgroundOverride) => {
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
    },
    [save, code],
  );

  // ── autosave: debounce every knob so tuning feels live, not modal ──
  useEffect(() => {
    if (!autosave) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    setStatus("saving");
    const t = setTimeout(async () => {
      try {
        await persist(scene, edit);
        await loadTemplateRegistry(true);
        onChanged();
        setStatus("saved");
      } catch (e) {
        setStatus("idle");
        toast.error((e as Error).message);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [edit, autosave, scene, persist, onChanged]);

  const upd = <K extends keyof TemplateBackgroundOverride>(
    k: K,
    v: TemplateBackgroundOverride[K],
  ) => setEdit((e) => ({ ...e, [k]: v }));

  const swatches = [
    pack.tokens.accent,
    pack.tokens.accentAlt,
    pack.tokens.ink,
    "#003FC7",
    "#A1FBF9",
    "#FFEB66",
  ].filter((c, i, a) => !!c && a.indexOf(c) === i);

  const zoomLayers = zoomCompare ? authoredLayers : previewLayers;
  const zoomPack = useMemo(
    () => ({ ...pack, ground: () => zoomLayers }) as StylePack,
    [pack, zoomLayers],
  );

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const list = SKIN_SCENES as readonly SkinScene[];
        const i = list.indexOf(scene);
        const next = (i + (e.key === "ArrowRight" ? 1 : list.length - 1)) % list.length;
        setScene(list[next]!);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, scene]);

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      {zoom && (
        <div
          className="fixed inset-0 z-[120] flex flex-col gap-3 bg-black/85 p-4 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${SCENE_LABEL[scene] ?? scene} preview`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setZoom(false);
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-white">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">
                {SCENE_LABEL[scene] ?? scene}
                <span className="ml-2 text-[11px] font-normal opacity-60">{code}</span>
              </h3>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
                {zoomCompare ? "Original design" : saved ? "Your version" : "Original design"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onMouseDown={() => setZoomCompare(true)}
                onMouseUp={() => setZoomCompare(false)}
                onMouseLeave={() => setZoomCompare(false)}
                onTouchStart={() => setZoomCompare(true)}
                onTouchEnd={() => setZoomCompare(false)}
                onClick={() => setZoomCompare((v) => !v)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                  zoomCompare
                    ? "border-white bg-white text-black"
                    : "border-white/35 text-white hover:border-white"
                }`}
              >
                {zoomCompare ? "Showing original" : "Hold to compare"}
              </button>
              <button
                type="button"
                onClick={() => setZoom(false)}
                className="rounded-full border border-white/35 px-3 py-1 text-[11px] font-semibold text-white hover:border-white"
              >
                Close ✕
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="w-full max-w-[1500px]">
              <SceneSlideStage pack={zoomPack} scene={scene} className="shadow-2xl" />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            {SKIN_SCENES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScene(s as SkinScene)}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${
                  s === scene
                    ? "border-white bg-white text-black"
                    : "border-white/30 text-white/80 hover:border-white"
                }`}
              >
                {SCENE_LABEL[s] ?? s}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* ── LIVE STAGE ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">

        <div className="order-2 rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/15 dark:bg-white/[0.03]">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">
                {SCENE_LABEL[scene] ?? scene}
                <span className="ml-2 text-[11px] font-normal opacity-55">{code}</span>
              </h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  status === "saving"
                    ? "bg-amber-400/20 text-amber-700 dark:text-amber-300"
                    : saved
                      ? "bg-[#003FC7]/10 text-[#003FC7]"
                      : "bg-black/5 opacity-60 dark:bg-white/10"
                }`}
              >
                {status === "saving"
                  ? "Saving…"
                  : saved
                    ? "Your version · live everywhere"
                    : "Original design"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom(true)}
                className="rounded-full border border-black/12 px-3 py-1 text-[11px] font-semibold transition hover:border-[#003FC7]/50 dark:border-white/15"
              >
                ⤢ View larger
              </button>
              <button
                type="button"
                onMouseDown={() => setCompare(true)}
                onMouseUp={() => setCompare(false)}
                onMouseLeave={() => setCompare(false)}
                onTouchStart={() => setCompare(true)}
                onTouchEnd={() => setCompare(false)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                  compare
                    ? "border-[#003FC7] bg-[#003FC7] text-white"
                    : "border-black/12 hover:border-[#003FC7]/50 dark:border-white/15"
                }`}
              >
                {compare ? "Showing original" : "Hold to compare"}
              </button>
              <label className="flex items-center gap-1.5 text-[10px] opacity-70">
                <input
                  type="checkbox"
                  checked={autosave}
                  onChange={(e) => setAutosave(e.target.checked)}
                  className="accent-[#003FC7]"
                />
                Save as I tune
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setZoom(true)}
            title="Click to view larger"
            className="block w-full cursor-zoom-in text-left"
          >
            <LookPreviewTile
              pack={{ ...pack, ground: () => shownLayers }}
              kicker={`${code} · ${SCENE_LABEL[scene] ?? scene}`}
              seed={scene}
            />
          </button>
          <p className="mt-2 text-[11px] opacity-55">
            This is the real {SCENE_LABEL[scene] ?? scene} slide on the live background. Click it to
            view larger. Changes here only affect this one section of the {code} look.
          </p>
        </div>



        {/* ── SECTION FILMSTRIP ─────────────────────────────────────── */}
        <div className="order-1 rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/15 dark:bg-white/[0.03]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 text-[11px] font-semibold">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#003FC7] text-[10px] font-bold text-white">
                1
              </span>
              Choose the section to edit
            </h4>
            {mine.length > 0 && (
              <span className="rounded-full bg-[#003FC7]/10 px-2 py-0.5 text-[10px] font-semibold text-[#003FC7]">
                {mine.length} edited
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SKIN_SCENES.map((s) => {
              const o = mine.find((x) => x.scene === s);
              const live = s === scene ? previewLayers : layersFor(o ?? defaultOverride(code, s), s);
              const on = s === scene;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScene(s as SkinScene)}
                  aria-pressed={on}
                  className={`group flex min-w-0 flex-col gap-1.5 rounded-xl border p-2 text-left transition ${
                    on
                      ? "border-[#003FC7] bg-[#003FC7]/5 ring-2 ring-[#003FC7]/25"
                      : "border-black/10 hover:border-[#003FC7]/50 dark:border-white/15"
                  }`}
                >
                  <span
                    className="block aspect-[16/9] w-full rounded-lg border border-black/10 dark:border-white/15"
                    style={{ background: live.join(", ") }}
                  />
                  <span className="flex min-w-0 items-center justify-between gap-1.5">
                    <span
                      className={`text-xs font-semibold leading-tight ${on ? "text-[#003FC7]" : ""}`}
                    >
                      {SCENE_LABEL[s] ?? s}
                    </span>
                    {o && (
                      <span className="shrink-0 rounded-full bg-[#003FC7]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#003FC7]">
                        edited
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

        </div>

      </div>

      {/* ── CONTROLS ───────────────────────────────────────────────── */}
      <div className="space-y-3 xl:sticky xl:top-4">
        <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/15 dark:bg-white/[0.03]">
          <h4 className="flex items-center gap-2 text-[11px] font-semibold">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#003FC7] text-[10px] font-bold text-white">
              2
            </span>
            Pick a background style
          </h4>
          <p className="mt-1 text-[11px] opacity-60">
            Tap one to see it on the slide. Nothing is permanent — “Undo my edits” restores the
            original design.
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {PRESETS.map((p) => {
              const preview = layersFor(p.apply(edit, accent), scene);
              const on = JSON.stringify(previewLayers) === JSON.stringify(preview);
              return (
                <button
                  key={p.id}
                  type="button"
                  title={p.hint}
                  onClick={() => setEdit((e) => p.apply(e, accent))}
                  className="text-left"
                >
                  <span
                    className={`block aspect-[16/9] w-full rounded-lg border ${
                      on
                        ? "border-[#003FC7] ring-2 ring-[#003FC7]/30"
                        : "border-black/10 hover:border-[#003FC7]/50 dark:border-white/15"
                    }`}
                    style={{ background: preview.join(", ") }}
                  />
                  <span className="mt-1 block text-[11px] font-medium">{p.label}</span>
                  <span className="block text-[10px] leading-tight opacity-55">{p.hint}</span>
                </button>
              );
            })}
          </div>


          <div className="mt-4 space-y-4 border-t border-black/10 pt-4 dark:border-white/15">
            <h4 className="flex items-center gap-2 text-[11px] font-semibold">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-black/70 text-[10px] font-bold text-white dark:bg-white/25">
                3
              </span>
              Fine-tune it (optional)
            </h4>
            <Slider
              label="How strong is the background?"
              value={edit.intensity}
              display={`${Math.round(edit.intensity * 100)}%`}
              min={0}
              max={2}
              step={0.05}
              minLabel="plain page"
              maxLabel="double strength"
              onChange={(n) => upd("intensity", n)}
            />

            <div>
              <span className="text-[11px] font-medium">Tint the whole page</span>

              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    upd("tint", null);
                    upd("tintStrength", 0);
                  }}
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${
                    !edit.tint || edit.tintStrength === 0
                      ? "border-[#003FC7] bg-[#003FC7] text-white"
                      : "border-black/12 dark:border-white/15"
                  }`}
                >
                  None
                </button>
                {swatches.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Wash in ${c}`}
                    title={c}
                    onClick={() => {
                      upd("tint", c);
                      if (edit.tintStrength < 0.05) upd("tintStrength", 0.16);
                    }}
                    className={`h-6 w-6 rounded-full border-2 transition ${
                      edit.tint === c && edit.tintStrength > 0
                        ? "border-[#003FC7] scale-110"
                        : "border-black/15 hover:scale-110 dark:border-white/25"
                    }`}
                    style={{ background: c }}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Custom wash colour"
                  value={edit.tint && /^#[0-9a-f]{6}$/i.test(edit.tint) ? edit.tint : "#003FC7"}
                  onChange={(e) => {
                    upd("tint", e.target.value.toUpperCase());
                    if (edit.tintStrength < 0.05) upd("tintStrength", 0.16);
                  }}
                  className="h-6 w-8 cursor-pointer rounded border border-black/10 bg-transparent p-0.5 dark:border-white/15"
                />
              </div>
              {edit.tint && (
                <div className="mt-2.5">
                  <Slider
                    label="Wash amount"
                    value={edit.tintStrength}
                    display={`${Math.round(edit.tintStrength * 100)}%`}
                    min={0}
                    max={1}
                    step={0.02}
                    minLabel="hint"
                    maxLabel="solid"
                    onChange={(n) => upd("tintStrength", n)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* borrow another section's artwork, as pictures not a dropdown */}
        <details className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/15 dark:bg-white/[0.03]">
          <summary className="cursor-pointer text-[11px] font-semibold">
            Swap in another section's artwork
            {edit.sceneSwap && (
              <span className="ml-2 rounded-full bg-[#003FC7]/10 px-2 py-0.5 text-[10px] text-[#003FC7]">
                {SCENE_LABEL[edit.sceneSwap] ?? edit.sceneSwap}
              </span>
            )}
          </summary>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => upd("sceneSwap", null)}
              className={`rounded-lg border px-2 py-4 text-[10px] ${
                !edit.sceneSwap
                  ? "border-[#003FC7] bg-[#003FC7]/[0.06] text-[#003FC7]"
                  : "border-black/12 dark:border-white/15"
              }`}
            >
              Its own
            </button>
            {SKIN_SCENES.filter((s) => s !== scene).map((s) => (
              <button key={s} type="button" onClick={() => upd("sceneSwap", s)} className="text-left">
                <span
                  className={`block aspect-[16/9] w-full rounded-lg border ${
                    edit.sceneSwap === s
                      ? "border-[#003FC7] ring-2 ring-[#003FC7]/30"
                      : "border-black/10 dark:border-white/15"
                  }`}
                  style={{ background: pack.ground(s).join(", ") }}
                />
                <span className="mt-1 block text-[10px]">{SCENE_LABEL[s] ?? s}</span>
              </button>
            ))}
          </div>
        </details>

        {/* backdrop image */}
        <details className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/15 dark:bg-white/[0.03]">
          <summary className="cursor-pointer text-[11px] font-semibold">
            Add a photo or texture behind it
            {edit.imageUrl && (
              <span className="ml-2 rounded-full bg-[#003FC7]/10 px-2 py-0.5 text-[10px] text-[#003FC7]">
                on
              </span>
            )}
          </summary>
          <div className="mt-3">
            <BackdropSourcePicker value={edit.imageUrl} onPick={(url) => upd("imageUrl", url)} />
            {edit.imageUrl && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onZoom?.({ url: edit.imageUrl!, label: `${code} · ${scene} backdrop` })
                  }
                  className="rounded-full border border-black/12 px-2.5 py-1 text-[10px] dark:border-white/15"
                >
                  ⤢ View larger
                </button>
                <button
                  type="button"
                  onClick={() => upd("imageUrl", null)}
                  className="rounded-full border border-black/12 px-2.5 py-1 text-[10px] hover:border-red-400 hover:text-red-600 dark:border-white/15"
                >
                  Remove
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      for (const target of SKIN_SCENES) {
                        const base =
                          mine.find((o) => o.scene === target) ?? defaultOverride(code, target);
                        await persist(target, { ...base, imageUrl: edit.imageUrl ?? null });
                      }
                      await loadTemplateRegistry(true);
                      onChanged();
                      toast.success("Backdrop applied to every section.");
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="ml-auto rounded-full border border-[#003FC7] px-2.5 py-1 text-[10px] font-semibold text-[#003FC7] disabled:opacity-40"
                >
                  Use on all sections
                </button>
              </div>
            )}
          </div>
        </details>

        {/* footer actions */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-white/70 p-3 dark:border-white/15 dark:bg-white/[0.03]">
          {!autosave && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await persist(scene, edit);
                  await loadTemplateRegistry(true);
                  onChanged();
                  toast.success(`${code} · ${scene} saved.`);
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-xl bg-[#003FC7] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Save this section
            </button>
          )}
          <button
            type="button"
            disabled={isNeutralOverride(edit)}
            onClick={() => setEdit((e) => ({ ...defaultOverride(code, scene), note: e.note ?? "" }))}
            className="rounded-xl border border-black/15 px-3 py-2 text-xs disabled:opacity-40 dark:border-white/20"
          >
            Reset knobs
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
                skipNextSave.current = true;
                setEdit(defaultOverride(code, scene));
                setStatus("idle");
                toast.success("Back to the original design.");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
            className="ml-auto rounded-xl border border-black/15 px-3 py-2 text-xs disabled:opacity-40 dark:border-white/20"
          >
            Undo my edits
          </button>
        </div>

        <label className="block rounded-2xl border border-black/10 bg-white/70 p-3 dark:border-white/15 dark:bg-white/[0.03]">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-55">
            Note for other admins
          </span>
          <input
            aria-label="Note"
            className="mt-1.5 w-full rounded-lg border border-black/10 bg-transparent px-2.5 py-1.5 text-xs dark:border-white/15"
            placeholder="e.g. softened for dense stat walls"
            value={edit.note ?? ""}
            onChange={(e) => upd("note", e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}

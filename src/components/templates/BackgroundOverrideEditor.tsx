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
import { BackgroundPackGrid } from "./BackgroundPackGrid";


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
  const [view, setView] = useState<"all" | "one">("all");
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
    <div className="space-y-4">
      {/* ── view switch: whole pack listing vs single-section tuning ── */}
      <div
        role="tablist"
        aria-label="Background editing mode"
        className="inline-flex rounded-full border border-black/10 bg-white/70 p-1 dark:border-white/15 dark:bg-white/[0.03]"
      >
        {(
          [
            ["all", "All sections", "List and batch-update the pack"],
            ["one", `Tune ${scene}`, "Single section, deep controls"],
          ] as const
        ).map(([id, label, hint]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            title={hint}
            onClick={() => setView(id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
              view === id ? "bg-[#003FC7] text-white shadow-sm" : "opacity-65 hover:opacity-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "all" ? (
        <>
          <BackgroundPackGrid
            code={code}
            pack={pack}
            overrides={overrides}
            onChanged={onChanged}
            onTune={(s) => {
              setScene(s);
              setView("one");
            }}
            onZoom={setShot}
          />
          <BackdropLightbox shot={shot} onClose={() => setShot(null)} />
        </>
      ) : (
        <>
          <BackgroundTuner
            code={code}
            pack={pack}
            overrides={overrides}
            onChanged={onChanged}
            onZoom={setShot}
            initialScene={scene}
          />
          <BackdropLightbox shot={shot} onClose={() => setShot(null)} />
        </>
      )}
    </div>
  );
}

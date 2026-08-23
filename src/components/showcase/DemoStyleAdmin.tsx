// Admin-only quick styling control for the live demo decks.
//
// Admins can already open a demo in the studio editor ("Edit live demo"), but
// switching a whole demo onto a different visual language or background family
// shouldn't require a round-trip through the editor. This panel publishes a
// demo override for the current demo + division with a new style pack and/or
// background recipe — exactly what every visitor then sees on this page.

import { useMemo, useState } from "react";
import { Check, Paintbrush, RotateCcw } from "lucide-react";

import type { TemplatePayload } from "@/lib/deck-store";
import { DESIGN_SKINS, INDUSTRY_RECIPES } from "@/lib/design-skins";
import { INDUSTRY_SKINS } from "@/lib/industry-skins";
import { skinPackId } from "@/lib/design-skin-pack";
import {
  usePublishDemoOverride,
  useResetDemoOverride,
  type DemoKind,
} from "@/lib/demo-overrides";

type Props = {
  demoKind: DemoKind;
  demoId: string;
  divisionKey: string;
  divisionLabel: string;
  payload: TemplatePayload;
  hasOverride: boolean;
};

export function DemoStyleAdmin({
  demoKind,
  demoId,
  divisionKey,
  divisionLabel,
  payload,
  hasOverride,
}: Props) {
  const ctx = (payload.context ?? {}) as Record<string, unknown>;
  const currentPack = (ctx["stylePackId"] as string | undefined) ?? "";
  const currentRecipe = (ctx["designRecipeId"] as string | null | undefined) ?? "";

  const [packId, setPackId] = useState(currentPack);
  const [recipeId, setRecipeId] = useState(currentRecipe ?? "");
  const [clearSlideBackgrounds, setClearSlideBackgrounds] = useState(false);

  const publish = usePublishDemoOverride();
  const reset = useResetDemoOverride();

  const designOptions = useMemo(
    () => DESIGN_SKINS.map((s) => ({ id: skinPackId(s.code), label: `${s.code} · ${s.name}` })),
    [],
  );
  const industryOptions = useMemo(
    () => INDUSTRY_SKINS.map((s) => ({ id: skinPackId(s.code), label: `${s.code} · ${s.name}` })),
    [],
  );

  const dirty =
    packId !== currentPack || (recipeId || "") !== (currentRecipe || "") || clearSlideBackgrounds;

  function apply() {
    const slides = clearSlideBackgrounds
      ? payload.slides.map((s) => {
          const content = { ...(s.content as Record<string, unknown>) };
          delete content["background"];
          return { ...s, content: content as typeof s.content };
        })
      : payload.slides;

    const next: TemplatePayload = {
      ...payload,
      slides,
      context: {
        ...(payload.context ?? {}),
        stylePackId: packId || undefined,
        designRecipeId: recipeId ? recipeId : null,
      },
    };
    publish.mutate({
      demoKind,
      demoId,
      divisionKey,
      payload: next as unknown as Record<string, unknown>,
      label: `${payload.title} · ${divisionLabel}`,
    });
    setClearSlideBackgrounds(false);
  }

  return (
    <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Paintbrush size={15} className="text-black/50 dark:text-white/50" />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
              Admin · demo look &amp; backgrounds
            </div>
            <p className="mt-1 text-[12px] text-black/55 dark:text-white/55">
              Swap the visual language or background family for the {divisionLabel} demo and
              publish it live. For slide-by-slide background art, use “Edit live demo”.
            </p>
          </div>
        </div>
        {hasOverride ? (
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
            Published override
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-[12px]">
          <span className="font-medium text-black/60 dark:text-white/60">Visual language</span>
          <select
            value={packId}
            onChange={(e) => setPackId(e.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-black/12 bg-white px-3 text-sm dark:border-white/15 dark:bg-white/[0.06]"
          >
            <option value="">Deck default</option>
            <optgroup label="Design languages (S)">
              {designOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Industry recipes (R)">
              {industryOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className="block text-[12px]">
          <span className="font-medium text-black/60 dark:text-white/60">
            Background family
          </span>
          <select
            value={recipeId ?? ""}
            onChange={(e) => setRecipeId(e.target.value)}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-black/12 bg-white px-3 text-sm dark:border-white/15 dark:bg-white/[0.06]"
          >
            <option value="">None — design-led backgrounds</option>
            {INDUSTRY_RECIPES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} · {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 flex items-center gap-2 text-[12px] text-black/60 dark:text-white/60">
        <input
          type="checkbox"
          checked={clearSlideBackgrounds}
          onChange={(e) => setClearSlideBackgrounds(e.target.checked)}
          className="h-4 w-4"
        />
        Clear per-slide background overrides so every slide repaints from the new look
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={apply}
          disabled={!dirty || publish.isPending}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#003FC7] px-5 text-sm font-semibold text-white transition hover:bg-[#0035a8] disabled:opacity-50"
        >
          <Check size={15} />
          {publish.isPending ? "Publishing…" : "Publish look to live demo"}
        </button>
        {hasOverride ? (
          <button
            type="button"
            onClick={() => {
              reset.mutate({ demoKind, demoId, divisionKey });
              setPackId(currentPack);
              setRecipeId(currentRecipe ?? "");
            }}
            disabled={reset.isPending}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-black/15 px-5 text-sm font-semibold transition hover:border-black/40 disabled:opacity-50 dark:border-white/20 dark:hover:border-white/50"
          >
            <RotateCcw size={15} />
            {reset.isPending ? "Resetting…" : "Reset to authored build"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

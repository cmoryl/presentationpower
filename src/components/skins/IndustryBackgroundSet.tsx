/**
 * INDUSTRY BACKGROUND SET — secondary preview area for the selected industry.
 *
 * This is deliberately NOT thirty more cards competing with the approved 28
 * visual languages. It is the background system authored for one sector: four
 * usage families (HERO / CONTENT / DATA / FLOW) with one representative 16:9
 * preview each, and an expandable viewer for all 44 scene × take compositions.
 *
 * Every tile paints the real `pack.ground(seed)` at true slide size, so what a
 * reviewer sees here is exactly what renders on screen and in PPTX/PDF/PNG.
 */

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { ApprovedStyleThumb } from "@/components/skins/ApprovedStyleThumb";
import { BackgroundZoom } from "@/components/skins/BackgroundLightbox";
import {
  INDUSTRY_BG_COMBOS,
  industryBackgroundSet,
  type IndustryBackgroundSet as BgSet,
} from "@/lib/industry-backgrounds";
import { SKIN_BG_TAKES, TAKE_LABEL } from "@/lib/skin-backgrounds";

function FamilyStrip({ set }: { set: BgSet }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {set.families.map((f) => (
        <figure key={f.key} className="min-w-0 space-y-1">
          <BackgroundZoom
            shot={{
              pack: set.pack,
              code: set.recipeId,
              name: set.name,
              scene: f.representative,
              take: 0,
              meta: `${f.label} · ${set.motifLabel} · ${set.mode}`,
              palette: set.palette,
            }}
          >
            <ApprovedStyleThumb pack={set.pack} scene={f.representative} radius={6} />
          </BackgroundZoom>
          <figcaption className="space-y-0.5">
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#03002C]/60 dark:text-white/60">
                {f.label}
              </span>
              <span className="text-[9px] tabular-nums text-[#03002C]/35 dark:text-white/35">
                {f.band}
              </span>
            </div>
            <p className="text-[9px] leading-snug text-[#03002C]/45 dark:text-white/45">{f.note}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function IndustryBackgroundSetPanel({
  recipeId,
  /**
   * Toggle this industry recipe as the deck's GROUND layer. It never replaces
   * the approved visual style: `null` clears the ground back to the style's own.
   */
  onApply,
  /** The recipe currently composed under the active style, if any. */
  activeRecipeId,
  /**
   * False while no approved visual style is selected: an industry ground has no
   * base pack to sit under, so it must not be persisted on its own.
   */
  canApply = true,
  className = "",
}: {
  recipeId: string | null | undefined;
  onApply?: (recipeId: string | null) => void;
  activeRecipeId?: string | null;
  canApply?: boolean;
  className?: string;
}) {
  const set = React.useMemo(() => industryBackgroundSet(recipeId), [recipeId]);
  const [expanded, setExpanded] = React.useState(false);
  if (!set) return null;
  const applied = (activeRecipeId ?? null) === set.recipeId;

  return (
    <section
      className={`space-y-2 rounded-xl border border-black/10 bg-black/[0.015] p-2.5 dark:border-white/10 dark:bg-white/[0.03] ${className}`}
      aria-label={`Industry background set for ${set.name}`}
    >
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-[#03002C]/55 dark:text-white/55">
          Industry background set
        </h3>
        <span className="rounded-full bg-[#003FC7]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#003FC7]">
          {set.recipeId} · {set.name}
        </span>
        <span className="text-[10px] text-[#03002C]/45 dark:text-white/45">
          {set.motifLabel} · {INDUSTRY_BG_COMBOS} compositions
        </span>
        <span className="ml-auto flex items-center gap-1" aria-hidden>
          {set.palette.slice(0, 5).map((c) => (
            <span key={c} className="h-3 w-3 rounded-sm" style={{ background: c }} />
          ))}
        </span>
      </header>

      <p className="text-[10px] leading-snug text-[#03002C]/50 dark:text-white/50">
        Industry background skin — abstract field only. Typography, cards and layout still come from
        the approved visual language you pick above.
      </p>

      <FamilyStrip set={set} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#003FC7] hover:underline"
        >
          <ChevronDown size={12} className={expanded ? "rotate-180 transition" : "transition"} />
          {expanded ? "Hide" : "View"} all {INDUSTRY_BG_COMBOS} scene × take variations
        </button>
        {onApply && (
          <button
            type="button"
            onClick={() => onApply(applied ? null : set.recipeId)}
            aria-pressed={applied}
            disabled={!canApply && !applied}
            title={
              !canApply && !applied
                ? "Choose a visual style first — the industry set is a ground layer"
                : undefined
            }
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              applied
                ? "bg-[#003FC7] text-white"
                : "border border-[#003FC7]/40 text-[#003FC7] hover:bg-[#003FC7]/10"
            }`}
          >
            {applied
              ? "Industry ground applied · remove"
              : canApply
                ? "Use this industry ground"
                : "Choose a visual style first"}
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-3">
          {set.families.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#03002C]/50 dark:text-white/50">
                {f.label} · {f.scenes.join(" / ")}
              </div>
              {f.scenes.map((scene) => (
                <div key={scene} className="space-y-1">
                  <div className="text-[9px] uppercase tracking-wider text-[#03002C]/40 dark:text-white/40">
                    {scene}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {Array.from({ length: SKIN_BG_TAKES }, (_, take) => (
                      <figure key={take} className="min-w-0">
                        <BackgroundZoom
                          shot={{
                            pack: set.pack,
                            code: set.recipeId,
                            name: set.name,
                            scene,
                            take,
                            meta: `${set.motifLabel} · ${set.mode}`,
                            palette: set.palette,
                          }}
                        >
                          <ApprovedStyleThumb
                            pack={set.pack}
                            scene={scene}
                            take={take}
                            radius={4}
                          />
                        </BackgroundZoom>
                        <figcaption className="mt-0.5 truncate text-center text-[8px] uppercase tracking-wider text-[#03002C]/35 dark:text-white/35">
                          {TAKE_LABEL[take]}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

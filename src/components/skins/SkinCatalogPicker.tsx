// Intent-first design skin picker.
//
// The OnDeck catalog rule: recommend six relevant skins, keep the full 28 one
// level deeper. The user picks an industry recipe (or types intent) and this
// narrows the catalog, showing a live 16:9 preview of each candidate so the
// look-and-feel switch is instant and visual.
import { useMemo, useState } from "react";
import { Check, ChevronDown, Layers, Maximize2 } from "lucide-react";
import {
  DESIGN_SKINS,
  INDUSTRY_RECIPES,
  designSkinByCode,
  industryRecipeById,
  recommendSkins,
  type DesignSkin,
} from "@/lib/design-skins";
import { skinCodeFromPackId, skinPackId, isSkinPackId } from "@/lib/design-skin-pack";
import { SkinPreviewTile } from "@/components/skins/SkinPreviewTile";
import { SkinLookbook } from "@/components/skins/SkinLookbook";

export function SkinCatalogPicker({
  /** Selected pack id ("skin-s01") or "" for "let the agent choose". */
  value,
  onChange,
  recipeId,
  onRecipeChange,
  intent = "",
  variant = "light",
}: {
  value: string;
  onChange: (packId: string) => void;
  recipeId: string;
  onRecipeChange: (recipeId: string) => void;
  /** Free-text industry/audience words used to narrow the catalog. */
  intent?: string;
  variant?: "light" | "dark";
}) {
  const [showAll, setShowAll] = useState(false);
  const [lookbook, setLookbook] = useState<DesignSkin | null>(null);
  const dark = variant === "dark";
  const recipe = industryRecipeById(recipeId);
  const selectedCode = isSkinPackId(value) ? skinCodeFromPackId(value) : null;
  const selected = designSkinByCode(selectedCode);

  const recommended = useMemo(
    () => recommendSkins({ recipeId, intent, limit: 6 }),
    [recipeId, intent],
  );
  const list = showAll ? DESIGN_SKINS : recommended;

  const label = dark ? "text-white/45" : "text-[#03002C]/45";
  const selectCls = `rounded-lg border px-2.5 py-1.5 text-xs outline-none transition ${
    dark
      ? "border-white/10 bg-[#03002C]/50 text-white/90 focus:border-[#A1FBF9]"
      : "border-black/10 bg-white text-[#03002C] focus:border-[#003FC7]"
  }`;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[10px] font-semibold uppercase tracking-widest ${label}`}>
          Industry recipe
        </span>
        <select
          value={recipeId}
          onChange={(e) => onRecipeChange(e.target.value)}
          aria-label="Industry recipe"
          className={selectCls}
        >
          <option value="">No recipe — recommend from my brief</option>
          {INDUSTRY_RECIPES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className={`text-[11px] underline-offset-2 hover:underline ${
              dark ? "text-white/50 hover:text-white" : "text-[#03002C]/50 hover:text-[#03002C]"
            }`}
          >
            Clear skin
          </button>
        )}
      </div>

      {recipe && (
        <p className={`text-[11px] ${dark ? "text-white/55" : "text-[#03002C]/55"}`}>
          {recipe.summary} · Tone {recipe.tone.toLowerCase()} ·{" "}
          <span className="font-medium">{recipe.presets.map((p) => p.name).join(" / ")}</span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {list.map((skin) => {
          const active = selectedCode === skin.code;
          return (
            <button
              key={skin.code}
              type="button"
              onClick={() => onChange(skinPackId(skin.code))}
              title={`${skin.name} — ${skin.description}`}
              aria-pressed={active}
              className={`group rounded-lg border p-1.5 text-left transition ${
                active
                  ? dark
                    ? "border-[#A1FBF9] bg-white/10"
                    : "border-[#003FC7] bg-[#003FC7]/[0.05]"
                  : dark
                    ? "border-white/10 bg-white/[0.03] hover:border-white/35"
                    : "border-black/10 bg-white hover:border-[#003FC7]/60"
              }`}
            >
              <SkinPreviewTile skin={skin} seed={skin.code} />
              <div className="mt-1.5 flex items-start gap-1">
                <span
                  className={`min-w-0 flex-1 truncate text-[11px] font-semibold ${
                    dark ? "text-white" : "text-[#03002C]"
                  }`}
                >
                  {skin.name}
                </span>
                {active && (
                  <Check size={11} className={dark ? "text-[#A1FBF9]" : "text-[#003FC7]"} />
                )}
              </div>
              <div
                className={`truncate text-[9px] uppercase tracking-wider ${
                  dark ? "text-white/40" : "text-black/40"
                }`}
              >
                {skin.code} · {skin.reference}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
            dark ? "text-white/70 hover:text-white" : "text-[#003FC7] hover:underline"
          }`}
        >
          <Layers size={12} />
          {showAll ? "Show recommended six" : `View all ${DESIGN_SKINS.length} visual languages`}
          <ChevronDown size={12} className={showAll ? "rotate-180 transition" : "transition"} />
        </button>
        {selected && (
          <span className={`text-[10px] ${dark ? "text-white/45" : "text-[#03002C]/45"}`}>
            {selected.mode} mode · {selected.density} density · {selected.spec}
          </span>
        )}
      </div>
    </div>
  );
}

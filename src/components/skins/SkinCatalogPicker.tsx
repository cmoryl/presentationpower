// Intent-first design skin picker.
//
// The OnDeck catalog rule: recommend six relevant skins, keep the full 28 one
// level deeper. The user picks an industry recipe (or types intent) and this
// narrows the catalog, showing a live 16:9 preview of each candidate so the
// look-and-feel switch is instant and visual.
import { useMemo, useState } from "react";
import { Check, ChevronDown, Layers, Maximize2 } from "lucide-react";
import { INDUSTRY_SKINS } from "@/lib/industry-skins";
import {
  INDUSTRY_RECIPES,
  industryRecipeById,
  recommendSkins,
  type DesignSkin,
} from "@/lib/design-skins";
import { skinCodeFromPackId, skinPackId, isSkinPackId } from "@/lib/design-skin-pack";
import { useSelectablePacks } from "@/hooks/use-selectable-packs";
import { lookCatalog, type LookEntry } from "@/lib/look-catalog";
import { SkinPreviewTile, LookPreviewTile } from "@/components/skins/SkinPreviewTile";
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
  const [open, setOpen] = useState(!value);
  const dark = variant === "dark";
  const recipe = industryRecipeById(recipeId);
  const selectedCode = isSkinPackId(value) ? skinCodeFromPackId(value) : null;
  const selected = designSkinByCode(selectedCode);

  const pick = (packId: string) => {
    onChange(packId);
    setOpen(false);
  };

  const recommended = useMemo(() => {
    const list = recommendSkins({ recipeId, intent, limit: 6 });
    // The sector's own curated signature leads when an industry is chosen.
    const signature = recipeId ? INDUSTRY_SKINS.find((s) => s.code === recipeId) : null;
    return signature ? [signature, ...list.filter((s) => s.code !== signature.code)] : list;
  }, [recipeId, intent]);
  const list = showAll ? ALL_LANGUAGES : recommended;

  const label = dark ? "text-white/45" : "text-[#03002C]/45";
  const selectCls = `rounded-lg border px-2.5 py-1.5 text-xs outline-none transition ${
    dark
      ? "border-white/10 bg-[#03002C]/50 text-white/90 focus:border-[#A1FBF9]"
      : "border-black/10 bg-white text-[#03002C] focus:border-[#003FC7]"
  }`;


  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
          dark
            ? "border-white/10 bg-white/[0.04] hover:border-white/30"
            : "border-black/10 bg-white hover:border-[#003FC7]/50"
        }`}
      >
        <Layers size={13} className={dark ? "text-[#A1FBF9]" : "text-[#003FC7]"} />
        <span className={`text-[11px] font-semibold ${dark ? "text-white" : "text-[#03002C]"}`}>
          Visual style
        </span>
        <span className={`min-w-0 flex-1 truncate text-[11px] ${dark ? "text-white/55" : "text-[#03002C]/55"}`}>
          {selected ? `${selected.name} · ${selected.code}` : "Let the agent choose"}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition ${open ? "rotate-180" : ""} ${dark ? "text-white/60" : "text-[#03002C]/60"}`}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className={`min-h-0 space-y-2.5 overflow-hidden ${open ? "" : "invisible"}`}>
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
              onClick={() => {
                pick(skinPackId(skin.code));
                setLookbook(skin);
              }}
              title={`${skin.name} — ${skin.description} · click to see the full look and feel`}
              aria-pressed={active}
              aria-haspopup="dialog"
              className={`group relative rounded-lg border p-1.5 text-left transition ${
                active
                  ? dark
                    ? "border-[#A1FBF9] bg-white/10"
                    : "border-[#003FC7] bg-[#003FC7]/[0.05]"
                  : dark
                    ? "border-white/10 bg-white/[0.03] hover:border-white/35"
                    : "border-black/10 bg-white hover:border-[#003FC7]/60"
              }`}
            >
              <SkinPreviewTile skin={skin} seed={`${skin.code}-cover`} />
              <span className="pointer-events-none absolute left-1/2 top-[38%] inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-[#03002C] opacity-0 shadow transition group-hover:opacity-100">
                <Maximize2 size={9} /> See the look
              </span>
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
          {showAll ? "Show recommended six" : `View all ${ALL_LANGUAGES.length} visual languages`}
          <ChevronDown size={12} className={showAll ? "rotate-180 transition" : "transition"} />
        </button>
        {selected && (
          <span className={`text-[10px] ${dark ? "text-white/45" : "text-[#03002C]/45"}`}>
            {selected.mode} mode · {selected.density} density · {selected.spec}
          </span>
        )}
      </div>
        </div>
      </div>

      {lookbook && (
        <SkinLookbook
          skin={lookbook}
          active={selectedCode === lookbook.code}
          onUse={() => {
            pick(skinPackId(lookbook.code));
            setLookbook(null);
          }}
          onClose={() => setLookbook(null)}
        />
      )}
    </div>
  );
}

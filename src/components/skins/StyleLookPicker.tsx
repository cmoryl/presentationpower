// Shared "visual style" picker — the same layout and interaction the
// presentation agent uses, reused across the module library surfaces so
// choosing an alternate look feels identical everywhere.
//
// Difference from the agent picker: the value here is a StylePack id (or null
// for the approved TransPerfect brand system), because the library redresses
// approved modules rather than authoring a new deck.
import { useMemo, useState } from "react";
import { Check, ChevronDown, Layers, Maximize2 } from "lucide-react";
import {
  INDUSTRY_RECIPES,
  designSkinByCode,
  industryRecipeById,
  recommendSkins,
} from "@/lib/design-skins";
import { isSkinPackId, skinCodeFromPackId, skinPackId } from "@/lib/design-skin-pack";
import { ALL_STYLE_PACKS, stylePackById, type StylePack } from "@/lib/style-packs";
import { LookPreviewTile } from "@/components/skins/SkinPreviewTile";
import { LookLookbook, type LookMeta } from "@/components/skins/SkinLookbook";
import { skinBackgroundSummary } from "@/lib/skin-backgrounds";
import { BrandSystemThumb } from "@/components/slide/StylePackThumb";

/** Display meta for a pack — skin metadata when available, pack fields otherwise. */
function lookMeta(pack: StylePack): LookMeta & { short: string; kicker: string } {
  const skin = isSkinPackId(pack.id) ? designSkinByCode(skinCodeFromPackId(pack.id)) : null;
  if (skin) {
    return {
      short: skin.code,
      kicker: `${skin.code} · ${skin.density}`,
      code: `${skin.code} · ${skin.reference}`,
      name: skin.name,
      description: skin.description,
      palette: skin.palette,
      specs: [
        ["Typography", skin.typography],
        ["Surfaces", skin.surfaceNote],
        ["Imagery", skin.imagery],
        ["Backdrops", skinBackgroundSummary(skin)],
        ["Density / mode", `${skin.density} · ${skin.mode}`],
      ],
      footer: `Best fit: ${skin.bestFit} · Spec ${skin.spec}`,
    };
  }
  return {
    short: pack.reference,
    kicker: `${pack.reference} · ${pack.mode}`,
    code: pack.reference,
    name: pack.label,
    description: pack.tagline,
    palette: pack.swatch,
    specs: [
      ["Mode", pack.mode],
      ["Type", pack.type.display.split(",")[0].replace(/["']/g, "")],
      ["Cards", `radius ${pack.card.radius}px`],
      ["Reference", pack.reference],
      ["Pack id", pack.id],
    ],
    footer: pack.tagline,
  };
}

export function StyleLookPicker({
  /** Active pack id, or null for the approved brand system. */
  value,
  onChange,
  /** Free-text words used to narrow the recommended set. */
  intent = "",
  className = "",
}: {
  value: string | null;
  onChange: (packId: string | null) => void;
  intent?: string;
  className?: string;
}) {
  const [recipeId, setRecipeId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [lookbook, setLookbook] = useState<StylePack | null>(null);
  const [open, setOpen] = useState(!value);

  const active = value ? stylePackById(value) : null;
  const recipe = industryRecipeById(recipeId);

  const recommended = useMemo(() => {
    const skins = recommendSkins({ recipeId, intent, limit: 6 });
    const packs = skins
      .map((s) => stylePackById(skinPackId(s.code)))
      .filter((p): p is StylePack => Boolean(p));
    // Keep the active look visible even when it isn't in the recommended set.
    if (active && !packs.some((p) => p.id === active.id)) packs.unshift(active);
    return packs;
  }, [recipeId, intent, active]);

  const list = showAll ? ALL_STYLE_PACKS : recommended;

  const pick = (packId: string | null) => {
    onChange(packId);
    setOpen(false);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg border border-black/10 bg-white px-2.5 py-2 text-left transition hover:border-[#003FC7]/50 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/30"
      >
        <Layers size={13} className="text-[#003FC7] dark:text-[#A1FBF9]" />
        <span className="text-[11px] font-semibold text-[#03002C] dark:text-white">
          Visual style
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] text-[#03002C]/55 dark:text-white/55">
          {active
            ? `${active.label} · ${active.reference}`
            : "Approved brand system (TransPerfect)"}
        </span>
        {active && (
          <span aria-hidden className="hidden overflow-hidden rounded-full sm:flex">
            {active.swatch.map((c) => (
              <span key={c} className="h-3 w-2" style={{ background: c }} />
            ))}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`shrink-0 text-[#03002C]/60 transition dark:text-white/60 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className={`min-h-0 space-y-2.5 overflow-hidden ${open ? "" : "invisible"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#03002C]/45 dark:text-white/45">
              Industry recipe
            </span>
            <select
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
              aria-label="Industry recipe"
              className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs text-[#03002C] outline-none transition focus:border-[#003FC7]"
            >
              <option value="">No recipe — recommend broadly</option>
              {INDUSTRY_RECIPES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {value && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-[11px] text-[#03002C]/50 underline-offset-2 hover:text-[#03002C] hover:underline dark:text-white/50 dark:hover:text-white"
              >
                Back to brand system
              </button>
            )}
          </div>

          {recipe && (
            <p className="text-[11px] text-[#03002C]/55 dark:text-white/55">
              {recipe.summary} · Tone {recipe.tone.toLowerCase()} ·{" "}
              <span className="font-medium">{recipe.presets.map((p) => p.name).join(" / ")}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {/* Approved system always leads the grid. */}
            <button
              type="button"
              onClick={() => pick(null)}
              aria-pressed={!value}
              className={`rounded-lg border p-1.5 text-left transition ${
                !value
                  ? "border-[#003FC7] bg-[#003FC7]/[0.05]"
                  : "border-black/10 bg-white hover:border-[#003FC7]/60 dark:border-white/10 dark:bg-white/[0.03]"
              }`}
            >
              <div className="overflow-hidden rounded">
                <BrandSystemThumb />
              </div>
              <div className="mt-1.5 flex items-start gap-1">
                <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#03002C] dark:text-white">
                  Brand system
                </span>
                {!value && <Check size={11} className="text-[#003FC7]" />}
              </div>
              <div className="truncate text-[9px] uppercase tracking-wider text-black/40 dark:text-white/40">
                Approved default
              </div>
            </button>

            {list.map((pk) => {
              const meta = lookMeta(pk);
              const isActive = value === pk.id;
              return (
                <button
                  key={pk.id}
                  type="button"
                  onClick={() => {
                    pick(pk.id);
                    setLookbook(pk);
                  }}
                  title={`${meta.name} — ${meta.description} · click to see the full look and feel`}
                  aria-pressed={isActive}
                  aria-haspopup="dialog"
                  className={`group relative rounded-lg border p-1.5 text-left transition ${
                    isActive
                      ? "border-[#003FC7] bg-[#003FC7]/[0.05]"
                      : "border-black/10 bg-white hover:border-[#003FC7]/60 dark:border-white/10 dark:bg-white/[0.03]"
                  }`}
                >
                  <LookPreviewTile pack={pk} kicker={meta.kicker} seed={`${pk.id}-cover`} />
                  <span className="pointer-events-none absolute left-1/2 top-[38%] inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-[#03002C] opacity-0 shadow transition group-hover:opacity-100">
                    <Maximize2 size={9} /> See the look
                  </span>
                  <div className="mt-1.5 flex items-start gap-1">
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#03002C] dark:text-white">
                      {meta.name}
                    </span>
                    {isActive && <Check size={11} className="text-[#003FC7]" />}
                  </div>
                  <div className="truncate text-[9px] uppercase tracking-wider text-black/40 dark:text-white/40">
                    {meta.short} · {pk.mode}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#003FC7] hover:underline"
            >
              <Layers size={12} />
              {showAll ? "Show recommended looks" : `View all ${ALL_STYLE_PACKS.length} looks`}
              <ChevronDown size={12} className={showAll ? "rotate-180 transition" : "transition"} />
            </button>
            {active && (
              <span className="text-[10px] text-[#03002C]/45 dark:text-white/45">
                {active.mode} mode · {active.tagline}
              </span>
            )}
          </div>
        </div>
      </div>

      {lookbook && (
        <LookLookbook
          pack={lookbook}
          meta={lookMeta(lookbook)}
          active={value === lookbook.id}
          onUse={() => {
            pick(lookbook.id);
            setLookbook(null);
          }}
          onClose={() => setLookbook(null)}
        />
      )}
    </div>
  );
}

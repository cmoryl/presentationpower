/**
 * APPROVED VISUAL STYLE LIBRARY — picker.
 *
 * Contract is unchanged: the value is a StylePack id, or null for the approved
 * TransPerfect brand system. What changed is what is offered and how:
 *
 *   • Only the 28 core OnDeck visual languages (S01–S28) are selectable as
 *     styles. Industry recipes are FILTERS above the grid, not 30 extra cards.
 *   • Every preview is a pure abstract 16:9 background — no fake slide copy,
 *     charts or UI inside the thumbnail. The full module look-and-feel lives one
 *     click deeper in the existing lookbook.
 *   • Legacy / off-brand packs are still resolvable and still reachable, but in
 *     a clearly secondary compatibility drawer. They are never mixed into
 *     approved results.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Layers, Maximize2, Search } from "lucide-react";
import { designSkinByCode } from "@/lib/design-skins";

import { isSkinPackId, skinCodeFromPackId } from "@/lib/design-skin-pack";
import { stylePackById, type StylePack } from "@/lib/style-packs";
import { useSelectablePacks } from "@/hooks/use-selectable-packs";
import { LookLookbook, type LookMeta } from "@/components/skins/SkinLookbook";
import { ApprovedStyleThumb } from "@/components/skins/ApprovedStyleThumb";
import { skinBackgroundSummary } from "@/lib/skin-backgrounds";
import { BrandSystemThumb } from "@/components/slide/StylePackThumb";
import {
  approvedStyles,
  industryFilters,
  isApprovedStyleId,
  recipeDnaCodes,
  recipePresets,
  recommendApprovedStyles,
  searchApprovedStyles,
  type ApprovedStyle,
} from "@/lib/approved-visual-styles";
import { StyleBriefPanel } from "@/components/skins/StyleBriefPanel";
import {
  recommendStylesForBrief,
  summarizeBrief,
  type StyleIntentBrief,
  type StyleRecommendation,
} from "@/lib/style-intent";
import { explainProvenance } from "@/lib/style-learning";
import { useStyleLearning } from "@/hooks/use-style-learning";


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
  const allPacks = useSelectablePacks();
  const [recipeId, setRecipeId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const [showLegacy, setShowLegacy] = useState(false);
  const [lookbook, setLookbook] = useState<StylePack | null>(null);
  const [open, setOpen] = useState(!value);
  const [brief, setBrief] = useState<StyleIntentBrief>({});
  const [showBrief, setShowBrief] = useState(false);

  const active = value ? stylePackById(value) : null;
  const recipe = industryFilters().find((r) => r.id === recipeId) ?? null;
  const styles = approvedStyles();
  const dnaCodes = useMemo(() => recipeDnaCodes(recipeId), [recipeId]);
  const presets = useMemo(() => recipePresets(recipeId), [recipeId]);

  // Industry-first: a chosen sector recommends core languages. "All approved"
  // always returns the full 28 in curated catalog order.
  const recommended = useMemo(
    () => recommendApprovedStyles({ recipeId, intent, limit: 8 }),
    [recipeId, intent],
  );

  // INTENT-AWARE RANKING. Any structured answer (or a chosen industry) switches
  // the grid from catalog order to the deterministic weighted ranking, with the
  // industry DNA still carrying the largest base boost.
  const briefActive = useMemo(
    () =>
      Boolean(
        recipeId ||
          brief.objective ||
          brief.audience ||
          brief.slideJob ||
          brief.density ||
          brief.data ||
          brief.imagery ||
          brief.energy ||
          brief.complexity ||
          (brief.mode && brief.mode !== "any") ||
          brief.highContrast ||
          brief.output,
      ),
    [recipeId, brief],
  );

  // ADAPTIVE LEARNING — capped, decayed, cold-start safe. The catalog rules
  // still decide; learning may only nudge the order inside a governed band.
  const learn = useStyleLearning({
    recipeId,
    objective: brief.objective ?? null,
    audience: brief.audience ?? null,
    density: brief.density ?? null,
    data: brief.data ?? null,
  });

  const ranked = useMemo(
    () =>
      recommendStylesForBrief(
        { ...brief, recipeId, intent },
        { primary: 3, alternates: 3, learning: learn.learning },
      ),
    [brief, recipeId, intent, learn.learning],
  );

  const rankedBase = useMemo(
    () => [...ranked.primary, ...ranked.alternates].map((r) => r.style),
    [ranked],
  );

  const shownCodes = useMemo(() => ranked.primary.map((r) => r.style.code), [ranked]);

  // Log the impression once per distinct recommended set (denominator only).
  const shownKey = briefActive ? `${learn.profileKey}::${shownCodes.join(",")}` : "";
  const lastShown = useRef("");
  const altLogged = useRef("");
  const noteAlternatesViewed = () => {
    if (!shownKey || altLogged.current === shownKey) return;
    altLogged.current = shownKey;
    learn.logSignal("alternates_viewed", { recommendedCodes: shownCodes });
  };

  useEffect(() => {
    if (!shownKey || lastShown.current === shownKey) return;
    lastShown.current = shownKey;
    learn.logSignal("recommendation_shown", { recommendedCodes: shownCodes });
  }, [shownKey, shownCodes, learn]);

  const base = briefActive && !showAll && rankedBase.length ? rankedBase : styles;
  const list = useMemo(() => searchApprovedStyles(query, base), [query, base]);

  // Everything the app can still resolve that is NOT one of the approved 28:
  // legacy test packs and admin templates, kept for backwards compatibility.
  const legacy = useMemo(() => allPacks.filter((p) => !isApprovedStyleId(p.id)), [allPacks]);

  const pick = (packId: string | null) => {
    // Outcome signal: a pick inside the ranked set is a selection; a pick after
    // one was already applied is an override. Neither is treated as approval on
    // its own — export / reuse carry the real positive weight.
    const code = packId && isApprovedStyleId(packId) ? skinCodeFromPackId(packId) : null;
    if (code) {
      const inSet = shownCodes.includes(code);
      const rankShown = ranked.primary.findIndex((r) => r.style.code === code);
      learn.logSignal(inSet ? "style_selected" : "style_overridden", {
        styleCode: code,
        recommendedCodes: shownCodes,
        rankShown: rankShown >= 0 ? rankShown : null,
      });
    } else if (!packId && value) {
      learn.logSignal("recommendation_rejected", { recommendedCodes: shownCodes });
    }
    onChange(packId);
    setOpen(false);
  };


  const activeApproved = isApprovedStyleId(value);

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
            ? `${active.label} · ${active.reference}${activeApproved ? "" : " · legacy"}`
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
          {/* Industry selector sits ABOVE the grid: pick the sector, then the
              catalog recommends the approved languages built for it. */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#03002C]/45 dark:text-white/45">
              Industry
            </span>
            <select
              value={recipeId}
              onChange={(e) => {
                setRecipeId(e.target.value);
                setShowAll(false);
              }}
              aria-label="Industry"
              className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs text-[#03002C] outline-none transition focus:border-[#003FC7]"
            >
              <option value="">All approved styles</option>
              {industryFilters().map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>

            <label className="relative flex min-w-[9rem] flex-1 items-center">
              <Search
                size={12}
                aria-hidden
                className="absolute left-2 text-[#03002C]/40 dark:text-white/40"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search styles, references or industries"
                aria-label="Search approved visual styles"
                className="w-full rounded-lg border border-black/10 bg-white py-1.5 pl-7 pr-2 text-xs text-[#03002C] outline-none transition placeholder:text-[#03002C]/35 focus:border-[#003FC7] dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
              />
            </label>

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
            <div className="space-y-1">
              <p className="text-[11px] text-[#03002C]/55 dark:text-white/55">
                {recipe.summary} · Tone {recipe.tone.toLowerCase()}
              </p>
              {presets.length > 0 && (
                <p className="text-[10px] text-[#03002C]/45 dark:text-white/45">
                  Narrative presets:{" "}
                  {presets
                    .map((p) => `${p.name}${p.resolvesTo ? ` (${p.resolvesTo})` : ""}`)
                    .join(" · ")}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowBrief((v) => !v)}
              aria-expanded={showBrief}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#003FC7] hover:underline"
            >
              <ChevronDown size={12} className={showBrief ? "rotate-180 transition" : "transition"} />
              Deck brief — objective, audience, story, delivery
            </button>
            {showBrief && <StyleBriefPanel brief={brief} onChange={setBrief} />}
            {briefActive && (
              <p className="text-[10px] text-[#03002C]/45 dark:text-white/45">{summarizeBrief({ ...brief, recipeId })}</p>
            )}

            {/* Learning status + user control. Learning is capped, decaying and
                can be switched off or reset at any time. */}
            {briefActive && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 px-2 py-1.5 text-[10px] text-[#03002C]/55 dark:border-white/10 dark:text-white/55">
                <span className="font-semibold uppercase tracking-wider text-[#03002C]/45 dark:text-white/45">
                  Learning
                </span>
                <span className="min-w-0 flex-1">
                  {!learn.enabled
                    ? "Off — ranking from approved catalog rules only."
                    : learn.active
                      ? `On — ${learn.learning.userSamples} of your signals, ${learn.learning.profileSamples} similar decks. Capped nudge only.`
                      : "Warming up — approved catalog rules only until enough usage exists."}
                </span>
                <button
                  type="button"
                  onClick={() => learn.setLearningEnabled(!learn.enabled)}
                  disabled={learn.busy}
                  className="rounded-full border border-black/10 px-2 py-0.5 hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-50 dark:border-white/15"
                >
                  {learn.enabled ? "Ignore learned" : "Use learned"}
                </button>
                <button
                  type="button"
                  onClick={() => learn.resetLearned()}
                  disabled={learn.busy}
                  className="rounded-full border border-black/10 px-2 py-0.5 hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-50 dark:border-white/15"
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          {briefActive && !showAll && (
            <div className="space-y-1.5">
              <RecoRow
                title="Recommended"
                items={ranked.primary}
                value={value}
                onPick={(s) => pick(s.pack.id)}
              />
              <div onMouseEnter={() => learn.logSignal("alternates_viewed", { recommendedCodes: shownCodes })}>
                <RecoRow
                  title="Alternates"
                  items={ranked.alternates}
                  value={value}
                  onPick={(s) => pick(s.pack.id)}
                  muted
                />
              </div>
            </div>
          )}


          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#03002C]/45 dark:text-white/45">
              {briefActive && !showAll ? "Ranked for this brief" : "All approved styles"}
            </span>
            <span className="text-[10px] text-[#03002C]/40 dark:text-white/40">
              {list.length} of {styles.length} approved visual languages
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {/* Approved brand system always leads the grid. */}
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

            {list.map((s) => (
              <ApprovedStyleCard
                key={s.code}
                style={s}
                active={value === s.pack.id}
                recommended={dnaCodes.includes(s.code)}
                onPick={() => {
                  pick(s.pack.id);
                  setLookbook(s.pack);
                }}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {briefActive ? (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#003FC7] hover:underline"
              >
                <Layers size={12} />
                {showAll ? "Back to the ranked brief" : `View all ${styles.length} approved styles`}
                <ChevronDown
                  size={12}
                  className={showAll ? "rotate-180 transition" : "transition"}
                />
              </button>
            ) : (
              <span className="text-[10px] text-[#03002C]/45 dark:text-white/45">
                Every approved style supports Light · Dark · High contrast
              </span>
            )}
            {active && (
              <span className="text-[10px] text-[#03002C]/45 dark:text-white/45">
                {active.mode} mode · {active.tagline}
              </span>
            )}
          </div>

          {/* Compatibility only — never mixed into approved results. */}
          {legacy.length > 0 && (
            <div className="rounded-lg border border-dashed border-black/10 p-2 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowLegacy((v) => !v)}
                aria-expanded={showLegacy}
                className="flex w-full items-center gap-1.5 text-left text-[10px] font-semibold uppercase tracking-widest text-[#03002C]/40 dark:text-white/40"
              >
                <ChevronDown
                  size={11}
                  className={showLegacy ? "rotate-180 transition" : "transition"}
                />
                Legacy / custom looks ({legacy.length}) — kept so older decks keep resolving
              </button>
              {showLegacy && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {legacy.map((pk) => (
                    <button
                      key={pk.id}
                      type="button"
                      onClick={() => pick(pk.id)}
                      aria-pressed={value === pk.id}
                      className={`rounded-full border px-2 py-1 text-[10px] transition ${
                        value === pk.id
                          ? "border-[#003FC7] text-[#003FC7]"
                          : "border-black/10 text-[#03002C]/60 hover:border-[#003FC7]/50 dark:border-white/10 dark:text-white/60"
                      }`}
                    >
                      {pk.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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

/**
 * One approved style card: pure abstract background, S-code + name, best-fit
 * industry chips, mode support, density, and the catalog palette.
 */
function ApprovedStyleCard({
  style,
  active,
  recommended,
  onPick,
}: {
  style: ApprovedStyle;
  active: boolean;
  recommended: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      title={`${style.code} ${style.name} — ${style.description} · click to see the full look and feel`}
      aria-pressed={active}
      aria-haspopup="dialog"
      className={`group relative rounded-lg border p-1.5 text-left transition ${
        active
          ? "border-[#003FC7] bg-[#003FC7]/[0.05]"
          : "border-black/10 bg-white hover:border-[#003FC7]/60 dark:border-white/10 dark:bg-white/[0.03]"
      }`}
    >
      <div className="relative overflow-hidden rounded">
        <ApprovedStyleThumb pack={style.pack} scene="cover" />
        <span className="pointer-events-none absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-[#03002C] opacity-0 shadow transition group-hover:opacity-100">
          <Maximize2 size={9} /> See the look
        </span>
        {recommended && (
          <span className="absolute left-1 top-1 rounded-full bg-[#003FC7] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white">
            Recommended
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-start gap-1">
        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#03002C] dark:text-white">
          {style.name}
        </span>
        {active && <Check size={11} className="text-[#003FC7]" />}
      </div>
      <div className="truncate text-[9px] uppercase tracking-wider text-black/40 dark:text-white/40">
        {style.code} · {style.density}
      </div>

      <div className="mt-1 flex flex-wrap gap-1">
        {style.chips.slice(0, 4).map((c) => (
          <span
            key={c}
            className="rounded border border-black/10 px-1 py-px text-[8px] text-[#03002C]/55 dark:border-white/10 dark:text-white/55"
          >
            {c}
          </span>
        ))}
      </div>

      <div className="mt-1 flex items-center gap-1.5">
        <span aria-hidden className="flex overflow-hidden rounded">
          {style.palette.map((c) => (
            <span key={c} className="h-2.5 w-2.5" style={{ background: c }} />
          ))}
        </span>
        <span className="truncate text-[8px] text-black/35 dark:text-white/35">
          Light · Dark · HC
        </span>
      </div>
    </button>
  );
}

/**
 * One ranked row: S-code, name, score and the human-readable reason. This is
 * the explanation surface — the grid below stays purely visual.
 */
function RecoRow({
  title,
  items,
  value,
  onPick,
  muted = false,
}: {
  title: string;
  items: StyleRecommendation[];
  value: string | null;
  onPick: (style: ApprovedStyle) => void;
  muted?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div>
      <span className="text-[9px] font-semibold uppercase tracking-widest text-[#03002C]/40 dark:text-white/40">
        {title}
      </span>
      <ul className="mt-1 space-y-1">
        {items.map((r) => (
          <li key={r.style.code}>
            <button
              type="button"
              onClick={() => onPick(r.style)}
              aria-pressed={value === r.style.pack.id}
              title={explainProvenance(r.provenance)}
              className={`flex w-full items-start gap-2 rounded-lg border p-1.5 text-left transition ${
                value === r.style.pack.id
                  ? "border-[#003FC7] bg-[#003FC7]/[0.05]"
                  : "border-black/10 bg-white hover:border-[#003FC7]/60 dark:border-white/10 dark:bg-white/[0.03]"
              } ${muted ? "opacity-80" : ""}`}
            >
              <span aria-hidden className="mt-0.5 flex shrink-0 overflow-hidden rounded">
                {r.style.palette.slice(0, 4).map((c) => (
                  <span key={c} className="h-3 w-1.5" style={{ background: c }} />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold text-[#03002C] dark:text-white">
                  {r.style.code} · {r.style.name}
                </span>
                <span className="block text-[10px] text-[#03002C]/55 dark:text-white/55">{r.reason}</span>
                {/* Explainable provenance: catalog rules vs learned preference. */}
                <span className="mt-0.5 flex flex-wrap items-center gap-1">
                  <span className="rounded-full bg-black/5 px-1.5 py-px text-[8px] uppercase tracking-wider text-[#03002C]/50 dark:bg-white/10 dark:text-white/50">
                    catalog {r.provenance.catalogPoints}
                  </span>
                  {r.provenance.learnedPoints !== 0 && (
                    <span className="rounded-full bg-[#003FC7]/10 px-1.5 py-px text-[8px] uppercase tracking-wider text-[#003FC7] dark:bg-[#A1FBF9]/15 dark:text-[#A1FBF9]">
                      learned {r.provenance.learnedPoints > 0 ? "+" : ""}
                      {r.provenance.learnedPoints} · conf{" "}
                      {Math.round(r.provenance.confidence * 100)}%
                    </span>
                  )}
                  {r.provenance.coldStart && (
                    <span className="text-[8px] uppercase tracking-wider text-[#03002C]/35 dark:text-white/35">
                      catalog only
                    </span>
                  )}
                </span>
              </span>
              <span className="shrink-0 text-[9px] tabular-nums text-[#03002C]/35 dark:text-white/35">
                {r.score}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}


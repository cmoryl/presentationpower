// Quick-start brief form for the /agent hero: paste a brief, pick capability
// filters (visual style, industry, tone), and hand a composed prompt to the chat.
import { useEffect, useRef, useState } from "react";
import { stylePackById } from "@/lib/style-packs";
import { SkinCatalogPicker } from "@/components/skins/SkinCatalogPicker";
import { designSkinByCode, industryRecipeById } from "@/lib/design-skins";
import { isSkinPackId, skinCodeFromPackId } from "@/lib/design-skin-pack";
import { AgentDesignOverrides } from "@/components/agent/AgentDesignOverrides";


// ---- per-thread filter persistence (browser-local) ----
type QuickFilters = {
  purpose: string;
  length: string;
  audience: string;
  stylePackId: string;
  /** Industry recipe id from the design skin catalog, e.g. "R01". */
  recipeId: string;
  industries: string[];
  tones: string[];
  showFilters: boolean;
};

const filtersKey = (threadId: string) => `agent-quickstart-filters:${threadId}`;

function readFilters(threadId: string | undefined): Partial<QuickFilters> | null {
  if (!threadId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(filtersKey(threadId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuickFilters>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeFilters(threadId: string | undefined, value: QuickFilters) {
  if (!threadId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(filtersKey(threadId), JSON.stringify(value));
  } catch {
    /* quota or disabled storage — filters just won't persist */
  }
}


export const QUICK_LENGTH_AUTO = "Auto — let the AI decide";
export const QUICK_LENGTHS = [
  QUICK_LENGTH_AUTO,
  "5 slides",
  "10 slides",
  "15 slides",
  "20 slides",
] as const;

export const QUICK_PURPOSES = [
  "New business pitch",
  "Client QBR / review",
  "Event keynote",
  "Internal update",
  "Product / solution overview",
] as const;

export const QUICK_INDUSTRIES = [
  "Life sciences",
  "Financial services",
  "Retail & e-commerce",
  "Technology & software",
  "Legal",
  "Manufacturing & industrial",
  "Media & entertainment",
  "Gaming",
  "Travel & hospitality",
  "Public sector",
  "Education",
] as const;

export const QUICK_TONES = [
  "Confident & bold",
  "Consultative",
  "Data-driven",
  "Visionary",
  "Warm & human",
  "Technical & precise",
] as const;

export interface QuickStartSelection {
  brief: string;
  purpose: string;
  length: string;
  audience: string;
  /** Style pack id (built-in or "skin-sXX"), or "" for "let the agent choose". */
  stylePackId: string;
  /** Industry recipe id from the design skin catalog, e.g. "R01". */
  recipeId?: string;
  industries: string[];
  tones: string[];
}

/** Compose a plain-language brief the agent can act on in one turn. */
export function buildQuickStartPrompt(input: QuickStartSelection) {
  const pack = stylePackById(input.stylePackId);
  const skin = isSkinPackId(input.stylePackId)
    ? designSkinByCode(skinCodeFromPackId(input.stylePackId))
    : null;
  const recipe = industryRecipeById(input.recipeId ?? "");
  const lines = [
    "Build a presentation for me and generate the deck now.",
    "",
    `Purpose: ${input.purpose}`,
    input.length === QUICK_LENGTH_AUTO
      ? "Length: AUTO — do not use a fixed slide count. Read the brief closely and decide the exact number of slides it needs (typically 5-30), based on how many distinct ideas, proofs, sections and asks it actually contains. Do not pad with filler slides and do not compress two ideas onto one slide. Before generating, state the slide count you chose, a one-line reason, and a numbered slide-by-slide outline naming the purpose and the key content of each slide, then build exactly that deck."
      : `Length: about ${input.length}`,
  ];
  if (input.audience.trim()) lines.push(`Audience: ${input.audience.trim()}`);
  if (input.industries.length) lines.push(`Industry focus: ${input.industries.join(", ")}`);
  if (input.tones.length) lines.push(`Tone of voice: ${input.tones.join(", ")}`);
  if (recipe) {
    lines.push(
      `Industry recipe: ${recipe.name} — ${recipe.summary}. Story tone ${recipe.tone}.`,
    );
  }
  if (skin) {
    lines.push(
      `Visual style: use the "${skin.name}" design skin (id: ${input.stylePackId}, ${skin.mode} mode) — ${skin.description} Surfaces: ${skin.surfaceNote}. Imagery: ${skin.imagery}.`,
    );
  } else if (pack) {
    lines.push(
      `Visual style: use the "${pack.label}" style pack (id: ${pack.id}) for layout and treatment.`,
    );
  } else {
    lines.push("Visual style: pick the brand-approved style pack that best fits this audience.");
  }
  lines.push("", "Brief:", input.brief.trim());
  lines.push(
    "",
    "Pick the right division, narrative and brand-approved modules, write the copy and speaker notes, and create the deck.",
  );
  return lines.join("\n");
}


const selectClass = (
  v: "light" | "dark",
) => `rounded-lg border px-2.5 py-1.5 text-xs outline-none transition ${
  v === "dark"
    ? "border-white/10 bg-[#03002C]/50 text-white/90 placeholder:text-white/35 focus:border-[#A1FBF9]"
    : "border-black/10 bg-white text-[#03002C] placeholder:text-[#03002C]/35 focus:border-[#003FC7]"
}`;

function FilterChips({
  legend,
  options,
  selected,
  onToggle,
  variant,
}: {
  legend: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  variant?: "light" | "dark";
}) {
  const v = variant ?? "light";
  return (
    <fieldset className="min-w-0">
      <legend
        className={`mb-1.5 text-[10px] font-semibold uppercase tracking-widest ${
          v === "dark" ? "text-white/45" : "text-[#03002C]/45"
        }`}
      >
        {legend}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                active
                  ? v === "dark"
                    ? "border-white/70 bg-white/20 text-white"
                    : "border-[#003FC7] bg-[#003FC7] text-white"
                  : v === "dark"
                    ? "border-white/10 bg-white/[0.05] text-white/70 hover:border-white/40 hover:text-white"
                    : "border-black/10 bg-white text-[#03002C]/70 hover:border-[#003FC7]/60 hover:text-[#03002C]"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function AgentQuickStart({
  disabled,
  onStart,
  className,
  threadId,
  seedBrief,
  variant = "light",
}: {
  disabled: boolean;
  onStart: (prompt: string) => void;
  className?: string;
  /** Filters are remembered per thread when provided. */
  threadId?: string;
  /** Optional brief seed injected from an external starter. */
  seedBrief?: string;
  /** Visual variant of the form. */
  variant?: "light" | "dark";
}) {
  const stored = useRef<Partial<QuickFilters> | null>(null);
  if (stored.current === null) stored.current = readFilters(threadId) ?? {};

  const [brief, setBrief] = useState("");
  const [briefExpanded, setBriefExpanded] = useState(false);
  const briefRef = useRef<HTMLTextAreaElement | null>(null);

  const [purpose, setPurpose] = useState<string>(stored.current.purpose ?? QUICK_PURPOSES[0]);
  const [length, setLength] = useState<string>(stored.current.length ?? QUICK_LENGTH_AUTO);
  const [audience, setAudience] = useState(stored.current.audience ?? "");
  const [stylePackId, setStylePackId] = useState(stored.current.stylePackId ?? "");
  const [recipeId, setRecipeId] = useState(stored.current.recipeId ?? "");
  const [industries, setIndustries] = useState<string[]>(stored.current.industries ?? []);
  const [tones, setTones] = useState<string[]>(stored.current.tones ?? []);
  // Default OPEN so the design skin catalog (28 visual languages) is visible
  // without hunting for a collapsed panel; a stored preference still wins.
  const [showFilters, setShowFilters] = useState(
    stored.current.showFilters === undefined ? true : Boolean(stored.current.showFilters),
  );

  // Inject an externally selected starter brief.
  const seedRef = useRef(seedBrief);
  useEffect(() => {
    if (seedBrief !== undefined && seedBrief !== seedRef.current) {
      seedRef.current = seedBrief;
      setBrief(seedBrief);
    }
  }, [seedBrief]);

  // Re-hydrate when the thread changes (component may stay mounted across routes).
  const hydratedFor = useRef(threadId);
  useEffect(() => {
    if (hydratedFor.current === threadId) return;
    hydratedFor.current = threadId;
    const next = readFilters(threadId) ?? {};
    setPurpose(next.purpose ?? QUICK_PURPOSES[0]);
    setLength(next.length ?? QUICK_LENGTH_AUTO);
    setAudience(next.audience ?? "");
    setStylePackId(next.stylePackId ?? "");
    setRecipeId(next.recipeId ?? "");
    setIndustries(next.industries ?? []);
    setTones(next.tones ?? []);
    setShowFilters(Boolean(next.showFilters));
  }, [threadId]);

  // Persist selections for this thread.
  useEffect(() => {
    if (hydratedFor.current !== threadId) return;
    writeFilters(threadId, {
      purpose,
      length,
      audience,
      stylePackId,
      recipeId,
      industries,
      tones,
      showFilters,
    });
  }, [threadId, purpose, length, audience, stylePackId, recipeId, industries, tones, showFilters]);

  const ready = brief.trim().length >= 12 && !disabled;
  const filterCount =
    industries.length + tones.length + (stylePackId ? 1 : 0) + (recipeId ? 1 : 0);


  const toggle = (setter: (fn: (prev: string[]) => string[]) => void, max: number) => (value: string) =>
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value].slice(-max),
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        onStart(
          buildQuickStartPrompt({
            brief,
            purpose,
            length,
            audience,
            stylePackId,
            recipeId,
            industries,
            tones,
          }),
        );
      }}

      className={`relative mt-0 space-y-2 rounded-xl border p-3 ${
        variant === "dark"
          ? "border-white/10 bg-white/[0.05] backdrop-blur"
          : "border-black/[0.06] bg-white/80"
      } ${className ?? ""}`}
    >
      <label
        htmlFor="quick-brief"
        className={`block text-[11px] font-semibold uppercase tracking-widest ${
          variant === "dark" ? "text-white/50" : "text-[#03002C]/55"
        }`}
      >
        Quick start — paste your brief
      </label>
      <textarea
        id="quick-brief"
        ref={briefRef}
        value={brief}
        rows={briefExpanded ? 18 : 6}
        maxLength={60000}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="Paste your full brief, RFP excerpt, meeting notes or transcript — long copy is fine. e.g. GlobalLink pitch for a global retail prospect moving from batch translation to continuous localization. Emphasize speed, cost control and enterprise governance."
        className={`w-full resize-y overflow-auto rounded-lg border px-3 py-2 text-sm leading-relaxed outline-none transition ${
          briefExpanded ? "max-h-[60vh]" : "max-h-64"
        } ${
          variant === "dark"
            ? "border-white/10 bg-[#03002C]/40 text-white placeholder:text-white/35 focus:border-[#A1FBF9]"
            : "border-black/10 bg-white text-[#03002C] placeholder:text-[#03002C]/35 focus:border-[#003FC7]"
        }`}
      />
      <div
        className={`flex items-center justify-between gap-2 text-[10px] ${
          variant === "dark" ? "text-white/45" : "text-[#03002C]/45"
        }`}
      >
        <span>
          {brief.trim() ? `${brief.trim().length.toLocaleString()} characters` : "Long paste supported"}
          {brief.length > 55000 ? " — approaching the 60,000 character limit" : ""}
        </span>
        <button
          type="button"
          onClick={() => setBriefExpanded((v) => !v)}
          className={`rounded-full border px-2 py-0.5 font-medium transition ${
            variant === "dark"
              ? "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
              : "border-black/10 text-[#03002C]/70 hover:border-[#003FC7]/60 hover:text-[#03002C]"
          }`}
        >
          {briefExpanded ? "Collapse brief" : "Expand brief"}
        </button>
      </div>


      <div className="flex flex-wrap items-center gap-2">
        <select
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          aria-label="Presentation purpose"
          className={selectClass(variant)}
        >
          {QUICK_PURPOSES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={length}
          onChange={(e) => setLength(e.target.value)}
          aria-label="Deck length"
          className={selectClass(variant)}
        >
          {QUICK_LENGTHS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <input
          value={audience}
          maxLength={160}
          onChange={(e) => setAudience(e.target.value)}
          aria-label="Audience"
          placeholder="Audience (optional)"
          className={`min-w-[9rem] flex-1 rounded-lg border px-2.5 py-1.5 text-xs outline-none transition ${
            variant === "dark"
              ? "border-white/10 bg-[#03002C]/40 text-white placeholder:text-white/35 focus:border-[#A1FBF9]"
              : "border-black/10 bg-white text-[#03002C] placeholder:text-[#03002C]/35 focus:border-[#003FC7]"
          }`}
        />
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          aria-controls="quick-filters"
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            variant === "dark"
              ? "border-white/10 bg-white/[0.05] text-white/75 hover:border-white/30 hover:text-white"
              : "border-black/10 bg-white text-[#03002C]/75 hover:border-[#003FC7] hover:text-[#03002C]"
          }`}
        >
          {showFilters ? "Hide design options" : "Design skins & filters"}
          {filterCount > 0 && (
            <span className="ml-1.5 rounded-full bg-[#003FC7] px-1.5 text-[10px] font-semibold text-white">
              {filterCount}
            </span>
          )}
        </button>
        <button
          type="submit"
          disabled={!ready}
          className="rounded-lg bg-[#003FC7] px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
        >
          {disabled ? "Working…" : "Generate deck"}
        </button>
      </div>

      {showFilters && (
        <div
          id="quick-filters"
          className={`space-y-3 rounded-lg border p-3 ${
            variant === "dark"
              ? "border-white/10 bg-white/[0.03]"
              : "border-black/[0.06] bg-white/50"
          }`}
        >
          <div className="space-y-2">
            <span
              className={`text-[10px] font-semibold uppercase tracking-widest ${
                variant === "dark" ? "text-white/45" : "text-[#03002C]/45"
              }`}
            >
              Visual style
            </span>
            <SkinCatalogPicker
              value={stylePackId}
              onChange={setStylePackId}
              recipeId={recipeId}
              onRecipeChange={setRecipeId}
              intent={`${industries.join(" ")} ${audience} ${brief}`}
              variant={variant}
            />
          </div>

          <FilterChips
            legend="Industry (up to 3)"
            options={QUICK_INDUSTRIES}
            selected={industries}
            onToggle={toggle(setIndustries, 3)}
            variant={variant}
          />
          <FilterChips
            legend="Tone (up to 2)"
            options={QUICK_TONES}
            selected={tones}
            onToggle={toggle(setTones, 2)}
            variant={variant}
          />
          
          <AgentDesignOverrides threadId={threadId} variant={variant} />

          {filterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setStylePackId("");
                setIndustries([]);
                setTones([]);
              }}
              className={`text-[11px] font-medium underline-offset-2 hover:underline ${
                variant === "dark"
                  ? "text-white/50 hover:text-white"
                  : "text-[#03002C]/50 hover:text-[#03002C]"
              }`}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <p
        className={`text-[11px] ${
          variant === "dark" ? "text-white/50" : "text-[#03002C]/50"
        }`}
      >
        The brief goes straight into the conversation — you can keep refining the deck in the chat.
      </p>
    </form>
  );
}

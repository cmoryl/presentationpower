// Quick-start brief form for the /agent hero: paste a brief, pick capability
// filters (visual style, industry, tone), and hand a composed prompt to the chat.
import { useEffect, useRef, useState } from "react";
import { STYLE_PACKS } from "@/lib/style-packs";

// ---- per-thread filter persistence (browser-local) ----
type QuickFilters = {
  purpose: string;
  length: string;
  audience: string;
  stylePackId: string;
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


export const QUICK_LENGTHS = ["5 slides", "10 slides", "15 slides", "20 slides"] as const;

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
  /** Style pack id, or "" for "let the agent choose". */
  stylePackId: string;
  industries: string[];
  tones: string[];
}

/** Compose a plain-language brief the agent can act on in one turn. */
export function buildQuickStartPrompt(input: QuickStartSelection) {
  const pack = STYLE_PACKS.find((p) => p.id === input.stylePackId);
  const lines = [
    "Build a presentation for me and generate the deck now.",
    "",
    `Purpose: ${input.purpose}`,
    `Length: about ${input.length}`,
  ];
  if (input.audience.trim()) lines.push(`Audience: ${input.audience.trim()}`);
  if (input.industries.length) lines.push(`Industry focus: ${input.industries.join(", ")}`);
  if (input.tones.length) lines.push(`Tone of voice: ${input.tones.join(", ")}`);
  lines.push(
    pack
      ? `Visual style: use the "${pack.label}" style pack (id: ${pack.id}) for layout and treatment.`
      : "Visual style: pick the brand-approved style pack that best fits this audience.",
  );
  lines.push("", "Brief:", input.brief.trim());
  lines.push(
    "",
    "Pick the right division, narrative and brand-approved modules, write the copy and speaker notes, and create the deck.",
  );
  return lines.join("\n");
}

const selectClass =
  "rounded-lg border border-border/70 bg-background/80 px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-[#003FC7]";

function FilterChips({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-foreground/45">
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
                  ? "border-[#003FC7] bg-[#003FC7] text-white"
                  : "border-border/70 bg-background/70 text-foreground/70 hover:border-[#003FC7]/60 hover:text-foreground"
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
}: {
  disabled: boolean;
  onStart: (prompt: string) => void;
  className?: string;
  /** Filters are remembered per thread when provided. */
  threadId?: string;
}) {
  const stored = useRef<Partial<QuickFilters> | null>(null);
  if (stored.current === null) stored.current = readFilters(threadId) ?? {};

  const [brief, setBrief] = useState("");
  const [purpose, setPurpose] = useState<string>(stored.current.purpose ?? QUICK_PURPOSES[0]);
  const [length, setLength] = useState<string>(stored.current.length ?? QUICK_LENGTHS[1]);
  const [audience, setAudience] = useState(stored.current.audience ?? "");
  const [stylePackId, setStylePackId] = useState(stored.current.stylePackId ?? "");
  const [industries, setIndustries] = useState<string[]>(stored.current.industries ?? []);
  const [tones, setTones] = useState<string[]>(stored.current.tones ?? []);
  const [showFilters, setShowFilters] = useState(Boolean(stored.current.showFilters));

  // Re-hydrate when the thread changes (component may stay mounted across routes).
  const hydratedFor = useRef(threadId);
  useEffect(() => {
    if (hydratedFor.current === threadId) return;
    hydratedFor.current = threadId;
    const next = readFilters(threadId) ?? {};
    setPurpose(next.purpose ?? QUICK_PURPOSES[0]);
    setLength(next.length ?? QUICK_LENGTHS[1]);
    setAudience(next.audience ?? "");
    setStylePackId(next.stylePackId ?? "");
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
      industries,
      tones,
      showFilters,
    });
  }, [threadId, purpose, length, audience, stylePackId, industries, tones, showFilters]);

  const ready = brief.trim().length >= 12 && !disabled;
  const filterCount = industries.length + tones.length + (stylePackId ? 1 : 0);


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
            industries,
            tones,
          }),
        );
      }}
      className={`relative mt-0 space-y-2 rounded-xl border border-white/50 bg-white/60 p-3 dark:border-white/[0.08] dark:bg-[#0B0A2A]/60 ${className ?? ""}`}
    >
      <label
        htmlFor="quick-brief"
        className="block text-[11px] font-semibold uppercase tracking-widest text-[#03002C]/55 dark:text-[#E0E8F5]/55"
      >
        Quick start — paste your brief
      </label>
      <textarea
        id="quick-brief"
        value={brief}
        rows={3}
        maxLength={4000}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="e.g. GlobalLink pitch for a global retail prospect moving from batch translation to continuous localization. Emphasize speed, cost control and enterprise governance."
        className="w-full resize-none rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-foreground/35 focus:border-[#003FC7]"
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          aria-label="Presentation purpose"
          className={selectClass}
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
          className={selectClass}
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
          className="min-w-[9rem] flex-1 rounded-lg border border-border/70 bg-background/80 px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-foreground/35 focus:border-[#003FC7]"
        />
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          aria-controls="quick-filters"
          className="rounded-lg border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground/75 transition hover:border-[#003FC7] hover:text-foreground"
        >
          {showFilters ? "Hide filters" : "Filters"}
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
          className="space-y-3 rounded-lg border border-border/60 bg-background/50 p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="quick-style"
              className="text-[10px] font-semibold uppercase tracking-widest text-foreground/45"
            >
              Visual style
            </label>
            <select
              id="quick-style"
              value={stylePackId}
              onChange={(e) => setStylePackId(e.target.value)}
              className={selectClass}
            >
              <option value="">Let the agent choose</option>
              {STYLE_PACKS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <FilterChips
            legend="Industry (up to 3)"
            options={QUICK_INDUSTRIES}
            selected={industries}
            onToggle={toggle(setIndustries, 3)}
          />
          <FilterChips
            legend="Tone (up to 2)"
            options={QUICK_TONES}
            selected={tones}
            onToggle={toggle(setTones, 2)}
          />
          {filterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setStylePackId("");
                setIndustries([]);
                setTones([]);
              }}
              className="text-[11px] font-medium text-foreground/50 underline-offset-2 hover:text-foreground hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <p className="text-[11px] text-[#03002C]/50 dark:text-[#E0E8F5]/50">
        The brief goes straight into the conversation — you can keep refining the deck in the chat.
      </p>
    </form>
  );
}

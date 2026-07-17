import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useDeckStore } from "@/lib/deck-store";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { personalizeSlides } from "@/lib/personalize.functions";
import { retrieveKnowledgeForBrief, abAssign, abLogEvent } from "@/lib/admin.functions";
import { synthesizeKnowledgeForBrief, type SynthesizedSnippet } from "@/lib/ai-rag.functions";
import { planDeckStrategy, type DeckStrategy, type StrategySection } from "@/lib/ai-strategist.functions";

import { byId, SECTION_FRAMEWORKS, NARRATIVE_ARCHETYPES, type BrandMode } from "@/lib/taxonomy";
import { TRANSPERFECT_SUBCOMPANIES } from "@/lib/brand-guides";
import { brandModeWithSubCompany, getSubCompanyProfile } from "@/lib/brand-profiles";
import { BrandLockup } from "@/components/BrandLockup";
import { PaletteLab, type PaletteSelection } from "@/components/PaletteLab";

export const Route = createFileRoute("/brief/new")({
  head: () => ({
    meta: [
      { title: "New brief · TransPerfect Modular" },
      { name: "description", content: "Guided brief that resolves into an assembled deck." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Urbanist:wght@600;700;800&family=Epilogue:wght@400;500;600&display=swap",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: BriefWizard,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-red-600">Brief failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

// Token-locked styles (Navy Trust palette + Urbanist/Epilogue)
const PALETTE = {
  page: "var(--brief-page, #E8EDF3)",
  surface: "var(--brief-surface, #FFFFFF)",
  ink: "var(--brief-ink, #0F1B3D)",
  inkSoft: "var(--brief-ink-soft, #1E3A5F)",
  blue: "var(--brief-blue, #3B6FA0)",
  hairline: "var(--brief-hairline, #D1DBE5)",
  field: "var(--brief-field, #F8FAFC)",
} as const;


const labelCls =
  "text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1B3D] font-['Urbanist']";
const inputCls =
  "w-full rounded-lg border border-[#D1DBE5] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F1B3D] placeholder:text-[#3B6FA0]/50 focus:border-[#3B6FA0] focus:outline-none focus:ring-2 focus:ring-[#3B6FA0]/25 transition-all";

function BriefWizard() {
  const navigate = useNavigate();
  const create = useDeckStore((s) => s.createBriefAndAssemble);
  const setDeckContext = useDeckStore((s) => s.setDeckContext);
  const applyAi = useDeckStore((s) => s.applyAiContent);
  const decks = useDeckStore((s) => s.decks);
  const personalize = useServerFn(personalizeSlides);
  const retrieveKnowledge = useServerFn(retrieveKnowledgeForBrief);
  const synthesizeKnowledge = useServerFn(synthesizeKnowledgeForBrief);
  const planStrategyFn = useServerFn(planDeckStrategy);
  const assignVariantFn = useServerFn(abAssign);
  const logAbEventFn = useServerFn(abLogEvent);
  const { brandModes, narrativeArchetypes } = useTaxonomy();
  const [aiStatus, setAiStatus] = useState<"idle" | "assembling" | "knowledge" | "personalizing" | "error">("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAllArchetypes, setShowAllArchetypes] = useState(false);
  const [paletteSel, setPaletteSel] = useState<PaletteSelection>({ experimentId: null, variantId: null, paletteOverride: null });
  const [kbUsedCount, setKbUsedCount] = useState<number>(0);
  const [kbSelected, setKbSelected] = useState<SynthesizedSnippet[]>([]);
  const [kbSynthesis, setKbSynthesis] = useState<string | null>(null);
  const [kbSynthesized, setKbSynthesized] = useState(false);
  const [showKbPanel, setShowKbPanel] = useState(false);

  // AI Narrative Strategist (Phase B) — optional pass before deck generation.
  const [strategy, setStrategy] = useState<DeckStrategy | null>(null);
  const [strategyStatus, setStrategyStatus] = useState<"idle" | "planning" | "ready" | "error">("idle");
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [strategySetupNeeded, setStrategySetupNeeded] = useState(false);
  const [form, setForm] = useState({
    prospect: "Acme Global",
    industry: "Life sciences",
    meetingObjective: "Secure pilot in the highest-volume market",
    audience: "VP Marketing + Head of Localization",
    brandModeId: brandModes[0]?.id ?? "bm-enterprise",
    subCompany: "",
    archetypeId: narrativeArchetypes[0]?.id ?? "arch-problem-solution",
    lengthTarget: 9,
    clientFacts: "Recently expanded into 12 new markets. Under regulatory review pressure.",
  });

  const busy = aiStatus === "assembling" || aiStatus === "knowledge" || aiStatus === "personalizing";
  const rawBrand = useMemo(
    () => brandModes.find((b) => b.id === form.brandModeId) ?? brandModes[0],
    [brandModes, form.brandModeId]
  );
  const brand = useMemo(
    () => (rawBrand ? brandModeWithSubCompany(rawBrand, form.subCompany) : rawBrand),
    [rawBrand, form.subCompany]
  );
  const brandPrimary = brand?.tokens?.primary || PALETTE.ink;
  const brandAccent = brand?.tokens?.accent || PALETTE.blue;

  // Brand-driven archetype filter
  const preferredIds = brand?.contentScope?.preferredArchetypes ?? [];
  const filteredArchetypes = useMemo(() => {
    if (showAllArchetypes || preferredIds.length === 0) return narrativeArchetypes;
    const filtered = narrativeArchetypes.filter((a) => preferredIds.includes(a.id));
    return filtered.length > 0 ? filtered : narrativeArchetypes;
  }, [narrativeArchetypes, preferredIds, showAllArchetypes]);

  // Auto-swap archetype if current one falls outside brand's preferred set (and we're filtering)
  const currentInFilter = filteredArchetypes.some((a) => a.id === form.archetypeId);
  const effectiveArchetypeId = currentInFilter ? form.archetypeId : filteredArchetypes[0]?.id ?? form.archetypeId;

  const industrySuggestions = brand?.contentScope?.industries ?? [];
  const preferredVariantIds = brand?.contentScope?.preferredVariantIds ?? [];

  const selectBrand = (id: string) => {
    setForm((prev) => {
      const nextSubCompany = id === "bm-subcompany" ? prev.subCompany || TRANSPERFECT_SUBCOMPANIES[0] || "" : "";
      return { ...prev, brandModeId: id, subCompany: nextSubCompany };
    });
    setShowAllArchetypes(false);
  };

  return (
    <AppShell>
      <div
        className="min-h-full px-3 py-6 font-['Epilogue'] sm:px-6 sm:py-12"
        style={{ backgroundColor: PALETTE.page, color: PALETTE.ink }}
      >
        <div className="mx-auto w-full max-w-[1040px]">
          <div
            className="overflow-hidden rounded-2xl border shadow-sm"
            style={{ backgroundColor: PALETTE.surface, borderColor: PALETTE.hairline }}
          >
            {/* Header */}
            <div
              className="border-b px-5 pb-6 pt-7 sm:px-10 sm:pb-8 sm:pt-10"
              style={{ borderColor: PALETTE.page }}
            >
              <div
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ color: brandPrimary }}
              >
                <span className="inline-block h-[2px] w-4" style={{ backgroundColor: brandPrimary }} />
                Step 01 · Briefing engine
              </div>
              <h1 className="mt-3 font-['Urbanist'] text-2xl font-extrabold uppercase tracking-tighter text-[#0F1B3D] sm:text-3xl">
                New Pitch Deck Brief
              </h1>
              <p className="mt-2 text-[#1E3A5F]/80">
                Configure the AI narrative engine for your next presentation.
              </p>
              <div className="mt-5 rounded-lg border border-dashed border-[#D1DBE5] bg-[#F8FAFC] px-4 py-3 text-xs">
                <span className="text-[#1E3A5F]/70">Already have a deck? </span>
                <Link to="/decks/import" className="font-semibold text-[#3B6FA0] hover:text-[#0F1B3D] hover:underline">
                  Import an existing PowerPoint →
                </Link>
              </div>
            </div>

            <form className="space-y-10 px-5 py-7 sm:p-10" onSubmit={(e) => e.preventDefault()}>
              {/* SECTION 01: Brand Mode — drives everything below */}
              <section className="space-y-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                  <label className={labelCls}>01 · Brand Mode</label>
                  <span className="max-w-[11rem] text-right text-[10px] font-medium uppercase tracking-widest text-[#1E3A5F]/50 sm:max-w-none">
                    drives archetype + variant filters
                  </span>
                </div>

                {/* Selected brand banner */}
                {brand && (
                  <div
                    className="grid grid-cols-1 gap-4 rounded-xl border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    style={{
                      borderColor: `${brandPrimary}33`,
                      background: `linear-gradient(90deg, ${brandPrimary}0a, ${brandAccent}0a)`,
                    }}
                  >
                    <div className="min-w-0">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                        <div className="min-w-0 max-w-full">
                          <BrandLockup brand={brand} color={brandPrimary} size="sm" clientName={form.prospect} subCompany={form.subCompany} />
                        </div>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest"
                          style={{ backgroundColor: brandPrimary, color: "#fff" }}
                        >
                          {brand.role ?? "brand"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-[#1E3A5F]/75">{brand.description}</p>
                    </div>
                    <div className="hidden shrink-0 gap-3 text-right text-[10px] font-mono uppercase tracking-wider text-[#1E3A5F]/60 sm:flex">
                      <StatPill label="industries" value={brand.contentScope?.industries.length ?? 0} />
                      <StatPill label="archetypes" value={preferredIds.length} />
                      <StatPill label="variants" value={preferredVariantIds.length} />
                    </div>
                  </div>
                )}

                {/* Brand grid */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {brandModes.map((b) => {
                    const active = form.brandModeId === b.id;
                    const c = b.tokens?.primary || PALETTE.blue;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => selectBrand(b.id)}
                        aria-pressed={active}
                         className="group grid min-h-[148px] cursor-pointer grid-rows-[auto_1fr_auto] gap-3 rounded-xl border-2 p-4 text-left transition-all hover:-translate-y-0.5"
                        style={{
                          borderColor: active ? c : PALETTE.hairline,
                          backgroundColor: active ? `${c}0d` : PALETTE.surface,
                          boxShadow: active ? `0 0 0 3px ${c}22` : undefined,
                        }}
                      >
                        <div className="flex min-w-0 items-center justify-end">
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest"
                            style={{
                              backgroundColor: active ? c : PALETTE.page,
                              color: active ? "#fff" : PALETTE.inkSoft,
                            }}
                          >
                            {b.role ?? "brand"}
                          </span>
                        </div>
                        <div className="flex min-w-0 max-w-full items-center">
                          <BrandLockup brand={b} color={c} size="2xs" clientName={form.prospect} />
                        </div>
                        <p className="text-[11px] leading-snug text-[#1E3A5F]/75">{b.description}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-company selector (only for the generic Subcompany mode) */}
                {form.brandModeId === "bm-subcompany" && (
                  <div className="space-y-2">
                    <label className={labelCls}>Select TransPerfect sub-company</label>
                    <select
                      className={inputCls}
                      value={form.subCompany}
                      onChange={(e) => setForm({ ...form, subCompany: e.target.value })}
                    >
                      <option value="" disabled>
                        Choose a division
                      </option>
                      {TRANSPERFECT_SUBCOMPANIES.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[#1E3A5F]/60">
                      The assembler, palette, and lockup will resolve to this TransPerfect entity.
                    </p>
                  </div>
                )}

                {brand && <BrandRelevancePanel brand={brand} />}
              </section>

              {/* SECTION 02: Core Intelligence */}
              <section className="space-y-6">
                <label className={labelCls}>02 · Prospect</label>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Field label="Prospect Name">
                    <input
                      className={inputCls}
                      placeholder="e.g. Acme Corp"
                      value={form.prospect}
                      onChange={(e) => setForm({ ...form, prospect: e.target.value })}
                    />
                  </Field>
                  <Field label="Industry">
                    <input
                      className={inputCls}
                      placeholder="e.g. Fintech"
                      value={form.industry}
                      onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    />
                    {industrySuggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#1E3A5F]/50">
                          Suggested for {brand?.name}:
                        </span>
                        {industrySuggestions.slice(0, 5).map((ind: string) => {
                          const selected = form.industry.toLowerCase() === ind.toLowerCase();
                          return (
                            <button
                              key={ind}
                              type="button"
                              onClick={() => setForm({ ...form, industry: ind })}
                              className="rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors"
                              style={{
                                borderColor: selected ? brandPrimary : PALETTE.hairline,
                                backgroundColor: selected ? brandPrimary : "transparent",
                                color: selected ? "#fff" : PALETTE.inkSoft,
                              }}
                            >
                              {ind}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </Field>
                </div>

                <Field label="Target Audience">
                  <input
                    className={inputCls}
                    placeholder="e.g. C-Suite Executives, CTOs"
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                  />
                </Field>

                <Field label="Meeting Objective">
                  <textarea
                    rows={2}
                    className={inputCls + " resize-none"}
                    placeholder="What is the primary goal of this deck?"
                    value={form.meetingObjective}
                    onChange={(e) => setForm({ ...form, meetingObjective: e.target.value })}
                  />
                </Field>
              </section>

              {/* SECTION 03: Narrative — filtered by brand */}
              <section className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <label className={labelCls}>03 · Narrative</label>
                  {preferredIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllArchetypes((v) => !v)}
                      className="text-[10px] font-bold uppercase tracking-widest text-[#3B6FA0] hover:text-[#0F1B3D]"
                    >
                      {showAllArchetypes ? "← show brand-preferred only" : "show all archetypes →"}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-5 md:items-end">
                  <div className="md:col-span-3">
                    <Field label={preferredIds.length > 0 && !showAllArchetypes ? `Narrative (${filteredArchetypes.length} suited to ${brand?.name})` : "Narrative Archetype"}>
                      <select
                        className={inputCls + " appearance-none"}
                        value={effectiveArchetypeId}
                        onChange={(e) => setForm({ ...form, archetypeId: e.target.value })}
                      >
                        {filteredArchetypes.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="space-y-3 md:col-span-2 md:pb-1">
                    <div className="flex items-center justify-between">
                      <span className={labelCls}>Length</span>
                      <span className="text-xs font-bold" style={{ color: brandPrimary }}>
                        {form.lengthTarget} slides
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={12}
                      value={form.lengthTarget}
                      onChange={(e) => setForm({ ...form, lengthTarget: Number(e.target.value) })}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#E8EDF3]"
                      style={{ accentColor: brandPrimary }}
                    />
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight text-[#1E3A5F]/50">
                      <span>Brief</span>
                      <span>Standard</span>
                      <span>Full</span>
                    </div>
                  </div>
                </div>

                {preferredVariantIds.length > 0 && (
                  <div className="rounded-lg border p-4" style={{ borderColor: PALETTE.hairline, backgroundColor: PALETTE.field }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#1E3A5F]/60">
                        Preferred slide variants for {brand?.name}
                      </span>
                      <span className="font-mono text-[10px] text-[#1E3A5F]/40">
                        {preferredVariantIds.length} pinned
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {preferredVariantIds.map((v: string) => (
                        <span
                          key={v}
                          className="rounded-md border px-2 py-0.5 font-mono text-[10px]"
                          style={{
                            borderColor: `${brandPrimary}33`,
                            backgroundColor: `${brandPrimary}0d`,
                            color: brandPrimary,
                          }}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* SECTION 04: Client Context */}
              <section className="space-y-4">
                <label className={labelCls}>04 · Context</label>
                <Field label="Known Client Facts">
                  <textarea
                    rows={4}
                    className={inputCls + " resize-none"}
                    placeholder="List key pain points, previous interactions, or specific requirements…"
                    value={form.clientFacts}
                    onChange={(e) => setForm({ ...form, clientFacts: e.target.value })}
                  />
                </Field>
              </section>

              {/* SECTION 05: Palette Lab (advanced A/B during creation) */}
              <section className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <label className={labelCls}>05 · Palette Lab</label>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#1E3A5F]/50">
                    optional · attach an A/B test or pick an AI palette
                  </span>
                </div>
                {brand && (
                  <PaletteLab
                    brandId={brand.id}
                    brandName={brand.name}
                    brandRole={brand.role}
                    seedPalette={{
                      primary: brand.tokens?.primary ?? PALETTE.blue,
                      accent: brand.tokens?.accent ?? PALETTE.blue,
                      ink: brand.tokens?.ink ?? PALETTE.ink,
                      surface: brand.tokens?.surface ?? PALETTE.surface,
                    }}
                    audience={form.audience}
                    objective={form.meetingObjective}
                    accent={brandPrimary}
                    onChange={setPaletteSel}
                  />
                )}
              </section>


              {/* SECTION 06: AI Narrative Strategist (optional) */}
              <StrategistSection
                brandName={brand?.name ?? "brand"}
                brandPrimary={brandPrimary}
                status={strategyStatus}
                error={strategyError}
                setupNeeded={strategySetupNeeded}
                strategy={strategy}
                onPlan={async () => {
                  setStrategyStatus("planning");
                  setStrategyError(null);
                  setStrategySetupNeeded(false);
                  try {
                    const res = await planStrategyFn({
                      data: {
                        brandModeId: form.brandModeId,
                        subCompany: form.subCompany || undefined,
                        brief: {
                          prospect: form.prospect,
                          industry: form.industry,
                          audience: form.audience,
                          meetingObjective: form.meetingObjective,
                          clientFacts: form.clientFacts,
                          archetypeId: effectiveArchetypeId,
                          lengthTarget: form.lengthTarget,
                        },
                      },
                    });
                    if (!res.ok) {
                      setStrategyError(res.error);
                      setStrategySetupNeeded(!!res.setup);
                      setStrategyStatus("error");
                      return;
                    }
                    setStrategy(res.strategy);
                    setStrategyStatus("ready");
                  } catch (e) {
                    setStrategyError((e as Error).message);
                    setStrategyStatus("error");
                  }
                }}
                onRemoveSection={(idx: number) =>
                  setStrategy((s) =>
                    s ? { ...s, recommendedSections: s.recommendedSections.filter((_, i) => i !== idx) } : s,
                  )
                }
                onMoveSection={(idx: number, dir: 1 | -1) =>
                  setStrategy((s) => {
                    if (!s) return s;
                    const next = [...s.recommendedSections];
                    const target = idx + dir;
                    if (target < 0 || target >= next.length) return s;
                    [next[idx], next[target]] = [next[target], next[idx]];
                    return { ...s, recommendedSections: next };
                  })
                }
                onDiscard={() => {
                  setStrategy(null);
                  setStrategyStatus("idle");
                  setStrategyError(null);
                }}
              />

              {(kbSelected.length > 0 || kbSynthesis) && (
                <KnowledgeUsedPanel
                  selected={kbSelected}
                  synthesis={kbSynthesis}
                  synthesized={kbSynthesized}
                  open={showKbPanel}
                  onToggle={() => setShowKbPanel((v) => !v)}
                />
              )}




              <div
                className="flex flex-col-reverse items-stretch justify-between gap-4 border-t pt-6 md:flex-row md:items-center"
                style={{ borderColor: PALETTE.hairline }}
              >
                <div className="flex items-center gap-3 text-xs text-[#1E3A5F]/70">
                  {brand && (
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: brandPrimary }}
                      />
                      Assembling under <strong className="font-semibold text-[#0F1B3D]">{brand.name}</strong>
                    </span>
                  )}
                  {aiStatus !== "idle" && (
                    <span>
                      {aiStatus === "assembling" && "· Assembling from atlas…"}
                      {aiStatus === "knowledge" && "· Pulling Oracle + KB context…"}
                      {aiStatus === "personalizing" && `· Personalizing with AI${kbUsedCount ? ` (+${kbUsedCount} KB refs)` : ""}…`}
                      {aiStatus === "error" && `· AI fallback: ${aiError ?? "unknown error"}`}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-lg border-2 px-6 py-3 font-['Urbanist'] text-sm font-bold tracking-tight text-[#0F1B3D] transition-all hover:bg-[#F8FAFC] disabled:opacity-50"
                    style={{ borderColor: PALETTE.ink }}
                    onClick={() => {
                      const submission = {
                        ...form,
                        archetypeId: effectiveArchetypeId,
                        abExperimentId: paletteSel.experimentId,
                        abVariantId: paletteSel.variantId,
                        abPaletteOverride: paletteSel.paletteOverride,
                      };
                      const { deckId } = create(submission, strategy ? { strategy } : undefined);
                      navigate({ to: "/decks/$deckId", params: { deckId } });
                    }}
                  >
                    Assemble no AI
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-lg px-8 py-3 font-['Urbanist'] text-sm font-bold tracking-tight text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{ backgroundColor: brandPrimary }}
                    onClick={async () => {
                      setAiError(null);
                      setAiStatus("assembling");
                      const brandForCall = byId(brandModes, form.brandModeId);
                      const scope = brandForCall?.contentScope;

                      // If an A/B experiment is attached, assign a variant now
                      // (server may return a different variant based on weights).
                      let effectiveSel = paletteSel;
                      if (paletteSel.experimentId) {
                        try {
                          const sessionId = (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : `s-${Date.now()}`;
                          const res = await assignVariantFn({ data: { experimentId: paletteSel.experimentId, sessionId } });
                          // Log initial view for the assigned variant.
                          void logAbEventFn({ data: { experimentId: paletteSel.experimentId, variantId: res.variantId, sessionId, eventType: "view", value: null } });
                          if (res.variantId !== paletteSel.variantId) {
                            effectiveSel = { ...paletteSel, variantId: res.variantId };
                          }
                        } catch { /* non-fatal: fall through with local selection */ }
                      }

                      const submission = {
                        ...form,
                        archetypeId: effectiveArchetypeId,
                        abExperimentId: effectiveSel.experimentId,
                        abVariantId: effectiveSel.variantId,
                        abPaletteOverride: effectiveSel.paletteOverride,
                      };
                      const { deckId } = create(submission, strategy ? { strategy } : undefined);
                      const deck = useDeckStore.getState().decks[deckId] ?? decks[deckId];
                      if (!deck) {
                        navigate({ to: "/decks/$deckId", params: { deckId } });
                        return;
                      }

                      // Pull Oracle + KB snippets relevant to this brief.
                      // Try Deep-RAG synthesis first; on any failure fall
                      // back silently to the raw retrieval path.
                      setAiStatus("knowledge");
                      let knowledgeSnippets: Array<{ source: "oracle" | "kb" | "asset" | "brand-intel" | "synthesis"; title: string; snippet: string; tags: string[]; id: string }> = [];
                      let synthesisText: string | null = null;
                      let synthesized = false;
                      const kbTagsBundle = [
                        ...(scope?.industries ?? []),
                        ...(scope?.serviceLines ?? []),
                        ...(scope?.caseStudyTags ?? []),
                      ];
                      try {
                        const synth = await synthesizeKnowledge({
                          data: {
                            industry: submission.industry,
                            audience: submission.audience,
                            meetingObjective: submission.meetingObjective,
                            clientFacts: submission.clientFacts,
                            brandName: brandForCall?.name ?? null,
                            divisionId: brandForCall?.id ?? null,
                            brandTags: kbTagsBundle,
                            limit: 6,
                          },
                        });
                        if (synth.ok) {
                          synthesized = synth.synthesized;
                          synthesisText = synth.synthesis ?? null;
                          knowledgeSnippets = synth.selected.map((k) => ({
                            id: k.id,
                            source: k.source as "oracle" | "kb" | "asset" | "brand-intel",
                            title: k.title,
                            snippet: k.snippet,
                            tags: k.tags,
                          }));
                          setKbSelected(synth.selected);
                          setKbSynthesis(synthesisText);
                          setKbSynthesized(synthesized);
                          setShowKbPanel(true);
                        }
                      } catch { /* fall through to raw retrieval */ }

                      if (!knowledgeSnippets.length) {
                        try {
                          const kbRes = await retrieveKnowledge({
                            data: {
                              industry: submission.industry,
                              audience: submission.audience,
                              meetingObjective: submission.meetingObjective,
                              clientFacts: submission.clientFacts,
                              brandName: brandForCall?.name ?? null,
                              divisionId: brandForCall?.id ?? null,
                              brandTags: kbTagsBundle,
                              limit: 6,
                            },
                          });
                          knowledgeSnippets = kbRes as typeof knowledgeSnippets;
                          setKbSelected(
                            knowledgeSnippets.map((k) => ({
                              id: k.id,
                              source: k.source,
                              title: k.title,
                              tags: k.tags,
                              snippet: k.snippet,
                            })),
                          );
                        } catch { /* non-fatal */ }
                      }

                      setKbUsedCount(knowledgeSnippets.length);
                      setDeckContext(deckId, {
                        knowledgeSourceIds: knowledgeSnippets.map((k) => k.id),
                        knowledgeSources: knowledgeSnippets.map((k) => ({
                          id: k.id,
                          source: k.source,
                          title: k.title,
                          tags: k.tags,
                          snippet: k.snippet,
                          extractedFact: k.snippet,
                        })),
                        knowledgeSynthesis: synthesisText,
                      });

                      // Personalizer receives the curated snippets plus, when
                      // available, a special "synthesis" pseudo-snippet.
                      const personalizerKb: Array<{ source: "oracle" | "kb" | "asset" | "brand-intel"; title: string; snippet: string; tags: string[] }> = knowledgeSnippets
                        .filter((k) => k.source !== "synthesis")
                        .map((k) => ({ source: k.source as "oracle" | "kb" | "asset" | "brand-intel", title: k.title, snippet: k.snippet, tags: k.tags }));
                      if (synthesisText) {
                        personalizerKb.unshift({
                          source: "kb",
                          title: "Brief-specific knowledge synthesis",
                          snippet: synthesisText,
                          tags: ["synthesis"],
                        });
                      }


                      setAiStatus("personalizing");
                      try {
                        const result = await personalize({
                          data: {
                            brief: {
                              prospect: submission.prospect,
                              industry: submission.industry,
                              audience: submission.audience,
                              meetingObjective: submission.meetingObjective,
                              clientFacts: submission.clientFacts,
                              archetypeName: byId(NARRATIVE_ARCHETYPES, submission.archetypeId)?.name ?? "Deck",
                              brandScope: scope
                                ? {
                                    brandName: brandForCall?.name,
                                    role: brandForCall?.role,
                                    industries: scope.industries,
                                    serviceLines: scope.serviceLines,
                                    caseStudyTags: scope.caseStudyTags,
                                  }
                                : undefined,
                            },
                            slides: deck.slides.map((s) => ({
                              id: s.id,
                              variantId: s.variantId,
                              sectionName: byId(SECTION_FRAMEWORKS, s.sectionId)?.name ?? "",
                              content: s.content as Record<string, unknown>,
                            })),
                            knowledgeSnippets: personalizerKb.slice(0, 12),
                          },
                        });

                        if (result.error) {
                          setAiError(result.error);
                          setAiStatus("error");
                        } else {
                          applyAi(deckId, result.slides as Array<{ id: string; content: Record<string, unknown> }>);
                        }
                      } catch (e) {
                        setAiError((e as Error).message);
                        setAiStatus("error");
                      }
                      navigate({ to: "/decks/$deckId", params: { deckId }, hash: "brand-review" });
                    }}
                  >
                    Assemble with {brand?.name ?? "brand"} →
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-end leading-none">
      <span className="font-['Urbanist'] text-base font-extrabold text-[#0F1B3D]">{value}</span>
      <span className="mt-0.5 text-[9px] uppercase tracking-widest text-[#1E3A5F]/60">{label}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

function BrandRelevancePanel({ brand }: { brand: BrandMode }) {
  const scope = brand.contentScope;
  if (!scope) return null;
  const primary = brand.tokens?.primary || PALETTE.blue;
  const chip = (text: string, key: string) => (
    <span
      key={key}
      className="rounded-full border px-3 py-1 text-xs font-medium"
      style={{
        backgroundColor: `${primary}0d`,
        color: PALETTE.inkSoft,
        borderColor: `${primary}33`,
      }}
    >
      {text}
    </span>
  );
  const Row = ({ label, items }: { label: string; items: string[] }) =>
    items.length === 0 ? null : (
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1E3A5F]/60">{label}</span>
        <div className="flex flex-wrap gap-1.5">{items.map((v, i) => chip(v, `${label}-${i}`))}</div>
      </div>
    );
  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: PALETTE.hairline, backgroundColor: PALETTE.field }}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className={labelCls}>Relevant to {brand.name}</span>
        <span className="font-mono text-[10px] text-[#1E3A5F]/50">auto-filtered</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Row label="Industries" items={scope.industries} />
        <Row label="Service lines" items={scope.serviceLines} />
        <Row label="Case study tags" items={scope.caseStudyTags} />
        <Row label="Preferred narratives" items={scope.preferredArchetypes} />
      </div>
      {scope.restrictedFamilyIds && scope.restrictedFamilyIds.length > 0 && (
        <div className="mt-3 text-xs text-[#1E3A5F]/60">
          Off-limits for this brand: {scope.restrictedFamilyIds.join(", ")}
        </div>
      )}
    </div>
  );
}

function StrategistSection({
  brandName,
  brandPrimary,
  status,
  error,
  setupNeeded,
  strategy,
  onPlan,
  onRemoveSection,
  onMoveSection,
  onDiscard,
}: {
  brandName: string;
  brandPrimary: string;
  status: "idle" | "planning" | "ready" | "error";
  error: string | null;
  setupNeeded: boolean;
  strategy: DeckStrategy | null;
  onPlan: () => void;
  onRemoveSection: (idx: number) => void;
  onMoveSection: (idx: number, dir: 1 | -1) => void;
  onDiscard: () => void;
}) {
  const busy = status === "planning";
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <label className={labelCls}>06 · AI Narrative Strategist · optional</label>
        <span className="max-w-[13rem] text-right text-[10px] font-medium uppercase tracking-widest text-[#1E3A5F]/50 sm:max-w-none">
          plans arc + sections before generation
        </span>
      </div>

      {!strategy && (
        <div
          className="flex flex-col gap-3 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: PALETTE.hairline, backgroundColor: PALETTE.field }}
        >
          <div className="text-sm text-[#1E3A5F]">
            Let Claude architect the deck: opening hook, section order, key messages, and closing ask — grounded in {brandName}'s brand guide and BrandHub intel.
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onPlan}
            className="rounded-lg px-5 py-2.5 font-['Urbanist'] text-sm font-bold tracking-tight text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: brandPrimary }}
          >
            {busy ? "Planning…" : "Plan with AI strategist"}
          </button>
        </div>
      )}

      {status === "error" && error && (
        <div className="rounded-xl border border-rose-300/50 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {setupNeeded
            ? error
            : `Strategist failed: ${error}. `}
          {!setupNeeded && (
            <button type="button" onClick={onPlan} className="ml-1 font-semibold underline">
              Retry
            </button>
          )}
        </div>
      )}

      {strategy && (
        <div
          className="space-y-4 rounded-xl border p-5"
          style={{ borderColor: `${brandPrimary}33`, backgroundColor: PALETTE.field }}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <MicroCard label="Opening hook" body={strategy.openingHook} />
            <MicroCard label="Narrative arc" body={strategy.narrativeArc} />
            <MicroCard label="Closing ask" body={strategy.closingAsk} />
          </div>

          {strategy.risksToAvoid.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#1E3A5F]/60">
                Risks to avoid
              </div>
              <ul className="ml-4 list-disc space-y-0.5 text-xs text-[#1E3A5F]/85">
                {strategy.risksToAvoid.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1E3A5F]/60">
                Recommended sections · {strategy.recommendedSections.length}
              </span>
              <button
                type="button"
                onClick={onDiscard}
                className="text-[10px] font-semibold uppercase tracking-widest text-[#1E3A5F]/60 hover:text-rose-600"
              >
                Discard plan
              </button>
            </div>
            <ol className="space-y-2">
              {strategy.recommendedSections.map((sec: StrategySection, i) => {
                const sf = byId(SECTION_FRAMEWORKS, sec.sectionId);
                return (
                  <li
                    key={`${sec.sectionId}-${i}`}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border bg-white px-3 py-2.5"
                    style={{ borderColor: PALETTE.hairline }}
                  >
                    <span
                      className="mt-0.5 rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white"
                      style={{ backgroundColor: brandPrimary }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <div className="font-['Urbanist'] text-sm font-bold text-[#0F1B3D]">
                        {sf?.name ?? sec.sectionId}
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-[#0F1B3D]/80">
                        Key message · {sec.keyMessage}
                      </div>
                      <div className="mt-1 text-[11px] italic text-[#1E3A5F]/70">
                        {sec.rationale}
                      </div>
                      {sec.suggestedVariantId && (
                        <div className="mt-1 font-mono text-[10px] text-[#1E3A5F]/50">
                          variant {sec.suggestedVariantId}
                          {sec.suggestedLayoutId ? ` · layout ${sec.suggestedLayoutId}` : ""}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => onMoveSection(i, -1)}
                        className="rounded border border-[#D1DBE5] px-2 py-0.5 text-[10px] hover:bg-[#F8FAFC]"
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveSection(i, 1)}
                        className="rounded border border-[#D1DBE5] px-2 py-0.5 text-[10px] hover:bg-[#F8FAFC]"
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveSection(i)}
                        className="rounded border border-rose-200 px-2 py-0.5 text-[10px] text-rose-600 hover:bg-rose-50"
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#1E3A5F]/70">
            <span>Assemble buttons below will use this plan.</span>
            <button
              type="button"
              onClick={onPlan}
              disabled={busy}
              className="font-semibold uppercase tracking-widest text-[#3B6FA0] hover:text-[#0F1B3D] disabled:opacity-50"
            >
              {busy ? "Re-planning…" : "Re-plan"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function MicroCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-lg border border-[#D1DBE5] bg-white p-3">
      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1E3A5F]/60">
        {label}
      </div>
      <div className="mt-1 text-xs leading-relaxed text-[#0F1B3D]">{body}</div>
    </div>
  );
}


function KnowledgeUsedPanel({
  selected,
  synthesis,
  synthesized,
  open,
  onToggle,
}: {
  selected: SynthesizedSnippet[];
  synthesis: string | null;
  synthesized: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="rounded-xl border bg-white p-5"
      style={{ borderColor: "var(--brief-hairline, #D1DBE5)" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[#0F1B3D] px-2.5 py-1 font-['Urbanist'] text-[10px] font-bold uppercase tracking-widest text-white">
            {synthesized ? "Deep RAG" : "Retrieved"}
          </span>
          <span className="font-['Urbanist'] text-sm font-bold uppercase tracking-[0.14em] text-[#0F1B3D]">
            Knowledge used ({selected.length})
          </span>
        </div>
        <span className="text-xs text-[#1E3A5F]/70">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-4">
          {synthesis && (
            <div className="rounded-lg border border-[#0F1B3D]/10 bg-[#F8FAFC] p-4">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#3B6FA0]">
                Synthesis
              </div>
              <p className="text-sm leading-relaxed text-[#0F1B3D]">{synthesis}</p>
            </div>
          )}
          <ul className="space-y-3">
            {selected.map((k) => (
              <li
                key={k.id}
                className="rounded-lg border border-[#D1DBE5] bg-white p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#E8EDF3] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1E3A5F]">
                      {k.source}
                    </span>
                    <span className="font-['Urbanist'] text-xs font-bold text-[#0F1B3D]">
                      {k.title}
                    </span>
                  </div>
                  {typeof k.relevance === "number" && (
                    <span
                      className="text-xs tracking-widest text-[#3B6FA0]"
                      title={`Relevance ${k.relevance}/5`}
                    >
                      {"★".repeat(k.relevance)}
                      <span className="text-[#D1DBE5]">
                        {"★".repeat(Math.max(0, 5 - k.relevance))}
                      </span>
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#1E3A5F]">
                  {k.extractedFact || k.snippet}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

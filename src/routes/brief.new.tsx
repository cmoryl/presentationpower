import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useDeckStore } from "@/lib/deck-store";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { personalizeSlides } from "@/lib/personalize.functions";
import { retrieveKnowledgeForBrief, abAssign, abLogEvent } from "@/lib/admin.functions";
import { synthesizeKnowledgeForBrief, type SynthesizedSnippet } from "@/lib/ai-rag.functions";
import { planDeckStrategy, type DeckStrategy, type StrategySection } from "@/lib/ai-strategist.functions";
import { createPrintAssetWithBrief } from "@/lib/print-assets.functions";
import { EVENT_PLAYBOOKS } from "@/lib/event-playbooks";
import { SOCIAL_PLAYBOOKS } from "@/lib/social-playbooks";
import { useSignedIn } from "@/components/CloudDeckControls";

import { byId, SECTION_FRAMEWORKS, NARRATIVE_ARCHETYPES, type BrandMode } from "@/lib/taxonomy";
import { TRANSPERFECT_SUBCOMPANIES } from "@/lib/brand-guides";
import { brandModeWithSubCompany, getSubCompanyProfile } from "@/lib/brand-profiles";
import { BrandLockup } from "@/components/BrandLockup";
import { PaletteLab, type PaletteSelection } from "@/components/PaletteLab";
import { ChapterMap } from "@/components/ChapterMap";

export const Route = createFileRoute("/brief/new")({
  head: () => ({
    meta: [
      { title: "New brief · TransPerfect Modular" },
      { name: "description", content: "Guided brief that resolves into an assembled deck." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: BriefWizard,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-red-600">Brief failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

// TransPerfect brand palette — matches the rest of the build.
// Ink = Blue 800, Blue = Blue 500, Accent = Aqua.
const PALETTE = {
  page: "var(--background)",
  surface: "var(--brief-surface, #FFFFFF)",
  ink: "var(--brief-ink, #03002C)",
  inkSoft: "var(--brief-ink-soft, #1E2749)",
  blue: "var(--brief-blue, #003FC7)",
  accent: "var(--brief-accent, #A1FBF9)",
  hairline: "var(--brief-hairline, #E4E9F2)",
  field: "var(--brief-field, #F7F9FC)",
} as const;


// Minimal typographic system — Geist Sans throughout (already loaded globally),
// tight tracking, no all-caps pills. Small labels use monospace numerals for
// the section index only.
const labelCls =
  "text-[11px] font-semibold uppercase tracking-[0.18em] text-[#03002C]";
const inputCls =
  "w-full rounded-md border border-[#E4E9F2] bg-white px-4 py-3 text-sm text-[#03002C] placeholder:text-[#03002C]/35 focus:border-[#003FC7] focus:outline-none focus:ring-2 focus:ring-[#003FC7]/15 transition-all";

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
  const [kbFallbackNote, setKbFallbackNote] = useState<string | null>(null);
  const [kbDivisionScoped, setKbDivisionScoped] = useState<boolean | undefined>(undefined);
  const [kbSetup, setKbSetup] = useState(false);
  const [showKbPanel, setShowKbPanel] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

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
    brandModeId: brandModes.find((b) => b.id === "bm-enterprise")?.id ?? brandModes[0]?.id ?? "bm-enterprise",
    subCompany: "",
    archetypeId: narrativeArchetypes.find((a) => a.id === "arch-problem-solution")?.id ?? narrativeArchetypes[0]?.id ?? "arch-problem-solution",
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

  // Exclude entries that already have their own dedicated brand-mode card —
  // picking them here would route to the generic sub-company path instead of
  // their real division scope. Keep long-tail entities without a dedicated card.
  const SUBCOMPANY_EXCLUDES = new Set<string>([
    "Life Sciences",
    "Legal",
    "Games",
    "Media",
    "TransPerfect Digital",
    "Dataforce",
    "Trial Interactive",
  ]);
  const subCompanyOptions = useMemo(
    () => TRANSPERFECT_SUBCOMPANIES.filter((n) => !SUBCOMPANY_EXCLUDES.has(n)),
    []
  );

  const selectBrand = (id: string) => {
    setForm((prev) => {
      const nextSubCompany = id === "bm-subcompany" ? prev.subCompany || subCompanyOptions[0] || "" : "";
      return { ...prev, brandModeId: id, subCompany: nextSubCompany };
    });
    setShowAllArchetypes(false);
  };

  return (
    <AppShell>
      <div className="font-['Geist']" style={{ color: PALETTE.ink }}>
        {/* HERO — matches homepage command-center language */}
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#03002C] via-[#0B2A4A] to-[#003FC7] p-8 text-white sm:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#A1FBF9]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-[#C2A3FF]/20 blur-3xl" />
          <div className="relative max-w-3xl">
            <div className="text-xs uppercase tracking-[0.35em] text-[#A1FBF9]">Briefing engine</div>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              New pitch deck brief
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/70 sm:text-lg">
              Configure the AI narrative engine. Brief the system and it picks the archetype,
              sections, and approved modules for your next presentation.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link
                to="/decks/import"
                className="rounded-full border border-white/25 bg-white/5 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10"
              >
                Import an existing PowerPoint →
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-8">
          <form className="space-y-10" onSubmit={(e) => e.preventDefault()}>
              {/* SECTION 01: Brand Mode — drives everything below */}
              <section className="space-y-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                  <label className={labelCls}>01 · Brand Mode</label>

                  <span className="max-w-[11rem] text-right text-[10px] font-medium uppercase tracking-widest text-[#1E2749]/50 sm:max-w-none">
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
                          className="shrink-0 rounded-sm px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em]"
                          style={{ backgroundColor: brandPrimary, color: "#fff" }}
                        >
                          {brand.role ?? "brand"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-[#1E2749]/75">{brand.description}</p>
                    </div>
                    <div className="hidden shrink-0 gap-3 text-right text-[10px] font-mono uppercase tracking-wider text-[#1E2749]/60 sm:flex">
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
                    const a = b.tokens?.accent || c;
                    const isEnterprise = b.id === "bm-enterprise";
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => selectBrand(b.id)}
                        aria-pressed={active}
                        className={`group relative grid min-h-[184px] cursor-pointer grid-rows-[auto_1fr_auto] gap-3 overflow-hidden ${isEnterprise ? "rounded-[18px] border" : "rounded-xl border"} p-5 text-left transition-all duration-300 ease-out hover:-translate-y-0.5`}
                        style={{
                          borderColor: active ? c : PALETTE.hairline,
                          borderWidth: isEnterprise ? 1 : active ? 2 : 1,
                          backgroundColor: PALETTE.surface,
                          boxShadow: active
                            ? isEnterprise
                              ? `0 22px 44px -20px ${c}55, 0 0 0 1px ${c}, inset 0 1px 0 rgba(255,255,255,0.9)`
                              : `0 12px 28px -12px ${c}55, 0 0 0 2px ${c}22`
                            : "0 1px 2px rgba(3,0,44,0.03)",
                        }}
                        onMouseEnter={(e) => {
                          if (!active) e.currentTarget.style.boxShadow = `0 14px 30px -16px ${c}66, 0 0 0 1px ${c}22`;
                        }}
                        onMouseLeave={(e) => {
                          if (!active) e.currentTarget.style.boxShadow = "0 1px 2px rgba(3,0,44,0.03)";
                        }}
                      >
                        {/* Ambient background */}
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                          style={
                            isEnterprise
                              ? {
                                  background: `linear-gradient(180deg, ${c}0d 0%, transparent 42%), linear-gradient(135deg, transparent 40%, ${a}12 100%)`,
                                  opacity: active ? 1 : 0.7,
                                }
                              : {
                                  background: `radial-gradient(120% 100% at 0% 0%, ${c}14 0%, transparent 55%), linear-gradient(135deg, ${c}0a 0%, ${a}10 100%)`,
                                  opacity: active ? 1 : 0.55,
                                }
                          }
                        />
                        {/* Enterprise-only: architectural corner brackets + top hairline rule */}
                        {isEnterprise && (
                          <>
                            <span
                              aria-hidden
                              className="pointer-events-none absolute inset-x-5 top-0 h-[2px]"
                              style={{ background: `linear-gradient(90deg, ${c}, ${a})` }}
                            />
                            <span aria-hidden className="pointer-events-none absolute left-3 top-3 h-2 w-2 border-l border-t" style={{ borderColor: `${c}80` }} />
                            <span aria-hidden className="pointer-events-none absolute right-3 top-3 h-2 w-2 border-r border-t" style={{ borderColor: `${c}80` }} />
                            <span aria-hidden className="pointer-events-none absolute left-3 bottom-3 h-2 w-2 border-l border-b" style={{ borderColor: `${c}80` }} />
                            <span aria-hidden className="pointer-events-none absolute right-3 bottom-3 h-2 w-2 border-r border-b" style={{ borderColor: `${c}80` }} />
                          </>
                        )}
                        <div className="relative flex min-w-0 items-center justify-between gap-2">
                          {isEnterprise ? (
                            <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-[#03002C]/55">
                              Master · TransPerfect
                            </span>
                          ) : (
                            <span />
                          )}
                          <span
                            className="shrink-0 rounded-sm px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] transition-colors"
                            style={{
                              backgroundColor: active ? c : `${c}14`,
                              color: active ? "#fff" : c,
                            }}
                          >
                            {b.role ?? "brand"}
                          </span>
                        </div>
                        <div className="relative flex min-w-0 max-w-full items-center">
                          <BrandLockup brand={b} color={c} size={isEnterprise ? "sm" : "xs"} clientName={form.prospect} />
                        </div>
                        <p className="relative text-[11px] leading-snug text-[#1E2749]/80">{b.description}</p>
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
                      {subCompanyOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[#1E2749]/60">
                      The assembler, palette, and lockup will resolve to this TransPerfect entity.
                    </p>
                  </div>
                )}

                {brand && <BrandRelevancePanel brand={brand} />}
              </section>

              {/* REQUIRED: Prospect Name + Meeting Objective */}
              <section className="space-y-6">
                <label className={labelCls}>Prospect</label>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Field label="Prospect Name">
                    <input
                      className={inputCls}
                      placeholder="e.g. Acme Corp"
                      value={form.prospect}
                      onChange={(e) => setForm({ ...form, prospect: e.target.value })}
                    />
                  </Field>
                  <Field label="Meeting Objective">
                    <input
                      className={inputCls}
                      placeholder="What is the primary goal of this deck?"
                      value={form.meetingObjective}
                      onChange={(e) => setForm({ ...form, meetingObjective: e.target.value })}
                    />
                  </Field>
                </div>
              </section>

              {/* OPTIONAL: Everything else, collapsed by default */}
              <div
                className="overflow-hidden rounded-xl border transition-shadow duration-300"
                style={{
                  borderColor: customizeOpen ? `${brandPrimary}44` : PALETTE.hairline,
                  backgroundColor: PALETTE.field,
                  boxShadow: customizeOpen ? `0 10px 30px -18px ${brandPrimary}55` : undefined,
                }}
              >
                <button
                  type="button"
                  onClick={() => setCustomizeOpen((v) => !v)}
                  aria-expanded={customizeOpen}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={labelCls}>Customize</span>
                      <span
                        className="rounded-sm px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em]"
                        style={{ backgroundColor: `${brandPrimary}14`, color: brandPrimary }}
                      >
                        optional
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-[#1E2749]/70">
                      Industry, audience, narrative, palette, AI planning
                    </p>
                  </div>
                  <span
                    className="shrink-0 font-['Geist'] text-[11px] font-bold uppercase tracking-widest transition-transform duration-300"
                    style={{ color: brandPrimary, transform: customizeOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                    aria-hidden
                  >
                    ▾
                  </span>
                </button>

                <div
                  className="grid transition-[grid-template-rows] duration-500 ease-out"
                  style={{ gridTemplateRows: customizeOpen ? "1fr" : "0fr" }}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div
                      className="space-y-10 border-t px-5 py-7 sm:px-8 sm:py-8"
                      style={{ borderColor: PALETTE.hairline, backgroundColor: PALETTE.surface }}
                    >
                      {/* Two-column split at xl: context (left) / narrative (right) */}
                      <div className="grid grid-cols-1 gap-x-10 gap-y-8 xl:grid-cols-2">
                        <div className="space-y-6">
                          <Field label="Industry">
                            <input
                              className={inputCls}
                              placeholder="e.g. Fintech"
                              value={form.industry}
                              onChange={(e) => setForm({ ...form, industry: e.target.value })}
                            />
                            {industrySuggestions.length > 0 && (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#1E2749]/50">
                                  Suggested for {brand?.name}:
                                </span>
                                {industrySuggestions.slice(0, 5).map((ind: string) => {
                                  const selected = form.industry.toLowerCase() === ind.toLowerCase();
                                  return (
                                    <button
                                      key={ind}
                                      type="button"
                                      onClick={() => setForm({ ...form, industry: ind })}
                                      className="rounded-md border px-2.5 py-1 text-[10px] font-medium transition-colors"
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

                          <Field label="Target Audience">
                            <input
                              className={inputCls}
                              placeholder="e.g. C-Suite Executives, CTOs"
                              value={form.audience}
                              onChange={(e) => setForm({ ...form, audience: e.target.value })}
                            />
                          </Field>

                          <Field label="Known Client Facts">
                            <textarea
                              rows={4}
                              className={inputCls + " resize-none"}
                              placeholder="List key pain points, previous interactions, or specific requirements…"
                              value={form.clientFacts}
                              onChange={(e) => setForm({ ...form, clientFacts: e.target.value })}
                            />
                          </Field>
                        </div>

                        {/* Narrative — filtered by brand */}
                        <section className="space-y-4">
                          <div className="flex items-baseline justify-between">
                            <label className={labelCls}>Narrative</label>
                            {preferredIds.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setShowAllArchetypes((v) => !v)}
                                className="text-[10px] font-bold uppercase tracking-widest text-[#003FC7] transition-colors hover:text-[#03002C]"
                              >
                                {showAllArchetypes ? "← show brand-preferred only" : "show all archetypes →"}
                              </button>
                            )}
                          </div>

                          <Field label={preferredIds.length > 0 && !showAllArchetypes ? `Archetype (${filteredArchetypes.length} suited to ${brand?.name})` : "Narrative Archetype"}>
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

                          <div className="space-y-3">
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
                              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#F2F5FA]"
                              style={{ accentColor: brandPrimary }}
                            />
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight text-[#1E2749]/50">
                              <span>Brief</span>
                              <span>Standard</span>
                              <span>Full</span>
                            </div>
                          </div>

                          {preferredVariantIds.length > 0 && (
                            <div className="rounded-lg border p-4" style={{ borderColor: PALETTE.hairline, backgroundColor: PALETTE.field }}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#1E2749]/60">
                                  Preferred slide variants for {brand?.name}
                                </span>
                                <span className="font-mono text-[10px] text-[#1E2749]/40">
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
                      </div>

                      {/* Palette Lab — full width */}
                      <section className="space-y-4">
                        <div className="flex items-baseline justify-between">
                          <label className={labelCls}>Palette Lab</label>
                          <span className="text-[10px] font-medium uppercase tracking-widest text-[#1E2749]/50">
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

                      {/* AI Narrative Strategist — full width */}
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

                      {(kbSelected.length > 0 || kbSynthesis || kbSetup) && (
                        <KnowledgeUsedPanel
                          selected={kbSelected}
                          synthesis={kbSynthesis}
                          synthesized={kbSynthesized}
                          divisionScoped={kbDivisionScoped}
                          fallbackNote={kbFallbackNote}
                          setup={kbSetup}
                          open={showKbPanel}
                          onToggle={() => setShowKbPanel((v) => !v)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>






              <div
                className="flex flex-col-reverse items-stretch justify-between gap-4 border-t pt-6 md:flex-row md:items-center"
                style={{ borderColor: PALETTE.hairline }}
              >
                <div className="flex items-center gap-3 text-xs text-[#1E2749]/70">
                  {brand && (
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-[3px] rounded-sm"
                        style={{ backgroundColor: brandPrimary }}
                      />
                      Assembling under <strong className="font-semibold text-[#03002C]">{brand.name}</strong>
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
                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-lg border-2 bg-white px-6 py-3 font-['Geist'] text-sm font-bold tracking-tight text-[#03002C] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F7F9FC] hover:shadow-sm disabled:opacity-50"
                    style={{ borderColor: PALETTE.hairline }}
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
                    className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg px-9 py-3.5 font-['Geist'] text-[15px] font-bold tracking-tight text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, ${brandPrimary} 0%, ${brandAccent} 100%)`,
                      boxShadow: `0 14px 30px -10px ${brandAccent}80, 0 6px 14px -8px ${brandPrimary}80, inset 0 1px 0 rgba(255,255,255,0.18)`,
                    }}
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
                          setKbFallbackNote(synth.fallbackNote ?? null);
                          setKbDivisionScoped(synth.divisionScoped);
                          setKbSetup(!!synth.setup);
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
                          return; // stay on brief so user sees the error banner
                        }
                        applyAi(deckId, result.slides as Array<{ id: string; content: Record<string, unknown> }>);
                      } catch (e) {
                        setAiError((e as Error).message);
                        setAiStatus("error");
                        return; // stay on brief so user sees the error banner
                      }
                      navigate({ to: "/decks/$deckId", params: { deckId }, hash: "brand-review" });
                    }}
                  >
                    <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="relative -ml-1 opacity-90"><path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2zm7 11l.9 2.6L22 16.5l-2.1.9L19 20l-.9-2.6L16 16.5l2.1-.9L19 13z"/></svg>
                    <span className="relative">Assemble with {brand?.name ?? "brand"}</span>
                    <span aria-hidden className="relative transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                  </button>
                </div>
              </div>
            </form>
        </div>
      </div>
    </AppShell>

  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-end leading-none">
      <span className="font-['Geist'] text-base font-extrabold text-[#03002C]">{value}</span>
      <span className="mt-0.5 text-[9px] uppercase tracking-widest text-[#1E2749]/60">{label}</span>
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
      className="rounded-md border px-2.5 py-1 text-xs font-medium"
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
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1E2749]/60">{label}</span>
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
        <span className="font-mono text-[10px] text-[#1E2749]/50">auto-filtered</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Row label="Industries" items={scope.industries} />
        <Row label="Service lines" items={scope.serviceLines} />
        <Row label="Case study tags" items={scope.caseStudyTags} />
        <Row label="Preferred narratives" items={scope.preferredArchetypes} />
      </div>
      {scope.restrictedFamilyIds && scope.restrictedFamilyIds.length > 0 && (
        <div className="mt-3 text-xs text-[#1E2749]/60">
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
        <span className="max-w-[13rem] text-right text-[10px] font-medium uppercase tracking-widest text-[#1E2749]/50 sm:max-w-none">
          plans arc + sections before generation
        </span>
      </div>

      {!strategy && (
        <div
          className="flex flex-col gap-3 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: PALETTE.hairline, backgroundColor: PALETTE.field }}
        >
          <div className="text-sm text-[#1E2749]">
            Let Claude architect the deck: opening hook, section order, key messages, and closing ask — grounded in {brandName}'s brand guide and BrandHub intel.
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onPlan}
            className="rounded-lg px-5 py-2.5 font-['Geist'] text-sm font-bold tracking-tight text-white transition-all disabled:opacity-50"
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
          <ChapterMap plan={strategy} primaryColor={brandPrimary} />

          <div className="grid gap-3 md:grid-cols-3">
            <MicroCard label="Opening hook" body={strategy.openingHook} />
            <MicroCard label="Narrative arc" body={strategy.narrativeArc} />
            <MicroCard label="Closing ask" body={strategy.closingAsk} />
          </div>

          {strategy.risksToAvoid.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#1E2749]/60">
                Risks to avoid
              </div>
              <ul className="ml-4 list-disc space-y-0.5 text-xs text-[#1E2749]/85">
                {strategy.risksToAvoid.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1E2749]/60">
                Recommended sections · {strategy.recommendedSections.length}
              </span>
              <button
                type="button"
                onClick={onDiscard}
                className="text-[10px] font-semibold uppercase tracking-widest text-[#1E2749]/60 hover:text-rose-600"
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
                      <div className="font-['Geist'] text-sm font-bold text-[#03002C]">
                        {sf?.name ?? sec.sectionId}
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-[#03002C]/80">
                        Key message · {sec.keyMessage}
                      </div>
                      <div className="mt-1 text-[11px] italic text-[#1E2749]/70">
                        {sec.rationale}
                      </div>
                      {sec.suggestedVariantId && (
                        <div className="mt-1 font-mono text-[10px] text-[#1E2749]/50">
                          variant {sec.suggestedVariantId}
                          {sec.suggestedLayoutId ? ` · layout ${sec.suggestedLayoutId}` : ""}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => onMoveSection(i, -1)}
                        className="rounded border border-[#E4E9F2] px-2 py-0.5 text-[10px] hover:bg-[#F7F9FC]"
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveSection(i, 1)}
                        className="rounded border border-[#E4E9F2] px-2 py-0.5 text-[10px] hover:bg-[#F7F9FC]"
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

          <div className="flex items-center justify-between text-[11px] text-[#1E2749]/70">
            <span>Assemble buttons below will use this plan.</span>
            <button
              type="button"
              onClick={onPlan}
              disabled={busy}
              className="font-semibold uppercase tracking-widest text-[#003FC7] hover:text-[#03002C] disabled:opacity-50"
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
    <div className="rounded-lg border border-[#E4E9F2] bg-white p-3">
      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#1E2749]/60">
        {label}
      </div>
      <div className="mt-1 text-xs leading-relaxed text-[#03002C]">{body}</div>
    </div>
  );
}


function KnowledgeUsedPanel({
  selected,
  synthesis,
  synthesized,
  divisionScoped,
  fallbackNote,
  setup,
  open,
  onToggle,
}: {
  selected: SynthesizedSnippet[];
  synthesis: string | null;
  synthesized: boolean;
  divisionScoped?: boolean;
  fallbackNote?: string | null;
  setup?: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const confidence = setup
    ? { label: "Setup needed", tone: "warn" as const }
    : !synthesized
      ? { label: "Unverified", tone: "warn" as const }
      : divisionScoped === false
        ? { label: "Cross-division", tone: "warn" as const }
        : { label: "Deep RAG", tone: "ok" as const };
  return (
    <div
      className="rounded-xl border bg-white p-5"
      style={{ borderColor: "var(--brief-hairline, #E4E9F2)" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span
            className={
              confidence.tone === "ok"
                ? "rounded-sm bg-[#03002C] px-2.5 py-1 font-['Geist'] text-[10px] font-bold uppercase tracking-[0.16em] text-white"
                : "rounded-sm bg-[#B45309] px-2.5 py-1 font-['Geist'] text-[10px] font-bold uppercase tracking-[0.16em] text-white"
            }
          >
            {confidence.label}
          </span>
          <span className="font-['Geist'] text-sm font-bold uppercase tracking-[0.14em] text-[#03002C]">
            Knowledge used ({selected.length})
          </span>
        </div>
        <span className="text-xs text-[#1E2749]/70">{open ? "Hide" : "Show"}</span>
      </button>
      {setup ? (
        <div className="mt-3 rounded-lg border border-[#F59E0B]/60 bg-[#FFF7ED] px-3 py-2 text-xs leading-relaxed text-[#7C2D12]">
          <div className="mb-1 font-['Geist'] text-[10px] font-bold uppercase tracking-widest">AI setup needed</div>
          Add <code className="rounded bg-white/60 px-1 font-mono">ANTHROPIC_API_KEY</code> in Project Settings → Secrets to enable deep synthesis. Falling back to raw retrieval.
        </div>
      ) : fallbackNote && (
        <div className="mt-3 rounded-lg border border-[#F59E0B]/40 bg-[#FFF7ED] px-3 py-2 text-xs leading-relaxed text-[#7C2D12]">
          ⚠︎ {fallbackNote}
        </div>
      )}
      {open && (
        <div className="mt-4 space-y-4">
          {synthesis && (
            <div className="rounded-lg border border-[#03002C]/10 bg-[#F7F9FC] p-4">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#003FC7]">
                Synthesis
              </div>
              <p className="text-sm leading-relaxed text-[#03002C]">{synthesis}</p>
            </div>
          )}
          <ul className="space-y-3">
            {selected.map((k) => (
              <li
                key={k.id}
                className="rounded-lg border border-[#E4E9F2] bg-white p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#F2F5FA] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1E2749]">
                      {k.source}
                    </span>
                    <span className="font-['Geist'] text-xs font-bold text-[#03002C]">
                      {k.title}
                    </span>
                  </div>
                  {typeof k.relevance === "number" && (
                    <span
                      className="text-xs tracking-widest text-[#003FC7]"
                      title={`Relevance ${k.relevance}/5`}
                    >
                      {"★".repeat(k.relevance)}
                      <span className="text-[#E4E9F2]">
                        {"★".repeat(Math.max(0, 5 - k.relevance))}
                      </span>
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#1E2749]">
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

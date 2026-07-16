import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useDeckStore } from "@/lib/deck-store";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { personalizeSlides } from "@/lib/personalize.functions";
import { retrieveKnowledgeForBrief, abAssign, abLogEvent } from "@/lib/admin.functions";
import { byId, SECTION_FRAMEWORKS, NARRATIVE_ARCHETYPES, type BrandMode } from "@/lib/taxonomy";
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
  page: "#E8EDF3",
  surface: "#FFFFFF",
  ink: "#0F1B3D",
  inkSoft: "#1E3A5F",
  blue: "#3B6FA0",
  hairline: "#D1DBE5",
  field: "#F8FAFC",
} as const;

const labelCls =
  "text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1B3D] font-['Urbanist']";
const inputCls =
  "w-full rounded-lg border border-[#D1DBE5] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F1B3D] placeholder:text-[#3B6FA0]/50 focus:border-[#3B6FA0] focus:outline-none focus:ring-2 focus:ring-[#3B6FA0]/25 transition-all";

function BriefWizard() {
  const navigate = useNavigate();
  const create = useDeckStore((s) => s.createBriefAndAssemble);
  const applyAi = useDeckStore((s) => s.applyAiContent);
  const decks = useDeckStore((s) => s.decks);
  const personalize = useServerFn(personalizeSlides);
  const { brandModes, narrativeArchetypes } = useTaxonomy();
  const [aiStatus, setAiStatus] = useState<"idle" | "assembling" | "personalizing" | "error">("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAllArchetypes, setShowAllArchetypes] = useState(false);
  const [form, setForm] = useState({
    prospect: "Acme Global",
    industry: "Life sciences",
    meetingObjective: "Secure pilot in the highest-volume market",
    audience: "VP Marketing + Head of Localization",
    brandModeId: brandModes[0]?.id ?? "bm-enterprise",
    archetypeId: narrativeArchetypes[0]?.id ?? "arch-problem-solution",
    lengthTarget: 9,
    clientFacts: "Recently expanded into 12 new markets. Under regulatory review pressure.",
  });

  const busy = aiStatus === "assembling" || aiStatus === "personalizing";
  const brand = useMemo(
    () => brandModes.find((b) => b.id === form.brandModeId) ?? brandModes[0],
    [brandModes, form.brandModeId]
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
    setForm((prev) => ({ ...prev, brandModeId: id }));
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
                          <BrandLockup brand={brand} color={brandPrimary} size="sm" clientName={form.prospect} />
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
                        {industrySuggestions.slice(0, 5).map((ind) => {
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
                      {preferredVariantIds.map((v) => (
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

              {/* Footer CTAs — themed with brand primary */}
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
                      {aiStatus === "personalizing" && "· Personalizing with AI…"}
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
                      const submission = { ...form, archetypeId: effectiveArchetypeId };
                      const { deckId } = create(submission);
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
                      const submission = { ...form, archetypeId: effectiveArchetypeId };
                      const { deckId } = create(submission);
                      const deck = useDeckStore.getState().decks[deckId] ?? decks[deckId];
                      if (!deck) {
                        navigate({ to: "/decks/$deckId", params: { deckId } });
                        return;
                      }
                      setAiStatus("personalizing");
                      try {
                        const brandForCall = byId(brandModes, submission.brandModeId);
                        const scope = brandForCall?.contentScope;
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
                      navigate({ to: "/decks/$deckId", params: { deckId } });
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

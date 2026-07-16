import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useDeckStore } from "@/lib/deck-store";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { personalizeSlides } from "@/lib/personalize.functions";
import { byId, SECTION_FRAMEWORKS, NARRATIVE_ARCHETYPES, type BrandMode } from "@/lib/taxonomy";
import { BrandLockup } from "@/components/BrandLockup";

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

  return (
    <AppShell>
      <div
        className="min-h-full font-['Epilogue'] py-12 px-6"
        style={{ backgroundColor: PALETTE.page, color: PALETTE.ink }}
      >
        <div className="mx-auto w-full max-w-[820px]">
          <div
            className="overflow-hidden rounded-2xl border shadow-sm"
            style={{ backgroundColor: PALETTE.surface, borderColor: PALETTE.hairline }}
          >
            {/* Header */}
            <div className="border-b px-10 pt-10 pb-8" style={{ borderColor: PALETTE.page }}>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#3B6FA0]">
                <span className="inline-block h-[2px] w-4 bg-[#3B6FA0]" />
                Step 01 · Briefing engine
              </div>
              <h1 className="mt-3 font-['Urbanist'] text-3xl font-extrabold uppercase tracking-tighter text-[#0F1B3D]">
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

            <form
              className="space-y-10 p-10"
              onSubmit={(e) => e.preventDefault()}
            >
              {/* Section: Core Intelligence */}
              <section className="space-y-6">
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

              {/* Section: Brand Mode */}
              <section className="space-y-4">
                <label className={labelCls}>Brand Mode</label>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {brandModes.map((b) => {
                    const active = form.brandModeId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setForm({ ...form, brandModeId: b.id })}
                        aria-pressed={active}
                        className="group flex cursor-pointer flex-col items-start rounded-xl border-2 p-4 text-left transition-all"
                        style={{
                          borderColor: active ? PALETTE.blue : PALETTE.hairline,
                          backgroundColor: active ? `${PALETTE.blue}0d` : PALETTE.surface,
                          boxShadow: active ? `0 0 0 3px ${PALETTE.blue}1f` : undefined,
                        }}
                      >
                        <div className="mb-3 flex w-full items-center justify-between">
                          <BrandLockup brand={b} color={PALETTE.ink} size="sm" clientName={form.prospect} />
                          <span
                            className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest"
                            style={{
                              backgroundColor: active ? PALETTE.blue : PALETTE.page,
                              color: active ? "#fff" : PALETTE.inkSoft,
                            }}
                          >
                            {b.role ?? "brand"}
                          </span>
                        </div>
                        <p className="text-[11px] leading-snug text-[#1E3A5F]/75">{b.description}</p>
                      </button>
                    );
                  })}
                </div>

                <BrandRelevancePanel brand={brandModes.find((b) => b.id === form.brandModeId) ?? brandModes[0]} />
              </section>

              {/* Section: Archetype & Length */}
              <section className="grid grid-cols-1 gap-8 md:grid-cols-5 md:items-end">
                <div className="md:col-span-3">
                  <Field label="Narrative Archetype">
                    <select
                      className={inputCls + " appearance-none"}
                      value={form.archetypeId}
                      onChange={(e) => setForm({ ...form, archetypeId: e.target.value })}
                    >
                      {narrativeArchetypes.map((a) => (
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
                    <span className="text-xs font-bold text-[#3B6FA0]">{form.lengthTarget} slides</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={12}
                    value={form.lengthTarget}
                    onChange={(e) => setForm({ ...form, lengthTarget: Number(e.target.value) })}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#E8EDF3] accent-[#3B6FA0]"
                  />
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight text-[#1E3A5F]/50">
                    <span>Brief</span>
                    <span>Standard</span>
                    <span>Full</span>
                  </div>
                </div>
              </section>

              {/* Section: Client Context */}
              <section className="space-y-2">
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

              {/* Footer CTAs */}
              <div className="flex flex-col-reverse items-stretch justify-between gap-4 border-t pt-6 md:flex-row md:items-center" style={{ borderColor: PALETTE.hairline }}>
                <div className="flex items-center gap-3 text-xs text-[#1E3A5F]/70">
                  {aiStatus !== "idle" && (
                    <span>
                      {aiStatus === "assembling" && "Assembling from atlas…"}
                      {aiStatus === "personalizing" && "Personalizing with AI…"}
                      {aiStatus === "error" && `AI fallback: ${aiError ?? "unknown error"}`}
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
                      const { deckId } = create(form);
                      navigate({ to: "/decks/$deckId", params: { deckId } });
                    }}
                  >
                    Assemble no AI
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-lg bg-[#0F1B3D] px-8 py-3 font-['Urbanist'] text-sm font-bold tracking-tight text-white shadow-md transition-all hover:bg-[#1E3A5F] active:scale-[0.98] disabled:opacity-50"
                    onClick={async () => {
                      setAiError(null);
                      setAiStatus("assembling");
                      const { deckId } = create(form);
                      const deck = useDeckStore.getState().decks[deckId] ?? decks[deckId];
                      if (!deck) {
                        navigate({ to: "/decks/$deckId", params: { deckId } });
                        return;
                      }
                      setAiStatus("personalizing");
                      try {
                        const brandForCall = byId(brandModes, form.brandModeId);
                        const scope = brandForCall?.contentScope;
                        const result = await personalize({
                          data: {
                            brief: {
                              prospect: form.prospect,
                              industry: form.industry,
                              audience: form.audience,
                              meetingObjective: form.meetingObjective,
                              clientFacts: form.clientFacts,
                              archetypeName: byId(NARRATIVE_ARCHETYPES, form.archetypeId)?.name ?? "Deck",
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
                    Assemble Pitch Deck →
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
  const chip = (text: string, key: string) => (
    <span
      key={key}
      className="rounded-full border px-3 py-1 text-xs font-medium"
      style={{
        backgroundColor: PALETTE.page,
        color: PALETTE.inkSoft,
        borderColor: PALETTE.hairline,
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
        <span className={labelCls}>Relevant to this brand</span>
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

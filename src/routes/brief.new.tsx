import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useDeckStore } from "@/lib/deck-store";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { personalizeSlides } from "@/lib/personalize.functions";
import { retrieveKnowledgeForBrief, abAssign, abLogEvent } from "@/lib/admin.functions";
import { synthesizeKnowledgeForBrief } from "@/lib/ai-rag.functions";
import { createPrintAssetWithBrief } from "@/lib/print-assets.functions";
import { EVENT_PLAYBOOKS } from "@/lib/event-playbooks";
import { SOCIAL_PLAYBOOKS } from "@/lib/social-playbooks";
import { useSignedIn } from "@/components/CloudDeckControls";
import { byId, SECTION_FRAMEWORKS, NARRATIVE_ARCHETYPES } from "@/lib/taxonomy";

export const Route = createFileRoute("/brief/new")({
  head: () => ({
    meta: [
      { title: "New master brief · TransPerfect Modular" },
      {
        name: "description",
        content:
          "One prompt · full brand set. Describe the opportunity, pick what to make, generate the deck and every companion artifact.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: BriefCommandCenter,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-red-600">Brief failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

function BriefCommandCenter() {
  const navigate = useNavigate();
  const create = useDeckStore((s) => s.createBriefAndAssemble);
  const setDeckContext = useDeckStore((s) => s.setDeckContext);
  const applyAi = useDeckStore((s) => s.applyAiContent);
  const decks = useDeckStore((s) => s.decks);
  const personalize = useServerFn(personalizeSlides);
  const retrieveKnowledge = useServerFn(retrieveKnowledgeForBrief);
  const synthesizeKnowledge = useServerFn(synthesizeKnowledgeForBrief);
  const assignVariantFn = useServerFn(abAssign);
  const logAbEventFn = useServerFn(abLogEvent);
  const { brandModes, narrativeArchetypes } = useTaxonomy();
  const signedIn = useSignedIn();
  const createPrintAssetFn = useServerFn(createPrintAssetWithBrief);

  const [aiStatus, setAiStatus] = useState<
    "idle" | "assembling" | "knowledge" | "personalizing" | "error"
  >("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [prospect, setProspect] = useState("Acme Global");
  const [brandModeId, setBrandModeId] = useState<string>(
    brandModes.find((b) => b.id === "bm-enterprise")?.id ?? brandModes[0]?.id ?? "bm-enterprise",
  );

  type PrintKind = "case-study" | "spotlight" | "ebrochure" | "adaptor-brief";
  type MasterSet = {
    presentation: boolean;
    print: { enabled: boolean; kinds: PrintKind[] };
    event: { enabled: boolean; playbookId: string | null };
    social: { enabled: boolean; playbookId: string | null };
  };
  const [masterSet, setMasterSet] = useState<MasterSet>({
    presentation: true,
    print: { enabled: true, kinds: ["case-study"] },
    event: { enabled: false, playbookId: EVENT_PLAYBOOKS[0]?.id ?? null },
    social: { enabled: false, playbookId: SOCIAL_PLAYBOOKS[0]?.id ?? null },
  });

  const brand = useMemo(
    () => brandModes.find((b) => b.id === brandModeId) ?? brandModes[0],
    [brandModes, brandModeId],
  );
  const brandPrimary = brand?.tokens?.primary || "#003FC7";
  const brandAccent = brand?.tokens?.accent || "#A1FBF9";

  type Destination =
    | "presentation"
    | "print:case-study"
    | "print:spotlight"
    | "print:ebrochure"
    | "print:adaptor-brief"
    | "event"
    | "social";
  const isDestOn = (d: Destination): boolean => {
    if (d === "presentation") return masterSet.presentation;
    if (d === "event") return masterSet.event.enabled;
    if (d === "social") return masterSet.social.enabled;
    const kind = d.slice(6) as PrintKind;
    return masterSet.print.enabled && masterSet.print.kinds.includes(kind);
  };
  const toggleDest = (d: Destination) => {
    setMasterSet((prev) => {
      if (d === "presentation") return { ...prev, presentation: !prev.presentation };
      if (d === "event") return { ...prev, event: { ...prev.event, enabled: !prev.event.enabled } };
      if (d === "social") return { ...prev, social: { ...prev.social, enabled: !prev.social.enabled } };
      const kind = d.slice(6) as PrintKind;
      const has = prev.print.kinds.includes(kind);
      const nextKinds = has ? prev.print.kinds.filter((k) => k !== kind) : [...prev.print.kinds, kind];
      return { ...prev, print: { enabled: nextKinds.length > 0, kinds: nextKinds } };
    });
  };

  // Build the submission from the compact command-center inputs. Everything not
  // supplied here uses sensible defaults; the user refines on the deck page.
  function buildSubmission() {
    const raw = prompt.trim();
    const forMatch = raw.match(/\bfor\s+([A-Z][\w&.\- ]{1,48})/);
    const inferredProspect = forMatch ? forMatch[1].trim().replace(/[.,]$/, "") : prospect;
    const defaultArch =
      narrativeArchetypes.find((a) => a.id === "arch-problem-solution")?.id ??
      narrativeArchetypes[0]?.id ??
      "arch-problem-solution";
    return {
      prospect: inferredProspect || "New prospect",
      industry: brand?.contentScope?.industries?.[0] ?? "Life sciences",
      audience: "Decision makers",
      meetingObjective: raw || "Introduce TransPerfect capabilities",
      brandModeId,
      subCompany: "",
      archetypeId: defaultArch,
      lengthTarget: 9,
      clientFacts: raw,
      abExperimentId: null as string | null,
      abVariantId: null as string | null,
      abPaletteOverride: null as Record<string, string> | null,
    };
  }

  async function expandMasterSet(
    deckId: string,
    submission: {
      prospect: string;
      industry: string;
      audience: string;
      meetingObjective: string;
      clientFacts: string;
    },
  ) {
    setExpanding(true);
    const prints: Array<{ id: string; kind: PrintKind; title: string }> = [];

    if (masterSet.print.enabled && signedIn) {
      for (const kind of masterSet.print.kinds) {
        try {
          const res = await createPrintAssetFn({
            data: {
              kind,
              title: `${submission.prospect} · ${kind.replace("-", " ")}`,
              brandModeId,
              subCompany: null,
              brief: {
                prospect: submission.prospect,
                industry: submission.industry,
                audience: submission.audience,
                meetingObjective: submission.meetingObjective,
                clientFacts: submission.clientFacts,
              },
            },
          });
          if (res?.id) prints.push({ id: res.id, kind, title: res.title ?? `${submission.prospect} · ${kind}` });
        } catch (e) {
          toast.error(`Print (${kind}) failed: ${(e as Error).message}`);
        }
      }
    }

    setDeckContext(deckId, {
      masterSet: {
        eventPlaybookId: masterSet.event.enabled ? masterSet.event.playbookId : null,
        socialPlaybookId: masterSet.social.enabled ? masterSet.social.playbookId : null,
        printAssetIds: prints.map((p) => p.id),
        brandDivisionId: brand?.id ?? null,
      },
    });
    setExpanding(false);

    const parts: string[] = ["Deck"];
    if (prints.length) parts.push(`${prints.length} print asset${prints.length > 1 ? "s" : ""}`);
    if (masterSet.event.enabled && masterSet.event.playbookId) parts.push("event kit");
    if (masterSet.social.enabled && masterSet.social.playbookId) parts.push("social kit");
    toast.success(`Master set ready · ${parts.join(" · ")}`);
  }

  async function generateWithAi() {
    setAiError(null);
    setAiStatus("assembling");
    const scope = brand?.contentScope;

    const submission = buildSubmission();
    // A/B experiment support removed from the simplified surface.
    void assignVariantFn;
    void logAbEventFn;
    const { deckId } = create(submission);
    const deck = useDeckStore.getState().decks[deckId] ?? decks[deckId];
    if (!deck) {
      navigate({ to: "/decks/$deckId", params: { deckId } });
      return;
    }

    setAiStatus("knowledge");
    let knowledgeSnippets: Array<{
      source: "oracle" | "kb" | "asset" | "brand-intel" | "synthesis";
      title: string;
      snippet: string;
      tags: string[];
      id: string;
    }> = [];
    let synthesisText: string | null = null;
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
          brandName: brand?.name ?? null,
          divisionId: brand?.id ?? null,
          brandTags: kbTagsBundle,
          limit: 6,
        },
      });
      if (synth.ok) {
        synthesisText = synth.synthesis ?? null;
        knowledgeSnippets = synth.selected.map((k) => ({
          id: k.id,
          source: k.source as "oracle" | "kb" | "asset" | "brand-intel",
          title: k.title,
          snippet: k.snippet,
          tags: k.tags,
        }));
      }
    } catch {
      /* fall through */
    }

    if (!knowledgeSnippets.length) {
      try {
        const kbRes = await retrieveKnowledge({
          data: {
            industry: submission.industry,
            audience: submission.audience,
            meetingObjective: submission.meetingObjective,
            clientFacts: submission.clientFacts,
            brandName: brand?.name ?? null,
            divisionId: brand?.id ?? null,
            brandTags: kbTagsBundle,
            limit: 6,
          },
        });
        knowledgeSnippets = kbRes as typeof knowledgeSnippets;
      } catch {
        /* non-fatal */
      }
    }

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

    const personalizerKb: Array<{
      source: "oracle" | "kb" | "asset" | "brand-intel";
      title: string;
      snippet: string;
      tags: string[];
    }> = knowledgeSnippets
      .filter((k) => k.source !== "synthesis")
      .map((k) => ({
        source: k.source as "oracle" | "kb" | "asset" | "brand-intel",
        title: k.title,
        snippet: k.snippet,
        tags: k.tags,
      }));
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
                  brandName: brand?.name,
                  role: brand?.role,
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
        return;
      }
      applyAi(deckId, result.slides as Array<{ id: string; content: Record<string, unknown> }>);
    } catch (e) {
      setAiError((e as Error).message);
      setAiStatus("error");
      return;
    }
    await expandMasterSet(deckId, submission);
    setAiStatus("idle");
    navigate({ to: "/decks/$deckId", params: { deckId }, hash: "brand-review" });
  }

  async function generateFast() {
    const submission = buildSubmission();
    const { deckId } = create(submission);
    await expandMasterSet(deckId, submission);
    navigate({ to: "/decks/$deckId", params: { deckId } });
  }

  const busy = aiStatus === "assembling" || aiStatus === "knowledge" || aiStatus === "personalizing";

  const destinations: Array<{ id: Destination; label: string; sub: string }> = [
    { id: "presentation", label: "Presentation", sub: "Deck" },
    { id: "print:case-study", label: "Case study", sub: "Print" },
    { id: "print:spotlight", label: "Spotlight", sub: "Print" },
    { id: "print:ebrochure", label: "eBrochure", sub: "Print" },
    { id: "print:adaptor-brief", label: "Adaptor brief", sub: "Print" },
    { id: "event", label: "Event kit", sub: "Onsite" },
    { id: "social", label: "Social kit", sub: "Digital" },
  ];

  const selectedCount = destinations.filter((d) => isDestOn(d.id)).length;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl px-6 py-16 font-['Geist'] text-[#03002C] sm:py-20 lg:px-8">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="text-[11px] font-mono uppercase tracking-[0.28em] text-[#003FC7]">
              New master brief
            </div>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl">
              What are we making today?
            </h1>
            <p className="mt-3 max-w-xl text-base text-black/60">
              One line. Pick what you need. Refine on the next screen.
            </p>
          </div>
          <Link
            to="/decks/import"
            className="rounded-full border border-black/15 bg-white px-4 py-2 text-xs font-medium text-black/70 transition hover:border-black/30 hover:text-black"
          >
            Import PowerPoint →
          </Link>
        </header>

        {/* AI prompt bar */}
        <section className="mt-14">
          <div className="rounded-2xl border border-black/10 bg-white p-2 shadow-[0_1px_0_0_rgba(0,0,0,0.02)] transition focus-within:border-[#003FC7]/50 focus-within:shadow-[0_8px_24px_-16px_rgba(0,63,199,0.35)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    if (!busy) void generateWithAi();
                  }
                }}
                rows={2}
                placeholder="e.g. Pilot pitch for Acme Global expanding into 12 markets, meeting VP Marketing next Tuesday…"
                className="flex-1 resize-none bg-transparent px-4 py-3 text-[15px] leading-snug text-[#03002C] placeholder:text-black/35 focus:outline-none"
              />
              <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-stretch sm:justify-between sm:px-1 sm:pb-1">
                <button
                  type="button"
                  onClick={() => void generateWithAi()}
                  disabled={busy || selectedCount === 0}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#003FC7] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#03002C] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy
                    ? aiStatus === "assembling"
                      ? "Assembling…"
                      : aiStatus === "knowledge"
                        ? "Pulling context…"
                        : "Personalizing…"
                    : "Generate"}
                  <span className="hidden font-mono text-[10px] font-normal opacity-70 sm:inline">⌘↵</span>
                </button>
                <button
                  type="button"
                  onClick={() => void generateFast()}
                  disabled={busy || selectedCount === 0}
                  className="text-[11px] font-medium uppercase tracking-widest text-black/50 transition hover:text-black disabled:opacity-40"
                >
                  {expanding ? "Producing…" : "or skip AI →"}
                </button>
              </div>
            </div>
          </div>

          {aiStatus === "error" && aiError && (
            <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              AI failed: {aiError}
            </div>
          )}
        </section>

        {/* Destination tiles */}
        <section className="mt-16">
          <div className="mb-5 flex items-baseline justify-between">
            <div className="text-[11px] font-mono uppercase tracking-[0.24em] text-black/55">
              Destinations
            </div>
            <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-black/40">
              {selectedCount} selected
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {destinations.map((t) => {
              const on = isDestOn(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleDest(t.id)}
                  aria-pressed={on}
                  className={`group relative flex min-h-[92px] flex-col items-start justify-end gap-1 rounded-2xl border px-4 py-4 text-left transition ${
                    on
                      ? "border-[#003FC7] bg-[#003FC7]/[0.04] shadow-[0_0_0_1px_rgba(0,63,199,0.35)]"
                      : "border-black/10 bg-white hover:border-black/30"
                  }`}
                >
                  <span
                    className={`text-[9px] font-mono uppercase tracking-[0.2em] ${on ? "text-[#003FC7]" : "text-black/45"}`}
                  >
                    {t.sub}
                  </span>
                  <span className="text-sm font-semibold leading-tight text-[#03002C]">{t.label}</span>
                  <span
                    aria-hidden
                    className={`absolute right-3 top-3 h-1.5 w-1.5 rounded-full transition ${on ? "bg-[#003FC7]" : "bg-black/15"}`}
                  />
                </button>
              );
            })}
          </div>
        </section>

        {/* Brand + prospect */}
        <section className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <label className="block">
            <span className="text-[11px] font-mono uppercase tracking-[0.24em] text-black/55">
              Prospect
            </span>
            <input
              value={prospect}
              onChange={(e) => setProspect(e.target.value)}
              placeholder="Company name"
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm text-[#03002C] placeholder:text-black/35 focus:border-[#003FC7]/60 focus:outline-none"
            />
          </label>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-[0.24em] text-black/55">
              Brand mode
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {brandModes.map((b) => {
                const active = b.id === brandModeId;
                const c = b.tokens?.primary || "#003FC7";
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBrandModeId(b.id)}
                    aria-pressed={active}
                    className={`rounded-xl border px-3 py-2 text-left text-[11px] font-semibold tracking-tight transition ${
                      active
                        ? "border-[#03002C] bg-[#03002C] text-white"
                        : "border-black/10 bg-white text-black/65 hover:border-black/30 hover:text-black"
                    }`}
                    style={active ? { boxShadow: `inset 0 -2px 0 0 ${c}` } : undefined}
                    title={b.name}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mt-16 flex items-center justify-between border-t border-black/10 pt-5 text-[11px] text-black/50">
          <span>
            Assembling under{" "}
            <strong className="font-semibold text-[#03002C]">{brand?.name ?? "brand"}</strong>. Refine
            everything else on the deck page.
          </span>
          <span
            className="inline-block h-2 w-10 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${brandPrimary}, ${brandAccent})`,
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}


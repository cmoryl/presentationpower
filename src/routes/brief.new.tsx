import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useDeckStore } from "@/lib/deck-store";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { personalizeSlides } from "@/lib/personalize.functions";
import { byId, SECTION_FRAMEWORKS, NARRATIVE_ARCHETYPES } from "@/lib/taxonomy";

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

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-black/50">Step 01</div>
        <h1 className="mt-3 text-4xl font-semibold">Brief the system.</h1>
        <p className="mt-3 text-black/60">
          The system uses this to pick the narrative archetype, section frameworks, and approved module variants.
        </p>

        <div className="mt-10 space-y-8 rounded-2xl border border-black/10 bg-white p-8">
          <Field label="Prospect">
            <input className={inputCls} value={form.prospect} onChange={(e) => setForm({ ...form, prospect: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-6">
            <Field label="Industry">
              <input className={inputCls} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </Field>
            <Field label="Audience">
              <input className={inputCls} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
            </Field>
          </div>
          <Field label="Meeting objective">
            <input className={inputCls} value={form.meetingObjective} onChange={(e) => setForm({ ...form, meetingObjective: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-6">
            <Field label="Brand mode">
              <select className={inputCls} value={form.brandModeId} onChange={(e) => setForm({ ...form, brandModeId: e.target.value })}>
                {brandModes.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Narrative archetype">
              <select className={inputCls} value={form.archetypeId} onChange={(e) => setForm({ ...form, archetypeId: e.target.value })}>
                {narrativeArchetypes.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={`Length target: ${form.lengthTarget} slides`}>
            <input
              type="range"
              min={5}
              max={12}
              value={form.lengthTarget}
              onChange={(e) => setForm({ ...form, lengthTarget: Number(e.target.value) })}
              className="w-full"
            />
          </Field>
          <Field label="Known client facts">
            <textarea
              className={inputCls + " min-h-[110px]"}
              value={form.clientFacts}
              onChange={(e) => setForm({ ...form, clientFacts: e.target.value })}
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {aiStatus !== "idle" && (
            <span className="text-xs text-black/55">
              {aiStatus === "assembling" && "Assembling from atlas…"}
              {aiStatus === "personalizing" && "Personalizing with AI…"}
              {aiStatus === "error" && `AI fallback: ${aiError ?? "unknown error"}`}
            </span>
          )}
          <button
            disabled={aiStatus === "assembling" || aiStatus === "personalizing"}
            className="rounded-full border border-black/20 px-5 py-2.5 text-sm hover:bg-black/5 disabled:opacity-50"
            onClick={() => {
              const { deckId } = create(form);
              navigate({ to: "/decks/$deckId", params: { deckId } });
            }}
          >
            Assemble (no AI)
          </button>
          <button
            disabled={aiStatus === "assembling" || aiStatus === "personalizing"}
            className="rounded-full bg-[#0B2A4A] px-6 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
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
                const result = await personalize({
                  data: {
                    brief: {
                      prospect: form.prospect,
                      industry: form.industry,
                      audience: form.audience,
                      meetingObjective: form.meetingObjective,
                      clientFacts: form.clientFacts,
                      archetypeName: byId(NARRATIVE_ARCHETYPES, form.archetypeId)?.name ?? "Deck",
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
            Assemble with AI →
          </button>
        </div>
      </div>
    </AppShell>
  );
}

const inputCls = "w-full rounded-lg border border-black/15 bg-white px-4 py-3 text-sm focus:border-[#0B2A4A] focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-widest text-black/55">{label}</span>
      {children}
    </label>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDeckStore } from "@/lib/deck-store";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";

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
  const { brandModes, narrativeArchetypes } = useTaxonomy();
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

        <div className="mt-6 flex justify-end">
          <button
            className="rounded-full bg-[#0B2A4A] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
            onClick={() => {
              const { deckId } = create(form);
              navigate({ to: "/decks/$deckId", params: { deckId } });
            }}
          >
            Assemble deck →
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

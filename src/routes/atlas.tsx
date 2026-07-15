import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { byId } from "@/lib/taxonomy";

export const Route = createFileRoute("/atlas")({
  head: () => ({
    meta: [
      { title: "Atlas · TransPerfect Modular" },
      { name: "description", content: "Browse the section frameworks, module families, variants, and layout frameworks." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: Atlas,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-red-600">Atlas failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

function Atlas() {
  const {
    layoutFrameworks: LAYOUT_FRAMEWORKS,
    moduleFamilies: MODULE_FAMILIES,
    moduleVariants: MODULE_VARIANTS,
    sectionFrameworks: SECTION_FRAMEWORKS,
    narrativeArchetypes: NARRATIVE_ARCHETYPES,
  } = useTaxonomy();

  return (
    <AppShell>
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-black/50">The Atlas</div>
        <h1 className="mt-3 text-4xl font-semibold">Section frameworks, module families, variants, and layouts.</h1>
        <p className="mt-3 max-w-2xl text-black/60">
          Every deck is assembled from these pieces. Section frameworks decide where you are in the story; module
          families decide what job the slide does; variants decide the shape; layouts decide the geometry.
        </p>
        <p className="mt-2 text-xs text-black/40">Loaded live from the Cloud taxonomy tables.</p>
      </div>

      <Section title="Narrative archetypes" count={NARRATIVE_ARCHETYPES.length}>
        <div className="grid grid-cols-2 gap-4">
          {NARRATIVE_ARCHETYPES.map((a) => (
            <div key={a.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="font-medium">{a.name}</div>
              <div className="mt-1 text-sm text-black/60">{a.description}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.sectionRecipe.map((sfId) => (
                  <span key={sfId} className="rounded-full bg-black/5 px-2 py-0.5 font-mono text-xs">{sfId}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Section frameworks" count={SECTION_FRAMEWORKS.length}>
        <div className="grid grid-cols-3 gap-4">
          {SECTION_FRAMEWORKS.map((sf) => (
            <div key={sf.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="font-mono text-xs text-black/50">{sf.id}</div>
              <div className="mt-1 font-medium">{sf.name}</div>
              <div className="mt-1 text-sm text-black/60">{sf.purpose}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {sf.permittedFamilyIds.map((f) => (
                  <span key={f} className="rounded-full bg-[#0B2A4A]/10 px-2 py-0.5 font-mono text-xs text-[#0B2A4A]">
                    {f} {byId(MODULE_FAMILIES, f)?.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Module families" count={MODULE_FAMILIES.length}>
        <div className="grid grid-cols-2 gap-4">
          {MODULE_FAMILIES.map((mf) => {
            const variants = MODULE_VARIANTS.filter((mv) => mv.familyId === mf.id);
            return (
              <div key={mf.id} className="rounded-2xl border border-black/10 bg-white p-5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="font-mono text-xs text-black/50">{mf.id}</div>
                    <div className="mt-1 font-medium">{mf.name}</div>
                  </div>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">Review: {mf.reviewLevel}</span>
                </div>
                <div className="mt-2 text-sm text-black/60">{mf.description}</div>
                <div className="mt-4 border-t border-black/10 pt-3">
                  <div className="text-xs uppercase tracking-widest text-black/50">Variants</div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {variants.map((v) => (
                      <li key={v.id} className="flex justify-between">
                        <span>{v.name}</span>
                        <span className="font-mono text-xs text-black/50">{v.id}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Layout frameworks" count={LAYOUT_FRAMEWORKS.length}>
        <div className="grid grid-cols-4 gap-4">
          {LAYOUT_FRAMEWORKS.map((lf) => (
            <div key={lf.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="font-mono text-xs text-black/50">{lf.id}</div>
              <div className="mt-1 font-medium">{lf.name}</div>
              <div className="mt-1 text-sm text-black/60">{lf.description}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {lf.zones.map((z) => (
                  <span key={z} className="rounded-full bg-black/5 px-2 py-0.5 text-xs">{z}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="mt-14 rounded-2xl border border-dashed border-black/15 bg-white p-6 text-sm text-black/60">
        Want to see the pieces in action?{" "}
        <Link to="/brief/new" className="font-medium text-[#0B2A4A] underline">Start a brief</Link>{" "}
        and the assembler will pick from this atlas.
      </div>
    </AppShell>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <span className="text-sm text-black/50">{count}</span>
      </div>
      {children}
    </section>
  );
}

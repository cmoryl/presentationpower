import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDeckStore } from "@/lib/deck-store";
import { BRAND_MODES, MODULE_FAMILIES, MODULE_VARIANTS, SECTION_FRAMEWORKS, LAYOUT_FRAMEWORKS, byId } from "@/lib/taxonomy";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TransPerfect Modular · On-Demand Enablement" },
      { name: "description", content: "Modular slide directory and AI deck assembly for TransPerfect sales enablement." },
      { property: "og:title", content: "TransPerfect Modular · On-Demand Enablement" },
      { property: "og:description", content: "Modular slide directory and AI deck assembly for TransPerfect sales enablement." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const decks = useDeckStore((s) => Object.values(s.decks).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  const briefs = useDeckStore((s) => s.briefs);
  return (
    <AppShell>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-black/50">On-Demand Enablement</div>
          <h1 className="mt-3 text-5xl font-semibold leading-tight">Assemble a governed deck in minutes.</h1>
          <p className="mt-4 max-w-2xl text-lg text-black/60">
            Answer a short brief. The system picks the narrative archetype, the section frameworks, and approved module
            variants — you review, personalize the editable fields, and export.
          </p>
        </div>
        <Link
          to="/brief/new"
          className="rounded-full bg-[#0B2A4A] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
        >
          New brief →
        </Link>
      </div>

      <div className="mt-12 grid grid-cols-4 gap-6">
        <Stat label="Section frameworks" value={SECTION_FRAMEWORKS.length} />
        <Stat label="Module families" value={MODULE_FAMILIES.length} />
        <Stat label="Module variants" value={MODULE_VARIANTS.length} />
        <Stat label="Layout frameworks" value={LAYOUT_FRAMEWORKS.length} />
      </div>

      <div className="mt-14">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold">Your decks</h2>
          <Link to="/atlas" className="text-sm text-black/60 hover:text-black">Browse the atlas →</Link>
        </div>
        {decks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center text-black/60">
            No decks yet. Start with a brief.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {decks.map((d) => {
              const b = briefs[d.briefId];
              const brand = byId(BRAND_MODES, d.brandModeId);
              return (
                <Link
                  key={d.id}
                  to="/decks/$deckId"
                  params={{ deckId: d.id }}
                  className="group rounded-2xl border border-black/10 bg-white p-6 transition hover:border-black/30"
                >
                  <div className="h-2 w-10" style={{ backgroundColor: brand?.tokens.accent ?? "#E85A2C" }} />
                  <div className="mt-5 text-lg font-semibold">{d.title}</div>
                  <div className="mt-1 text-sm text-black/60">
                    {d.slides.length} slides · {b?.industry ?? "—"}
                  </div>
                  <div className="mt-8 text-xs uppercase tracking-widest text-black/40">
                    {new Date(d.createdAt).toLocaleString()}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="text-4xl font-semibold text-[#0B2A4A]">{value}</div>
      <div className="mt-2 text-xs uppercase tracking-widest text-black/50">{label}</div>
    </div>
  );
}

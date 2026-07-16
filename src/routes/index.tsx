import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDeckStore, type Deck } from "@/lib/deck-store";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
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
  const decksMap = useDeckStore((s) => s.decks);
  const briefs = useDeckStore((s) => s.briefs);
  const deleteDeck = useDeckStore((s) => s.deleteDeck);
  const decks = useMemo<Deck[]>(
    () => Object.values(decksMap).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [decksMap],
  );
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
        <div className="flex items-center gap-2">
          <Link
            to="/decks/import"
            className="rounded-full border border-black/15 bg-white px-5 py-3 text-sm font-medium text-black/80 hover:border-black/30"
          >
            Import PowerPoint
          </Link>
          <Link
            to="/brief/new"
            className="rounded-full bg-[#0B2A4A] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
          >
            New brief →
          </Link>
        </div>
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
              const brand = byId(BRAND_MODES, d.brandModeId) ?? BRAND_MODES[0];
              const cover = d.slides[0];
              const coverVariant = cover ? byId(MODULE_VARIANTS, cover.variantId) : undefined;
              return (
                <div key={d.id} className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:border-black/30">
                  <Link to="/decks/$deckId" params={{ deckId: d.id }} className="block">
                    <div className="aspect-[16/9] bg-white">
                      {cover && coverVariant && (
                        <ScaledSlide>
                          <VariantRenderer slide={cover} variant={coverVariant} brand={brand} pageNumber={1} />
                        </ScaledSlide>
                      )}
                    </div>
                    <div className="border-t border-black/10 p-5">
                      <div className="h-1.5 w-8 rounded-full" style={{ backgroundColor: brand.tokens.accent }} />
                      <div className="mt-4 text-lg font-semibold">{d.title}</div>
                      <div className="mt-1 text-sm text-black/60">
                        {d.slides.length} slides · {b?.industry ?? "—"}
                      </div>
                      <div className="mt-6 text-xs uppercase tracking-widest text-black/40">
                        {new Date(d.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => { if (confirm(`Delete "${d.title}"?`)) deleteDeck(d.id); }}
                    className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs text-black/60 opacity-0 shadow ring-1 ring-black/10 transition hover:text-black group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </div>
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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Palette } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useDeckStore } from "@/lib/deck-store";
import {
  buildNextPaletteShowcase,
  NEXT_PALETTE_DECK_TITLE,
  NEXT_PALETTE_DIVISIONS,
} from "@/lib/next-palette-showcase";


export const Route = createFileRoute("/decks/next-palette")({
  head: () => ({
    meta: [
      { title: "NEXT 2026 palette showcase deck · TransPerfect" },
      {
        name: "description",
        content:
          "Generate an editable example deck that walks the TransPerfect NEXT 2026 division colour palette, one section per division.",
      },
      { property: "og:title", content: "NEXT 2026 palette showcase deck" },
      {
        property: "og:description",
        content:
          "An editable 23-slide deck showcasing every TransPerfect NEXT 2026 division accent on the master navy field.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NextPaletteShowcasePage,
});

function NextPaletteShowcasePage() {
  const navigate = useNavigate();
  const createDeckFromTemplate = useDeckStore((s) => s.createDeckFromTemplate);
  const setSlideMode = useDeckStore((s) => s.setSlideMode);
  const existingId = useDeckStore((s) =>
    Object.values(s.decks).find((d) => d.title === NEXT_PALETTE_DECK_TITLE)?.id,
  );

  function create() {
    const { deckId } = createDeckFromTemplate(buildNextPaletteShowcase());
    const deck = useDeckStore.getState().decks[deckId];
    deck?.slides.forEach((sl) => setSlideMode(deckId, sl.id, "dark"));
    void navigate({ to: "/decks/$deckId", params: { deckId } });
  }

  // Idempotent: reuse the already-generated showcase instead of piling up
  // duplicates on every click. A fresh copy stays available explicitly.
  function generate() {
    if (existingId) {
      void navigate({ to: "/decks/$deckId", params: { deckId: existingId } });
      return;
    }
    create();
  }

  return (
    <AppShell>
      <div className="max-w-3xl">
        <div className="text-xs uppercase tracking-widest text-black/50 dark:text-white/50">
          Example deck
        </div>
        <h1 className="mt-1 text-3xl font-semibold">NEXT 2026 palette showcase</h1>
        <p className="mt-3 text-sm leading-relaxed text-black/60 dark:text-white/60">
          A standalone 23-slide deck — cover plus a divider and a content slide for each of the
          eleven NEXT 2026 divisions — built from the app&rsquo;s own modules. Each section keeps
          the master navy field (#03002C) and swaps only the division accent, so you can read the
          palette as a deck style. It opens in the editor like any other deck.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={generate}
            className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            <Palette size={14} />
            {existingId ? "Open the showcase deck" : "Generate & open in the editor"}
          </button>
          {existingId && (
            <button
              type="button"
              onClick={create}
              className="inline-flex items-center gap-2 rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium hover:bg-black/[0.04] dark:border-white/20 dark:hover:bg-white/[0.06]"
            >
              Create a fresh copy
            </button>
          )}
        </div>


        <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {NEXT_PALETTE_DIVISIONS.map((d, i) => (
            <li
              key={`${d.name}-${i}`}
              className="flex items-center gap-3 rounded-xl border border-black/10 p-3 dark:border-white/10"
            >
              <span
                aria-hidden
                className="h-6 w-6 shrink-0 rounded-full"
                style={{ background: d.accent }}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{d.name}</span>
                <span className="block text-xs tabular-nums text-black/50 dark:text-white/50">
                  {d.accent.toUpperCase()}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}

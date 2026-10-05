import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/** The rebuilt TransPerfect General Slides master deck (28 designed slides). */
export const GENERAL_SLIDES_MASTER_ID = "7a6e1c52-0000-4e5a-9b1d-6e0a51ce0001";
/** Light companion: the same 28 slides on the light ground. */
export const GENERAL_SLIDES_LIGHT_MASTER_ID = "7a6e1c52-0000-4e5a-9b1d-6e0a51ce0002";

export const Route = createFileRoute("/masters/general-slides")({
  head: () => ({
    meta: [
      { title: "General Slides master · TransPerfect Element" },
      {
        name: "description",
        content: "The redesigned TransPerfect General Slides master deck: 28 slides, every source fact kept, built from Element modules.",
      },
      { property: "og:title", content: "General Slides master · TransPerfect Element" },
      {
        property: "og:description",
        content: "Redesigned TransPerfect General Slides master deck built from Element modules.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GeneralSlidesMaster,
});

function GeneralSlidesMaster() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Master deck</p>
      <h1 className="mt-2 text-4xl font-semibold leading-tight">TransPerfect General Slides</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        28 slides rebuilt in Element designs. Every slide carries only the original deck's words, figures and logos.
        Admins and brand leads can edit the master; everyone else should view it and build their own deck from it.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/decks/$deckId" params={{ deckId: GENERAL_SLIDES_MASTER_ID }}>Open dark master</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/decks/$deckId/print" params={{ deckId: GENERAL_SLIDES_MASTER_ID }}>View all slides</Link>
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/decks/$deckId" params={{ deckId: GENERAL_SLIDES_LIGHT_MASTER_ID }}>Open light master</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/decks/$deckId/print" params={{ deckId: GENERAL_SLIDES_LIGHT_MASTER_ID }}>View all light slides</Link>
        </Button>
      </div>
    </main>
  );
}

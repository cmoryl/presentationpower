// Maps a cloud deck payload (from loadCloudDeck) into the local deck-store shape.
// Shared by the "My saved presentations" list and the deck editor's auto-hydrate
// path so a cloud-only deck (e.g. one the agent built) can be opened directly.
import type { Brief, Deck, DeckSlide } from "@/lib/deck-store";

export type CloudDeckPayload = {
  deck: unknown;
  brief?: unknown;
  slides?: unknown;
};

export function cloudLocalDeckId(cloudId: string): string {
  return `cloud-${cloudId}`;
}

export function cloudDeckToLocal(res: CloudDeckPayload): { brief: Brief; deck: Deck } {
  const d = res.deck as {
    id: string;
    title: string;
    archetype_id: string | null;
    brand_mode_id: string | null;
    created_at: string | null;
    context?: Record<string, unknown> | null;
  };
  const b = (res.brief ?? null) as null | {
    id: string;
    prospect: string | null;
    industry: string | null;
    meeting_objective: string | null;
    audience: string | null;
    brand_mode_id: string | null;
    sub_company: string | null;
    length_target: number | null;
    known_facts: string | null;
    inputs: unknown;
    created_at: string | null;
  };

  const storedBrief =
    b && b.inputs && typeof b.inputs === "object" ? (b.inputs as Partial<Brief>) : null;

  const brief: Brief = {
    id: storedBrief?.id || `cloud-brief-${b?.id ?? d.id}`,
    createdAt: storedBrief?.createdAt || b?.created_at || new Date().toISOString(),
    prospect: storedBrief?.prospect ?? b?.prospect ?? "",
    industry: storedBrief?.industry ?? b?.industry ?? "",
    meetingObjective: storedBrief?.meetingObjective ?? b?.meeting_objective ?? "",
    audience: storedBrief?.audience ?? b?.audience ?? "",
    brandModeId: storedBrief?.brandModeId ?? b?.brand_mode_id ?? d.brand_mode_id ?? "enterprise",
    subCompany: storedBrief?.subCompany ?? b?.sub_company ?? undefined,
    archetypeId: storedBrief?.archetypeId ?? d.archetype_id ?? "",
    lengthTarget: storedBrief?.lengthTarget ?? b?.length_target ?? 8,
    clientFacts: storedBrief?.clientFacts ?? b?.known_facts ?? "",
  };

  const rawSlides = (res.slides ?? []) as Array<{
    id: string;
    position: number;
    section_id: string;
    variant_id: string;
    layout_id: string;
    content: Record<string, unknown> | null;
    notes?: string | null;
  }>;

  const slides: DeckSlide[] = rawSlides.map((s, i) => {
    const c = (s.content ?? {}) as Record<string, unknown> & {
      __localId?: string;
      __changes?: unknown[];
    };
    const { __localId, __changes, ...content } = c;
    return {
      id: typeof __localId === "string" ? __localId : s.id,
      position: s.position ?? i,
      sectionId: s.section_id,
      variantId: s.variant_id,
      layoutId: s.layout_id,
      content,
      changes: Array.isArray(__changes) ? (__changes as DeckSlide["changes"]) : [],
      notes: typeof s.notes === "string" ? s.notes : undefined,
    } as DeckSlide;
  });

  const deckContext = d.context;
  const contextSubCompany =
    deckContext && typeof deckContext === "object" && typeof deckContext.subCompany === "string"
      ? (deckContext.subCompany as string)
      : undefined;

  const deck: Deck = {
    id: cloudLocalDeckId(d.id),
    createdAt: d.created_at || new Date().toISOString(),
    title: d.title,
    briefId: brief.id,
    brandModeId: brief.brandModeId,
    subCompany: contextSubCompany ?? brief.subCompany,
    archetypeId: brief.archetypeId,
    slides,
    context: (deckContext && typeof deckContext === "object"
      ? deckContext
      : undefined) as Deck["context"],
  };

  return { brief, deck };
}

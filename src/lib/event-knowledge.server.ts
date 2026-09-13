// Event knowledge — server-only helpers.
//
// Harvest assembles records from the build's own data (London signage specs,
// venue template families, approved grounds, the lesson log). Embedding turns
// them into vectors through the Lovable AI Gateway so a new venue can search
// precedent semantically instead of reading 154 rows.

import lessonsMarkdown from "../../docs/EVENT-LESSONS.md?raw";

import {
  EVENT_KNOWLEDGE_EMBEDDING_MODEL,
  eventKnowledgeText,
  harvestFamilyKnowledge,
  harvestGrounds,
  harvestPanelSpecs,
  lessonRecords,
  parseEventLessons,
  type EventKnowledgeRecord,
  type HarvestFamily,
  type HarvestPanel,
  type HarvestVenue,
} from "@/lib/event-knowledge";
import { LONDON_PANELS, LONDON_STYLES, LONDON_VENUE } from "@/lib/next-london-signage";
import { NEXT_VENUE_TEMPLATES, venueTemplateFor } from "@/lib/next-venue-templates";

/** Google's embedding endpoint caps a batch at 100 inputs. */
const EMBED_BATCH = 100;

export const LONDON_HARVEST_VENUE: HarvestVenue = {
  eventId: LONDON_VENUE.eventId,
  city: LONDON_VENUE.city,
  venue: LONDON_VENUE.venue,
};

function londonPanels(): HarvestPanel[] {
  return LONDON_PANELS.map((panel) => ({
    id: panel.id,
    name: panel.name,
    room: panel.room,
    floor: panel.floor,
    ground: panel.ground,
    style: panel.style,
    trimW: panel.trimW,
    trimH: panel.trimH,
    bleedEdge: panel.bleedEdge,
    rasterPx: panel.rasterPx,
    rasterPpi: panel.rasterPpi,
    bandMm: panel.bandMm,
  }));
}

function familyOf(panelId: string): HarvestFamily | null {
  const family = venueTemplateFor(panelId);
  if (!family) return null;
  return {
    id: family.id,
    name: family.name,
    substrate: family.substrate,
    slots: [...family.slots],
    ground: family.ground,
    orientation: family.orientation,
    printNote: family.printNote,
  };
}

/** Everything this build currently knows about the London event, as records. */
export function harvestLondonKnowledge(): EventKnowledgeRecord[] {
  const panels = londonPanels();
  const families: HarvestFamily[] = NEXT_VENUE_TEMPLATES.map((family) => ({
    id: family.id,
    name: family.name,
    substrate: family.substrate,
    slots: [...family.slots],
    ground: family.ground,
    orientation: family.orientation,
    printNote: family.printNote,
  }));
  return [
    ...harvestPanelSpecs(LONDON_HARVEST_VENUE, panels, familyOf),
    ...harvestFamilyKnowledge(LONDON_HARVEST_VENUE, families, (familyId) =>
      panels.filter((panel) => venueTemplateFor(panel.id)?.id === familyId),
    ),
    ...harvestGrounds(LONDON_HARVEST_VENUE, LONDON_STYLES, panels),
    ...lessonRecords(LONDON_HARVEST_VENUE, parseEventLessons(lessonsMarkdown)),
  ];
}

/** Raw lesson-log entries, so the playbook can list them without a round trip. */
export function eventLessons() {
  return parseEventLessons(lessonsMarkdown);
}

export type EmbeddingFailure = { index: number; message: string };

/**
 * Embeds texts in gateway-sized batches. A failed batch is reported rather than
 * swallowed: an un-embedded record is invisible to search, and silently losing
 * it is exactly the kind of quiet gap this store exists to prevent.
 */
export async function embedEventKnowledge(
  texts: readonly string[],
): Promise<{ vectors: Array<number[] | null>; failures: EmbeddingFailure[] }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

  const vectors: Array<number[] | null> = texts.map(() => null);
  const failures: EmbeddingFailure[] = [];

  for (let start = 0; start < texts.length; start += EMBED_BATCH) {
    const slice = texts.slice(start, start + EMBED_BATCH);
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
        },
        body: JSON.stringify({
          model: EVENT_KNOWLEDGE_EMBEDDING_MODEL,
          input: slice,
        }),
      });
      if (!res.ok) {
        const message = `${res.status} ${(await res.text()).slice(0, 300)}`;
        failures.push({ index: start, message });
        continue;
      }
      const json = (await res.json()) as {
        data?: Array<{ index?: number; embedding: number[] }>;
      };
      for (let i = 0; i < slice.length; i += 1) {
        const row = json.data?.find((d) => (d.index ?? -1) === i) ?? json.data?.[i];
        if (row?.embedding) vectors[start + i] = row.embedding;
      }
    } catch (error) {
      failures.push({
        index: start,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { vectors, failures };
}

export function embeddingLiteral(vector: readonly number[]): string {
  return `[${vector.join(",")}]`;
}

export function recordRow(record: EventKnowledgeRecord, userId: string | null) {
  return {
    event_id: record.eventId,
    city: record.city,
    venue: record.venue,
    template_family_id: record.templateFamilyId,
    panel_id: record.panelId,
    kind: record.kind,
    title: record.title,
    body: record.body,
    facts: record.facts as never,
    source: record.source,
    fingerprint: record.fingerprint,
    created_by: userId,
  };
}

export { eventKnowledgeText };

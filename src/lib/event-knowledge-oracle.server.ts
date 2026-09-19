/**
 * Event knowledge → Oracle mirror mapping.
 *
 * Event knowledge is embedded in `event_venue_knowledge` and searched by the
 * event knowledge page, but the Oracle's keyword + vector passes read
 * `oracle_knowledge_base` and `knowledge_entries`. Without this mapping, the
 * whole venue/signage/agenda corpus is invisible to the Oracle: asking it
 * "what ground did the London registration desks use?" returned nothing even
 * though the answer was recorded.
 *
 * Keyed on the record fingerprint so re-harvesting updates rather than
 * duplicates — the same identity the event store itself uses.
 */

import type { EventKnowledgeRecord } from "@/lib/event-knowledge";
import type { OracleMirrorDoc } from "@/lib/oracle-mirror.server";

export function eventKnowledgeOracleDocs(records: EventKnowledgeRecord[]): OracleMirrorDoc[] {
  return records
    .filter((r) => (r.body ?? "").trim().length >= 40)
    .map((r) => ({
      mirrorKey: `event-knowledge:${r.fingerprint}`,
      title: r.title,
      text: [
        `${r.city} — ${r.venue}`.trim(),
        `${r.kind}: ${r.title}`,
        r.body,
        Object.entries(r.facts ?? {})
          .filter(([, v]) => v !== null && v !== "")
          .map(([k, v]) => `${k}: ${String(v)}`)
          .join("\n"),
      ]
        .filter(Boolean)
        .join("\n"),
      divisionId: null,
      sourceType: "event-knowledge",
      tags: [
        `event:${r.eventId}`,
        `city:${r.city.toLowerCase()}`,
        `kind:${r.kind}`,
        ...(r.templateFamilyId ? [`family:${r.templateFamilyId}`] : []),
      ],
    }));
}

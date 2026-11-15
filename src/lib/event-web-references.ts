import references from "./event-web-references.json";

export function eventWebReferences(eventId: string) {
  return references.filter(reference => reference.eventId === eventId || reference.relatedEventIds.includes(eventId));
}
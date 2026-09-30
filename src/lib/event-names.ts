// Plain-language names for started events, so pages never show a bare event id.

const NAMES: Record<string, string> = {
  "san-francisco": "NEXT 2026 San Francisco",
  london: "NEXT 2026 London",
};

/** Readable event name; unknown ids are title-cased rather than shown raw. */
export function eventDisplayName(eventId: string): string {
  return NAMES[eventId] ?? eventId.split("-").map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w)).join(" ");
}

/** Venues whose floors are drawn from the plans built into the app. */
export const BUILT_IN_FLOOR_VENUES: Record<string, string> = {
  "qeii-centre": "Floors drawn from the plans built into the app (7 levels)",
};

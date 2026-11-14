/** Source-image coordinates, not geographic or surveyed venue measurements. */
export const SJB_STADIUM_CONCEPT = {
  mapWidth: 400,
  mapDepth: 400 * 1024 / 1792,
  field: { center: [7.6, -17.8] as const, length: 72, width: 72 * 905 / 1920, rotation: -Math.PI / 2 - 0.085 },
  stand: { innerX: 36, innerZ: 42, start: Math.PI / 3, end: Math.PI * 5 / 3 },
  arena: { center: [94, -37] as const, radius: 29 },
  provenance: "Illustrated source-map reconstruction; not surveyed, not to scale or venue-approved.",
} as const;

export const SJB_STADIUM_CAMERAS = {
  stadium: { position: [-125, 125, 165], target: [7.6, 0, -17.8] },
  overhead: { position: [7.6, 240, -17.7], target: [7.6, 0, -17.8] },
  field: { position: [44, 40, 58], target: [7.6, 0, -17.8] },
  precinct: { position: [-200, 220, 245], target: [0, 0, 0] },
} satisfies Record<string, { position: [number, number, number]; target: [number, number, number] }>;
export type SjbStadiumCamera = keyof typeof SJB_STADIUM_CAMERAS;
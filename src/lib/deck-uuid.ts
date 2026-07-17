// Deterministic uuid v5-ish for mapping local nanoid → uuid so client and
// server agree on the same cloud id without an extra round-trip.
export function deckLocalToUuid(local: string): string {
  let h1 = 0x811c9dc5, h2 = 0x1b873593;
  for (let i = 0; i < local.length; i++) {
    h1 = Math.imul(h1 ^ local.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 ^ local.charCodeAt(local.length - 1 - i), 2246822519) >>> 0;
  }
  const NS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
  for (let i = 0; i < NS.length; i++) {
    h1 = Math.imul(h1 ^ NS.charCodeAt(i), 16777619) >>> 0;
  }
  const hex = (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).repeat(2).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function deckCloudId(userId: string, localDeckId: string): string {
  return deckLocalToUuid(`deck:${userId}:${localDeckId}`);
}

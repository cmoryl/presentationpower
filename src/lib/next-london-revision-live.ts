// Live push for published London signage revisions.
//
// Publishing a revision writes an append-only row server-side; this channel
// tells any already-open London kit page (same browser, any tab) to re-read the
// history immediately instead of waiting for a reload.

const CHANNEL = "tp-next-london-revision";

export type LondonRevisionPing = { rev: number; at: number };

/** Announce that a new revision is live. */
export function announceLondonRevision(rev: number): void {
  if (typeof window === "undefined") return;
  const payload: LondonRevisionPing = { rev, at: Date.now() };
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    /* no BroadcastChannel — same-tab listeners still fire below */
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANNEL, { detail: payload }));
  } catch {
    /* ignore */
  }
}

/** Subscribe to revision publishes. Returns an unsubscribe function. */
export function onLondonRevisionPublished(handler: (ping: LondonRevisionPing) => void): () => void {
  if (typeof window === "undefined") return () => {};
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => {
      const ping = event.data as LondonRevisionPing | null;
      if (ping && typeof ping.rev === "number") handler(ping);
    };
  } catch {
    channel = null;
  }
  const local = (event: Event) => {
    const ping = (event as CustomEvent<LondonRevisionPing>).detail;
    if (ping && typeof ping.rev === "number") handler(ping);
  };
  window.addEventListener(CHANNEL, local);
  return () => {
    window.removeEventListener(CHANNEL, local);
    channel?.close();
  };
}

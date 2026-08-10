// ──────────────────────────────────────────────────────────────────────
// Shared headshot / portrait pool.
// Used as demo imagery wherever a slide expects a person photo (team bios,
// testimonials, portrait stat layouts) and no authored photo is supplied.
// Deterministic pick by seed so a given card keeps the same face across
// re-renders, exports, and PDF captures.
// ──────────────────────────────────────────────────────────────────────
import h1 from "./headshot-01.jpg";
import h2 from "./headshot-02.jpg";
import h3 from "./headshot-03.jpg";
import h4 from "./headshot-04.jpg";
import h5 from "./headshot-05.jpg";
import h6 from "./headshot-06.jpg";

export const HEADSHOTS: string[] = [h1, h2, h3, h4, h5, h6];

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministic headshot for a seed (name, id, index — anything stable). */
export function pickHeadshot(seed: string): string {
  const pool = HEADSHOTS;
  return pool[hashSeed(seed || "portrait") % pool.length];
}

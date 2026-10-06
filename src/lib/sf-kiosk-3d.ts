// BoothHub single-booth 3D views for the NEXT San Francisco partner kiosks.
// BoothHub serves one partner on its own at `?kiosk=<slug>&single=1`.
// The live pairing list is the `event_booths` table (see event-booths.ts);
// this bundled copy is the offline fallback only.

const ORIGIN = "https://boothhub.lovable.app/showcase/next-sf";

export function sfKiosk3dUrl(slug: string, embed = false): string {
  return `${ORIGIN}?${embed ? "chromeless=1&" : ""}kiosk=${encodeURIComponent(slug)}&single=1`;
}

/**
 * Confirmed one-to-one pairs only; a kiosk without a confirmed BoothHub booth
 * gets no 3D link rather than a guessed one.
 */
export const SF_BOOTH_FALLBACK = [
  { sourceBoothId: "global-digital-experience-tradebooth-a", slug: "globallink", name: "GlobalLink Digital Experience", hasTv: false },
  { sourceBoothId: "veeva-tradebooth-a", slug: "veeva", name: "Veeva Vault Certified Translations", hasTv: true },
  { sourceBoothId: "coa", slug: "coa-live-life-sci", name: "COA — Where Science Meets Digital Health", hasTv: false },
  { sourceBoothId: "medical-writing", slug: "med-writing-life-sci", name: "Medical Writing", hasTv: false },
  { sourceBoothId: "contact-center", slug: "connect-contact-center-life-sci", name: "Connect Contact Center", hasTv: true },
  { sourceBoothId: "gl-live-tradebooth-a", slug: "gl-live-confrence", name: "GlobalLink Live Conference", hasTv: true },
  { sourceBoothId: "live-customer-tradebooth-a", slug: "livecustomerconnectuni", name: "Live Customer Connect", hasTv: true },
  { sourceBoothId: "global-content-delivery-tradebooth-a", slug: "global-content-delivery", name: "Global Content Delivery", hasTv: true },
  { sourceBoothId: "media-tradebooth-a", slug: "media", name: "Media Subtitling, Dubbing & Distribution", hasTv: true },
  { sourceBoothId: "learning-tradebooth-a", slug: "learning", name: "Learning Solutions", hasTv: true },
  { sourceBoothId: "legal-support-2-tradebooth-b", slug: "legal-support", name: "Legal Support", hasTv: false },
  { sourceBoothId: "sterling-2-tradebooth-a", slug: "stearling", name: "Sterling Share — Dealmaking & File Sharing", hasTv: true },
] as const;

export function sfKiosk3dSlugFor(londonBoothId: string | null | undefined): string | null {
  return (londonBoothId && SF_BOOTH_FALLBACK.find((b) => b.sourceBoothId === londonBoothId)?.slug) || null;
}

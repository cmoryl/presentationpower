// BoothHub single-booth 3D views for the NEXT San Francisco partner kiosks.
// BoothHub serves one partner on its own at `?kiosk=<slug>&single=1`.

const ORIGIN = "https://boothhub.lovable.app/showcase/next-sf";

export function sfKiosk3dUrl(slug: string, embed = false): string {
  return `${ORIGIN}?${embed ? "chromeless=1&" : ""}kiosk=${encodeURIComponent(slug)}&single=1`;
}

/**
 * London booth id (the kiosk's source) → BoothHub kiosk slug. Only pairs whose
 * names match one to one are listed; a kiosk without a confirmed BoothHub
 * booth gets no 3D link rather than a guessed one.
 */
const BOOTH_TO_SLUG: Record<string, string> = {
  "global-digital-experience-tradebooth-a": "globallink",
  "veeva-tradebooth-a": "veeva",
  coa: "coa-live-life-sci",
  "medical-writing": "med-writing-life-sci",
  "contact-center": "connect-contact-center-life-sci",
  "gl-live-tradebooth-a": "gl-live-confrence",
  "live-customer-tradebooth-a": "livecustomerconnectuni",
  "global-content-delivery-tradebooth-a": "global-content-delivery",
  "media-tradebooth-a": "media",
  "learning-tradebooth-a": "learning",
  "legal-support-2-tradebooth-b": "legal-support",
  "sterling-2-tradebooth-a": "stearling",
};

export function sfKiosk3dSlugFor(londonBoothId: string | null | undefined): string | null {
  return (londonBoothId && BOOTH_TO_SLUG[londonBoothId]) || null;
}

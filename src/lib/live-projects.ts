// -----------------------------------------------------------------------------
// Personal live projects
// -----------------------------------------------------------------------------
// Work in progress that belongs to one person, not to a public tool page. These
// campaign boards were built for a named owner, so they are listed on that
// person's own workspace page and nowhere else. Anybody else signing in sees
// nothing here — the board routes still open for anyone with the link.
// -----------------------------------------------------------------------------

export type LiveProject = {
  id: string;
  /** Email of the person the work belongs to, lowercase. */
  owner: string;
  eyebrow: string;
  title: string;
  summary: string;
  /** Route to the live board. */
  to: string;
  cta: string;
};

export const LIVE_PROJECTS: LiveProject[] = [
  {
    id: "legal-refresh",
    owner: "cmoryl@transperfect.com",
    eyebrow: "New campaign · TransPerfect Legal",
    title: "We're here for the thorny work.",
    summary:
      "Four look-and-feel directions for the LinkedIn test — four headline variations, all drawn, no stock photography and no legal clichés.",
    to: "/social/legal-refresh",
    cta: "See the four directions",
  },
  {
    id: "legal-alongside",
    owner: "cmoryl@transperfect.com",
    eyebrow: "New campaign · TransPerfect Legal",
    title: "You're not on it alone.",
    summary:
      "Sixteen documentary frames — one expert committed to something hard, one person already in position — each with its own headline, caption and nine switchable layouts.",
    to: "/social/legal-alongside",
    cta: "Open the campaign board",
  },
  {
    id: "legal-bloom",
    owner: "cmoryl@transperfect.com",
    eyebrow: "New variation · TransPerfect Legal",
    title: "We're here for the tricky ones.",
    summary:
      "Eight documentary frames cut into soft apertures on colour blooms — one phrase across the set, one turning word per ad, five trims and a full-size download.",
    to: "/social/legal-bloom",
    cta: "Open the bloom board",
  },
];

/** The live projects that belong to this signed-in person. */
export function liveProjectsFor(email: string | null | undefined): LiveProject[] {
  const who = email?.trim().toLowerCase();
  if (!who) return [];
  return LIVE_PROJECTS.filter((p) => p.owner === who);
}

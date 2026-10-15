// Role-split main menu: which top-bar links and Elements items each role sees.
// One rule set, used by AppShell (desktop and phone menus). This only hides
// menu entries — every page and server function still checks access itself.

export type NavAudience = {
  isAdmin: boolean;
  /** Sales / viewer accounts: create from approved sets only. */
  createOnly: boolean;
  /** brand_lead or brand_reviewer (admins see everything anyway). */
  isBrandReviewer: boolean;
  /** Roles still loading — show only the safe, shared entries. */
  isLoading: boolean;
};

export function audienceFor(roles: readonly string[], isLoading: boolean): NavAudience {
  const set = new Set(roles.map(String));
  const isAdmin = set.has("admin");
  const editor = isAdmin || ["editor", "content_owner", "brand_lead", "brand_reviewer"].some((r) => set.has(r));
  return {
    isAdmin: isAdmin && !isLoading,
    createOnly: !isLoading && !editor && (set.has("sales") || set.has("viewer")),
    isBrandReviewer: !isLoading && !isAdmin && (set.has("brand_lead") || set.has("brand_reviewer")),
    isLoading,
  };
}

/** Elements items that build or govern the system rather than make a piece. */
const AUTHORING_ITEMS = new Set([
  "/decks",
  "/library/print/modules",
  "/events/production",
  "/events/presets",
  "/social/presets",
  "/convert",
]);

export function showTopLink(to: string, a: NavAudience): boolean {
  if (to === "/admin") return a.isAdmin;
  if (to === "/approvals" || to === "/admin/approved-figures") return a.isBrandReviewer;
  if (to === "/demos") return !a.createOnly;
  return true;
}

export function showElementItem(to: string, a: NavAudience): boolean {
  if (to.startsWith("/admin")) return a.isAdmin;
  if (a.createOnly && AUTHORING_ITEMS.has(to)) return false;
  return true;
}

/** Extra top-bar links for brand reviewers (admins reach these via Admin). */
export const BRAND_REVIEW_LINKS = [
  { to: "/approvals", label: "Approvals" },
  { to: "/admin/approved-figures", label: "Approved figures" },
] as const;

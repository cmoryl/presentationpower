/**
 * WORKSPACE CAPABILITIES — what a signed-in user may do, derived from their
 * `user_roles` rows (never from the persona toggle alone).
 *
 * Sales enablement is a *create-only* audience: they start new decks, print
 * pieces and kits from pre-approved template sets and modules, but they do not
 * author or edit the system itself (templates, modules, brand assets, canvas
 * geometry). Admins keep every capability, and when an admin is looking at the
 * Sales workspace they additionally unlock the admin-level preset template sets
 * that sales users do not see.
 *
 * This is an affordance layer. Every privileged server function still verifies
 * `has_role(auth.uid(), 'admin')` on its own.
 */

/** Roles allowed to freely edit content and authored system objects. */
export const EDIT_ROLES = [
  "admin",
  "editor",
  "content_owner",
  "brand_lead",
  "brand_reviewer",
] as const;

/** Roles that are explicitly consume-and-create-only. */
export const CREATE_ONLY_ROLES = ["sales", "viewer"] as const;

export type WorkspaceCapabilities = {
  isAdmin: boolean;
  /** True for sales-enablement / viewer users: create from approved sets only. */
  createOnly: boolean;
  /** Free-form editing of slide/print content, canvas geometry, typography. */
  canEditContent: boolean;
  /** Authoring the system: templates, modules, brand assets, admin studios. */
  canAuthorSystem: boolean;
  /** Admin-only extra preset template sets shown inside the Sales workspace. */
  canUseAdminPresets: boolean;
  /** Short, user-facing explanation of the restriction (empty when unrestricted). */
  reason: string;
};

export function capabilitiesFor(
  roles: readonly string[],
  persona?: string,
): WorkspaceCapabilities {
  const set = new Set(roles.map((r) => String(r)));
  const isAdmin = set.has("admin");
  const canEdit = isAdmin || EDIT_ROLES.some((r) => set.has(r));
  const isCreateOnlyRole = CREATE_ONLY_ROLES.some((r) => set.has(r));
  const createOnly = !canEdit && isCreateOnlyRole;

  return {
    isAdmin,
    createOnly,
    canEditContent: !createOnly,
    canAuthorSystem: canEdit,
    canUseAdminPresets: isAdmin && persona === "sales",
    reason: createOnly
      ? "Sales enablement accounts build from pre-approved templates and modules. Editing the underlying design is handled by admins and design."
      : "",
  };
}

/** Default, most-restrictive capabilities used while roles are still loading. */
export const UNKNOWN_CAPABILITIES: WorkspaceCapabilities = {
  isAdmin: false,
  createOnly: false,
  canEditContent: true,
  canAuthorSystem: false,
  canUseAdminPresets: false,
  reason: "",
};

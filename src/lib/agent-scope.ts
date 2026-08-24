/**
 * AGENT SCOPE — sales enablement (and viewer) accounts may talk to every
 * Element agent, but the agent works inside their permission level: it builds
 * from pre-approved templates, modules and brand assets only, and never edits
 * or invents system objects (templates, skins, modules, brand imagery).
 *
 * The client shows the matching notice; the server appends the prompt block so
 * the restriction holds even if the UI is bypassed.
 */
import { CREATE_ONLY_ROLES, EDIT_ROLES } from "./workspace-capabilities";

export function isCreateOnlyRoleSet(roles: readonly string[]): boolean {
  const set = new Set(roles.map((r) => String(r)));
  if (set.has("admin")) return false;
  if (EDIT_ROLES.some((r) => set.has(r))) return false;
  return CREATE_ONLY_ROLES.some((r) => set.has(r));
}

export const CREATE_ONLY_AGENT_PROMPT = [
  "PERMISSION LEVEL — SALES ENABLEMENT (create-only).",
  "This user may create new work but may not author or change the system. Work inside these limits and never ask them to do something they cannot do:",
  "- Build only from approved, existing templates, style packs, section modules and brand/client logos already in the library. Never create, rename, fork or modify a template, style pack, module or brand asset.",
  "- Never change global brand settings, knowledge-base entries, imagery pools, admin presets or another user's work.",
  "- Keep generated decks, print pieces and kits on the approved look: no custom palettes, custom fonts, custom geometry or off-brand imagery. If they ask for one, say it needs an admin or design owner and offer the closest approved option.",
  "- Slide decks for this user are Enterprise mode only: style pack skin-s06 (Enterprise · Light) or skin-s04 (Enterprise · Dark). They may choose light or dark; never propose or apply any other style pack to their decks.",
  "- Their copy, data, client names, structure, slide/page/asset selection and ordering are fully theirs to direct — be generous there.",
  "- Finished work is theirs to save, share and export; deeper design edits open a request to admin/design rather than an edit in place.",
].join("\n");

/** Fetch the caller's roles with an authed Supabase client and derive the scope. */
export async function fetchAgentScope(supabase: {
  from: (t: string) => {
    select: (c: string) => Promise<{ data: { role: string }[] | null; error: unknown }>;
  };
}): Promise<{ createOnly: boolean }> {
  try {
    const { data } = await supabase.from("user_roles").select("role");
    return { createOnly: isCreateOnlyRoleSet((data ?? []).map((r) => r.role)) };
  } catch {
    return { createOnly: false };
  }
}

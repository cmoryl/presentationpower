// Shared authorization helper: admins get the same editing and process access
// as the owner of a record.
//
// Server functions used to compare `owner_id === userId` outright, which locked
// admins out of editing, translating, sharing and reviewing other people's
// decks and print assets even though they administer the platform. Use these
// helpers instead of a bare ownership comparison.

type RpcSupabase = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

/** True when the signed-in user holds the `admin` role. */
export async function isPlatformAdmin(supabase: unknown, userId: string): Promise<boolean> {
  try {
    const { data } = await (supabase as RpcSupabase).rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    return data === true;
  } catch {
    return false;
  }
}

/** True when the user owns the record OR is a platform admin. */
export async function canManageRecord(
  supabase: unknown,
  userId: string,
  ownerId: string | null | undefined,
): Promise<boolean> {
  if (ownerId && ownerId === userId) return true;
  return isPlatformAdmin(supabase, userId);
}

/** Throws `Forbidden` unless the user owns the record or is a platform admin. */
export async function assertCanManageRecord(
  supabase: unknown,
  userId: string,
  ownerId: string | null | undefined,
): Promise<void> {
  if (!(await canManageRecord(supabase, userId, ownerId))) {
    throw new Error("Forbidden");
  }
}

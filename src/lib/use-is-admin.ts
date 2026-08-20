// Client-side admin check. Reads the caller's own rows from `user_roles`
// (RLS-scoped) so admin-only affordances can be revealed in normal, non-admin
// surfaces. Server-side writes are still gated by RLS + has_role().

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIsAdmin() {
  const q = useQuery({
    queryKey: ["my-roles"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return [] as string[];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) return [] as string[];
      return (data ?? []).map((r: { role: string }) => r.role);
    },
  });
  const roles = q.data ?? [];
  return { roles, isAdmin: roles.includes("admin"), isLoading: q.isLoading };
}

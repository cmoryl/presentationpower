import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { useSessionUser } from "@/hooks/use-session-user";
import { checkNextDivisionEdit } from "@/lib/next-permissions.functions";

export function useCanEditNextDivision(divisionId: string) {
  const fn = useServerFn(checkNextDivisionEdit);
  const userId = useSessionUser();
  const q = useQuery({
    queryKey: ["next-division-edit", divisionId, userId ?? null],
    queryFn: async () => {
      try {
        return await fn({ data: { divisionId } });
      } catch {
        // Signed out, or no edit grant — a viewer, not an error.
        return false;
      }
    },
    // The check is auth-only: calling it without a session guarantees a 401,
    // so wait until a signed-in user exists.
    enabled: !!divisionId && !!userId,
    retry: false,
    staleTime: 5 * 60_000,
  });
  return { canEdit: q.data === true, isLoading: userId === undefined || q.isLoading };
}

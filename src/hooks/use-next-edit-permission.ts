import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { checkNextDivisionEdit } from "@/lib/next-permissions.functions";

export function useCanEditNextDivision(divisionId: string) {
  const fn = useServerFn(checkNextDivisionEdit);
  const q = useQuery({
    queryKey: ["next-division-edit", divisionId],
    queryFn: async () => {
      try {
        return await fn({ data: { divisionId } });
      } catch {
        return false;
      }
    },
    enabled: !!divisionId,
    staleTime: 5 * 60_000,
  });
  return { canEdit: q.data === true, isLoading: q.isLoading };
}

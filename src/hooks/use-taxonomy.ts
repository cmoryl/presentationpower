import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getTaxonomy, type TaxonomyPayload } from "@/lib/taxonomy.functions";

export const taxonomyQueryOptions = queryOptions({
  queryKey: ["taxonomy"],
  queryFn: () => getTaxonomy(),
  staleTime: 5 * 60_000,
});

export function useTaxonomy(): TaxonomyPayload {
  const { data } = useSuspenseQuery(taxonomyQueryOptions);
  return data;
}

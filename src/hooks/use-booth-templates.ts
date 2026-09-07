// Booth templates from the backend, applied to the in-memory booth set.
//
// The London page renders the bundled booth specs immediately (so a vendor
// never waits on a fetch), then patches them with the saved templates as soon
// as they arrive — geometry, style, master, proof and overlay together.

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  applyBoothTemplates,
  type BoothTemplateRecord,
} from "@/lib/booth-templates";
import {
  listBoothTemplates,
  saveBoothTemplate,
  type BoothTemplatePatch,
} from "@/lib/booth-templates.functions";

export const BOOTH_TEMPLATES_KEY = ["booth-templates", "london-2026"] as const;

export function useBoothTemplates(venue = "london-2026") {
  const fetchTemplates = useServerFn(listBoothTemplates);
  const save = useServerFn(saveBoothTemplate);
  const qc = useQueryClient();
  // Bumped after a patch so consumers of the mutated panel objects re-render.
  const [applied, setApplied] = useState(0);

  const query = useQuery({
    queryKey: BOOTH_TEMPLATES_KEY,
    queryFn: () => fetchTemplates({ data: { venue } }) as Promise<BoothTemplateRecord[]>,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!query.data?.length) return;
    applyBoothTemplates(query.data);
    setApplied((n) => n + 1);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: (patch: BoothTemplatePatch) => save({ data: patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: BOOTH_TEMPLATES_KEY }),
  });

  return {
    templates: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    /** Increments each time backend templates are applied to the booth set. */
    applied,
    save: mutation.mutateAsync,
    saving: mutation.isPending,
    saveError: mutation.error instanceof Error ? mutation.error.message : null,
  };
}

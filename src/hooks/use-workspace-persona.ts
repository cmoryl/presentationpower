// Resolves which dashboard persona to show: the user's own choice if they made
// one, otherwise the default implied by their `user_roles` rows. Choices are
// clamped to the personas the user's roles actually unlock.

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  PERSONA_STORAGE_KEY,
  allowedPersonas,
  isPersonaId,
  personaForRoles,
  type PersonaId,
} from "@/lib/workspace-persona";

export function useMyRoles() {
  const q = useQuery({
    queryKey: ["my-roles"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [] as string[];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id);
      if (error) return [] as string[];
      return (data ?? []).map((r: { role: string }) => String(r.role));
    },
  });
  return { roles: q.data ?? [], isLoading: q.isLoading };
}

export function useWorkspacePersona() {
  const { roles, isLoading } = useMyRoles();
  const [override, setOverride] = useState<PersonaId | null>(null);

  // Read the stored choice after hydration so SSR and client markup agree.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(PERSONA_STORAGE_KEY);
    if (isPersonaId(stored)) setOverride(stored);
  }, []);

  const allowed = allowedPersonas(roles);
  const defaultPersona = personaForRoles(roles);
  // A stored pick only holds when the user's roles unlock that workspace;
  // otherwise fall back to the role-implied default.
  const wanted = override ?? defaultPersona;
  const persona: PersonaId = allowed.includes(wanted) ? wanted : defaultPersona;

  const choose = useCallback(
    (next: PersonaId) => {
      if (!allowedPersonas(roles).includes(next)) return; // locked workspace
      setOverride(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PERSONA_STORAGE_KEY, next);
      }
    },
    [roles],
  );

  const reset = useCallback(() => {
    setOverride(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(PERSONA_STORAGE_KEY);
    }
  }, []);

  return {
    persona,
    defaultPersona,
    isOverridden: persona !== defaultPersona,
    roles,
    allowed,
    isLoading,
    choose,
    reset,
  };
}

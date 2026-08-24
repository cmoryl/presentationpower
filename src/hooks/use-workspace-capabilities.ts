// Resolves the current user's capabilities from their roles plus the persona
// workspace they are looking at. See src/lib/workspace-capabilities.ts.

import { useMemo } from "react";
import { useWorkspacePersona } from "@/hooks/use-workspace-persona";
import {
  capabilitiesFor,
  UNKNOWN_CAPABILITIES,
  type WorkspaceCapabilities,
} from "@/lib/workspace-capabilities";

export function useWorkspaceCapabilities(): WorkspaceCapabilities & { isLoading: boolean } {
  const { roles, persona, isLoading } = useWorkspacePersona();
  return useMemo(() => {
    if (isLoading) return { ...UNKNOWN_CAPABILITIES, isLoading: true };
    return { ...capabilitiesFor(roles, persona), isLoading: false };
  }, [roles, persona, isLoading]);
}

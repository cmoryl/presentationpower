import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getApprovedFigures,
  loadApprovedFigures,
  subscribeApprovedFigures,
  type ApprovedFigure,
} from "@/lib/approved-figures";

const EMPTY: readonly ApprovedFigure[] = [];

/** Loads the shared approved-figures list once and re-renders when it changes. */
export function useApprovedFigures(): readonly ApprovedFigure[] {
  useEffect(() => {
    void loadApprovedFigures(supabase);
  }, []);
  return useSyncExternalStore(subscribeApprovedFigures, getApprovedFigures, () => EMPTY);
}

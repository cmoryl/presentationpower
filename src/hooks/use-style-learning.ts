import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useSessionUser } from "@/hooks/use-session-user";
import {
  getStyleLearning,
  getStyleLearningPrefs,
  recordStyleSignal,
  setStyleLearningPrefs,
} from "@/lib/style-learning.functions";
import {
  EMPTY_LEARNING,
  learningActive,
  profileKey as makeProfileKey,
  type LearningProfile,
  type LearnedStyleWeights,
  type StyleSignal,
} from "@/lib/style-learning";

/**
 * Adaptive learning client hook.
 *
 * Signals are fire-and-forget: a failed log (signed out, offline) must never
 * break style selection. Cold start is the default — until the sample floors
 * are met `learning` stays inert and the recommender runs on catalog rules.
 */
export function useStyleLearning(profile: LearningProfile) {
  const qc = useQueryClient();
  const userId = useSessionUser();
  const signedIn = !!userId;
  const getLearning = useServerFn(getStyleLearning);
  const getPrefs = useServerFn(getStyleLearningPrefs);
  const setPrefs = useServerFn(setStyleLearningPrefs);
  const record = useServerFn(recordStyleSignal);

  const key = useMemo(() => makeProfileKey(profile), [profile]);

  const learningQ = useQuery({
    queryKey: ["style-learning", key, userId ?? "anon"],
    queryFn: () => getLearning({ data: { profileKey: key } }),
    // Protected server fn: signed-out callers would 401.
    enabled: signedIn,
    retry: false,
    staleTime: 60_000,
  });

  const prefsQ = useQuery({
    queryKey: ["style-learning", "prefs", userId ?? "anon"],
    queryFn: () => getPrefs(),
    enabled: signedIn,
    retry: false,
    staleTime: 60_000,
  });


  const learning: LearnedStyleWeights = learningQ.data ?? { ...EMPTY_LEARNING, profileKey: key };

  const logSignal = useCallback(
    (
      signal: StyleSignal,
      extra: {
        styleCode?: string | null;
        recommendedCodes?: string[];
        rankShown?: number | null;
        deckId?: string | null;
        brief?: Record<string, unknown>;
        /** Never learn from brand / accessibility violations. */
        violatesRules?: boolean;
      } = {},
    ) => {
      if (!signedIn) return; // fire-and-forget: nothing to log while signed out
      void record({
        data: {
          signal,
          styleCode: extra.styleCode ?? null,
          recommendedCodes: extra.recommendedCodes ?? [],
          rankShown: extra.rankShown ?? null,
          profileKey: key,
          brief: extra.brief ?? (profile as Record<string, unknown>),
          deckId: extra.deckId ?? null,
          violatesRules: extra.violatesRules ?? false,
        },
      }).catch(() => {});
    },
    [record, key, profile, signedIn],
  );


  const prefsM = useMutation({
    mutationFn: (input: { learningEnabled?: boolean; resetHistory?: boolean }) =>
      setPrefs({ data: { resetHistory: false, ...input } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["style-learning"] }),
  });

  return {
    profileKey: key,
    learning,
    /** False while cold start / opted out — the UI should say so. */
    active: learningActive(learning),
    enabled: prefsQ.data?.learning_enabled ?? true,
    logSignal,
    setLearningEnabled: (on: boolean) => prefsM.mutate({ learningEnabled: on }),
    resetLearned: () => prefsM.mutate({ resetHistory: true, learningEnabled: true }),
    busy: prefsM.isPending,
  };
}

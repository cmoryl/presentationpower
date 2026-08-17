/**
 * Fire-and-forget outcome logging for adaptive style learning.
 *
 * Used outside the picker (export, reuse, restyle) where no hook is mounted.
 * Failures are swallowed: telemetry must never block a deliverable. Signals
 * flagged as rule violations are stored but marked unlearnable.
 */
import { isSkinPackId, skinCodeFromPackId } from "@/lib/design-skin-pack";
import { profileKey, type LearningProfile, type StyleSignal } from "@/lib/style-learning";

export interface StyleOutcomeInput {
  signal: StyleSignal;
  /** Active StylePack id, or null for the approved brand system. */
  stylePackId?: string | null;
  deckId?: string | null;
  profile?: LearningProfile;
  /** True when the deck failed brand / accessibility rules — never learned from. */
  violatesRules?: boolean;
}

export async function logStyleOutcome(input: StyleOutcomeInput): Promise<void> {
  try {
    const code =
      input.stylePackId && isSkinPackId(input.stylePackId)
        ? skinCodeFromPackId(input.stylePackId)
        : null;
    if (!code) return; // Brand-system decks carry no S-code to learn about.
    const { recordStyleSignal } = await import("@/lib/style-learning.functions");
    await recordStyleSignal({
      data: {
        signal: input.signal,
        styleCode: code,
        recommendedCodes: [],
        rankShown: null,
        profileKey: profileKey(input.profile ?? {}),
        brief: (input.profile ?? {}) as Record<string, unknown>,
        deckId: input.deckId ?? null,
        violatesRules: Boolean(input.violatesRules),
      },
    });
  } catch {
    /* telemetry is best-effort */
  }
}

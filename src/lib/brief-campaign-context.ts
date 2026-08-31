// ---------------------------------------------------------------------------
// BRIEF → CAMPAIGN CONTEXT
//
// When a master brief selects the Event or Social output type, the brief hub
// deep-links into the matching playbook demo. Until now those links carried
// only the playbook id, so a kit built for "Northwind Health" opened wearing
// the generic demo facts (GlobalLink AI 2.0, #GlobalLinkAI …) and the user had
// no signal that the page belonged to their brief.
//
// This module carries the small set of brief facts through the URL and layers
// them over the authored playbook: the prospect becomes the campaign name, the
// meeting objective becomes the headline/intent, and the brief's brand mode
// wins over the playbook's default division. Everything else — art direction,
// cadence, collateral list — stays exactly as authored.
// ---------------------------------------------------------------------------

import { BRAND_MODES } from "@/lib/taxonomy";
import type { EventPlaybook } from "@/lib/event-playbooks";
import type { SocialPlaybook } from "@/lib/social-playbooks";

export type BriefCampaignSearch = {
  /** Prospect / account the brief was written for. */
  prospect?: string;
  /** Meeting objective or one-line brief. Becomes the campaign headline. */
  objective?: string;
  /** BrandMode.id chosen in the brief (Step 2). */
  brandModeId?: string;
  /** Deck id of the originating brief, so the kit can link back to the hub. */
  briefId?: string;
};

const clean = (v: unknown, max = 200): string | undefined => {
  if (typeof v !== "string") return undefined;
  const s = v.trim().slice(0, max);
  return s ? s : undefined;
};

/** Route-level `validateSearch` for the playbook demo routes. */
export function validateBriefCampaignSearch(raw: Record<string, unknown>): BriefCampaignSearch {
  const out: BriefCampaignSearch = {};
  const prospect = clean(raw.prospect, 120);
  const objective = clean(raw.objective, 240);
  const brandModeId = clean(raw.brandModeId, 60);
  const briefId = clean(raw.briefId, 60);
  if (prospect) out.prospect = prospect;
  if (objective) out.objective = objective;
  if (brandModeId && BRAND_MODES.some((b) => b.id === brandModeId)) out.brandModeId = brandModeId;
  if (briefId) out.briefId = briefId;
  return out;
}

/** Build the link search object, dropping anything empty so URLs stay clean. */
export function briefCampaignSearch(input: {
  prospect?: string | null;
  objective?: string | null;
  brandModeId?: string | null;
  briefId?: string | null;
}): BriefCampaignSearch {
  return validateBriefCampaignSearch({
    prospect: input.prospect ?? undefined,
    objective: input.objective ?? undefined,
    brandModeId: input.brandModeId ?? undefined,
    briefId: input.briefId ?? undefined,
  });
}

export const hasBriefContext = (s: BriefCampaignSearch | undefined): boolean =>
  !!(s && (s.prospect || s.objective || s.brandModeId));

/** Layer brief facts over an authored event playbook. */
export function applyBriefToEventPlaybook(
  playbook: EventPlaybook,
  s: BriefCampaignSearch | undefined,
): EventPlaybook {
  if (!hasBriefContext(s) || !s) return playbook;
  const campaignName = s.prospect ? `${s.prospect} · ${playbook.name}` : playbook.facts.name;
  return {
    ...playbook,
    subBrand: s.brandModeId ?? playbook.subBrand,
    intent: s.objective ?? playbook.intent,
    facts: {
      ...playbook.facts,
      name: campaignName || playbook.facts.name,
      subBrand: s.brandModeId ?? playbook.facts.subBrand,
    },
    ...(s.objective
      ? {
          socialCopy: {
            title: s.objective,
            summary: playbook.socialCopy?.summary ?? playbook.tagline,
            cta: playbook.socialCopy?.cta,
          },
        }
      : {}),
  };
}

/** Layer brief facts over an authored social playbook. */
export function applyBriefToSocialPlaybook(
  playbook: SocialPlaybook,
  s: BriefCampaignSearch | undefined,
): SocialPlaybook {
  if (!hasBriefContext(s) || !s) return playbook;
  return {
    ...playbook,
    subBrand: s.brandModeId ?? playbook.subBrand,
    intent: s.objective ?? playbook.intent,
    name: s.prospect ? `${s.prospect} · ${playbook.name}` : playbook.name,
    copy: {
      ...playbook.copy,
      title: s.objective ?? playbook.copy.title,
    },
  };
}

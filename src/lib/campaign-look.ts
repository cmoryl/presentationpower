// Cross-channel campaign art direction.
//
// A division's campaign is authored once and then rendered across four
// channels: social posts, event collateral, digital/web trims (hero, email,
// LinkedIn header, signature strip) and print comps. Each demo route used to
// keep its OWN localStorage key for the chosen look, so retargeting the art
// direction on the social kit left the digital and web pieces on the authored
// default — the same campaign shipped in two visual languages.
//
// This module is the single memory for "what does this brand's campaign look
// like right now". Whoever picks a look/template style writes it here, and
// every other channel — including assets generated LATER — reads it first and
// falls back to the authored division look only when nothing is stored.

import {
  channelLook,
  eventLookById,
  reinkLook,
  EVENT_LOOKS_BY_ID,
  type EventLook,
} from "./event-looks";
import { DEFAULT_SOCIAL_STYLE_ID, resolveSocialStyle, type SocialStyleId } from "./social-styles";

export type CampaignArtDirection = {
  look: EventLook;
  /** Social template style id — the geometry/type contract shared by every
   *  digital + web trim so they match the generated social assets. */
  styleId: SocialStyleId;
  /** True when the direction came from a stored user choice rather than the
   *  authored default (used by the demo UIs to label the inherited look). */
  inherited: boolean;
};

type Stored = { lookId?: string; styleId?: string };

const KEY = "element:campaign-look";

function brandKey(brandId: string | null | undefined): string {
  return `${KEY}:${brandId || "bm-tp-master"}`;
}

function read(brandId: string | null | undefined): Stored {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(brandKey(brandId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Stored;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Persist the campaign direction for a division. Called by whichever channel
 *  the user retargets; every other channel picks it up. */
export function saveCampaignLook(
  brandId: string | null | undefined,
  patch: { lookId?: string; styleId?: string },
): void {
  if (typeof window === "undefined") return;
  const next = { ...read(brandId), ...patch };
  try {
    window.localStorage.setItem(brandKey(brandId), JSON.stringify(next));
  } catch {
    /* storage disabled — the authored default still applies */
  }
}

export function readCampaignLookId(brandId: string | null | undefined): string | null {
  const id = read(brandId).lookId;
  return id && EVENT_LOOKS_BY_ID[id] ? id : null;
}

export function readCampaignStyleId(brandId: string | null | undefined): SocialStyleId | null {
  const id = read(brandId).styleId;
  return id ? (resolveSocialStyle(id).id as SocialStyleId) : null;
}

/**
 * The art direction a channel should render with.
 *
 * Order of authority:
 *   1. a stored campaign choice for this division (set on ANY channel),
 *   2. the authored division look (`channelLook`) — events/social/print agree,
 *   3. a deterministic derived look for unmapped keys.
 *
 * The division accent always re-inks the result, so inheriting a look changes
 * the field graphic, type and radius — never the brand colour.
 */
export function campaignArtDirection(args: {
  /** Deterministic fallback key, e.g. `social:${playbookId}`. */
  key: string;
  brandId?: string | null;
  intentId?: string | null;
  accent?: string;
  label?: string;
  /** Per-channel override the user picked in this view. */
  lookId?: string | null;
  styleId?: string | null;
}): CampaignArtDirection {
  const base = channelLook({
    key: args.key,
    brandId: args.brandId,
    intentId: args.intentId,
    accent: args.accent,
    label: args.label,
  });
  const storedLookId = readCampaignLookId(args.brandId);
  const activeLookId = args.lookId ?? storedLookId;
  const look =
    !activeLookId || activeLookId === base.id
      ? base
      : reinkLook(eventLookById(activeLookId), args.accent ?? base.accent);
  const styleId =
    (args.styleId as SocialStyleId | null | undefined) ??
    readCampaignStyleId(args.brandId) ??
    (look.styleId as SocialStyleId | undefined) ??
    DEFAULT_SOCIAL_STYLE_ID;
  return {
    look,
    styleId: resolveSocialStyle(styleId).id as SocialStyleId,
    inherited: !args.lookId && !!storedLookId,
  };
}

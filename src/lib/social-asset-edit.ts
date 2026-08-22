// Per-asset edit overrides for social/campaign assets.
//
// A SocialAssetEdit is a sparse patch over the deterministic asset the
// pipeline produced: copy fields, an optional caption line, and geometry
// controls for the photo panel + type scale. The renderer merges the patch at
// paint time, so nothing about the generation pipeline has to change and an
// asset with no edits renders byte-identically to before.

import { useCallback, useEffect, useState } from "react";
import type { CampaignCopy } from "./campaigns";

export type SocialAssetEdit = {
  eyebrow?: string;
  title?: string;
  summary?: string;
  cta?: string;
  statValue?: string;
  statLabel?: string;
  /** Small line under the copy stack — a caption / legal / handle line. */
  caption?: string;

  /** Photo composition. */
  /** Photo source override — lets an asset with no generated photography
   *  attach one (or an existing one be swapped/cleared with ""). */
  imageUrl?: string;
  imageLayout?: "bleed" | "panel";
  panelSide?: "right" | "top";
  /** Panel size as a % of the usable frame on its axis (24–70). */
  panelSizePct?: number;
  /** Photo focal point inside its crop (0–100). */
  focalXPct?: number;
  focalYPct?: number;

  /** Copy block controls. */
  copyAlign?: "start" | "end";
  /** Multiplier on the whole copy stack's type scale (0.7–1.35). */
  typeScale?: number;
};

export const EMPTY_SOCIAL_EDIT: SocialAssetEdit = {};

export function hasSocialEdit(edit?: SocialAssetEdit | null): boolean {
  if (!edit) return false;
  return Object.values(edit).some((v) => v !== undefined && v !== "");
}

/** Merge the text half of an edit over generated copy. */
export function applySocialCopyEdit(copy: CampaignCopy, edit?: SocialAssetEdit): CampaignCopy {
  if (!edit) return copy;
  const trimmed = (v?: string) => (v === undefined ? undefined : v);
  const statValue = edit.statValue ?? copy.stat?.value;
  const statLabel = edit.statLabel ?? copy.stat?.label;
  return {
    ...copy,
    eyebrow: trimmed(edit.eyebrow) ?? copy.eyebrow,
    title: edit.title?.trim() ? edit.title : copy.title,
    summary: trimmed(edit.summary) ?? copy.summary,
    cta: trimmed(edit.cta) ?? copy.cta,
    stat:
      statValue && statLabel
        ? { value: statValue, label: statLabel }
        : statValue || statLabel
          ? undefined
          : copy.stat,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Persistence — edits live in localStorage keyed by a stable asset key so a
// user's tuning survives navigation and regeneration of the same kit.
// ────────────────────────────────────────────────────────────────────────────
const STORE_KEY = "element.social.asset.edits.v1";

type EditMap = Record<string, SocialAssetEdit>;

function readStore(): EditMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as EditMap) : {};
  } catch {
    return {};
  }
}

function writeStore(map: EditMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode — edits stay in-memory for the session */
  }
}

/** Stable key for an asset within a surface (kit, demo playbook, …). */
export function socialEditKey(scope: string, assetId: string): string {
  return `${scope}::${assetId}`;
}

/** Reactive access to the edit map. Hydration-safe: reads in an effect. */
export function useSocialAssetEdits() {
  const [map, setMap] = useState<EditMap>({});

  useEffect(() => {
    setMap(readStore());
  }, []);

  const get = useCallback((key: string): SocialAssetEdit => map[key] ?? EMPTY_SOCIAL_EDIT, [map]);

  const set = useCallback((key: string, edit: SocialAssetEdit) => {
    setMap((prev) => {
      const next = { ...prev, [key]: edit };
      if (!hasSocialEdit(edit)) delete next[key];
      writeStore(next);
      return next;
    });
  }, []);

  const reset = useCallback((key: string) => {
    setMap((prev) => {
      const next = { ...prev };
      delete next[key];
      writeStore(next);
      return next;
    });
  }, []);

  return { get, set, reset, edits: map };
}

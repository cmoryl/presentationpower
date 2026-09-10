// Auto-publish a London sign the moment it is saved.
//
// Editing a sign writes to the shared placement / board-size / artwork stores.
// This watcher takes that saved state, publishes it as the next revision, and
// pushes the new revision to every open kit page — so hub cards and the vendor
// downloads always carry the newest version. History stays append-only: nothing
// is rolled back, each save moves forward.

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { useSessionUser } from "@/hooks/use-session-user";
import { useLondonBoardSizes, londonBoardSizes } from "@/lib/next-london-board-size";
import { useLondonLogoPlacements, londonLogoPlacements } from "@/lib/next-london-logo-placement";
import { useLondonPlacedArt, londonPlacedArtMap } from "@/lib/next-london-placed-art";
import { useStepRepeatConfigs, stepRepeatConfigs } from "@/lib/next-london-step-repeat";
import { useLondonRemovals } from "@/lib/next-london-removals";
import {
  londonPublishedOverridesReady,
  setLondonPublishedOverrides,
  useLondonPublishedOverrides,
} from "@/lib/next-london-published-overrides";
import { publishLondonRevision } from "@/lib/next-london-revise.functions";
import { announceLondonRevision } from "@/lib/next-london-revision-live";
import type { LondonOverrides } from "@/lib/next-london-revise";
import type { LondonPanel } from "@/lib/next-london-signage";

/** How long the editor stays quiet before a save is published. */
const SETTLE_MS = 1500;

/** The design overrides saved in this browser, exactly as a revision stores them. */
export function londonOverridesSnapshot(): LondonOverrides {
  return {
    placements: londonLogoPlacements(),
    boardSizes: londonBoardSizes(),
    stepRepeat: stepRepeatConfigs(),
    placedArt: londonPlacedArtMap(),
  };
}

const signature = (overrides: LondonOverrides) =>
  JSON.stringify([
    overrides.placements ?? {},
    overrides.boardSizes ?? {},
    overrides.stepRepeat ?? {},
    overrides.placedArt ?? {},
  ]);

export interface LondonAutoPublishProps {
  /** The panel set in force, resolved exactly as the page shows it. */
  panels: LondonPanel[];
  /** Ids the revision in force has removed, carried forward. */
  removedIds?: string[];
}

/**
 * Mount once on any page that can edit London signs. Renders nothing.
 */
export function LondonAutoPublish({ panels, removedIds = [] }: LondonAutoPublishProps) {
  const publish = useServerFn(publishLondonRevision);
  const userId = useSessionUser();
  // Subscribing to every editable store is what makes a save fire this.
  const placements = useLondonLogoPlacements();
  const boards = useLondonBoardSizes();
  const placedArt = useLondonPlacedArt();
  const stepRepeat = useStepRepeatConfigs();
  const publishedOverrides = useLondonPublishedOverrides();

  const busy = useRef(false);
  const lastTried = useRef<string | null>(null);
  const warned = useRef(false);
  const latest = useRef({ panels, removedIds });
  latest.current = { panels, removedIds };

  useEffect(() => {
    // Signed-out visitors are vendors reading the kit — they never publish.
    if (!userId) return;
    if (!londonPublishedOverridesReady()) return;
    if (busy.current) return;
    const snapshot = londonOverridesSnapshot();
    const next = signature(snapshot);
    if (next === signature(publishedOverrides)) return;
    if (next === lastTried.current) return;
    if (latest.current.panels.length === 0) return;

    const timer = window.setTimeout(() => {
      busy.current = true;
      lastTried.current = next;
      void (async () => {
        try {
          const res = await publish({
            data: {
              note: "Auto-published on save",
              panels: latest.current.panels,
              changes: [],
              regen: {},
              removedIds: latest.current.removedIds,
              overrides: snapshot as unknown as Record<string, unknown>,
            },
          });
          setLondonPublishedOverrides(res.revision.overrides);
          announceLondonRevision(res.revision.rev);
          warned.current = false;
          toast.success(`Revision ${res.revision.rev} published`, {
            description: "Hub cards and vendor downloads now show this version.",
          });
        } catch (err) {
          if (!warned.current) {
            warned.current = true;
            toast.error("Your edit was saved but not published", {
              description:
                err instanceof Error
                  ? err.message
                  : "Publishing the revision failed — try again from the revise studio.",
            });
          }
        } finally {
          busy.current = false;
        }
      })();
    }, SETTLE_MS);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- store hooks are the change signal
  }, [userId, placements, boards, placedArt, stepRepeat, publishedOverrides, publish]);

  return null;
}

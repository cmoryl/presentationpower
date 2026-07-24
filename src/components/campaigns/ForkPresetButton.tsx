// ForkPresetButton — one-click "Fork into my kits" for social/event presets.
//
// Wraps saveKit() so a user can persist a preset into their own campaign_kits
// list, then jump to /social or /events where SavedKitsSection lists them.

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BookmarkPlus, Loader2 } from "lucide-react";
import { saveKit } from "@/lib/kits.functions";
import { KIT_PROFILES_BY_ID } from "@/lib/social-formats";
import type { SocialPlaybook } from "@/lib/social-playbooks";
import type { EventPlaybook } from "@/lib/event-playbooks";

type Props =
  | { kind: "social"; playbook: SocialPlaybook }
  | { kind: "event"; playbook: EventPlaybook };

export function ForkPresetButton(props: Props) {
  const saveKitFn = useServerFn(saveKit);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function onFork() {
    if (busy) return;
    setBusy(true);
    const p = props.playbook;
    const profile = KIT_PROFILES_BY_ID[p.kitProfileId];
    const formatIds = profile?.formatIds ?? [];
    const isEvent = props.kind === "event";
    const facts = isEvent
      ? (p as EventPlaybook).facts
      : {
          name: (p as SocialPlaybook).name,
          subBrand: p.subBrand,
          hashtag: "",
          speakers: [],
          sponsors: [],
          tone: "confident" as const,
          registrationUrl: "",
        };
    try {
      await saveKitFn({
        data: {
          name: p.name,
          surface: isEvent ? "event" : "social",
          brandId: p.subBrand,
          mode: "light",
          profileId: p.kitProfileId,
          formatIds,
          copy: isEvent
            ? {
                title: (p as EventPlaybook).facts.name,
                summary: (p as EventPlaybook).tagline,
                cta: "Register",
              }
            : (p as SocialPlaybook).copy,
          eventFacts: facts as Record<string, unknown>,
          attachEvent: isEvent,
        },
      });
      toast.success(`Forked "${p.name}" into your kits`, {
        action: {
          label: "View kits",
          onClick: () => navigate({ to: isEvent ? "/events" : "/social" }),
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fork preset");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onFork}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/80 px-4 py-2 text-sm font-medium text-[#03002C] transition hover:border-[#003FC7]/50 hover:bg-white disabled:opacity-60"
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <BookmarkPlus size={14} />}
      Fork into my kits
    </button>
  );
}

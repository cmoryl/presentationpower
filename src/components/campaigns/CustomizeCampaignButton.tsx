// CustomizeCampaignButton — the "Configure this campaign" CTA on demo pages.
//
// Previously this deep-linked into the admin kit builder, which requires a
// favorited module and so landed most users on an empty state. Now it opens a
// short guided explainer, prefills a real saved kit from the playbook, and
// drops the user directly into the public 5-step wizard at the Content step.

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Sparkles, Loader2, Check } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { saveKit } from "@/lib/kits.functions";
import { KIT_PROFILES_BY_ID } from "@/lib/social-formats";
import { BRAND_MODES } from "@/lib/taxonomy";
import { useSessionUser } from "@/hooks/use-session-user";
import type { SocialPlaybook } from "@/lib/social-playbooks";
import type { EventPlaybook } from "@/lib/event-playbooks";

type Props =
  | { kind: "social"; playbook: SocialPlaybook }
  | { kind: "event"; playbook: EventPlaybook };

const STEPS = [
  { label: "Brand", detail: "Division palette + logo lockup — prefilled from this playbook." },
  { label: "Content", detail: "Headline, summary, CTA and an optional stat. Edit anything here." },
  { label: "Formats", detail: "The format bundle this playbook ships with. Add or drop any size." },
  { label: "Event", detail: "Optional event facts — city, date, hashtag, registration link." },
  { label: "Review", detail: "Live-rendered assets, NEXT 2026 design mode, save and export." },
];

export function CustomizeCampaignButton(props: Props) {
  const saveKitFn = useServerFn(saveKit);
  const navigate = useNavigate();
  const userId = useSessionUser();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const p = props.playbook;
  const isEvent = props.kind === "event";
  const profile = KIT_PROFILES_BY_ID[p.kitProfileId];
  const brandLabel =
    ("divisionLabel" in p && p.divisionLabel) ||
    BRAND_MODES.find((b) => b.id === p.subBrand)?.name ||
    p.subBrand
      .replace(/^bm-/, "")
      .replace(/^tp-?/, "TransPerfect ")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  const wizardHref = isEvent ? "/events/new" : "/social/new";

  async function onStart() {
    if (busy) return;
    if (userId === null) {
      toast.info("Sign in to save and customize this campaign");
      navigate({ to: "/auth", search: { next: wizardHref } });
      return;
    }
    setBusy(true);
    try {
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
      const kit = await saveKitFn({
        data: {
          name: `${p.name} (my version)`,
          surface: isEvent ? "event" : "social",
          brandId: p.subBrand,
          mode: "dark",
          profileId: p.kitProfileId,
          formatIds: profile?.formatIds ?? [],
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
      toast.success("Copied into your kits — opening the builder");
      navigate({ to: wizardHref, search: { kit: kit.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start this campaign");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#003FC7]"
      >
        <Sparkles size={14} /> Customize this campaign →
      </button>

      <ConfirmModal
        open={open}
        title={`Customize “${p.name}”`}
        description="We'll copy this playbook into your kits and open the builder with everything already filled in. Nothing here is final — every step is editable."
        confirmLabel={busy ? "Preparing…" : "Start customizing"}
        cancelLabel="Not yet"
        busy={busy}
        onCancel={() => (busy ? undefined : setOpen(false))}
        onConfirm={onStart}
        body={
          <div className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-3">
              <Prefill label="Brand" value={brand?.name ?? p.subBrand} />
              <Prefill label="Kit profile" value={profile?.label ?? "Custom"} />
              <Prefill
                label="Formats"
                value={`${profile?.formatIds.length ?? 0} sizes, light + dark`}
              />
            </div>

            <div>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-black/50">
                What you'll do next
              </div>
              <ol className="space-y-2">
                {STEPS.map((s, i) => (
                  <li key={s.label} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#003FC7]/10 text-[10px] font-semibold text-[#003FC7]">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#03002C]">{s.label}</div>
                      <div className="text-xs text-black/60">{s.detail}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <p className="flex items-start gap-2 rounded-xl bg-black/[0.03] p-3 text-xs text-black/60">
              <Check size={14} className="mt-0.5 shrink-0 text-[#003FC7]" />
              {userId === null
                ? "You'll be asked to sign in first so your kit can be saved to your account."
                : "Your copy is saved to your kits — the original playbook stays untouched."}
            </p>
          </div>
        }
      />

      {busy ? (
        <span className="sr-only" role="status">
          <Loader2 size={12} /> Preparing your kit
        </span>
      ) : null}
    </>
  );
}

function Prefill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/70 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-black/45">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-medium text-[#03002C]">{value}</div>
    </div>
  );
}

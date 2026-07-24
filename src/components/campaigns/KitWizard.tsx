// KitWizard — self-contained 5-step blank kit builder.
//
// Extracted from /admin/campaigns/kit so it can render on public /social/new
// and /events/new routes (users starting a blank kit shouldn't land in the
// admin sidebar). Owns all its own state; parent only supplies surface
// defaults (which profile to seed, where to go on cancel/finish).

import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, RefreshCw, Save, Sparkles, Wand2 } from "lucide-react";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  SOCIAL_FORMATS_BY_ID,
  KIT_PROFILES,
  getFormat,
} from "@/lib/social-formats";
import {
  buildCampaignAssets,
  type EventFacts,
  type CampaignSource,
  type CampaignAsset,
} from "@/lib/campaigns";
import { SOCIAL_PLAYBOOKS } from "@/lib/social-playbooks";
import { SocialRenderer } from "@/components/campaigns/SocialRenderer";
import { getKit, saveKit, type SavedKit } from "@/lib/kits.functions";

/** First playbook copy for a given brand — the canonical division voice. */
function exampleCopyForBrand(brandId: string) {
  const pb = SOCIAL_PLAYBOOKS.find((p) => p.subBrand === brandId);
  return (
    pb?.copy ?? {
      title: "Every language. Every content type. One partner.",
      summary:
        "TransPerfect powers global content across 200+ languages, from clinical trials to gaming to enterprise ops.",
      cta: "See how we work",
    }
  );
}

const WIZARD_STEPS = [
  { key: "brand", label: "Brand" },
  { key: "content", label: "Content" },
  { key: "profile", label: "Formats" },
  { key: "event", label: "Event" },
  { key: "review", label: "Review" },
] as const;

const EMPTY_EVENT: EventFacts = {
  name: "",
  subBrand: "bm-tp-master",
  city: "",
  venue: "",
  startDate: "",
  registrationUrl: "",
  hashtag: "",
  speakers: [],
  sponsors: [],
  tone: "confident",
};

export type KitWizardProps = {
  /** Which surface this wizard belongs to — controls copy + default profile. */
  surface: "social" | "event";
  /** Kit profile ID to select on load. Falls back to a sensible per-surface default. */
  defaultProfileId?: string;
  /** Where the "Back / Cancel" chip returns to. */
  backHref: string;
  backLabel?: string;
  /** Where the final "Finish" CTA sends the user. */
  finishHref: string;
  /** If provided, load this saved kit and hydrate all steps from it. */
  kitId?: string;
};

export function KitWizard({
  surface,
  defaultProfileId,
  backHref,
  backLabel = "Cancel",
  finishHref,
  kitId,
}: KitWizardProps) {
  const seededProfileId =
    defaultProfileId && KIT_PROFILES.some((p) => p.id === defaultProfileId)
      ? defaultProfileId
      : surface === "event"
        ? "event-kit"
        : "social-essentials";

  const [step, setStep] = useState(0);
  const [brandId, setBrandId] = useState<string>("bm-tp-master");
  const [mode, setMode] = useState<"light" | "dark" | "both">("dark");
  const [manualCopy, setManualCopy] = useState({
    title: "",
    summary: "",
    cta: "",
    statValue: "",
    statLabel: "",
  });
  const [profileId, setProfileId] = useState<string>(seededProfileId);
  const [formatIds, setFormatIds] = useState<string[]>(
    () => KIT_PROFILES.find((p) => p.id === seededProfileId)?.formatIds ?? [],
  );
  const [attachEvent, setAttachEvent] = useState(surface === "event");
  const [event, setEvent] = useState<EventFacts>(EMPTY_EVENT);
  const [regenTick, setRegenTick] = useState(0);
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  // ─── Save state ────────────────────────────────────────────────────────
  const [savedKitId, setSavedKitId] = useState<string | undefined>(kitId);
  const [kitName, setKitName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState<boolean>(!!kitId);

  const getKitFn = useServerFn(getKit);
  const saveKitFn = useServerFn(saveKit);
  const router = useRouter();
  const navigate = useNavigate();

  // Hydrate all fields from a saved kit when kitId is provided.
  useEffect(() => {
    if (!kitId) return;
    let cancelled = false;
    setHydrating(true);
    getKitFn({ data: { id: kitId } })
      .then((row: SavedKit | null) => {
        if (cancelled || !row) return;
        setSavedKitId(row.id);
        setKitName(row.name);
        setBrandId(row.brandId);
        setMode(row.mode);
        setProfileId(row.profileId);
        setFormatIds(row.formatIds);
        setManualCopy({
          title: row.copy.title ?? "",
          summary: row.copy.summary ?? "",
          cta: row.copy.cta ?? "",
          statValue: row.copy.statValue ?? "",
          statLabel: row.copy.statLabel ?? "",
        });
        setEvent({ ...EMPTY_EVENT, ...(row.eventFacts as Partial<EventFacts>), subBrand: row.brandId });
        setAttachEvent(row.attachEvent);
        setStep(4); // jump to review
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to load saved kit");
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });
    return () => {
      cancelled = true;
    };
    // Only re-hydrate when kitId itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitId]);

  async function handleSave() {
    const name = kitName.trim();
    if (!name) {
      toast.error("Give your kit a name first.");
      return;
    }
    if (!manualCopy.title.trim()) {
      toast.error("Add a headline (Step 2) before saving.");
      return;
    }
    if (formatIds.length === 0) {
      toast.error("Pick at least one format before saving.");
      return;
    }
    setSaving(true);
    try {
      const row = await saveKitFn({
        data: {
          id: savedKitId,
          name,
          surface,
          brandId,
          mode,
          profileId,
          formatIds,
          copy: {
            title: manualCopy.title.trim() || undefined,
            summary: manualCopy.summary.trim() || undefined,
            cta: manualCopy.cta.trim() || undefined,
            statValue: manualCopy.statValue.trim() || undefined,
            statLabel: manualCopy.statLabel.trim() || undefined,
          },
          eventFacts: attachEvent ? (event as unknown as Record<string, any>) : {},
          attachEvent,
        },
      });
      setSavedKitId(row.id);
      toast.success(savedKitId ? `Updated "${row.name}"` : `Saved "${row.name}" to your kits`);
      // Reflect the id in the URL so refresh keeps us editing the same row.
      if (!savedKitId) {
        navigate({
          to: surface === "event" ? "/events/new" : "/social/new",
          search: { kit: row.id } as any,
          replace: true,
        }).catch(() => void 0);
      }
      router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save kit");
    } finally {
      setSaving(false);
    }
  }

  const source: CampaignSource | null = useMemo(() => {
    if (!manualCopy.title.trim()) return null;
    return {
      kind: "manual",
      copy: {
        title: manualCopy.title.trim(),
        summary: manualCopy.summary.trim() || undefined,
        cta: manualCopy.cta.trim() || undefined,
      },
    };
  }, [manualCopy]);

  const eventFacts: EventFacts = useMemo(() => {
    if (!attachEvent) return { ...EMPTY_EVENT, subBrand: brandId };
    return { ...event, subBrand: brandId };
  }, [attachEvent, event, brandId]);

  const assets: CampaignAsset[] = useMemo(() => {
    if (!source) return [];
    const activeFormats = formatIds.filter((id) => !!SOCIAL_FORMATS_BY_ID[id]);
    void regenTick;
    const built = buildCampaignAssets(source, eventFacts, {
      formatIds: activeFormats,
      mode,
      brandId,
    });
    const withStat =
      manualCopy.statValue.trim() && manualCopy.statLabel.trim()
        ? built.map((a) => ({
            ...a,
            copy: {
              ...a.copy,
              stat: { value: manualCopy.statValue.trim(), label: manualCopy.statLabel.trim() },
            },
          }))
        : built;
    return withStat.filter((a) => !removed.has(a.id));
  }, [source, formatIds, eventFacts, mode, brandId, regenTick, removed, manualCopy]);

  const applyProfile = (id: string) => {
    setProfileId(id);
    const p = KIT_PROFILES.find((x) => x.id === id);
    if (p) {
      setFormatIds(p.formatIds);
      setRemoved(new Set());
    }
  };

  const toggleFormat = (id: string) => {
    setFormatIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setRemoved((prev) => {
      const next = new Set(prev);
      for (const key of next) if (key.includes(`:${id}:`)) next.delete(key);
      return next;
    });
  };

  const canNext = (() => {
    if (step === 1) return manualCopy.title.trim().length > 0;
    if (step === 2) return formatIds.length > 0;
    return true;
  })();

  const isLast = step === WIZARD_STEPS.length - 1;
  const surfaceLabel = surface === "event" ? "event kit" : "social kit";

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#003FC7]">
            <Sparkles size={11} /> New {surfaceLabel} · Step by step
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#03002C] sm:text-4xl">
            Start from a blank kit
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-black/60">
            Five quick steps — brand, content, formats
            {surface === "event" ? ", event context" : ", optional event context"}, review. Assets
            regenerate live as you go.
          </p>
        </div>
        <Link
          to={backHref}
          className="shrink-0 rounded-full border border-black/15 bg-white px-3.5 py-1.5 text-xs font-medium text-black/70 hover:bg-black/5"
        >
          ← {backLabel}
        </Link>
      </header>

      {/* Stepper */}
      <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-black/10 bg-white/70 p-2">
        {WIZARD_STEPS.map((s, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStep(i)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs transition ${
                active
                  ? "bg-[#03002C] text-white"
                  : done
                    ? "bg-[#003FC7]/10 text-[#003FC7]"
                    : "text-black/50 hover:bg-black/5"
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                  active ? "bg-white/20" : done ? "bg-[#003FC7]/20" : "bg-black/10"
                }`}
              >
                {done ? <Check size={11} /> : i + 1}
              </span>
              <span className="whitespace-nowrap font-medium">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Step body */}
      <div className="min-h-[320px]">
        {step === 0 && (
          <StepCard
            eyebrow="Step 1 of 5"
            title="Which brand is this kit for?"
            description="Pick a division — accent, ink, surface, and logo lockup flow through every asset. You can override any of them later."
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {BRAND_MODES.map((b) => {
                const selected = b.id === brandId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBrandId(b.id)}
                    className={`group flex items-center gap-3 rounded-2xl border p-3 text-left text-sm transition ${
                      selected
                        ? "border-[#003FC7] bg-[#003FC7]/[0.06] ring-1 ring-[#003FC7]/40"
                        : "border-black/10 bg-white/70 hover:border-[#003FC7]/40"
                    }`}
                  >
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1 ring-black/10"
                      style={{ background: b.tokens.primary }}
                      aria-hidden
                    >
                      <span
                        className="h-4 w-4 rounded-full ring-2 ring-white/80"
                        style={{ background: b.tokens.accent }}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-black/85">{b.name}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-black/45">
                        <span className="font-mono normal-case tracking-normal">
                          {b.tokens.accent}
                        </span>
                        <span>·</span>
                        <span>accent</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Live preview — reflects the accent + logo of the current brand. */}
            <BrandPreview brandId={brandId} manualCopy={manualCopy} />

            <div className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-black/50">
                Render mode
              </div>
              <div className="inline-flex rounded-full border border-black/10 bg-black/[0.03] p-0.5 text-[11px] uppercase tracking-widest">
                {(["dark", "light", "both"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-full px-3 py-1 transition ${
                      mode === m ? "bg-[#03002C] text-white" : "text-black/60 hover:text-black"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </StepCard>
        )}


        {step === 1 && (
          <StepCard
            eyebrow="Step 2 of 5"
            title="What's the message?"
            actions={
              <button
                type="button"
                onClick={() => {
                  const ex = exampleCopyForBrand(brandId);
                  setManualCopy((prev) => ({
                    ...prev,
                    title: ex.title,
                    summary: ex.summary ?? prev.summary,
                    cta: ex.cta ?? prev.cta,
                  }));
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#003FC7]/30 bg-[#003FC7]/[0.06] px-3 py-1.5 text-xs font-medium text-[#003FC7] hover:bg-[#003FC7]/10"
              >
                <Wand2 size={12} /> Fill with brand example
              </button>
            }
          >
            <div className="grid gap-3 rounded-2xl border border-black/10 bg-white/60 p-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextField
                  label="Headline (required)"
                  value={manualCopy.title}
                  onChange={(v) => setManualCopy((prev) => ({ ...prev, title: v }))}
                  placeholder="One-clause title that reads at story width."
                />
              </div>
              <div className="sm:col-span-2">
                <TextField
                  label="Summary (optional)"
                  value={manualCopy.summary}
                  onChange={(v) => setManualCopy((prev) => ({ ...prev, summary: v }))}
                  placeholder="1–2 sentences. Drops on extreme landscape formats."
                />
              </div>
              <TextField
                label="Call to action"
                value={manualCopy.cta}
                onChange={(v) => setManualCopy((prev) => ({ ...prev, cta: v }))}
                placeholder="Register · Learn more · Read the story"
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Stat value"
                  value={manualCopy.statValue}
                  onChange={(v) => setManualCopy((prev) => ({ ...prev, statValue: v }))}
                  placeholder="62"
                />
                <TextField
                  label="Stat label"
                  value={manualCopy.statLabel}
                  onChange={(v) => setManualCopy((prev) => ({ ...prev, statLabel: v }))}
                  placeholder="trials in readiness"
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-black/55">
              Prefer starting from an existing module?{" "}
              <Link to="/admin/campaigns/kit" className="text-[#003FC7] hover:underline">
                Switch to favorited-module flow →
              </Link>
            </p>
          </StepCard>

        )}

        {step === 2 && (
          <StepCard eyebrow="Step 3 of 5" title="Which formats should ship?">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {KIT_PROFILES.map((profile) => {
                const selected = profile.id === profileId;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => applyProfile(profile.id)}
                    className={`rounded-2xl border p-4 text-left text-sm transition ${
                      selected
                        ? "border-[#003FC7] bg-[#003FC7]/[0.06] ring-1 ring-[#003FC7]/40"
                        : "border-black/10 bg-white/70 hover:border-[#003FC7]/40"
                    }`}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-black/50">
                      {profile.formatIds.length} formats
                    </div>
                    <div className="mt-1 font-medium text-black/85">{profile.label}</div>
                    <div className="mt-1 text-xs text-black/55">{profile.description}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 rounded-2xl border border-black/10 bg-white/60 p-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-black/50">
                Formats in this kit ({formatIds.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.values(SOCIAL_FORMATS_BY_ID).map((f) => {
                  const on = formatIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFormat(f.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] transition ${
                        on
                          ? "border-[#03002C] bg-[#03002C] text-white"
                          : "border-black/15 bg-white text-black/60 hover:border-black/40"
                      }`}
                    >
                      <span>{f.label}</span>
                      <span className="text-[10px] opacity-70">
                        {f.width}×{f.height}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </StepCard>
        )}

        {step === 3 && (
          <StepCard
            eyebrow="Step 4 of 5"
            title={surface === "event" ? "Event details" : "Event context (optional)"}
          >
            <label className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white/70 p-3 text-sm">
              <input
                type="checkbox"
                checked={attachEvent}
                onChange={(e) => setAttachEvent(e.target.checked)}
              />
              <span>
                <span className="font-medium text-black/85">Attach event facts</span>
                <span className="ml-2 text-black/55">
                  Adds an eyebrow, hashtag, and date-aware CTA.
                </span>
              </span>
            </label>
            {attachEvent && (
              <div className="mt-3 grid gap-3 rounded-2xl border border-black/10 bg-white/60 p-4 sm:grid-cols-2">
                <TextField label="Event name" value={event.name} onChange={(v) => setEvent({ ...event, name: v })} />
                <TextField label="City" value={event.city ?? ""} onChange={(v) => setEvent({ ...event, city: v })} />
                <TextField label="Venue" value={event.venue ?? ""} onChange={(v) => setEvent({ ...event, venue: v })} />
                <TextField label="Hashtag" value={event.hashtag ?? ""} onChange={(v) => setEvent({ ...event, hashtag: v })} placeholder="#TPNext" />
                <TextField
                  label="Start date"
                  value={event.startDate ?? ""}
                  onChange={(v) => setEvent({ ...event, startDate: v })}
                  placeholder="YYYY-MM-DD"
                />
                <TextField
                  label="Registration URL"
                  value={event.registrationUrl ?? ""}
                  onChange={(v) => setEvent({ ...event, registrationUrl: v })}
                  placeholder="https://…"
                />
              </div>
            )}
          </StepCard>
        )}

        {step === 4 && (
          <StepCard
            eyebrow="Step 5 of 5"
            title={`Your kit · ${assets.length} asset${assets.length === 1 ? "" : "s"}`}
            actions={
              <button
                type="button"
                onClick={() => {
                  setRemoved(new Set());
                  setRegenTick((n) => n + 1);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-black/70 hover:bg-black/5"
              >
                <RefreshCw size={12} /> Regenerate all
              </button>
            }
          >
            {source == null ? (
              <EmptyState
                title="Add a headline to see your kit."
                description="Step 2 needs at least a title. Jump back to fill it in."
                action={
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 text-xs font-medium text-white hover:bg-[#03002C]"
                  >
                    ← Back to content
                  </button>
                }
              />
            ) : assets.length === 0 ? (
              <EmptyState
                title="No formats selected."
                description="Pick a kit profile or toggle at least one format in step 3."
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {assets.map((asset) => (
                  <div key={asset.id} className="space-y-2">
                    <div className="text-[11px] uppercase tracking-widest text-black/60">
                      {asset.format.label}
                    </div>
                    <div className="text-[10px] text-black/40">
                      {asset.format.width}×{asset.format.height} · {asset.mode}
                    </div>
                    <SocialRenderer
                      format={asset.format}
                      brandId={asset.brandId}
                      mode={asset.mode}
                      copy={asset.copy}
                      facts={{ hashtag: eventFacts.hashtag, registrationUrl: eventFacts.registrationUrl }}
                      displayShortEdge={260}
                    />
                  </div>
                ))}
              </div>
            )}
          </StepCard>
        )}
      </div>

      {/* Nav footer */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/95 p-3 shadow-[0_10px_30px_rgba(3,0,44,0.08)] backdrop-blur">
        <button
          type="button"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-4 py-1.5 text-xs font-medium text-black/70 hover:bg-black/5 disabled:opacity-40"
        >
          <ArrowLeft size={12} /> Back
        </button>
        <div className="hidden text-[11px] uppercase tracking-widest text-black/50 sm:block">
          Step {step + 1} of {WIZARD_STEPS.length} · {WIZARD_STEPS[step].label}
        </div>
        {isLast ? (
          <Link
            to={finishHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#03002C]"
          >
            Finish <Check size={12} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setStep(Math.min(WIZARD_STEPS.length - 1, step + 1))}
            disabled={!canNext}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#03002C] disabled:opacity-40"
          >
            Next <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function StepCard({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-black/10 bg-white/60 p-5 backdrop-blur">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#003FC7]">
            {eyebrow}
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-[#03002C]">{title}</h2>
          {description && (
            <p className="mt-1.5 max-w-2xl text-xs text-black/55">{description}</p>
          )}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

/**
 * Live preview strip shown under the brand grid on Step 1.
 * Renders three canonical formats (square, portrait, story) using whatever
 * headline/summary/CTA the user has typed so far — or the division's
 * canonical example copy as a fallback. Accent color + logo lockup come
 * straight from the BrandMode, so switching divisions instantly re-skins
 * the preview.
 */
function BrandPreview({
  brandId,
  manualCopy,
}: {
  brandId: string;
  manualCopy: { title: string; summary: string; cta: string };
}) {
  const brand = useMemo(
    () => BRAND_MODES.find((b) => b.id === brandId) ?? BRAND_MODES[0],
    [brandId],
  );
  const fallback = useMemo(() => exampleCopyForBrand(brandId), [brandId]);
  const copy = {
    title: manualCopy.title.trim() || fallback.title,
    summary: (manualCopy.summary.trim() || fallback.summary) ?? undefined,
    cta: (manualCopy.cta.trim() || fallback.cta) ?? undefined,
  };
  const previewFormats = ["square-1080", "portrait-1080x1350", "story-1080x1920"]
    .map((id) => getFormat(id))
    .filter((f): f is NonNullable<ReturnType<typeof getFormat>> => !!f);
  const usingExample = !manualCopy.title.trim();

  return (
    <div className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-black/50">
            Live preview · {brand.name}
          </div>
          <div className="text-[11px] text-black/55">
            Accent{" "}
            <span
              className="ml-1 inline-block h-2.5 w-2.5 translate-y-[1px] rounded-full ring-1 ring-black/10"
              style={{ background: brand.tokens.accent }}
            />{" "}
            <span className="font-mono">{brand.tokens.accent}</span> · ink{" "}
            <span className="font-mono">{brand.tokens.primary}</span>
          </div>
        </div>
        {usingExample && (
          <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-widest text-black/50">
            Showing example
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {previewFormats.map((f) => (
          <div key={f.id} className="space-y-1.5">
            <SocialRenderer
              format={f}
              brandId={brand.id}
              mode="dark"
              copy={copy}
              facts={{}}
              displayShortEdge={140}
            />
            <div className="text-[10px] uppercase tracking-widest text-black/50">{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-black/15 bg-black/[0.02] p-6 text-center">
      <div className="text-sm font-medium text-black/80">{title}</div>
      {description && <div className="mt-1 text-xs text-black/55">{description}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-black/50">
        {label}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
      />
    </label>
  );
}

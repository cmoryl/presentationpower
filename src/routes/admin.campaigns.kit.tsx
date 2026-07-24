// /admin/campaigns/kit — the social-kit builder.
//
// Flow: pick source (favorited variant or manual) → pick kit profile
// (bundle of formats) → optionally attach EventFacts → generate assets via
// the stubbed pipeline. Two entry points land here: the star/kit button on
// a favorited library card (?source=<variantId>) and the "Build a kit"
// action on /admin/campaigns.
//
// No AI in this pass — copy adaptation is deterministic; the TODO(ai)
// markers stay put in src/lib/campaigns.ts.

import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Sparkles, X, RefreshCw, Star, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useFavorites } from "@/lib/favorites";
import { byId, MODULE_VARIANTS, BRAND_MODES } from "@/lib/taxonomy";
import {
  SOCIAL_FORMATS_BY_ID,
  KIT_PROFILES,
  aspectClass,
  type SocialFormat,
} from "@/lib/social-formats";
import {
  buildCampaignAssets,
  sourceFromVariant,
  type EventFacts,
  type CampaignSource,
  type CampaignAsset,
} from "@/lib/campaigns";
import { SocialRenderer } from "@/components/campaigns/SocialRenderer";
import { AdminPageHeader, AdminSection, AdminEmpty } from "@/components/admin/AdminPage";

const searchSchema = z.object({
  source: z.string().optional(),
  profile: z.string().optional(),
  blank: z.union([z.literal(1), z.literal("1"), z.boolean()]).optional(),
});

export const Route = createFileRoute("/admin/campaigns/kit")({
  head: () => ({
    meta: [{ title: "Social kit builder · Campaigns · Admin" }],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: KitBuilderView,
});

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

function KitBuilderView() {
  const search = useSearch({ from: Route.id });

  // ?blank=1 used to open an in-admin wizard. That flow now lives on public
  // /social/new and /events/new so users aren't dropped into the admin
  // sidebar mid-flow — redirect any lingering deeplinks.
  if (search.blank) {
    if (typeof window !== "undefined") {
      const target = search.profile === "event-kit" ? "/events/new" : "/social/new";
      window.location.replace(target);
    }
    return null;
  }

  const { favorites } = useFavorites();
  const favoriteVariants = useMemo(
    () => MODULE_VARIANTS.filter((v) => favorites.has(v.id)),
    [favorites],
  );

  const initialSource = search.source && favorites.has(search.source) ? search.source : favoriteVariants[0]?.id ?? "";
  const [sourceId, setSourceId] = useState<string>(initialSource);
  const [profileId, setProfileId] = useState<string>(
    search.profile && KIT_PROFILES.some((p) => p.id === search.profile) ? search.profile : "social-essentials",
  );
  const [brandId, setBrandId] = useState<string>(() => "bm-tp-master");
  const [mode, setMode] = useState<"light" | "dark" | "both">("dark");
  const [event, setEvent] = useState<EventFacts>(EMPTY_EVENT);
  const [attachEvent, setAttachEvent] = useState(false);
  const [formatIds, setFormatIds] = useState<string[]>(
    () => KIT_PROFILES.find((p) => p.id === "social-essentials")?.formatIds ?? [],
  );
  const [regenTick, setRegenTick] = useState(0);

  // Wizard mode — triggered by ?blank=1 from /social and /events blank-kit CTAs.
  const isWizard = !!search.blank;
  const [step, setStep] = useState(0);
  const [manualCopy, setManualCopy] = useState({
    title: "",
    summary: "",
    cta: "",
    statValue: "",
    statLabel: "",
  });

  const brand = useMemo(
    () => BRAND_MODES.find((b) => b.id === brandId) ?? BRAND_MODES[0],
    [brandId],
  );

  const source: CampaignSource | null = useMemo(() => {
    if (isWizard) {
      if (!manualCopy.title.trim()) return null;
      return {
        kind: "manual",
        copy: {
          title: manualCopy.title.trim(),
          summary: manualCopy.summary.trim() || undefined,
          cta: manualCopy.cta.trim() || undefined,
        },
      };
    }
    if (!sourceId) return null;
    return sourceFromVariant(sourceId, brand);
  }, [isWizard, manualCopy, sourceId, brand]);

  const eventFacts: EventFacts = useMemo(() => {
    if (!attachEvent) return { ...EMPTY_EVENT, subBrand: brandId };
    return { ...event, subBrand: brandId };
  }, [attachEvent, event, brandId]);

  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const assets: CampaignAsset[] = useMemo(() => {
    if (!source) return [];
    const activeFormats = formatIds.filter((id) => !!SOCIAL_FORMATS_BY_ID[id]);
    void regenTick;
    const built = buildCampaignAssets(source, eventFacts, {
      formatIds: activeFormats,
      mode,
      brandId,
    });
    // Manual/wizard sources can carry a stat that CampaignSource doesn't
    // model — inject it into every generated asset's copy.
    const withStat =
      isWizard && manualCopy.statValue.trim() && manualCopy.statLabel.trim()
        ? built.map((a) => ({
            ...a,
            copy: {
              ...a.copy,
              stat: { value: manualCopy.statValue.trim(), label: manualCopy.statLabel.trim() },
            },
          }))
        : built;
    return withStat.filter((a) => !removed.has(a.id));
  }, [source, formatIds, eventFacts, mode, brandId, regenTick, removed, isWizard, manualCopy]);

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
      // Any manual toggle clears removed for that format across modes.
      for (const key of next) if (key.includes(`:${id}:`)) next.delete(key);
      return next;
    });
  };

  if (isWizard) {
    return (
      <WizardFlow
        step={step}
        setStep={setStep}
        brandId={brandId}
        setBrandId={setBrandId}
        mode={mode}
        setMode={setMode}
        manualCopy={manualCopy}
        setManualCopy={setManualCopy}
        profileId={profileId}
        applyProfile={applyProfile}
        formatIds={formatIds}
        toggleFormat={toggleFormat}
        attachEvent={attachEvent}
        setAttachEvent={setAttachEvent}
        event={event}
        setEvent={setEvent}
        eventFacts={eventFacts}
        assets={assets}
        source={source}
        setRegenTick={setRegenTick}
        setRemoved={setRemoved}
      />
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Campaigns · Kit builder"
        title="Build a social kit from a favorited module"
        description="Pick a favorited module, choose a kit profile, and generate on-brand assets across every format in one pass. Deterministic mapping now — AI adaptation slot lives at TODO(ai) in campaigns.ts."
        actions={
          <Link
            to="/admin/campaigns"
            className="rounded-full border border-black/15 bg-white px-3.5 py-1.5 text-xs font-medium text-black/70 hover:bg-black/5"
          >
            ← Back to campaigns
          </Link>
        }
      />

      {/* Step 1 · Source */}
      <AdminSection eyebrow="Step 1" title="Source module">
        {favoriteVariants.length === 0 ? (
          <AdminEmpty
            title="No favorited modules yet"
            description="Star a module in the library (☆ on any card) to make it available here."
            action={
              <Link
                to="/library"
                className="inline-flex items-center gap-2 rounded-full bg-[#03002C] px-4 py-2 text-xs font-medium text-white hover:bg-[#003FC7]"
              >
                <Star size={14} /> Browse the library →
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteVariants.map((v) => {
              const selected = v.id === sourceId;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSourceId(v.id)}
                  className={`flex items-start gap-3 rounded-2xl border p-3 text-left text-sm transition ${
                    selected
                      ? "border-[#003FC7] bg-[#003FC7]/[0.06] ring-1 ring-[#003FC7]/40"
                      : "border-black/10 bg-white/70 hover:border-[#003FC7]/40"
                  }`}
                >
                  <Star size={14} className="mt-0.5 shrink-0 fill-amber-400 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-black/85">{v.name}</div>
                    <div className="text-[10px] uppercase tracking-widest text-black/45">
                      {v.familyId} · {v.id}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </AdminSection>

      {/* Step 2 · Kit profile */}
      <AdminSection eyebrow="Step 2" title="Kit profile">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {KIT_PROFILES.map((p) => {
            const selected = p.id === profileId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyProfile(p.id)}
                className={`rounded-2xl border p-4 text-left text-sm transition ${
                  selected
                    ? "border-[#003FC7] bg-[#003FC7]/[0.06] ring-1 ring-[#003FC7]/40"
                    : "border-black/10 bg-white/70 hover:border-[#003FC7]/40"
                }`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-widest text-black/50">
                  {p.formatIds.length} formats
                </div>
                <div className="mt-1 font-medium text-black/85">{p.label}</div>
                <div className="mt-1 text-xs text-black/55">{p.description}</div>
              </button>
            );
          })}
        </div>

        {/* Format detail — adjustable */}
        <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
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
      </AdminSection>

      {/* Step 3 · Brand + Event */}
      <AdminSection eyebrow="Step 3" title="Brand mode + event context (optional)">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="rounded-2xl border border-black/10 bg-white/70 p-3 text-sm">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-black/50">
              Brand
            </div>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-sm"
            >
              {BRAND_MODES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="rounded-2xl border border-black/10 bg-white/70 p-3 text-sm">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-black/50">
              Mode
            </div>
            <div className="mt-1 inline-flex rounded-full border border-black/10 bg-black/[0.03] p-0.5 text-[11px] uppercase tracking-widest">
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
          </label>
          <label className="rounded-2xl border border-black/10 bg-white/70 p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-black/50">
                Attach event facts
              </div>
              <input
                type="checkbox"
                checked={attachEvent}
                onChange={(e) => setAttachEvent(e.target.checked)}
              />
            </div>
            <p className="mt-1 text-xs text-black/55">
              Adds an eyebrow, hashtag, and CTA tuned to a specific event.
            </p>
          </label>
        </div>

        {attachEvent && (
          <div className="grid gap-3 rounded-2xl border border-black/10 bg-white/60 p-4 sm:grid-cols-2">
            <TextField label="Event name" value={event.name} onChange={(v) => setEvent({ ...event, name: v })} />
            <TextField label="City" value={event.city ?? ""} onChange={(v) => setEvent({ ...event, city: v })} />
            <TextField label="Venue" value={event.venue ?? ""} onChange={(v) => setEvent({ ...event, venue: v })} />
            <TextField label="Hashtag" value={event.hashtag ?? ""} onChange={(v) => setEvent({ ...event, hashtag: v })} />
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
      </AdminSection>

      {/* Step 4 · Preview grid */}
      <AdminSection
        eyebrow="Step 4"
        title={`Generated kit · ${assets.length} asset${assets.length === 1 ? "" : "s"}`}
        actions={
          <button
            type="button"
            onClick={() => {
              setRemoved(new Set());
              setRegenTick((t) => t + 1);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-black/70 hover:bg-black/5"
          >
            <RefreshCw size={12} /> Regenerate all
          </button>
        }
      >
        {source == null ? (
          <AdminEmpty title="Pick a source module to generate a kit." />
        ) : assets.length === 0 ? (
          <AdminEmpty
            title="No formats selected."
            description="Choose a kit profile above, or toggle at least one format."
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onRemove={() => setRemoved((prev) => new Set(prev).add(asset.id))}
                onRegenerate={() => setRegenTick((t) => t + 1)}
                hashtag={eventFacts.hashtag}
                registrationUrl={eventFacts.registrationUrl}
              />
            ))}
          </div>
        )}
      </AdminSection>

      {/* Provenance / TODO */}
      <div className="rounded-2xl border border-dashed border-black/15 bg-black/[0.02] p-4 text-xs text-black/55">
        <div className="mb-1 flex items-center gap-2 font-semibold uppercase tracking-widest text-black/60">
          <Sparkles size={12} /> AI adaptation pending
        </div>
        Every asset carries a <code className="rounded bg-black/10 px-1.5 py-0.5">provenance.todos</code>{" "}
        array — deterministic today, wired to Lovable AI Gateway next pass. Contract in{" "}
        <code className="rounded bg-black/10 px-1.5 py-0.5">src/lib/campaigns.ts</code>.
      </div>
    </div>
  );
}

function AssetCard({
  asset,
  onRemove,
  onRegenerate,
  hashtag,
  registrationUrl,
}: {
  asset: CampaignAsset;
  onRemove: () => void;
  onRegenerate: () => void;
  hashtag?: string;
  registrationUrl?: string;
}) {
  const format: SocialFormat = asset.format;
  return (
    <div className="group space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] uppercase tracking-widest text-black/60">
            {format.label}
          </div>
          <div className="text-[10px] text-black/40">
            {format.width}×{format.height} · {aspectClass(format)} · {asset.mode}
          </div>
        </div>
        <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={onRegenerate}
            title="Regenerate this asset"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white text-black/60 hover:text-black"
          >
            <RefreshCw size={12} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Remove from kit"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white text-black/60 hover:text-red-600"
          >
            <X size={12} />
          </button>
        </div>
      </div>
      <SocialRenderer
        format={format}
        brandId={asset.brandId}
        mode={asset.mode}
        copy={asset.copy}
        facts={{ hashtag, registrationUrl }}
        displayShortEdge={280}
      />
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

// ────────────────────────────────────────────────────────────────────────────
// WizardFlow — step-by-step blank kit creation. Entered via ?blank=1 from
// the "Start from a blank kit" CTAs on /social and /events. Five steps:
//   0. Brand + mode
//   1. Content (title / summary / CTA / optional stat)
//   2. Kit profile + format selection
//   3. Event context (optional)
//   4. Review & preview grid
// ────────────────────────────────────────────────────────────────────────────
const WIZARD_STEPS = [
  { key: "brand", label: "Brand" },
  { key: "content", label: "Content" },
  { key: "profile", label: "Formats" },
  { key: "event", label: "Event" },
  { key: "review", label: "Review" },
] as const;

type WizardProps = {
  step: number;
  setStep: (n: number) => void;
  brandId: string;
  setBrandId: (v: string) => void;
  mode: "light" | "dark" | "both";
  setMode: (m: "light" | "dark" | "both") => void;
  manualCopy: { title: string; summary: string; cta: string; statValue: string; statLabel: string };
  setManualCopy: (fn: (prev: WizardProps["manualCopy"]) => WizardProps["manualCopy"]) => void;
  profileId: string;
  applyProfile: (id: string) => void;
  formatIds: string[];
  toggleFormat: (id: string) => void;
  attachEvent: boolean;
  setAttachEvent: (v: boolean) => void;
  event: EventFacts;
  setEvent: (e: EventFacts) => void;
  eventFacts: EventFacts;
  assets: CampaignAsset[];
  source: CampaignSource | null;
  setRegenTick: (fn: (n: number) => number) => void;
  setRemoved: (s: Set<string>) => void;
};

function WizardFlow(p: WizardProps) {
  const {
    step, setStep, brandId, setBrandId, mode, setMode,
    manualCopy, setManualCopy, profileId, applyProfile,
    formatIds, toggleFormat, attachEvent, setAttachEvent,
    event, setEvent, eventFacts, assets, source, setRegenTick, setRemoved,
  } = p;

  const canNext = (() => {
    if (step === 1) return manualCopy.title.trim().length > 0;
    if (step === 2) return formatIds.length > 0;
    return true;
  })();

  const isLast = step === WIZARD_STEPS.length - 1;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="New social kit · Step by step"
        title="Start from a blank kit"
        description="Five quick steps — brand, content, formats, event context, review. Every asset is generated deterministically as you go, so you can adjust and see the kit update live in the final step."
        actions={
          <Link
            to="/admin/campaigns"
            className="rounded-full border border-black/15 bg-white px-3.5 py-1.5 text-xs font-medium text-black/70 hover:bg-black/5"
          >
            ← Back to campaigns
          </Link>
        }
      />

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
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition ${
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
          <AdminSection eyebrow="Step 1 of 5" title="Which brand is this kit for?">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {BRAND_MODES.map((b) => {
                const selected = b.id === brandId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBrandId(b.id)}
                    className={`rounded-2xl border p-3 text-left text-sm transition ${
                      selected
                        ? "border-[#003FC7] bg-[#003FC7]/[0.06] ring-1 ring-[#003FC7]/40"
                        : "border-black/10 bg-white/70 hover:border-[#003FC7]/40"
                    }`}
                  >
                    <div className="font-medium text-black/85">{b.name}</div>
                    <div className="text-[10px] uppercase tracking-widest text-black/45">
                      {b.id}
                    </div>
                  </button>
                );
              })}
            </div>
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
          </AdminSection>
        )}

        {step === 1 && (
          <AdminSection eyebrow="Step 2 of 5" title="What's the message?">
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
          </AdminSection>
        )}

        {step === 2 && (
          <AdminSection eyebrow="Step 3 of 5" title="Which formats should ship?">
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
          </AdminSection>
        )}

        {step === 3 && (
          <AdminSection eyebrow="Step 4 of 5" title="Event context (optional)">
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
          </AdminSection>
        )}

        {step === 4 && (
          <AdminSection
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
              <AdminEmpty
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
              <AdminEmpty
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
          </AdminSection>
        )}
      </div>

      {/* Nav footer */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-2xl border border-black/10 bg-white/95 p-3 shadow-[0_10px_30px_rgba(3,0,44,0.08)] backdrop-blur">
        <button
          type="button"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-4 py-1.5 text-xs font-medium text-black/70 hover:bg-black/5 disabled:opacity-40"
        >
          <ArrowLeft size={12} /> Back
        </button>
        <div className="text-[11px] uppercase tracking-widest text-black/50">
          Step {step + 1} of {WIZARD_STEPS.length} · {WIZARD_STEPS[step].label}
        </div>
        {isLast ? (
          <Link
            to="/admin/campaigns"
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

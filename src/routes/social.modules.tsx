// /social/modules — Social Module Studio.
//
// Pick any module layout from the shared library, drop it into any social
// format, and edit it live. The fit engine auto-adapts the module to the frame
// (safe area, relief ladder) so nothing overlaps or clips, and an AI refit can
// tighten the copy when the deterministic ladder has to reduce type too far.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, LayoutTemplate, Ruler, Sparkles, Wand2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { SocialModuleFrame } from "@/components/campaigns/SocialModuleFrame";
import { SocialModulePicker } from "@/components/campaigns/SocialModulePicker";
import { BRAND_MODES } from "@/lib/taxonomy";
import { SOCIAL_FORMATS, getFormat } from "@/lib/social-formats";
import type { CampaignCopy } from "@/lib/campaigns";
import type { PrintSection } from "@/lib/print-assets.types";
import {
  SOCIAL_MODULE_LAYOUTS,
  buildSocialModuleSection,
  findSocialModuleLayout,
  pathLabel,
  readSectionText,
  sectionTextPaths,
  socialModulesForFormat,
  writeSectionText,
  type SocialModuleLayout,
} from "@/lib/social-module-layouts";
import {
  SOCIAL_RELIEF_LADDER,
  SOCIAL_RELIEF_MAX,
  fitSummary,
  reliefAt,
  type SocialFitRelief,
  type SocialFitResult,
} from "@/lib/social-module-fit";
import { refitSocialModuleLayout } from "@/lib/social-module-refit.functions";

export const Route = createFileRoute("/social/modules")({
  head: () => ({
    meta: [
      { title: "Social module studio · TransPerfect Element" },
      {
        name: "description",
        content:
          "Drop any Element module layout into any social format. Auto-fitting keeps type, imagery, and safe areas clean — with AI refit when copy runs long.",
      },
      { property: "og:title", content: "Social module studio · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Compose social assets from the shared module library with automatic resizing and overlap protection.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SocialModuleStudio,
});

const DEFAULT_COPY: CampaignCopy = {
  eyebrow: "TransPerfect Element",
  title: "Every language. Every content type. One partner.",
  summary:
    "One connected content pipeline across 200+ languages — from clinical trials to gaming to enterprise operations.",
  cta: "See how we work",
  stat: { value: "200+", label: "Markets supported end-to-end" },
};

function SocialModuleStudio() {
  const [formatId, setFormatId] = useState("square-1080");
  const [brandId, setBrandId] = useState("bm-tp-master");
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const [layoutId, setLayoutId] = useState<string>(SOCIAL_MODULE_LAYOUTS[0]?.id ?? "");
  const [section, setSection] = useState<PrintSection | null>(null);
  const [pinnedRelief, setPinnedRelief] = useState<number | "auto">("auto");
  const [showSafe, setShowSafe] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fit, setFit] = useState<SocialFitResult | null>(null);
  const [relief, setRelief] = useState<SocialFitRelief>(reliefAt(0));
  const [refitting, setRefitting] = useState(false);
  const [rationale, setRationale] = useState<string>("");

  const format = getFormat(formatId) ?? SOCIAL_FORMATS[0];
  const layout = findSocialModuleLayout(layoutId);
  const refit = useServerFn(refitSocialModuleLayout);

  // Seed / reseed the editable section whenever the chosen module changes.
  useEffect(() => {
    if (!layout) return;
    setSection(buildSocialModuleSection({ layout, copy: DEFAULT_COPY, relief: reliefAt(0) }));
    setRationale("");
  }, [layoutId]); // eslint-disable-line react-hooks/exhaustive-deps

  const paths = useMemo(() => (section ? sectionTextPaths(section) : []), [section]);

  function pick(next: SocialModuleLayout) {
    setLayoutId(next.id);
  }

  async function runRefit() {
    if (!section || !layout || !fit) return;
    setRefitting(true);
    try {
      const res = await refit({
        data: {
          moduleLabel: layout.label,
          moduleDescription: layout.description,
          formatLabel: format.label,
          formatWidth: format.width,
          formatHeight: format.height,
          overflowPct: Math.max(-5, Math.min(50, fit.overflowPct)),
          reliefLevel: relief.level,
          reliefNote: relief.note,
          fields: paths.slice(0, 40).map((p) => {
            const value = readSectionText(section, p);
            return {
              path: p,
              label: pathLabel(p),
              value,
              maxChars: Math.max(24, Math.round(value.length * 0.72) || 80),
            };
          }),
          candidates: socialModulesForFormat(format)
            .filter((l) => l.id !== layout.id)
            .slice(0, 10)
            .map((l) => ({ id: l.id, label: l.label, description: l.description.slice(0, 300) })),
        },
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      let next = section;
      for (const f of res.fields) next = writeSectionText(next, f.path, f.value);
      setSection(next);
      setRationale(
        [
          res.rationale,
          res.recommendedModuleId
            ? `Suggested alternative: ${findSocialModuleLayout(res.recommendedModuleId)?.label ?? res.recommendedModuleId}`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      );
      toast.success(
        res.fields.length
          ? `AI tightened ${res.fields.length} field(s).`
          : "AI found nothing to shorten.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI refit failed");
    } finally {
      setRefitting(false);
    }
  }

  const health = fit ? fitSummary(fit, relief) : "Measuring…";
  const healthTone = !fit ? "neutral" : !fit.ok ? "bad" : fit.sparse ? "warn" : "good";

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#003FC7]">
              <LayoutTemplate size={12} /> Social · module studio
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#03002C] sm:text-4xl">
              Build social from any module
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/65">
              Every module in the Element library — heroes, stat rails, quotes, logo walls, process
              arcs, contact bands — renders into any social size. The frame auto-fits type and
              content to the platform safe area, so nothing overlaps or crops.
            </p>
          </div>
          <Link
            to="/social"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-[#03002C] transition hover:bg-black/5"
          >
            <ArrowLeft size={14} /> Back to social
          </Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Stage */}
          <section className="rounded-3xl border border-black/10 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0033a3]"
              >
                <LayoutTemplate size={14} /> {layout ? "Swap module" : "Choose module"}
              </button>
              <span className="truncate text-xs font-semibold text-[#03002C]">
                {layout?.label ?? "No module"}
              </span>
              <span className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSafe((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    showSafe ? "bg-[#03002C] text-white" : "border border-black/10 text-[#03002C]"
                  }`}
                >
                  <Ruler size={13} /> Safe area
                </button>
                <button
                  type="button"
                  onClick={runRefit}
                  disabled={refitting || !section}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#003FC7]/40 px-3 py-1.5 text-[11px] font-semibold text-[#003FC7] transition hover:bg-[#003FC7]/10 disabled:opacity-50"
                >
                  <Wand2 size={13} /> {refitting ? "Refitting…" : "AI refit"}
                </button>
              </span>
            </div>

            <div className="mt-5 flex min-h-[520px] items-center justify-center rounded-2xl bg-[#F2F2F2] p-6">
              {section ? (
                <SocialModuleFrame
                  format={format}
                  section={section}
                  brandId={brandId}
                  mode={mode}
                  displayShortEdge={420}
                  reliefLevel={pinnedRelief === "auto" ? undefined : pinnedRelief}
                  showSafeArea={showSafe}
                  onFit={(f, r) => {
                    setFit(f);
                    setRelief(r);
                  }}
                />
              ) : (
                <p className="text-sm text-black/50">Choose a module to begin.</p>
              )}
            </div>

            <p
              className={`mt-4 rounded-2xl px-4 py-3 text-xs font-medium ${
                healthTone === "bad"
                  ? "bg-[#E53D2E]/10 text-[#8c1f16]"
                  : healthTone === "warn"
                    ? "bg-[#FFEB66]/30 text-[#5c4a00]"
                    : "bg-[#003FC7]/8 text-[#03002C]"
              }`}
            >
              {health}
            </p>
            {rationale ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-black/60">
                <Sparkles size={13} className="mt-0.5 shrink-0 text-[#003FC7]" /> {rationale}
              </p>
            ) : null}
          </section>

          {/* Inspector */}
          <aside className="space-y-4">
            <Panel title="Frame">
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-black/50">
                Format
              </label>
              <select
                value={formatId}
                onChange={(e) => setFormatId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
              >
                {SOCIAL_FORMATS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} · {f.width}×{f.height}
                  </option>
                ))}
              </select>

              <label className="mt-3 block text-[11px] font-semibold uppercase tracking-widest text-black/50">
                Brand
              </label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
              >
                {BRAND_MODES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <div className="mt-3 flex gap-1.5">
                {(["dark", "light"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize transition ${
                      mode === m
                        ? "bg-[#03002C] text-white"
                        : "border border-black/10 text-[#03002C]"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Auto-fit">
              <p className="text-[11px] leading-snug text-black/55">
                Relief reduces type and optional content until the module clears the safe area. Auto
                climbs only as far as needed.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPinnedRelief("auto")}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    pinnedRelief === "auto"
                      ? "bg-[#003FC7] text-white"
                      : "border border-black/10 text-[#03002C]"
                  }`}
                >
                  Auto
                </button>
                {Array.from({ length: SOCIAL_RELIEF_MAX + 1 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPinnedRelief(i)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                      pinnedRelief === i
                        ? "bg-[#03002C] text-white"
                        : "border border-black/10 text-[#03002C]"
                    }`}
                  >
                    L{i}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-black/55">
                Active: L{relief.level} — {SOCIAL_RELIEF_LADDER[relief.level].note}
              </p>
            </Panel>

            <Panel title="Content">
              {section && paths.length ? (
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {paths.map((p) => {
                    const value = readSectionText(section, p);
                    const long = value.length > 70;
                    return (
                      <label key={p} className="block">
                        <span className="block text-[10px] font-semibold uppercase tracking-widest text-black/45">
                          {pathLabel(p)}
                        </span>
                        {long ? (
                          <textarea
                            value={value}
                            rows={3}
                            onChange={(e) =>
                              setSection(writeSectionText(section, p, e.target.value))
                            }
                            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                          />
                        ) : (
                          <input
                            value={value}
                            onChange={(e) =>
                              setSection(writeSectionText(section, p, e.target.value))
                            }
                            className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-black/50">Choose a module to edit its content.</p>
              )}
            </Panel>
          </aside>
        </div>
      </div>

      <SocialModulePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={pick}
        format={format}
        brandId={brandId}
        mode={mode}
        copy={DEFAULT_COPY}
      />
    </AppShell>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-black/10 bg-white p-4">
      <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#03002C]">
        {title}
      </h2>
      {children}
    </section>
  );
}

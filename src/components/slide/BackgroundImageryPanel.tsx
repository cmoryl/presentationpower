// Backgrounds & Imagery inspector panel for the deck editor.
// Six tabs:
//   Library  — curated on-brand gradients / patterns
//   Solid    — single color + intensity
//   Gradient — two-color linear gradient with angle + intensity
//   Pattern  — SVG pattern (dots, grid, waves…) with color + intensity + scale
//   Upload   — user-supplied image (Supabase Storage)
//   AI       — Lovable AI Gateway image generation
//
// Persists to slide `content.background`. Rendered via SlideBackdropContext.

import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  BACKGROUND_PRESETS,
  PATTERN_LIBRARY,
  buildGradientCss,
  buildPatternCss,
  buildSolidCss,
  resolveSlideBackground,
  type SlideBackgroundValue,
} from "@/lib/background-library";
import { uploadDataUrl, uploadSlideMedia } from "@/lib/slide-media";
import { generateBackgroundImage } from "@/lib/ai-image.functions";
import { listDivisionImagery } from "@/lib/division-imagery.functions";
import { logImageryEvent } from "@/lib/admin.functions";

type Tab = "library" | "brand" | "solid" | "gradient" | "pattern" | "upload" | "ai";

const BRAND_SWATCHES = [
  "#03002C", "#003FC7", "#A1FBF9", "#C2A3FF",
  "#F2F2F2", "#E0E8F5", "#FFEB66", "#A6FA87",
  "#FF9B70", "#EC388A", "#E53D2E", "#FFFFFF",
];

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-widest text-black/60">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border border-black/10 bg-transparent"
        />
        <input
          type="text"
          value={value.toUpperCase()}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="flex-1 rounded-lg border border-black/10 bg-white px-2 py-1.5 font-mono text-xs uppercase outline-none focus:border-black/30"
        />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {BRAND_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            title={c}
            className={`h-5 w-5 rounded-full border transition ${
              value.toLowerCase() === c.toLowerCase()
                ? "border-black ring-2 ring-black/70"
                : "border-black/10 hover:scale-110"
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

function Slider({
  label,
  min = 0,
  max = 100,
  value,
  onChange,
  suffix = "%",
}: {
  label: string;
  min?: number;
  max?: number;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
}) {
  return (
    <div>
      <label className="flex items-center justify-between text-[11px] text-black/60">
        <span className="uppercase tracking-widest">{label}</span>
        <span className="font-mono">
          {Math.round(value)}
          {suffix}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

export type ApplyTargetSlide = {
  id: string;
  position: number;
  sectionId: string;
  sectionName: string;
  title: string;
};

export function BackgroundImageryPanel({
  value,
  onChange,
  slides,
  activeSlideId,
  onApplyToSlides,
  divisionId,
}: {
  value: unknown;
  onChange: (next: SlideBackgroundValue | null) => void;
  slides?: ApplyTargetSlide[];
  activeSlideId?: string;
  onApplyToSlides?: (slideIds: string[], next: SlideBackgroundValue | null) => void;
  divisionId?: string | null;
}) {
  const current = useMemo(() => resolveSlideBackground(value), [value]);
  const [tab, setTab] = useState<Tab>(() => {
    const k = current?.kind;
    if (k === "color") return "solid";
    if (k === "gradient") return "gradient";
    if (k === "pattern") return "pattern";
    if (k === "upload") return "upload";
    if (k === "ai") return "ai";
    return "library";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyMode, setApplyMode] = useState<"section" | "custom">("section");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [applyFlash, setApplyFlash] = useState<string | null>(null);
  const generate = useServerFn(generateBackgroundImage);

  // Brand library — approved division imagery uploaded via Admin > Knowledge.
  const listDivImagery = useServerFn(listDivisionImagery);
  const [brandQ, setBrandQ] = useState("");
  const brandQuery = useQuery({
    queryKey: ["bg-division-imagery", divisionId ?? "none"],
    queryFn: () => (divisionId ? listDivImagery({ data: { divisionId } }) : Promise.resolve([])),
    enabled: !!divisionId,
    staleTime: 60_000,
  });
  const brandResults = useMemo(() => {
    const rows = brandQuery.data ?? [];
    const q = brandQ.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = `${r.filename} ${r.note ?? ""} ${r.prompt ?? ""} ${(r.tags ?? []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [brandQuery.data, brandQ]);

  const activeSlide = useMemo(
    () => (slides ?? []).find((s) => s.id === activeSlideId) ?? null,
    [slides, activeSlideId],
  );
  const sectionSlides = useMemo(
    () => (slides ?? []).filter((s) => activeSlide && s.sectionId === activeSlide.sectionId),
    [slides, activeSlide],
  );
  const canApplyMany = Boolean(onApplyToSlides && slides && slides.length > 1);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function commitApply(ids: string[]) {
    if (!onApplyToSlides || ids.length === 0) return;
    const target = ids.filter((id) => id !== activeSlideId);
    if (target.length === 0) {
      setApplyFlash("Nothing to apply — only this slide selected.");
      return;
    }
    onApplyToSlides(target, current);
    setApplyFlash(`Applied to ${target.length} slide${target.length === 1 ? "" : "s"}.`);
    setApplyOpen(false);
    setSelectedIds(new Set());
    setTimeout(() => setApplyFlash(null), 2400);
  }

  // Local parametric state — seeded from `current`, updates emit via onChange.
  const solidColor = current?.kind === "color" ? current.color ?? "#03002C" : "#03002C";
  const solidIntensity = current?.kind === "color" ? current.intensity ?? 1 : 1;

  const gradA = current?.kind === "gradient" ? current.color ?? "#003FC7" : "#003FC7";
  const gradB = current?.kind === "gradient" ? current.colorB ?? "#03002C" : "#03002C";
  const gradAngle = current?.kind === "gradient" ? current.angle ?? 135 : 135;
  const gradIntensity = current?.kind === "gradient" ? current.intensity ?? 1 : 1;

  const patternId = current?.kind === "pattern" ? current.patternId ?? "dots" : "dots";
  const patFg = current?.kind === "pattern" ? current.color ?? "#03002C" : "#03002C";
  const patBg = current?.kind === "pattern" ? current.colorB ?? "#F2F2F2" : "#F2F2F2";
  const patIntensity = current?.kind === "pattern" ? current.intensity ?? 0.35 : 0.35;
  const patScale = current?.kind === "pattern" ? current.patternScale ?? 24 : 24;

  function commitSolid(next: { color?: string; intensity?: number }) {
    const color = next.color ?? solidColor;
    const intensity = next.intensity ?? solidIntensity;
    onChange({ kind: "color", color, intensity });
  }
  function commitGradient(next: { color?: string; colorB?: string; angle?: number; intensity?: number }) {
    onChange({
      kind: "gradient",
      color: next.color ?? gradA,
      colorB: next.colorB ?? gradB,
      angle: next.angle ?? gradAngle,
      intensity: next.intensity ?? gradIntensity,
    });
  }
  function commitPattern(next: {
    patternId?: typeof patternId;
    color?: string;
    colorB?: string;
    intensity?: number;
    patternScale?: number;
  }) {
    onChange({
      kind: "pattern",
      patternId: next.patternId ?? patternId,
      color: next.color ?? patFg,
      colorB: next.colorB ?? patBg,
      intensity: next.intensity ?? patIntensity,
      patternScale: next.patternScale ?? patScale,
    });
  }

  async function handleUpload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadSlideMedia(file);
      onChange({
        kind: "upload",
        url: uploaded.signedUrl,
        scrim: "bottom",
        scrimStrength: 0.55,
        imageDim: 0.1,
        darkChrome: true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate() {
    if (!aiPrompt.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { dataUrl } = await generate({ data: { prompt: aiPrompt.trim() } });
      const uploaded = await uploadDataUrl(dataUrl, "ai-background.png");
      onChange({
        kind: "ai",
        url: uploaded.signedUrl,
        scrim: "bottom",
        scrimStrength: 0.6,
        imageDim: 0.15,
        darkChrome: true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image generation failed.");
    } finally {
      setBusy(false);
    }
  }

  const solidPreview = buildSolidCss(solidColor, solidIntensity);
  const gradientPreview = buildGradientCss(gradA, gradB, gradAngle, gradIntensity);
  const patternPreview = buildPatternCss(patternId, patFg, patBg, patIntensity, patScale);

  return (
    <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-widest text-black/50">Background & Imagery</div>
        <div className="flex items-center gap-2">
          {canApplyMany && (
            <button
              type="button"
              onClick={() => setApplyOpen((v) => !v)}
              className="rounded-full border border-black/15 px-2.5 py-0.5 text-[11px] uppercase tracking-widest hover:bg-black/5"
              title="Apply this background to other slides"
            >
              Apply to…
            </button>
          )}
          {current && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-full border border-black/15 px-2.5 py-0.5 text-[11px] uppercase tracking-widest hover:bg-black/5"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {applyFlash && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {applyFlash}
        </div>
      )}

      {applyOpen && canApplyMany && activeSlide && (
        <div className="mt-3 rounded-2xl border border-black/10 bg-black/[0.02] p-4">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-widest text-black/60">
              Apply current background to
            </div>
            <button
              type="button"
              onClick={() => setApplyOpen(false)}
              className="text-[11px] uppercase tracking-widest text-black/50 hover:text-black"
            >
              Close
            </button>
          </div>

          <div className="mt-3 flex gap-1 rounded-full border border-black/10 bg-white p-1 text-[10px]">
            {(["section", "custom"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setApplyMode(m)}
                className={`flex-1 rounded-full px-2 py-1.5 uppercase tracking-widest transition ${
                  applyMode === m ? "bg-black text-white" : "text-black/60 hover:text-black"
                }`}
              >
                {m === "section" ? `Section · ${activeSlide.sectionName}` : "Custom selection"}
              </button>
            ))}
          </div>

          {applyMode === "section" && (
            <div className="mt-3 text-xs text-black/70">
              <div>
                {sectionSlides.length} slide{sectionSlides.length === 1 ? "" : "s"} in{" "}
                <span className="font-medium text-black">{activeSlide.sectionName}</span>.
                {sectionSlides.length > 1 && " Other slides in this section will inherit the current background."}
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => commitApply(sectionSlides.map((s) => s.id))}
                  disabled={sectionSlides.length <= 1}
                  className="rounded-full bg-black px-3 py-1.5 text-[11px] uppercase tracking-widest text-white disabled:opacity-40"
                >
                  Apply to section
                </button>
              </div>
            </div>
          )}

          {applyMode === "custom" && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-black/60">
                <span>Pick slides ({selectedIds.size} selected)</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set((slides ?? []).map((s) => s.id)))}
                    className="uppercase tracking-widest hover:text-black"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="uppercase tracking-widest hover:text-black"
                  >
                    None
                  </button>
                </div>
              </div>
              <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-black/10 bg-white">
                {(slides ?? []).map((s) => {
                  const checked = selectedIds.has(s.id);
                  const isActive = s.id === activeSlideId;
                  return (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-center gap-2 border-b border-black/5 px-3 py-2 text-xs last:border-b-0 ${
                        checked ? "bg-black/[0.03]" : "hover:bg-black/[0.02]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelected(s.id)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="w-6 font-mono text-[10px] text-black/40">
                        {String(s.position + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1 truncate">
                        <span className="text-black/50">{s.sectionName} · </span>
                        <span className="text-black">{s.title || "Untitled slide"}</span>
                      </span>
                      {isActive && (
                        <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-black/70">
                          Current
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => commitApply([...selectedIds])}
                  disabled={selectedIds.size === 0}
                  className="rounded-full bg-black px-3 py-1.5 text-[11px] uppercase tracking-widest text-white disabled:opacity-40"
                >
                  Apply to {selectedIds.size} slide{selectedIds.size === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-4 grid grid-cols-7 gap-1 rounded-full border border-black/10 bg-black/[0.03] p-1 text-[10px]">
        {(["library", "brand", "solid", "gradient", "pattern", "upload", "ai"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-2 py-1.5 uppercase tracking-widest transition ${
              tab === t ? "bg-black text-white" : "text-black/60 hover:text-black"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>
      )}

      {tab === "library" && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {BACKGROUND_PRESETS.map((p) => {
            const selected = current?.kind === "library" && current.presetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onChange({ kind: "library", presetId: p.id })}
                className={`group relative aspect-[4/3] overflow-hidden rounded-xl border transition ${
                  selected ? "border-black ring-2 ring-black/80" : "border-black/10 hover:border-black/30"
                }`}
                title={p.name}
              >
                <div className="absolute inset-0" style={{ background: p.css }} />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                  <div className="text-[9px] uppercase tracking-widest text-white/90 line-clamp-1">{p.name}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {tab === "brand" && (
        <div className="mt-4 space-y-3">
          {!divisionId && (
            <div className="rounded-xl border border-dashed border-black/15 px-4 py-6 text-center text-xs text-black/60">
              Set a brand / division on the deck to unlock approved imagery uploads.
            </div>
          )}
          {divisionId && (
            <>
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={brandQ}
                  onChange={(e) => setBrandQ(e.target.value)}
                  placeholder="Search approved imagery…"
                  className="flex-1 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs outline-none focus:border-black/30"
                />
                <span className="whitespace-nowrap text-[10px] uppercase tracking-widest text-black/40">
                  {brandQuery.isLoading ? "Loading…" : `${brandResults.length} of ${(brandQuery.data ?? []).length}`}
                </span>
              </div>
              {brandQuery.data && brandQuery.data.length === 0 && !brandQuery.isLoading && (
                <div className="rounded-xl border border-dashed border-black/15 px-4 py-6 text-center text-xs text-black/60">
                  No approved imagery uploaded yet for this brand.
                  <div className="mt-1 text-[11px] text-black/40">Add uploads in Admin · Knowledge · Imagery.</div>
                </div>
              )}
              {brandResults.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {brandResults.map((r) => {
                    const url = r.signedUrl;
                    if (!url) return null;
                    const selected =
                      (current?.kind === "upload" || current?.kind === "ai") && current.url === url;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() =>
                          onChange({
                            kind: "upload",
                            url,
                            scrim: "bottom",
                            scrimStrength: 0.55,
                            imageDim: 0.1,
                            darkChrome: true,
                          })
                        }
                        className={`group relative aspect-[4/3] overflow-hidden rounded-xl border transition ${
                          selected
                            ? "border-black ring-2 ring-black/80"
                            : "border-black/10 hover:border-black/30"
                        }`}
                        title={r.filename}
                      >
                        <img src={url} alt={r.filename} className="absolute inset-0 h-full w-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                          <div className="text-[9px] uppercase tracking-widest text-white/90 line-clamp-1">
                            {r.filename}
                          </div>
                          {(r.tags?.length ?? 0) > 0 && (
                            <div className="mt-0.5 line-clamp-1 text-[9px] text-white/60">
                              {r.tags.slice(0, 3).join(" · ")}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}


      {tab === "solid" && (
        <div className="mt-4 space-y-4">
          <div className="aspect-[16/6] w-full rounded-xl border border-black/10" style={{ background: solidPreview }} />
          <ColorField label="Color" value={solidColor} onChange={(c) => commitSolid({ color: c })} />
          <Slider
            label="Intensity"
            value={solidIntensity * 100}
            onChange={(n) => commitSolid({ intensity: n / 100 })}
          />
        </div>
      )}

      {tab === "gradient" && (
        <div className="mt-4 space-y-4">
          <div className="aspect-[16/6] w-full rounded-xl border border-black/10" style={{ background: gradientPreview }} />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Color A" value={gradA} onChange={(c) => commitGradient({ color: c })} />
            <ColorField label="Color B" value={gradB} onChange={(c) => commitGradient({ colorB: c })} />
          </div>
          <Slider
            label="Angle"
            min={0}
            max={360}
            value={gradAngle}
            onChange={(n) => commitGradient({ angle: n })}
            suffix="°"
          />
          <Slider
            label="Intensity"
            value={gradIntensity * 100}
            onChange={(n) => commitGradient({ intensity: n / 100 })}
          />
        </div>
      )}

      {tab === "pattern" && (
        <div className="mt-4 space-y-4">
          <div className="aspect-[16/6] w-full rounded-xl border border-black/10" style={{ background: patternPreview }} />
          <div>
            <div className="text-[11px] uppercase tracking-widest text-black/60">Pattern</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PATTERN_LIBRARY.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => commitPattern({ patternId: p.id })}
                  className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-widest transition ${
                    patternId === p.id
                      ? "bg-black text-white"
                      : "border border-black/15 text-black/70 hover:bg-black/5"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Foreground" value={patFg} onChange={(c) => commitPattern({ color: c })} />
            <ColorField label="Background" value={patBg} onChange={(c) => commitPattern({ colorB: c })} />
          </div>
          <Slider
            label="Intensity"
            value={patIntensity * 100}
            onChange={(n) => commitPattern({ intensity: n / 100 })}
          />
          <Slider
            label="Scale"
            min={12}
            max={64}
            value={patScale}
            onChange={(n) => commitPattern({ patternScale: n })}
            suffix="px"
          />
        </div>
      )}

      {tab === "upload" && (
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/15 bg-black/[0.02] p-6 text-center text-sm text-black/60 hover:border-black/30">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
            <span className="text-xs uppercase tracking-widest text-black/70">
              {busy ? "Uploading…" : "Click to upload image"}
            </span>
            <span className="mt-1 text-[11px] text-black/40">PNG, JPG, WebP · stored privately</span>
          </label>
          {current?.kind === "upload" && current.url && (
            <div className="overflow-hidden rounded-xl border border-black/10">
              <img src={current.url} alt="" className="aspect-[4/3] w-full object-cover" />
            </div>
          )}
        </div>
      )}

      {tab === "ai" && (
        <div className="mt-4 space-y-3">
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Cinematic wide-angle photo of a modern glass atrium at dusk, soft blue light, editorial grade"
            rows={3}
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/30"
          />
          <button
            type="button"
            disabled={busy || !aiPrompt.trim()}
            onClick={handleGenerate}
            className="w-full rounded-full bg-black px-4 py-2 text-xs uppercase tracking-widest text-white disabled:opacity-40"
          >
            {busy ? "Generating…" : "Generate with AI"}
          </button>
          {current?.kind === "ai" && current.url && (
            <div className="overflow-hidden rounded-xl border border-black/10">
              <img src={current.url} alt="" className="aspect-[4/3] w-full object-cover" />
            </div>
          )}
        </div>
      )}

      {/* Image positioning + scrim — upload / AI backgrounds */}
      {(current?.kind === "upload" || current?.kind === "ai") && (
        <div className="mt-4 space-y-4 border-t border-black/10 pt-4">
          {/* Live preview with position applied */}
          {current.url && (
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-black/10 bg-black">
              <img
                src={current.url}
                alt=""
                className="absolute inset-0 h-full w-full"
                style={{
                  objectFit: current.fit ?? "cover",
                  objectPosition: `${50 + (current.offsetX ?? 0) / 2}% ${50 + (current.offsetY ?? 0) / 2}%`,
                  transform:
                    current.zoom && current.zoom !== 1 ? `scale(${current.zoom})` : undefined,
                  transformOrigin: "center center",
                  filter: current.imageDim ? `brightness(${1 - current.imageDim})` : undefined,
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to top, rgba(3,0,44,${current.scrimStrength ?? 0.55}), rgba(3,0,44,0))`,
                }}
              />
            </div>
          )}

          {/* Fit */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-black/50">Crop / Fit</div>
            <div className="mt-1.5 flex gap-1.5">
              {(["cover", "contain"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => onChange({ ...current, fit: f })}
                  className={`flex-1 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-widest transition ${
                    (current.fit ?? "cover") === f
                      ? "bg-black text-white"
                      : "border border-black/15 text-black/70 hover:bg-black/5"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <Slider
            label="Zoom"
            min={100}
            max={300}
            value={Math.round((current.zoom ?? 1) * 100)}
            onChange={(n) => onChange({ ...current, zoom: n / 100 })}
            suffix="%"
          />
          <Slider
            label="Pan · Horizontal"
            min={-100}
            max={100}
            value={current.offsetX ?? 0}
            onChange={(n) => onChange({ ...current, offsetX: n })}
          />
          <Slider
            label="Pan · Vertical"
            min={-100}
            max={100}
            value={current.offsetY ?? 0}
            onChange={(n) => onChange({ ...current, offsetY: n })}
          />
          <button
            type="button"
            onClick={() => onChange({ ...current, zoom: 1, offsetX: 0, offsetY: 0, fit: "cover" })}
            className="w-full rounded-full border border-black/15 px-3 py-1.5 text-[10px] uppercase tracking-widest text-black/70 hover:bg-black/5"
          >
            Reset framing
          </button>

          <div className="border-t border-black/10 pt-4">
            <div className="text-[10px] uppercase tracking-widest text-black/50">Legibility scrim</div>
            <Slider
              label="Scrim opacity"
              value={Math.round((current.scrimStrength ?? 0.55) * 100)}
              onChange={(n) => onChange({ ...current, scrimStrength: n / 100 })}
            />
            <Slider
              label="Image dim"
              value={Math.round((current.imageDim ?? 0.1) * 100)}
              onChange={(n) => onChange({ ...current, imageDim: n / 100 })}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(["bottom", "top", "left", "right", "full", "vignette"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange({ ...current, scrim: s })}
                  className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-widest transition ${
                    (current.scrim ?? "bottom") === s
                      ? "bg-black text-white"
                      : "border border-black/15 text-black/70 hover:bg-black/5"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Backgrounds & Imagery inspector panel for the deck editor. Three tabs:
//   Library — curated on-brand gradients / patterns (no external upload)
//   Upload  — user-supplied image (Supabase Storage / slide-media bucket)
//   AI      — Lovable AI Gateway image generation
//
// Writes to slide `content.background` via updateField(deck.id, slide.id,
// "background", value). Applies to any slide regardless of variant — the
// SlideBackdropContext in VariantRenderer wires it into SlideChrome.

import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BACKGROUND_PRESETS, resolveSlideBackground, type SlideBackgroundValue } from "@/lib/background-library";
import { uploadDataUrl, uploadSlideMedia } from "@/lib/slide-media";
import { generateBackgroundImage } from "@/lib/ai-image.functions";

type Tab = "library" | "upload" | "ai";

export function BackgroundImageryPanel({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (next: SlideBackgroundValue | null) => void;
}) {
  const current = useMemo(() => resolveSlideBackground(value), [value]);
  const [tab, setTab] = useState<Tab>("library");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");

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
      const { dataUrl } = await generateBackgroundImage({ data: { prompt: aiPrompt.trim() } });
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

  return (
    <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-black/50">Background & Imagery</div>
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

      {/* Tabs */}
      <div className="mt-4 flex gap-1 rounded-full border border-black/10 bg-black/[0.03] p-1 text-xs">
        {(["library", "upload", "ai"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full px-3 py-1.5 uppercase tracking-widest transition ${
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

      {/* Scrim controls (image-backed backgrounds only) */}
      {(current?.kind === "upload" || current?.kind === "ai") && (
        <div className="mt-4 space-y-3 border-t border-black/10 pt-4">
          <div className="text-[10px] uppercase tracking-widest text-black/50">Legibility scrim</div>
          <div>
            <label className="text-[11px] text-black/60">
              Scrim strength · {Math.round((current.scrimStrength ?? 0.55) * 100)}%
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round((current.scrimStrength ?? 0.55) * 100)}
              onChange={(e) =>
                onChange({ ...current, scrimStrength: Number(e.target.value) / 100 })
              }
              className="w-full"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
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
      )}
    </div>
  );
}

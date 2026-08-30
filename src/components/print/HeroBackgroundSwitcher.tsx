// -----------------------------------------------------------------------------
// HERO BACKGROUND SWITCHER
//
// Swap the hero background on ANY print surface — including masters that ship
// with no `heroMedia` at all (the "bland" Client Spotlight master). Every other
// hero control in the app is gated on an existing image, which left flat
// masters with no way in. This panel always renders:
//
//   • curated starter frames from the active division's photography pool
//   • "Browse library" → the shared division imagery repository
//   • a direct image URL field
//   • "None" → back to the flat brand page field
//
// Picking a frame synthesises a tuned `PrintHeroMedia` (wash + scrim) via
// autoHeroMedia so hero copy stays legible, then keeps any authored crop,
// focal point and band height the surface already had.
// -----------------------------------------------------------------------------

import { useMemo, useState } from "react";
import { ImageOff, Images, Shuffle } from "lucide-react";

import { DivisionImageryPicker } from "@/components/print/DivisionImageryPicker";
import { autoHeroMedia } from "@/components/print/printHeroFallback";
import { getDivisionImagery } from "@/assets/backdrops/divisions";
import type { PrintHeroMedia } from "@/lib/print-assets.types";

export function HeroBackgroundSwitcher({
  value,
  onChange,
  divisionId,
  mode = "light",
  seed = "hero",
  className,
}: {
  value: PrintHeroMedia | undefined;
  onChange: (next: PrintHeroMedia | undefined) => void;
  /** Brand mode id used for the curated starter pool + library scope. */
  divisionId: string | null | undefined;
  mode?: "light" | "dark";
  /** Deterministic seed for the "surprise me" pick. */
  seed?: string;
  className?: string;
}) {
  const [browseOpen, setBrowseOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  const starters = useMemo(() => {
    const set = getDivisionImagery(divisionId || "bm-enterprise");
    const pool =
      mode === "light" && set.light?.length
        ? [...set.light, ...set.photos]
        : [...set.photos, ...set.abstracts];
    return [...new Set(pool)].slice(0, 12);
  }, [divisionId, mode]);

  /** Keep the authored band geometry; only the picture changes. */
  function applyImage(imageUrl: string) {
    const base = autoHeroMedia(divisionId || "bm-enterprise", seed, mode);
    onChange({ ...base, ...(value ?? {}), imageUrl });
  }

  const active = value?.imageUrl;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/50 dark:text-white/50">
          Hero background
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const pick = starters[Math.floor(Math.random() * starters.length)];
              if (pick) applyImage(pick);
            }}
            disabled={starters.length === 0}
            title="Pick a curated frame for me"
            className="inline-flex items-center gap-1 rounded-full border border-black/10 px-2 py-1 text-[10px] font-semibold text-black/60 transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-40 dark:border-white/15 dark:text-white/60"
          >
            <Shuffle size={11} /> Surprise
          </button>
          <button
            type="button"
            onClick={() => setBrowseOpen(true)}
            title="Browse the division imagery library"
            className="inline-flex items-center gap-1 rounded-full border border-black/10 px-2 py-1 text-[10px] font-semibold text-black/60 transition hover:border-[#003FC7] hover:text-[#003FC7] dark:border-white/15 dark:text-white/60"
          >
            <Images size={11} /> Browse
          </button>
        </div>
      </div>

      <p className="mb-2 text-[11px] leading-[1.5] text-black/55 dark:text-white/55">
        {active
          ? "Pick a different frame — crop, focal point and band height are kept."
          : "This master has no hero photo yet. Pick a frame to switch on the hero band."}
      </p>

      <div className="grid grid-cols-4 gap-1.5">
        {/* Flat / no photo */}
        <button
          type="button"
          onClick={() => onChange(undefined)}
          title="No hero photo — flat brand page field"
          aria-pressed={!active}
          className={`flex aspect-[4/3] items-center justify-center rounded-md border text-[10px] font-semibold transition ${
            !active
              ? "border-[#003FC7] bg-[#003FC7]/10 text-[#003FC7]"
              : "border-black/10 text-black/45 hover:border-[#003FC7]/60 dark:border-white/15 dark:text-white/45"
          }`}
        >
          <ImageOff size={14} />
        </button>

        {starters.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => applyImage(url)}
            aria-pressed={active === url}
            title="Use this frame as the hero background"
            className={`overflow-hidden rounded-md border transition ${
              active === url
                ? "border-[#003FC7] ring-2 ring-[#003FC7]/35"
                : "border-black/10 hover:border-[#003FC7]/60 dark:border-white/15"
            }`}
          >
            <img
              src={url}
              alt=""
              loading="lazy"
              className="aspect-[4/3] h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <input
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          placeholder="…or paste an image URL"
          className="min-w-0 flex-1 rounded-md border border-black/12 bg-white px-2 py-1 text-[11px] outline-none focus:border-[#003FC7] dark:border-white/15 dark:bg-white/[0.04]"
        />
        <button
          type="button"
          onClick={() => {
            const url = urlDraft.trim();
            if (!url) return;
            applyImage(url);
            setUrlDraft("");
          }}
          className="rounded-md border border-black/12 px-2 py-1 text-[11px] font-semibold text-black/65 transition hover:border-[#003FC7] hover:text-[#003FC7] dark:border-white/15 dark:text-white/65"
        >
          Use
        </button>
      </div>

      <DivisionImageryPicker
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        divisionId={divisionId ?? "bm-enterprise"}
        onPick={(entry) => {
          const url = (entry as { url?: string; publicUrl?: string }).url ??
            (entry as { publicUrl?: string }).publicUrl ??
            "";
          if (url) applyImage(url);
          setBrowseOpen(false);
        }}
      />
    </div>
  );
}

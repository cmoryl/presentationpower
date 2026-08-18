/**
 * BACKGROUND LIGHTBOX — click any library background tile to view it large and
 * download it.
 *
 * The enlarged view paints the identical live `GroundPlane` the tile does, at
 * up to ~1120px wide, so grain, orb falloff and reading-zone clearance can be
 * judged properly. Downloads re-render the same composition offscreen at true
 * slide size and capture a PNG, so the file matches the preview exactly.
 */

import * as React from "react";
import { GroundPlane } from "@/components/skins/ApprovedStyleThumb";
import type { StylePack } from "@/lib/style-packs";
import type { SkinScene } from "@/lib/skin-backgrounds";
import {
  GROUND_PNG_SIZES,
  downloadDataUrl,
  groundCss,
  groundCssLayers,
  groundFileName,
  rasterizeGroundPng,
  type GroundPngSizeId,
} from "@/lib/ground-png";


export type BackgroundShot = {
  pack: StylePack;
  /** `R07` / `S04` — used for the caption and the download filename. */
  code: string;
  name?: string;
  scene: SkinScene | string;
  take: number;
  /** Extra metadata line, e.g. "Aurora drift · dark". */
  meta?: string;
  palette?: string[];
};

const seedFor = (shot: BackgroundShot) =>
  `scene:${shot.scene} take:${((shot.take % 4) + 4) % 4}`;

export function BackgroundLightbox({
  shot,
  onClose,
}: {
  shot: BackgroundShot | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = React.useState<GroundPngSizeId | null>(null);
  const [note, setNote] = React.useState<string | null>(null);
  const [showCss, setShowCss] = React.useState(false);
  const [copied, setCopied] = React.useState<number | "all" | null>(null);

  React.useEffect(() => {
    if (!shot) return;
    setNote(null);
    setCopied(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shot, onClose]);

  if (!shot) return null;
  const seed = seedFor(shot);
  const title = `${shot.code}${shot.name ? ` · ${shot.name}` : ""}`;
  const layers = groundCssLayers(shot.pack, seed);

  const download = async (size: (typeof GROUND_PNG_SIZES)[number]) => {
    setBusy(size.id);
    setNote(null);
    const png = await rasterizeGroundPng(shot.pack, seed, size.ratio);
    setBusy(null);
    if (!png) {
      setNote("Could not render that PNG in this browser — try a smaller size.");
      return;
    }
    downloadDataUrl(png, groundFileName(shot.code, String(shot.scene), shot.take, size.ratio));
    setNote(`Downloaded ${size.label} PNG.`);
  };

  const write = async (text: string, key: number | "all", label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setNote(`${label} copied to the clipboard.`);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    } catch {
      setNote("Clipboard is blocked in this browser.");
    }
  };

  const copyCss = () => {
    setShowCss(true);
    void write(groundCss(shot.pack, seed), "all", "Full layer stack");
  };


  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Background preview — ${title} · ${shot.scene} · take ${shot.take + 1}`}
      onClick={onClose}
      className="fixed inset-0 z-[130] flex items-center justify-center bg-[#03002C]/88 p-4 backdrop-blur-sm sm:p-8"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[1160px] overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0B0A2E]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-[#03002C] dark:text-white">
              <span className="text-[#003FC7] dark:text-[#A1FBF9]">{shot.code}</span>
              {shot.name ? ` · ${shot.name}` : ""}
            </p>
            <p className="truncate text-[11px] uppercase tracking-wider text-black/45 dark:text-white/45">
              {shot.scene} · take {shot.take + 1}
              {shot.meta ? ` · ${shot.meta}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {shot.palette?.length ? (
              <span className="hidden items-center gap-1 sm:flex" aria-hidden>
                {shot.palette.slice(0, 5).map((c) => (
                  <span
                    key={c}
                    className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
                    style={{ background: c }}
                  />
                ))}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-black/12 px-3 py-1.5 text-[11px] font-semibold text-[#03002C]/70 transition hover:border-[#003FC7]/40 hover:text-[#003FC7] dark:border-white/20 dark:text-white/70"
            >
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto overscroll-contain p-4">
          <div
            className="relative w-full overflow-hidden rounded-xl ring-1 ring-black/10 dark:ring-white/10"
            style={{ aspectRatio: "16 / 9", backgroundColor: shot.pack.tokens.surface }}
          >
            <GroundPlane pack={shot.pack} seed={seed} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">
              Download PNG
            </span>
            {GROUND_PNG_SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={busy !== null}
                onClick={() => void download(s)}
                title={s.hint}
                className="inline-flex min-h-8 items-center rounded-full bg-[#003FC7] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#0033A3] disabled:opacity-50"
              >
                {busy === s.id ? "Rendering…" : s.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCss((v) => !v)}
              aria-expanded={showCss}
              className="inline-flex min-h-8 items-center rounded-full border border-black/12 px-3 py-1.5 text-[11px] font-semibold text-[#03002C]/70 transition hover:border-[#003FC7]/40 hover:text-[#003FC7] dark:border-white/20 dark:text-white/70"
            >
              {showCss ? "Hide CSS layers" : `CSS layers (${layers.length})`}
            </button>
            <button
              type="button"
              onClick={copyCss}
              className="inline-flex min-h-8 items-center rounded-full border border-black/12 px-3 py-1.5 text-[11px] font-semibold text-[#03002C]/70 transition hover:border-[#003FC7]/40 hover:text-[#003FC7] dark:border-white/20 dark:text-white/70"
            >
              {copied === "all" ? "Copied ✓" : "Copy CSS"}
            </button>
            {note && (
              <span role="status" className="text-[11px] text-black/55 dark:text-white/55">
                {note}
              </span>
            )}
          </div>

          {showCss && (
            <section
              aria-label="Computed background layer stack"
              className="mt-3 rounded-xl border border-black/10 bg-[#F7F8FC] p-3 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">
                  Computed layer stack
                </h3>
                <p className="text-[10px] text-black/45 dark:text-white/45">
                  Painted top-to-bottom in this order — layer 1 sits on top of the base surface.
                </p>
              </header>
              <ol className="space-y-2">
                {layers.map((layer) => (
                  <li
                    key={layer.index}
                    className="rounded-lg border border-black/10 bg-white p-2 dark:border-white/10 dark:bg-[#0B0A2E]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#003FC7]/10 px-1.5 text-[10px] font-bold text-[#003FC7] dark:bg-[#A1FBF9]/15 dark:text-[#A1FBF9]">
                          {layer.index}
                        </span>
                        <span className="truncate text-[11px] font-semibold text-[#03002C] dark:text-white">
                          {layer.kind}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => void write(layer.css, layer.index, `Layer ${layer.index}`)}
                        className="inline-flex min-h-7 shrink-0 items-center rounded-full border border-black/12 px-2.5 py-1 text-[10px] font-semibold text-[#03002C]/70 transition hover:border-[#003FC7]/40 hover:text-[#003FC7] dark:border-white/20 dark:text-white/70"
                      >
                        {copied === layer.index ? "Copied ✓" : "Copy"}
                      </button>
                    </div>
                    <pre className="mt-1.5 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-md bg-black/[0.04] p-2 text-[10px] leading-relaxed text-[#03002C]/80 dark:bg-white/[0.06] dark:text-white/75">
                      <code>{layer.css}</code>
                    </pre>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

      </div>
    </div>
  );
}

/**
 * Wraps a background thumb in a keyboard-accessible button that opens the
 * lightbox. Any gallery can adopt click-to-enlarge by wrapping its tile.
 */
export function BackgroundZoom({
  shot,
  children,
  className = "",
}: {
  shot: BackgroundShot;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${shot.code} ${shot.scene} take ${shot.take + 1} larger and download`}
        className={`group relative block w-full cursor-zoom-in overflow-hidden rounded-[inherit] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7] ${className}`}
      >
        {children}
        <span
          aria-hidden
          className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-[#03002C]/70 px-1.5 py-0.5 text-[9px] font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          ⤢ Enlarge
        </span>
      </button>
      {open && <BackgroundLightbox shot={shot} onClose={() => setOpen(false)} />}
    </>
  );
}

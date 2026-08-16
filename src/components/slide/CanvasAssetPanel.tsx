import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ASSET_ACCEPT, prepareAssets, type UploadedAsset } from "@/lib/asset-upload";
import { CANVAS_UI_ATTR } from "@/lib/canvas-adopt";
import { listSlideMedia } from "@/lib/slide-media";

/**
 * Asset panel — upload your own photos, icons and SVGs, then either PLACE one
 * as a new object or REPLACE the artwork inside something already positioned on
 * the slide (a photo tile, an icon badge, a client logo).
 *
 * "Replace" is the point of this panel: swapping the source keeps the frame,
 * crop, corner radius, z-order and grouping exactly as designed, so a curated
 * layout survives a last-minute imagery change.
 */
export function CanvasAssetPanel({
  accent,
  replaceCount,
  onPlace,
  onReplace,
  onClose,
}: {
  accent: string;
  /** How many image objects are selected — drives the Replace affordance. */
  replaceCount: number;
  onPlace: (asset: UploadedAsset) => void;
  onReplace: (asset: UploadedAsset) => void;
  onClose: () => void;
}) {
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [libraryNote, setLibraryNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canReplace = replaceCount > 0;

  /** Previously uploaded imagery, so a returning curator can re-use instead of
   *  hunting for the original file again. */
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const items = await listSlideMedia(24);
        if (!alive || items.length === 0) return;
        setAssets((prev) => {
          const have = new Set(prev.map((a) => a.path).filter(Boolean));
          const stored: UploadedAsset[] = items
            .filter((i) => !have.has(i.path))
            .map((i) => ({
              id: `lib-${i.path}`,
              src: i.url,
              // Aspect is unknown until it decodes; 16:9 is the sane placement
              // default and `contain` keeps it honest either way.
              aspect: 16 / 9,
              alt: i.name.replace(/^\d+-/, "").replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "),
              kind: /\.svg$/i.test(i.name) ? "vector" : "photo",
              path: i.path,
              inline: false,
              bytes: i.size,
            }));
          return [...prev, ...stored];
        });
      } catch {
        if (alive) setLibraryNote(null); // signed out / empty — nothing to show
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const ingest = useCallback(async (files: FileList | readonly File[] | null) => {
    const list = [...(files ?? [])];
    if (list.length === 0) return;
    setBusy(true);
    setNote(null);
    const results = await prepareAssets(list);
    const good = results.flatMap((r) => (r.ok ? [r.asset] : []));
    const bad = results.flatMap((r) => (r.ok ? [] : [`${r.name}: ${r.reason}`]));
    if (good.length) setAssets((prev) => [...good, ...prev]);
    setBusy(false);
    const inlineOnly = good.some((a) => a.kind === "photo" && a.inline);
    setNote(
      [
        good.length ? `Added ${good.length} asset${good.length === 1 ? "" : "s"}.` : null,
        inlineOnly ? "Sign in to store photos in your media library." : null,
        ...bad,
      ]
        .filter(Boolean)
        .join(" ") || null,
    );
  }, []);

  const grouped = useMemo(
    () => ({
      photos: assets.filter((a) => a.kind === "photo"),
      vectors: assets.filter((a) => a.kind === "vector"),
    }),
    [assets],
  );

  const card = (asset: UploadedAsset) => (
    <figure
      key={asset.id}
      className="overflow-hidden rounded-xl border border-white/12 bg-white/5"
    >
      <div className="grid h-20 place-items-center bg-[#03002C] p-1.5">
        <img
          src={asset.src}
          alt={asset.alt}
          loading="lazy"
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <figcaption className="space-y-1 px-1.5 pb-1.5 pt-1">
        <p className="truncate text-[10px] text-white/65" title={asset.alt}>
          {asset.alt}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onPlace(asset)}
            className="min-h-7 flex-1 rounded-md text-[11px] font-semibold text-white/85 transition-colors hover:text-white"
            style={{ background: "rgba(255,255,255,0.10)" }}
          >
            Place
          </button>
          <button
            type="button"
            disabled={!canReplace}
            onClick={() => onReplace(asset)}
            title={
              canReplace
                ? `Swap the artwork in ${replaceCount} selected object${replaceCount === 1 ? "" : "s"}`
                : "Select a photo, icon or logo on the slide first"
            }
            className="min-h-7 flex-1 rounded-md text-[11px] font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: accent, color: "#FFFFFF" }}
          >
            Replace
          </button>
        </div>
      </figcaption>
    </figure>
  );

  return (
    <div
      {...{ [CANVAS_UI_ATTR]: "" }}
      className="flex max-h-full w-80 flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#03002C]/95 text-white shadow-2xl backdrop-blur"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <h3 className="text-[12px] font-semibold tracking-tight">Assets</h3>
        <span className="text-[10px] text-white/50">photos · icons · SVG</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close asset panel"
          className="ml-auto min-h-8 rounded-lg px-2 text-white/70 hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 border-b border-white/10 px-3 py-2.5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void ingest(e.dataTransfer?.files ?? null);
          }}
          className="rounded-xl border border-dashed p-3 text-center transition-colors"
          style={{
            borderColor: dragOver ? accent : "rgba(255,255,255,0.28)",
            background: dragOver ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
          }}
        >
          <p className="text-[11px] text-white/70">
            Drop photos, icons or SVGs here
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="mt-2 min-h-8 rounded-lg px-3 text-[12px] font-semibold disabled:opacity-60"
            style={{ background: accent, color: "#FFFFFF" }}
          >
            {busy ? "Uploading…" : "Choose files"}
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ASSET_ACCEPT}
            className="hidden"
            onChange={(e) => {
              void ingest(e.target.files);
              e.target.value = "";
            }}
          />
          <p className="mt-1.5 text-[10px] text-white/45">PNG, JPEG, WebP, GIF, SVG · up to 12 MB</p>
        </div>

        <p className="text-[10px] leading-snug text-white/55">
          {canReplace
            ? `Replace swaps the artwork inside ${replaceCount} selected object${replaceCount === 1 ? "" : "s"} — frame, crop and layer order stay put.`
            : "Select a photo, icon or logo on the slide to enable Replace. Use “pick section” to grab one the module drew."}
        </p>

        {note && (
          <p role="status" className="text-[10px] leading-snug text-white/70">
            {note}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
        {assets.length === 0 ? (
          <p className="px-1 py-6 text-center text-[11px] text-white/45">
            {libraryNote ?? "Nothing uploaded yet."}
          </p>
        ) : (
          (["photos", "vectors"] as const).map((key) =>
            grouped[key].length === 0 ? null : (
              <section key={key} className="mb-3 last:mb-0">
                <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  {key === "photos" ? "Photos" : "Icons + vectors"}
                </h4>
                <div className="grid grid-cols-2 gap-1.5">{grouped[key].map(card)}</div>
              </section>
            ),
          )
        )}
      </div>
    </div>
  );
}

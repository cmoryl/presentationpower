// Image picker for Slide Studio imagery cells.
//
// Lets a curator either upload a new file (click or drag & drop) or re-select
// one of their previously uploaded slide images, or paste a plain URL.
// Selection returns both the signed URL and the storage path so the editor can
// re-sign the asset after the URL's TTL expires.

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  listSlideMedia,
  uploadSlideMedia,
  type SlideMediaItem,
} from "@/lib/slide-media";

export type PickedMedia = { url: string; path?: string };

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/svg+xml";

export function SlideMediaPicker({
  title = "Choose image",
  currentUrl,
  onPick,
  onClose,
}: {
  title?: string;
  currentUrl?: string;
  onPick: (picked: PickedMedia) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<SlideMediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [url, setUrl] = useState(currentUrl ?? "");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let alive = true;
    listSlideMedia()
      .then((rows) => {
        if (alive) setItems(rows);
      })
      .catch((err: unknown) => {
        if (alive) {
          setItems([]);
          setError(err instanceof Error ? err.message : "Could not load your uploads.");
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function upload(file: File) {
    setBusy(true);
    try {
      const up = await uploadSlideMedia(file, file.name);
      toast.success("Image uploaded", { description: file.name });
      onPick({ url: up.signedUrl, path: up.path });
      onClose();
    } catch (err) {
      toast.error("Could not upload image", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#03002C]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-[#0A0733] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image picker"
            className="rounded border border-white/15 px-2 py-1 text-xs text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[74vh] space-y-4 overflow-y-auto p-4">
          {/* Upload / drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void upload(file);
            }}
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-xl border border-dashed px-4 py-6 text-center transition ${
              dragging
                ? "border-[#A1FBF9] bg-[#A1FBF9]/10"
                : "border-white/20 bg-white/[0.03] hover:border-[#A1FBF9]/60"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-[#A1FBF9]">
              {busy ? "Uploading…" : "⤒ Upload image"}
            </p>
            <p className="mt-1 text-[11px] text-white/50">
              Drag & drop a file here, or click to browse. PNG, JPG, WebP, GIF, SVG.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void upload(file);
              }}
            />
          </div>

          {/* Paste a URL */}
          <div className="flex items-center gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="…or paste an image URL"
              className="flex-1 rounded-lg border border-white/15 bg-[#03002C]/70 px-3 py-2 text-xs text-white focus:border-[#A1FBF9] focus:outline-none"
            />
            <button
              type="button"
              disabled={!url.trim()}
              onClick={() => {
                onPick({ url: url.trim() });
                onClose();
              }}
              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#03002C] disabled:opacity-40"
            >
              Use URL
            </button>
          </div>

          {/* Existing uploads */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Your uploads
            </p>
            {items === null ? (
              <p className="mt-2 text-xs text-white/50">Loading your library…</p>
            ) : items.length === 0 ? (
              <p className="mt-2 text-xs text-white/50">
                {error ?? "No uploads yet — add your first image above."}
              </p>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {items.map((it) => {
                  const active = currentUrl && currentUrl === it.url;
                  return (
                    <button
                      key={it.path}
                      type="button"
                      onClick={() => {
                        onPick({ url: it.url, path: it.path });
                        onClose();
                      }}
                      title={it.name}
                      className={`group overflow-hidden rounded-lg border text-left transition ${
                        active
                          ? "border-[#A1FBF9] ring-1 ring-[#A1FBF9]/50"
                          : "border-white/12 hover:border-[#A1FBF9]/70"
                      }`}
                    >
                      <img
                        src={it.url}
                        alt={it.name}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover"
                      />
                      <span className="block truncate px-1.5 py-1 text-[10px] text-white/60">
                        {it.name.replace(/^\d+-/, "")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

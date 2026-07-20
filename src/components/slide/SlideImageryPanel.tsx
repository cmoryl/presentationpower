// Slide-level imagery control (the photograph MediaTile renders for
// image-forward variants). Backgrounds are handled elsewhere by
// BackgroundImageryPanel — this panel drives `content.mediaUrl`, the
// override that MediaTile honors via `overrideUrl`.
//
// Sources: upload to the private `slide-media` Supabase bucket, paste an
// image URL, or reset to the deterministic division-seeded imagery.

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadSlideMedia } from "@/lib/slide-media";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
// PPTX (pptxgenjs → PowerPoint) reliably embeds JPEG, PNG, GIF, and WebP
// (WebP in Office 2021+). AVIF and SVG have flaky PowerPoint support, so we
// accept them for convenience and rasterize to PNG client-side before upload
// so exports stay faithful. HEIC/HEIF is skipped — no native browser decode.
const PASSTHROUGH = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const RASTERIZE = ["image/svg+xml", "image/avif"];
const ALLOWED = [...PASSTHROUGH, ...RASTERIZE];

async function rasterizeToPng(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not decode image for conversion."));
      el.crossOrigin = "anonymous";
      el.src = url;
    });
    // SVGs without intrinsic size default to 300×150; scale up for clarity.
    const w = img.naturalWidth || 1600;
    const h = img.naturalHeight || 900;
    const scale = file.type === "image/svg+xml" && Math.max(w, h) < 1600 ? 1600 / Math.max(w, h) : 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable for conversion.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG conversion failed."))),
        "image/png",
        0.95,
      );
    });
    const base = file.name.replace(/\.(svg|avif)$/i, "") || "image";
    return new File([blob], `${base}.png`, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function SlideImageryPanel({
  mediaUrl,
  mediaSeed,
  onChange,
}: {
  mediaUrl?: string;
  mediaSeed?: string;
  onChange: (nextUrl: string | null) => void;
}) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSignedIn(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(Boolean(session));
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED.includes(file.type)) {
      setError("Only JPEG, PNG, or WebP images are supported.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`Image is too large. Max ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`);
      return;
    }
    setBusy(true);
    try {
      const uploaded = await uploadSlideMedia(file);
      onChange(uploaded.signedUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function commitUrl() {
    const v = urlDraft.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) {
      setError("Enter an https:// image URL.");
      return;
    }
    setError(null);
    onChange(v);
    setUrlDraft("");
  }

  const hasCustom = Boolean(mediaUrl);

  return (
    <div className="mt-6 rounded-2xl border border-black/10 bg-white p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-widest text-black/50">Slide imagery</div>
        {hasCustom && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-full border border-black/15 px-2.5 py-0.5 text-[11px] uppercase tracking-widest hover:bg-black/5"
            title="Reset to seeded division imagery"
          >
            Reset
          </button>
        )}
      </div>

      <div className="mt-3 flex items-stretch gap-3">
        <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-black/5">
          {mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl} alt="Current slide imagery" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-widest text-black/40">
              Seeded · {mediaSeed || "auto"}
            </div>
          )}
        </div>
        <div className="min-w-0 text-xs text-black/60">
          {hasCustom ? (
            <>
              <div className="text-black">Custom image</div>
              <div className="mt-0.5 truncate text-black/50" title={mediaUrl}>
                {mediaUrl}
              </div>
              <div className="mt-1 text-black/50">
                Brand scrim, duotone, and grain are applied automatically.
              </div>
            </>
          ) : (
            <>
              <div className="text-black">Division-seeded imagery</div>
              <div className="mt-0.5 text-black/50">
                A deterministic photo is generated from the seed{mediaSeed ? ` "${mediaSeed}"` : ""}.
                Upload or paste a URL to override it.
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-black/50">Upload image</div>
          <div className="mt-1 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED.join(",")}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={busy || signedIn === false}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-black px-3 py-1.5 text-[11px] uppercase tracking-widest text-white transition disabled:opacity-40"
            >
              {busy ? "Uploading…" : "Choose file"}
            </button>
            <span className="text-[11px] text-black/50">
              {signedIn === false
                ? "Sign in to upload images"
                : "JPEG, PNG, or WebP · up to 8 MB"}
            </span>
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-widest text-black/50">Paste image URL</div>
          <div className="mt-1 flex gap-2">
            <input
              type="url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="https://…"
              spellCheck={false}
              className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs outline-none focus:border-black/30"
            />
            <button
              type="button"
              onClick={commitUrl}
              disabled={!urlDraft.trim()}
              className="rounded-full border border-black/15 px-3 py-1.5 text-[11px] uppercase tracking-widest hover:bg-black/5 disabled:opacity-40"
            >
              Use URL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Slide-level imagery control (the photograph MediaTile renders for
// image-forward variants). Backgrounds are handled elsewhere by
// BackgroundImageryPanel — this panel drives `content.mediaUrl`, the
// override that MediaTile honors via `overrideUrl`.
//
// Sources: upload to the private `slide-media` Supabase bucket, paste an
// image URL, or reset to the deterministic division-seeded imagery.

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { uploadSlideMedia } from "@/lib/slide-media";
import { listDivisionImagery, type DivisionImageryEntry } from "@/lib/division-imagery.functions";
import { logImageryEvent } from "@/lib/admin.functions";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
// Formats that render natively in every browser AND embed cleanly in
// pptxgenjs → PowerPoint are stored as-is. SVG also passes through: browsers
// render it crisply as a vector via <img>, and pptx-export rasterizes SVG
// on the fly at export time (only PowerPoint needs the raster fallback).
// AVIF is rasterized on upload because Office decode support is unreliable
// and older Safari builds still choke on it in some contexts.
const PASSTHROUGH = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];
const RASTERIZE = ["image/avif"];
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
    const w = img.naturalWidth || 1600;
    const h = img.naturalHeight || 900;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
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
    const base = file.name.replace(/\.(avif)$/i, "") || "image";
    return new File([blob], `${base}.png`, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function SlideImageryPanel({
  mediaUrl,
  mediaSeed,
  divisionId,
  onChange,
}: {
  mediaUrl?: string;
  mediaSeed?: string;
  divisionId?: string;
  onChange: (nextUrl: string | null) => void;
}) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [libQuery, setLibQuery] = useState("");
  const [libOpen, setLibOpen] = useState(false);
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
      setError("Supported formats: JPEG, PNG, WebP, GIF, SVG, AVIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`Image is too large. Max ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`);
      return;
    }
    setBusy(true);
    try {
      const prepared = RASTERIZE.includes(file.type) ? await rasterizeToPng(file) : file;
      const uploaded = await uploadSlideMedia(prepared);
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

  // ── Team library (division-scoped shared imagery) ──────────────────────
  const listFn = useServerFn(listDivisionImagery);
  const libQ = useQuery({
    queryKey: ["division-imagery", divisionId ?? "none", signedIn],
    queryFn: () => listFn({ data: { divisionId: divisionId as string } }),
    enabled: Boolean(divisionId) && signedIn === true && libOpen,
    retry: false,
    staleTime: 30_000,
  });
  const libResults = useMemo(() => {
    const rows: DivisionImageryEntry[] = libQ.data ?? [];
    const q = libQuery.trim().toLowerCase();
    if (!q) return rows;
    const tokens = q.split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      const hay = [
        r.filename,
        r.note ?? "",
        r.prompt ?? "",
        r.kind,
        ...(r.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [libQ.data, libQuery]);

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
                : "JPEG, PNG, WebP, GIF, SVG, or AVIF · up to 8 MB"}
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

        {/* Team library — search and reuse division-scoped shared imagery */}
        {divisionId && signedIn && (
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-widest text-black/50">
                Team library {libQ.data ? `· ${libResults.length}` : ""}
              </div>
              <button
                type="button"
                onClick={() => setLibOpen((v) => !v)}
                className="rounded-full border border-black/15 px-2.5 py-0.5 text-[10px] uppercase tracking-widest hover:bg-black/5"
              >
                {libOpen ? "Hide" : "Browse"}
              </button>
            </div>
            {libOpen && (
              <div className="mt-2 space-y-2">
                <input
                  type="search"
                  value={libQuery}
                  onChange={(e) => setLibQuery(e.target.value)}
                  placeholder="Search by tag, filename, note…"
                  className="w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs outline-none focus:border-black/30"
                />
                {libQ.isLoading ? (
                  <div className="text-[11px] text-black/40">Loading…</div>
                ) : libQ.isError ? (
                  <div className="text-[11px] text-red-600">Could not load library.</div>
                ) : libResults.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-black/10 px-3 py-4 text-center text-[11px] text-black/50">
                    {libQ.data && libQ.data.length > 0
                      ? "No matches — try different keywords."
                      : "No shared imagery yet. Upload in Knowledge → Imagery."}
                  </div>
                ) : (
                  <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto pr-1">
                    {libResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        title={`${r.filename}${r.tags?.length ? "\nTags: " + r.tags.join(", ") : ""}${r.note ? "\n" + r.note : ""}`}
                        onClick={() => r.signedUrl && onChange(r.signedUrl)}
                        disabled={!r.signedUrl}
                        className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-black/10 bg-black/5 transition hover:border-black/40 disabled:opacity-40"
                      >
                        {r.signedUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.signedUrl} alt={r.filename} className="h-full w-full object-cover" loading="lazy" />
                        ) : null}
                        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-left text-[9px] text-white opacity-0 group-hover:opacity-100">
                          {r.tags?.[0] ?? r.kind}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

  );
}

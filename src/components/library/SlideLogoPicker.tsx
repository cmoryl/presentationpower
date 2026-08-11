// Visual client-logo picker for Slide Studio.
//
// Logo-wall / logo-grid modules render marks from the shared Logo Hub. This
// modal lets a curator browse every approved mark (search + large previews),
// swap the one in a given cell, paste a URL for a mark that isn't in the hub
// yet, or clear the override so the curated default returns.

import { useEffect, useMemo, useState } from "react";
import { useClientLogos, normalizeClientName } from "@/hooks/use-client-logos";

export type PickedSlideLogo = {
  /** Storage path so the URL can be re-signed after its TTL. */
  logoPath: string;
  /** Light / colour mark. */
  logoUrl: string;
  /** White (dark-surface) mark, when the hub has one. */
  logoUrlDark: string;
  name: string;
};

export function SlideLogoPicker({
  title = "Choose logo",
  currentName,
  currentUrl,
  onPick,
  onClear,
  onClose,
}: {
  title?: string;
  currentName?: string;
  currentUrl?: string;
  onPick: (logo: PickedSlideLogo) => void;
  onClear?: () => void;
  onClose: () => void;
}) {
  const { data: rows, isLoading } = useClientLogos();
  const [q, setQ] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const all = rows ?? [];
    const needle = normalizeClientName(q);
    if (!needle) return all;
    return all.filter(
      (r) =>
        normalizeClientName(r.client_name).includes(needle) ||
        normalizeClientName(r.slug).includes(needle) ||
        (r.tags ?? []).some((t) => normalizeClientName(t).includes(needle)),
    );
  }, [rows, q]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#03002C]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0A0733] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <span className="flex h-10 w-16 items-center justify-center rounded-lg border border-white/15 bg-white/[0.06] p-1">
            {currentUrl ? (
              <img
                src={currentUrl}
                alt={currentName ? `${currentName} logo` : "Current logo"}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-[9px] uppercase tracking-widest text-white/40">none</span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <p className="truncate text-[11px] text-white/45">
              {currentName || "No client assigned"}
            </p>
          </div>
          {onClear && (
            <button
              type="button"
              onClick={() => {
                onClear();
                onClose();
              }}
              className="rounded border border-white/15 px-2 py-1 text-[10px] uppercase tracking-widest text-white/60 hover:text-white"
              title="Clear the override and use the curated default"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close logo picker"
            className="rounded border border-white/15 px-2 py-1 text-xs text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-white/10 px-4 py-2.5">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the logo hub…"
            className="w-full rounded-lg border border-white/15 bg-[#03002C]/60 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#A1FBF9] focus:outline-none"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="py-10 text-center text-xs text-white/45">Loading logo hub…</p>
          ) : results.length === 0 ? (
            <p className="py-10 text-center text-xs text-white/45">
              No logos match “{q}”. Paste a URL below instead.
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {results.map((row) => {
                const light = row.lightUrl ?? row.primaryUrl ?? "";
                const dark = row.darkUrl ?? "";
                const preview = light || dark;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      disabled={!preview}
                      onClick={() => {
                        onPick({
                          logoPath: row.light_path ?? row.primary_path ?? "",
                          logoUrl: light,
                          logoUrlDark: dark,
                          name: row.client_name,
                        });
                        onClose();
                      }}
                      title={row.client_name}
                      className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.06] p-2 transition hover:border-[#A1FBF9]/70 hover:bg-white/[0.1] disabled:opacity-40"
                    >
                      <span className="flex h-12 w-full items-center justify-center rounded bg-white/90 p-1.5">
                        {preview ? (
                          <img
                            src={preview}
                            alt={`${row.client_name} logo`}
                            loading="lazy"
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[9px] uppercase tracking-widest text-[#03002C]/50">
                            no file
                          </span>
                        )}
                      </span>
                      <span className="w-full truncate text-center text-[10px] text-white/65">
                        {row.client_name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://… paste a logo URL"
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[#03002C]/60 px-3 py-2 text-xs text-white placeholder:text-white/35 focus:border-[#A1FBF9] focus:outline-none"
          />
          <button
            type="button"
            disabled={!/^https?:\/\//i.test(url.trim())}
            onClick={() => {
              onPick({ logoPath: "", logoUrl: url.trim(), logoUrlDark: "", name: currentName ?? "" });
              onClose();
            }}
            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#03002C] disabled:opacity-40"
          >
            Use URL
          </button>
        </div>
      </div>
    </div>
  );
}

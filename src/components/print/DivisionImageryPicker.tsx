// Modal picker that surfaces the shared per-division imagery pool
// (public.division_imagery + `division-imagery` bucket) for reuse as
// hero media across print templates. Reuses the same repository that
// powers the slide-side imagery picker so uploads made once show up
// everywhere.

import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Search, Loader2 } from "lucide-react";
import {
  listDivisionImagery,
  type DivisionImageryEntry,
} from "@/lib/division-imagery.functions";

type Props = {
  open: boolean;
  onClose: () => void;
  divisionId: string | null | undefined;
  onPick: (entry: DivisionImageryEntry) => void;
};

export function DivisionImageryPicker({ open, onClose, divisionId, onPick }: Props) {
  const list = useServerFn(listDivisionImagery);
  const [items, setItems] = useState<DivisionImageryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "photo" | "abstract" | "generated" | "upload">("all");
  const [approvedOnly, setApprovedOnly] = useState(true);

  useEffect(() => {
    if (!open || !divisionId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    list({ data: { divisionId, onlyApproved: approvedOnly } })
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load imagery");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, divisionId, list, approvedOnly]);


  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (!needle) return true;
      const hay = [r.filename, r.note ?? "", r.prompt ?? "", (r.tags ?? []).join(" ")]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [items, q, kind]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d18] shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">Division library</div>
            <div className="mt-0.5 text-sm font-medium text-white">
              {divisionId ? `Imagery · ${divisionId}` : "No division selected"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
            <input
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-8 pr-3 text-xs text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
              placeholder="Search tags, filename, notes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-xs text-white focus:border-white/30 focus:outline-none"
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="all">All kinds</option>
            <option value="photo">Photo</option>
            <option value="abstract">Abstract</option>
            <option value="generated">Generated</option>
            <option value="upload">Upload</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!divisionId ? (
            <Empty label="Pick a division on this asset first, then reopen the library." />
          ) : loading ? (
            <div className="flex h-full items-center justify-center text-white/60">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <Empty
              label={
                items.length === 0
                  ? "No approved imagery yet for this division. Add some in Admin → Imagery."
                  : "No matches for that filter."
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onPick(r);
                    onClose();
                  }}
                  className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-left transition hover:border-white/30 hover:bg-white/[0.06]"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
                    {r.signedUrl ? (
                      <img
                        src={r.signedUrl}
                        alt={r.filename}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[10px] uppercase tracking-[0.22em] text-white/40">
                        No preview
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-white/80">
                      {r.kind}
                    </span>
                  </div>
                  <div className="space-y-1 p-2.5">
                    <div className="truncate text-[11px] font-medium text-white">{r.filename}</div>
                    {(r.tags?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {r.tags!.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-white/70"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="grid h-full place-items-center text-center text-xs text-white/60">
      <div className="max-w-sm">{label}</div>
    </div>
  );
}

// Pick a client mark straight from the shared Logo Hub instead of pasting a
// URL. Used by the print editor's logo-grid rows; the hook already resolves
// fresh signed URLs, so whatever we hand back is immediately renderable.
import { useMemo, useState } from "react";
import { Search, ImageOff, Library } from "lucide-react";
import { useClientLogos, clientLogoUrlForMode, normalizeClientName } from "@/hooks/use-client-logos";

export type PickedClientLogo = {
  id: string;
  name: string;
  url: string;
};

export function ClientLogoHubPicker({
  open,
  onClose,
  onPick,
  mode = "light",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (logo: PickedClientLogo) => void;
  mode?: "light" | "dark";
}) {
  const { data: rows, isLoading } = useClientLogos();
  const [q, setQ] = useState("");

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

  if (!open) return null;

  return (
    <div className="mt-1 rounded-md border border-border bg-card p-2 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5 rounded border border-border px-2">
        <Search size={13} strokeWidth={1.75} className="text-icon-muted" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search logo hub"
          className="w-full bg-transparent py-1.5 text-xs outline-none"
        />
      </div>

      {isLoading ? (
        <p className="px-1 py-3 text-center text-[11px] text-muted-foreground">Loading logos…</p>
      ) : results.length === 0 ? (
        <p className="flex items-center justify-center gap-1.5 px-1 py-3 text-center text-[11px] text-muted-foreground">
          <ImageOff size={13} strokeWidth={1.75} /> No logos match “{q}”
        </p>
      ) : (
        <ul className="grid max-h-52 grid-cols-3 gap-1.5 overflow-y-auto">
          {results.map((row) => {
            const url = clientLogoUrlForMode(row, mode);
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!url) return;
                    onPick({ id: row.id, name: row.client_name, url });
                    onClose();
                  }}
                  disabled={!url}
                  title={row.client_name}
                  className="flex h-16 w-full flex-col items-center justify-center gap-1 rounded border border-border bg-background p-1.5 transition hover:border-primary disabled:opacity-40"
                >
                  {url ? (
                    <img
                      src={url}
                      alt={`${row.client_name} logo`}
                      loading="lazy"
                      className="max-h-7 max-w-full object-contain"
                    />
                  ) : (
                    <ImageOff size={14} strokeWidth={1.75} className="text-icon-muted" />
                  )}
                  <span className="w-full truncate text-center text-[9px] text-muted-foreground">
                    {row.client_name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full rounded border border-border py-1 text-[11px] text-muted-foreground hover:bg-muted"
      >
        Close
      </button>
    </div>
  );
}

export function ClientLogoHubTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded border border-border px-1.5 py-1 text-[10px] uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-foreground"
    >
      <Library size={12} strokeWidth={1.75} />
      Logo hub
    </button>
  );
}

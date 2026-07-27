// Client-logo picker for print assets. Populated from the shared client-logo
// layer (use-client-logos) so it always shows FRESH signed URLs and stays in
// sync with LogoHub — no separate fetch, no expiring links.

import { useMemo, useState } from "react";
import { useClientLogos, clientLogoUrlForMode } from "@/hooks/use-client-logos";
import { normalizeClientName } from "@/hooks/use-client-logos";

export type ClientLogoSelection = {
  clientLogoId?: string;
  clientLogoName?: string;
  clientLogoUrl?: string;
};

export function ClientLogoPanel({
  selectedId,
  selectedName,
  mode = "light",
  onChange,
}: {
  selectedId?: string;
  selectedName?: string;
  mode?: "light" | "dark";
  onChange: (next: ClientLogoSelection) => void;
}) {
  const { data, isLoading } = useClientLogos();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const all = data ?? [];
    const needle = normalizeClientName(q);
    if (!needle) return all;
    return all.filter(
      (r) =>
        normalizeClientName(r.client_name).includes(needle) ||
        normalizeClientName(r.slug).includes(needle),
    );
  }, [data, q]);

  const selected = (data ?? []).find(
    (r) => r.id === selectedId || (!!selectedName && normalizeClientName(r.client_name) === normalizeClientName(selectedName)),
  );

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search client logos…"
        data-testid="client-logo-search"
        className="w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs outline-none dark:border-white/15 dark:bg-white/5"
      />

      {isLoading && <p className="text-[11px] opacity-60">Loading logos…</p>}
      {!isLoading && (data ?? []).length === 0 && (
        <p className="text-[11px] opacity-60">
          No client logos available. Add them in LogoHub (sign in required).
        </p>
      )}

      <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
        {rows.map((r) => {
          const url = clientLogoUrlForMode(r, mode);
          const isActive = selected?.id === r.id;
          return (
            <button
              key={r.id}
              type="button"
              data-testid="client-logo-option"
              title={r.client_name}
              onClick={() =>
                onChange({
                  clientLogoId: r.id,
                  clientLogoName: r.client_name,
                  clientLogoUrl: url ?? undefined,
                })
              }
              className={`flex h-14 items-center justify-center rounded-lg border bg-white p-1.5 transition ${
                isActive
                  ? "border-[#003FC7] ring-2 ring-[#003FC7]/30"
                  : "border-black/10 hover:border-black/30 dark:border-white/15"
              }`}
            >
              {url ? (
                <img src={url} alt={r.client_name} className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-[10px] opacity-60">{r.client_name}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] opacity-70">
          {selected ? selected.client_name : selectedName ? selectedName : "No logo selected"}
        </span>
        <button
          type="button"
          data-testid="client-logo-clear"
          onClick={() => onChange({ clientLogoId: undefined, clientLogoName: undefined, clientLogoUrl: undefined })}
          className="rounded-md border border-black/10 px-2 py-1 text-[11px] hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

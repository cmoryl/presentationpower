// Shared partner-kiosk browser for the California TV kiosk template.
// Used by /events/next/california and the San Francisco edition page so both
// show the same live previews, editor and downloads.

import { useMemo, useState } from "react";
import { Pencil, Search } from "lucide-react";

import { LondonPanelLiveEditor } from "@/components/events/LondonPanelLiveEditor";
import { LondonPanelThumb } from "@/components/events/LondonPanelThumb";
import { CALIFORNIA_KIOSK_PANELS, londonBoothPanelMeta } from "@/lib/next-london-signage";
import type { LondonPanel } from "@/lib/next-london-signage";

type KioskGroup = { boothId: string; vendor: string; panels: LondonPanel[] };

const card = "rounded-md border border-[#03002C]/12 bg-white p-5";

export function CaliforniaKioskBrowser() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const groups = useMemo<KioskGroup[]>(() => {
    const out: KioskGroup[] = [];
    for (const panel of CALIFORNIA_KIOSK_PANELS) {
      const meta = londonBoothPanelMeta(panel);
      if (!meta) continue;
      const existing = out.find((g) => g.boothId === meta.booth.id);
      if (existing) existing.panels.push(panel);
      else out.push({ boothId: meta.booth.id, vendor: meta.booth.vendor, panels: [panel] });
    }
    return out;
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => `${g.vendor} ${g.boothId}`.toLowerCase().includes(q));
  }, [groups, query]);

  const openPanel = openId ? (CALIFORNIA_KIOSK_PANELS.find((p) => p.id === openId) ?? null) : null;

  return (
    <div>
      <label className="flex items-center gap-2 rounded-md border border-[#03002C]/15 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-[#003FC7]">
        <Search className="h-4 w-4 text-[#03002C]/50" aria-hidden />
        <span className="sr-only">Search a partner</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a partner"
          className="w-full bg-transparent text-sm text-[#03002C] outline-none"
        />
      </label>

      <div className="mt-6 space-y-4">
        {shown.map((group) => (
          <section key={group.boothId} className={card}>
            <h3 className="text-lg font-semibold text-[#03002C]">{group.vendor}</h3>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#03002C]/60">
              Re-laid from {group.boothId}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {group.panels.map((panel) => {
                const meta = londonBoothPanelMeta(panel);
                const isOpen = openId === panel.id;
                return (
                  <div key={panel.id} className="rounded-md border border-[#03002C]/10 bg-[#F7F8FB] p-3">
                    <div className="flex items-start gap-3">
                      <LondonPanelThumb panel={panel} size={96} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#03002C]">
                          {meta?.artboard.label ?? panel.name}
                        </p>
                        <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#03002C]/60">
                          {panel.trimW} × {panel.trimH} mm
                        </p>
                        <p className="mt-1 text-[11px] text-[#03002C]/65">
                          {meta?.shell.hasScreen ? "Monitor keep-clear" : "Fully live face"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : panel.id)}
                      aria-expanded={isOpen}
                      className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#03002C] px-3 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]"
                    >
                      <Pencil className="h-3 w-3" aria-hidden />
                      {isOpen ? "Close" : "Edit & download"}
                    </button>
                  </div>
                );
              })}
            </div>

            {openPanel && group.panels.some((p) => p.id === openPanel.id) ? (
              <div className="mt-4 rounded-md border border-[#03002C]/10 p-4">
                <LondonPanelLiveEditor
                  panel={openPanel}
                  revisionLabel="draft"
                  siblingIds={group.panels.filter((p) => p.id !== openPanel.id).map((p) => p.id)}
                />
              </div>
            ) : null}
          </section>
        ))}
        {shown.length === 0 ? (
          <p className="text-sm text-[#03002C]/60">No partner matches that search.</p>
        ) : null}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { ICON_LIBRARY, iconByName, type IconLibraryEntry } from "@/lib/icon-library";

type Props = {
  value: string | null | undefined;
  onChange: (name: string | null) => void;
  autoLabel?: string; // used to describe the auto-matched fallback
};

export function IconPicker({ value, onChange, autoLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = iconByName(value ?? undefined);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return ICON_LIBRARY;
    return ICON_LIBRARY.filter(
      (e) => e.label.toLowerCase().includes(t) || e.name.toLowerCase().includes(t) || e.group.toLowerCase().includes(t),
    );
  }, [q]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/15 bg-white text-black/70 hover:border-black/40"
        title={value ? `Icon: ${value}` : `Auto${autoLabel ? ` · ${autoLabel}` : ""}`}
      >
        {current ? (() => { const Ic = current; return <Ic size={16} strokeWidth={2} />; })() : (
          <span className="text-[10px] font-medium uppercase text-black/45">Auto</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-30 w-72 rounded-xl border border-black/10 bg-white p-3 shadow-xl">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search icons…"
              className="flex-1 rounded-md border border-black/15 px-2 py-1 text-xs focus:border-[#003FC7] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className="rounded-md border border-black/15 px-2 py-1 text-[10px] uppercase tracking-widest text-black/60 hover:bg-black/5"
              title="Reset to auto-matched icon"
            >
              Auto
            </button>
          </div>
          <div className="mt-3 max-h-64 overflow-auto">
            <IconGrid entries={filtered} value={value ?? null} onPick={(n) => { onChange(n); setOpen(false); }} />
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[10px] uppercase tracking-widest text-black/50 hover:text-black"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function IconGrid({
  entries,
  value,
  onPick,
}: {
  entries: IconLibraryEntry[];
  value: string | null;
  onPick: (name: string) => void;
}) {
  // Group by category
  const groups = useMemo(() => {
    const map = new Map<string, IconLibraryEntry[]>();
    for (const e of entries) {
      const arr = map.get(e.group) ?? [];
      arr.push(e);
      map.set(e.group, arr);
    }
    return Array.from(map.entries());
  }, [entries]);
  if (entries.length === 0) return <div className="py-4 text-center text-xs text-black/45">No icons match.</div>;
  return (
    <div className="space-y-3">
      {groups.map(([group, items]) => (
        <div key={group}>
          <div className="mb-1 text-[9px] uppercase tracking-widest text-black/40">{group}</div>
          <div className="grid grid-cols-6 gap-1.5">
            {items.map((e) => {
              const Ic = e.Icon;
              const selected = value === e.name;
              return (
                <button
                  key={e.name}
                  type="button"
                  onClick={() => onPick(e.name)}
                  title={e.label}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border transition ${
                    selected ? "border-[#003FC7] bg-[#003FC7]/10 text-[#003FC7]" : "border-transparent text-black/70 hover:border-black/15 hover:bg-black/5"
                  }`}
                >
                  <Ic size={16} strokeWidth={2} />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

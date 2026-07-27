import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ICON_LIBRARY, iconByName, parseIconRef, type IconLibraryEntry } from "@/lib/icon-library";
import { IconRenderer } from "@/components/IconRenderer";
import { suggestAssetsForSlide } from "@/lib/ai-assets.functions";
import { Sparkles } from "lucide-react";

type AiCtx = {
  brandModeId: string;
  sectionName?: string;
  slideContent?: Record<string, unknown>;
  clientIndustry?: string;
};

type Props = {
  value: string | null | undefined;
  onChange: (name: string | null) => void;
  autoLabel?: string;
  ai?: AiCtx;
};

export function IconPicker({ value, onChange, autoLabel, ai }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"lib" | "ai">("lib");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<
    Array<{ ref: string; rationale: string; confidence: number }>
  >([]);
  const [logoQuery, setLogoQuery] = useState<string | null>(null);

  const suggest = useServerFn(suggestAssetsForSlide);

  const current = iconByName(value ?? undefined);
  const currentPack = parseIconRef(value ?? undefined);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return ICON_LIBRARY;
    return ICON_LIBRARY.filter(
      (e) => e.label.toLowerCase().includes(t) || e.name.toLowerCase().includes(t) || e.group.toLowerCase().includes(t),
    );
  }, [q]);

  const runSuggest = async () => {
    if (!ai) return;
    setBusy(true); setErr(null);
    try {
      const res = await suggest({
        data: {
          brandModeId: ai.brandModeId,
          slideContent: ai.slideContent ?? {},
          sectionName: ai.sectionName ?? "",
          clientIndustry: ai.clientIndustry ?? null,
        },
      });
      if (!res.ok) { setErr(res.error); return; }
      if (res.setup) { setErr(res.note ?? "AI key missing"); return; }
      setSuggestions(res.suggestions.iconSuggestions);
      setLogoQuery(res.suggestions.clientLogoQuery ?? null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/15 bg-white text-black/70 hover:border-black/40"
        title={value ? `Icon: ${value}` : `Auto${autoLabel ? ` · ${autoLabel}` : ""}`}
      >
        {current ? (() => { const Ic = current; return <Ic size={16} />; })() :
          currentPack ? <IconRenderer pack={currentPack.packId} name={currentPack.name} size={16} /> :
          <span className="text-[10px] font-medium uppercase text-black/45">Auto</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-30 w-80 rounded-xl border border-black/10 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center gap-1 rounded-lg bg-black/[0.04] p-1 text-[10px] uppercase tracking-widest">
            <button
              type="button"
              onClick={() => setTab("lib")}
              className={`flex-1 rounded-md px-2 py-1 ${tab === "lib" ? "bg-white text-black shadow-sm" : "text-black/50"}`}
            >Library</button>
            {ai && (
              <button
                type="button"
                onClick={() => { setTab("ai"); if (suggestions.length === 0 && !busy) runSuggest(); }}
                className={`flex-1 rounded-md px-2 py-1 ${tab === "ai" ? "bg-white text-black shadow-sm" : "text-black/50"}`}
              >
                <span className="inline-flex items-center gap-1"><Sparkles size={12} /> Suggest</span>
              </button>
            )}
          </div>

          {tab === "lib" && (
            <>
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
                >Auto</button>
              </div>
              <div className="mt-3 max-h-64 overflow-auto">
                <IconGrid entries={filtered} value={value ?? null} onPick={(n) => { onChange(n); setOpen(false); }} />
              </div>
            </>
          )}

          {tab === "ai" && (
            <div className="max-h-72 overflow-auto">
              {busy && <div className="py-6 text-center text-xs text-black/50">Thinking…</div>}
              {err && <div className="rounded-md bg-red-50 p-2 text-[11px] text-red-700">{err}</div>}
              {!busy && !err && suggestions.length === 0 && (
                <div className="py-4 text-center text-xs text-black/50">No suggestions yet.</div>
              )}
              <ul className="space-y-1.5">
                {suggestions.map((s, i) => {
                  const curated = iconByName(s.ref);
                  const pack = parseIconRef(s.ref);
                  return (
                    <li key={`${s.ref}-${i}`} className="flex items-start gap-2 rounded-lg border border-black/10 p-2">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-black/[0.04] text-black/70">
                        {curated ? (() => { const Ic = curated; return <Ic size={16} />; })() :
                          pack ? <IconRenderer pack={pack.packId} name={pack.name} size={16} /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate font-mono text-[10px] text-black/60">{s.ref}</div>
                          <div className="shrink-0 text-[10px] text-black/40">·{"·".repeat(Math.max(0, s.confidence - 1))} {s.confidence}/5</div>
                        </div>
                        <div className="text-[11px] leading-snug text-black/70">{s.rationale}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { onChange(s.ref); setOpen(false); }}
                        className="shrink-0 rounded-md bg-[#003FC7] px-2 py-1 text-[10px] uppercase tracking-widest text-white hover:bg-[#0033a8]"
                      >Apply</button>
                    </li>
                  );
                })}
              </ul>
              {logoQuery && (
                <a
                  href={`/logohub?q=${encodeURIComponent(logoQuery)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-black/15 px-2 py-1.5 text-[11px] text-black/70 hover:border-[#003FC7] hover:text-[#003FC7]"
                >
                  <span>Search LogoHub: “{logoQuery}”</span>
                  <span className="text-[10px]">→</span>
                </a>
              )}
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={runSuggest}
                  disabled={busy}
                  className="text-[10px] uppercase tracking-widest text-black/50 hover:text-black disabled:opacity-40"
                >Refresh</button>
              </div>
            </div>
          )}

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[10px] uppercase tracking-widest text-black/50 hover:text-black"
            >Close</button>
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
                  <Ic size={16} />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

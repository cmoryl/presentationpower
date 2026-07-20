import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Languages, Check, Loader2, Plus, RefreshCcw } from "lucide-react";
import {
  listLanguages,
  listCachedLocales,
  getDeckSlideTranslations,
  cacheDeckTranslation,
} from "@/lib/translation.functions";

export type LocaleOverlay = {
  lang: string;
  byPosition: Map<number, Record<string, unknown>>;
  rtl: boolean;
};

type LangRow = { id: string; label: string; native: string; rtl: boolean };
type LocaleRow = { target_lang: string; ready: number; total: number; updated_at: string };

/**
 * Header dropdown for the deck editor. Reads cached slide translations from
 * public.slide_translations and hands them back as a `LocaleOverlay` the
 * caller can apply to `VariantRenderer` at render time — never mutates the
 * deck store.
 */
export function LanguageSwitcher({
  cloudDeckId,
  onChange,
}: {
  cloudDeckId: string | null;
  onChange: (overlay: LocaleOverlay | null) => void;
}) {
  const listLangs = useServerFn(listLanguages);
  const listCached = useServerFn(listCachedLocales);
  const fetchTx = useServerFn(getDeckSlideTranslations);
  const cacheTx = useServerFn(cacheDeckTranslation);

  const storageKey = cloudDeckId ? `deck-locale:${cloudDeckId}` : null;

  const [open, setOpen] = useState(false);
  const [languages, setLanguages] = useState<LangRow[]>([]);
  const [cached, setCached] = useState<LocaleRow[]>([]);
  const [current, setCurrent] = useState<string>("en");
  const [busy, setBusy] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let alive = true;
    listLangs()
      .then((rows) => alive && setLanguages(rows as LangRow[]))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [listLangs]);

  const refreshCached = async () => {
    if (!cloudDeckId) return;
    try {
      const res = (await listCached({ data: { deckId: cloudDeckId } })) as {
        locales: LocaleRow[];
      };
      setCached(res.locales ?? []);
    } catch {
      setCached([]);
    }
  };

  useEffect(() => {
    setRestored(false);
    refreshCached();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudDeckId]);

  // Restore last-selected locale for this deck after refresh — translated rows
  // live in public.slide_translations, so we replay the fetch and re-apply.
  useEffect(() => {
    if (restored || !cloudDeckId || !storageKey || languages.length === 0) return;
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (!saved || saved === "en") {
      setRestored(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = (await fetchTx({ data: { deckId: cloudDeckId, targetLang: saved } })) as Array<{
          position: number;
          content: unknown;
        }>;
        if (cancelled || rows.length === 0) return;
        const byPosition = new Map<number, Record<string, unknown>>();
        for (const r of rows) {
          if (r.content && typeof r.content === "object")
            byPosition.set(r.position, r.content as Record<string, unknown>);
        }
        const rtl = languages.find((l) => l.id === saved)?.rtl ?? false;
        setCurrent(saved);
        onChange({ lang: saved, byPosition, rtl });
      } catch {
        /* ignore — fall back to source */
      } finally {
        if (!cancelled) setRestored(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudDeckId, languages.length, restored]);

  const langById = useMemo(() => new Map(languages.map((l) => [l.id, l])), [languages]);

  async function selectLocale(lang: string) {
    if (!cloudDeckId) return;
    if (lang === "en") {
      setCurrent("en");
      onChange(null);
      setOpen(false);
      return;
    }
    setBusy(lang);
    try {
      const rows = (await fetchTx({ data: { deckId: cloudDeckId, targetLang: lang } })) as Array<{
        position: number;
        content: unknown;
      }>;
      const byPosition = new Map<number, Record<string, unknown>>();
      for (const r of rows) {
        if (r.content && typeof r.content === "object")
          byPosition.set(r.position, r.content as Record<string, unknown>);
      }
      const rtl = langById.get(lang)?.rtl ?? false;
      setCurrent(lang);
      onChange({ lang, byPosition, rtl });
      setOpen(false);
    } finally {
      setBusy(null);
    }
  }

  async function addLocale(lang: string) {
    if (!cloudDeckId) return;
    setBusy(lang);
    try {
      await cacheTx({ data: { deckId: cloudDeckId, targetLang: lang } });
      await refreshCached();
      await selectLocale(lang);
      setPickerOpen(false);
    } catch (e) {
      alert(`Translation failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function refreshLocale(lang: string) {
    if (!cloudDeckId) return;
    setBusy(lang);
    try {
      await cacheTx({ data: { deckId: cloudDeckId, targetLang: lang, force: true } });
      await refreshCached();
      if (current === lang) await selectLocale(lang);
    } finally {
      setBusy(null);
    }
  }

  const disabled = !cloudDeckId;
  const currentLabel = current === "en" ? "Source (EN)" : langById.get(current)?.label ?? current.toUpperCase();
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return languages.filter(
      (l) =>
        l.id !== "en" &&
        !cached.some((c) => c.target_lang === l.id) &&
        (!q ||
          l.id.toLowerCase().includes(q) ||
          l.label.toLowerCase().includes(q) ||
          l.native.toLowerCase().includes(q)),
    );
  }, [languages, cached, search]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        title={disabled ? "Save the deck to enable language switching" : "Switch language"}
        className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white/70 px-4 py-2 text-sm font-medium text-black backdrop-blur transition hover:border-black/30 disabled:opacity-40 dark:border-white/15 dark:bg-white/[0.06] dark:text-white dark:hover:border-white/30"
      >
        <Languages size={14} className="text-[#003FC7] dark:text-[#A1FBF9]" />
        {currentLabel}
      </button>

      {open && !disabled && (
        <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-[#0B0B18] dark:text-white">
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">Languages</div>
          <button
            type="button"
            onClick={() => selectLocale("en")}
            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5 ${
              current === "en" ? "bg-[#003FC7]/10 dark:bg-[#A1FBF9]/10" : ""
            }`}
          >
            <span>Source (EN)</span>
            {current === "en" && <Check size={14} className="text-[#003FC7] dark:text-[#A1FBF9]" />}
          </button>
          {cached.map((c) => {
            const l = langById.get(c.target_lang);
            const stale = c.ready < c.total;
            return (
              <div
                key={c.target_lang}
                className={`group flex items-center justify-between border-t border-black/5 dark:border-white/5 ${
                  current === c.target_lang ? "bg-[#003FC7]/10 dark:bg-[#A1FBF9]/10" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectLocale(c.target_lang)}
                  className="flex-1 truncate px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate">{l?.label ?? c.target_lang}</span>
                    <span className="text-[10px] text-black/40 dark:text-white/40">{l?.native}</span>
                  </div>
                  <div className="text-[10px] text-black/50 dark:text-white/50">
                    {c.ready}/{c.total} slides {stale ? "· partial" : "· ready"}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => refreshLocale(c.target_lang)}
                  title="Re-translate to pick up edits"
                  className="mr-1 rounded-full p-1.5 text-black/40 hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  {busy === c.target_lang ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                </button>
              </div>
            );
          })}
          <div className="border-t border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#003FC7] hover:bg-[#003FC7]/5 dark:text-[#A1FBF9] dark:hover:bg-[#A1FBF9]/5"
            >
              <Plus size={12} /> Add language
            </button>
            {pickerOpen && (
              <div className="max-h-56 overflow-y-auto border-t border-black/5 dark:border-white/5">
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full border-b border-black/5 bg-transparent px-3 py-2 text-xs outline-none dark:border-white/5"
                />
                {filtered.length === 0 && (
                  <div className="px-3 py-3 text-xs text-black/50 dark:text-white/50">All active languages already cached.</div>
                )}
                {filtered.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => addLocale(l.id)}
                    disabled={busy !== null}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/5"
                  >
                    <span>
                      <span className="font-medium">{l.label}</span>{" "}
                      <span className="text-black/40 dark:text-white/40">{l.native}</span>
                    </span>
                    {busy === l.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={10} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

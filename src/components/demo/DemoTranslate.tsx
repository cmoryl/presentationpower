import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Languages, Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import { translateDemoContent } from "@/lib/demo-translate.functions";
import { DEMO_LANGUAGES, demoLanguage } from "@/lib/demo-languages";

/**
 * Demo translation: shows any demo surface (deck, print, social, events) in a
 * target language without persisting anything.
 *
 * The hook serialises the demo's in-memory content, sends it through the
 * ephemeral `translateDemoContent` server function, and hands back a translated
 * copy of the same items. Results are cached per language + source signature so
 * flipping back and forth is instant and costs nothing.
 */
export function useDemoTranslate<T>(items: T[]) {
  const run = useServerFn(translateDemoContent);

  const sourceJson = useMemo(() => items.map((i) => JSON.stringify(i ?? null)), [items]);
  const signature = useMemo(() => sourceJson.join("\u0000"), [sourceJson]);

  const cache = useRef<Map<string, T[]>>(new Map());
  const [lang, setLangState] = useState<string>("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translated, setTranslated] = useState<T[] | null>(null);

  // A new source (division swap, look change, copy edit) invalidates everything.
  useEffect(() => {
    cache.current = new Map();
    setTranslated(null);
    setError(null);
    setLangState("en");
  }, [signature]);

  const setLang = useCallback(
    async (next: string) => {
      setError(null);
      if (next === "en") {
        setLangState("en");
        setTranslated(null);
        return;
      }
      const key = `${next}:${signature}`;
      const hit = cache.current.get(key);
      if (hit) {
        setLangState(next);
        setTranslated(hit);
        return;
      }
      setBusy(true);
      try {
        const res = await run({ data: { itemsJson: sourceJson, targetLang: next } });
        const out = res.itemsJson.map((raw) => JSON.parse(raw) as T);
        cache.current.set(key, out);
        setLangState(next);
        setTranslated(out);
      } catch (e) {
        setError((e as Error).message || "Translation failed");
      } finally {
        setBusy(false);
      }
    },
    [run, signature, sourceJson],
  );

  const active = translated ?? items;
  return {
    lang,
    setLang,
    busy,
    error,
    items: active,
    isTranslated: Boolean(translated),
    rtl: demoLanguage(lang)?.rtl ?? false,
  };
}

export type DemoTranslateState = ReturnType<typeof useDemoTranslate<unknown>>;

/** Compact control row. Drop it above any demo preview. */
export function DemoTranslateBar({
  lang,
  setLang,
  busy,
  error,
  isTranslated,
  accent,
  note,
  className,
}: {
  lang: string;
  setLang: (id: string) => void | Promise<void>;
  busy: boolean;
  error: string | null;
  isTranslated: boolean;
  accent?: string;
  note?: string;
  className?: string;
}) {
  const current = demoLanguage(lang);
  return (
    <div
      className={`rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04] ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
            <Languages size={13} aria-hidden />
            Language
          </div>
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-black/55 dark:text-white/55">
            {note ??
              "Preview this demo in another language. Copy is translated live through the same engine the deck and print translators use — nothing is saved."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="demo-translate-lang">
            Choose demo language
          </label>
          <select
            id="demo-translate-lang"
            value={lang}
            disabled={busy}
            onChange={(e) => void setLang(e.target.value)}
            className="min-h-[44px] rounded-xl border border-black/12 bg-white px-3 text-sm font-medium text-black/80 disabled:opacity-60 dark:border-white/15 dark:bg-white/[0.06] dark:text-white/85"
          >
            {DEMO_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id === "en" ? "English (source)" : `${l.label} · ${l.native}`}
              </option>
            ))}
          </select>
          {isTranslated ? (
            <button
              type="button"
              onClick={() => void setLang("en")}
              disabled={busy}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-black/12 px-3 text-sm font-medium text-black/70 transition hover:border-black/35 disabled:opacity-60 dark:border-white/15 dark:text-white/75"
            >
              <RotateCcw size={14} aria-hidden />
              Source
            </button>
          ) : null}
        </div>
      </div>
      <div aria-live="polite" className="mt-2 min-h-[18px] text-[12px]">
        {busy ? (
          <span className="inline-flex items-center gap-2 text-black/60 dark:text-white/60">
            <Loader2 size={13} className="animate-spin" aria-hidden />
            Translating demo copy…
          </span>
        ) : error ? (
          <span className="inline-flex items-center gap-2 text-[#E53D2E]">
            <AlertTriangle size={13} aria-hidden />
            {error}
          </span>
        ) : isTranslated ? (
          <span
            className="inline-flex items-center gap-2 font-medium"
            style={{ color: accent ?? "#003FC7" }}
          >
            Showing {current?.label ?? lang}
            {current?.rtl ? " · right-to-left" : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}

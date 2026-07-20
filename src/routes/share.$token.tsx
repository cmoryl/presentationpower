import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSharedDeck, recordShareView } from "@/lib/deck-sharing.functions";
import { getSharedDeckTranslations, listSharedLocales, listLanguages } from "@/lib/translation.functions";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import { resolveBrandMode } from "@/lib/brand-profiles";
import type { DeckSlide } from "@/lib/deck-store";
import { Play, X, ChevronLeft, ChevronRight, Languages, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deckCloudId } from "@/lib/deck-uuid";

type SharedDeck = {
  id: string;
  title: string;
  brand_mode_id: string | null;
  archetype_id: string | null;
  sub_company: string | null;
  client_logo_url: string | null;
  shared_at: string | null;
  expires_at?: string | null;
  slides: Array<{
    position: number;
    section_id: string;
    variant_id: string;
    layout_id: string;
    content: Record<string, unknown> | null;
  }>;
  brief: { prospect?: string | null; industry?: string | null } | null;
};

type SharedPayload = { status?: "active" | "expired" } & Partial<SharedDeck>;

export const Route = createFileRoute("/share/$token")({
  head: () => ({ meta: [{ title: "Shared deck · TransPerfect" }] }),
  component: ShareView,
});

function ShareView() {
  const { token } = Route.useParams();
  const fetchShared = useServerFn(getSharedDeck);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ready"; deck: SharedDeck }
    | { kind: "expired" }
    | { kind: "gone" }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchShared({ data: { token } })
      .then((res) => {
        if (cancelled) return;
        const payload = res.deck as SharedPayload | null;
        if (!payload) {
          setState({ kind: "gone" });
        } else if (payload.status === "expired") {
          setState({ kind: "expired" });
        } else {
          setState({ kind: "ready", deck: payload as SharedDeck });
        }
      })
      .catch((e) => !cancelled && setState({ kind: "error", message: e instanceof Error ? e.message : "Failed to load" }));
    return () => {
      cancelled = true;
    };
  }, [token, fetchShared]);

  if (state.kind === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#03002C] text-white/70 text-sm">Loading…</div>
    );
  }
  if (state.kind === "expired") return <LinkGate variant="expired" />;
  if (state.kind === "gone") return <LinkGate variant="disabled" />;
  if (state.kind === "error") return <LinkGate variant="disabled" message={state.message} />;
  return <SharedDeckView deck={state.deck} token={token} />;
}

function LinkGate({ variant, message }: { variant: "expired" | "disabled"; message?: string }) {
  const copy =
    variant === "expired"
      ? {
          eyebrow: "Link expired",
          title: "This link has expired",
          body: "The deck owner set an expiration date on this share link. Reach out to them for a fresh link.",
        }
      : {
          eyebrow: "Link unavailable",
          title: "This link is no longer active",
          body: "The deck owner disabled sharing or the link is invalid. Reach out to them for an updated link.",
        };
  return (
    <div className="grid min-h-screen place-items-center bg-[#03002C] px-6 text-center text-white">
      <div>
        <div className="text-[10px] uppercase tracking-[0.35em] text-white/40">TransPerfect · {copy.eyebrow}</div>
        <h1 className="mt-3 text-3xl font-semibold">{copy.title}</h1>
        <p className="mt-3 max-w-md text-sm text-white/60">{copy.body}</p>
        {message && <p className="mt-4 text-xs text-white/30">{message}</p>}
      </div>
    </div>
  );
}

function SharedDeckView({ deck, token }: { deck: SharedDeck; token: string }) {
  const brand = resolveBrandMode(deck.brand_mode_id ?? "", deck.sub_company);
  const slides: DeckSlide[] = useMemo(
    () =>
      (deck.slides ?? []).map((s, i) => ({
        id: `share-${i}`,
        position: s.position ?? i,
        sectionId: s.section_id,
        variantId: s.variant_id,
        layoutId: s.layout_id,
        content: (s.content ?? {}) as Record<string, unknown>,
        changes: [],
      })),
    [deck.slides],
  );
  const clientName = deck.brief?.prospect ?? undefined;
  const [presenting, setPresenting] = useState(false);
  const [i, setI] = useState(0);

  // ---- Language overlay ----
  const listLocalesFn = useServerFn(listSharedLocales);
  const fetchTxFn = useServerFn(getSharedDeckTranslations);
  const listLangsFn = useServerFn(listLanguages);
  const [locales, setLocales] = useState<Array<{ target_lang: string; ready: number; total: number }>>([]);
  const [langs, setLangs] = useState<Array<{ id: string; label: string; native: string; rtl: boolean }>>([]);
  const [currentLang, setCurrentLang] = useState<string>("en");
  const [overlay, setOverlay] = useState<Map<number, Record<string, unknown>> | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [langBusy, setLangBusy] = useState<string | null>(null);

  useEffect(() => {
    listLocalesFn({ data: { token } })
      .then((r) => setLocales((r as typeof locales) ?? []))
      .catch(() => {});
    listLangsFn()
      .then((r) => setLangs(r as typeof langs))
      .catch(() => {});
  }, [token, listLocalesFn, listLangsFn]);

  const langById = useMemo(() => new Map(langs.map((l) => [l.id, l])), [langs]);
  const isRtl = currentLang !== "en" && (langById.get(currentLang)?.rtl ?? false);

  async function selectLocale(lang: string) {
    if (lang === "en") {
      setCurrentLang("en");
      setOverlay(null);
      setLangOpen(false);
      return;
    }
    setLangBusy(lang);
    try {
      const rows = (await fetchTxFn({ data: { token, targetLang: lang } })) as Array<{
        position: number;
        content: unknown;
      }>;
      const map = new Map<number, Record<string, unknown>>();
      for (const r of rows) if (r.content && typeof r.content === "object") map.set(r.position, r.content as Record<string, unknown>);
      setOverlay(map);
      setCurrentLang(lang);
      setLangOpen(false);
    } finally {
      setLangBusy(null);
    }
  }

  const viewSlide = (s: DeckSlide): DeckSlide => {
    if (!overlay) return s;
    const t = overlay.get(s.position);
    return t ? { ...s, content: t } : s;
  };

  // ---- Analytics: record share view (excludes owner) ----
  const recordFn = useServerFn(recordShareView);
  const viewedSlidesRef = useRef<Set<number>>(new Set());
  const maxSlideRef = useRef<number>(0);
  const sessionKeyRef = useRef<string | null>(null);
  const skipRef = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Determine if current viewer is the deck owner; skip recording if so.
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user.id;
        if (uid && deckCloudId(uid, "" /* unused: match by deck.id below */)) {
          // Better: compare deck.id to any deck owned by user. Cheap client-side check:
          // If a signed-in user's id + any local nano would map — we can't invert. Instead
          // query decks table for ownership of this specific deck.id.
          const { data: own } = await supabase
            .from("decks")
            .select("id")
            .eq("id", deck.id)
            .maybeSingle();
          if (own?.id) skipRef.current = true;
        }
      } catch {
        // ignore
      }
      if (cancelled || skipRef.current) return;

      // Session key per-token in sessionStorage
      const storageKey = `share-session:${token}`;
      let sk: string | null = null;
      try {
        sk = sessionStorage.getItem(storageKey);
        if (!sk) {
          sk = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 64);
          sessionStorage.setItem(storageKey, sk);
        }
      } catch {
        sk = Math.random().toString(36).slice(2, 34);
      }
      sessionKeyRef.current = sk;

      const send = () => {
        const key = sessionKeyRef.current;
        if (!key || skipRef.current) return;
        recordFn({
          data: {
            token,
            sessionKey: key,
            slidesViewed: viewedSlidesRef.current.size,
            maxSlide: maxSlideRef.current,
          },
        }).catch(() => {});
      };
      send();
      const interval = window.setInterval(send, 30_000);
      const onHide = () => send();
      window.addEventListener("pagehide", onHide);
      window.addEventListener("beforeunload", onHide);

      // stash cleanup
      (window as unknown as { __shareCleanup?: () => void }).__shareCleanup = () => {
        window.clearInterval(interval);
        window.removeEventListener("pagehide", onHide);
        window.removeEventListener("beforeunload", onHide);
      };
    })();
    return () => {
      cancelled = true;
      const w = window as unknown as { __shareCleanup?: () => void };
      w.__shareCleanup?.();
      w.__shareCleanup = undefined;
    };
  }, [token, deck.id, recordFn]);

  // Track presented slide index
  useEffect(() => {
    if (presenting) {
      viewedSlidesRef.current.add(i);
      if (i > maxSlideRef.current) maxSlideRef.current = i;
    }
  }, [i, presenting]);

  // IntersectionObserver on scrolled slides
  const slideRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.slideIdx);
            if (!Number.isNaN(idx)) {
              viewedSlidesRef.current.add(idx);
              if (idx > maxSlideRef.current) maxSlideRef.current = idx;
            }
          }
        }
      },
      { threshold: 0.5 },
    );
    slideRefs.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [slides.length]);

  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresenting(false);
      else if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        setI((n) => Math.min(n + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setI((n) => Math.max(n - 1, 0));
      } else if (e.key === "Home") setI(0);
      else if (e.key === "End") setI(slides.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, slides.length]);

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
  };

  return (
    <div className="min-h-screen bg-[#03002C] text-white" dir={isRtl ? "rtl" : undefined}>
      {/* Minimal header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#03002C]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.35em] text-white/40">TransPerfect · Shared</div>
            <div className="mt-0.5 truncate text-base font-semibold">{deck.title}</div>
          </div>
          <div className="flex items-center gap-2">
            {(locales.length > 0 || currentLang !== "en") && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-4 py-2 text-xs font-medium text-white/90 hover:border-white/40"
                >
                  <Languages size={12} className="text-[#A1FBF9]" />
                  {currentLang === "en" ? "Source (EN)" : langById.get(currentLang)?.label ?? currentLang.toUpperCase()}
                </button>
                {langOpen && (
                  <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#0B0B18] shadow-xl">
                    <button
                      type="button"
                      onClick={() => selectLocale("en")}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-white/5 ${
                        currentLang === "en" ? "bg-[#A1FBF9]/10" : ""
                      }`}
                    >
                      <span>Source (EN)</span>
                      {currentLang === "en" && <Check size={14} className="text-[#A1FBF9]" />}
                    </button>
                    {locales.map((c) => {
                      const l = langById.get(c.target_lang);
                      return (
                        <button
                          key={c.target_lang}
                          type="button"
                          onClick={() => selectLocale(c.target_lang)}
                          className={`flex w-full items-center justify-between border-t border-white/5 px-3 py-2 text-left text-sm hover:bg-white/5 ${
                            currentLang === c.target_lang ? "bg-[#A1FBF9]/10" : ""
                          }`}
                        >
                          <span className="truncate">
                            <span>{l?.label ?? c.target_lang}</span>{" "}
                            <span className="text-[10px] text-white/40">{l?.native}</span>
                          </span>
                          {langBusy === c.target_lang ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : currentLang === c.target_lang ? (
                            <Check size={14} className="text-[#A1FBF9]" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setPresenting(true);
                setI(0);
                requestFullscreen();
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium text-[#03002C] hover:bg-white/90"
            >
              <Play size={14} /> Present
            </button>
          </div>
        </div>
      </header>


      <main className="mx-auto flex max-w-[1280px] flex-col items-center gap-6 px-6 py-10">
        {slides.map((slide, idx) => {
          const variant = byId(MODULE_VARIANTS, slide.variantId);
          if (!variant) return null;
          return (
            <div
              key={slide.id}
              data-slide-idx={idx}
              ref={(el) => {
                if (el) slideRefs.current.set(idx, el);
                else slideRefs.current.delete(idx);
              }}
              className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl"
              style={{ maxWidth: 1280 }}
            >
              <ScaledSlide>
                <VariantRenderer
                  slide={viewSlide(slide)}
                  variant={variant}
                  brand={brand}
                  pageNumber={idx + 1}
                  clientName={clientName}
                  clientLogoUrl={deck.client_logo_url}
                  subCompany={deck.sub_company ?? undefined}
                />
              </ScaledSlide>
            </div>
          );
        })}
        <footer className="mt-6 text-[10px] uppercase tracking-[0.35em] text-white/30">
          Presented with TransPerfect Modular
        </footer>
      </main>

      {presenting && slides[i] && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between px-6 py-3 text-xs text-white/60">
            <div>
              {i + 1} / {slides.length} · {deck.title}
            </div>
            <button
              type="button"
              onClick={() => setPresenting(false)}
              className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 hover:border-white/40"
            >
              <X size={12} /> Exit
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center px-8 pb-8">
            <button
              type="button"
              onClick={() => setI((n) => Math.max(n - 1, 0))}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/20 p-2 text-white/60 hover:text-white"
              aria-label="Previous"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="w-full max-w-[92vw]">
              <div className="mx-auto w-full" style={{ maxWidth: "min(92vw, calc(92vh * 16/9))" }}>
                {(() => {
                  const s = slides[i];
                  const v = byId(MODULE_VARIANTS, s.variantId);
                  if (!v) return null;
                  return (
                    <div className="overflow-hidden rounded-xl bg-white shadow-2xl">
                      <ScaledSlide>
                        <VariantRenderer
                          slide={viewSlide(s)}
                          variant={v}
                          brand={brand}
                          pageNumber={i + 1}
                          clientName={clientName}
                          clientLogoUrl={deck.client_logo_url}
                          subCompany={deck.sub_company ?? undefined}
                        />
                      </ScaledSlide>
                    </div>
                  );
                })()}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setI((n) => Math.min(n + 1, slides.length - 1))}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/20 p-2 text-white/60 hover:text-white"
              aria-label="Next"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

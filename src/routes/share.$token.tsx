import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSharedDeck, recordShareView } from "@/lib/deck-sharing.functions";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import type { DeckSlide } from "@/lib/deck-store";
import { Play, X, ChevronLeft, ChevronRight } from "lucide-react";
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
  slides: Array<{
    position: number;
    section_id: string;
    variant_id: string;
    layout_id: string;
    content: Record<string, unknown> | null;
  }>;
  brief: { prospect?: string | null; industry?: string | null } | null;
};

export const Route = createFileRoute("/share/$token")({
  head: () => ({ meta: [{ title: "Shared deck · TransPerfect" }] }),
  component: ShareView,
});

function ShareView() {
  const { token } = Route.useParams();
  const fetchShared = useServerFn(getSharedDeck);
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "ready"; deck: SharedDeck } | { kind: "gone" } | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchShared({ data: { token } })
      .then((res) => {
        if (cancelled) return;
        if (!res.deck) setState({ kind: "gone" });
        else setState({ kind: "ready", deck: res.deck as SharedDeck });
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
  if (state.kind === "gone") {
    return <NotActive />;
  }
  if (state.kind === "error") {
    return <NotActive message={state.message} />;
  }
  return <SharedDeckView deck={state.deck} token={token} />;
}

function NotActive({ message }: { message?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#03002C] px-6 text-center text-white">
      <div>
        <div className="text-[10px] uppercase tracking-[0.35em] text-white/40">TransPerfect</div>
        <h1 className="mt-3 text-3xl font-semibold">This link is no longer active</h1>
        <p className="mt-3 max-w-md text-sm text-white/60">
          The deck owner may have disabled sharing or the link is invalid. Reach out to them for an updated link.
        </p>
        {message && <p className="mt-4 text-xs text-white/30">{message}</p>}
      </div>
    </div>
  );
}

function SharedDeckView({ deck, token }: { deck: SharedDeck; token: string }) {
  const brand = byId(BRAND_MODES, deck.brand_mode_id ?? "") ?? BRAND_MODES[0];
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
    <div className="min-h-screen bg-[#03002C] text-white">
      {/* Minimal header */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#03002C]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.35em] text-white/40">TransPerfect · Shared</div>
            <div className="mt-0.5 truncate text-base font-semibold">{deck.title}</div>
          </div>
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
      </header>

      <main className="mx-auto flex max-w-[1280px] flex-col items-center gap-6 px-6 py-10">
        {slides.map((slide, idx) => {
          const variant = byId(MODULE_VARIANTS, slide.variantId);
          if (!variant) return null;
          return (
            <div
              key={slide.id}
              className="w-full overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl"
              style={{ maxWidth: 1280 }}
            >
              <ScaledSlide>
                <VariantRenderer
                  slide={slide}
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
                          slide={s}
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

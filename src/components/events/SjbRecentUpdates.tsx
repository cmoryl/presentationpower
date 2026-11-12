// Auto-advancing slider of the latest Bowl creations and refreshes.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Download, Pause, Play } from "lucide-react";
import { Button } from "@/design-system/element";
import { SJB_RECENT_UPDATES } from "@/lib/sjb-recent-updates";
import { SJB_COLORS } from "@/lib/san-juan-bowl";

const gold = SJB_COLORS.find((c) => c.id === "gold")?.hex;
const navy = SJB_COLORS.find((c) => c.id === "navy")?.hex;
const CARD =
  "group relative block w-72 shrink-0 snap-start overflow-hidden rounded-lg border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0";
const STEP_MS = 4500;

export function SjbRecentUpdates() {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(true);
  const n = SJB_RECENT_UPDATES.length;

  const go = useCallback((idx: number) => {
    const el = track.current;
    const next = (idx + n) % n;
    const card = el?.children[next] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
    setActive(next);
  }, [n]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);
  useEffect(() => {
    if (!playing || paused) return;
    const t = setTimeout(() => go(active + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [active, playing, paused, go]);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const w = (el.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1;
    const idx = Math.round(el.scrollLeft / (w + 16));
    if (idx !== active && Math.abs(idx - active) > 0 && !playing) setActive(Math.min(n - 1, idx));
  };

  return (
    <section aria-labelledby="bowl-recent" aria-roledescription="carousel" className="mt-8"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      onKeyDown={(e) => { if (e.key === "ArrowRight") go(active + 1); if (e.key === "ArrowLeft") go(active - 1); }}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="bowl-recent" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            Recent updates
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: gold, color: navy }}>Live</span>
          </h2>
          <p className="text-sm text-muted-foreground">The newest Bowl creations and refreshes · {active + 1} of {n}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" aria-label={playing ? "Pause slider" : "Play slider"} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
          </Button>
          <Button variant="outline" size="icon" aria-label="Previous update" onClick={() => go(active - 1)}><ChevronLeft aria-hidden /></Button>
          <Button variant="outline" size="icon" aria-label="Next update" onClick={() => go(active + 1)}><ChevronRight aria-hidden /></Button>
        </div>
      </div>
      <div ref={track} onScroll={onScroll} className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pt-1 motion-reduce:scroll-auto [scrollbar-width:none]">
        {SJB_RECENT_UPDATES.map((u, idx) => {
          const on = idx === active;
          const body = (
            <>
              <div className="relative flex h-44 items-center justify-center overflow-hidden bg-muted">
                <img src={u.image} alt="" loading="lazy" className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none" />
                {idx === 0 && <span className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ background: gold, color: navy }}>New</span>}
              </div>
              <div className="p-4">
                {u.date && <p className="text-xs font-semibold text-primary">{u.date}</p>}
                <p className="mt-1 flex items-center gap-1.5 font-semibold text-foreground group-hover:text-primary">
                  {u.file && <Download aria-hidden className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  {u.title}
                </p>
                <p className="text-[13px] text-muted-foreground">{u.detail}</p>
              </div>
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-border">
                {on && <div key={`${active}-${playing && !paused}`} className={playing && !paused ? "sjb-progress h-full" : "h-full w-full"}
                  style={{ background: gold, animationDuration: `${STEP_MS}ms` }} />}
              </div>
            </>
          );
          const cls = `${CARD} ${on ? "border-primary shadow-md" : "border-border"}`;
          return u.file ? (
            <a key={u.title} href={u.file.href} download={u.file.download} className={cls}>{body}</a>
          ) : (
            <Link key={u.title} {...u.link} className={cls}>{body}</Link>
          );
        })}
      </div>
      <div className="mt-2 flex justify-center gap-1.5">
        {SJB_RECENT_UPDATES.map((u, idx) => (
          <button key={u.title} type="button" aria-label={`Go to ${u.title}`} aria-current={idx === active}
            onClick={() => go(idx)} className={`h-1.5 rounded-full transition-all ${idx === active ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />
        ))}
      </div>
    </section>
  );
}

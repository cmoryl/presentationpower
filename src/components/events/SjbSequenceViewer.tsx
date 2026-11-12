import { useEffect, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/design-system/element";

export interface SjbSequenceViewerProps {
  /** Saved page pictures in order (cover first). */
  pages: string[];
  labels?: readonly string[];
  /** "carousel" shows a swipe-style post frame; "story" a 9:16 frame with progress bars. */
  variant: "carousel" | "story";
  width: number;
  height: number;
  title: string;
  displayHeight?: number;
}

/** Shows saved multi-page Canva pictures the way the platform presents them. */
export function SjbSequenceViewer({ pages, labels, variant, width, height, title, displayHeight = 420 }: SjbSequenceViewerProps) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(variant === "story");
  const n = pages.length;
  const go = (d: number) => setI((v) => Math.max(0, Math.min(n - 1, v + d)));
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!playing) return;
    if (i >= n - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setI((v) => v + 1), 3200);
    return () => clearTimeout(t);
  }, [playing, i, n]);

  const w = (displayHeight * width) / height;
  const label = (k: number) => labels?.[k] ?? `${variant === "story" ? "Frame" : "Page"} ${k + 1}`;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  };

  return (
    <div className="flex w-full min-w-0 flex-col items-start gap-2">
      <div
        role="region"
        aria-roledescription={variant}
        aria-label={`${title}: ${label(i)}, ${i + 1} of ${n}`}
        tabIndex={0}
        onKeyDown={onKey}
        className={`relative overflow-hidden bg-black shadow-md outline-none focus-visible:ring-2 focus-visible:ring-primary ${variant === "story" ? "rounded-xl" : "rounded"}`}
        style={{ width: w, maxWidth: '100%', aspectRatio: `${width} / ${height}` }}
      >
        <div className="flex h-full" style={{ width: `${n * 100}%`, transform: `translateX(${-i * 100 / n}%)`, transition: reduce ? "none" : "transform 420ms cubic-bezier(.2,.7,.2,1)" }}>
          {pages.map((src, k) => (
            <img key={src} src={src} alt={`${title} — ${label(k)}`} draggable={false} className="h-full shrink-0 object-contain" style={{ width: `${100 / n}%` }} loading={k === 0 ? "eager" : "lazy"} />
          ))}
        </div>
        {variant === "story" ? (
          <>
            <div className="absolute inset-x-2 top-2 flex gap-1" aria-hidden>
              {pages.map((_, k) => <span key={k} className="h-0.5 flex-1 rounded bg-white/40"><span className="block h-full rounded bg-white" style={{ width: k <= i ? "100%" : "0%" }} /></span>)}
            </div>
            <button type="button" aria-label="Previous frame" onClick={() => { setPlaying(false); go(-1); }} className="absolute inset-y-0 left-0 w-1/3" />
            <button type="button" aria-label="Next frame" onClick={() => { setPlaying(false); go(1); }} className="absolute inset-y-0 right-0 w-1/3" />
          </>
        ) : (
          <>
            {i > 0 && <Button size="icon" variant="secondary" aria-label="Previous page" onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full opacity-90"><ChevronLeft /></Button>}
            {i < n - 1 && <Button size="icon" variant="secondary" aria-label="Next page" onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full opacity-90"><ChevronRight /></Button>}
            <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white" aria-hidden>{i + 1}/{n}</span>
          </>
        )}
      </div>
      <div className="flex max-w-full items-center gap-2" style={{ width: w }}>
        {variant === "story" && (
          <Button size="sm" variant="outline" aria-label={playing ? "Pause story" : "Play story"} onClick={() => { if (!playing && i >= n - 1) setI(0); setPlaying((p) => !p); }}>
            {playing ? <Pause /> : <Play />}
          </Button>
        )}
        <div className="flex flex-1 justify-center gap-1.5">
          {pages.map((_, k) => (
            <button key={k} type="button" aria-label={`Show ${label(k)}`} aria-current={k === i} onClick={() => { setPlaying(false); setI(k); }} className={`size-2 rounded-full ${k === i ? "bg-primary" : "bg-muted-foreground/40"}`} />
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{label(i)}</p>
    </div>
  );
}

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * ScaledSlide renders content at a fixed 1920×1080 stage and scales it to fit.
 * All child layouts author to the stage dimensions; the wrapper handles fit.
 */
export function ScaledSlide({
  children,
  className = "",
  stageW = 1920,
  stageH = 1080,
}: {
  children: ReactNode;
  className?: string;
  /** Stage box in authored px. Defaults to the canonical 16:9 stage; the
   *  visual-regression harness overrides it to exercise 4:3 / 1:1 decks. */
  stageW?: number;
  stageH?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  // Measured before paint: a first frame at scale 1 briefly rendered the stage
  // at full 1920px inside a smaller box, which made type flash oversized and
  // let scale-aware consumers (canvas adoption, `--slide-scale` CSS) read a
  // stale value on mount.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        const next = Math.min(w / stageW, h / stageH);
        setScale((prev) => (prev !== null && Math.abs(prev - next) < 0.0005 ? prev : next));
      }
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    const raf = requestAnimationFrame(measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [stageW, stageH]);

  const s = scale ?? 1;

  return (
    <div
      ref={wrapRef}
      data-print-surface=""
      className={`relative w-full overflow-hidden bg-white text-left ${className}`}
      style={{ aspectRatio: `${stageW} / ${stageH}` }}
    >
      <div
        data-slide-stage=""
        /* Thumbnail-scale legibility: below ~0.45 a 32px glyph with a 2.5
           stroke renders under half a pixel and visually disappears in the
           module library cards. CSS keyed off this flag restores presence. */
        data-thumb={s < 0.45 ? "1" : undefined}
        className="absolute left-0 top-0 origin-top-left text-left"
        style={
          {
            width: stageW,
            height: stageH,
            transform: `scale(${s})`,
            // Hidden only for the very first pre-measure frame, so nothing ever
            // paints at an unscaled size.
            visibility: scale === null ? "hidden" : undefined,
            "--slide-scale": s,
          } as CSSProperties
        }
      >


        {children}
      </div>
    </div>
  );
}

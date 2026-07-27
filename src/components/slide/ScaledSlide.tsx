import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * ScaledSlide renders content at a fixed 1920×1080 stage and scales it to fit.
 * All child layouts author to the stage dimensions; the wrapper handles fit.
 */
export function ScaledSlide({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setScale(Math.min(w / 1920, h / 1080));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    const raf = requestAnimationFrame(measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} data-print-surface="" className={`relative w-full aspect-[16/9] overflow-hidden bg-white text-left ${className}`}>
      <div
        data-slide-stage=""

        className="absolute left-0 top-0 origin-top-left text-left"
        style={{
          width: 1920,
          height: 1080,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>

  );
}

/**
 * HeroVideoLayer — marketing motion behind an Element section hero.
 *
 * Sits absolutely inside an existing `<header class="relative overflow-hidden">`
 * so the current gradient stays as the base and as the reduced-motion / no-video
 * fallback. Muted, looping, inline, and decorative (aria-hidden): it never
 * carries meaning and never autoplays for users who ask for reduced motion.
 */

import { useEffect, useRef, useState } from "react";

export function HeroVideoLayer({
  src,
  /** Video opacity — keep low so headline contrast stays AA on white heroes. */
  opacity = 0.5,
  /** Accent used for the wash that keeps text legible over the footage. */
  tint = "#FFFFFF",
  className = "",
}: {
  src: string;
  opacity?: number;
  tint?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setAllowed(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (allowed) void el.play().catch(() => undefined);
    else el.pause();
  }, [allowed]);

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 -z-0 ${className}`}>
      {allowed && (
        <video
          ref={ref}
          src={src}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          className="h-full w-full object-cover"
          style={{ opacity }}
        />
      )}
      {/* Legibility wash: solid at the text edge, clearing toward the far side. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(100deg, ${tint} 0%, ${tint}F2 34%, ${tint}B8 62%, ${tint}66 100%)`,
        }}
      />
    </div>
  );
}

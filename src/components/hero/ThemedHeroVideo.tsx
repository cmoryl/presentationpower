/**
 * ThemedHeroVideo — one photoreal motion plate behind a dark hero band, with a
 * dark-authored and a light-authored version selected by the active theme.
 *
 * Decorative (aria-hidden), muted and looping; never scheduled under
 * `prefers-reduced-motion`, where the hero's own gradient is the fallback. A
 * scrim sits on top so white hero copy keeps its contrast.
 */

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTheme } from "@/hooks/use-theme";

export function ThemedHeroVideo({
  dark,
  light,
  /** Scrim base colour — matches the hero band behind it. */
  scrim = "#03002C",
}: {
  dark: string;
  light: string;
  scrim?: string;
}) {
  const reduced = useReducedMotion();
  const [theme] = useTheme();
  const ref = useRef<HTMLVideoElement | null>(null);
  const src = theme === "dark" ? dark : light;

  useEffect(() => {
    const el = ref.current;
    if (el) void el.play().catch(() => undefined);
  }, [src]);

  if (reduced) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(100deg, ${scrim} 0%, ${scrim}F0 30%, ${scrim}C7 58%, ${scrim}80 100%)`,
        }}
      />
    </div>
  );
}

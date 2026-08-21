/**
 * HomeHeroVideo — photoreal motion plates behind the rotating homepage hero.
 *
 * One clip per hero mode (presentation / print / event / social), authored in a
 * dark and a light version; the active theme picks the version and the active
 * mode picks the clip. Clips crossfade so the rotation reads as one continuous
 * film rather than four hard cuts. A navy scrim always sits on top, so headline
 * contrast is identical no matter which plate is playing.
 *
 * Decorative only (aria-hidden) and never scheduled under
 * `prefers-reduced-motion` — the hero's existing aurora gradient is the
 * fallback.
 */

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTheme } from "@/hooks/use-theme";

import presentationDark from "@/assets/home-hero-presentation-dark.mp4.asset.json";
import printDark from "@/assets/home-hero-print-dark.mp4.asset.json";
import eventDark from "@/assets/home-hero-event-dark.mp4.asset.json";
import socialDark from "@/assets/home-hero-social-dark.mp4.asset.json";
import presentationLight from "@/assets/home-hero-presentation-light.mp4.asset.json";
import printLight from "@/assets/home-hero-print-light.mp4.asset.json";
import eventLight from "@/assets/home-hero-event-light.mp4.asset.json";
import socialLight from "@/assets/home-hero-social-light.mp4.asset.json";

export type HomeHeroModeId = "presentation" | "print" | "event" | "social";

const PLATES: Record<HomeHeroModeId, { dark: string; light: string }> = {
  presentation: { dark: presentationDark.url, light: presentationLight.url },
  print: { dark: printDark.url, light: printLight.url },
  event: { dark: eventDark.url, light: eventLight.url },
  social: { dark: socialDark.url, light: socialLight.url },
};

const ORDER: HomeHeroModeId[] = ["presentation", "print", "event", "social"];

function Plate({ src, active }: { src: string; active: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) void el.play().catch(() => undefined);
    else el.pause();
  }, [active, src]);

  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload={active ? "auto" : "none"}
      className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-out will-change-[opacity]"
      style={{ opacity: active ? 1 : 0 }}
    />
  );
}

export function HomeHeroVideo({ mode }: { mode: HomeHeroModeId }) {
  const reduced = useReducedMotion();
  const [theme] = useTheme();
  if (reduced) return null;

  const variant = theme === "dark" ? "dark" : "light";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {ORDER.map((id) => (
        <Plate key={id} src={PLATES[id][variant]} active={id === mode} />
      ))}
      {/* Legibility scrim — hero copy is always white, so the plate stays behind
          a navy wash that clears toward the right edge. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, #03002C 0%, rgba(3,0,44,0.94) 30%, rgba(3,0,44,0.78) 58%, rgba(3,0,44,0.5) 100%)",
        }}
      />
    </div>
  );
}

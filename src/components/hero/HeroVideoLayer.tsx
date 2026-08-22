/**
 * HeroVideoLayer — marketing motion behind an Element section hero.
 *
 * Sits absolutely inside an existing `<header class="relative overflow-hidden">`
 * so the current gradient stays as the base and as the reduced-motion / no-video
 * fallback. Muted, looping, inline, and decorative (aria-hidden): it never
 * carries meaning and never autoplays for users who ask for reduced motion.
 */

import { useEffect, useState } from "react";
import { SeamlessVideo } from "@/components/hero/SeamlessVideo";

export function HeroVideoLayer({
  src,
  /** Video opacity — keep low so headline contrast stays AA on white heroes. */
  opacity = 0.5,
  /** Accent used for the wash that keeps text legible over the footage. */
  tint = "#FFFFFF",
  /** Wash colour used under `.dark` so light text keeps its contrast. */
  darkTint = "#05041A",
  className = "",
}: {
  src: string;
  opacity?: number;
  tint?: string;
  darkTint?: string;
  className?: string;
}) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setAllowed(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 -z-0 ${className}`}>
      {allowed && (
        <div className="absolute inset-0" style={{ opacity }}>
          <SeamlessVideo src={src} />
        </div>
      )}
      {/* Legibility wash: solid at the text edge, clearing toward the far side. */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background: `linear-gradient(100deg, ${tint} 0%, ${tint}F2 34%, ${tint}B8 62%, ${tint}66 100%)`,
        }}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background: `linear-gradient(100deg, ${darkTint} 0%, ${darkTint}F2 34%, ${darkTint}C4 62%, ${darkTint}7A 100%)`,
        }}
      />
    </div>
  );
}

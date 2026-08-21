import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * SectionCue — a subtle, self-dismissing chapter marker for playback surfaces.
 *
 * When the presented slide crosses into a new section, a small label fades in
 * over the slide and fades back out. Purely presentational: opacity + translate
 * only (GPU-compositable, no layout), pointer-events off, and never rendered
 * into exports. Under reduced motion the cue is skipped entirely.
 */
export function SectionCue({
  sectionId,
  label,
  holdMs = 1500,
  className,
}: {
  sectionId: string | undefined;
  label: string | undefined;
  holdMs?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState<string | undefined>(undefined);
  const lastSection = useRef<string | undefined>(undefined);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    if (reduced || !sectionId || !label) {
      lastSection.current = sectionId;
      return;
    }
    if (lastSection.current === sectionId) return;
    const first = lastSection.current === undefined;
    lastSection.current = sectionId;
    if (first) return; // don't greet the very first slide

    clear();
    setShown(label);
    setVisible(true);
    timers.current.push(setTimeout(() => setVisible(false), holdMs));
    timers.current.push(setTimeout(() => setShown(undefined), holdMs + 450));
    return clear;
  }, [sectionId, label, holdMs, reduced]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  if (!shown) return null;

  return (
    <div
      data-section-cue=""
      data-export-ignore=""
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute left-6 top-6 z-30 will-change-transform",
        className,
      )}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-6px)",
        transition:
          "opacity 380ms cubic-bezier(0.22,0.61,0.36,1), transform 380ms cubic-bezier(0.22,0.61,0.36,1)",
      }}
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/90 backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
        {shown}
      </span>
    </div>
  );
}

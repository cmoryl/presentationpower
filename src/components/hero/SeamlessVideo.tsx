/**
 * SeamlessVideo — plays a short clip as an endless loop with no visible cut.
 *
 * A native `loop` restarts the file instantly, so any clip whose last frame
 * differs from its first shows a hard jump every few seconds. This renders the
 * same source twice and crossfades from the tail of one copy into the head of
 * the other, so the seam dissolves instead of snapping. Both layers are
 * compositor-only (opacity), so the loop costs no layout work.
 *
 * Decorative by contract — callers own the aria-hidden wrapper and the scrim.
 */

import { useEffect, useRef } from "react";

/** Crossfade window, in seconds, taken from the end of each pass. */
const FADE = 1.1;

export function SeamlessVideo({
  src,
  className = "",
  style,
  /** Pause everything (reduced motion, off-screen mode, …). */
  paused = false,
  preload = "auto",
}: {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  paused?: boolean;
  preload?: "auto" | "metadata" | "none";
}) {
  const aRef = useRef<HTMLVideoElement | null>(null);
  const bRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;

    // `front` is the copy currently on screen; the other waits at frame 0.
    let front = a;
    let back = b;
    let handingOff = false;

    const reset = () => {
      handingOff = false;
      front = a;
      back = b;
      a.currentTime = 0;
      b.currentTime = 0;
      a.style.opacity = "1";
      b.style.opacity = "0";
      b.pause();
    };

    if (paused) {
      a.pause();
      b.pause();
      return;
    }

    reset();
    void front.play().catch(() => undefined);

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const dur = front.duration;
      if (!Number.isFinite(dur) || dur <= FADE * 2) return;

      const fadeStart = dur - FADE;
      const t = front.currentTime;

      if (t >= fadeStart) {
        if (!handingOff) {
          handingOff = true;
          back.currentTime = 0;
          void back.play().catch(() => undefined);
        }
        const k = Math.min(1, Math.max(0, (t - fadeStart) / FADE));
        front.style.opacity = String(1 - k);
        back.style.opacity = String(k);
        if (k >= 1) {
          // Hand over: the incoming copy becomes the front, the outgoing one
          // rewinds and waits for the next seam.
          front.pause();
          front.currentTime = 0;
          front.style.opacity = "0";
          back.style.opacity = "1";
          const prev = front;
          front = back;
          back = prev;
          handingOff = false;
        }
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      a.pause();
      b.pause();
    };
  }, [src, paused]);

  const shared = `absolute inset-0 h-full w-full object-cover will-change-[opacity] ${className}`;

  return (
    <>
      <video
        ref={aRef}
        src={src}
        muted
        playsInline
        autoPlay
        preload={preload}
        className={shared}
        style={{ ...style, opacity: 1 }}
      />
      <video
        ref={bRef}
        src={src}
        muted
        playsInline
        preload={preload}
        className={shared}
        style={{ ...style, opacity: 0 }}
      />
    </>
  );
}

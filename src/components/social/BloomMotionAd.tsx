// The moving version of one bloom ad.
//
// It draws onto a canvas with the same routine that writes the video file, so
// the preview on the board and the delivered clip are the same animation. The
// canvas carries the placement's true pixel trim and is scaled to fit its box.

import { useEffect, useRef } from "react";
import type { BloomAperture, BloomScene, BloomSide } from "@/lib/social-legal-bloom";
import type { BloomAdLayout } from "@/lib/social-legal-bloom-layout";
import {
  drawBloomMotionFrame,
  ensureBloomFonts,
  loadBloomAssets,
  type BloomDrawAssets,
} from "@/lib/social-legal-bloom-draw";
import { bloomMotionFrame, type BloomMotionPreset } from "@/lib/social-legal-bloom-motion";

type Props = {
  scene: BloomScene;
  w: number;
  h: number;
  aperture?: BloomAperture;
  side?: BloomSide;
  layout?: BloomAdLayout;
  preset: BloomMotionPreset;
  /** How the italic accent word arrives; falls back to the preset's own settle. */
  accentMotionId?: string;
  seconds: number;
  /** Runs on a loop while true; holds the last frame while false. */
  playing?: boolean;
  /** Hands the canvas back so the board can record straight off it. */
  onCanvas?: (canvas: HTMLCanvasElement | null, assets: BloomDrawAssets | null) => void;
  className?: string;
};

export function BloomMotionAd({
  scene,
  w,
  h,
  aperture,
  side,
  layout,
  preset,
  accentMotionId,
  seconds,
  playing = true,
  onCanvas,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const assetsRef = useRef<BloomDrawAssets | null>(null);
  const rafRef = useRef<number | null>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    let live = true;
    assetsRef.current = null;
    onCanvas?.(canvasRef.current, null);

    const run = async () => {
      await ensureBloomFonts();
      const assets = await loadBloomAssets(scene);
      if (!live) return;
      assetsRef.current = assets;
      onCanvas?.(canvasRef.current, assets);

      const paint = (t: number) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        drawBloomMotionFrame(ctx, {
          scene,
          w,
          h,
          aperture,
          side,
          layout,
          motion: bloomMotionFrame(preset, t, seconds, accentMotionId),
          assets,
        });
      };

      const started = performance.now();
      const step = () => {
        if (!live) return;
        if (playingRef.current) {
          const elapsed = ((performance.now() - started) / 1000) % (seconds + 0.9);
          paint(Math.min(seconds, elapsed));
        }
        rafRef.current = requestAnimationFrame(step);
      };
      paint(playingRef.current ? 0 : seconds);
      rafRef.current = requestAnimationFrame(step);
    };
    void run();

    return () => {
      live = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // onCanvas is a reporting callback; the animation restarts on real changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, w, h, aperture, side, layout, preset, seconds]);

  return (
    <canvas
      ref={canvasRef}
      width={w}
      height={h}
      className={className}
      style={{ display: "block", width: "100%", height: "auto", background: "#FBFBFD" }}
      aria-label={`${scene.lead} ${scene.turn} ${scene.tail} — moving version`}
    />
  );
}

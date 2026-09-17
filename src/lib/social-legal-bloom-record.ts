// Recording one bloom ad clip, shared by the motion panel and the pack export.
//
// Both places need exactly the same clip: the same safe layout, the same drawing
// routine and the same bitrate ceiling, so the routine lives here once.

import type { BloomAperture, BloomScene, BloomSide } from "@/lib/social-legal-bloom";
import { bloomAutoLayout } from "@/lib/social-legal-bloom-layout";
import {
  bloomClipSeconds,
  bloomMotionFrame,
  bloomSafeLayout,
  bloomVideoBitrate,
  type BloomMotionPreset,
  type BloomPlacement,
} from "@/lib/social-legal-bloom-motion";
import {
  drawBloomMotionFrame,
  ensureBloomFonts,
  loadBloomAssets,
} from "@/lib/social-legal-bloom-draw";
import { recordBloomClip, type BloomVideoFormat } from "@/lib/social-legal-bloom-video";

export type RecordSceneClipArgs = {
  canvas: HTMLCanvasElement | null;
  scene: BloomScene;
  placement: BloomPlacement;
  preset: BloomMotionPreset;
  /** How the italic accent word arrives. */
  accentMotionId?: string;
  /** Wanted length; capped to what the placement allows. */
  wantSeconds: number;
  fps: number;
  format: BloomVideoFormat | null;
  aperture: BloomAperture | "scene";
  side: BloomSide | "scene";
};

/** Record one ad at one placement, off the given canvas, at true pixel size. */
export async function recordBloomSceneClip(args: RecordSceneClipArgs): Promise<Blob> {
  const { canvas, scene, placement: p, preset, wantSeconds, fps, format } = args;
  if (!format) throw new Error("This browser cannot write video files.");
  if (!canvas) throw new Error("The recording area was not ready.");
  canvas.width = p.w;
  canvas.height = p.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The recording area could not be prepared.");
  await ensureBloomFonts();
  const assets = await loadBloomAssets(scene);
  const cut = args.aperture === "scene" ? scene.aperture : args.aperture;
  const copySide = args.side === "scene" ? scene.side : args.side;
  const layout = bloomSafeLayout(
    bloomAutoLayout(scene, p.w, p.h, cut, copySide),
    p.safeTop,
    p.safeBottom,
  );
  const clip = bloomClipSeconds(p, wantSeconds);
  return recordBloomClip({
    canvas,
    seconds: clip,
    fps,
    bitsPerSecond: bloomVideoBitrate(p, clip),
    format,
    draw: (t) =>
      drawBloomMotionFrame(ctx, {
        scene,
        w: p.w,
        h: p.h,
        aperture: cut,
        side: copySide,
        layout,
        motion: bloomMotionFrame(preset, t, clip, args.accentMotionId),
        assets,
      }),
  });
}

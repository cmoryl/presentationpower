// -----------------------------------------------------------------------------
// Sequence motion for the Bowl social calendar's multi-page formats.
//
// Every multi-page ad (LinkedIn 4:5 and square carousels, Instagram carousel,
// Story sequence) is a set of still pages. This gives them one motion language:
// a per-format transition, the timings that go with it, and the two renderers
// that consume both — the in-calendar preview and the MP4 export.
//
// The numbers live here and nowhere else, so a preview and the video it produced
// can be compared frame for frame.
// -----------------------------------------------------------------------------
import type { SjbCalendarFormat } from "@/lib/sjb-calendar-formats";

export type SjbSequenceTransition = "push" | "fade-up" | "slide-up";

export interface SjbSequenceMotion {
  /** How one page hands over to the next. */
  style: SjbSequenceTransition;
  /** Seconds a page sits alone before the handover. */
  holdMs: number;
  /** Seconds the handover takes. */
  moveMs: number;
  /** The last page (the tickets end card) is held longer. */
  endHoldMs: number;
  /** CSS easing used by the preview; matches `easeOutCubic` used by the video. */
  easing: string;
  /** Frames per second recorded into the video. */
  fps: number;
}

/**
 * Mixed per format, as chosen for the calendar: a carousel reads like a swipe
 * so it pushes sideways, a Story dissolves upward, and a LinkedIn carousel
 * rises into place. `single` has no sequence at all — it is kept for completeness
 * so the map can never silently fall back to the wrong style.
 */
export const SJB_SEQUENCE_MOTION: Record<SjbCalendarFormat, SjbSequenceMotion> = {
  single: { style: "fade-up", holdMs: 1500, moveMs: 650, endHoldMs: 2100, easing: "cubic-bezier(0.33, 1, 0.68, 1)", fps: 30 },
  "linkedin-portrait": { style: "slide-up", holdMs: 1500, moveMs: 650, endHoldMs: 2100, easing: "cubic-bezier(0.33, 1, 0.68, 1)", fps: 30 },
  "linkedin-square": { style: "slide-up", holdMs: 1500, moveMs: 650, endHoldMs: 2100, easing: "cubic-bezier(0.33, 1, 0.68, 1)", fps: 30 },
  "instagram-carousel": { style: "push", holdMs: 1500, moveMs: 650, endHoldMs: 2100, easing: "cubic-bezier(0.33, 1, 0.68, 1)", fps: 30 },
  "story-sequence": { style: "fade-up", holdMs: 1500, moveMs: 650, endHoldMs: 2100, easing: "cubic-bezier(0.33, 1, 0.68, 1)", fps: 30 },
};

export function sjbSequenceMotion(format: SjbCalendarFormat): SjbSequenceMotion {
  return SJB_SEQUENCE_MOTION[format];
}

/** easeOutCubic — the JS twin of `cubic-bezier(0.33, 1, 0.68, 1)`. */
export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - x, 3);
}

export interface SjbTransitionFrame {
  /** Offsets and alphas as fractions of the frame: -1 is one full width left. */
  fromX: number;
  fromY: number;
  fromAlpha: number;
  toX: number;
  toY: number;
  toAlpha: number;
}

/**
 * Where the two pages sit at progress `t` (0 = handover not started,
 * 1 = the new page has fully arrived). Pure, so the calendar and the video
 * can be tested against the same numbers.
 */
export function transitionFrame(style: SjbSequenceTransition, t: number): SjbTransitionFrame {
  const p = Math.min(1, Math.max(0, t));
  if (style === "push") {
    return { fromX: -p, fromY: 0, fromAlpha: 1, toX: 1 - p, toY: 0, toAlpha: 1 };
  }
  if (style === "slide-up") {
    // LinkedIn: the new page rises from well below while the old one drops out.
    return {
      fromX: 0,
      fromY: -0.06 * p,
      fromAlpha: 1 - p,
      toX: 0,
      toY: 0.18 * (1 - p),
      toAlpha: Math.min(1, p * 1.15),
    };
  }
  // fade-up: a Story dissolves, drifting only slightly so it stays calm.
  return {
    fromX: 0,
    fromY: -0.03 * p,
    fromAlpha: 1 - p,
    toX: 0,
    toY: 0.08 * (1 - p),
    toAlpha: Math.min(1, p * 1.4),
  };
}

/** Wall-clock length of a finished sequence: every hold plus every handover. */
export function sjbSequenceDuration(motion: SjbSequenceMotion, pageCount: number): number {
  if (pageCount <= 0) return 0;
  const n = Math.min(1, pageCount);
  return (pageCount - n) * (motion.holdMs + motion.moveMs) + motion.endHoldMs;
}

/**
 * Which page is on screen and how far its handover has run at `elapsed` ms.
 * Past the end it rests on the final page, so a renderer can never index
 * off the end of the sequence.
 */
export function sequenceSlotAt(
  motion: SjbSequenceMotion,
  pageCount: number,
  elapsed: number,
): { index: number; progress: number } {
  if (pageCount <= 0) return { index: 0, progress: 0 };
  const last = pageCount - 1;
  const cycle = motion.holdMs + motion.moveMs;
  const e = Math.max(0, elapsed);
  const index = Math.min(last, Math.floor(e / cycle));
  const local = e - index * cycle;
  const progress = index === last ? 0 : Math.min(1, Math.max(0, (local - motion.holdMs) / motion.moveMs));
  return { index, progress };
}

// -----------------------------------------------------------------------------
// MP4 export
// -----------------------------------------------------------------------------

/** Preferred first: an H.264 MP4, then anything the browser can actually mux. */
const VIDEO_MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm",
];

export interface SjbSequenceVideoResult {
  blob: Blob;
  mime: string;
  /** File extension that matches `mime`. */
  ext: "mp4" | "webm";
  /** Wall-clock length of the finished clip. */
  ms: number;
}

function pickVideoMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const m of VIDEO_MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      /* keep looking */
    }
  }
  return "";
}

function paintComposite(
  ctx: CanvasRenderingContext2D,
  from: HTMLCanvasElement,
  to: HTMLCanvasElement | null,
  progress: number,
  style: SjbSequenceTransition,
  width: number,
  height: number,
  background: string,
): void {
  const f = transitionFrame(style, easeOutCubic(progress));
  ctx.globalAlpha = 1;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = Math.max(0, Math.min(1, f.fromAlpha));
  ctx.drawImage(from, f.fromX * width, f.fromY * height);
  if (to && f.toAlpha > 0.001) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.toAlpha));
    ctx.drawImage(to, f.toX * width, f.toY * height);
  }
  ctx.globalAlpha = 1;
}

/**
 * Record a page sequence as a video at the format's exact pixels, with the
 * format's transition between pages. Real-time by nature: the clip is as long
 * as `sjbSequenceDuration` says it is.
 *
 * The pages are the already-captured native-size canvases, so whatever badge
 * the page carries (DEMO LAYOUT) is baked into the video, never added here.
 */
export async function renderSequenceVideo(opts: {
  pages: HTMLCanvasElement[];
  width: number;
  height: number;
  motion: SjbSequenceMotion;
  background: string;
  onProgress?: (done: number, total: number) => void;
}): Promise<SjbSequenceVideoResult> {
  const { pages, width, height, motion, background } = opts;
  if (pages.length === 0) throw new Error("renderSequenceVideo: no pages provided");
  if (!(width > 0 && height > 0)) throw new Error("renderSequenceVideo: native size is required");
  if (typeof MediaRecorder === "undefined" || typeof document === "undefined") {
    throw new Error("This browser can't record video.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("renderSequenceVideo: canvas 2d context unavailable");

  const mime = pickVideoMime();
  const stream = canvas.captureStream(motion.fps);
  const recorder = new MediaRecorder(
    stream,
    mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : undefined,
  );
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  const total = sjbSequenceDuration(motion, pages.length);
  recorder.start();

  await new Promise<void>((resolve) => {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const slot = sequenceSlotAt(motion, pages.length, elapsed);
      paintComposite(
        ctx,
        pages[slot.index],
        slot.index < pages.length - 1 ? pages[slot.index + 1] : null,
        slot.progress,
        motion.style,
        width,
        height,
        background,
      );
      opts.onProgress?.(slot.index + 1, pages.length);
      if (elapsed >= total) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  // Let the muxer take the final frame before the stream is torn down.
  await new Promise((r) => setTimeout(r, 140));
  recorder.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());

  const outMime = mime || recorder.mimeType || "video/webm";
  const blob = new Blob(chunks, { type: outMime });
  if (blob.size === 0) throw new Error("renderSequenceVideo produced an empty file");
  return { blob, mime: outMime, ext: outMime.includes("mp4") ? "mp4" : "webm", ms: total };
}

// ---------------------------------------------------------------------------
// LEGAL CAMPAIGN — bloom variation, writing a moving ad to a file
//
// The animation is drawn onto a canvas frame by frame (social-legal-bloom-draw)
// and recorded straight off that canvas. The written weight is held under the
// placement's own limit by setting the bitrate from the file budget.
//
// MP4 is written where the browser can encode it, because every social platform
// takes it without a re-wrap; otherwise WebM is written and the board says so.
// ---------------------------------------------------------------------------

const MIME_CANDIDATES = [
  { mime: 'video/mp4;codecs="avc1.4D401E"', ext: "mp4", label: "MP4 (H.264)" },
  { mime: "video/mp4", ext: "mp4", label: "MP4" },
  { mime: 'video/webm;codecs="vp9"', ext: "webm", label: "WebM (VP9)" },
  { mime: "video/webm", ext: "webm", label: "WebM" },
];

export type BloomVideoFormat = { mime: string; ext: string; label: string };

/** The best format this browser can write, or null when it can write none. */
export function bloomVideoFormat(): BloomVideoFormat | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const c of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(c.mime)) return c;
    } catch {
      // fall through to the next candidate
    }
  }
  return null;
}

export type RecordOptions = {
  canvas: HTMLCanvasElement;
  /** Draws the ad at `t` seconds. */
  draw: (t: number) => void;
  seconds: number;
  fps: number;
  bitsPerSecond: number;
  format: BloomVideoFormat;
  /** 0–1 while the clip is being written. */
  onProgress?: (p: number) => void;
};

/**
 * Play the animation once, in real time, recording the canvas as it goes.
 * Resolves with the finished file.
 */
export function recordBloomClip(o: RecordOptions): Promise<Blob> {
  const { canvas, draw, seconds, fps, bitsPerSecond, format } = o;
  return new Promise((resolve, reject) => {
    let stream: MediaStream;
    try {
      stream = canvas.captureStream(fps);
    } catch {
      reject(new Error("This browser will not record from a canvas."));
      return;
    }
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: bitsPerSecond });
    } catch (err) {
      reject(err instanceof Error ? err : new Error("The recorder could not be started."));
      return;
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    recorder.onerror = () => reject(new Error("The recorder stopped unexpectedly."));
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: format.mime.split(";")[0] });
      // an empty file must never travel as if it were a clip
      if (!blob.size) {
        reject(new Error("No frames reached the recorder, so no clip was written."));
        return;
      }
      resolve(blob);
    };

    draw(0);
    recorder.start(200);
    const started = performance.now();
    const step = () => {
      const t = (performance.now() - started) / 1000;
      if (t >= seconds) {
        draw(seconds);
        o.onProgress?.(1);
        // one last frame has to reach the stream before the recorder closes
        setTimeout(() => {
          if (recorder.state !== "inactive") recorder.stop();
        }, 1000 / fps + 60);
        return;
      }
      draw(t);
      o.onProgress?.(t / seconds);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

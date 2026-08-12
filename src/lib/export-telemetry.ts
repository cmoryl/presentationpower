// -----------------------------------------------------------------------------
// Export performance telemetry
// -----------------------------------------------------------------------------
// PPTX export is the product's headline feature and also its slowest path: each
// slide is mounted offscreen, rasterized into a design plate, measured for text
// runs, then assembled into OOXML. When an export feels slow, the useful
// question is never "how long did it take" but "which slide, and which phase".
//
// This module is the stopwatch for that. It is pure and DOM-free (only
// `performance.now`/`Date.now`), so it can be unit-tested and reused by the
// print path, the verification harness and the library single-slide export.

export type ExportPhaseId =
  | "prepare"
  | "backgrounds"
  | "plates"
  | "logos"
  | "ooxml"
  | "fonts"
  | "audit";

export const PHASE_LABELS: Record<ExportPhaseId, string> = {
  prepare: "Preparing deck",
  backgrounds: "Background plans",
  plates: "Design plates (render)",
  logos: "Client logos",
  ooxml: "Slide assembly",
  fonts: "Font embedding",
  audit: "Coverage audit",
};

export type PhaseTiming = {
  id: ExportPhaseId;
  label: string;
  ms: number;
  /** Share of the total export wall clock, 0-100. */
  pct: number;
};

export type SlideTiming = {
  slideIndex: number;
  variantId: string;
  /** Offscreen render + rasterization of the design plate. */
  plateMs: number;
  /** OOXML assembly (plate placement, native text runs, vector fallbacks). */
  assemblyMs: number;
  /** Plate/asset retries spent on this slide. */
  retries: number;
  /** Native editable text runs emitted for this slide. */
  textRuns: number;
  /** Plate bytes as embedded (base64 payload length), for size bottlenecks. */
  plateBytes: number;
  get?: never;
};

export type ExportTelemetryReport = {
  startedAt: string;
  totalMs: number;
  fidelity: string;
  quality: string;
  slideCount: number;
  /** Wall-clock per phase, largest first. */
  phases: PhaseTiming[];
  /** Per-slide timings in deck order. */
  slides: Array<Omit<SlideTiming, "get"> & { totalMs: number }>;
  /** Slowest slides first, capped, for the "bottlenecks" list in the UI. */
  bottlenecks: Array<{ slideIndex: number; variantId: string; ms: number; reason: string }>;
  totals: {
    plateMs: number;
    assemblyMs: number;
    retries: number;
    textRuns: number;
    plateBytes: number;
    /** Mean and worst per-slide wall clock, the two numbers reviewers ask for. */
    avgSlideMs: number;
    slowestSlideMs: number;
  };
};

const now = (): number =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

/** Bottleneck threshold: a slide slower than this is worth naming in the UI. */
export const SLOW_SLIDE_MS = 1400;
/** A plate heavier than this (decoded bytes) is a file-size bottleneck. */
export const HEAVY_PLATE_BYTES = 1_400_000;

export class ExportTelemetry {
  private readonly t0 = now();
  private readonly startedAt = new Date().toISOString();
  private readonly phases = new Map<ExportPhaseId, number>();
  private readonly open = new Map<ExportPhaseId, number>();
  private readonly slides = new Map<number, SlideTiming>();

  constructor(
    private readonly fidelity: string = "layered",
    private readonly quality: string = "standard",
  ) {}

  /** Open a phase; the returned function closes it (safe to call twice). */
  phase(id: ExportPhaseId): () => void {
    this.open.set(id, now());
    let closed = false;
    return () => {
      if (closed) return;
      closed = true;
      const started = this.open.get(id);
      if (started == null) return;
      this.open.delete(id);
      this.phases.set(id, (this.phases.get(id) ?? 0) + (now() - started));
    };
  }

  /** Time an async phase and pass through its result (or rejection). */
  async measure<T>(id: ExportPhaseId, run: () => Promise<T>): Promise<T> {
    const done = this.phase(id);
    try {
      return await run();
    } finally {
      done();
    }
  }

  track(slideIndex: number, variantId = ""): SlideTiming {
    const existing = this.slides.get(slideIndex);
    if (existing) {
      if (!existing.variantId && variantId) existing.variantId = variantId;
      return existing;
    }
    const fresh = {
      slideIndex,
      variantId,
      plateMs: 0,
      assemblyMs: 0,
      retries: 0,
      textRuns: 0,
      plateBytes: 0,
    } as SlideTiming;
    this.slides.set(slideIndex, fresh);
    return fresh;
  }

  notePlate(slideIndex: number, ms: number, variantId = "") {
    this.track(slideIndex, variantId).plateMs += Math.max(0, ms);
  }

  noteAssembly(slideIndex: number, ms: number, variantId = "") {
    this.track(slideIndex, variantId).assemblyMs += Math.max(0, ms);
  }

  noteRetry(slideIndex: number, variantId = "") {
    this.track(slideIndex, variantId).retries += 1;
  }

  noteTextRuns(slideIndex: number, count: number, variantId = "") {
    this.track(slideIndex, variantId).textRuns = count;
  }

  notePlateBytes(slideIndex: number, dataUrl: string | null | undefined, variantId = "") {
    if (!dataUrl) return;
    const payload = dataUrl.slice(dataUrl.indexOf(",") + 1);
    // base64 -> bytes, close enough for a size bottleneck signal.
    this.track(slideIndex, variantId).plateBytes = Math.round((payload.length * 3) / 4);
  }

  /**
   * Turn a batch rasterizer's `(done, total)` progress into per-slide plate
   * timings: each tick closes the slide that just finished.
   */
  plateProgressTimer(order: Array<{ slideIndex: number; variantId: string }>) {
    let last = now();
    let seen = 0;
    return (done: number, _total: number) => {
      const stamp = now();
      while (seen < done && seen < order.length) {
        const target = order[seen];
        // Attribute the elapsed slice to the slide that just completed.
        this.notePlate(target.slideIndex, (stamp - last) / Math.max(1, done - seen), target.variantId);
        seen += 1;
      }
      last = stamp;
    };
  }

  entries(): SlideTiming[] {
    return [...this.slides.values()].sort((a, b) => a.slideIndex - b.slideIndex);
  }

  report(): ExportTelemetryReport {
    // Close anything still open so an early return can't lose a phase.
    for (const id of [...this.open.keys()]) this.phase(id)();
    const totalMs = Math.max(1, now() - this.t0);
    const phases: PhaseTiming[] = [...this.phases.entries()]
      .map(([id, ms]) => ({
        id,
        label: PHASE_LABELS[id] ?? id,
        ms: Math.round(ms),
        pct: Math.round((ms / totalMs) * 1000) / 10,
      }))
      .filter((p) => p.ms > 0)
      .sort((a, b) => b.ms - a.ms);

    const entries = this.entries();
    const slides = entries.map((s) => ({
      slideIndex: s.slideIndex,
      variantId: s.variantId,
      plateMs: Math.round(s.plateMs),
      assemblyMs: Math.round(s.assemblyMs),
      retries: s.retries,
      textRuns: s.textRuns,
      plateBytes: s.plateBytes,
      totalMs: Math.round(s.plateMs + s.assemblyMs),
    }));

    const bottlenecks = slides
      .map((s) => {
        const reasons: string[] = [];
        if (s.retries > 0) reasons.push(`${s.retries} retry${s.retries === 1 ? "" : "s"}`);
        if (s.totalMs >= SLOW_SLIDE_MS) reasons.push("slow offscreen render");
        if (s.plateBytes >= HEAVY_PLATE_BYTES)
          reasons.push(`heavy plate (${Math.round(s.plateBytes / 1024)} KB)`);
        if (s.assemblyMs > s.plateMs && s.assemblyMs > 250)
          reasons.push(`${s.textRuns} text runs to place`);
        return { slideIndex: s.slideIndex, variantId: s.variantId, ms: s.totalMs, reason: reasons.join(" · ") };
      })
      .filter((b) => b.reason.length > 0)
      .sort((a, b) => b.ms - a.ms)
      .slice(0, 5);

    const totals = {
      plateMs: slides.reduce((n, s) => n + s.plateMs, 0),
      assemblyMs: slides.reduce((n, s) => n + s.assemblyMs, 0),
      retries: slides.reduce((n, s) => n + s.retries, 0),
      textRuns: slides.reduce((n, s) => n + s.textRuns, 0),
      plateBytes: slides.reduce((n, s) => n + s.plateBytes, 0),
      avgSlideMs: slides.length
        ? Math.round(slides.reduce((n, s) => n + s.totalMs, 0) / slides.length)
        : 0,
      slowestSlideMs: slides.reduce((n, s) => Math.max(n, s.totalMs), 0),
    };

    return {
      startedAt: this.startedAt,
      totalMs: Math.round(totalMs),
      fidelity: this.fidelity,
      quality: this.quality,
      slideCount: slides.length,
      phases,
      slides,
      bottlenecks,
      totals,
    };
  }
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}

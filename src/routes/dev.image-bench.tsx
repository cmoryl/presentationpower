// -----------------------------------------------------------------------------
// Image re-encode performance benchmark (dev only)
//
// Times the REAL export re-encode pipeline (toPowerPointSafeDataUrl, which wraps
// transcodeToUniversalDataUrl) across the source formats and transparency cases
// a deck actually carries: JPEG photos, opaque PNG, transparent PNG cutouts,
// opaque WebP and transparent WebP — at slide-sized and full-bleed resolutions.
//
// Reports, per case and per export option:
//   - decode + alpha-scan + encode wall time (median / p95 / mean over runs)
//   - input vs output byte size and the resulting size ratio
//   - the format the pipeline chose (so a regression that silently stops
//     re-encoding shows up as a suspiciously fast, unchanged row)
//
// Exposed as window.__tpImageBench for scripts/bench-image-reencode.mjs.
// -----------------------------------------------------------------------------

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toPowerPointSafeDataUrl } from "@/lib/pptx-image-compat";
import { resetImageEmbedLedger, type ImageFormat } from "@/lib/export-image-report";
import { writeExportAlphaImages, writeExportLegacyImages } from "@/lib/export-quality";

export const Route = createFileRoute("/dev/image-bench")({
  component: ImageBenchHarness,
  head: () => ({
    meta: [
      { title: "Image re-encode benchmark · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Internal benchmark that measures re-encode time and output size for export imagery across formats and transparency.",
      },
      { property: "og:title", content: "Image re-encode benchmark" },
      {
        property: "og:description",
        content: "Measures encoding time and output size across common image formats and alpha cases.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

// ---------------------------------------------------------------- sample images

type SampleSpec = {
  id: string;
  /** Source container the pipeline sees. */
  format: "jpeg" | "png" | "webp";
  alpha: boolean;
  w: number;
  h: number;
  /** Photographic noise vs flat vector-ish art — changes encoder cost a lot. */
  content: "photo" | "flat";
};

const SAMPLES: SampleSpec[] = [
  { id: "jpeg-photo-1600", format: "jpeg", alpha: false, w: 1600, h: 900, content: "photo" },
  { id: "jpeg-photo-3200", format: "jpeg", alpha: false, w: 3200, h: 1800, content: "photo" },
  { id: "png-opaque-1600", format: "png", alpha: false, w: 1600, h: 900, content: "photo" },
  { id: "png-alpha-1600", format: "png", alpha: true, w: 1600, h: 900, content: "flat" },
  { id: "png-alpha-3200", format: "png", alpha: true, w: 3200, h: 1800, content: "flat" },
  { id: "webp-opaque-1600", format: "webp", alpha: false, w: 1600, h: 900, content: "photo" },
  { id: "webp-alpha-1600", format: "webp", alpha: true, w: 1600, h: 900, content: "flat" },
];

/** Paint deterministic content so runs are comparable across machines. */
function paint(spec: SampleSpec): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = spec.w;
  canvas.height = spec.h;
  const ctx = canvas.getContext("2d")!;
  if (!spec.alpha) {
    ctx.fillStyle = "#03002C";
    ctx.fillRect(0, 0, spec.w, spec.h);
  } else {
    ctx.clearRect(0, 0, spec.w, spec.h);
  }
  if (spec.content === "photo") {
    // Pseudo-random noise + gradients: incompressible, like a real photograph.
    const grad = ctx.createLinearGradient(0, 0, spec.w, spec.h);
    grad.addColorStop(0, "#003FC7");
    grad.addColorStop(1, "#FF9B70");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, spec.w, spec.h);
    let seed = 1337;
    const cell = 8;
    for (let y = 0; y < spec.h; y += cell) {
      for (let x = 0; x < spec.w; x += cell) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const v = seed % 255;
        ctx.fillStyle = `rgba(${v},${(v * 7) % 255},${(v * 13) % 255},0.35)`;
        ctx.fillRect(x, y, cell, cell);
      }
    }
  } else {
    // Flat art with real translucency: the alpha-scan and PNG path case.
    ctx.fillStyle = "rgba(161,251,249,0.55)";
    ctx.beginPath();
    ctx.arc(spec.w * 0.35, spec.h * 0.5, Math.min(spec.w, spec.h) * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,63,199,0.9)";
    ctx.fillRect(spec.w * 0.5, spec.h * 0.2, spec.w * 0.4, spec.h * 0.6);
  }
  return canvas;
}

function encodeSample(spec: SampleSpec): string {
  const canvas = paint(spec);
  if (spec.format === "jpeg") return canvas.toDataURL("image/jpeg", 0.9);
  if (spec.format === "webp") return canvas.toDataURL("image/webp", 0.9);
  return canvas.toDataURL("image/png");
}

/** Payload bytes of a base64 data URL, not the URL's string length. */
function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  const b64 = dataUrl.slice(comma + 1);
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - pad);
}

/** The container the pipeline actually emitted, read off the data URL mime. */
function formatOfDataUrl(dataUrl: string): ImageFormat {
  const mime = /^data:image\/([a-z0-9+.-]+)/i.exec(dataUrl)?.[1]?.toLowerCase() ?? "";
  if (mime === "jpeg" || mime === "jpg") return "jpeg";
  if (mime === "png") return "png";
  if (mime === "webp") return "webp";
  if (mime === "gif") return "gif";
  if (mime === "svg+xml") return "svg";
  return "unknown";
}

// ------------------------------------------------------------------- statistics

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// ---------------------------------------------------------------------- results

type BenchOption = { id: string; legacyImages: boolean; alphaImages: boolean };

const OPTIONS: BenchOption[] = [
  { id: "default", legacyImages: false, alphaImages: false },
  { id: "legacy-only", legacyImages: true, alphaImages: false },
  { id: "alpha-aware", legacyImages: false, alphaImages: true },
];

export type BenchRow = {
  option: string;
  sample: string;
  sourceFormat: string;
  sourceAlpha: boolean;
  pixels: number;
  runs: number;
  /** true when the pipeline actually re-encoded rather than passing through. */
  reencoded: boolean;
  outputFormat: ImageFormat;
  inputBytes: number;
  outputBytes: number;
  sizeRatio: number;
  medianMs: number;
  meanMs: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
  msPerMegapixel: number;
};

export type BenchReport = {
  runs: number;
  startedAt: string;
  durationMs: number;
  userAgent: string;
  rows: BenchRow[];
};

async function runBench(runs = 5): Promise<BenchReport> {
  const started = performance.now();
  const rows: BenchRow[] = [];
  // Build sources once — sample construction is not part of what we measure.
  const sources = new Map<string, string>();
  for (const spec of SAMPLES) sources.set(spec.id, encodeSample(spec));

  for (const option of OPTIONS) {
    writeExportLegacyImages(option.legacyImages);
    writeExportAlphaImages(option.alphaImages);
    for (const spec of SAMPLES) {
      const dataUrl = sources.get(spec.id)!;
      const inputBytes = dataUrlBytes(dataUrl);
      const times: number[] = [];
      let out = dataUrl;
      // One warm-up pass so the first row does not absorb codec init cost.
      resetImageEmbedLedger();
      await toPowerPointSafeDataUrl(dataUrl, {
        blobType: `image/${spec.format}`,
        url: `bench://${spec.id}.${spec.format}`,
        label: "bench-warmup",
      });
      for (let i = 0; i < runs; i += 1) {
        resetImageEmbedLedger();
        const t0 = performance.now();
        out = await toPowerPointSafeDataUrl(dataUrl, {
          blobType: `image/${spec.format}`,
          url: `bench://${spec.id}.${spec.format}`,
          label: "bench",
        });
        times.push(performance.now() - t0);
      }
      const sorted = [...times].sort((a, b) => a - b);
      const outputBytes = dataUrlBytes(out);
      const pixels = spec.w * spec.h;
      const median = quantile(sorted, 0.5);
      rows.push({
        option: option.id,
        sample: spec.id,
        sourceFormat: spec.format,
        sourceAlpha: spec.alpha,
        pixels,
        runs,
        reencoded: out !== dataUrl,
        outputFormat: formatOfDataUrl(out),
        inputBytes,
        outputBytes,
        sizeRatio: inputBytes > 0 ? outputBytes / inputBytes : 0,
        medianMs: median,
        meanMs: times.reduce((a, b) => a + b, 0) / times.length,
        p95Ms: quantile(sorted, 0.95),
        minMs: sorted[0],
        maxMs: sorted[sorted.length - 1],
        msPerMegapixel: median / (pixels / 1_000_000),
      });
    }
  }
  // Leave the toggles as we found the defaults, not mid-sweep state.
  writeExportLegacyImages(false);
  writeExportAlphaImages(false);
  return {
    runs,
    startedAt: new Date().toISOString(),
    durationMs: performance.now() - started,
    userAgent: navigator.userAgent,
    rows,
  };
}

declare global {
  interface Window {
    __tpImageBench?: { run: (runs?: number) => Promise<BenchReport> };
  }
}

// ------------------------------------------------------------------------- view

function fmtBytes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_048_576).toFixed(2)} MB`;
  if (n >= 1_000) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function ImageBenchHarness() {
  const [report, setReport] = useState<BenchReport | null>(null);
  const [busy, setBusy] = useState(false);

  const start = useCallback(async (runs: number) => {
    setBusy(true);
    try {
      setReport(await runBench(runs));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    window.__tpImageBench = { run: (runs = 5) => runBench(runs) };
    return () => {
      delete window.__tpImageBench;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <h1 className="text-2xl font-semibold tracking-tight">Image re-encode benchmark</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
        Measures the export re-encode pipeline (decode → alpha scan → encode) across JPEG, PNG and
        WebP sources, opaque and transparent, at slide and full-bleed resolutions — under each export
        image option.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void start(5)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Running…" : "Run benchmark (5 runs)"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void start(1)}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Quick pass (1 run)
        </button>
      </div>

      {report ? (
        <>
          <p className="mt-6 text-xs text-muted-foreground">
            {report.rows.length} cases · {report.runs} runs each · total{" "}
            {(report.durationMs / 1000).toFixed(1)}s
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  {["Option", "Sample", "Re-encoded", "Out", "In size", "Out size", "Ratio", "Median", "p95", "ms/MP"].map(
                    (h) => (
                      <th key={h} className="border-b border-border px-2 py-2 font-medium">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={`${r.option}:${r.sample}`} className="border-b border-border/50">
                    <td className="px-2 py-1.5">{r.option}</td>
                    <td className="px-2 py-1.5 font-mono">{r.sample}</td>
                    <td className="px-2 py-1.5">{r.reencoded ? "yes" : "pass-through"}</td>
                    <td className="px-2 py-1.5">{r.outputFormat}</td>
                    <td className="px-2 py-1.5">{fmtBytes(r.inputBytes)}</td>
                    <td className="px-2 py-1.5">{fmtBytes(r.outputBytes)}</td>
                    <td className="px-2 py-1.5">{r.sizeRatio.toFixed(2)}×</td>
                    <td className="px-2 py-1.5">{r.medianMs.toFixed(1)} ms</td>
                    <td className="px-2 py-1.5">{r.p95Ms.toFixed(1)} ms</td>
                    <td className="px-2 py-1.5">{r.msPerMegapixel.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </main>
  );
}

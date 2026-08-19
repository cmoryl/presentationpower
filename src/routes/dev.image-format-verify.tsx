// -----------------------------------------------------------------------------
// Image-format export harness (dev only)
//
// Builds a small sample deck whose slides carry KNOWN imagery — one bitmap with
// transparency, one fully opaque photograph, and one WebP (the format only
// PowerPoint 2019+/M365 decodes) — runs the REAL exporter, and reports what
// actually landed in ppt/media plus the per-embed transcode ledger.
//
// This is what the end-to-end image-format spec drives: for each combination of
// the two export toggles ("JPEG/PNG only" and "transparent → PNG, photos →
// JPEG") it asserts the embedded formats match the selected option.
//
// Exposed as window.__tpImageFormatVerify.
// -----------------------------------------------------------------------------

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BRAND_MODES, MODULE_VARIANTS, SECTION_FRAMEWORKS } from "@/lib/taxonomy";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import {
  buildImageCompatReport,
  getImageEmbedLedger,
  type ImageFormat,
} from "@/lib/export-image-report";
import { writeExportAlphaImages, writeExportLegacyImages } from "@/lib/export-quality";

export const Route = createFileRoute("/dev/image-format-verify")({
  component: ImageFormatVerifyHarness,
  head: () => ({
    meta: [
      { title: "Image format export harness · TransPerfect Element" },
      {
        name: "description",
        content:
          "Internal harness that exports sample decks with transparent, opaque and WebP imagery and audits the embedded picture formats.",
      },
      { property: "og:title", content: "Image format export harness" },
      {
        property: "og:description",
        content: "Audits embedded PPTX picture formats against the selected export image options.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/** Which sample image an embed record came from. */
type SampleKey = "transparent" | "opaque" | "webp" | "other";

type EmbedRow = {
  sample: SampleKey;
  sourceFormat: ImageFormat;
  embeddedFormat: ImageFormat;
  transcoded: boolean;
  transcodeFailed: boolean;
};

type FormatAudit = {
  legacyImages: boolean;
  alphaImages: boolean;
  /** ppt/media entries by sniffed format, e.g. { jpeg: 4, png: 2 }. */
  formatCounts: Record<string, number>;
  /** Package entries older PowerPoint cannot decode (must always be empty). */
  risky: string[];
  /** One row per sample image the deck referenced. */
  embeds: EmbedRow[];
  slides: number;
  problems: string[];
  error?: string;
};

// ---------------------------------------------------------------------------
// Sample bitmaps, drawn in-page so the deck never depends on network assets
// ---------------------------------------------------------------------------

function draw(size: number, alpha: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, `rgba(0,63,199,${alpha})`);
  grad.addColorStop(1, `rgba(161,251,249,${alpha})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** PNG with translucent pixels — must stay PNG under every option. */
function transparentPng(): string {
  const canvas = draw(240, 1);
  const ctx = canvas.getContext("2d")!;
  // Punch a hole so the alpha channel genuinely varies.
  ctx.clearRect(0, 0, 120, 120);
  return canvas.toDataURL("image/png");
}

/** Fully opaque photograph-like bitmap. */
function opaqueJpeg(): string {
  return draw(240, 1).toDataURL("image/jpeg", 0.92);
}

/** WebP source: legal input, never a legal embed for PowerPoint 2016 and older. */
function webpSource(): string | null {
  const url = draw(240, 1).toDataURL("image/webp", 0.9);
  return url.startsWith("data:image/webp") ? url : null;
}

/** Imagery-capable variants (see variant-media.ts) present in the taxonomy. */
function imageryVariantIds(count: number): string[] {
  const preferred = ["MV-IMG-FULL-BLEED", "MV-IMG-SPLIT", "MV-IMG-CAPTION", "MV-OP-COVER-MEDIA"];
  const known = new Set(MODULE_VARIANTS.map((v) => v.id));
  return preferred.filter((id) => known.has(id)).slice(0, count);
}

function sectionFor(familyId: string | undefined): string {
  return (
    SECTION_FRAMEWORKS.find((s) => s.permittedFamilyIds.includes(familyId ?? ""))?.id ?? "SF-01"
  );
}

async function runAudit(opts: {
  legacyImages: boolean;
  alphaImages: boolean;
}): Promise<FormatAudit> {
  const base: FormatAudit = {
    legacyImages: opts.legacyImages,
    alphaImages: opts.alphaImages,
    formatCounts: {},
    risky: [],
    embeds: [],
    slides: 0,
    problems: [],
  };
  try {
    writeExportLegacyImages(opts.legacyImages);
    writeExportAlphaImages(opts.alphaImages);

    const samples: Array<{ key: SampleKey; url: string }> = [
      { key: "transparent", url: transparentPng() },
      { key: "opaque", url: opaqueJpeg() },
    ];
    const webp = webpSource();
    if (webp) samples.push({ key: "webp", url: webp });
    else base.problems.push("browser cannot encode WebP — WebP coverage skipped");

    const brand = BRAND_MODES[0]!;
    const brief = resolveDivisionBrief(brand);
    const variantIds = imageryVariantIds(samples.length);
    if (variantIds.length < samples.length) {
      return { ...base, error: "not enough imagery-capable variants in the taxonomy" };
    }

    const { exportDeckToPptx } = await import("@/lib/pptx-export");
    const slides = samples.map((sample, i) => {
      const variantId = variantIds[i]!;
      const variant = MODULE_VARIANTS.find((v) => v.id === variantId)!;
      const content = seedDivisionContent(
        variantId,
        brief,
        "Image format verification",
        brand,
      ) as Record<string, unknown>;
      return {
        id: `slide-${sample.key}`,
        position: i,
        sectionId: sectionFor(variant.familyId),
        variantId,
        layoutId: variant.permittedLayoutIds[0],
        // The sample bitmap is the slide's photograph, so the exporter walks its
        // real imagery embed path for it.
        content: { ...content, mediaUrl: sample.url, mediaSeed: undefined },
        changes: [],
      };
    });

    const deck = {
      id: "image-format-verify",
      createdAt: new Date().toISOString(),
      title: "Image format verification",
      briefId: "image-format-verify",
      brandModeId: brand.id,
      archetypeId: "single-module",
      slides,
    } as unknown as Parameters<typeof exportDeckToPptx>[0];

    const res = await exportDeckToPptx(deck, brand, {
      output: "blob",
      forceMode: "light",
      fidelity: "layered",
    });
    if (res.failedSlides?.length) base.problems.push(`renderer failed: ${res.failedSlides.join(",")}`);
    if (!res.blob) return { ...base, error: "no blob returned" };

    const report = await buildImageCompatReport(res.blob);
    const bySource = new Map(samples.map((s) => [s.url, s.key] as const));
    return {
      ...base,
      slides: slides.length,
      formatCounts: report.formatCounts,
      risky: report.risky.map((e) => `${e.path} (${e.format})`),
      // Full ledger, not just the re-encoded subset: a pass-through embed is
      // just as much a format decision as a transcode.
      embeds: getImageEmbedLedger().map((r) => ({
        sample: (bySource.get(r.source ?? "") ?? "other") as SampleKey,
        sourceFormat: r.sourceFormat,
        embeddedFormat: r.embeddedFormat,
        transcoded: r.transcoded,
        transcodeFailed: r.transcodeFailed === true,
      })),
    };
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : String(e) };
  }
}

declare global {
  interface Window {
    __tpImageFormatVerify?: {
      run: (jobs: Array<{ legacyImages: boolean; alphaImages: boolean }>) => Promise<FormatAudit[]>;
    };
  }
}

function ImageFormatVerifyHarness() {
  const [ready, setReady] = useState(false);
  const [audits, setAudits] = useState<FormatAudit[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.__tpImageFormatVerify = {
      run: async (jobs) => {
        const out: FormatAudit[] = [];
        for (const job of jobs) out.push(await runAudit(job));
        return out;
      },
    };
    setReady(true);
    return () => {
      delete window.__tpImageFormatVerify;
    };
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-10 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight">Image format export harness</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {ready ? "Ready" : "Loading"} — exports a sample deck with transparent, opaque and WebP
        imagery and reports the formats that landed in the package. Driven headlessly via{" "}
        <code>window.__tpImageFormatVerify.run()</code>.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setAudits(
            await window.__tpImageFormatVerify!.run([
              { legacyImages: false, alphaImages: false },
              { legacyImages: true, alphaImages: false },
              { legacyImages: false, alphaImages: true },
            ]),
          );
          setBusy(false);
        }}
        className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {busy ? "Exporting…" : "Run all three options"}
      </button>
      <div className="mt-6 space-y-4 text-sm">
        {audits.map((a, i) => (
          <div key={i} className="rounded-lg border border-border p-4">
            <p className="font-medium">
              legacy: {String(a.legacyImages)} · alpha: {String(a.alphaImages)}
            </p>
            <p className="mt-1 text-muted-foreground">
              {Object.entries(a.formatCounts)
                .map(([k, v]) => `${k}×${v}`)
                .join(" · ") || "no media"}
            </p>
            {a.embeds.map((e, j) => (
              <p key={j} className="text-muted-foreground">
                {e.sample}: {e.sourceFormat} → {e.embeddedFormat}
                {e.transcoded ? " (re-encoded)" : ""}
              </p>
            ))}
            {a.error && <p className="text-destructive">{a.error}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}

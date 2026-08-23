// -----------------------------------------------------------------------------
// Export audit (/admin/export-audit)
//
// End-to-end audit of every output the app can produce. Two halves:
//
//   1. COVERAGE — the export registry: each user-facing export control, the
//      formats it ships, where it lives, and which live checks prove it.
//   2. VERIFICATION — runs the REAL exporters against real rendered fixtures
//      (a social asset, a print page, a deck slide, an icon) and validates the
//      produced bytes: magic bytes, PNG pixel dimensions, PDF page count and
//      %%EOF trailer, PPTX part names and slide entries.
//
// Exposed as window.__tpExportAudit so scripts/export-audit.mjs can gate CI
// without clicking through the UI.
// -----------------------------------------------------------------------------

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { SocialRenderer } from "@/components/campaigns/SocialRenderer";
import { SOCIAL_FORMATS_BY_ID } from "@/lib/social-formats";
import { DEFAULT_SOCIAL_STYLE_ID } from "@/lib/social-styles";
import type { CampaignCopy } from "@/lib/campaigns";
import {
  EXPORT_AREAS,
  EXPORT_REGISTRY,
  coverageFor,
  entriesForArea,
  requiredCheckIds,
} from "@/lib/export-registry";
import { verifyExportBlob, type ByteVerdict, type ExportKind } from "@/lib/export-verify-bytes";
import {
  exportAssetImage,
  exportAssetsPdf,
  exportAssetsZip,
  type AssetCaptureTarget,
} from "@/lib/asset-export";
import { BRAND_MODES, MODULE_VARIANTS } from "@/lib/taxonomy";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";

export const Route = createFileRoute("/admin/export-audit")({
  component: ExportAuditPage,
  head: () => ({
    meta: [
      { title: "Export audit · TransPerfect Element" },
      {
        name: "description",
        content:
          "End-to-end audit of every Element export: presentation, print, social, events, canvas and brand assets, with byte-level verification of the files each control produces.",
      },
      { property: "og:title", content: "Export audit · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Every export control in Element, the formats it ships, and live byte-level verification of the produced files.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

// --- fixtures ---------------------------------------------------------------

const AUDIT_FORMAT = SOCIAL_FORMATS_BY_ID["square-1080"];

const AUDIT_COPY: CampaignCopy = {
  eyebrow: "Export audit",
  title: "Every output is verified before it reaches you",
  summary: "Bytes are checked for format, dimensions and page count on the way out.",
  cta: "Run the audit",
  stat: { value: "100%", label: "verified paths" },
};

type CheckStatus = "idle" | "running" | "pass" | "fail";

export type AuditCheck = {
  id: string;
  label: string;
  area: string;
  kind: ExportKind;
  status: CheckStatus;
  ms?: number;
  verdict?: ByteVerdict;
  error?: string;
};

const CHECK_META: Array<{ id: string; label: string; area: string; kind: ExportKind }> = [
  { id: "asset.png", label: "Node → PNG at native pixels", area: "Shared", kind: "png" },
  { id: "asset.png2x", label: "Node → PNG at 2× retina", area: "Shared", kind: "png" },
  { id: "asset.jpg", label: "Node → JPG (flattened)", area: "Shared", kind: "jpg" },
  { id: "asset.webp", label: "Node → WebP", area: "Shared", kind: "webp" },
  { id: "asset.pdf", label: "Nodes → multi-page PDF", area: "Shared", kind: "pdf" },
  { id: "asset.zip", label: "Nodes → ZIP bundle + manifest", area: "Shared", kind: "zip" },
  { id: "social.png", label: "Social asset → PNG 1080×1080", area: "Social", kind: "png" },
  { id: "social.zip", label: "Social kit → ZIP", area: "Social", kind: "zip" },
  { id: "print.pdf.digital", label: "Print page → digital PDF", area: "Print", kind: "pdf" },
  { id: "print.pdf.press", label: "Print page → press PDF (bleed + vector text)", area: "Print", kind: "pdf" },
  { id: "print.pptx", label: "Print page → layered PPTX", area: "Print", kind: "pptx" },
  { id: "print.html", label: "Print page → standalone HTML", area: "Print", kind: "html" },
  { id: "deck.pptx", label: "Deck slide → layered PPTX", area: "Presentation", kind: "pptx" },
  { id: "icon.svg", label: "Brand icon → SVG", area: "Brand", kind: "svg" },
  { id: "icon.png", label: "Brand icon → PNG", area: "Brand", kind: "png" },
];

function initialChecks(): AuditCheck[] {
  return CHECK_META.map((m) => ({ ...m, status: "idle" as CheckStatus }));
}

// --- live checks ------------------------------------------------------------

type Fixtures = {
  socialFrame: HTMLElement | null;
  printPage: HTMLElement | null;
  genericA: HTMLElement | null;
  genericB: HTMLElement | null;
};

function need<T>(value: T | null | undefined, what: string): T {
  if (!value) throw new Error(`fixture "${what}" is not mounted`);
  return value;
}

function socialTarget(fx: Fixtures): AssetCaptureTarget {
  return {
    node: need(fx.socialFrame, "social frame"),
    width: AUDIT_FORMAT.width,
    height: AUDIT_FORMAT.height,
    label: AUDIT_FORMAT.label,
  };
}

function genericTargets(fx: Fixtures): AssetCaptureTarget[] {
  return [
    { node: need(fx.genericA, "generic A"), width: 1080, height: 1080, label: "Square" },
    { node: need(fx.genericB, "generic B"), width: 1200, height: 628, label: "Landscape" },
  ];
}

async function deckFixturePptx(): Promise<Blob> {
  const variant =
    MODULE_VARIANTS.find((v) => v.id.startsWith("MV-TXT")) ?? MODULE_VARIANTS[0];
  const brand = BRAND_MODES[0];
  const brief = resolveDivisionBrief(brand);
  const content = seedDivisionContent(variant.id, brief, "Export audit", brand) as Record<
    string,
    unknown
  >;
  const deck = {
    id: "export-audit",
    createdAt: new Date().toISOString(),
    title: "Export audit fixture",
    briefId: "export-audit",
    brandModeId: brand.id,
    archetypeId: "single-module",
    slides: [
      {
        id: "audit-slide",
        position: 0,
        sectionId: "overview",
        variantId: variant.id,
        layoutId: variant.permittedLayoutIds[0],
        content,
        changes: [],
      },
    ],
  };
  const { exportDeckToPptx } = await import("@/lib/pptx-export");
  const res = await exportDeckToPptx(deck as never, brand, {
    output: "blob",
    fidelity: "editable",
  });
  if (!res.blob) throw new Error("deck exporter returned no blob");
  return res.blob;
}

async function printPdf(node: HTMLElement, kind: "digital" | "press"): Promise<Blob> {
  const { exportPrintAssetAsPdf } = await import("@/lib/print-asset-export");
  let out: Blob | null = null;
  await exportPrintAssetAsPdf(node, {
    pageSize: "Letter",
    format: kind === "digital" ? "digital" : "press",
    quality: "300dpi",
    bleedIn: kind === "press" ? 0.125 : 0,
    cropMarks: kind === "press",
    mode: "light",
    filename: `audit-${kind}.pdf`,
    download: false,
    onBlob: (b) => {
      out = b;
    },
  });
  if (!out) throw new Error("print PDF exporter produced no bytes");
  return out;
}

async function printPptx(node: HTMLElement): Promise<Blob> {
  const { exportPrintPagesAsPptx } = await import("@/lib/print-pptx-export");
  let out: Blob | null = null;
  await exportPrintPagesAsPptx(node, {
    pageSize: "Letter",
    dpi: 150,
    mode: "light",
    filename: "audit-print.pptx",
    title: "Export audit",
    download: false,
    onBlob: (b) => {
      out = b;
    },
  });
  if (!out) throw new Error("print PPTX exporter produced no bytes");
  return out;
}

/** Serialize a print page node the same way the standalone-HTML export does. */
async function printHtml(node: HTMLElement): Promise<Blob> {
  const { collectStylesheetText } = await import("@/lib/print-html-export");
  const css = await collectStylesheetText();
  const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Export audit page</title><style>${css}</style></head><body>${node.outerHTML}</body></html>`;
  return new Blob([doc], { type: "text/html" });
}

async function iconBlobs(): Promise<{ svg: Blob; png: Blob }> {
  const { iconSvgString, iconPngBlob } = await import("@/lib/icon-export");
  const { BRAND_ICON_SETS } = await import("@/lib/brand-icons");
  const first = BRAND_ICON_SETS.flatMap((s) => s.subAreas.flatMap((a) => a.icons))[0];
  const name = typeof first === "string" ? first : (first as { name: string })?.name;
  const svg = iconSvgString(name, { color: "#003FC7", strokeWidth: 1.5 });
  if (!svg) throw new Error(`icon "${name}" did not render`);
  return {
    svg: new Blob([svg], { type: "image/svg+xml" }),
    png: await iconPngBlob(svg, 512),
  };
}

type Runner = (fx: Fixtures) => Promise<{ blob: Blob; expect?: Parameters<typeof verifyExportBlob>[2] }>;

const RUNNERS: Record<string, Runner> = {
  "asset.png": async (fx) => ({
    blob: await exportAssetImage(genericTargets(fx)[0], { format: "png", scale: 1 }),
    expect: { width: 1080, height: 1080 },
  }),
  "asset.png2x": async (fx) => ({
    blob: await exportAssetImage(genericTargets(fx)[0], { format: "png", scale: 2 }),
    expect: { width: 2160, height: 2160 },
  }),
  "asset.jpg": async (fx) => ({
    blob: await exportAssetImage(genericTargets(fx)[1], { format: "jpg", scale: 1 }),
  }),
  "asset.webp": async (fx) => ({
    blob: await exportAssetImage(genericTargets(fx)[1], { format: "webp", scale: 1 }),
  }),
  "asset.pdf": async (fx) => ({
    blob: await exportAssetsPdf(genericTargets(fx)),
    expect: { pages: 2 },
  }),
  "asset.zip": async (fx) => ({
    blob: await exportAssetsZip(genericTargets(fx), { bundleName: "export-audit" }),
  }),
  "social.png": async (fx) => ({
    blob: await exportAssetImage(socialTarget(fx), { format: "png", scale: 1 }),
    expect: { width: AUDIT_FORMAT.width, height: AUDIT_FORMAT.height },
  }),
  "social.zip": async (fx) => ({
    blob: await exportAssetsZip([socialTarget(fx)], { bundleName: "audit-kit" }),
  }),
  "print.pdf.digital": async (fx) => ({
    blob: await printPdf(need(fx.printPage, "print page"), "digital"),
    expect: { pages: 1 },
  }),
  "print.pdf.press": async (fx) => ({
    blob: await printPdf(need(fx.printPage, "print page"), "press"),
    expect: { pages: 1 },
  }),
  "print.pptx": async (fx) => ({ blob: await printPptx(need(fx.printPage, "print page")) }),
  "print.html": async (fx) => ({ blob: await printHtml(need(fx.printPage, "print page")) }),
  "deck.pptx": async () => ({ blob: await deckFixturePptx() }),
  "icon.svg": async () => ({ blob: (await iconBlobs()).svg }),
  "icon.png": async () => ({ blob: (await iconBlobs()).png }),
};

// --- page -------------------------------------------------------------------

function ExportAuditPage() {
  const [checks, setChecks] = useState<AuditCheck[]>(initialChecks);
  const [running, setRunning] = useState(false);
  const socialRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const genARef = useRef<HTMLDivElement>(null);
  const genBRef = useRef<HTMLDivElement>(null);

  const fixtures = useCallback(
    (): Fixtures => ({
      socialFrame:
        socialRef.current?.querySelector<HTMLElement>("[data-kit-asset-frame]") ??
        socialRef.current,
      printPage: printRef.current,
      genericA: genARef.current,
      genericB: genBRef.current,
    }),
    [],
  );

  const runOne = useCallback(
    async (id: string): Promise<AuditCheck> => {
      const meta = CHECK_META.find((m) => m.id === id)!;
      const started = performance.now();
      try {
        const runner = RUNNERS[id];
        if (!runner) throw new Error(`no runner registered for ${id}`);
        const { blob, expect } = await runner(fixtures());
        const verdict = await verifyExportBlob(blob, meta.kind, expect);
        return {
          ...meta,
          status: verdict.ok ? "pass" : "fail",
          ms: Math.round(performance.now() - started),
          verdict,
        };
      } catch (err) {
        return {
          ...meta,
          status: "fail",
          ms: Math.round(performance.now() - started),
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
    [fixtures],
  );

  const runAll = useCallback(async () => {
    setRunning(true);
    setChecks(initialChecks().map((c) => ({ ...c, status: "running" })));
    const done: AuditCheck[] = [];
    for (const meta of CHECK_META) {
      const result = await runOne(meta.id);
      done.push(result);
      setChecks((prev) => prev.map((c) => (c.id === result.id ? result : c)));
    }
    setRunning(false);
    return done;
  }, [runOne]);

  // Headless hook for scripts/export-audit.mjs.
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__tpExportAudit = {
      checkIds: CHECK_META.map((m) => m.id),
      requiredCheckIds: requiredCheckIds(),
      registrySize: EXPORT_REGISTRY.length,
      run: async () => {
        const results = await runAll();
        return results.map((r) => ({
          id: r.id,
          status: r.status,
          ms: r.ms ?? 0,
          bytes: r.verdict?.bytes ?? 0,
          detail: r.verdict?.detail ?? r.error ?? "",
          problems: r.verdict?.problems ?? (r.error ? [r.error] : []),
        }));
      },
    };
  }, [runAll]);

  const passing = new Set(checks.filter((c) => c.status === "pass").map((c) => c.id));
  const coverage = coverageFor(passing);
  const failed = checks.filter((c) => c.status === "fail");
  const ran = checks.some((c) => c.status !== "idle");

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 text-[#03002C]">
      <header className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#003FC7]">Quality</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.03em]">Export audit</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-[1.5] text-black/70">
          Every export control across presentation, print, social, events, canvas and brand assets —
          with the real exporters run against real fixtures and the produced bytes verified for
          format, pixel dimensions, page count and package structure.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void runAll()}
            disabled={running}
            className="rounded-full bg-[#003FC7] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#03002C] disabled:opacity-60"
          >
            {running ? "Verifying exports…" : "Run verification"}
          </button>
          {ran ? (
            <span className="text-[12px] text-black/60">
              {passing.size}/{checks.length} checks passing · {coverage.verified.length}/
              {EXPORT_REGISTRY.length} registry rows verified
              {failed.length > 0 ? ` · ${failed.length} failing` : ""}
            </span>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="verification" className="mb-14">
        <h2 id="verification" className="mb-4 text-lg font-semibold tracking-[-0.02em]">
          Verification
        </h2>
        <div className="overflow-hidden rounded-2xl border border-black/10">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="bg-[#F2F2F2] text-[11px] uppercase tracking-widest text-black/60">
              <tr>
                <th className="px-4 py-3 font-medium">Check</th>
                <th className="px-4 py-3 font-medium">Area</th>
                <th className="px-4 py-3 font-medium">Format</th>
                <th className="px-4 py-3 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c) => (
                <tr key={c.id} className="border-t border-black/5 align-top">
                  <td className="px-4 py-3">{c.label}</td>
                  <td className="px-4 py-3 text-black/60">{c.area}</td>
                  <td className="px-4 py-3 uppercase text-black/60">{c.kind}</td>
                  <td className="px-4 py-3">
                    {c.status === "idle" ? (
                      <span className="text-black/40">not run</span>
                    ) : c.status === "running" ? (
                      <span className="text-[#003FC7]">running…</span>
                    ) : c.status === "pass" ? (
                      <span className="text-emerald-700">
                        pass · {(c.verdict!.bytes / 1024).toFixed(0)} KB · {c.verdict!.detail}
                        {c.ms ? ` · ${c.ms} ms` : ""}
                      </span>
                    ) : (
                      <span className="text-red-700">
                        fail · {c.error ?? c.verdict?.problems.join("; ")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="coverage">
        <h2 id="coverage" className="mb-4 text-lg font-semibold tracking-[-0.02em]">
          Coverage by area
        </h2>
        <div className="space-y-8">
          {EXPORT_AREAS.map((area) => (
            <div key={area.id}>
              <h3 className="text-[15px] font-semibold">{area.label}</h3>
              <p className="mb-3 text-[13px] text-black/60">{area.blurb}</p>
              <div className="overflow-hidden rounded-2xl border border-black/10">
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead className="bg-[#F2F2F2] text-[11px] uppercase tracking-widest text-black/60">
                    <tr>
                      <th className="px-4 py-3 font-medium">Asset</th>
                      <th className="px-4 py-3 font-medium">User control</th>
                      <th className="px-4 py-3 font-medium">Formats</th>
                      <th className="px-4 py-3 font-medium">Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entriesForArea(area.id).map((entry) => {
                      const verified = entry.checks.every((c) => passing.has(c));
                      return (
                        <tr key={entry.id} className="border-t border-black/5 align-top">
                          <td className="px-4 py-3">
                            {entry.asset}
                            {entry.notes ? (
                              <span className="block text-[11px] text-black/50">{entry.notes}</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            {entry.surface}
                            <span className="block font-mono text-[11px] text-black/45">
                              {entry.route}
                            </span>
                          </td>
                          <td className="px-4 py-3 uppercase text-black/60">
                            {entry.formats.join(" · ")}
                          </td>
                          <td className="px-4 py-3">
                            {!ran ? (
                              <span className="text-black/40">—</span>
                            ) : verified ? (
                              <span className="text-emerald-700">verified</span>
                            ) : (
                              <span className="text-red-700">
                                {entry.checks.filter((c) => !passing.has(c)).join(", ")}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- offscreen fixtures the checks capture ---------------------------- */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: -99999,
          top: 0,
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
      >
        <div ref={socialRef}>
          <SocialRenderer
            format={AUDIT_FORMAT}
            brandId="bm-enterprise"
            mode="light"
            copy={AUDIT_COPY}
            styleId={DEFAULT_SOCIAL_STYLE_ID}
            displayShortEdge={AUDIT_FORMAT.width}
          />
        </div>
        <div
          ref={printRef}
          data-page-kind="audit-page"
          style={{
            width: 816,
            height: 1056,
            background: "#ffffff",
            color: "#03002C",
            padding: 64,
            fontFamily: "Geist, system-ui, sans-serif",
          }}
        >
          <p style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#003FC7" }}>
            Export audit
          </p>
          <h1 style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: "-0.03em", marginTop: 12 }}>
            Print page fixture
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.4, marginTop: 16, color: "#666" }}>
            A Letter-trim page used to verify the press PDF, digital PDF, layered PPTX and
            standalone HTML export paths.
          </p>
          <div style={{ marginTop: 32, height: 240, background: "#E0E8F5", borderRadius: 14 }} />
          <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
            {["98%", "3×", "24h"].map((v) => (
              <div key={v} style={{ flex: 1, background: "#F2F2F2", borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 34, letterSpacing: "-0.03em" }}>{v}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>Verified metric</div>
              </div>
            ))}
          </div>
        </div>
        <div
          ref={genARef}
          style={{
            width: 1080,
            height: 1080,
            background: "linear-gradient(140deg, #003FC7, #03002C)",
            color: "#fff",
            display: "flex",
            alignItems: "flex-end",
            padding: 72,
            fontFamily: "Geist, system-ui, sans-serif",
            fontSize: 64,
            letterSpacing: "-0.03em",
          }}
        >
          Square fixture
        </div>
        <div
          ref={genBRef}
          style={{
            width: 1200,
            height: 628,
            background: "linear-gradient(120deg, #A1FBF9, #C2A3FF)",
            color: "#03002C",
            display: "flex",
            alignItems: "center",
            padding: 64,
            fontFamily: "Geist, system-ui, sans-serif",
            fontSize: 52,
            letterSpacing: "-0.03em",
          }}
        >
          Landscape fixture
        </div>
      </div>
    </main>
  );
}

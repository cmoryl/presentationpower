import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDeckStore } from "@/lib/deck-store";
import { useDeckHydrated, DeckHydratingFallback } from "@/hooks/use-deck-hydrated";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { SlideMediaRefreshProvider } from "@/lib/slide-media-refresh";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import { resolveBrandMode } from "@/lib/brand-profiles";

import { runQa, blockingIssues, warningIssues } from "@/lib/qa";
import { runExportPreflight, type PreflightIssue } from "@/lib/export-preflight";
import { ExportPreflightModal } from "@/components/ExportPreflightModal";
import {
  getGlobalLinkShareStatus,
  getGlobalLinkShareSettings,
  uploadToGlobalLinkShare,
} from "@/lib/globallink-share.functions";
import { trackNow } from "@/lib/analytics-track";

export const Route = createFileRoute("/decks/$deckId/export")({
  head: () => ({ meta: [{ title: "Export · TransPerfect Modular" }] }),
  component: ExportGate,
});

function ExportGate() {
  const { deckId } = Route.useParams();
  const hydrated = useDeckHydrated();
  const hasDeck = useDeckStore((s) => Boolean(s.decks[deckId]));
  if (!hydrated) return <DeckHydratingFallback label="Loading export…" />;
  if (!hasDeck) throw notFound();
  return <ExportView />;
}

function ExportView() {
  const { deckId } = Route.useParams();
  const deck = useDeckStore((s) => s.decks[deckId]);
  const brief = useDeckStore((s) => (deck ? s.briefs[deck.briefId] : undefined));
  const [exporting, setExporting] = useState(false);
  const [override, setOverride] = useState(false);
  const [preflightIssues, setPreflightIssues] = useState<PreflightIssue[] | null>(null);
  const [preflightBusy, setPreflightBusy] = useState(false);
  const [glShareConfigured, setGlShareConfigured] = useState(false);
  const [glAutoShare, setGlAutoShare] = useState(false);
  const [glShareBusy, setGlShareBusy] = useState(false);
  const [glShareUrl, setGlShareUrl] = useState<string | null>(null);
  const [glShareError, setGlShareError] = useState<string | null>(null);
  const [glCopied, setGlCopied] = useState(false);
  const lastBlobRef = useRef<{ blob: Blob; fileName: string } | null>(null);
  const statusFn = useServerFn(getGlobalLinkShareStatus);
  const settingsFn = useServerFn(getGlobalLinkShareSettings);
  const uploadFn = useServerFn(uploadToGlobalLinkShare);
  if (!deck) throw notFound();
  const brand = resolveBrandMode(deck.brandModeId, deck.subCompany);

  const qa = useMemo(() => runQa(deck.slides, deck.brandModeId), [deck.slides, deck.brandModeId]);
  const blocks = blockingIssues(qa);
  const warns = warningIssues(qa);
  const blocked = blocks.length > 0 && !override;

  useEffect(() => {
    document.body.classList.add("export-mode");
    return () => document.body.classList.remove("export-mode");
  }, []);

  // Load status in the background — never block the export UI on it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await statusFn();
        if (cancelled) return;
        setGlShareConfigured(!!s?.configured);
        if (s?.configured) {
          try {
            const cfg = await settingsFn();
            if (!cancelled) setGlAutoShare(!!cfg?.autoShareOnExport);
          } catch {
            /* settings require auth — silent fallback */
          }
        }
      } catch {
        /* silent — default to Tier 1 handoff */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statusFn, settingsFn]);

  function openShareHandoff() {
    window.open("https://share.transperfect.com", "_blank", "noopener,noreferrer");
  }

  async function runPptxExport() {
    setExporting(true);
    try {
      const { exportDeckToPptx } = await import("@/lib/pptx-export");
      const { blob, failedSlides } = await exportDeckToPptx(deck, brand, { output: "blob" });
      if (!blob) throw new Error("Export produced no blob");
      if (failedSlides.length) {
        console.warn(`[pptx-export] ${failedSlides.length} slide(s) skipped:`, failedSlides);
      }
      const fileName = `${deck.title.replace(/[^a-z0-9-_]+/gi, "-")}.pptx`;
      lastBlobRef.current = { blob, fileName };
      // Trigger download for the user.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      trackNow({
        event: "deck.export",
        category: "export",
        divisionId: deck.brandModeId,
        deckId: deck.id,
        value: deck.slides.length,
        props: { format: "pptx", failedSlides: failedSlides.length },
      });
    } finally {
      setExporting(false);
      setPreflightIssues(null);
    }
    // Auto-share after the local download succeeds — non-blocking, best-effort.
    if (glShareConfigured && glAutoShare && !glShareBusy) {
      void handleShareViaGlobalLink();
    }
  }

  async function handlePptx() {
    if (blocked || exporting || preflightBusy) return;
    setPreflightBusy(true);
    try {
      const issues = await runExportPreflight(deck);
      if (issues.length === 0) {
        await runPptxExport();
      } else {
        setPreflightIssues(issues);
      }
    } finally {
      setPreflightBusy(false);
    }
  }

  async function blobToBase64(blob: Blob): Promise<string> {
    const buf = await blob.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunk)) as unknown as number[],
      );
    }
    return btoa(binary);
  }

  async function handleShareViaGlobalLink() {
    if (blocked || glShareBusy) return;
    setGlShareBusy(true);
    setGlShareError(null);
    setGlShareUrl(null);
    setGlCopied(false);
    try {
      let held = lastBlobRef.current;
      if (!held) {
        const { exportDeckToPptx } = await import("@/lib/pptx-export");
        const { blob } = await exportDeckToPptx(deck, brand, { output: "blob" });
        if (!blob) throw new Error("Export produced no blob");
        held = { blob, fileName: `${deck.title.replace(/[^a-z0-9-_]+/gi, "-")}.pptx` };
        lastBlobRef.current = held;
      }
      if (held.blob.size > 90 * 1024 * 1024) {
        setGlShareError("File exceeds the 90MB GlobalLink Share limit — use the manual handoff.");
        return;
      }
      const contentBase64 = await blobToBase64(held.blob);
      const result = await uploadFn({
        data: {
          fileName: held.fileName,
          contentBase64,
          mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          deckId,
          deckTitle: deck.title,
        },
      });
      if (result.ok) {
        setGlShareUrl(result.shareUrl);
      } else {
        setGlShareError(result.message);
      }
    } catch (e) {
      setGlShareError((e as Error).message);
    } finally {
      setGlShareBusy(false);
    }
  }

  async function copyShareUrl() {
    if (!glShareUrl) return;
    try {
      await navigator.clipboard.writeText(glShareUrl);
      setGlCopied(true);
      setTimeout(() => setGlCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <SlideMediaRefreshProvider slides={deck.slides}>
      <div className="min-h-screen bg-neutral-100 py-12 print:bg-white print:py-0">
        <style>{`
        @media print {
          @page { size: 1920px 1080px; margin: 0; }
          .no-print { display: none !important; }
          .print-page { break-after: page; page-break-after: always; }
          .print-page, .print-page * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        }
      `}</style>

        <div className="no-print mx-auto mb-8 flex max-w-[1200px] items-center justify-between gap-6 px-6">
          <div>
            <Link
              to="/decks/$deckId"
              params={{ deckId }}
              className="text-xs uppercase tracking-widest text-black/50 hover:text-black"
            >
              ← Back to editor
            </Link>
            <h1 className="mt-2 text-2xl font-semibold">Export · {deck.title}</h1>
            <p className="mt-1 text-sm text-black/60">
              Download a native PowerPoint file, or use your browser's print dialog to save as PDF.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePptx}
              disabled={exporting || preflightBusy || blocked}
              title={blocked ? "Resolve blocking QA issues first" : ""}
              className="rounded-full bg-[#0B2A4A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0B2A4A]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? "Preparing…" : preflightBusy ? "Checking…" : "Download .pptx"}
            </button>
            <Link
              to="/decks/$deckId/document"
              params={{ deckId }}
              className="rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-medium text-black hover:border-black/30"
            >
              As document…
            </Link>
            <button
              onClick={() => !blocked && window.print()}
              disabled={blocked}
              className="rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-medium text-black hover:border-black/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Print / Save PDF
            </button>
            {glShareConfigured ? (
              <button
                onClick={handleShareViaGlobalLink}
                disabled={glShareBusy || blocked}
                title={
                  blocked
                    ? "Resolve blocking QA issues first"
                    : "Upload the .pptx directly to GlobalLink Share"
                }
                className="rounded-full bg-[#E11D48] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#be1740] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {glShareBusy ? "Uploading…" : "Share via GlobalLink"}
              </button>
            ) : (
              <button
                onClick={openShareHandoff}
                title="Direct upload available once GlobalLink Share API credentials are added in Settings → Secrets."
                className="rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-medium text-black hover:border-black/30"
              >
                Send via GlobalLink Share ↗
              </button>
            )}
          </div>
        </div>

        {/* GlobalLink Share result / handoff note */}
        <div className="no-print mx-auto mb-6 max-w-[1200px] px-6">
          {glShareUrl ? (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-widest text-emerald-900">
                  Uploaded to GlobalLink Share
                </div>
                <a
                  href={glShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block truncate text-sm text-emerald-900 underline"
                >
                  {glShareUrl}
                </a>
              </div>
              <button
                onClick={copyShareUrl}
                className="shrink-0 rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-medium text-emerald-900 hover:border-emerald-500"
              >
                {glCopied ? "Copied ✓" : "Copy link"}
              </button>
            </div>
          ) : glShareError ? (
            <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
              {glShareError}
            </div>
          ) : !glShareConfigured ? (
            <p className="text-xs text-black/50">
              After downloading, your exported file will be in your Downloads folder — drag it into
              GlobalLink Share to send it securely (SSO-gated).
            </p>
          ) : null}
        </div>

        {(blocks.length > 0 || warns.length > 0) && (
          <div className="no-print mx-auto mb-8 max-w-[1200px] px-6">
            {blocks.length > 0 && (
              <div className="rounded-2xl border border-red-300 bg-red-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-red-900">
                      {blocks.length} blocking QA {blocks.length === 1 ? "issue" : "issues"} —
                      export disabled
                    </div>
                    <div className="mt-1 text-sm text-red-900/80">
                      Resolve these in the editor, or override for internal drafts only.
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-red-900">
                    <input
                      type="checkbox"
                      checked={override}
                      onChange={(e) => setOverride(e.target.checked)}
                    />
                    Override (internal draft)
                  </label>
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {blocks.map((issue, k) => {
                    const idx = deck.slides.findIndex((sl) => sl.id === issue.slideId);
                    return (
                      <li key={k} className="text-red-900/90">
                        <span className="font-mono text-xs text-red-900/60">Slide {idx + 1}</span> ·{" "}
                        {issue.message}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {warns.length > 0 && (
              <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-amber-900">
                  {warns.length} {warns.length === 1 ? "warning" : "warnings"} — non-blocking
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {warns.map((issue, k) => {
                    const idx = deck.slides.findIndex((sl) => sl.id === issue.slideId);
                    return (
                      <li key={k} className="text-amber-900/90">
                        <span className="font-mono text-xs text-amber-900/60">Slide {idx + 1}</span>{" "}
                        · {issue.message}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-6 px-6 print:max-w-none print:gap-0 print:p-0">
          {deck.slides.map((slide, i) => {
            const variant = byId(MODULE_VARIANTS, slide.variantId);
            if (!variant) return null;
            return (
              <div
                key={slide.id}
                className="print-page w-full overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none"
              >
                <div className="aspect-[16/9] w-full">
                  <ScaledSlide>
                    <VariantRenderer
                      slide={slide}
                      variant={variant}
                      brand={brand}
                      pageNumber={i + 1}
                      clientName={brief?.prospect}
                      subCompany={deck.subCompany}
                      logoOrientation={deck.context?.logoOrientation}
                    />
                  </ScaledSlide>
                </div>
              </div>
            );
          })}
        </div>
        <ExportPreflightModal
          open={preflightIssues !== null && preflightIssues.length > 0}
          issues={preflightIssues ?? []}
          busy={exporting}
          onCancel={() => setPreflightIssues(null)}
          onExportAnyway={runPptxExport}
        />
      </div>
    </SlideMediaRefreshProvider>
  );
}

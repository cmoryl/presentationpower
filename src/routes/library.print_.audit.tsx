// PRINT MODULE FIT AUDIT
// ---------------------------------------------------------------------------
// Renders every print section module at true page width, measures it, and
// reports the modules that structurally cannot fit (or read) on a single sheet.
// Every verdict comes from the live DOM — no capacity estimates — and each row
// links straight into the module editor so the correction can be made once, at
// the source, rather than per asset.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { LibrarySubnav } from "@/components/LibrarySubnav";
import { PrintSectionPreviewFrame } from "@/components/print/sections/PrintSectionPreviewFrame";
import {
  PRINT_SECTION_MODULES,
  printModuleFamilyRank,
  type PrintSectionModule,
} from "@/lib/print-library/section-modules";
import {
  auditPrintModule,
  measurePrintModuleBox,
  type PrintModuleMetrics,
  type PrintModuleVerdict,
} from "@/lib/print-fit-audit";
import { pageHeightPx, pageTopMarginPx } from "@/lib/print-page-presets";
import type { PrintPageSize, PrintSection } from "@/lib/print-assets.types";

export const Route = createFileRoute("/library/print_/audit")({
  component: PrintModuleAuditPage,
  head: () => ({
    meta: [
      { title: "Print module fit audit · TransPerfect Element" },
      {
        name: "description",
        content:
          "Measured fit audit of every print section module: page fill, smallest type size, margin breaches, and the correction each module needs.",
      },
      { property: "og:title", content: "Print module fit audit · TransPerfect Element" },
      {
        property: "og:description",
        content:
          "Live measurements for every print section module, with ranked corrections for oversized or under-legible sections.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const SEV_BADGE: Record<PrintModuleVerdict["severity"], string> = {
  critical: "bg-[#E53D2E] text-white",
  warning: "bg-[#FFEB66] text-[#03002C]",
  ok: "bg-[#A6FA87] text-[#03002C]",
};

type Result = { module: PrintSectionModule; metrics: PrintModuleMetrics; verdict: PrintModuleVerdict };

function AuditRow({
  module,
  section,
  pageSize,
  pageContentH,
  runKey,
  onResult,
}: {
  module: PrintSectionModule;
  section: PrintSection;
  pageSize: PrintPageSize;
  pageContentH: number;
  runKey: number;
  onResult: (r: Result) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [verdict, setVerdict] = useState<PrintModuleVerdict | null>(null);
  const [metrics, setMetrics] = useState<PrintModuleMetrics | null>(null);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      const host = ref.current?.querySelector<HTMLElement>("[container-type], div");
      const target = ref.current?.firstElementChild as HTMLElement | null;
      const m = measurePrintModuleBox(target ?? host ?? ref.current, pageContentH);
      if (!m) return;
      const v = auditPrintModule(m);
      setMetrics(m);
      setVerdict(v);
      onResult({ module, metrics: m, verdict: v });
    };
    // One pass after layout + fonts; measurement is deliberately not observed
    // continuously here so the grid never enters a measure/render loop.
    t = setTimeout(run, 260);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready?.then(() => setTimeout(run, 60)).catch(() => {});
    return () => {
      if (t) clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageContentH, runKey]);

  return (
    <div className="grid gap-4 rounded-2xl border border-black/10 bg-white p-4 md:grid-cols-[minmax(0,340px)_1fr]">
      <div ref={ref} className="overflow-hidden rounded-lg border border-black/10">
        <PrintSectionPreviewFrame section={section} pageSize={pageSize} sheet mode="light" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              verdict ? SEV_BADGE[verdict.severity] : "bg-black/10 text-black/60"
            }`}
          >
            {verdict ? verdict.severity : "measuring"}
          </span>
          <h2 className="text-sm font-semibold text-[#03002C]">{module.label}</h2>
          <span className="font-mono text-[10px] text-black/40">{module.id}</span>
        </div>
        <p className="mt-1 text-xs leading-[1.5] text-black/60">{module.description}</p>

        {verdict && metrics && (
          <>
            <p className="mt-3 text-xs font-medium text-[#03002C]">{verdict.headline}</p>
            <dl className="mt-2 grid max-w-md grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              {[
                ["Module height", `${metrics.heightPx}px`],
                ["Usable page", `${Math.round(metrics.pageContentH)}px`],
                ["Page fill", `${Math.round(metrics.fill * 100)}%`],
                ["Smallest type", metrics.minFontPx ? `${metrics.minFontPx}px` : "—"],
                ["Margin breaches", String(metrics.breaches)],
                ["Suggested scale", `${Math.round(verdict.suggestedScale * 100)}%`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-2">
                  <dt className="text-black/50">{k}</dt>
                  <dd className="font-mono text-[#03002C]">{v}</dd>
                </div>
              ))}
            </dl>
            {verdict.notes.length > 0 && (
              <ul className="mt-2 space-y-1 text-[11px] leading-[1.45] text-black/65">
                {verdict.notes.map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/admin/modules"
                className="rounded-full bg-[#003FC7] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#03002C]"
              >
                Correct in module editor
              </Link>
              <Link
                to="/library/print/modules"
                className="rounded-full border border-black/15 px-3 py-1.5 text-[11px] font-medium text-[#03002C] hover:border-black/40"
              >
                Open in library
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PrintModuleAuditPage() {
  const [pageSize, setPageSize] = useState<PrintPageSize>("Letter");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [results, setResults] = useState<Record<string, Result>>({});

  const pageContentH = useMemo(
    () => pageHeightPx(pageSize) - pageTopMarginPx(pageSize, "standard", "standard") * 2,
    [pageSize],
  );

  // Section instances are built once per page format so the measured boxes are
  // stable between renders.
  const rows = useMemo(
    () =>
      [...PRINT_SECTION_MODULES]
        .sort(
          (a, b) =>
            printModuleFamilyRank(a.family) - printModuleFamilyRank(b.family) ||
            a.label.localeCompare(b.label),
        )
        .map((module) => ({ module, section: module.make() })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runKey],
  );

  const tally = useMemo(() => {
    const list = Object.values(results);
    return {
      measured: list.length,
      critical: list.filter((r) => r.verdict.severity === "critical").length,
      warning: list.filter((r) => r.verdict.severity === "warning").length,
    };
  }, [results]);

  const visible = onlyIssues
    ? rows.filter(({ module }) => {
        const r = results[module.id];
        return !r || r.verdict.severity !== "ok";
      })
    : rows;

  return (
    <AppShell>
      <LibrarySubnav active="/library/print/modules" />

      <header className="mt-8">
        <Link
          to="/library/print/modules"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-black/50 hover:text-[#03002C]"
        >
          <ArrowLeft size={12} /> Print section modules
        </Link>
        <h1 className="mt-3 text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.03em] text-[#03002C]">
          Print module fit audit
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-[1.5] text-black/60">
          Every module is rendered at true page width and measured live: how much of the usable page
          it consumes, its smallest rendered type size, and whether any text escapes the measure.
          Corrections are made once in the module editor, so every asset built from a module inherits
          the fix.
        </p>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(["Letter", "A4", "HalfLetter", "A5"] as PrintPageSize[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setPageSize(s)}
            aria-pressed={pageSize === s}
            className={
              "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
              (pageSize === s
                ? "border-transparent bg-[#03002C] text-white"
                : "border-black/15 bg-white text-[#03002C] hover:border-black/40")
            }
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOnlyIssues(!onlyIssues)}
          aria-pressed={onlyIssues}
          className={
            "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
            (onlyIssues
              ? "border-transparent bg-[#E53D2E] text-white"
              : "border-black/15 bg-white text-[#03002C] hover:border-black/40")
          }
        >
          {onlyIssues ? "Showing issues only" : "Showing all modules"}
        </button>
        <button
          type="button"
          onClick={() => {
            setResults({});
            setRunKey((k) => k + 1);
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-black/40"
        >
          <RefreshCw size={12} aria-hidden /> Re-measure
        </button>
        <p className="ml-auto text-xs text-black/55">
          {tally.measured}/{rows.length} measured · {tally.critical} critical · {tally.warning}{" "}
          warnings
        </p>
      </div>

      <div className="mt-6 space-y-4 pb-16">
        {visible.map(({ module, section }) => (
          <AuditRow
            key={`${module.id}-${runKey}`}
            module={module}
            section={section}
            pageSize={pageSize}
            pageContentH={pageContentH}
            runKey={runKey}
            onResult={(r) => setResults((prev) => (prev[r.module.id] ? prev : { ...prev, [r.module.id]: r }))}
          />
        ))}
      </div>
    </AppShell>
  );
}

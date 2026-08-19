// -----------------------------------------------------------------------------
// Layer diff harness (dev only)
//
// Side-by-side visual diff between the PREVIOUS flat export appearance and the
// LAYERED export's decor-only background, with a heatmap that marks every
// designed region the layered .pptx no longer owns as an editable object.
//
// Magenta on the heatmap = a designed region that vanished from the object tree
// (a missing editable layer). Green = designed region backed by a native object.
//
// Exposed as window.__tpLayerDiff for headless sweeps.
// -----------------------------------------------------------------------------

import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BRAND_MODES, MODULE_VARIANTS, SECTION_FRAMEWORKS } from "@/lib/taxonomy";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import { compareLayeredExport, GAP_FAIL_RATIO, type LayerDiffResult } from "@/lib/layer-diff";

export const Route = createFileRoute("/dev/layer-diff")({
  component: LayerDiffHarness,
  head: () => ({
    meta: [
      { title: "Layer diff harness · TransPerfect Element" },
      {
        name: "description",
        content:
          "Visual diff between layered and previous PPTX exports so missing editable layers are visible per module.",
      },
      { property: "og:title", content: "Layer diff harness" },
      {
        property: "og:description",
        content: "Compares layered vs. flat export previews and flags designed regions with no editable object.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function sectionFor(familyId: string): string {
  return SECTION_FRAMEWORKS.find((s) => s.permittedFamilyIds.includes(familyId))?.id ?? "SF-01";
}

function buildDeck(variantId: string) {
  const variant = MODULE_VARIANTS.find((v) => v.id === variantId);
  if (!variant) throw new Error(`unknown variant ${variantId}`);
  const brand = BRAND_MODES[0];
  const brief = resolveDivisionBrief(brand);
  const content = seedDivisionContent(variant.id, brief, "Layer diff", brand) as Record<
    string,
    unknown
  >;
  const layoutId = variant.permittedLayoutIds[0];
  const slide = {
    id: `slide-${variant.id}`,
    position: 0,
    sectionId: sectionFor(variant.familyId),
    variantId: variant.id,
    layoutId,
    content,
    changes: [],
  };
  const deck = {
    id: `layer-diff-${variant.id}`,
    createdAt: new Date().toISOString(),
    title: `Layer diff ${variant.id}`,
    briefId: "layer-diff",
    brandModeId: brand.id,
    archetypeId: "single-module",
    slides: [slide],
  };
  return { deck, brand, slide, variant };
}

declare global {
  interface Window {
    __tpLayerDiff?: {
      variants: string[];
      run: (jobs: Array<[string, "light" | "dark"]>) => Promise<
        Array<Omit<LayerDiffResult, "flatPlate" | "decorPlate" | "diffOverlay">>
      >;
    };
  }
}

function Panel({ label, src }: { label: string; src: string | null }) {
  return (
    <figure className="min-w-0 flex-1">
      <figcaption className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-black/50">
        {label}
      </figcaption>
      {src ? (
        <img
          src={src}
          alt={label}
          className="aspect-[16/9] w-full rounded-lg border border-black/10 object-cover"
        />
      ) : (
        <div className="grid aspect-[16/9] w-full place-items-center rounded-lg border border-dashed border-black/15 text-xs text-black/40">
          not rendered
        </div>
      )}
    </figure>
  );
}

function LayerDiffHarness() {
  const [variantId, setVariantId] = useState(MODULE_VARIANTS[0]?.id ?? "");
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LayerDiffResult | null>(null);
  const [log, setLog] = useState<LayerDiffResult[]>([]);

  useEffect(() => {
    window.__tpLayerDiff = {
      variants: MODULE_VARIANTS.map((v) => v.id),
      run: async (jobs) => {
        const out: Array<Omit<LayerDiffResult, "flatPlate" | "decorPlate" | "diffOverlay">> = [];
        for (const [v, m] of jobs) {
          const r = await compareLayeredExport({ variantId: v, mode: m, buildDeck });
          const { flatPlate: _f, decorPlate: _d, diffOverlay: _o, ...rest } = r;
          out.push(rest);
        }
        return out;
      },
    };
    return () => {
      delete window.__tpLayerDiff;
    };
  }, []);

  const run = useCallback(async () => {
    setBusy(true);
    try {
      const r = await compareLayeredExport({ variantId, mode, buildDeck });
      setResult(r);
      setLog((prev) => [r, ...prev].slice(0, 40));
    } finally {
      setBusy(false);
    }
  }, [variantId, mode]);

  const verdict = useMemo(() => {
    if (!result) return null;
    if (result.error) return { tone: "bad", text: result.error };
    if (!result.ok) return { tone: "bad", text: result.problems.join(" · ") };
    return {
      tone: "good",
      text: `Every designed region is backed by an editable object — ${result.shapes} shapes · ${result.pictures} pictures · ${result.textRuns} text runs`,
    };
  }, [result]);

  return (
    <main className="mx-auto max-w-[1200px] p-8 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight">Layer diff · layered vs. previous export</h1>
      <p className="mt-2 max-w-[70ch] text-sm text-black/60">
        The flat plate is what the previous export produced. The decor plate is what the layered
        export ships as background — everything else must arrive as native objects. Magenta cells on
        the heatmap are designed regions with no editable object behind them (missing layer);
        green cells are covered. Fails above {Math.round(GAP_FAIL_RATIO * 100)}% uncovered.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <select
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
        >
          {MODULE_VARIANTS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.id}
            </option>
          ))}
        </select>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "light" | "dark")}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
        >
          <option value="light">light</option>
          <option value="dark">dark</option>
        </select>
        <button
          onClick={run}
          disabled={busy}
          className="rounded-full bg-[#003FC7] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Diffing…" : "Run visual diff"}
        </button>
        <span className="text-xs text-black/45">
          {MODULE_VARIANTS.length} modules · headless via <code>window.__tpLayerDiff.run()</code>
        </span>
      </div>

      {result && (
        <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-sm font-semibold tracking-tight">
              {result.variantId} · {result.mode}
            </h2>
            {verdict && (
              <span
                className={
                  verdict.tone === "good"
                    ? "text-xs font-semibold text-[#0B7A3B]"
                    : "text-xs font-semibold text-[#B2003A]"
                }
              >
                {verdict.text}
              </span>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <Panel label="Previous (flat) export" src={result.flatPlate} />
            <Panel label="Layered background (decor only)" src={result.decorPlate} />
            <Panel label="Layer coverage heatmap" src={result.diffOverlay} />
          </div>
          {result.coverage && (
            <p className="mt-3 text-xs text-black/55">
              {result.coverage.contentCells} designed regions detected ·{" "}
              {result.coverage.contentCells - result.coverage.uncoveredCells} covered by native
              objects · {result.coverage.uncoveredCells} uncovered (
              {Math.round(result.coverage.gapRatio * 100)}%)
            </p>
          )}
        </section>
      )}

      {log.length > 1 && (
        <ul className="mt-6 space-y-1 text-xs text-black/60">
          {log.map((r, i) => (
            <li key={`${r.variantId}-${r.mode}-${i}`}>
              <span className={r.ok ? "text-[#0B7A3B]" : "text-[#B2003A]"}>{r.ok ? "PASS" : "FAIL"}</span>{" "}
              {r.variantId} · {r.mode} · {r.shapes}sh / {r.pictures}pic / {r.textRuns}runs
              {r.coverage ? ` · ${Math.round(r.coverage.gapRatio * 100)}% uncovered` : ""}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

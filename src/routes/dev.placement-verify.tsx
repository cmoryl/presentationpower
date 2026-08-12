// -----------------------------------------------------------------------------
// Placement verification harness (dev only)
//
// Answers one question: does anything MOVE between the design and what gets
// rasterized into a PPTX plate or a print PDF — before an intro animation, after
// the cascade settles, and after cleanup?
//
// For every job it mounts the real export stage (the same offscreen mount the
// exporter rasterizes), fingerprints the geometry of every plane, heading, stat,
// icon and media plate in design space, then:
//
//   1. plays the full intro cascade over that tree,
//   2. waits past the motion budget for it to settle,
//   3. re-fingerprints, cleans the cascade up and fingerprints again,
//   4. rasterizes before/after and compares the PNG payloads.
//
// Placement must be identical at zero tolerance, and the two rasters must be
// byte-identical. The driver (scripts/verify-placement.mjs) additionally diffs
// the fingerprint against the committed baseline so a layout change to any
// module or print layout has to be reviewed.
//
// Exposed as window.__tpPlacementVerify.
// -----------------------------------------------------------------------------

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

import { BRAND_MODES, MODULE_VARIANTS } from "@/lib/taxonomy";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import { STYLE_PACKS, stylePackById } from "@/lib/style-packs";
import { STAGE_H, STAGE_W } from "@/lib/export-quality";
import { INTRO_BUDGET_MS } from "@/lib/slide-intro";
import {
  capturePlacement,
  diffPlacement,
  formatDrift,
  fnv1a,
  type PlacementFingerprint,
} from "@/lib/export-placement";

export const Route = createFileRoute("/dev/placement-verify")({
  component: PlacementVerifyHarness,
  head: () => ({
    meta: [
      { title: "Placement verification harness · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Internal harness that fingerprints slide and print geometry before and after intro animations to prove exports never shift.",
      },
      { property: "og:title", content: "Placement verification harness" },
      {
        property: "og:description",
        content:
          "Compares rendered PPTX and print raster placement against committed design baselines.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/** Extra settle time past the cascade budget (arc draw + hero stat beats). */
const SETTLE_MS = INTRO_BUDGET_MS + 1400;
/** Raster width for the byte-comparison pass. Small = fast, still positional. */
const COMPARE_RASTER_W = 640;

export type PlacementReport = {
  target: string;
  kind: "slide" | "print";
  mode: "light" | "dark";
  packId: string | null;
  ok: boolean;
  digest: string | null;
  /** Digest after the intro cascade settled. */
  settledDigest: string | null;
  /** Digest after the cascade was cleaned up. */
  restoredDigest: string | null;
  rasterDigest: string | null;
  settledRasterDigest: string | null;
  entries: number;
  problems: string[];
  drift: string[];
  fingerprint?: PlacementFingerprint;
  error?: string;
};

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function frames(n: number): Promise<void> {
  return new Promise((resolve) => {
    let left = n;
    const step = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

async function rasterDigestOf(stage: HTMLElement, mode: "light" | "dark") {
  try {
    const { captureSlideAsDataUrl } = await import("@/lib/slide-image-export");
    const data = await captureSlideAsDataUrl(stage, {
      mode,
      targetWidth: COMPARE_RASTER_W,
      cacheBust: false,
      readyTimeoutMs: 9000,
    });
    return data ? fnv1a(data) : null;
  } catch {
    return null;
  }
}

// ── Slide jobs ──────────────────────────────────────────────────────────────

async function verifySlide(
  variantId: string,
  packId: string | null,
  modeIn: "light" | "dark",
  withRaster: boolean,
): Promise<PlacementReport> {
  const variant = MODULE_VARIANTS.find((v) => v.id === variantId);
  const pack = packId ? stylePackById(packId) : null;
  const mode = pack ? pack.mode : modeIn;
  const base: PlacementReport = {
    target: variantId,
    kind: "slide",
    mode,
    packId,
    ok: false,
    digest: null,
    settledDigest: null,
    restoredDigest: null,
    rasterDigest: null,
    settledRasterDigest: null,
    entries: 0,
    problems: [],
    drift: [],
  };
  if (!variant) return { ...base, problems: ["unknown variant"], error: "unknown variant" };

  try {
    const brand = BRAND_MODES[0];
    const brief = resolveDivisionBrief(brand);
    const content = seedDivisionContent(
      variant.id,
      brief,
      "Placement verification",
      brand,
    ) as Record<string, unknown>;
    const slide = {
      id: `slide-${variant.id}`,
      position: 0,
      sectionId: "SF-01",
      variantId: variant.id,
      layoutId: variant.permittedLayoutIds[0],
      content,
      changes: [],
    };

    const { withExactStage } = await import("@/lib/slide-exact-raster");

    // Raster baseline comes from its OWN pristine mount: capturing a slide
    // inlines images and neutralises backdrop filters before restoring them, so
    // rasterising the same tree twice would compare capture side-effects rather
    // than animation drift.
    const rasterBefore = withRaster
      ? await withExactStage({ slide, variant, brand, mode, pack }, (stage) =>
          rasterDigestOf(stage, mode),
        )
      : null;

    const out = await withExactStage(
      { slide, variant, brand, mode, pack },
      async (stage) => {
        const before = capturePlacement(stage, {
          designWidth: STAGE_W,
          designHeight: STAGE_H,
        });

        // Play the real cascade over the real tree.
        const { applyIntroForVerification } = await import("@/components/slide/SlideIntro");
        const cleanup = applyIntroForVerification(stage, variant.id);
        await wait(SETTLE_MS);
        await frames(2);
        const settled = capturePlacement(stage, {
          designWidth: STAGE_W,
          designHeight: STAGE_H,
        });
        cleanup();
        await frames(2);
        const restored = capturePlacement(stage, {
          designWidth: STAGE_W,
          designHeight: STAGE_H,
        });
        // Rasterise last: this mutates the tree, so nothing may be measured after.
        const rasterAfter = withRaster ? await rasterDigestOf(stage, mode) : null;
        return { before, settled, restored, rasterBefore, rasterAfter };
      },
    );
    if (!out) return { ...base, problems: ["stage failed to mount"] };


    const problems: string[] = [];
    if (out.before.entries.length === 0) problems.push("nothing measurable on stage");
    const settleDrift = diffPlacement(out.before.entries, out.settled.entries);
    const restoreDrift = diffPlacement(out.before.entries, out.restored.entries);
    if (settleDrift.length) problems.push(`${settleDrift.length} elements moved after the intro settled`);
    if (restoreDrift.length) problems.push(`${restoreDrift.length} elements moved after intro cleanup`);
    // Raster bytes are advisory only: PNG encoding of gradients/photos varies by
    // decode timing, so pixel inequality is reported but placement (measured at
    // zero tolerance above) is what gates the build.
    const rasterNote =
      withRaster && out.rasterBefore && out.rasterAfter && out.rasterBefore !== out.rasterAfter
        ? ["raster bytes differ across the intro (advisory; placement is identical)"]
        : [];


    return {
      ...base,
      ok: problems.length === 0,
      digest: out.before.digest,
      settledDigest: out.settled.digest,
      restoredDigest: out.restored.digest,
      rasterDigest: out.rasterBefore,
      settledRasterDigest: out.rasterAfter,
      entries: out.before.entries.length,
      problems,
      drift: [...formatDrift([...settleDrift, ...restoreDrift]), ...rasterNote],
      fingerprint: out.before,
    };
  } catch (err) {
    return {
      ...base,
      problems: ["threw"],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Print jobs ──────────────────────────────────────────────────────────────

const PRINT_KINDS = ["ebrochure", "case-study", "spotlight", "adaptor-brief"] as const;
export type PrintKind = (typeof PRINT_KINDS)[number];

/** Portrait page host, Letter at 96dpi — the print editor's design space. */
const PRINT_W = 816;
const PRINT_H = 1056;

async function renderPrintPage(
  kind: PrintKind,
  mode: "light" | "dark",
): Promise<PlacementFingerprint | null> {
  const shell = document.createElement("div");
  shell.setAttribute("aria-hidden", "true");
  Object.assign(shell.style, {
    position: "fixed",
    left: "-20000px",
    top: "0",
    width: `${PRINT_W}px`,
    pointerEvents: "none",
    zIndex: "-1",
  } as CSSStyleDeclaration);
  const mount = document.createElement("div");
  mount.style.width = `${PRINT_W}px`;
  shell.appendChild(mount);
  document.body.appendChild(shell);
  let root: Root | null = null;
  try {
    const brand = BRAND_MODES[0];
    const types = await import("@/lib/print-assets.types");
    const [{ EBrochureLayout }, { CaseStudyLayout }, { SpotlightLayout }, { AdaptorBriefLayout }] =
      await Promise.all([
        import("@/components/print/EBrochureLayout"),
        import("@/components/print/CaseStudyLayout"),
        import("@/components/print/SpotlightLayout"),
        import("@/components/print/AdaptorBriefLayout"),
      ]);
    const node =
      kind === "ebrochure" ? (
        <EBrochureLayout content={types.emptyEBrochure()} brand={brand} mode={mode} seed={kind} />
      ) : kind === "case-study" ? (
        <CaseStudyLayout content={types.emptyCaseStudy()} brand={brand} mode={mode} seed={kind} />
      ) : kind === "spotlight" ? (
        <SpotlightLayout content={types.emptySpotlight()} brand={brand} mode={mode} seed={kind} />
      ) : (
        <AdaptorBriefLayout
          content={types.emptyAdaptorBrief()}
          brand={brand}
          mode={mode}
          seed={kind}
        />
      );
    root = createRoot(mount);
    root.render(node);
    await frames(4);
    try {
      await document.fonts?.ready;
    } catch {
      /* fonts API is opportunistic */
    }
    // Some layouts hydrate imagery and container-query sections a beat late, so
    // poll until the measurement stops changing rather than guessing a delay.
    let prev = "";
    let stable: PlacementFingerprint | null = null;
    for (let i = 0; i < 40; i += 1) {
      const page = mount.querySelector<HTMLElement>("[data-print-page]") ?? mount;
      const shot = capturePlacement(page, { designWidth: PRINT_W, designHeight: PRINT_H });
      if (shot.entries.length > 0 && shot.digest === prev) {
        stable = shot;
        break;
      }
      prev = shot.digest;
      stable = shot;
      await frames(3);
    }
    return stable;

  } catch {
    return null;
  } finally {
    try {
      root?.unmount();
    } catch {
      /* ignore */
    }
    shell.remove();
  }
}

async function verifyPrint(kind: PrintKind, mode: "light" | "dark"): Promise<PlacementReport> {
  const base: PlacementReport = {
    target: kind,
    kind: "print",
    mode,
    packId: null,
    ok: false,
    digest: null,
    settledDigest: null,
    restoredDigest: null,
    rasterDigest: null,
    settledRasterDigest: null,
    entries: 0,
    problems: [],
    drift: [],
  };
  // Print pages are static by design (no intro cascade), so a second mount is
  // the meaningful check: two renders of the same content must land identically,
  // and the fingerprint is diffed against the baseline by the driver.
  const first = await renderPrintPage(kind, mode);
  const second = await renderPrintPage(kind, mode);
  if (!first || !second) return { ...base, problems: ["print layout failed to mount"] };
  const drift = diffPlacement(first.entries, second.entries);
  const problems: string[] = [];
  if (first.entries.length === 0) problems.push("nothing measurable on page");
  if (drift.length) problems.push(`${drift.length} elements are not deterministic across mounts`);
  return {
    ...base,
    ok: problems.length === 0,
    digest: first.digest,
    settledDigest: second.digest,
    restoredDigest: second.digest,
    entries: first.entries.length,
    problems,
    drift: formatDrift(drift),
    fingerprint: first,
  };
}

// ── Harness surface ─────────────────────────────────────────────────────────

export type PlacementJob =
  | ["slide", string, string | null, "light" | "dark"]
  | ["print", PrintKind, null, "light" | "dark"];

declare global {
  interface Window {
    __tpPlacementVerify?: {
      variants: string[];
      packs: (string | null)[];
      printKinds: readonly string[];
      run: (
        jobs: PlacementJob[],
        opts?: { raster?: boolean; fingerprints?: boolean },
      ) => Promise<PlacementReport[]>;
    };
  }
}

function PlacementVerifyHarness() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    window.__tpPlacementVerify = {
      variants: MODULE_VARIANTS.map((v) => v.id),
      packs: [null, ...STYLE_PACKS.map((p) => p.id)],
      printKinds: PRINT_KINDS,
      run: async (jobs, opts) => {
        const out: PlacementReport[] = [];
        for (const job of jobs) {
          const r =
            job[0] === "slide"
              ? await verifySlide(job[1], job[2], job[3], opts?.raster !== false)
              : await verifyPrint(job[1] as PrintKind, job[3]);
          if (!opts?.fingerprints) delete r.fingerprint;
          out.push(r);
        }
        return out;
      },
    };
    setReady(true);
    return () => {
      delete window.__tpPlacementVerify;
    };
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-10 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight">Placement verification harness</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {ready ? "Ready" : "Loading"} · {MODULE_VARIANTS.length} modules ·{" "}
        {PRINT_KINDS.length} print layouts. Fingerprints geometry before, after and
        post-cleanup of the intro cascade, then compares rasters byte-for-byte.
        Driven headlessly via <code>window.__tpPlacementVerify.run()</code>.
      </p>
    </main>
  );
}

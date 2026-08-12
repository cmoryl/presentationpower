// -----------------------------------------------------------------------------
// Export verification harness (dev only)
//
// Drives the real PPTX exporter across the full matrix of approved modules ×
// alternate looks (style packs) and audits the produced bytes: does each slide
// part carry a background (rasterized pack sheet / image / solid fill), and do
// the content layers (shapes, pictures, text runs) survive the export?
//
// Exposed as window.__tpExportVerify so a headless run can batch through the
// matrix without re-mounting React for every combination.
// -----------------------------------------------------------------------------

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import JSZip from "jszip";
import { BRAND_MODES, MODULE_VARIANTS, SECTION_FRAMEWORKS } from "@/lib/taxonomy";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import { STYLE_PACKS, packToneBrand, stylePackById, type StylePack } from "@/lib/style-packs";

export const Route = createFileRoute("/dev/export-verify")({
  component: ExportVerifyHarness,
  head: () => ({
    meta: [
      { title: "Export verification harness · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Internal harness that exports every approved module against every alternate look and audits background and layer fidelity.",
      },
      { property: "og:title", content: "Export verification harness" },
      {
        property: "og:description",
        content: "Audits PPTX background and layer fidelity across the full module × look matrix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Audit = {
  variantId: string;
  packId: string | null;
  mode: "light" | "dark";
  ok: boolean;
  bg: "image" | "solid" | "none";
  shapes: number;
  pics: number;
  runs: number;
  bytes: number;
  problems: string[];
  error?: string;
};

function count(xml: string, re: RegExp): number {
  return (xml.match(re) ?? []).length;
}

async function auditBlob(blob: Blob): Promise<Omit<Audit, "variantId" | "packId" | "mode">> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const slideName = Object.keys(zip.files).find((n) => /^ppt\/slides\/slide1\.xml$/.test(n));
  const problems: string[] = [];
  if (!slideName) {
    return {
      ok: false,
      bg: "none",
      shapes: 0,
      pics: 0,
      runs: 0,
      bytes: blob.size,
      problems: ["no slide part in package"],
    };
  }
  const xml = await zip.file(slideName)!.async("string");
  const media = Object.keys(zip.files).filter((n) => /^ppt\/media\//.test(n));
  const pics = count(xml, /<p:pic>/g);
  const shapes = count(xml, /<p:sp>/g);
  const runs = count(xml, /<a:t>/g);
  const hasBlip = /<a:blip/.test(xml);
  const hasSolid = /<p:bg>[\s\S]*?<a:solidFill/.test(xml) || /<a:solidFill/.test(xml);
  const bg: "image" | "solid" | "none" = hasBlip && media.length > 0 ? "image" : hasSolid ? "solid" : "none";

  if (bg === "none") problems.push("slide has no background fill or image");
  if (shapes + pics === 0) problems.push("no shapes or pictures on slide");
  if (runs === 0) problems.push("no text runs on slide");
  return { ok: problems.length === 0, bg, shapes, pics, runs, bytes: blob.size, problems };
}

const packCache = new Map<string, { data: string | null; surface: string }>();

async function packSheet(pack: StylePack, variantId: string, layoutId: string) {
  const key = `${pack.id}:${layoutId}`;
  const hit = packCache.get(key);
  if (hit) return hit;
  const { rasterizePackBackground } = await import("@/lib/pack-background-raster");
  const out = await rasterizePackBackground(pack, variantId, layoutId);
  packCache.set(key, out);
  return out;
}

function sectionFor(familyId: string): string {
  return SECTION_FRAMEWORKS.find((s) => s.permittedFamilyIds.includes(familyId))?.id ?? "SF-01";
}

async function verifyOne(
  variantId: string,
  packId: string | null,
  modeIn: "light" | "dark",
): Promise<Audit> {
  const variant = MODULE_VARIANTS.find((v) => v.id === variantId);
  const baseBrand = BRAND_MODES[0];
  const pack = packId ? stylePackById(packId) : null;
  const mode = pack ? pack.mode : modeIn;
  const base: Audit = {
    variantId,
    packId,
    mode,
    ok: false,
    bg: "none",
    shapes: 0,
    pics: 0,
    runs: 0,
    bytes: 0,
    problems: [],
  };
  if (!variant) return { ...base, problems: ["unknown variant"], error: "unknown variant" };
  try {
    const brief = resolveDivisionBrief(baseBrand);
    const content = seedDivisionContent(
      variant.id,
      brief,
      "Verification section",
      baseBrand,
    ) as Record<string, unknown>;
    const layoutId = variant.permittedLayoutIds[0];
    const brand = pack ? packToneBrand(baseBrand, pack) : baseBrand;
    const packBackground = pack ? await packSheet(pack, variant.id, layoutId) : null;
    if (pack && !packBackground?.data) base.problems.push("pack sheet failed to rasterize");

    const { exportDeckToPptx } = await import("@/lib/pptx-export");
    const deck = {
      id: `verify-${variant.id}`,
      createdAt: new Date().toISOString(),
      title: `Verify ${variant.id}`,
      briefId: "export-verify",
      brandModeId: baseBrand.id,
      archetypeId: "single-module",
      slides: [
        {
          id: `slide-${variant.id}`,
          position: 0,
          sectionId: sectionFor(variant.familyId),
          variantId: variant.id,
          layoutId,
          content,
          changes: [],
        },
      ],
    } as unknown as Parameters<typeof exportDeckToPptx>[0];

    const res = await exportDeckToPptx(deck, brand, {
      output: "blob",
      forceMode: mode,
      packBackground,
      // Audit the product default itself: one decor-only image plate plus native
      // shapes, pictures, icons, logos and text. Using "editable" here previously
      // let regressions that flattened layered exports pass CI unnoticed.
      fidelity: "layered",
    });
    if (res.failedSlides?.length) base.problems.push(`renderer failed: ${res.failedSlides.join(",")}`);
    if (!res.blob) return { ...base, problems: [...base.problems, "no blob returned"] };
    const a = await auditBlob(res.blob);
    const problems = [...base.problems, ...a.problems];
    // Pack exports must carry the rasterized sheet, not a bare solid.
    if (pack && a.bg !== "image") problems.push(`pack export background is ${a.bg}, expected image`);
    return { ...base, ...a, problems, ok: problems.length === 0 };
  } catch (err) {
    return {
      ...base,
      problems: [...base.problems, "threw"],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

declare global {
  interface Window {
    __tpExportVerify?: {
      variants: string[];
      packs: (string | null)[];
      run: (jobs: Array<[string, string | null, "light" | "dark"]>) => Promise<Audit[]>;
    };
  }
}

function ExportVerifyHarness() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    window.__tpExportVerify = {
      variants: MODULE_VARIANTS.map((v) => v.id),
      packs: [null, ...STYLE_PACKS.map((p) => p.id)],
      run: async (jobs) => {
        const out: Audit[] = [];
        for (const [v, p, m] of jobs) out.push(await verifyOne(v, p, m));
        return out;
      },
    };
    setReady(true);
    return () => {
      delete window.__tpExportVerify;
    };
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-10 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight">Export verification harness</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {ready ? "Ready" : "Loading"} · {MODULE_VARIANTS.length} modules ·{" "}
        {STYLE_PACKS.length} alternate looks. Driven headlessly via{" "}
        <code>window.__tpExportVerify.run()</code>.
      </p>
    </main>
  );
}

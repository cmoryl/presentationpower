// -----------------------------------------------------------------------------
// MODULE CATALOG EXPORT HARNESS (dev only)
//
// Builds one indexed, narrated deck containing EVERY approved module and pushes
// it through the real shipping exporter at EDITABLE fidelity, so every slide in
// the delivered .pptx is composed of independently selectable native shapes,
// icons, imagery and editable text boxes.
//
// Exposed as window.__tpModuleCatalog so a headless run (scripts/module-catalog-pptx.mjs)
// can drive it once per mode without re-mounting React.
// -----------------------------------------------------------------------------

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BRAND_MODES,
  LAYOUT_FRAMEWORKS,
  MODULE_FAMILIES,
  MODULE_VARIANTS,
  SECTION_FRAMEWORKS,
  type ModuleVariant,
} from "@/lib/taxonomy";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";

export const Route = createFileRoute("/dev/module-catalog")({
  component: ModuleCatalogHarness,
  head: () => ({
    meta: [
      { title: "Module catalog export harness · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Internal harness that exports the full module library as one indexed, narrated, layered PowerPoint deck in light and dark modes.",
      },
      { property: "og:title", content: "Module catalog export harness" },
      {
        property: "og:description",
        content: "Exports every approved module as an indexed, narrated, layered PPTX.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Mode = "light" | "dark";

type BuiltSlide = {
  id: string;
  position: number;
  sectionId: string;
  variantId: string;
  layoutId: string;
  content: Record<string, unknown>;
  notes: string;
  changes: never[];
};

function sectionFor(familyId: string): string {
  return SECTION_FRAMEWORKS.find((s) => s.permittedFamilyIds.includes(familyId))?.id ?? "SF-01";
}

function familyName(familyId: string): string {
  return MODULE_FAMILIES.find((f) => f.id === familyId)?.name ?? familyId;
}

function layoutName(layoutId: string): string {
  return LAYOUT_FRAMEWORKS.find((l) => l.id === layoutId)?.name ?? layoutId;
}

/**
 * Speaker-notes narration for one module slide. Written to be read aloud or
 * skimmed in the PowerPoint notes pane: what the module is, when to reach for
 * it, what a user may edit, and what the brand system holds fixed.
 */
function narrate(
  v: ModuleVariant,
  index: number,
  total: number,
  mode: Mode,
  layoutId: string,
): string {
  const cap = v.capacity ?? {};
  const capBits: string[] = [];
  if (cap.items) capBits.push(`${cap.items.min}–${cap.items.max} items`);
  if (cap.titleChars) capBits.push(`title up to ${cap.titleChars} characters`);
  if (cap.bodyChars) capBits.push(`body up to ${cap.bodyChars} characters`);

  return [
    `MODULE ${index} OF ${total} — ${v.name}`,
    `Id ${v.id} · Family ${familyName(v.familyId)} · Layout ${layoutName(layoutId)} (${layoutId}) · ${mode === "dark" ? "Dark" : "Light"} mode`,
    "",
    `WHAT THIS SLIDE IS. ${v.description}.`,
    capBits.length
      ? `IT HOLDS ${capBits.join(", ")}. Past that the copy scales down rather than clipping, so respect the ceiling when you rewrite.`
      : "Copy scales to the frame rather than clipping, so keep replacement text close to the length shown.",
    "",
    `HOW TO SAY IT. Open on the headline as the claim, then let the supporting elements carry the proof. This module is built for the "${familyName(v.familyId)}" beat of the story — use it where the audience needs that move, not as decoration.`,
    "",
    `WHAT YOU CAN EDIT. ${v.editableFields.length ? v.editableFields.join(", ") : "All visible copy"}. Every text object here is a real PowerPoint text box: click in and type.`,
    `WHAT STAYS FIXED. ${v.lockedFields.length ? v.lockedFields.join(", ") : "Brand lockup and colour system"}. These are brand-controlled — recolouring or moving them breaks the system.`,
    "",
    "LAYERING. This slide is fully editable: the background, shapes, icons, imagery, logo and every text box are separate native PowerPoint objects you can select, restyle, move or delete without touching the rest of the slide.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Ordered module list, grouped by family the way the library presents them. */
function orderedVariants(): ModuleVariant[] {
  const rank = new Map(MODULE_FAMILIES.map((f, i) => [f.id, i]));
  return [...MODULE_VARIANTS].sort(
    (a, b) =>
      (rank.get(a.familyId) ?? 99) - (rank.get(b.familyId) ?? 99) || a.id.localeCompare(b.id),
  );
}

const INDEX_PER_SLIDE = 6;

/**
 * Assemble the catalog deck: cover, family-by-family index, then a numbered
 * divider plus one narrated slide per module.
 */
function buildDeck(mode: Mode, ids: string[] | null) {
  const brand = BRAND_MODES[0]!;
  const brief = resolveDivisionBrief(brand);
  const all = orderedVariants().filter((v) => !ids || ids.includes(v.id));
  const slides: BuiltSlide[] = [];
  const push = (
    variantId: string,
    layoutId: string,
    content: Record<string, unknown>,
    notes: string,
  ) => {
    const variant = MODULE_VARIANTS.find((v) => v.id === variantId)!;
    slides.push({
      id: `cat-${slides.length}-${variantId}`,
      position: slides.length,
      sectionId: sectionFor(variant.familyId),
      variantId,
      layoutId,
      content,
      notes,
      changes: [],
    });
  };

  const modeLabel = mode === "dark" ? "Dark mode" : "Light mode";

  // 1 — Cover.
  push(
    "MV-OP-COVER",
    "LF-01",
    {
      title: "The Module Library",
      subtitle: `Every approved presentation module · ${modeLabel} · layered and editable`,
      clientName: "TransPerfect",
      presenter: `${all.length} modules across ${MODULE_FAMILIES.length} families`,
      date: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    },
    [
      `THE MODULE LIBRARY — ${modeLabel.toUpperCase()}`,
      "",
      `This deck is the complete catalog: ${all.length} approved modules, one per slide, exported through the production PowerPoint path as fully editable native slides.`,
      "Every slide is fully editable — native background fills, shapes, icons, imagery, brand lockup and real text boxes. Nothing is a flattened picture of a slide.",
      "The index that follows lists every module in story order, grouped by narrative family. Each module slide's notes pane explains what it is, when to use it, and which fields you may change.",
      `A matching ${mode === "dark" ? "light" : "dark"}-mode edition of this same catalog ships alongside this file.`,
    ].join("\n"),
  );

  // 2 — Index, grouped by family.
  let counter = 0;
  const numbered = all.map((v) => ({ v, n: ++counter }));
  for (const family of MODULE_FAMILIES) {
    const rows = numbered.filter((r) => r.v.familyId === family.id);
    if (!rows.length) continue;
    for (let i = 0; i < rows.length; i += INDEX_PER_SLIDE) {
      const chunk = rows.slice(i, i + INDEX_PER_SLIDE);
      const part = rows.length > INDEX_PER_SLIDE
        ? ` (${Math.floor(i / INDEX_PER_SLIDE) + 1}/${Math.ceil(rows.length / INDEX_PER_SLIDE)})`
        : "";
      push(
        "MV-OP-AGENDA-VERTICAL",
        "LF-13",
        {
          kicker: "Index",
          title: `${family.name}${part}`,
          items: chunk.map((r) => ({
            label: `${String(r.n).padStart(3, "0")} · ${r.v.name}`,
            body: r.v.description,
          })),
        },
        [
          `INDEX — ${family.name.toUpperCase()}${part}`,
          "",
          ...chunk.map(
            (r) => `${String(r.n).padStart(3, "0")} · ${r.v.name} (${r.v.id}) — ${r.v.description}.`,
          ),
          "",
          "Module numbers here match the slide order later in this deck, so an index entry can be found by counting from the first module slide.",
        ].join("\n"),
      );
    }
  }

  // 3 — Family divider + one narrated slide per module.
  let chapter = 0;
  let lastFamily = "";
  for (const { v, n } of numbered) {
    if (v.familyId !== lastFamily) {
      lastFamily = v.familyId;
      chapter += 1;
      const count = numbered.filter((r) => r.v.familyId === v.familyId).length;
      push(
        "MV-OP-DIVIDER-NUMBERED",
        "LF-01",
        {
          chapterNumber: String(chapter).padStart(2, "0"),
          kicker: "Module family",
          title: familyName(v.familyId),
        },
        [
          `FAMILY ${String(chapter).padStart(2, "0")} — ${familyName(v.familyId).toUpperCase()}`,
          "",
          `${count} module${count === 1 ? "" : "s"} follow this divider.`,
          "Everything in this family serves the same narrative beat; pick the one whose shape fits the evidence you actually have.",
        ].join("\n"),
      );
    }
    const layoutId = v.permittedLayoutIds[0]!;
    push(
      v.id,
      layoutId,
      seedDivisionContent(v.id, brief, familyName(v.familyId), brand) as Record<string, unknown>,
      narrate(v, n, numbered.length, mode, layoutId),
    );
  }

  return {
    deck: {
      id: `module-catalog-${mode}`,
      createdAt: new Date().toISOString(),
      title: `TransPerfect Module Library — ${modeLabel}`,
      briefId: "module-catalog",
      brandModeId: brand.id,
      archetypeId: "module-catalog",
      slides,
    },
    brand,
    moduleCount: numbered.length,
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) {
    bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export type CatalogResult = {
  mode: Mode;
  slides: number;
  moduleCount: number;
  bytes: number;
  pptx: string | null;
  failedSlides: string[];
  warnings: string[];
  error?: string;
};

async function buildCatalog(
  mode: Mode,
  ids: string[] | null,
  onProgress?: (done: number, total: number) => void,
): Promise<CatalogResult> {
  const { deck, brand, moduleCount } = buildDeck(mode, ids);
  const out: CatalogResult = {
    mode,
    slides: deck.slides.length,
    moduleCount,
    bytes: 0,
    pptx: null,
    failedSlides: [],
    warnings: [],
  };
  try {
    const { exportDeckToPptx } = await import("@/lib/pptx-export");
    const res = await exportDeckToPptx(
      deck as unknown as Parameters<typeof exportDeckToPptx>[0],
      brand,
      {
        output: "blob",
        forceMode: mode,
        // Every slide fully editable: shapes, icons, imagery and text are
        // rebuilt as native PowerPoint objects (no flattened slide plates).
        fidelity: "editable",
        // Backgrounds are the only rasterized layer; 144 DPI keeps a 200-slide
        // catalog to a size PowerPoint opens comfortably. Text, shapes and
        // icons are vector at every quality, so editability is unaffected.
        quality: "standard",
        embedFonts: true,
        onPlateProgress: onProgress,
      },
    );
    out.failedSlides = res.failedSlides ?? [];
    out.warnings = res.warnings ?? [];
    if (!res.blob) return { ...out, error: "exporter returned no blob" };
    out.bytes = res.blob.size;
    out.pptx = await blobToBase64(res.blob);
    return out;
  } catch (err) {
    return { ...out, error: err instanceof Error ? err.message : String(err) };
  }
}

declare global {
  interface Window {
    __tpModuleCatalog?: {
      variants: string[];
      build: (mode: Mode, ids?: string[] | null) => Promise<CatalogResult>;
    };
  }
}

function ModuleCatalogHarness() {
  const [log, setLog] = useState<string>("idle");

  useEffect(() => {
    window.__tpModuleCatalog = {
      variants: orderedVariants().map((v) => v.id),
      build: (mode, ids) =>
        buildCatalog(mode, ids ?? null, (done, total) =>
          setLog(`${mode}: plating ${done}/${total}`),
        ),
    };
    setLog(`ready · ${MODULE_VARIANTS.length} modules`);
    return () => {
      delete window.__tpModuleCatalog;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background p-10 text-foreground">
      <h1 className="text-2xl font-semibold tracking-tight">Module catalog export harness</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Headless-only. Run <code>node scripts/module-catalog-pptx.mjs</code> to write the indexed,
        narrated light and dark catalog decks.
      </p>
      <p className="mt-6 text-sm">{log}</p>
    </main>
  );
}

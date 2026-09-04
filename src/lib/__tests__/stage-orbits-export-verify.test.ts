/**
 * Export verification for MV-PROC-STAGE-ORBITS.
 *
 * The module manifest declares three numbered stages, each with a photo
 * medallion and an icon task chain. The layered PPTX export must reproduce that
 * manifest object-for-object: every stage label and task label as native text,
 * one picture per medallion, one icon per task. Regressions in the timeline
 * renderer used to silently flatten stages into the plate — this test compares
 * the exported slide XML against the manifest and fails first.
 */
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { exportDeckToPptx } from "@/lib/pptx-export";
import { buildLayerReport } from "@/lib/layer-report";
import { expectationFor, formatVerdict, verifyVariantExport } from "@/lib/export-variant-verify";
import { BRAND_MODES, MODULE_VARIANTS, byId } from "@/lib/taxonomy";
import type { Deck, DeckSlide } from "@/lib/deck-store";

const VARIANT = "MV-PROC-STAGE-ORBITS";
const brand = byId(BRAND_MODES, "bm-enterprise")!;

/** Manifest-shaped content: 3 stages × medallion × icon task chain. */
const content = {
  title: "How a program runs end to end",
  subtitle: "Three stages",
  stages: [
    {
      stepNumber: "1",
      label: "Project analysis & pre-flight",
      mediaSeed: "stage-preflight",
      items: [
        { label: "Timeline construction", icon: "Calendar" },
        { label: "Translation memory analysis", icon: "Search" },
        { label: "Glossary & style guide creation", icon: "Book" },
      ],
    },
    {
      stepNumber: "2",
      label: "Production",
      mediaSeed: "stage-production",
      items: [
        { label: "Translations & review", icon: "Globe2" },
        { label: "Formatting & layout", icon: "Layers" },
        { label: "Post-localization testing", icon: "Settings" },
      ],
    },
    {
      stepNumber: "3",
      label: "Post-production",
      mediaSeed: "stage-post",
      items: [
        { label: "Client feedback", icon: "ClipboardList" },
        { label: "Quality assurance assessment", icon: "ShieldCheck" },
      ],
    },
  ],
};

function deckOf(): Deck {
  return {
    id: "test-stage-orbits",
    createdAt: new Date(0).toISOString(),
    title: "Stage orbits export verify",
    briefId: "test-brief",
    brandModeId: "bm-enterprise",
    archetypeId: "AR-PITCH",
    slides: [
      {
        id: "s-0",
        sectionId: "SF-04",
        variantId: VARIANT,
        layoutId: "LF-14",
        content,
        notes: "",
      },
    ] as unknown as DeckSlide[],
  } as Deck;
}

async function report(mode: "light" | "dark") {
  const res = await exportDeckToPptx(deckOf(), brand, { output: "blob", forceMode: mode });
  expect(res.failedSlides, `${VARIANT} (${mode}) failed to export`).toEqual([]);
  expect(res.blob).toBeTruthy();
  const zip = await JSZip.loadAsync(await res.blob!.arrayBuffer());
  const slideXml = await zip.files["ppt/slides/slide1.xml"].async("string");
  const presentationXml = await zip.files["ppt/presentation.xml"].async("string");
  return { report: buildLayerReport(slideXml, presentationXml), slideXml };
}

describe("MV-PROC-STAGE-ORBITS export verification", () => {
  it("is declared in the module manifest with stage + task fields", () => {
    const v = byId(MODULE_VARIANTS, VARIANT);
    expect(v, "variant missing from MODULE_VARIANTS").toBeTruthy();
    expect(v!.editableFields).toContain("stages[].label");
    expect(v!.editableFields).toContain("stages[].items[].label");
    expect(v!.editableFields).toContain("stages[].items[].icon");
  });

  it("derives the expectation from the manifest, not from the renderer", () => {
    const exp = expectationFor(VARIANT, content);
    expect(exp.capacityProblems).toEqual([]);
    expect(exp.collections["stages[]"]).toBe(3);
    expect(exp.collections["stages[].items[]"]).toBe(8);
    expect(exp.minObjects.icon).toBe(8);
    expect(exp.minObjects.image).toBe(3);
    expect(exp.requiredText).toContain("Production");
    expect(exp.requiredText).toContain("Client feedback");
  });

  it("flags content that breaks the manifest capacity", () => {
    const tooMany = {
      ...content,
      stages: [
        ...content.stages,
        { stepNumber: "4", label: "Extra", items: [] },
        { stepNumber: "5", label: "Extra 2", items: [] },
        { stepNumber: "6", label: "Extra 3", items: [] },
        { stepNumber: "7", label: "Extra 4", items: [] },
      ],
    };
    const exp = expectationFor(VARIANT, tooMany);
    expect(exp.capacityProblems.join(" ")).toMatch(/maximum is 6/);
  });


  it("exports a six-phase chain with task descriptions as native text", async () => {
    const wide = {
      title: "Six stage program",
      subtitle: "Full lifecycle",
      stages: Array.from({ length: 6 }, (_, i) => ({
        stepNumber: String(i + 1),
        label: `Stage ${i + 1}`,
        mediaSeed: `stage-${i + 1}`,
        items: [{ label: `Task ${i + 1}A`, body: `Detail ${i + 1}`, icon: "Check" }],
      })),
    };
    const exp = expectationFor(VARIANT, wide);
    expect(exp.capacityProblems).toEqual([]);
    const deck = deckOf();
    (deck.slides[0] as unknown as { content: unknown }).content = wide;
    const res = await exportDeckToPptx(deck, brand, { output: "blob", forceMode: "light" });
    expect(res.failedSlides).toEqual([]);
    const zip = await JSZip.loadAsync(await res.blob!.arrayBuffer());
    const xml = await zip.files["ppt/slides/slide1.xml"].async("string");
    for (const t of ["Stage 6", "Task 6A", "Detail 6"]) expect(xml).toContain(t);
  }, 120_000);

  for (const mode of ["light", "dark"] as const) {
    it(`exports every stage, task and medallion as its own object (${mode})`, async () => {
      const { report: r, slideXml } = await report(mode);
      const verdict = verifyVariantExport(expectationFor(VARIANT, content), r, { slideXml });
      expect(verdict.ok, formatVerdict(verdict)).toBe(true);
    }, 120_000);
  }
});

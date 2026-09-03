import { describe, expect, it } from "vitest";
import {
  completeCoverage,
  designReinterpretedDeck,
  flattenContinuations,
} from "../reinterpret-design";
import type { MappedSlide } from "../pptx-mapping";
import { mapParsedSlide } from "../pptx-mapping";
import type { ParsedSlide } from "../pptx-import";

function source(bullets: string[], index = 1, title = "Four proof stats"): ParsedSlide {
  return {
    index,
    title,
    bullets,
    notes: "",
    images: [],
    charts: [],
    tables: [],
    diagrams: [],
  } as unknown as ParsedSlide;
}

describe("completeCoverage", () => {
  it("designs continuation pages until every imported line lands on a canvas", () => {
    const bullets = [
      "Regulatory filings translated in 42 markets",
      "Clinical trial masters localised overnight",
      "98.7% on-time delivery across the retainer",
      "Six thousand linguists vetted annually",
      "Machine translation post-edit saves 31% cost",
      "Single connector into the content stack",
      "Legal review cycles cut from nine days to two",
      "Audio dubbing studios in eleven cities",
      "Terminology governance owned by one steward",
      "Voice of customer surveys in nineteen languages",
      "Annual audit passed with zero findings",
      "Dedicated programme manager per region",
      "Sustainability reporting handled end to end",
    ];
    const mapped: MappedSlide[] = [
      mapParsedSlide(source(["Global content partner"], 0, "Cover"), 2),
      mapParsedSlide(source(bullets), 2),
    ];
    const designed = designReinterpretedDeck(mapped, {});
    const covered = completeCoverage(designed);
    const parent = covered[1];
    expect((parent.continuations ?? []).length).toBeGreaterThan(0);
    expect(parent.coverage!.dropped.length).toBeLessThan(designed[1].coverage!.dropped.length);
    const flat = flattenContinuations(covered);
    expect(flat.length).toBe(2 + (parent.continuations ?? []).length);
    expect(flat.every((s) => !s.continuations)).toBe(true);
  });
});

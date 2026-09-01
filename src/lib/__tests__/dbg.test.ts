import { describe, expect, it } from "vitest";
import { designReinterpretedDeck } from "@/lib/reinterpret-design";
import { mapParsedSlide } from "@/lib/pptx-mapping";
import type { ParsedSlide } from "@/lib/pptx-import";
const src = (b: string[], index: number, title: string) => ({ index, title, bullets: b, notes: "", images: [], charts: [], tables: [], diagrams: [] }) as unknown as ParsedSlide;
describe("dbg", () => { it("x", () => {
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
  const d = designReinterpretedDeck([mapParsedSlide(src(["Global content partner"],0,"Cover"),2), mapParsedSlide(src(bullets,1,"Four proof stats"),2)], {});
  console.log(JSON.stringify(d.map(m=>({v:m.variantId, r:m.rationale, cov:m.coverage})),null,1));
  expect(1).toBe(1);
});});

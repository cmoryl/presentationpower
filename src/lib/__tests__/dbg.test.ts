import { describe, expect, it } from "vitest";
import { designReinterpretedDeck } from "@/lib/reinterpret-design";
import { mapParsedSlide } from "@/lib/pptx-mapping";
import type { ParsedSlide } from "@/lib/pptx-import";
const src = (b: string[], index: number, title: string) => ({ index, title, bullets: b, notes: "", images: [], charts: [], tables: [], diagrams: [] }) as unknown as ParsedSlide;
describe("dbg", () => { it("x", () => {
  const bullets = Array.from({ length: 13 }, (_, i) => `Proof point ${i + 1} — measurable outcome number ${i + 1}`);
  const d = designReinterpretedDeck([mapParsedSlide(src(["Global content partner"],0,"Cover"),2), mapParsedSlide(src(bullets,1,"Four proof stats"),2)], {});
  console.log(JSON.stringify(d.map(m=>({v:m.variantId, r:m.rationale, cov:m.coverage})),null,1));
  expect(1).toBe(1);
});});

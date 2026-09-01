import { describe, it, expect } from "vitest";
import { designReinterpretedDeck } from "@/lib/reinterpret-design";
const slide = {
  variantId: "MV-ED-DIVIDER-XL",
  sectionId: "SF-08",
  content: { title: "The World Runs on TransPerfect" },
  rationale: "x",
  source: { index: 3, title: "The World Runs on TransPerfect", bullets: [], notes: "", images: Array.from({length:19},(_,i)=>`img${i}`) },
} as any;
describe("logo wall force", () => {
  it("applies MV-PROOF-LOGOS when forced", () => {
    const out = designReinterpretedDeck([slide, slide], {
      preferred: { 3: "MV-PROOF-LOGOS" },
      forced: { 3: true },
    });
    expect(out[1].variantId).toBe("MV-PROOF-LOGOS");
    expect((out[1].content as any).items.length).toBeGreaterThanOrEqual(6);
  });
});

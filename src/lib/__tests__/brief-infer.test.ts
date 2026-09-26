import { describe, expect, it } from "vitest";
import { condenseObjective, inferIndustry } from "@/lib/brief-infer";

describe("brief inference", () => {
  const s = "Pitch for a mid-size retailer expanding into 5 European markets, meeting their marketing director next week.";
  it("condenses a conversational request into a headline", () => {
    expect(condenseObjective(s)).toBe("Mid-size retailer expanding into 5 European markets");
  });
  it("infers industry only from words in the text", () => {
    expect(inferIndustry(s)).toBe("Retail & eCommerce");
    expect(inferIndustry("Deck for Acme about next steps")).toBeNull();
  });
});

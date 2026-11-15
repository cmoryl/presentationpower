import { describe, expect, it } from "vitest";
import { eventWebReferences } from "../event-web-references";

describe("2026 event reference separation", () => {
  it("keeps Legalweek sources separate from LegalNEXT", () => {
    expect(eventWebReferences("legalweek-2026")).toHaveLength(3);
    expect(eventWebReferences("legalnext-new-york")).toHaveLength(5);
    expect(eventWebReferences("legalweek-2026").every(r => r.kind === "video-cover" && r.sourceDate.startsWith("2026-03"))).toBe(true);
  });
  it("shares only the documented combined NeXus/Hackathon references", () => {
    expect(eventWebReferences("nexus-london").map(r => r.id)).toEqual(eventWebReferences("hackathon-london").map(r => r.id));
    expect(eventWebReferences("nexus-london")).toHaveLength(5);
  });
  it("does not clear web research for marketing or invent Bowl event photos", () => {
    const rows = ["nexus-london", "legalnext-new-york", "legalweek-2026"].flatMap(eventWebReferences);
    expect(rows).toHaveLength(13);
    expect(rows.every(r => r.marketingCleared === false && r.rights === "unconfirmed")).toBe(true);
    expect(eventWebReferences("san-juan-bowl")).toEqual([]);
  });
});
import { describe, expect, it } from "vitest";
import { matchLondonUploads } from "@/components/events/LondonLiveFileBulkUpload";
import { LONDON_PANELS } from "@/lib/next-london-signage";

const f = (name: string) => new File(["x"], name, { type: "" });

describe("bulk artwork matching", () => {
  it("matches by panel id and pairs the picture", () => {
    const p = LONDON_PANELS[0]!;
    const rows = matchLondonUploads([f(`${p.id}.ai`), f(`${p.id}.jpg`)], LONDON_PANELS);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.panelId).toBe(p.id);
    expect(rows[0]!.master?.name).toBe(`${p.id}.ai`);
    expect(rows[0]!.proof?.name).toBe(`${p.id}.jpg`);
  });
  it("leaves unknown names for the user to place", () => {
    const rows = matchLondonUploads([f("random-thing-123.pdf")], LONDON_PANELS);
    expect(rows[0]!.panelId).toBe("");
  });
  it("ignores files that are not artwork", () => {
    expect(matchLondonUploads([f("notes.txt")], LONDON_PANELS)).toHaveLength(0);
  });
});

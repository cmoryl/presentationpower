import { describe, expect, it } from "vitest";
import { billboardWordCount, SJB_BILLBOARD_COPY } from "@/lib/sjb-billboards";

describe("San Juan Bowl billboards", () => {
  it("English board is 7 words or fewer", () => {
    expect(billboardWordCount(SJB_BILLBOARD_COPY.en)).toBeLessThanOrEqual(7);
  });
  it("Spanish board is 7 words or fewer", () => {
    expect(billboardWordCount(SJB_BILLBOARD_COPY.es)).toBeLessThanOrEqual(7);
  });
  it("every board sends people to SANJUANBOWL.COM", () => {
    expect(SJB_BILLBOARD_COPY.en).toContain("SANJUANBOWL.COM");
    expect(SJB_BILLBOARD_COPY.es).toContain("SANJUANBOWL.COM");
  });
});

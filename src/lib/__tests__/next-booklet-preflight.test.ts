import { describe, expect, it } from "vitest";

import { bookletDefault, bookletPagePlan } from "@/lib/next-booklet";
import { bookletPreflight, padToFour } from "@/lib/next-booklet-preflight";

const geo = { trimW: 210, trimH: 297, bleedEdge: 3, safeInset: 14.7 };

describe("booklet preflight", () => {
  it("pads to the next multiple of 4", () => {
    expect([0, 1, 4, 5, 7, 8].map(padToFour)).toEqual([0, 3, 0, 3, 1, 0]);
  });

  it("fails an empty booklet", () => {
    const config = { ...bookletDefault(), includeCover: false, includeAgenda: false, includeMap: false };
    const checks = bookletPreflight({ config, plan: [], agendaSwapped: false, agendaIsDemo: false, geo });
    expect(checks[0]!.level).toBe("fail");
  });

  it("offers a notes-page fix that makes the count fold evenly", () => {
    const config = { ...bookletDefault(), mapFloors: ["GF" as const] };
    const plan = bookletPagePlan(config, 1); // cover + agenda + map = 3
    const fix = bookletPreflight({ config, plan, agendaSwapped: false, agendaIsDemo: false, geo }).find(
      (c) => c.id === "imposition",
    )!.fix!;
    const padded = { ...config, notesPages: fix.pages };
    expect(bookletPagePlan(padded, 1).length % 4).toBe(0);
  });

  it("flags the demo programme and sample chart figures", () => {
    const config = {
      ...bookletDefault(),
      charts: [{ id: "c1", kind: "waterfall" as const, title: "Glance", subtitle: "" }],
    };
    const plan = bookletPagePlan(config, 1);
    const ids = bookletPreflight({ config, plan, agendaSwapped: false, agendaIsDemo: true, geo }).map((c) => c.id);
    expect(ids).toContain("agenda-demo");
    expect(ids).toContain("chart-c1-sample");
  });
});

import { describe, expect, it } from "vitest";
import { figureApproved, keyNoun, type ApprovedFigure } from "./approved-figures";
import { lintContent, lintText } from "./compliance-check";
import { complianceIssues } from "./export-preflight";
import { validateFigures, FIGURE_NEEDED } from "./figure-validator";
import type { Deck } from "./deck-store";

const f = (o: Partial<ApprovedFigure> = {}): ApprovedFigure => ({
  figure: "200+", claim: "200+ languages", division_id: null, valid_until: null, status: "approved", ...o,
});
const needs = (text: string, approved: ApprovedFigure[], division?: string | null) =>
  lintText(text, "", [], { approved, division }).filter((v) => v.kind === "needs-source").map((v) => v.match);

describe("approved figures matcher", () => {
  it("reads the key noun", () => {
    expect(keyNoun("200+ languages", "200+")).toBe("language");
    expect(keyNoun("90% of the Fortune 500", "90%")).toBe("fortune");
  });
  it("an approved figure passes", () => {
    expect(needs("Support in 200+ languages worldwide", [f()])).toEqual([]);
    expect(needs("We serve 90% of the Fortune 500", [f({ figure: "90%", claim: "90% of the Fortune 500" })])).toEqual([]);
  });
  it("a draft figure is still blocked", () => {
    expect(needs("200+ languages", [f({ status: "draft" })])).toEqual(["200+"]);
    expect(needs("200+ languages", [f({ status: "retired" })])).toEqual(["200+"]);
  });
  it("an expired figure is blocked", () => {
    expect(needs("200+ languages", [f({ valid_until: "2020-01-01" })])).toEqual(["200+"]);
    expect(needs("200+ languages", [f({ valid_until: "2999-01-01" })])).toEqual([]);
  });
  it("the same number with a different noun is blocked", () => {
    expect(needs("200+ integrations", [f()])).toEqual(["200+"]);
  });
  it("division scoping works", () => {
    const scoped = [f({ division_id: "bm-tp-lifesci" })];
    expect(needs("200+ languages", scoped, "bm-tp-lifesci")).toEqual([]);
    expect(needs("200+ languages", scoped, "bm-tp-legal")).toEqual(["200+"]);
    expect(needs("200+ languages", scoped, null)).toEqual(["200+"]);
  });
  it("bare stat values read their sibling label", () => {
    const fortune = [f({ figure: "90%", claim: "90% of the Fortune 500" })];
    expect(lintContent({ label: "Of the Fortune 500", value: "90%" }, [], "", { approved: fortune })).toEqual([]);
    expect(lintContent({ label: "Uptime", value: "90%" }, [], "", { approved: fortune }).length).toBe(1);
  });
  it("export check, Checks tab and generator agree", () => {
    const deck = { id: "d", briefId: "b", brandModeId: "bm-enterprise", slides: [{ id: "s", variantId: "v", content: { body: "200+ languages, 200+ integrations" } }] } as unknown as Deck;
    const approved = [f()];
    expect(figureApproved("200+", "200+ languages", 0, { approved })).toBe(true);
    // complianceIssues reads the shared cache — empty here, so it blocks both.
    expect(complianceIssues(deck, null).length).toBe(1);
    const removed: string[] = [];
    const out = validateFigures({ body: "200+ languages, 200+ integrations" }, {}, "", removed, { checkTemplate: true, approved }) as { body: string };
    expect(out.body).toBe(`200+ languages, ${FIGURE_NEEDED} integrations`);
    expect(lintText("200+ languages, 200+ integrations", "", [], { approved }).length).toBe(1);
  });
});

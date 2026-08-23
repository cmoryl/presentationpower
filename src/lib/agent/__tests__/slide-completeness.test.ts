import { describe, expect, it } from "vitest";
import { MODULE_VARIANTS } from "@/lib/taxonomy";
import { resolveCapacity } from "@/lib/taxonomy-capacity";
import { auditDeckCompleteness, slideCompleteness } from "../slide-completeness";

/** A variant with a repeating item contract, used for the grid assertions. */
const gridVariant = MODULE_VARIANTS.find(
  (v) =>
    v.capacity.items && v.capacity.items.min >= 3 && v.capacity.items.max > v.capacity.items.min,
)!;

describe("slideCompleteness", () => {
  it("flags an empty slide as blocking", () => {
    const report = slideCompleteness({
      position: 0,
      variant_id: gridVariant.id,
      content: {},
    })!;
    expect(report.issues.some((i) => i.severity === "blocking")).toBe(true);
    expect(report.fill_score).toBeLessThan(60);
  });

  it("flags a grid written below its layout minimum", () => {
    const root = gridVariant.capacity.items!.path ?? "items";
    const itemFields = resolveCapacity(gridVariant)
      .fields.filter((f) => f.item)
      .map((f) => f.path.replace(/^[^.]+\[\]\./, ""));
    const row = Object.fromEntries(itemFields.map((k) => [k, "Written content for this card"]));
    const report = slideCompleteness({
      position: 1,
      variant_id: gridVariant.id,
      content: { title: "A title", [root]: [row] },
      notes: "notes",
    })!;
    expect(report.issues.some((i) => i.code === "items_below_min")).toBe(true);
  });

  it("reports advisory-only when slots are full but capacity is not maxed", () => {
    const root = gridVariant.capacity.items!.path ?? "items";
    const itemFields = resolveCapacity(gridVariant)
      .fields.filter((f) => f.item)
      .map((f) => f.path.replace(/^[^.]+\[\]\./, ""));
    const rows = Array.from({ length: gridVariant.capacity.items!.min }, (_, i) =>
      Object.fromEntries(
        itemFields.map((k) => [k, `Card ${i + 1} content long enough to read as written copy`]),
      ),
    );
    const topFields = resolveCapacity(gridVariant).fields.filter((f) => !f.item);
    const content: Record<string, unknown> = { [root]: rows };
    for (const f of topFields) {
      content[f.path] =
        f.kind === "number" ? 1 : "A written value that carries the point of this slide clearly";
    }
    const report = slideCompleteness({
      position: 2,
      variant_id: gridVariant.id,
      content,
      notes: "What the presenter says here.",
    })!;
    expect(report.issues.some((i) => i.severity === "blocking")).toBe(false);
  });

  it("marks a missing speaker note as advisory only", () => {
    const report = slideCompleteness({
      position: 3,
      variant_id: gridVariant.id,
      content: {},
      notes: null,
    })!;
    expect(report.issues.some((i) => i.code === "missing_notes" && i.severity === "advisory")).toBe(
      true,
    );
  });
});

describe("auditDeckCompleteness", () => {
  it("is not ok while any slide has a blocking gap, worst first", () => {
    const report = auditDeckCompleteness([
      { position: 0, variant_id: gridVariant.id, content: {}, notes: null },
    ]);
    expect(report.ok).toBe(false);
    expect(report.blocking_slides).toBe(1);
    expect(report.incomplete[0]!.position).toBe(0);
    expect(report.instruction).toContain("blocking");
  });

  it("can suppress advisory noise", () => {
    const report = auditDeckCompleteness(
      [{ position: 0, variant_id: gridVariant.id, content: {}, notes: null }],
      { include_advisory: false },
    );
    expect(report.incomplete[0]!.issues.every((i) => i.severity === "blocking")).toBe(true);
  });
});

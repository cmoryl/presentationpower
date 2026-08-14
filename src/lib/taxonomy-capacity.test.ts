import { describe, it, expect } from "vitest";
import {
  assertCapacityIntegrity,
  capacityProblems,
  resolveCapacity,
} from "./taxonomy-capacity";
import { MODULE_VARIANTS, byId, type ModuleVariant } from "./taxonomy";

const variant = (id: string): ModuleVariant => {
  const v = byId(MODULE_VARIANTS, id);
  if (!v) throw new Error(`fixture missing: ${id}`);
  return v;
};

const budget = (id: string, path: string) =>
  resolveCapacity(variant(id)).fields.find((f) => f.path === path);

describe("capacity is addressable by field", () => {
  it("holds for all 190 variants", () => {
    expect(MODULE_VARIANTS.length).toBe(190);
    expect(() => assertCapacityIntegrity()).not.toThrow();
  });

  it("gives every editable text field its own budget", () => {
    for (const v of MODULE_VARIANTS) {
      const resolved = new Set(resolveCapacity(v).fields.map((f) => f.path));
      for (const f of v.editableFields) expect(resolved.has(f)).toBe(true);
    }
  });

  it("leaves no orphan budgets", () => {
    for (const v of MODULE_VARIANTS) {
      const declared = new Set(v.editableFields);
      for (const f of resolveCapacity(v).fields) expect(declared.has(f.path)).toBe(true);
    }
  });

  // The three variants that motivated the change.
  it("MV-REC-NEXT separates the recommendation headline from the rationale prose", () => {
    expect(budget("MV-REC-NEXT", "recommendation")).toMatchObject({ kind: "text", chars: 100 });
    expect(budget("MV-REC-NEXT", "rationale")).toMatchObject({ kind: "text", chars: 320 });
  });

  it("MV-CLOSE-CTA budgets all four fields, not two", () => {
    const fields = resolveCapacity(variant("MV-CLOSE-CTA")).fields;
    expect(fields.map((f) => f.path).sort()).toEqual([
      "followUp",
      "message",
      "nextSteps",
      "owner",
    ]);
    for (const f of fields) expect(f.chars).toBeGreaterThan(0);
  });

  it("MV-INS-SO-WHAT budgets all three prose slots", () => {
    for (const path of ["insight", "soWhat", "nowWhat"]) {
      expect(budget("MV-INS-SO-WHAT", path)).toMatchObject({ kind: "text", chars: 180 });
    }
  });

  it("declares a type, not a length, for non-text fields", () => {
    for (const v of MODULE_VARIANTS) {
      for (const f of resolveCapacity(v).fields) {
        if (f.kind !== "text") expect(f.chars).toBeUndefined();
      }
    }
  });

  it("prefixes item fields with their collection root", () => {
    const withItems = MODULE_VARIANTS.filter((v) => v.capacity.items?.fields);
    expect(withItems.length).toBeGreaterThan(20);
    for (const v of withItems) {
      const root = v.capacity.items?.path ?? "items";
      for (const f of resolveCapacity(v).fields.filter((x) => x.item)) {
        expect(f.path.startsWith(`${root}[].`)).toBe(true);
      }
    }
  });
});

describe("the invariant actually fails on bad input", () => {
  const base = variant("MV-REC-NEXT");

  it("flags an editable field with no budget", () => {
    const bad = { ...base, editableFields: [...base.editableFields, "mystery"] };
    expect(capacityProblems(bad)).toContainEqual(
      expect.stringContaining('editable field "mystery" has no capacity entry'),
    );
  });

  it("flags a budget with no field", () => {
    const bad = {
      ...base,
      capacity: {
        ...base.capacity,
        fields: { ...base.capacity.fields, ghost: { kind: "text" as const, chars: 40 } },
      },
    };
    expect(capacityProblems(bad)).toContainEqual(
      expect.stringContaining('capacity budget "ghost" matches no editable field'),
    );
  });

  it("flags a non-positive text budget", () => {
    const bad = {
      ...base,
      capacity: {
        ...base.capacity,
        fields: { ...base.capacity.fields, rationale: { kind: "text" as const, chars: 0 } },
      },
    };
    expect(capacityProblems(bad)).toContainEqual(
      expect.stringContaining("non-positive character budget"),
    );
  });

  it("assert throws listing every offence at once", () => {
    const bad = { ...base, editableFields: ["a", "b"] };
    expect(() => assertCapacityIntegrity([bad])).toThrow(/4 problems/);
  });
});

import { describe, expect, it } from "vitest";

import {
  LEGAL_CASE_STUDIES,
  LEGAL_PRACTICE_AREAS,
  findLegalCaseStudy,
} from "@/lib/print-library/legal-case-studies";

describe("legal case study library", () => {
  it("ships the full ingested set with unique slugs", () => {
    expect(LEGAL_CASE_STUDIES.length).toBeGreaterThanOrEqual(30);
    const slugs = new Set(LEGAL_CASE_STUDIES.map((c) => c.slug));
    expect(slugs.size).toBe(LEGAL_CASE_STUDIES.length);
  });

  it("gives every seed printable content", () => {
    for (const c of LEGAL_CASE_STUDIES) {
      expect(c.title.length, c.slug).toBeGreaterThan(4);
      expect(c.teaser.length, c.slug).toBeGreaterThan(10);
      expect(c.sourceFile, c.slug).toMatch(/\.pdf$/);
      expect(c.content.challenge.body.length, c.slug).toBeGreaterThan(40);
      expect(c.content.solution.body.length, c.slug).toBeGreaterThan(40);
      expect(c.content.result.body.length, c.slug).toBeGreaterThan(40);
      expect(c.content.stats.length, c.slug).toBeGreaterThanOrEqual(3);
      expect(c.content.stats.length, c.slug).toBeLessThanOrEqual(4);
      expect(c.content.heroMedia?.imageUrl, c.slug).toMatch(/^\/__l5e\/assets-v1\//);
    }
  });

  it("keeps stat units to percentages only (currency folds into the value)", () => {
    for (const c of LEGAL_CASE_STUDIES) {
      for (const s of c.content.stats) {
        expect(s.label.length, c.slug).toBeGreaterThan(2);
        expect(String(s.value).length, c.slug).toBeGreaterThan(0);
        if (s.unit) expect(s.unit, c.slug).toBe("%");
      }
    }
  });

  it("groups every seed into a known practice area", () => {
    for (const c of LEGAL_CASE_STUDIES) {
      expect(LEGAL_PRACTICE_AREAS, c.slug).toContain(c.practice);
    }
  });

  it("looks seeds up by slug", () => {
    const first = LEGAL_CASE_STUDIES[0]!;
    expect(findLegalCaseStudy(first.slug)?.title).toBe(first.title);
    expect(findLegalCaseStudy("nope")).toBeUndefined();
  });
});

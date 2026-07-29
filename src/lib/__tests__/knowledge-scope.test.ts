import { describe, expect, it } from "vitest";
import {
  MIN_CHUNK_SIMILARITY,
  bm25Scores,
  knowledgeDivisionFilter,
  normalizeDivisionFilter,
  reciprocalRankFusion,
  tokenize,
} from "@/lib/knowledge-scope";

describe("knowledgeDivisionFilter", () => {
  // Regression: ingestion writes org-wide facts with owner_division_id='global',
  // but retrieval matched only `owner_division_id.is.null`. NULL never equals
  // 'global', so every division-scoped query dropped the entire curated KB.
  it("matches globally-owned entries, not just NULL-owned ones", () => {
    const f = knowledgeDivisionFilter("bm-tp-lifesci");
    expect(f).toContain("owner_division_id.eq.global");
    expect(f).toContain("visibility.eq.global");
  });

  it("still admits the division's own and explicitly shared entries", () => {
    const f = knowledgeDivisionFilter("bm-tp-media");
    expect(f).toContain("owner_division_id.eq.bm-tp-media");
    expect(f).toContain("shared_with_division_ids.cs.{bm-tp-media}");
  });

  it("does not admit another division's private entries", () => {
    expect(knowledgeDivisionFilter("bm-tp-media")).not.toContain("bm-tp-legal");
  });

  it("treats master/global as an unscoped request", () => {
    expect(normalizeDivisionFilter("master")).toBeNull();
    expect(normalizeDivisionFilter("global")).toBeNull();
    expect(normalizeDivisionFilter("  ")).toBeNull();
    expect(normalizeDivisionFilter("bm-product")).toBe("bm-product");
  });
});

describe("tokenize", () => {
  it("drops stopwords and short tokens", () => {
    expect(tokenize("This will help with the localization")).toEqual(["localization"]);
  });
});

describe("bm25Scores", () => {
  // Regression: the old scorer used String.includes(), so "art" matched
  // "chart" and "sign" matched "design".
  it("does not award substring false positives", () => {
    const [scoreForChart] = bm25Scores([{ text: "a chart of designs" }], "sign");
    expect(scoreForChart).toBe(0);
  });

  // Regression: the old scorer added +1 per term with no length normalisation,
  // so the longest document in the corpus won nearly every query.
  it("prefers a focused short doc over a long doc that merely mentions the term", () => {
    const focused = { text: "Localization throughput benchmark for localization teams" };
    const padded = {
      text: `localization ${"unrelated filler content about logistics ".repeat(80)}`,
    };
    const [focusedScore, paddedScore] = bm25Scores([focused, padded], "localization throughput");
    expect(focusedScore).toBeGreaterThan(paddedScore);
  });

  it("weights rare terms above terms present in every document", () => {
    const docs = [
      { text: "translation translation translation" },
      { text: "translation cryolipolysis" },
    ];
    const [common, rare] = bm25Scores(docs, "translation cryolipolysis");
    expect(rare).toBeGreaterThan(common);
  });

  it("boosts documents carrying a matching brand tag", () => {
    const doc = { text: "localization throughput", tags: ["bm-tp-lifesci"] };
    const untagged = { text: "localization throughput", tags: [] };
    const [tagged, plain] = bm25Scores([doc, untagged], "localization", ["bm-tp-lifesci"]);
    expect(tagged).toBeGreaterThan(plain);
  });

  it("returns an empty array for an empty corpus", () => {
    expect(bm25Scores([], "anything")).toEqual([]);
  });
});

describe("reciprocalRankFusion", () => {
  it("ranks an item agreed on by both retrievers above either list's top-only item", () => {
    const fused = reciprocalRankFusion([
      ["agreed", "keyword-only"],
      ["vector-only", "agreed"],
    ]);
    expect(fused.get("agreed")!).toBeGreaterThan(fused.get("keyword-only")!);
    expect(fused.get("agreed")!).toBeGreaterThan(fused.get("vector-only")!);
  });

  it("is scale-free: rank position, not raw score, decides", () => {
    const fused = reciprocalRankFusion([["a", "b", "c"]]);
    expect(fused.get("a")!).toBeGreaterThan(fused.get("b")!);
    expect(fused.get("b")!).toBeGreaterThan(fused.get("c")!);
  });
});

describe("MIN_CHUNK_SIMILARITY", () => {
  it("is a sane cosine floor so weak chunks are not injected as verified fact", () => {
    expect(MIN_CHUNK_SIMILARITY).toBeGreaterThan(0);
    expect(MIN_CHUNK_SIMILARITY).toBeLessThan(0.5);
  });
});

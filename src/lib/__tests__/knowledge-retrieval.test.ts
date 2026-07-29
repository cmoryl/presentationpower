import { describe, expect, it } from "vitest";
import { dedupeKnowledge } from "@/lib/knowledge-dedupe";
import { divisionIdForPdfEntity } from "@/lib/pdf-ingest.functions";

describe("divisionIdForPdfEntity", () => {
  it("maps GlobalLink sub-product slugs to the GlobalLink division", () => {
    expect(divisionIdForPdfEntity("globallink-ccms")).toBe("bm-division");
    expect(divisionIdForPdfEntity("globallink-web")).toBe("bm-division");
  });

  it("falls back to the longest matching parent prefix for unknown sub-products", () => {
    // Not in the table — must inherit GlobalLink rather than become NULL, which
    // would make every chunk invisible to division-filtered vector search.
    expect(divisionIdForPdfEntity("globallink-vasont")).toBe("bm-division");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(divisionIdForPdfEntity("  GlobalLink-CCMS ")).toBe("bm-division");
  });

  it("returns null for genuinely unrelated slugs", () => {
    expect(divisionIdForPdfEntity("acme-widgets")).toBeNull();
  });

  it("does not prefix-match a bare slug against an unrelated key", () => {
    expect(divisionIdForPdfEntity("global")).toBeNull();
  });
});

describe("dedupeKnowledge", () => {
  it("collapses the same fact mirrored across knowledge_entries and oracle", () => {
    const out = dedupeKnowledge([
      { id: "kb:1", title: "Retention uplift", body: "Clients see a 32% uplift in retention." },
      { id: "oracle:1", title: "Retention uplift", body: "Clients see a 32% uplift in retention." },
    ]);
    expect(out).toHaveLength(1);
    // First-listed source wins, so callers control which copy survives.
    expect(out[0].id).toBe("kb:1");
  });

  it("ignores punctuation and casing differences between copies", () => {
    const out = dedupeKnowledge([
      { id: "kb:1", title: "Retention Uplift", body: "Clients see a 32% uplift." },
      { id: "oracle:1", title: "retention uplift", body: "Clients see a 32% uplift" },
    ]);
    expect(out).toHaveLength(1);
  });

  it("keeps distinct facts that share a generic title", () => {
    const out = dedupeKnowledge([
      { id: "kb:1", title: "Overview", body: "GlobalLink powers continuous localization." },
      { id: "kb:2", title: "Overview", body: "Trial Interactive runs eTMF for sponsors." },
    ]);
    expect(out).toHaveLength(2);
  });

  it("keeps empty rows rather than collapsing them into one", () => {
    const out = dedupeKnowledge([
      { id: "kb:1", title: "", body: "" },
      { id: "kb:2", title: "", body: "" },
    ]);
    expect(out).toHaveLength(2);
  });
});

// PPTX parity guard for the quote family, the maturity curve and the event
// (NEXT agenda) deck export. Each of these used to lose its design on export:
// the quote treatments fell through to the generic italic renderer, the maturity
// curve was routed to a flattened plate, and the agenda boards had no PowerPoint
// output at all. These assertions pin those three fixes in place.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  NATIVE_EMITTER_VARIANT_IDS,
  hasNativeVariantEmitter,
  needsGraphicPlate,
} from "../export-native-variants";
import { MODULE_VARIANTS } from "../taxonomy";

const QUOTE_FAMILY = [
  "MV-QUOTE-CARD",
  "MV-QUOTE-PORTRAIT",
  "MV-QUOTE-METRIC",
  "MV-QUOTE-MULTI",
  "MV-QUOTE-POSTER",
] as const;

function exportSource(): string {
  return readFileSync(resolve(process.cwd(), "src/lib/pptx-export.ts"), "utf8");
}

describe("quote family exports natively", () => {
  it("covers every quote variant in the taxonomy", () => {
    const taxonomyQuotes = MODULE_VARIANTS.filter((v) => v.id.startsWith("MV-QUOTE-")).map((v) => v.id);
    expect([...taxonomyQuotes].sort()).toEqual([...QUOTE_FAMILY].sort());
  });

  it("routes each quote treatment to a native emitter, not a fused plate", () => {
    for (const id of QUOTE_FAMILY) {
      expect(NATIVE_EMITTER_VARIANT_IDS).toContain(id);
      expect(hasNativeVariantEmitter(id)).toBe(true);
      expect(needsGraphicPlate(id)).toBe(false);
    }
  });

  it("keeps the designed furniture (mark, kicker rule, attribution) per treatment", () => {
    const src = exportSource();
    for (const fn of [
      "renderQuoteCard",
      "renderQuotePortrait",
      "renderQuoteMetric",
      "renderQuoteMulti",
      "renderQuotePoster",
    ]) {
      expect(src).toContain(`function ${fn}(`);
    }
    for (const helper of ["addQuoteGlyph", "addQuoteKicker", "addQuoteAttribution"]) {
      expect(src).toContain(`function ${helper}(`);
    }
    // The metric treatment must still export its outcome figure column.
    const metric = src.slice(src.indexOf("function renderQuoteMetric("));
    expect(metric.slice(0, 2600)).toContain("metricLabel");
  });
});

describe("maturity curve exports as real objects", () => {
  it("is native and no longer plated", () => {
    expect(hasNativeVariantEmitter("MV-MATURITY-CURVE")).toBe(true);
    expect(needsGraphicPlate("MV-MATURITY-CURVE")).toBe(false);
  });

  it("carries the subtitle band, area wash and live-milestone halo", () => {
    const src = exportSource();
    const start = src.indexOf("function renderMaturityCurve(");
    const body = src.slice(start, src.indexOf("\nfunction renderJourneyMap(", start));
    expect(body).toContain("str(c.subtitle)");
    expect(body).toMatch(/Area wash under the ramp/);
    expect(body).toMatch(/halo/i);
    expect(body).toContain("YOU ARE HERE");
    // Notes still share one baseline band so captions cannot collide.
    expect(body).toContain("bandW");
  });
});

describe("event agenda deck export", () => {
  it("ships an editable PowerPoint builder wired into the export package", () => {
    const deck = readFileSync(resolve(process.cwd(), "src/lib/next-agenda-pptx.ts"), "utf8");
    expect(deck).toContain("export async function buildAgendaPptx");
    // One slide per resolved page (multi-day + overflow), sized to the board.
    expect(deck).toContain("agendaPages(config)");
    expect(deck).toContain("defineLayout");
    // Programme rows must be a native table, not a picture of one.
    expect(deck).toContain("addTable");

    const pkg = readFileSync(resolve(process.cwd(), "src/lib/next-agenda-export.ts"), "utf8");
    expect(pkg).toContain("buildAgendaPptx");
    expect(pkg).toContain("powerpoint/");
    expect(pkg).toContain("deckSlides");
  });
});

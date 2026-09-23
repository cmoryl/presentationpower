import { describe, expect, it } from "vitest";
import { londonPriceList, martPriceListSvg } from "@/lib/next-mart-price-list";
import { LONDON_STOP } from "@/lib/next-mart-stops";
import { buildMartPriceListPdf, buildMartPriceListPptx, buildMartPriceListDocx, exportMartPriceListPack } from "@/lib/next-mart-price-list-export";

describe("mart price list", () => {
  const cfg = londonPriceList();
  it("svg", () => { expect(martPriceListSvg(cfg, LONDON_STOP)).toContain("PRICE LIST"); });
  it("pdf", async () => { const r = await buildMartPriceListPdf(cfg, LONDON_STOP); expect(r.bytes.byteLength).toBeGreaterThan(1000); });
  it("pptx", async () => { const r = await buildMartPriceListPptx(cfg, LONDON_STOP); expect(r.blob.size).toBeGreaterThan(1000); });
  it("docx", async () => { const r = await buildMartPriceListDocx(cfg, LONDON_STOP); expect(r.blob.size).toBeGreaterThan(500); });
  it("pack", async () => { const r = await exportMartPriceListPack(cfg, LONDON_STOP); expect(r.blob.size).toBeGreaterThan(2000); });
});

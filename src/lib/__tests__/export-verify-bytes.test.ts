import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { pdfPageCount, pngDimensions, verifyExportBytes } from "../export-verify-bytes";

function pngHeader(width: number, height: number, pad = 4096): Uint8Array {
  const bytes = new Uint8Array(pad);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8);
  const be = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  bytes.set(be(width), 16);
  bytes.set(be(height), 20);
  return bytes;
}

function textBytes(s: string, pad = 0): Uint8Array {
  const enc = new TextEncoder().encode(s);
  if (enc.length >= pad) return enc;
  const out = new Uint8Array(pad);
  out.set(enc, 0);
  return out;
}

describe("verifyExportBytes", () => {
  it("reads PNG dimensions and enforces expected size", () => {
    const png = pngHeader(1080, 1350);
    expect(pngDimensions(png)).toEqual({ width: 1080, height: 1350 });
    expect(verifyExportBytes(png, "png", { width: 1080, height: 1350 }).ok).toBe(true);
    const wrong = verifyExportBytes(png, "png", { width: 1200, height: 1350 });
    expect(wrong.ok).toBe(false);
    expect(wrong.problems.join()).toMatch(/width 1080/);
  });

  it("rejects a truncated or mis-signed image", () => {
    expect(verifyExportBytes(new Uint8Array(64), "png").ok).toBe(false);
    expect(verifyExportBytes(pngHeader(10, 10, 100), "png").problems.join()).toMatch(/bytes/);
    const jpg = new Uint8Array(1024);
    jpg.set([0xff, 0xd8, 0xff], 0);
    expect(verifyExportBytes(jpg, "jpg").ok).toBe(true);
    expect(verifyExportBytes(new Uint8Array(1024), "jpg").ok).toBe(false);
  });

  it("checks PDF header, trailer and page count", () => {
    const pdf = textBytes(
      `%PDF-1.7\n1 0 obj<</Type /Page /X 1>>endobj\n2 0 obj<</Type /Page /X 2>>endobj\ntrailer\n%%EOF`,
      2048,
    );
    // Zero-padding keeps %%EOF inside the trailing window we scan.
    const tail = new Uint8Array(pdf.length + 5);
    tail.set(pdf, 0);
    tail.set(new TextEncoder().encode("%%EOF"), pdf.length);
    expect(pdfPageCount(tail)).toBe(2);
    const v = verifyExportBytes(tail, "pdf", { pages: 2 });
    expect(v.ok).toBe(true);
    expect(verifyExportBytes(tail, "pdf", { pages: 3 }).ok).toBe(false);
    expect(verifyExportBytes(textBytes("not a pdf", 2048), "pdf").ok).toBe(false);
  });

  it("verifies a real zip and a pptx package shape", async () => {
    const plain = new JSZip();
    plain.file("a.txt", "hello");
    const zipBytes = await plain.generateAsync({ type: "uint8array" });
    expect(verifyExportBytes(zipBytes, "zip").ok).toBe(true);
    // A zip missing OOXML parts must fail the pptx check.
    expect(verifyExportBytes(zipBytes, "pptx", { minBytes: 64 }).ok).toBe(false);

    const deck = new JSZip();
    deck.file("[Content_Types].xml", "<Types/>");
    deck.file("ppt/presentation.xml", "<p:presentation/>");
    deck.file("ppt/slides/slide1.xml", "<p:sld/>");
    const pptx = await deck.generateAsync({ type: "uint8array" });
    const verdict = verifyExportBytes(pptx, "pptx", { minBytes: 64 });
    expect(verdict.ok).toBe(true);
    expect(verdict.detail).toMatch(/1 slide entries/);
  });

  it("verifies svg and html documents", () => {
    expect(verifyExportBytes(textBytes('<?xml version="1.0"?><svg xmlns="x"></svg>'), "svg").ok).toBe(
      true,
    );
    expect(verifyExportBytes(textBytes("<!doctype html><html></html>", 512), "html").ok).toBe(true);
    expect(verifyExportBytes(textBytes("plain text", 512), "html").ok).toBe(false);
  });
});

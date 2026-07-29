import { describe, it, expect } from "vitest";
import { __testables, emfToPngBytes } from "../emf-raster";

const { decodeDib, largestWmfDib, decodeEmfPlusImage, isWmf } = __testables;

function bmpInfoHeader(width: number, height: number, bitCount: number, clrUsed = 0) {
  const h = new Uint8Array(40);
  const dv = new DataView(h.buffer);
  dv.setUint32(0, 40, true);
  dv.setInt32(4, width, true);
  dv.setInt32(8, height, true);
  dv.setUint16(12, 1, true);
  dv.setUint16(14, bitCount, true);
  dv.setUint32(32, clrUsed, true);
  return h;
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

describe("emf-raster extended containers", () => {
  it("decodes an 8-bit palettised packed DIB", () => {
    const header = bmpInfoHeader(2, 1, 8, 2);
    // palette: BGRA
    const palette = new Uint8Array([0, 0, 255, 0, 0, 255, 0, 0]); // red, green
    const row = new Uint8Array(4); // stride padded to 4
    row[0] = 0;
    row[1] = 1;
    const dib = decodeDib(concat([header, palette, row]), 0, null, 0);
    expect(dib && "rgba" in dib).toBe(true);
    const rgba = (dib as { rgba: Uint8Array }).rgba;
    expect([...rgba.subarray(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...rgba.subarray(4, 8)]).toEqual([0, 255, 0, 255]);
  });

  it("decodes 16-bit 555 pixels", () => {
    const header = bmpInfoHeader(1, 1, 16);
    const row = new Uint8Array(4);
    new DataView(row.buffer).setUint16(0, 0x7c00, true); // pure red
    const dib = decodeDib(concat([header, row]), 0, null, 0) as { rgba: Uint8Array };
    expect([...dib.rgba]).toEqual([255, 0, 0, 255]);
  });

  it("passes BI_PNG payloads straight through", () => {
    const header = bmpInfoHeader(4, 4, 24);
    new DataView(header.buffer).setUint32(16, 5, true); // BI_PNG
    new DataView(header.buffer).setUint32(20, 12, true); // sizeImage
    const payload = new Uint8Array(12).fill(9);
    const out = decodeDib(concat([header, payload]), 0, null, 0);
    expect(out && "png" in out).toBe(true);
  });

  it("recovers a packed DIB from a placeable WMF StretchDIB record", async () => {
    const header = bmpInfoHeader(2, 1, 24);
    const row = new Uint8Array(8); // 2px * 3 bytes padded to 8
    row[0] = 0;
    row[1] = 0;
    row[2] = 255; // red (BGR)
    const dibBytes = concat([header, row]);

    const params = new Uint8Array(22);
    const recordBody = concat([params, dibBytes]);
    const sizeWords = (6 + recordBody.length) / 2;
    const record = new Uint8Array(6 + recordBody.length);
    const rdv = new DataView(record.buffer);
    rdv.setUint32(0, sizeWords, true);
    rdv.setUint16(4, 0x0f43, true); // META_STRETCHDIB
    record.set(recordBody, 6);

    const placeable = new Uint8Array(22);
    new DataView(placeable.buffer).setUint32(0, 0x9ac6cdd7, true);
    const metaHeader = new Uint8Array(18);
    const mdv = new DataView(metaHeader.buffer);
    mdv.setUint16(0, 1, true);
    mdv.setUint16(2, 9, true);

    const wmf = concat([placeable, metaHeader, record]);
    expect(isWmf(wmf, new DataView(wmf.buffer))).toBe(true);
    const found = largestWmfDib(wmf) as { width: number; height: number };
    expect(found?.width).toBe(2);
    const png = await emfToPngBytes(wmf);
    expect(png?.[1]).toBe(0x50); // "P" of the PNG signature
  });

  it("un-premultiplies EMF+ 32bppPARGB bitmaps", () => {
    const data = new Uint8Array(28 + 4);
    const dv = new DataView(data.buffer);
    dv.setUint32(4, 1, true); // Type: bitmap
    dv.setUint32(8, 1, true); // width
    dv.setUint32(12, 1, true); // height
    dv.setInt32(16, 4, true); // stride
    dv.setUint32(20, (32 << 8) | 0x40000 | 0x8000, true); // 32bpp, alpha, premultiplied
    dv.setUint32(24, 0, true); // pixel data follows
    data.set([64, 64, 64, 128], 28); // premultiplied grey at 50% alpha
    const out = decodeEmfPlusImage(data) as { rgba: Uint8Array };
    expect(out.rgba[3]).toBe(128);
    expect(out.rgba[0]).toBeGreaterThan(120);
  });

  it("returns null for undecodable bytes", async () => {
    expect(await emfToPngBytes(new Uint8Array(32))).toBeNull();
  });
});

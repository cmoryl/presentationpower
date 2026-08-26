// -----------------------------------------------------------------------------
// Shared Gouraud mesh gradient (PDF Shading Type 4).
//
// WHY: ground gradients were tessellated into hundreds of thin vector strips.
// They print fine, but in Illustrator they arrive as ~500–800 sliver paths that
// are painful to select or recolour. A Type 4 free-form Gouraud-shaded triangle
// mesh is a single native object: Illustrator opens it as an editable gradient
// mesh, it scales losslessly, and it needs no clipping hacks.
// -----------------------------------------------------------------------------

import {
  PDFDocument,
  PDFDict,
  PDFName,
  type PDFPage,
  type PDFRef,
} from "pdf-lib";

export type MeshRgb = [number, number, number];

/** Returns the 0–1 RGB colour at a point inside the sheet, in PDF points. */
export type MeshSampler = (xPt: number, yPt: number) => MeshRgb;

/**
 * Serialise a free-form Gouraud triangle mesh covering [0,w]×[0,h].
 * Record layout (BitsPerFlag 8, BitsPerCoordinate 16, BitsPerComponent 8):
 *   flag(1) x(2) y(2) r(1) g(1) b(1)
 */
export function buildGouraudMesh(
  widthPt: number,
  heightPt: number,
  sampler: MeshSampler,
  cells = 44,
): Uint8Array {
  const verts: MeshRgb[][] = [];
  for (let row = 0; row <= cells; row += 1) {
    const line: MeshRgb[] = [];
    for (let col = 0; col <= cells; col += 1) {
      line.push(sampler((col / cells) * widthPt, (row / cells) * heightPt));
    }
    verts.push(line);
  }

  const record = 9;
  const triangles = cells * cells * 2;
  const data = new Uint8Array(triangles * 3 * record);
  let o = 0;
  const push = (col: number, row: number, flag: number) => {
    const x = Math.round((col / cells) * 65535);
    const y = Math.round((row / cells) * 65535);
    const [r, g, b] = verts[row]![col]!;
    data[o++] = flag;
    data[o++] = (x >> 8) & 255;
    data[o++] = x & 255;
    data[o++] = (y >> 8) & 255;
    data[o++] = y & 255;
    data[o++] = Math.round(r * 255);
    data[o++] = Math.round(g * 255);
    data[o++] = Math.round(b * 255);
  };
  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      // Triangle 1: (col,row) (col+1,row) (col+1,row+1)
      push(col, row, 0);
      push(col + 1, row, 0);
      push(col + 1, row + 1, 0);
      // Triangle 2: (col,row) (col+1,row+1) (col,row+1)
      push(col, row, 0);
      push(col + 1, row + 1, 0);
      push(col, row + 1, 0);
    }
  }
  return data;
}

/** Dictionary entries shared by both the pdf-lib and raw-string writers. */
export function meshShadingEntries(widthPt: number, heightPt: number): string {
  return (
    `/Type /Shading /ShadingType 4 /ColorSpace /DeviceRGB ` +
    `/BitsPerCoordinate 16 /BitsPerComponent 8 /BitsPerFlag 8 ` +
    `/Decode [0 ${round3(widthPt)} 0 ${round3(heightPt)} 0 1 0 1 0 1]`
  );
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Register the mesh as a shading resource on the page and return its resource
 * name. Paint it with the `sh` operator (inside any active clip path).
 */
export function registerMeshShading(
  doc: PDFDocument,
  page: PDFPage,
  widthPt: number,
  heightPt: number,
  sampler: MeshSampler,
): { name: PDFName; ref: PDFRef } {
  const data = buildGouraudMesh(widthPt, heightPt, sampler);
  const stream = doc.context.flateStream(data, {
    Type: PDFName.of("Shading"),
    ShadingType: 4,
    ColorSpace: PDFName.of("DeviceRGB"),
    BitsPerCoordinate: 16,
    BitsPerComponent: 8,
    BitsPerFlag: 8,
    Decode: [0, widthPt, 0, heightPt, 0, 1, 0, 1, 0, 1],
  });
  const ref = doc.context.register(stream);

  const resources =
    page.node.lookupMaybe(PDFName.of("Resources"), PDFDict) ?? doc.context.obj({});
  if (!page.node.has(PDFName.of("Resources"))) {
    page.node.set(PDFName.of("Resources"), resources);
  }
  const shading =
    resources.lookupMaybe(PDFName.of("Shading"), PDFDict) ?? doc.context.obj({});
  if (!resources.has(PDFName.of("Shading"))) {
    resources.set(PDFName.of("Shading"), shading);
  }
  const name = PDFName.of("Sh0");
  shading.set(name, ref);
  return { name, ref };
}

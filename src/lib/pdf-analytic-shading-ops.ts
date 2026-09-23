// -----------------------------------------------------------------------------
// Raw-string writers for analytic (editable) PDF gradients.
//
// The London/pillar `.ai` masters are assembled byte by byte, not through
// pdf-lib, so these two writers need nothing but string maths. They live apart
// from pdf-analytic-shading.ts on purpose: that module imports pdf-lib for the
// document-level registrar, and any page that merely previews a master used to
// drag the whole PDF library into its first load through this import.
// -----------------------------------------------------------------------------

const r3 = (n: number) => (Number.isFinite(n) ? Math.round(n * 1000) / 1000 : 0);

/**
 * The pattern dictionary body; the caller registers it as an object and points
 * `/Pattern << /P0 n 0 R >>` at it.
 */
export function patternDictBody(shadingObjNum: number, matrix?: number[]): string {
  const m = matrix ?? [1, 0, 0, 1, 0, 0];
  return (
    `<< /Type /Pattern /PatternType 2 /Matrix [${m.map(r3).join(" ")}] ` +
    `/Shading ${shadingObjNum} 0 R >>`
  );
}

/** Content-stream operators that fill a rectangle with a registered pattern. */
export function patternFillOps(
  name: string,
  box: { x: number; y: number; w: number; h: number },
): string {
  return (
    `q /Pattern cs /${name} scn ` +
    `${r3(box.x)} ${r3(box.y)} ${r3(box.w)} ${r3(box.h)} re f Q\n`
  );
}

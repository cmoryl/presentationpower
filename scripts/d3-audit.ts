import { QEII_FLOOR_VECTORS } from "@/lib/next-london-qeii-vectors";
for (const [id, rec] of Object.entries(QEII_FLOOR_VECTORS as any)) {
  const shapes = (rec as any).shapes ?? [];
  let pts = 0, curves = 0, subs = 0;
  const fills: Record<string, number> = {};
  for (const s of shapes) {
    const d: string = s.d ?? "";
    pts += (d.match(/[LlMm]/g) ?? []).length;
    curves += (d.match(/[CcQqSsTt]/g) ?? []).length;
    subs += (d.match(/[Mm]/g) ?? []).length;
    fills[s.fill ?? "none"] = (fills[s.fill ?? "none"] ?? 0) + 1;
    if (s.stroke) fills["stroke:" + s.stroke] = (fills["stroke:" + s.stroke] ?? 0) + 1;
  }
  console.log(id, "shapes", shapes.length, "pts", pts, "curves", curves, "subpaths", subs,
    "labels", ((rec as any).labels ?? []).length);
  console.log("   fills", JSON.stringify(fills));
}

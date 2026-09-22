import { qeiiPlanState } from "@/lib/next-london-qeii-plan";
import { qeiiPlanLayout, qeiiLabelGroups, qeiiFontSize } from "@/lib/next-london-qeii-layout";
import { qeiiHolderBox, qeiiObjectBoxes, qeiiRectInside } from "@/lib/next-london-qeii-geometry";
import { LONDON_VENUE_SHEETS } from "@/lib/next-london-venue-sheets";

for (const sheet of LONDON_VENUE_SHEETS) {
  const st = qeiiPlanState(sheet.id);
  if (!st?.rebuilt) continue;
  const floor = st.floor;
  const lay = qeiiPlanLayout(floor, { showUse: true, showMarks: true });
  const wide = lay.notes.filter((n) => /printed wider/.test(n));
  if (!wide.length) continue;
  console.log("==", sheet.id, floor.title, "w", floor.w, "h", floor.h);
  for (const n of wide) console.log("  note:", n);
  for (const b of lay.blocks) {
    if (!wide.some((n) => n.startsWith(b.room + " "))) continue;
    const g = qeiiLabelGroups(floor).find((gg) => gg.labels.map((l) => l.text).join(" ").replace(/-\s/g, "-") === b.room);
    const holder = g ? qeiiHolderBox(floor.shapes, g.x, g.y) : undefined;
    console.log("  block", JSON.stringify({ room: b.room, lines: b.lines, use: b.useLines, size: b.size, marks: b.marks.length, markH: b.markH, box: b.box, anchor: g && { x: g.x, y: g.y, angle: g.angle, size: g.size }, baseSize: g && qeiiFontSize(g.labels[0]!, floor), holder }));
    if (holder) {
      console.log("    inside?", qeiiRectInside(b.box, holder, b.size * 0.22));
      console.log("    holder w/h", (holder.x1 - holder.x0).toFixed(2), (holder.y1 - holder.y0).toFixed(2), "block w/h", (b.box.x1 - b.box.x0).toFixed(2), (b.box.y1 - b.box.y0).toFixed(2));
    }
    const objs = qeiiObjectBoxes(floor.shapes, floor.w * floor.h);
    if (holder) {
      const inHolder = objs.filter((o) => o.x1 > holder.x0 && o.x0 < holder.x1 && o.y1 > holder.y0 && o.y0 < holder.y1);
      console.log("    objects in holder", inHolder.length, JSON.stringify(inHolder.slice(0, 6)));
    }
  }
}

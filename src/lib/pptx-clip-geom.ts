// -----------------------------------------------------------------------------
// Zip pass: swap tagged objects onto native custom geometry
// -----------------------------------------------------------------------------
// pptxgenjs can only emit preset geometry (`a:prstGeom`), so an exported clipped
// card or shape-cropped photograph arrives as a plain rectangle. The outline is
// carried on the object name as `[cg:…]` (see export-clip-geom.ts) and replaced
// here, on the finished part, for both shapes (`p:sp`) and pictures (`p:pic`).
//
// A picture whose geometry is a custom path is exactly what PowerPoint's own
// "Crop to Shape" produces: the bitmap stays a replaceable picture object and
// the outline stays editable under Edit Points.
// -----------------------------------------------------------------------------

import { custGeomXml, parseClipGeomTag, stripClipGeomTag, CLIP_GEOM_TAG_RE } from "./export-clip-geom";

const OBJECT_RE = /<p:(sp|pic)>[\s\S]*?<\/p:\1>/g;

/** Apply every `[cg:…]` outline in one slide part and strip the tags. */
export function withCustomGeometry(xml: string): string {
  if (!CLIP_GEOM_TAG_RE.test(xml)) return xml;
  return xml.replace(OBJECT_RE, (obj) => {
    const nameMatch = /name="([^"]*)"/.exec(obj);
    if (!nameMatch) return obj;
    const cmds = parseClipGeomTag(nameMatch[1]);
    // Always strip the tag, even when the outline could not be decoded, so an
    // internal marker never shows up in the user's selection pane.
    const cleaned = obj.replace(
      /name="([^"]*)"/,
      (_all, name: string) => `name="${stripClipGeomTag(name) || "TP Shape"}"`,
    );
    if (!cmds) return cleaned;

    const geom = custGeomXml(cmds);
    let replaced = false;
    const out = cleaned.replace(/<p:spPr(\s[^>]*)?>[\s\S]*?<\/p:spPr>|<p:spPr(\s[^>]*)?\/>/, (spPr) => {
      if (/<a:custGeom/.test(spPr)) return spPr;
      if (/<a:prstGeom[^>]*\/>/.test(spPr)) {
        replaced = true;
        return spPr.replace(/<a:prstGeom[^>]*\/>/, geom);
      }
      if (/<a:prstGeom/.test(spPr)) {
        replaced = true;
        return spPr.replace(/<a:prstGeom[\s\S]*?<\/a:prstGeom>/, geom);
      }
      // No geometry at all: geometry follows the transform in the schema order.
      if (/<\/a:xfrm>/.test(spPr)) {
        replaced = true;
        return spPr.replace(/<\/a:xfrm>/, `</a:xfrm>${geom}`);
      }
      return spPr;
    });
    return replaced ? out : cleaned;
  });
}

// Explicit text insets for baked multi-paragraph bodies.
//
// When we emit a pre-measured line layout (one paragraph or `<a:br/>` per
// measured line), the geometry was computed against the *content* box we
// measured on screen. PowerPoint applies its default 0.05"/0.1" insets to any
// `<a:bodyPr>` that omits them, which shifts every baked line by up to a tenth
// of an inch and can push the last line out of the box.
//
// pptxgenjs writes `lIns`/`rIns` only when a non-zero inset is requested, so
// `inset: 0` bodies come through with the attributes missing entirely. This
// pass makes the zero explicit on baked bodies so the renderer has no default
// to fall back to. Single-paragraph bodies are left untouched: those still rely
// on PowerPoint for layout, where the default padding is the correct behaviour.

const INSETS = ["lIns", "tIns", "rIns", "bIns"] as const;

function isBaked(txBody: string): boolean {
  if (/<a:br\b/.test(txBody)) return true;
  const paras = txBody.match(/<a:p>/g)?.length ?? 0;
  return paras > 1;
}

/** Add `lIns`/`tIns`/`rIns`/`bIns="0"` to every baked body missing them. */
export function withExplicitInsets(slideXml: string): string {
  return slideXml.replace(/<p:txBody>[\s\S]*?<\/p:txBody>/g, (txBody) => {
    if (!isBaked(txBody)) return txBody;
    return txBody.replace(/<a:bodyPr\b([^>]*?)(\/?)>/, (tag, attrs: string, selfClose) => {
      const missing = INSETS.filter((k) => !new RegExp(`\\b${k}="`).test(attrs));
      if (!missing.length) return tag;
      const added = missing.map((k) => ` ${k}="0"`).join("");
      return `<a:bodyPr${attrs}${added}${selfClose ? "/" : ""}>`;
    });
  });
}

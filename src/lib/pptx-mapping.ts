// Heuristic mapping from parsed pptx slides → TransPerfect module variants.
// Text/structure only — we discard the source layout and re-author the content
// onto the closest approved variant.

import type { ParsedSlide } from "./pptx-import.functions";
import { MODULE_VARIANTS, byId } from "./taxonomy";
import type { SlideContent } from "./deck-store";

export type MappedSlide = {
  sectionId: string;
  variantId: string;
  layoutId: string;
  content: SlideContent;
  source: ParsedSlide;
  rationale: string;
};

export function mapParsedSlide(s: ParsedSlide, total: number): MappedSlide {
  const isFirst = s.index === 0;
  const isLast = s.index === total - 1;
  const title = (s.title || `Slide ${s.index + 1}`).trim();
  const lowTitle = title.toLowerCase();
  const bullets = s.bullets.filter(Boolean);

  let sectionId = "SF-05";
  let variantId = "MV-INS-CALLOUT";
  let content: SlideContent = { title };
  let rationale = "Narrative callout";

  if (isFirst || /^(cover|title)\b/i.test(title)) {
    sectionId = "SF-01";
    variantId = "MV-OP-COVER";
    content = {
      title,
      subtitle: bullets[0] ?? "",
      date: new Date().toLocaleDateString(),
    };
    rationale = "Cover — first slide";
  } else if (/agenda|contents|overview|what.?we.?ll cover/i.test(lowTitle) && bullets.length >= 2) {
    sectionId = "SF-01";
    variantId = "MV-OP-AGENDA";
    content = {
      title,
      items: bullets.slice(0, 6).map((b) => ({ label: b, body: "" })),
    };
    rationale = "Agenda — title + list of sections";
  } else if (/thank\s*you|thanks/i.test(lowTitle)) {
    sectionId = "SF-16";
    variantId = "MV-CLOSE-THANKS";
    content = { title, subtitle: bullets.join(" · ") };
    rationale = "Close — thanks";
  } else if (/q\s*&\s*a|questions\??$/i.test(lowTitle)) {
    sectionId = "SF-16";
    variantId = "MV-CLOSE-QNA";
    content = { title, subtitle: bullets[0] ?? "" };
    rationale = "Close — Q&A";
  } else if (/contact|get in touch/i.test(lowTitle)) {
    sectionId = "SF-16";
    variantId = "MV-CLOSE-CONTACT";
    content = { title, subtitle: bullets.join(" · ") };
    rationale = "Close — contact";
  } else if (
    bullets.length === 1 &&
    bullets[0].length > 60 &&
    /["“”"„]/.test(bullets[0])
  ) {
    sectionId = "SF-05";
    variantId = "MV-INS-QUOTE";
    content = {
      title,
      quote: bullets[0].replace(/^["“”"„]+|["“”"„]+$/g, ""),
      attribution: "",
      role: "",
    };
    rationale = "Quote — long body with quotation marks";
  } else if (bullets.length >= 2 && bullets.length <= 5 && bullets.every((b) => b.length < 180)) {
    const n = bullets.length;
    const pillar =
      n <= 2 ? "MV-SOL-PILLARS-2" :
      n === 3 ? "MV-SOL-PILLARS-3" :
      n === 4 ? "MV-SOL-PILLARS-4" : "MV-SOL-PILLARS-5";
    sectionId = "SF-06";
    variantId = pillar;
    content = {
      title,
      items: bullets.map((b) => {
        const m = b.split(/\s*[—–:-]\s+/);
        const head = (m[0] ?? b).slice(0, 80);
        const rest = m.slice(1).join(" — ").slice(0, 240);
        return { title: head, body: rest || head };
      }),
    };
    rationale = `Pillars — ${n} short bullets`;
  } else if (bullets.length >= 6) {
    sectionId = "SF-07";
    variantId = "MV-SOL-FEATURE-LIST";
    content = {
      title,
      items: bullets.slice(0, 10).map((b) => ({ label: b, body: "" })),
    };
    rationale = "Feature list — many bullets";
  } else if (bullets.length === 0) {
    sectionId = "SF-05";
    variantId = "MV-INS-BIG-IDEA";
    content = { title, idea: title, narrative: s.notes };
    rationale = "Big idea — title only";
  } else {
    sectionId = "SF-05";
    variantId = "MV-INS-CALLOUT";
    content = {
      title,
      insight: bullets[0],
      narrative: bullets.slice(1).join(" "),
    };
    rationale = "Callout — headline + supporting text";
  }

  if (isLast && !/^SF-16$/.test(sectionId) && bullets.length === 0) {
    sectionId = "SF-16";
    variantId = "MV-CLOSE-THANKS";
    content = { title, subtitle: "" };
    rationale = "Close — final slide";
  }

  const variant = byId(MODULE_VARIANTS, variantId) ?? MODULE_VARIANTS[0];
  const layoutId = variant.permittedLayoutIds[0];
  return {
    sectionId,
    variantId: variant.id,
    layoutId,
    content,
    source: s,
    rationale,
  };
}

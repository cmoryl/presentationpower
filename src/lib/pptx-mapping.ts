// Heuristic mapping from parsed pptx slides → TransPerfect module variants.
// Text + imagery: when a source slide has embedded images we route it onto
// an image-forward variant and attach the extracted data-URL via `mediaUrl`
// so the renderer preserves the original picture. Theme colors are surfaced
// separately and applied at the deck level.

import type { ParsedSlide, ParsedTheme } from "./pptx-import.functions";
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

export type MapOptions = {
  theme?: ParsedTheme;
};

export function mapParsedSlide(
  s: ParsedSlide,
  total: number,
  _opts: MapOptions = {},
): MappedSlide {
  const isFirst = s.index === 0;
  const isLast = s.index === total - 1;
  const title = (s.title || `Slide ${s.index + 1}`).trim();
  const lowTitle = title.toLowerCase();
  const bullets = s.bullets.filter(Boolean);
  const images = s.images ?? [];
  const hasImages = images.length > 0;
  const primaryImage = images[0];

  let sectionId = "SF-05";
  let variantId = "MV-INS-CALLOUT";
  let content: SlideContent = { title };
  let rationale = "Narrative callout";

  if (isFirst || /^(cover|title)\b/i.test(title)) {
    // Cover: prefer a media-forward cover when we have a hero image.
    sectionId = "SF-01";
    if (hasImages) {
      variantId = "MV-OP-COVER-MEDIA";
      content = {
        title,
        subtitle: bullets[0] ?? "",
        clientName: "",
        date: new Date().toLocaleDateString(),
        mediaUrl: primaryImage,
      };
      rationale = "Cover — first slide, hero image preserved";
    } else {
      variantId = "MV-OP-COVER";
      content = {
        title,
        subtitle: bullets[0] ?? "",
        date: new Date().toLocaleDateString(),
      };
      rationale = "Cover — first slide";
    }
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
    // Quote — use a photographic quote background when an image exists.
    sectionId = "SF-05";
    if (hasImages) {
      variantId = "MV-IMG-QUOTE-BG";
      content = {
        quote: bullets[0].replace(/^["“”"„]+|["“”"„]+$/g, ""),
        attribution: "",
        role: "",
        mediaUrl: primaryImage,
      };
      rationale = "Quote — with source image as backdrop";
    } else {
      variantId = "MV-INS-QUOTE";
      content = {
        title,
        quote: bullets[0].replace(/^["“”"„]+|["“”"„]+$/g, ""),
        attribution: "",
        role: "",
      };
      rationale = "Quote — long body with quotation marks";
    }
  } else if (hasImages && bullets.length <= 3) {
    // Image-forward: full-bleed hero when body is light; split when we have
    // supporting bullets.
    if (bullets.length === 0) {
      sectionId = "SF-05";
      variantId = "MV-IMG-FULL-BLEED";
      content = {
        kicker: "",
        title,
        body: s.notes ? "" : "",
        mediaUrl: primaryImage,
      };
      rationale = "Image-forward — full-bleed (source picture preserved)";
    } else {
      sectionId = "SF-06";
      variantId = "MV-IMG-SPLIT";
      content = {
        title,
        body: bullets.join(" ") ,
        caption: "",
        mediaUrl: primaryImage,
      };
      rationale = "Image-forward — split (source picture preserved)";
    }
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

  // If we didn't route to an image-forward variant but still have imagery,
  // keep the primary image on the record so downstream tooling (and manual
  // variant swaps to an image-friendly one) can still surface it.
  if (hasImages && !("mediaUrl" in content)) {
    content = { ...content, mediaUrl: primaryImage, extraImages: images.slice(1) };
  } else if (images.length > 1) {
    content = { ...content, extraImages: images.slice(1) };
  }

  if (isLast && !/^SF-16$/.test(sectionId) && bullets.length === 0 && !hasImages) {
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

import type { BrandGuide } from "@/lib/brand-guides";

export interface KitDocumentLink { label: string; url: string }
export interface KitDocumentAsset { title: string; image?: string; ground?: string; note?: string; links: KitDocumentLink[] }
export interface KitDocumentSection { id: string; title: string; paragraphs?: string[]; assets?: KitDocumentAsset[]; colours?: { name: string; hex: string; detail: string }[] }
export interface KitDocument {
  id: string; name: string; version: string; intro: string;
  primary: string; accent: string; font: "Geist" | "Poppins";
  cover?: string; publicUrl?: string; sections: KitDocumentSection[];
}
export type KitDocumentId = "next" | "san-juan-bowl" | "nexus" | "hackathon" | "legalweek" | "element";

export function selectKitDocumentSections(doc: KitDocument, ids: string[]): KitDocumentSection[] {
  const chosen = doc.sections.filter(s => ids.includes(s.id));
  if (!chosen.length) throw new Error("Choose at least one section.");
  return chosen;
}

export async function makeBrandGuideDocument(g: BrandGuide): Promise<KitDocument> {
  const { getDivisionLogos } = await import("@/lib/division-logos");
  const logos = getDivisionLogos(g.divisionId) ?? getDivisionLogos(g.slug);
  const assets: KitDocumentAsset[] = Object.entries(logos ?? {}).flatMap(([label, url]) => url && !/stackedWhite/.test(label) ? [{ title: label.replace(/([A-Z])/g, " $1"), image: url, ground: /white/i.test(label) ? g.primaryColors[0]?.hex : undefined, links: [{ label: "Download logo", url }] }] : []);
  return {
    id: g.slug, name: g.title, version: g.version, intro: g.intro, primary: g.primaryColors[0]?.hex ?? "#03002C", accent: g.secondaryColors[0]?.hex ?? "#003FC7", font: "Geist", cover: logos?.color ?? logos?.black,
    sections: [
      { id: "identity", title: "Identity & positioning", paragraphs: [g.subtitle, g.tagline ?? "", g.intro, ...(g.values ?? []).map(v => `${v.label}: ${v.description}`)] },
      { id: "logos", title: "Logos & usage", paragraphs: [g.logoNotes?.headline ?? "", g.logoNotes?.body ?? "", ...g.logoRules.map(r => `${r.do ? "Do" : "Don't"}: ${r.title}. ${r.description}`)], assets },
      { id: "colours", title: "Colour & accessibility", paragraphs: [g.colorAccessibility?.headline ?? "", ...(g.colorAccessibility?.notes ?? [])], colours: [...g.primaryColors, ...g.secondaryColors, ...g.tertiaryColors, ...g.neutrals].map(c => ({ name: c.name, hex: c.hex, detail: [c.role, c.rgb && `RGB ${c.rgb}`, c.cmyk && `CMYK ${c.cmyk}`, c.pantone && `Pantone ${c.pantone}`].filter(Boolean).join(" · ") })) },
      { id: "type", title: "Typography", paragraphs: [`Primary: ${g.typefacePrimary}. Web: ${g.typefaceWeb}.`, g.typeScaleNotes ?? "", ...[...g.headingScale, ...g.bodyScale].map(t => `${t.label} · ${t.sizePx}px · weight ${t.weight} · ${t.leading ?? ""} leading · ${t.sample}`)] },
      { id: "imagery", title: "Photography & visual direction", paragraphs: [g.photography ?? "", g.brandVisuals ?? "", ...(g.photographyRules?.do ?? []).map(t => `Do: ${t}`), ...(g.photographyRules?.dont ?? []).map(t => `Don't: ${t}`), g.iconography?.headline ?? "", g.iconography?.body ?? ""] },
      { id: "applications", title: "Applications & brand family", paragraphs: [...(g.subBrands ?? []).flatMap(s => [s.group, s.items.join(" · ")]), ...(g.socialMedia ?? []).flatMap(s => [s.platform, ...s.rules]), g.motion?.headline ?? "", g.motion?.body ?? ""] },
      { id: "resources", title: "Sources & downloads", assets: [{ title: "Brand source", note: "The web guide may require staff sign-in. Original source access is controlled by its owner.", links: [{ label: "Live brand guide (staff)", url: `/knowledge/brand-guides/${g.slug}` }, ...(g.sourceUrl ? [{ label: "Original source", url: g.sourceUrl }] : [])] }] },
    ],
  };
}

export async function makeKitDocument(id: KitDocumentId, shareUrl?: string): Promise<KitDocument> {
  if (id === "next") {
    const k = await import("@/lib/next-brand-kit");
    const { NEXT_GUIDE_VERSION } = await import("@/lib/next-brand-guide");
    const { logoFormats } = await import("@/lib/next-designer-pack");
    const { GRADIENT_RULES, RESIZE_RULES, REUSE_RULES, kitGradients } = await import("@/lib/next-brand-kit-guide");
    const families = await k.loadKitFamilies();
    return { id, name: "TransPerfect NEXT 2026", version: NEXT_GUIDE_VERSION, intro: "The established NEXT identity, event-only track colours and supplied artwork. Artwork previews are reference images, not press masters or proof of installation.", primary: k.NEXT_CORE_COLORS[0].hex, accent: k.NEXT_DIVISIONS[0].accent, font: "Geist", cover: k.NEXT_DIVISIONS[0].lockups.find(l => l.variant === "color")?.src, publicUrl: shareUrl,
      sections: [
        { id: "logos", title: "Logos, tracks & motifs", paragraphs: k.NEXT_LOGO_RULES.map(r => `${r.do ? "Do" : "Don't"}: ${r.title}. ${r.body}`), assets: [...k.NEXT_DIVISIONS.flatMap(d => d.lockups.map(l => ({ title: `${d.name} · ${l.lockupLabel} · ${l.variantLabel}`, image: l.src, ground: l.variant !== "color" ? k.NEXT_CORE_COLORS[0].hex : undefined, links: Object.entries(logoFormats(l.src)).map(([label, url]) => ({ label: label.toUpperCase(), url })) }))), ...k.NEXT_MARKS.map(m => ({ title: m.name, image: m.src, ground: k.NEXT_CORE_COLORS[0].hex, note: m.description, links: [{ label: "SVG", url: m.src }] }))] },
        { id: "colours", title: "Colour & event-only accents", paragraphs: [k.BRAND_KIT_COLOUR_NOTE, ...k.BRAND_KIT_PRINT_NOTES], colours: [...k.NEXT_CORE_COLORS.map(c => ({ name: c.name, hex: c.hex, detail: `RGB ${c.rgb} · ${c.role}` })), ...k.NEXT_DIVISIONS.map(d => ({ name: d.name, hex: d.accent, detail: `RGB ${d.rgb} · CMYK ${d.cmyk} · ${d.pantone} · NEXT event only` }))] },
        { id: "type", title: "Typography", paragraphs: [k.NEXT_TYPOGRAPHY.headlineNote, ...k.NEXT_TYPOGRAPHY.scale.map(t => `${t.label} · ${t.sizePx}px · weight ${t.weight} · ${t.sample}`)] },
        { id: "grounds", title: "Grounds, resizing & reuse", paragraphs: [...GRADIENT_RULES.map(r => `${r.do ? "Do" : "Don't"}: ${r.text}`), ...RESIZE_RULES, ...Object.entries(REUSE_RULES).map(([key, value]) => `${key}: ${value}`), ...kitGradients().map(g => `${g.label}: ${g.stops.map(s => s.hex).join(" → ")}. ${g.note}`)] },
        ...families.map(f => ({ id: `templates-${f.id}`, title: f.label, assets: f.templates.map(t => ({ title: `${t.divisionName} · ${t.code} · ${t.format}`, image: t.exampleUrl, note: `${t.size} · Supplied artwork preview`, links: t.downloadUrl ? [{ label: "Download supplied master", url: t.downloadUrl }] : t.exampleUrl ? [{ label: "Artwork reference", url: t.exampleUrl }] : [] })) })),
        { id: "digital", title: "Digital, slides & applications", paragraphs: [...k.KIT_DIGITAL_FORMATS.map(f => `${f.label}: ${f.width} × ${f.height}px`), ...k.NEXT_APPLICATION_RULES.flatMap(r => [r.surface, ...r.rules])] },
        { id: "planning", title: "Starting a new city", paragraphs: k.NEW_CITY_CHECKLIST.map(c => `${c.step}: ${c.body}`) },
        { id: "resources", title: "Resources & delivery", paragraphs: ["Real attendee photographs stay private and are not included in this PDF. Downloaded artwork retains its own production and approval requirements."], assets: [{ title: "Live kit", links: shareUrl ? [{ label: "Open partner kit", url: shareUrl }] : [{ label: "Open staff kit", url: "/events/next/brand-kit" }] }] },
      ],
    };
  }
  if (id === "san-juan-bowl") {
    const b = await import("@/lib/san-juan-bowl");
    const [{ default: guide }, { default: pack }, { default: single }, { default: lettering }, { default: curved }] = await Promise.all([import("@/assets/sjb/brand-guide.pdf.asset.json"), import("@/assets/sjb/master-logo-kit.zip.asset.json"), import("@/assets/san-juan-bowl/1c-pack.zip.asset.json"), import("@/assets/san-juan-bowl/u-sjb-san-juan-lettering-Navy.png.asset.json"), import("@/assets/sjb/curved-lettering.svg.asset.json")]);
    const singles = await Promise.all([import("@/assets/san-juan-bowl/u-sjb-1c-black.png.asset.json"), import("@/assets/san-juan-bowl/u-sjb-1c-Navy.png.asset.json"), import("@/assets/san-juan-bowl/u-sjb-1c-white.png.asset.json")]);
    return { id, name: b.SJB_EVENT.name, version: "1.0", intro: `${b.SJB_EVENT.venue} · ${b.SJB_EVENT.city} · ${b.SJB_EVENT.datesLabel} · ${b.SJB_EVENT.kickoffLabel} · ${b.SJB_EVENT.matchupLabel}`, primary: b.SJB_COLORS[0].hex, accent: b.SJB_COLORS[2].hex, font: "Geist", cover: b.SJB_LOGOS[0].png, publicUrl: "/share/san-juan-bowl",
      sections: [
        { id: "logos", title: "Official logo & usage", paragraphs: [...b.SJB_LOGO_RULES, ...b.SJB_MIN_SIZES.map(m => `${m.context}: ${m.minimum}. ${m.note}`), ...b.SJB_MISUSE.map(m => `${m.title}: ${m.detail}`)], assets: b.SJB_LOGOS.map(l => ({ title: l.label, image: l.png, ground: l.previewBg, links: [{ label: "SVG", url: l.svg }, { label: "PNG", url: l.png }, ...["pdf", "eps", "ai"].map(ext => ({ label: `${ext.toUpperCase()} (CMYK; proof first)`, url: `/downloads/sjb-logo/print/sjb-logo-${l.id}-cmyk${ext === "ai" ? "-illustrator" : ""}.${ext}` }))] })) },
        { id: "single", title: "Single-colour logos", paragraphs: ["Navy is preferred when the ink can be chosen. Black on light grounds and white on dark grounds when only black/white is available. Use supplied files, never recolour the full-colour badge.", b.SJB_CLEAR_SPACE.rule], assets: singles.map((s, i) => ({ title: ["Black", "Navy", "White"][i], image: s.default.url, ground: i === 2 ? b.SJB_COLORS[0].hex : undefined, links: [{ label: "Transparent PNG", url: s.default.url }, { label: "All single-colour vector files", url: single.url }] })) },
        { id: "lettering", title: "Limited-use lettering & palms", paragraphs: ["Limited use, by approval only. This is not an official Bowl logo.", "Use the supplied arched lettering without retyping, stretching or flattening the arch. Palm artwork is extracted from the supplied badge, not redrawn."], assets: [{ title: "Arched navy lettering", image: lettering.url, links: [{ label: "Transparent PNG", url: lettering.url }, { label: "Full vector pack", url: single.url }] }, { title: "Curved SAN JUAN BOWL lettering", image: curved.url, ground: b.SJB_COLORS[0].hex, links: [{ label: "SVG", url: curved.url }] }, ...["sjb-palms-pair", "sjb-palms-pair-1color", "sjb-palm-left", "sjb-palm-right"].map(p => ({ title: p.replace(/sjb-|-/g, " "), image: `/downloads/sjb-palms/${p}.svg`, links: [{ label: "SVG", url: `/downloads/sjb-palms/${p}.svg` }, { label: "PNG 2400", url: `/downloads/sjb-palms/${p}-2400.png` }] }))] },
        { id: "small", title: "Small-size mark", paragraphs: [b.SJB_SMALL_MARK.use, ...b.SJB_SMALL_MARK.rules], assets: [{ title: "Original badge, pre-sized", image: b.SJB_SMALL_MARK.svg, links: [...b.SJB_SMALL_MARK.files.map(f => ({ label: f.label, url: `${b.SJB_SMALL_MARK.dir}/${f.file}` })), { label: "All mark files", url: b.SJB_SMALL_MARK.pack }] }] },
        { id: "lockups", title: "Lockups", assets: b.SJB_LOCKUPS.items.map(l => ({ title: l.name, image: `${b.SJB_LOCKUPS.dir}/sjb-lockup-${l.id}-on-navy.svg`, ground: b.SJB_COLORS[0].hex, note: `${l.use} ${l.rules}`, links: [{ label: "Editable SVG · navy", url: `${b.SJB_LOCKUPS.dir}/sjb-lockup-${l.id}-on-navy.svg` }, { label: "Editable SVG · white", url: `${b.SJB_LOCKUPS.dir}/sjb-lockup-${l.id}-on-white.svg` }, { label: "Lockup pack", url: b.SJB_LOCKUPS.pack }] })) },
        { id: "colours", title: "Colour balance & readable pairings", paragraphs: [...b.SJB_COLOR_NOTES, `Suggested balance: ${b.SJB_COLOR_PROPORTION.map(p => `${p.id} ${p.pct}%`).join(" · ")}`, ...b.SJB_PAIRINGS.map(p => { const fg = b.SJB_COLORS.find(c => c.id === p.fg); const bg = b.SJB_COLORS.find(c => c.id === p.bg); return fg && bg ? `${fg.name} on ${bg.name}: ${b.sjbContrast(fg.hex, bg.hex).toFixed(1)}:1 contrast.` : ""; })], colours: b.SJB_COLORS.map(c => ({ name: c.name, hex: c.hex, detail: `RGB ${c.rgb} · CMYK ${c.cmyk} (proof first) · ${c.role}` })) },
        { id: "type", title: "Typography & naming", paragraphs: [b.SJB_TYPE_NOTE, ...b.SJB_TYPE_RULES, ...b.SJB_NAMING.map(n => `${n.label}: ${n.value}`)] },
        { id: "resources", title: "Downloads & official information", assets: [{ title: "Brand kit & source", links: [{ label: "Public kit · no sign-in", url: "/share/san-juan-bowl" }, { label: "Issued brand guide v1.0", url: guide.url }, { label: "Master logo ZIP v1.0", url: pack.url }, { label: "Official announcement", url: b.SJB_EVENT.announcementUrl }] }] },
      ],
    };
  }
  if (id === "element") {
    const [{ default: logo }, { default: sheet }, { ELEMENT_PDF_PALETTE, ELEMENT_PDF_RULES }] = await Promise.all([import("@/assets/element-logo.svg.asset.json"), import("@/assets/element-logo-set.png.asset.json"), import("@/lib/element-guide-content")]);
    return { id, name: "TransPerfect Element", version: "1.0", intro: "The five-brick E identity: fixed mark geometry, approved variants, compact monogram and the modular system descriptor.", primary: ELEMENT_PDF_PALETTE[0].hex, accent: ELEMENT_PDF_PALETTE[1].hex, font: "Geist", cover: logo.url,
      sections: [{ id: "logos", title: "Logo system & variants", paragraphs: ELEMENT_PDF_RULES, assets: [{ title: "Element identity", image: logo.url, links: [{ label: "SVG", url: logo.url }] }, { title: "Source identity sheet", image: sheet.url, links: [{ label: "PNG", url: sheet.url }] }] }, { id: "colours", title: "Element palette", colours: ELEMENT_PDF_PALETTE.map(c => ({ name: c.label, hex: c.hex, detail: "Approved identity palette shown on the live guide." })) }, { id: "type", title: "Typography", paragraphs: ["Geist Sans for supporting content. Preserve the supplied wordmark and descriptor artwork; do not retype the logo."] }],
    };
  }
  const { SUPPLIED_KITS } = await import("@/lib/supplied-event-kits");
  const k = SUPPLIED_KITS[id];
  const logo = k.logos.find(l => !/White|BG/i.test(l.name));
  const fileAsset = (f: (typeof k.pieces)[number]): KitDocumentAsset => ({ title: f.title, image: f.preview ?? undefined, note: [f.size, f.format].filter(Boolean).join(" · "), links: [{ label: `Download ${f.format}`, url: f.file }] });
  return { id, name: k.name, version: "1.0", intro: k.intro, primary: k.colours[0]?.hex ?? "#03002C", accent: k.colours[1]?.hex ?? "#003FC7", font: "Poppins", cover: logo?.url ?? k.pieces.find(p => p.preview)?.preview ?? undefined,
    sections: [
      { id: "identity", title: "Identity & logo usage", paragraphs: [k.intro, k.logoNote, ...k.donts.map(d => `Don't: ${d}`), ...(k.donts.length ? [] : ["No logo don'ts were supplied for this event; none are invented here."])], assets: k.logos.map(l => ({ title: l.name.replace(/_/g, " "), image: /SVG|PNG/i.test(l.format) ? l.url : undefined, ground: /White|DarkBlueBG/i.test(l.name) ? k.colours[0]?.hex : /LightBlueBG/i.test(l.name) ? k.colours[1]?.hex : undefined, links: [{ label: l.format, url: l.url }] })) },
      { id: "colours", title: "Colour & reproduction", paragraphs: [k.gradientNote ?? "", k.colourNote ?? "Values as printed in the supplied guide. Preserve original inks; no automatic RGB-to-CMYK conversion."], colours: k.colours.map(c => ({ name: c.name, hex: c.hex, detail: [c.rgb && `RGB ${c.rgb}`, c.cmyk && `CMYK ${c.cmyk}`, c.pantone && `Pantone ${c.pantone}`, c.source].filter(Boolean).join(" · ") })) },
      { id: "type", title: "Typography", paragraphs: [k.typography] },
      ...(k.map ? [{ id: "map", title: "Supplied venue map", assets: [fileAsset(k.map)] }] : []),
      ...[...new Set(k.pieces.map(p => p.group))].map((group, i) => ({ id: `pieces-${i}`, title: group, assets: k.pieces.filter(p => p.group === group).map(fileAsset) })),
      { id: "live", title: "Original live files", paragraphs: ["Designer-supplied source files are served unchanged. Preview images are not press masters."], assets: k.live.map(fileAsset) },
      { id: "resources", title: "Sources & downloads", paragraphs: k.guide ? ["The original supplied guide is preserved separately; this document is an Element-generated kit reference."] : ["No original brand guide was supplied. This is an Element-generated reference drawn only from the supplied assets, not newly approved brand policy."], assets: k.guide ? [fileAsset(k.guide)] : [] },
    ],
  };
}
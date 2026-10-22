// STARTER TEMPLATES — pre-built page layouts on the new-print-asset page.
// ---------------------------------------------------------------------------
// Brochures, posters and event signage built from the same insertable section
// modules as every other print piece, so each section stays editable,
// replaceable and removable. Copy is bracketed placeholder text only — no
// facts, figures, names or dates are invented; people fill them in.

import type { PrintSection, PrintPageSize, PrintExportPrefs } from "@/lib/print-assets.types";

export type StarterTemplateGroup = "brochure" | "poster" | "signage";

export type StarterTemplate = {
  id: string;
  group: StarterTemplateGroup;
  title: string;
  description: string;
  pageSize: PrintPageSize;
  /** Size the export panel opens on (posters / signage are custom inches). */
  exportPrefs?: PrintExportPrefs;
  sizeLabel: string;
  sections: PrintSection[];
};

export const STARTER_GROUPS: Array<{ id: StarterTemplateGroup; label: string }> = [
  { id: "brochure", label: "Brochures" },
  { id: "poster", label: "Posters" },
  { id: "signage", label: "Event signage" },
];

const stat = (n: number) => ({ value: "[00]", unit: "", label: `[Figure ${n} label — from an approved source]` });

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "brochure-tri",
    group: "brochure",
    title: "Service brochure",
    description: "Photo opener, challenge / approach / impact, proof figures and a call to action.",
    pageSize: "A4",
    sizeLabel: "A4 portrait",
    sections: [
      { id: "s1", kind: "hero", variantId: "hero-photo-band", eyebrow: "[Service line]", title: "[Brochure headline]", summary: "[One-sentence promise for the reader]" },
      { id: "s2", kind: "narrative", variantId: "narrative-tri-card", items: [
        { heading: "The challenge", body: "[What the customer is up against]" },
        { heading: "Our approach", body: "[How we solve it]" },
        { heading: "The impact", body: "[What changes for them]" },
      ] },
      { id: "s3", kind: "stats", variantId: "stat-callout-row-portrait", items: [stat(1), stat(2), stat(3)] },
      { id: "s4", kind: "contact", variantId: "contact-cta-band", title: "[Call to action]", ctaLabel: "[Button label]", url: "" },
    ],
  },
  {
    id: "brochure-features",
    group: "brochure",
    title: "Capabilities brochure",
    description: "Type-led opener, six capability cards and a contact card.",
    pageSize: "Letter",
    sizeLabel: "US Letter portrait",
    sections: [
      { id: "s1", kind: "hero", variantId: "hero-type-stack", eyebrow: "[Division]", title: "[What we do, in one line]", summary: "[Short supporting sentence]" },
      { id: "s2", kind: "feature-list", variantId: "feature-cards-3col", title: "[Capabilities]", items: [1, 2, 3, 4, 5, 6].map((n) => ({ verb: `[Capability ${n}]`, body: "[One line on what it does]" })) },
      { id: "s3", kind: "contact", variantId: "contact-expert-card", title: "[Talk to an expert]", name: "[Name]", role: "[Role]", email: "" },
    ],
  },
  {
    id: "poster-headline",
    group: "poster",
    title: "Headline poster",
    description: "One big message over a photo, with a single call to action.",
    pageSize: "A4",
    exportPrefs: { size: "Custom", customW: 18, customH: 24 },
    sizeLabel: "18 × 24 in (exports at custom size)",
    sections: [
      { id: "s1", kind: "hero", variantId: "hero-photo-fade", eyebrow: "[Eyebrow]", title: "[Poster headline]", summary: "[Supporting line]", heightPct: 70 },
      { id: "s2", kind: "contact", variantId: "contact-cta-band", title: "[Call to action]", ctaLabel: "[Button label]", url: "" },
    ],
  },
  {
    id: "poster-stats",
    group: "poster",
    title: "Proof-point poster",
    description: "Accent opener with three large figures — for walls and booths.",
    pageSize: "A4",
    exportPrefs: { size: "Custom", customW: 24, customH: 36 },
    sizeLabel: "24 × 36 in (exports at custom size)",
    sections: [
      { id: "s1", kind: "hero", variantId: "hero-accent-band", eyebrow: "[Eyebrow]", title: "[Poster headline]", summary: "[Supporting line]" },
      { id: "s2", kind: "stats", variantId: "stat-bento-portrait", items: [stat(1), stat(2), stat(3)] },
      { id: "s3", kind: "quote", variantId: "quote-inline-compact", text: "[Approved customer quote]", author: "[Name]", role: "[Role]" },
    ],
  },
  {
    id: "signage-welcome",
    group: "signage",
    title: "Welcome sign",
    description: "Event name, welcome line and a short agenda / room list.",
    pageSize: "A4",
    exportPrefs: { size: "Custom", customW: 22, customH: 28 },
    sizeLabel: "22 × 28 in (exports at custom size)",
    sections: [
      { id: "s1", kind: "hero", variantId: "hero-type-stack", eyebrow: "[Event name]", title: "Welcome", summary: "[Welcome line]", align: "center" },
      { id: "s2", kind: "table", variantId: "table-spec-rows", title: "[Today]", rows: [1, 2, 3, 4].map((n) => ({ label: `[Time ${n}]`, value: `[Session / room ${n}]` })) },
    ],
  },
  {
    id: "signage-room",
    group: "signage",
    title: "Room / session sign",
    description: "Room name, session title and speaker — for doors and easels.",
    pageSize: "A4",
    exportPrefs: { size: "Custom", customW: 11, customH: 17 },
    sizeLabel: "11 × 17 in (exports at custom size)",
    sections: [
      { id: "s1", kind: "hero", variantId: "hero-accent-band", eyebrow: "[Room name]", title: "[Session title]", summary: "[Time]" },
      { id: "s2", kind: "contact", variantId: "contact-expert-card", title: "Speaker", name: "[Speaker name]", role: "[Role, company]" },
    ],
  },
  {
    id: "signage-sponsors",
    group: "signage",
    title: "Sponsor board",
    description: "Thank-you headline over a logo wall.",
    pageSize: "A4",
    exportPrefs: { size: "Custom", customW: 24, customH: 36 },
    sizeLabel: "24 × 36 in (exports at custom size)",
    sections: [
      { id: "s1", kind: "hero", variantId: "hero-type-stack", eyebrow: "[Event name]", title: "Thank you to our sponsors", align: "center" },
      { id: "s2", kind: "logo-grid", variantId: "logo-wall-portrait", items: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ name: `[Sponsor ${n}]` })) },
    ],
  },
];

/** Content for a new piece built from a starter: the page shell is blank and
 *  every visible block is a section module, so each can be swapped or removed. */
export function starterContent(t: StarterTemplate, title: string): Record<string, unknown> {
  return {
    title,
    eyebrow: "",
    client: "",
    industry: "",
    audience: "",
    summary: title,
    challenge: { heading: "", body: "" },
    solution: { heading: "", body: "" },
    result: { heading: "", body: "" },
    stats: [],
    engagement: { title: "", bullets: [] },
    modules: structuredClone(t.sections).map((s, i) => ({ ...s, id: `${t.id}-${i}-${Math.random().toString(36).slice(2, 8)}` })),
    // The case-study shell's own masthead/story blocks are hidden — the
    // template's hero section is the opener.
    hiddenSections: ["hero", "masthead", "story", "stats", "quote", "engagement", "cta"],
  };
}

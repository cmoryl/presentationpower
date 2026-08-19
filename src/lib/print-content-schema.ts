// Schema descriptors for print-asset content payloads. Drive the schema-first
// Content inspector panel AND a dev-time / test-time reachability assertion:
// every string leaf in the content object must be reachable through some
// FieldSpec, so a new field can't silently ship as un-editable dead content.
//
// This file is the single source of truth for what a user can edit in the
// print editor. Update this whenever CaseStudyContent / SpotlightContent /
// EBrochureContent / AdaptorBriefContent grow a new field.

import type {
  AdaptorBriefContent,
  CaseStudyContent,
  EBrochureContent,
  PrintAssetKind,
  PrintLogoColor,
  SpotlightContent,
} from "./print-assets.types";
import {
  emptyAdaptorBrief,
  emptyCaseStudy,
  emptyEBrochure,
  emptySpotlight,
} from "./print-assets.types";

// ---- FieldSpec -------------------------------------------------------------

export type EnumOption = { value: string; label: string };

export type FieldSpec =
  /** Scalar text field. `multiline` renders a textarea, otherwise an input. */
  | {
      kind: "string";
      path: string;
      label: string;
      multiline?: boolean;
      placeholder?: string;
      optional?: boolean;
    }
  /** Small controlled enum (e.g. logoColor auto|black|white). */
  | { kind: "enum"; path: string; label: string; options: EnumOption[]; optional?: boolean }
  /** A nested object with its own scalar children. */
  | { kind: "object"; path: string; label: string; fields: FieldSpec[]; optional?: boolean }
  /** Array of strings — add/remove/reorder plaintext rows. */
  | {
      kind: "stringArray";
      path: string;
      label: string;
      itemLabel?: string;
      placeholder?: string;
      optional?: boolean;
      minItems?: number;
      maxItems?: number;
    }
  /** Array of objects — each row edited via nested FieldSpecs. */
  | {
      kind: "objectArray";
      path: string;
      label: string;
      itemLabel: string;
      itemFactory: () => Record<string, unknown>;
      itemFields: FieldSpec[];
      optional?: boolean;
      minItems?: number;
      maxItems?: number;
    };

/** Top-level content schema for one PrintAssetKind. */
export type ContentSchema = {
  kind: PrintAssetKind;
  label: string;
  fields: FieldSpec[];
};

// ---- Shared building blocks -----------------------------------------------

const LOGO_COLOR_OPTIONS: EnumOption[] = [
  { value: "auto", label: "Auto (from hero)" },
  { value: "black", label: "Black / navy" },
  { value: "white", label: "White" },
];

/** Fields common to every kind — the header eyebrow + lockup override. */
function headerFields(): FieldSpec[] {
  return [
    {
      kind: "string",
      path: "eyebrow",
      label: "Eyebrow",
      placeholder: "e.g. Case study",
      optional: true,
    },
    {
      kind: "enum",
      path: "logoColor",
      label: "Lockup ink",
      options: LOGO_COLOR_OPTIONS,
      optional: true,
    },
  ];
}

/** {label, value, unit?, delta?, trend?, caption?} — used by every kind. */
const statItemFields: FieldSpec[] = [
  { kind: "string", path: "label", label: "Label", placeholder: "Fewer review cycles" },
  { kind: "string", path: "value", label: "Value", placeholder: "62" },
  { kind: "string", path: "unit", label: "Unit", placeholder: "% / M / x", optional: true },
  { kind: "string", path: "delta", label: "Delta", placeholder: "+12%", optional: true },
  {
    kind: "enum",
    path: "trend",
    label: "Trend",
    options: [
      { value: "", label: "—" },
      { value: "up", label: "Up" },
      { value: "down", label: "Down" },
      { value: "flat", label: "Flat" },
    ],
    optional: true,
  },
  { kind: "string", path: "caption", label: "Caption", optional: true },
];

const emptyStat = () => ({ label: "", value: "", unit: "", delta: "", trend: "", caption: "" });

/** {text, author, role?, company?} — pull-quote. */
const quoteFields: FieldSpec[] = [
  {
    kind: "string",
    path: "text",
    label: "Quote",
    multiline: true,
    placeholder: "They didn't just translate our content…",
  },
  { kind: "string", path: "author", label: "Author", placeholder: "VP of Global Marketing" },
  { kind: "string", path: "role", label: "Role", optional: true },
  { kind: "string", path: "company", label: "Company", optional: true },
];

/** {name, role?, email?} — expert card. */
const expertFields: FieldSpec[] = [
  { kind: "string", path: "name", label: "Name" },
  { kind: "string", path: "role", label: "Role", optional: true },
  { kind: "string", path: "email", label: "Email", optional: true },
];

// ---- Per-kind schemas ------------------------------------------------------

export const CASE_STUDY_SCHEMA: ContentSchema = {
  kind: "case-study",
  label: "Case study",
  fields: [
    ...headerFields(),
    { kind: "string", path: "client", label: "Client", placeholder: "Acme Global" },
    { kind: "string", path: "industry", label: "Industry", optional: true },
    { kind: "string", path: "audience", label: "Audience", optional: true },
    { kind: "string", path: "summary", label: "Summary", multiline: true, optional: true },
    {
      kind: "object",
      path: "challenge",
      label: "Challenge",
      fields: [
        { kind: "string", path: "heading", label: "Heading" },
        { kind: "string", path: "body", label: "Body", multiline: true },
      ],
    },
    {
      kind: "object",
      path: "solution",
      label: "Approach",
      fields: [
        { kind: "string", path: "heading", label: "Heading" },
        { kind: "string", path: "body", label: "Body", multiline: true },
      ],
    },
    {
      kind: "object",
      path: "result",
      label: "Outcome",
      fields: [
        { kind: "string", path: "heading", label: "Heading" },
        { kind: "string", path: "body", label: "Body", multiline: true },
      ],
    },
    {
      kind: "objectArray",
      path: "stats",
      label: "Stats",
      itemLabel: "Stat",
      itemFactory: emptyStat,
      itemFields: statItemFields,
      minItems: 0,
      maxItems: 6,
    },
    { kind: "object", path: "quote", label: "Pull quote", optional: true, fields: quoteFields },
    {
      kind: "object",
      path: "expert",
      label: "Expert / contact",
      optional: true,
      fields: expertFields,
    },
    {
      kind: "object",
      path: "cta",
      label: "Call to action",
      optional: true,
      fields: [
        { kind: "string", path: "label", label: "Label", placeholder: "Start a conversation" },
        { kind: "string", path: "url", label: "URL", optional: true },
        { kind: "string", path: "subhead", label: "Subhead", optional: true },
        { kind: "string", path: "buttonLabel", label: "Button label", optional: true },
      ],
    },
    {
      kind: "object",
      path: "engagement",
      label: "Engagement snapshot",
      optional: true,
      fields: [
        { kind: "string", path: "title", label: "Title", optional: true },
        {
          kind: "stringArray",
          path: "bullets",
          label: "Bullets",
          itemLabel: "Bullet",
          minItems: 0,
          maxItems: 6,
        },
      ],
    },
    {
      kind: "object",
      path: "footer",
      label: "Footer links",
      optional: true,
      fields: [
        {
          kind: "stringArray",
          path: "links",
          label: "Links",
          itemLabel: "Link",
          placeholder: "https://…",
          minItems: 0,
          maxItems: 4,
        },
      ],
    },
  ],
};

export const SPOTLIGHT_SCHEMA: ContentSchema = {
  kind: "spotlight",
  label: "Product spotlight",
  fields: [
    ...headerFields(),
    {
      kind: "string",
      path: "productName",
      label: "Product name",
      placeholder: "GlobalLink Connect",
    },
    { kind: "string", path: "tagline", label: "Tagline", placeholder: "Enterprise localization…" },
    { kind: "string", path: "summary", label: "Summary", multiline: true, optional: true },
    {
      kind: "objectArray",
      path: "capabilities",
      label: "Capabilities",
      itemLabel: "Capability",
      itemFactory: () => ({ heading: "", body: "" }),
      itemFields: [
        { kind: "string", path: "heading", label: "Heading" },
        { kind: "string", path: "body", label: "Body", multiline: true },
      ],
      minItems: 1,
      maxItems: 6,
    },
    {
      kind: "objectArray",
      path: "stats",
      label: "Stats",
      itemLabel: "Stat",
      itemFactory: emptyStat,
      itemFields: statItemFields,
      minItems: 0,
      maxItems: 6,
    },
    { kind: "object", path: "quote", label: "Pull quote", optional: true, fields: quoteFields },
    {
      kind: "object",
      path: "expert",
      label: "Expert / contact",
      optional: true,
      fields: expertFields,
    },
    {
      kind: "object",
      path: "cta",
      label: "Call to action",
      optional: true,
      fields: [
        { kind: "string", path: "label", label: "Label" },
        { kind: "string", path: "url", label: "URL", optional: true },
      ],
    },
  ],
};

export const EBROCHURE_SCHEMA: ContentSchema = {
  kind: "ebrochure",
  label: "E-Brochure",
  fields: [
    ...headerFields(),
    { kind: "string", path: "title", label: "Title" },
    { kind: "string", path: "summary", label: "Summary", multiline: true, optional: true },
    {
      kind: "objectArray",
      path: "sections",
      label: "Sections",
      itemLabel: "Section",
      itemFactory: () => ({ heading: "", body: "", bullets: [] }),
      itemFields: [
        { kind: "string", path: "heading", label: "Heading" },
        { kind: "string", path: "body", label: "Body", multiline: true },
        {
          kind: "stringArray",
          path: "bullets",
          label: "Bullets",
          itemLabel: "Bullet",
          minItems: 0,
          maxItems: 6,
        },
      ],
      minItems: 1,
      maxItems: 4,
    },
    {
      kind: "objectArray",
      path: "stats",
      label: "Stats",
      itemLabel: "Stat",
      itemFactory: emptyStat,
      itemFields: statItemFields,
      minItems: 0,
      maxItems: 6,
    },
    { kind: "object", path: "quote", label: "Pull quote", optional: true, fields: quoteFields },
    {
      kind: "object",
      path: "discover",
      label: "Discover panel",
      optional: true,
      fields: [
        { kind: "string", path: "body", label: "Body", multiline: true },
        {
          kind: "stringArray",
          path: "bullets",
          label: "Bullets",
          itemLabel: "Bullet",
          minItems: 0,
          maxItems: 6,
        },
      ],
    },
    {
      kind: "object",
      path: "cta",
      label: "Call to action",
      optional: true,
      fields: [
        { kind: "string", path: "label", label: "Label" },
        { kind: "string", path: "url", label: "URL", optional: true },
        { kind: "string", path: "subhead", label: "Subhead", optional: true },
      ],
    },
  ],
};

export const ADAPTOR_BRIEF_SCHEMA: ContentSchema = {
  kind: "adaptor-brief",
  label: "Adaptor brief",
  fields: [
    ...headerFields(),
    { kind: "string", path: "title", label: "Title" },
    { kind: "string", path: "summary", label: "Summary", multiline: true, optional: true },
    {
      kind: "objectArray",
      path: "features",
      label: "Features",
      itemLabel: "Feature",
      itemFactory: () => ({ verb: "", body: "" }),
      itemFields: [
        { kind: "string", path: "verb", label: "Verb", placeholder: "Supports" },
        { kind: "string", path: "body", label: "Body", multiline: true },
      ],
      minItems: 1,
      maxItems: 6,
    },
    {
      kind: "stringArray",
      path: "knowHow",
      label: "We know how",
      itemLabel: "Point",
      minItems: 0,
      maxItems: 8,
    },
    { kind: "object", path: "quote", label: "Pull quote", optional: true, fields: quoteFields },
    {
      kind: "object",
      path: "cta",
      label: "Call to action",
      optional: true,
      fields: [
        { kind: "string", path: "label", label: "Label" },
        { kind: "string", path: "url", label: "URL", optional: true },
      ],
    },
  ],
};

export const MSA_PARTNERSHIP_SCHEMA: ContentSchema = {
  kind: "msa-partnership",
  label: "MSA partnership",
  fields: [
    ...headerFields(),
    { kind: "string", path: "partner", label: "Partner / account name" },
    { kind: "string", path: "partnerLogoUrl", label: "Partner logo URL", optional: true },
    { kind: "string", path: "intro", label: "Positioning line", multiline: true },
    {
      kind: "objectArray",
      path: "stats",
      label: "Relationship stats",
      itemLabel: "Stat",
      itemFactory: emptyStat,
      itemFields: statItemFields,
      minItems: 0,
      maxItems: 6,
    },
    {
      kind: "string",
      path: "partnershipNote",
      label: "Partnership paragraph",
      multiline: true,
    },
    { kind: "string", path: "solutionsTitle", label: "Solutions heading", optional: true },
    {
      kind: "objectArray",
      path: "solutions",
      label: "Solutions",
      itemLabel: "Solution",
      itemFactory: () => ({ label: "", icon: "" }),
      itemFields: [
        { kind: "string", path: "label", label: "Label" },
        { kind: "string", path: "icon", label: "Icon", optional: true },
      ],
      minItems: 0,
      maxItems: 12,
    },
    {
      kind: "objectArray",
      path: "scale",
      label: "Scale rail",
      itemLabel: "Metric",
      itemFactory: emptyStat,
      itemFields: statItemFields,
      minItems: 0,
      maxItems: 4,
    },
    { kind: "string", path: "departmentsTitle", label: "Departments heading", optional: true },
    {
      kind: "stringArray",
      path: "departments",
      label: "Departments supported",
      itemLabel: "Department",
      minItems: 0,
      maxItems: 20,
    },
    {
      kind: "object",
      path: "contacts",
      label: "Global contacts",
      optional: true,
      fields: [
        { kind: "string", path: "title", label: "Heading", optional: true },
        { kind: "string", path: "name", label: "Name", optional: true },
        { kind: "string", path: "role", label: "Role", optional: true },
        { kind: "string", path: "phone", label: "Phone", optional: true },
        { kind: "string", path: "email", label: "Email", optional: true },
        { kind: "string", path: "ctaLabel", label: "CTA label", optional: true },
        { kind: "string", path: "ctaEmail", label: "CTA email", optional: true },
      ],
    },
    { kind: "string", path: "footerUrl", label: "Footer URL", optional: true },
  ],
};

export const CONTENT_SCHEMAS: Record<PrintAssetKind, ContentSchema> = {
  "case-study": CASE_STUDY_SCHEMA,
  spotlight: SPOTLIGHT_SCHEMA,
  ebrochure: EBROCHURE_SCHEMA,
  "adaptor-brief": ADAPTOR_BRIEF_SCHEMA,
  "msa-partnership": MSA_PARTNERSHIP_SCHEMA,
};

// ---- Path utilities --------------------------------------------------------

/** Escape a segment for regex use (unused today, but handy for future). */
export function schemaFor(kind: PrintAssetKind): ContentSchema {
  return CONTENT_SCHEMAS[kind];
}

/** Walk a FieldSpec tree and return a matcher — accepts the concrete leaf
 *  path (e.g. "stats[2].label", "engagement.bullets[0]") and returns true
 *  if the schema covers it. Object-scoped enums (e.g. quote.trend) and
 *  logoColor / trend are covered too even though they're technically not
 *  strings at runtime. */
export function fieldMatcherFromSchema(schema: ContentSchema): (leafPath: string) => boolean {
  const specPatterns: RegExp[] = [];

  function walk(fields: FieldSpec[], prefix: string): void {
    for (const f of fields) {
      const p = prefix ? `${prefix}.${f.path}` : f.path;
      switch (f.kind) {
        case "string":
        case "enum":
          specPatterns.push(new RegExp("^" + escapeRegex(p) + "$"));
          break;
        case "stringArray":
          // e.g. "engagement.bullets" — leaves look like "engagement.bullets[0]"
          specPatterns.push(new RegExp("^" + escapeRegex(p) + "\\[\\d+\\]$"));
          break;
        case "object":
          walk(f.fields, p);
          break;
        case "objectArray":
          for (const child of f.itemFields) {
            const childPrefix = `${p}[__i__]`;
            const rendered = renderPath(childPrefix, child.path);
            switch (child.kind) {
              case "string":
              case "enum":
                specPatterns.push(
                  new RegExp("^" + escapeRegex(rendered).replace("__i__", "\\d+") + "$"),
                );
                break;
              case "stringArray":
                specPatterns.push(
                  new RegExp("^" + escapeRegex(rendered).replace("__i__", "\\d+") + "\\[\\d+\\]$"),
                );
                break;
              case "object":
                // Rare — recurse.
                walkNested(child, childPrefix);
                break;
              case "objectArray":
                walkNested(child, childPrefix);
                break;
            }
          }
          break;
      }
    }
  }

  function walkNested(f: FieldSpec, prefix: string): void {
    if (f.kind === "object") {
      walk(f.fields, prefix ? `${prefix}.${f.path}` : f.path);
    } else if (f.kind === "objectArray") {
      walk(f.itemFields, `${prefix}.${f.path}[__i__]`);
    }
  }

  function renderPath(prefix: string, path: string): string {
    return prefix ? `${prefix}.${path}` : path;
  }

  walk(schema.fields, "");

  return (leaf: string) => specPatterns.some((r) => r.test(leaf));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---- Reachability assertion (used by dev + tests) -------------------------

/** Recursively enumerate every leaf path (string, number, boolean) in `v`. */
export function enumerateLeafPaths(v: unknown, prefix = ""): string[] {
  if (v === null || v === undefined) return [];
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return prefix ? [prefix] : [];
  }
  if (Array.isArray(v)) {
    const out: string[] = [];
    v.forEach((item, i) => out.push(...enumerateLeafPaths(item, `${prefix}[${i}]`)));
    return out;
  }
  if (typeof v === "object") {
    const out: string[] = [];
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const p = prefix ? `${prefix}.${k}` : k;
      out.push(...enumerateLeafPaths(val, p));
    }
    return out;
  }
  return [];
}

/** Paths present on content that are NOT declared editable in the schema.
 *  `ignore` matches on the top-level segment (e.g. "heroMedia", "modules")
 *  because those are edited through their own dedicated panels and don't
 *  belong in the Content inspector. */
export function unreachablePaths(
  schema: ContentSchema,
  content: Record<string, unknown>,
  ignore: string[] = ["heroMedia", "modules"],
): string[] {
  const match = fieldMatcherFromSchema(schema);
  const leaves = enumerateLeafPaths(content);
  return leaves.filter((leaf) => {
    const top = leaf.replace(/\[\d+\].*$/, "").split(".")[0]!;
    if (ignore.includes(top)) return false;
    return !match(leaf);
  });
}

/** Build the union of "content-shape-ever-seen-in-the-wild" — every optional
 *  block populated — so the reachability check exercises the full surface,
 *  not just what emptyX() happens to seed. */
export function fullyPopulatedSample(kind: PrintAssetKind): Record<string, unknown> {
  const stats = [
    { label: "A", value: "1", unit: "x", delta: "+1%", trend: "up", caption: "cap" },
    { label: "B", value: "2", unit: "%", delta: "-1%", trend: "down", caption: "cap" },
  ];
  const quote = { text: "Q", author: "A", role: "R", company: "C" };
  const expert = { name: "N", role: "R", email: "e@e" };
  const heroMedia = { imageUrl: "https://example/img.jpg" };
  if (kind === "case-study") {
    return {
      ...(emptyCaseStudy({
        eyebrow: "Case study",
        logoColor: "black" as PrintLogoColor,
        client: "C",
        industry: "I",
        audience: "A",
        summary: "S",
        stats,
        quote,
        expert,
        cta: { label: "L", url: "https://u", subhead: "sub", buttonLabel: "B" },
        engagement: { title: "Snapshot", bullets: ["b1", "b2"] },
        footer: { links: ["https://a", "https://b"] },
        heroMedia,
        modules: [],
      }) as unknown as Record<string, unknown>),
    };
  }
  if (kind === "spotlight") {
    return emptySpotlight({
      eyebrow: "Spotlight",
      logoColor: "white" as PrintLogoColor,
      productName: "P",
      tagline: "T",
      summary: "S",
      capabilities: [
        { heading: "H1", body: "B1" },
        { heading: "H2", body: "B2" },
      ],
      stats,
      quote,
      expert,
      cta: { label: "L", url: "https://u" },
      heroMedia,
      modules: [],
    }) as unknown as Record<string, unknown>;
  }
  if (kind === "ebrochure") {
    return emptyEBrochure({
      eyebrow: "eBrochure",
      logoColor: "auto" as PrintLogoColor,
      title: "T",
      summary: "S",
      sections: [{ heading: "H", body: "B", bullets: ["x", "y"] }],
      stats,
      quote,
      discover: { body: "D", bullets: ["a", "b"] },
      cta: { label: "L", url: "https://u", subhead: "sub" },
      heroMedia,
      modules: [],
    }) as unknown as Record<string, unknown>;
  }
  return emptyAdaptorBrief({
    eyebrow: "Adaptor brief",
    logoColor: "auto" as PrintLogoColor,
    title: "T",
    summary: "S",
    features: [{ verb: "V", body: "B" }],
    knowHow: ["k1", "k2"],
    quote,
    cta: { label: "L", url: "https://u" },
    heroMedia,
    modules: [],
  }) as unknown as Record<string, unknown>;
}

// Explicit re-exports of the content types so consumers don't need two imports.
export type { CaseStudyContent, SpotlightContent, EBrochureContent, AdaptorBriefContent };

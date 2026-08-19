// Right-side drawer for inserting shared modules into a print asset.
// Supports both click-to-insert and drag-and-drop from the drawer onto
// the Shared modules panel drop zones.

import { useState } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import type {
  PrintContactVariant,
  PrintNarrativeVariant,
  PrintTableVariant,
  PrintExpertiseVariant,
  PrintFeatureVariant,
  PrintLogoGridVariant,
  PrintQuoteVariant,
  PrintSection,
  PrintStatsVariant,
} from "@/lib/print-assets.types";
import {
  PRINT_CONTACT_VARIANTS,
  PRINT_NARRATIVE_VARIANTS,
  PRINT_TABLE_VARIANTS,
  PRINT_EXPERTISE_VARIANTS,
  PRINT_FEATURE_VARIANTS,
  PRINT_LOGO_VARIANTS,
  PRINT_QUOTE_VARIANTS,
  PRINT_STATS_VARIANTS,
  PrintSectionRenderer,
} from "./PrintSectionRenderer";
import { X, GripVertical } from "lucide-react";

export const PRINT_SECTION_DND_MIME = "application/x-print-section";

const rid = () => `sec-${Math.random().toString(36).slice(2, 10)}`;

// ---- factories -------------------------------------------------------------

export function makePrintStatsSection(variantId: PrintStatsVariant): PrintSection {
  const base = {
    id: rid(),
    kind: "stats" as const,
    variantId,
    eyebrow: "Impact at a glance",
    title: "By the numbers",
  };
  if (variantId === "stat-bento-portrait") {
    return {
      ...base,
      items: [
        { label: "Global markets supported end-to-end", value: "200", unit: "+", caption: "Reach" },
        { label: "Faster time to market", value: "3.4", unit: "x" },
        { label: "Reduction in review cycles", value: "62", unit: "%" },
      ],
    };
  }
  if (variantId === "stat-callout-row-portrait") {
    return {
      ...base,
      items: [
        { label: "Content refresh cycle", value: "48", unit: "hr", caption: "Down from 3 weeks" },
        { label: "Translation cost saved", value: "$1.2", unit: "M", caption: "Annualized" },
        { label: "Markets covered", value: "36", caption: "Live in Q1" },
      ],
    };
  }
  return {
    ...base,
    items: [
      { label: "Localization cost saved", value: "$1.2", unit: "M", delta: "+18%", trend: "up" },
      { label: "Faster time-to-market", value: "3.4", unit: "x", delta: "+12%", trend: "up" },
      { label: "Markets supported live", value: "36", delta: "+9%", trend: "up" },
      { label: "Review cycles removed", value: "62", unit: "%", delta: "-62%", trend: "down" },
    ],
  };
}

export function makePrintQuoteSection(variantId: PrintQuoteVariant): PrintSection {
  return {
    id: rid(),
    kind: "quote",
    variantId,
    eyebrow: "In their words",
    text: "They didn't just translate our content — they rebuilt the entire pipeline so every new market ships in days, not months.",
    author: "Elena Marquez",
    role: "VP of Global Marketing",
    company: "Acme Global",
  };
}

export function makePrintLogoGridSection(variantId: PrintLogoGridVariant): PrintSection {
  const count = variantId === "logo-wall-portrait" ? 12 : variantId === "logo-row-portrait" ? 5 : 6;
  return {
    id: rid(),
    kind: "logo-grid",
    variantId,
    eyebrow: "Trusted by",
    title: "Selected clients",
    items: Array.from({ length: count }, (_, i) => ({ name: `Client ${i + 1}` })),
  };
}

export function makePrintExpertiseSection(variantId: PrintExpertiseVariant): PrintSection {
  if (variantId === "expertise-credential-pills") {
    return {
      id: rid(),
      kind: "expertise",
      variantId,
      title: "Certifications",
      items: [
        { label: "ISO 17100" },
        { label: "ISO 27001" },
        { label: "ISO 9001" },
        { label: "SOC 2 Type II" },
        { label: "HIPAA" },
        { label: "GDPR" },
      ],
    };
  }
  if (variantId === "expertise-checklist") {
    return {
      id: rid(),
      kind: "expertise",
      variantId,
      eyebrow: "How we deliver",
      title: "What's included",
      items: [
        { label: "24/7 global program management" },
        { label: "In-country linguists across 200+ markets" },
        { label: "Automated QA and terminology enforcement" },
        { label: "Enterprise-grade security & compliance" },
      ],
    };
  }
  return {
    id: rid(),
    kind: "expertise",
    variantId,
    title: "We know how",
    items: [
      { label: "Strategy", icon: "sparkles" },
      { label: "Localize", icon: "globe-alt" },
      { label: "Automate", icon: "bolt" },
      { label: "Measure", icon: "trending" },
      { label: "Scale", icon: "target" },
    ],
  };
}

export function makePrintFeatureSection(variantId: PrintFeatureVariant): PrintSection {
  const items = [
    {
      verb: "Translate",
      body: "Human-in-the-loop translation across 200+ language pairs.",
      icon: "language",
    },
    {
      verb: "Adapt",
      body: "Transcreate and culturally tune every asset for each market.",
      icon: "sparkles",
    },
    {
      verb: "Automate",
      body: "Connect CMS, PIM, DAM — content flows without tickets.",
      icon: "bolt",
    },
    {
      verb: "Measure",
      body: "Live dashboards on quality, cost, and time-to-market.",
      icon: "trending",
    },
    { verb: "Comply", body: "Enterprise security, ISO/SOC certified programs.", icon: "check" },
    { verb: "Scale", body: "Launch new markets in days without adding headcount.", icon: "target" },
  ];
  const trim = variantId === "feature-cards-2col" ? 4 : variantId === "feature-list-1col" ? 5 : 6;
  return {
    id: rid(),
    kind: "feature-list",
    variantId,
    eyebrow: "What we do",
    title: "Capabilities at a glance",
    items: items.slice(0, trim),
  };
}

export function makePrintNarrativeSection(variantId: PrintNarrativeVariant): PrintSection {
  if (variantId === "narrative-numbered-arc") {
    return {
      id: rid(),
      kind: "narrative",
      variantId,
      eyebrow: "Engagement arc",
      title: "Challenge, solution, result",
      items: [
        {
          heading: "The challenge",
          body: "Regional teams were publishing on different cycles, so launch content shipped weeks apart and legal reviewed each market twice.",
          bullets: ["Fragmented workflows", "Duplicate review"],
        },
        {
          heading: "The solution",
          body: "One connected pipeline: source content pulled straight from the CMS, translated in-flight, and routed to a single in-country review pass.",
          bullets: ["CMS connector", "In-country review"],
        },
        {
          heading: "The result",
          body: "Simultaneous launch across every market, with cost per word down and no additional headcount on either side.",
          bullets: ["Simultaneous launch", "Lower cost per word"],
        },
      ],
    };
  }
  if (variantId === "narrative-discover-panel") {
    return {
      id: rid(),
      kind: "narrative",
      variantId,
      eyebrow: "Discover",
      title: "A connected localization program",
      items: [
        {
          heading: "Discover",
          body: "Technology, linguists, and program management under one roof — so content moves from source to market without hand-offs, tickets, or re-work.",
          bullets: [
            "Dedicated program management",
            "In-country subject-matter linguists",
            "Automated terminology enforcement",
            "Connector-first integration",
            "Live quality and spend reporting",
          ],
        },
      ],
    };
  }
  return {
    id: rid(),
    kind: "narrative",
    variantId,
    eyebrow: "The engagement",
    title: "Challenge · Approach · Impact",
    items: [
      {
        heading: "Challenge",
        body: "Growing content volume across regulated markets, with no single owner for quality or turnaround.",
        bullets: ["Volume outpacing capacity", "Inconsistent terminology"],
      },
      {
        heading: "Approach",
        body: "A managed program built on connectors, reusable translation memory, and one in-country review pass per market.",
        bullets: ["Connector-first delivery", "Shared translation memory"],
      },
      {
        heading: "Impact",
        body: "Faster time to market, measurable quality gains, and predictable spend the business can plan against.",
        bullets: ["Faster launches", "Predictable spend"],
      },
    ],
  };
}

export function makePrintTableSection(variantId: PrintTableVariant): PrintSection {
  if (variantId === "table-scale-rail") {
    return {
      id: rid(),
      kind: "table",
      variantId,
      eyebrow: "Scale",
      title: "The reach behind the program",
      rows: [
        { label: "Languages supported", value: "200+" },
        { label: "In-country linguists", value: "12k" },
        { label: "Cities worldwide", value: "140" },
        { label: "Programs live", value: "3.5k" },
      ],
    };
  }
  if (variantId === "table-spec-rows") {
    return {
      id: rid(),
      kind: "table",
      variantId,
      eyebrow: "At a glance",
      title: "Program specification",
      rows: [
        { label: "Content types", value: "Web, product, regulatory" },
        { label: "Language pairs", value: "42" },
        { label: "Turnaround", value: "48 hours" },
        { label: "Review model", value: "Single in-country pass" },
        { label: "Certifications", value: "ISO 17100 · ISO 27001" },
        { label: "Reporting", value: "Monthly quality + spend" },
      ],
    };
  }
  return {
    id: rid(),
    kind: "table",
    variantId,
    eyebrow: "Coverage",
    title: "Departments supported",
    rows: [
      { label: "Marketing" },
      { label: "Regulatory affairs" },
      { label: "Clinical operations" },
      { label: "Legal" },
      { label: "Human resources" },
      { label: "Commercial" },
      { label: "Medical affairs" },
      { label: "Training & eLearning" },
    ],
  };
}

export function makePrintContactSection(variantId: PrintContactVariant): PrintSection {
  if (variantId === "contact-global-panel") {
    return {
      id: rid(),
      kind: "contact",
      variantId,
      eyebrow: "Global contacts",
      title: "Talk to your account team",
      body: "One team across every region, with a single point of accountability for quality and turnaround.",
      email: "hello@transperfect.com",
      url: "transperfect.com",
      rows: [
        { label: "Americas", value: "+1 212 689 5555" },
        { label: "EMEA", value: "+44 20 7583 8690" },
        { label: "APAC", value: "+852 2159 9799" },
      ],
    };
  }
  if (variantId === "contact-cta-band") {
    return {
      id: rid(),
      kind: "contact",
      variantId,
      eyebrow: "Next step",
      title: "Ready to launch in every market?",
      body: "We will map your content, connectors, and review model in a 30-minute session.",
      ctaLabel: "Book a session",
      url: "transperfect.com/contact",
    };
  }
  return {
    id: rid(),
    kind: "contact",
    variantId,
    eyebrow: "Speak to our expert",
    name: "Elena Marquez",
    role: "Director, Global Programs",
    email: "elena.marquez@transperfect.com",
    phone: "+1 212 689 5555",
  };
}

// ---- Picker UI ------------------------------------------------------------

type Family =
  | "stats"
  | "quote"
  | "logo-grid"
  | "expertise"
  | "feature-list"
  | "narrative"
  | "table"
  | "contact";

const FAMILIES: Array<{ id: Family; label: string }> = [
  { id: "stats", label: "Stats" },
  { id: "quote", label: "Quotes" },
  { id: "logo-grid", label: "Logos" },
  { id: "expertise", label: "Expertise" },
  { id: "feature-list", label: "Features" },
  { id: "narrative", label: "Narrative" },
  { id: "table", label: "Tables" },
  { id: "contact", label: "Contact & CTA" },
];

function variantsForFamily(
  family: Family,
): Array<{ id: string; label: string; description: string }> {
  switch (family) {
    case "stats":
      return PRINT_STATS_VARIANTS;
    case "quote":
      return PRINT_QUOTE_VARIANTS;
    case "logo-grid":
      return PRINT_LOGO_VARIANTS;
    case "expertise":
      return PRINT_EXPERTISE_VARIANTS;
    case "feature-list":
      return PRINT_FEATURE_VARIANTS;
    case "narrative":
      return PRINT_NARRATIVE_VARIANTS;
    case "table":
      return PRINT_TABLE_VARIANTS;
    case "contact":
      return PRINT_CONTACT_VARIANTS;
  }
}

function makeSectionFor(family: Family, id: string): PrintSection {
  switch (family) {
    case "stats":
      return makePrintStatsSection(id as PrintStatsVariant);
    case "quote":
      return makePrintQuoteSection(id as PrintQuoteVariant);
    case "logo-grid":
      return makePrintLogoGridSection(id as PrintLogoGridVariant);
    case "expertise":
      return makePrintExpertiseSection(id as PrintExpertiseVariant);
    case "feature-list":
      return makePrintFeatureSection(id as PrintFeatureVariant);
    case "narrative":
      return makePrintNarrativeSection(id as PrintNarrativeVariant);
    case "table":
      return makePrintTableSection(id as PrintTableVariant);
    case "contact":
      return makePrintContactSection(id as PrintContactVariant);
  }
}

export function PrintSectionPicker({
  open,
  onClose,
  onInsert,
  brand,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (section: PrintSection) => void;
  brand: BrandMode;
  mode: "light" | "dark";
}) {
  const [family, setFamily] = useState<Family>("stats");
  if (!open) return null;
  const accent = brand.tokens.accent || brand.tokens.primary;
  const variants = variantsForFamily(family);

  return (
    <div
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[520px] flex-col border-l border-black/10 bg-white shadow-2xl"
      role="dialog"
      aria-modal="false"
      aria-label="Shared module library"
    >
      <div className="flex items-center justify-between border-b border-black/10 px-5 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-black/50">
            Add module
          </div>
          <h2 className="text-base font-semibold text-black">Shared module library</h2>
          <div className="mt-0.5 text-[11px] text-black/50">
            Click to insert, or drag onto the Shared modules list.
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-2 text-icon-muted hover:bg-black/5"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-black/10 px-5 py-2 text-xs">
        {FAMILIES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFamily(f.id)}
            className={`rounded-full px-2.5 py-1 font-medium transition ${family === f.id ? "bg-black text-white" : "text-black/60 hover:text-black"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid flex-1 gap-4 overflow-auto p-5">
        {variants.map((v) => {
          const preview = makeSectionFor(family, v.id);
          return (
            <div
              key={v.id}
              draggable
              onDragStart={(e) => {
                const payload = makeSectionFor(family, v.id);
                e.dataTransfer.effectAllowed = "copy";
                e.dataTransfer.setData(PRINT_SECTION_DND_MIME, JSON.stringify(payload));
                e.dataTransfer.setData("text/plain", `print-section:${v.id}`);
              }}
              className="group flex cursor-grab flex-col overflow-hidden rounded-xl border border-black/10 bg-white text-left transition hover:border-black hover:shadow-lg active:cursor-grabbing"
            >
              <button
                type="button"
                onClick={() => {
                  onInsert(makeSectionFor(family, v.id));
                }}
                className="flex flex-col text-left"
              >
                <div
                  className="relative overflow-hidden [container-type:inline-size]"
                  style={{
                    aspectRatio: "8.5 / 6",
                    background: mode === "dark" ? "#111114" : "#FFFFFF",
                    padding: "5% 6%",
                  }}
                >
                  <PrintSectionRenderer section={preview} mode={mode} accent={accent} />
                </div>
                <div className="flex items-start gap-2 border-t border-black/5 p-3">
                  <GripVertical
                    size={14}
                    className="mt-0.5 shrink-0 text-foreground/30"
                    aria-hidden
                  />
                  <div>
                    <div className="text-sm font-semibold text-black">{v.label}</div>
                    <div className="mt-0.5 text-[11px] text-black/60">{v.description}</div>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

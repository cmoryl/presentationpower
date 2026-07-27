// Right-side drawer for inserting shared modules into a print asset.
// Supports both click-to-insert and drag-and-drop from the drawer onto
// the Shared modules panel drop zones.

import { useState } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import type {
  PrintExpertiseVariant,
  PrintFeatureVariant,
  PrintLogoGridVariant,
  PrintQuoteVariant,
  PrintSection,
  PrintStatsVariant,
} from "@/lib/print-assets.types";
import {
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
  const base = { id: rid(), kind: "stats" as const, variantId, eyebrow: "Impact at a glance", title: "By the numbers" };
  if (variantId === "stat-bento-portrait") {
    return { ...base, items: [
      { label: "Global markets supported end-to-end", value: "200", unit: "+", caption: "Reach" },
      { label: "Faster time to market", value: "3.4", unit: "x" },
      { label: "Reduction in review cycles", value: "62", unit: "%" },
    ]};
  }
  if (variantId === "stat-callout-row-portrait") {
    return { ...base, items: [
      { label: "Content refresh cycle", value: "48", unit: "hr", caption: "Down from 3 weeks" },
      { label: "Translation cost saved", value: "$1.2", unit: "M", caption: "Annualized" },
      { label: "Markets covered", value: "36", caption: "Live in Q1" },
    ]};
  }
  return { ...base, items: [
    { label: "Localization cost saved", value: "$1.2", unit: "M", delta: "+18%", trend: "up" },
    { label: "Faster time-to-market", value: "3.4", unit: "x", delta: "+12%", trend: "up" },
    { label: "Markets supported live", value: "36", delta: "+9%", trend: "up" },
    { label: "Review cycles removed", value: "62", unit: "%", delta: "-62%", trend: "down" },
  ]};
}

export function makePrintQuoteSection(variantId: PrintQuoteVariant): PrintSection {
  return {
    id: rid(), kind: "quote", variantId,
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
    id: rid(), kind: "logo-grid", variantId,
    eyebrow: "Trusted by",
    title: "Selected clients",
    items: Array.from({ length: count }, (_, i) => ({ name: `Client ${i + 1}` })),
  };
}

export function makePrintExpertiseSection(variantId: PrintExpertiseVariant): PrintSection {
  if (variantId === "expertise-credential-pills") {
    return {
      id: rid(), kind: "expertise", variantId,
      title: "Certifications",
      items: [
        { label: "ISO 17100" }, { label: "ISO 27001" }, { label: "ISO 9001" },
        { label: "SOC 2 Type II" }, { label: "HIPAA" }, { label: "GDPR" },
      ],
    };
  }
  if (variantId === "expertise-checklist") {
    return {
      id: rid(), kind: "expertise", variantId,
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
    id: rid(), kind: "expertise", variantId,
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
    { verb: "Translate", body: "Human-in-the-loop translation across 200+ language pairs.", icon: "language" },
    { verb: "Adapt",     body: "Transcreate and culturally tune every asset for each market.", icon: "sparkles" },
    { verb: "Automate",  body: "Connect CMS, PIM, DAM — content flows without tickets.", icon: "bolt" },
    { verb: "Measure",   body: "Live dashboards on quality, cost, and time-to-market.", icon: "trending" },
    { verb: "Comply",    body: "Enterprise security, ISO/SOC certified programs.", icon: "check" },
    { verb: "Scale",     body: "Launch new markets in days without adding headcount.", icon: "target" },
  ];
  const trim = variantId === "feature-cards-2col" ? 4 : variantId === "feature-list-1col" ? 5 : 6;
  return {
    id: rid(), kind: "feature-list", variantId,
    eyebrow: "What we do",
    title: "Capabilities at a glance",
    items: items.slice(0, trim),
  };
}

// ---- Picker UI ------------------------------------------------------------

type Family = "stats" | "quote" | "logo-grid" | "expertise" | "feature-list";

const FAMILIES: Array<{ id: Family; label: string }> = [
  { id: "stats", label: "Stats" },
  { id: "quote", label: "Quotes" },
  { id: "logo-grid", label: "Logos" },
  { id: "expertise", label: "Expertise" },
  { id: "feature-list", label: "Features" },
];

function variantsForFamily(family: Family): Array<{ id: string; label: string; description: string }> {
  switch (family) {
    case "stats": return PRINT_STATS_VARIANTS;
    case "quote": return PRINT_QUOTE_VARIANTS;
    case "logo-grid": return PRINT_LOGO_VARIANTS;
    case "expertise": return PRINT_EXPERTISE_VARIANTS;
    case "feature-list": return PRINT_FEATURE_VARIANTS;
  }
}

function makeSectionFor(family: Family, id: string): PrintSection {
  switch (family) {
    case "stats": return makePrintStatsSection(id as PrintStatsVariant);
    case "quote": return makePrintQuoteSection(id as PrintQuoteVariant);
    case "logo-grid": return makePrintLogoGridSection(id as PrintLogoGridVariant);
    case "expertise": return makePrintExpertiseSection(id as PrintExpertiseVariant);
    case "feature-list": return makePrintFeatureSection(id as PrintFeatureVariant);
  }
}

export function PrintSectionPicker({
  open, onClose, onInsert, brand, mode,
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
          <div className="text-[10px] font-semibold uppercase tracking-widest text-black/50">Add module</div>
          <h2 className="text-base font-semibold text-black">Shared module library</h2>
          <div className="mt-0.5 text-[11px] text-black/50">Click to insert, or drag onto the Shared modules list.</div>
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-black/60 hover:bg-black/5" aria-label="Close">
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
                onClick={() => { onInsert(makeSectionFor(family, v.id)); }}
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
                  <GripVertical size={14} className="mt-0.5 shrink-0 text-foreground/30" aria-hidden />
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

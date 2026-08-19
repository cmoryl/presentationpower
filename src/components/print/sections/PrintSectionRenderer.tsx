// Dispatch a `PrintSection` block to its portrait-native renderer. Any print
// layout can render `content.modules?` by mapping through this component.
import type { PrintSection } from "@/lib/print-assets.types";
import { KpiDashboardPortrait } from "./stats/KpiDashboardPortrait";
import { StatCalloutRowPortrait } from "./stats/StatCalloutRowPortrait";
import { StatBentoPortrait } from "./stats/StatBentoPortrait";
import { PullQuoteHero } from "./quote/PullQuoteHero";
import { QuoteAttributionCard } from "./quote/QuoteAttributionCard";
import { InlineQuoteCompact } from "./quote/InlineQuoteCompact";
import { LogoGridPortrait } from "./logogrid/LogoGridPortrait";
import { LogoRowPortrait } from "./logogrid/LogoRowPortrait";
import { LogoWallPortrait } from "./logogrid/LogoWallPortrait";
import { IconStripPortrait } from "./expertise/IconStripPortrait";
import { ChecklistPanelPortrait } from "./expertise/ChecklistPanelPortrait";
import { CredentialPillsPortrait } from "./expertise/CredentialPillsPortrait";
import { VerbCardsPortrait } from "./features/VerbCardsPortrait";
import { FeatureList1Col } from "./features/FeatureList1Col";
import { NarrativeTriCard } from "./narrative/NarrativeTriCard";
import { NarrativeNumberedArc } from "./narrative/NarrativeNumberedArc";
import { NarrativeDiscoverPanel } from "./narrative/NarrativeDiscoverPanel";
import { TableTwoColList } from "./table/TableTwoColList";
import { TableScaleRail } from "./table/TableScaleRail";
import { TableSpecRows } from "./table/TableSpecRows";
import { ContactExpertCard } from "./contact/ContactExpertCard";
import { ContactGlobalPanel } from "./contact/ContactGlobalPanel";
import { ContactCtaBand } from "./contact/ContactCtaBand";

export const PRINT_STATS_VARIANTS: Array<{
  id: "kpi-dashboard-portrait" | "stat-callout-row-portrait" | "stat-bento-portrait";
  label: string;
  description: string;
}> = [
  {
    id: "kpi-dashboard-portrait",
    label: "KPI Dashboard",
    description: "Multi-column KPIs with divider hairlines.",
  },
  {
    id: "stat-callout-row-portrait",
    label: "Stat Callout Row",
    description: "Big-number pills in a glass row.",
  },
  { id: "stat-bento-portrait", label: "Stat Bento", description: "Hero stat + supporting stack." },
];

export const PRINT_QUOTE_VARIANTS: Array<{
  id: "pull-quote-hero" | "quote-attribution-card" | "quote-inline-compact";
  label: string;
  description: string;
}> = [
  {
    id: "pull-quote-hero",
    label: "Pull Quote",
    description: "Full-width italic pull quote in glass.",
  },
  {
    id: "quote-attribution-card",
    label: "Attribution Card",
    description: "Quote body with author lockup.",
  },
  {
    id: "quote-inline-compact",
    label: "Inline Quote",
    description: "Compact one-line quote with side bar.",
  },
];

export const PRINT_LOGO_VARIANTS: Array<{
  id: "logo-grid-portrait" | "logo-row-portrait" | "logo-wall-portrait";
  label: string;
  description: string;
}> = [
  {
    id: "logo-grid-portrait",
    label: "Logo Grid",
    description: "3-col portrait grid of glass tiles.",
  },
  { id: "logo-row-portrait", label: "Logo Row", description: "Single row with divider hairlines." },
  {
    id: "logo-wall-portrait",
    label: "Logo Wall",
    description: "Dense 4-col wall for large rosters.",
  },
];

export const PRINT_EXPERTISE_VARIANTS: Array<{
  id: "expertise-icon-strip" | "expertise-checklist" | "expertise-credential-pills";
  label: string;
  description: string;
}> = [
  {
    id: "expertise-icon-strip",
    label: "Icon Strip",
    description: '"We know how" horizontal icon strip.',
  },
  {
    id: "expertise-checklist",
    label: "Checklist Panel",
    description: "Glass panel with checkmark rows.",
  },
  {
    id: "expertise-credential-pills",
    label: "Credential Pills",
    description: "Compact pill row of credentials.",
  },
];

export const PRINT_FEATURE_VARIANTS: Array<{
  id: "feature-cards-3col" | "feature-cards-2col" | "feature-list-1col";
  label: string;
  description: string;
}> = [
  {
    id: "feature-cards-3col",
    label: "Verb Cards · 3 col",
    description: "Six-card verb + body grid.",
  },
  {
    id: "feature-cards-2col",
    label: "Verb Cards · 2 col",
    description: "Four-card verb + body grid.",
  },
  {
    id: "feature-list-1col",
    label: "Feature List",
    description: "Stacked single-column feature list.",
  },
];

export const PRINT_NARRATIVE_VARIANTS: Array<{
  id: "narrative-tri-card" | "narrative-numbered-arc" | "narrative-discover-panel";
  label: string;
  description: string;
}> = [
  {
    id: "narrative-tri-card",
    label: "Challenge · Approach · Impact",
    description: "Three-card e-brochure triptych with bullet rails.",
  },
  {
    id: "narrative-numbered-arc",
    label: "Numbered Arc",
    description: "01/02/03 challenge → solution → result spine.",
  },
  {
    id: "narrative-discover-panel",
    label: "Discover Panel",
    description: "Short body plus a bullet rail beside it.",
  },
];

export const PRINT_TABLE_VARIANTS: Array<{
  id: "table-two-col-list" | "table-scale-rail" | "table-spec-rows";
  label: string;
  description: string;
}> = [
  {
    id: "table-two-col-list",
    label: "Two-Column List",
    description: "Departments-supported style hairline list.",
  },
  { id: "table-scale-rail", label: "Scale Rail", description: "Big values over small labels." },
  {
    id: "table-spec-rows",
    label: "Spec Rows",
    description: "Label → value table with header strip.",
  },
];

export const PRINT_CONTACT_VARIANTS: Array<{
  id: "contact-expert-card" | "contact-global-panel" | "contact-cta-band";
  label: string;
  description: string;
}> = [
  { id: "contact-expert-card", label: "Expert Card", description: "Named subject expert lockup." },
  {
    id: "contact-global-panel",
    label: "Global Contacts",
    description: "Navy panel with a region contact rail.",
  },
  { id: "contact-cta-band", label: "CTA Band", description: "Closing accent band with a button." },
];

export function PrintSectionRenderer({
  section,
  mode,
  accent,
}: {
  section: PrintSection;
  mode: "light" | "dark";
  accent: string;
}) {
  switch (section.kind) {
    case "stats":
      if (section.variantId === "kpi-dashboard-portrait")
        return <KpiDashboardPortrait section={section} mode={mode} accent={accent} />;
      if (section.variantId === "stat-callout-row-portrait")
        return <StatCalloutRowPortrait section={section} mode={mode} accent={accent} />;
      if (section.variantId === "stat-bento-portrait")
        return <StatBentoPortrait section={section} mode={mode} accent={accent} />;
      return null;
    case "quote":
      if (section.variantId === "pull-quote-hero")
        return <PullQuoteHero section={section} mode={mode} accent={accent} />;
      if (section.variantId === "quote-attribution-card")
        return <QuoteAttributionCard section={section} mode={mode} accent={accent} />;
      if (section.variantId === "quote-inline-compact")
        return <InlineQuoteCompact section={section} mode={mode} accent={accent} />;
      return null;
    case "logo-grid":
      if (section.variantId === "logo-grid-portrait")
        return <LogoGridPortrait section={section} mode={mode} accent={accent} />;
      if (section.variantId === "logo-row-portrait")
        return <LogoRowPortrait section={section} mode={mode} accent={accent} />;
      if (section.variantId === "logo-wall-portrait")
        return <LogoWallPortrait section={section} mode={mode} accent={accent} />;
      return null;
    case "expertise":
      if (section.variantId === "expertise-icon-strip")
        return <IconStripPortrait section={section} mode={mode} accent={accent} />;
      if (section.variantId === "expertise-checklist")
        return <ChecklistPanelPortrait section={section} mode={mode} accent={accent} />;
      if (section.variantId === "expertise-credential-pills")
        return <CredentialPillsPortrait section={section} mode={mode} accent={accent} />;
      return null;
    case "feature-list":
      if (section.variantId === "feature-cards-3col")
        return <VerbCardsPortrait section={section} mode={mode} accent={accent} cols={3} />;
      if (section.variantId === "feature-cards-2col")
        return <VerbCardsPortrait section={section} mode={mode} accent={accent} cols={2} />;
      if (section.variantId === "feature-list-1col")
        return <FeatureList1Col section={section} mode={mode} accent={accent} />;
      return null;
    case "narrative":
      if (section.variantId === "narrative-tri-card")
        return <NarrativeTriCard section={section} mode={mode} accent={accent} />;
      if (section.variantId === "narrative-numbered-arc")
        return <NarrativeNumberedArc section={section} mode={mode} accent={accent} />;
      if (section.variantId === "narrative-discover-panel")
        return <NarrativeDiscoverPanel section={section} mode={mode} accent={accent} />;
      return null;
    case "table":
      if (section.variantId === "table-two-col-list")
        return <TableTwoColList section={section} mode={mode} accent={accent} />;
      if (section.variantId === "table-scale-rail")
        return <TableScaleRail section={section} mode={mode} accent={accent} />;
      if (section.variantId === "table-spec-rows")
        return <TableSpecRows section={section} mode={mode} accent={accent} />;
      return null;
    case "contact":
      if (section.variantId === "contact-expert-card")
        return <ContactExpertCard section={section} mode={mode} accent={accent} />;
      if (section.variantId === "contact-global-panel")
        return <ContactGlobalPanel section={section} mode={mode} accent={accent} />;
      if (section.variantId === "contact-cta-band")
        return <ContactCtaBand section={section} mode={mode} accent={accent} />;
      return null;
    default:
      return null;
  }
}

export function PrintSectionsStack({
  sections,
  mode,
  accent,
}: {
  sections: PrintSection[] | undefined;
  mode: "light" | "dark";
  accent: string;
}) {
  if (!sections?.length) return null;
  return (
    <>
      {sections.map((s) => (
        <div key={s.id} data-section={`module:${s.id}`} data-section-label={sectionLabel(s)}>
          <PrintSectionRenderer section={s} mode={mode} accent={accent} />
        </div>
      ))}
    </>
  );
}

/** Human label for the canvas selection chip. */
function sectionLabel(s: PrintSection): string {
  const kindLabel =
    s.kind === "stats"
      ? "Stats"
      : s.kind === "quote"
        ? "Quote"
        : s.kind === "logo-grid"
          ? "Client logos"
          : s.kind === "expertise"
            ? "Expertise"
            : s.kind === "feature-list"
              ? "Features"
              : s.kind === "narrative"
                ? "Narrative"
                : s.kind === "table"
                  ? "Table"
                  : s.kind === "contact"
                    ? "Contact"
                    : "Module";
  return kindLabel;
}

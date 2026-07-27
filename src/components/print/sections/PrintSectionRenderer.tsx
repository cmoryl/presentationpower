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
        <PrintSectionRenderer key={s.id} section={s} mode={mode} accent={accent} />
      ))}
    </>
  );
}

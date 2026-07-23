// Dispatch a `PrintSection` block to its portrait-native renderer. Any print
// layout can render `content.modules?` by mapping through this component.
import type { PrintSection } from "@/lib/print-assets.types";
import { KpiDashboardPortrait } from "./stats/KpiDashboardPortrait";
import { StatCalloutRowPortrait } from "./stats/StatCalloutRowPortrait";
import { StatBentoPortrait } from "./stats/StatBentoPortrait";

export const PRINT_STATS_VARIANTS: Array<{
  id: "kpi-dashboard-portrait" | "stat-callout-row-portrait" | "stat-bento-portrait";
  label: string;
  description: string;
}> = [
  { id: "kpi-dashboard-portrait", label: "KPI Dashboard", description: "Multi-column KPIs with divider hairlines." },
  { id: "stat-callout-row-portrait", label: "Stat Callout Row", description: "Big-number pills in a glass row." },
  { id: "stat-bento-portrait", label: "Stat Bento", description: "Hero stat + supporting stack." },
];

export function PrintSectionRenderer({
  section, mode, accent,
}: {
  section: PrintSection;
  mode: "light" | "dark";
  accent: string;
}) {
  if (section.kind === "stats") {
    switch (section.variantId) {
      case "kpi-dashboard-portrait":
        return <KpiDashboardPortrait section={section} mode={mode} accent={accent} />;
      case "stat-callout-row-portrait":
        return <StatCalloutRowPortrait section={section} mode={mode} accent={accent} />;
      case "stat-bento-portrait":
        return <StatBentoPortrait section={section} mode={mode} accent={accent} />;
    }
  }
  return null;
}

export function PrintSectionsStack({
  sections, mode, accent,
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

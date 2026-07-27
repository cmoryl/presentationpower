// Graph Variant Library Kit — surfaces all 16 MV-GRAPH-* module variants
// as an approved, editable kit inside the Module Library, alongside
// Square Image, Infographics, and Community Event.
//
// Every slide targets a section (SF-*) that permits the MF-05 (Proof, Data
// & Decision) family, so kit-validation accepts the whole payload.
import type { TemplatePayload } from "../deck-store";

export const GRAPH_LIBRARY_TEMPLATE: TemplatePayload = {
  title: "Graph Variants · Data Library",
  brandModeId: "bm-enterprise",
  archetypeId: "arch-exec-briefing",
  subCompany: null,
  context: null,
  brief: {
    prospect: "Data Library",
    industry: "Analytics & Insights",
    audience: "Executives, analysts, deck builders",
    meetingObjective: "Showcase every graph module variant with editable data",
    lengthTarget: 20,
    clientFacts:
      "Reference kit exposing the 16 MV-GRAPH-* variants — line, bar, area, waterfall, bubble, heatmap, treemap, donut, rings, combo — with representative datasets.",
  },
  slides: [
    {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-YEAR-SERIES",
      layoutId: "LF-08",
      content: {
        kicker: "Growth signal",
        title: "Annual revenue trajectory",
        headline: "Six consecutive years of double-digit expansion.",
        unit: "M USD",
        items: [
          { year: "2020", value: 42 },
          { year: "2021", value: 58 },
          { year: "2022", value: 71 },
          { year: "2023", value: 89 },
          { year: "2024", value: 108 },
          { year: "2025", value: 134 },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-AXIS-BARS",
      layoutId: "LF-08",
      content: {
        title: "Monthly bookings — 2025",
        unit: "K",
        legend: "New bookings",
        highlight: "Sep",
        bars: [
          { label: "Jan", value: 42 },
          { label: "Feb", value: 48 },
          { label: "Mar", value: 55 },
          { label: "Apr", value: 61 },
          { label: "May", value: 58 },
          { label: "Jun", value: 66 },
          { label: "Jul", value: 72 },
          { label: "Aug", value: 78 },
          { label: "Sep", value: 94 },
          { label: "Oct", value: 83 },
          { label: "Nov", value: 88 },
          { label: "Dec", value: 91 },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-CATEGORY-BARS",
      layoutId: "LF-08",
      content: {
        title: "Revenue by product line",
        stat: { value: "68", unit: "%", label: "of revenue from top three" },
        items: [
          { label: "Platform", value: 42, unit: "M" },
          { label: "Services", value: 31, unit: "M" },
          { label: "Enterprise", value: 24, unit: "M" },
          { label: "Partners", value: 18, unit: "M" },
          { label: "Legacy", value: 9, unit: "M" },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-DUAL-DONUT",
      layoutId: "LF-08",
      content: {
        title: "Retention across two cohorts",
        items: [
          {
            value: 92,
            label: "Enterprise",
            body: "Net revenue retention across 120 accounts.",
            meta: "2024",
          },
          {
            value: 87,
            label: "Mid-market",
            body: "Retention lift after onboarding redesign.",
            meta: "2025",
          },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-RINGS",
      layoutId: "LF-08",
      content: {
        title: "Program completion — Q3",
        items: [
          { label: "Enablement", value: 88, body: "1,240 seats certified" },
          { label: "Adoption", value: 72, body: "Weekly active teams" },
          { label: "Advocacy", value: 54, body: "NPS promoters" },
          { label: "Expansion", value: 41, body: "Multi-product usage" },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-TASK-CARDS",
      layoutId: "LF-11",
      content: {
        title: "Delivery workstreams",
        items: [
          {
            label: "Discovery",
            done: 12,
            total: 12,
            body: "All interviews complete; synthesis in review.",
          },
          {
            label: "Build",
            done: 18,
            total: 24,
            body: "Six modules remaining in the sprint plan.",
          },
          { label: "Launch", done: 3, total: 9, body: "Pilot cohort scheduled for next quarter." },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-DECADE-AREA",
      layoutId: "LF-08",
      content: {
        kicker: "Long arc",
        title: "A decade of category expansion",
        headline: "The market compounded ~14% CAGR across ten years.",
        series: [
          { label: "2016", value: 120 },
          { label: "2017", value: 140 },
          { label: "2018", value: 168 },
          { label: "2019", value: 195 },
          { label: "2020", value: 210 },
          { label: "2021", value: 258 },
          { label: "2022", value: 302 },
          { label: "2023", value: 355 },
          { label: "2024", value: 410 },
          { label: "2025", value: 478 },
        ],
        callout: { year: "2021", note: "Inflection: platform launch + partner network" },
      },
    },
    {
      sectionId: "SF-11",
      variantId: "MV-GRAPH-PERCENT-COMPARE",
      layoutId: "LF-13",
      content: {
        title: "Current performance vs benchmark",
        items: [
          { label: "Retention", current: 92, benchmark: 78, range: "Industry 70–82%" },
          { label: "NPS", current: 64, benchmark: 41, range: "SaaS median 35–48" },
          { label: "Time-to-value", current: 88, benchmark: 62, range: "Peer set 55–70%" },
          { label: "Deal velocity", current: 71, benchmark: 55, range: "Enterprise 50–60%" },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-LINE-MULTI",
      layoutId: "LF-08",
      content: {
        kicker: "Segment view",
        title: "Growth across three segments",
        headline: "Enterprise pulls ahead in H2.",
        unit: "M",
        series: [
          { label: "Enterprise", points: [22, 28, 34, 41, 52, 68] },
          { label: "Mid-market", points: [18, 22, 27, 31, 36, 42] },
          { label: "SMB", points: [12, 14, 17, 19, 22, 26] },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-STACKED-BAR",
      layoutId: "LF-08",
      content: {
        title: "Bookings mix by quarter",
        unit: "M",
        segments: [{ label: "New logo" }, { label: "Expansion" }, { label: "Renewal" }],
        columns: [
          { label: "Q1", values: [14, 8, 22] },
          { label: "Q2", values: [18, 11, 26] },
          { label: "Q3", values: [21, 14, 29] },
          { label: "Q4", values: [24, 18, 33] },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-AREA-STACK",
      layoutId: "LF-08",
      content: {
        kicker: "Composition",
        title: "Revenue mix — five year build",
        headline: "Recurring revenue grew from 42% to 71% of total.",
        unit: "M",
        series: [
          { label: "Subscription", points: [22, 31, 42, 58, 74] },
          { label: "Services", points: [14, 18, 21, 24, 26] },
          { label: "Marketplace", points: [4, 7, 11, 15, 20] },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-WATERFALL",
      layoutId: "LF-08",
      content: {
        title: "ARR walk — FY25",
        unit: "M",
        steps: [
          { label: "Starting ARR", value: 108, kind: "start" },
          { label: "New logo", value: 24, kind: "positive" },
          { label: "Expansion", value: 18, kind: "positive" },
          { label: "Churn", value: -9, kind: "negative" },
          { label: "Contraction", value: -4, kind: "negative" },
          { label: "Ending ARR", value: 137, kind: "end" },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-BUBBLE",
      layoutId: "LF-08",
      content: {
        title: "Segment yield vs effort",
        axis: { x: "Sales effort (weeks)", y: "Yield (ACV, $K)" },
        items: [
          { label: "Enterprise", x: 12, y: 480, size: 42 },
          { label: "Mid-market", x: 6, y: 180, size: 28 },
          { label: "SMB", x: 2, y: 64, size: 18 },
          { label: "Public sector", x: 18, y: 620, size: 22 },
          { label: "Partners", x: 4, y: 210, size: 24 },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-HEATMAP",
      layoutId: "LF-08",
      content: {
        title: "Usage by region × surface",
        rows: ["NA", "EMEA", "APAC", "LATAM"],
        columns: ["Web", "Mobile", "API", "Partner"],
        cells: [
          [82, 74, 61, 48],
          [71, 68, 55, 42],
          [58, 76, 44, 38],
          [46, 52, 31, 24],
        ],
        scale: { min: 0, max: 100 },
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-TREEMAP",
      layoutId: "LF-08",
      content: {
        title: "Portfolio weight",
        items: [
          { label: "Platform", value: 42, meta: "42%" },
          { label: "Services", value: 22, meta: "22%" },
          { label: "Enterprise", value: 16, meta: "16%" },
          { label: "Partners", value: 12, meta: "12%" },
          { label: "Marketplace", value: 5, meta: "5%" },
          { label: "Legacy", value: 3, meta: "3%" },
        ],
      },
    },
    {
      sectionId: "SF-08",
      variantId: "MV-GRAPH-COMBO",
      layoutId: "LF-08",
      content: {
        title: "Volume and conversion",
        bars: { label: "Leads", unit: "K" },
        line: { label: "Conversion", unit: "%" },
        points: [
          { label: "Jan", bar: 42, line: 8.2 },
          { label: "Feb", bar: 48, line: 8.8 },
          { label: "Mar", bar: 55, line: 9.4 },
          { label: "Apr", bar: 61, line: 10.1 },
          { label: "May", bar: 58, line: 10.6 },
          { label: "Jun", bar: 66, line: 11.4 },
          { label: "Jul", bar: 72, line: 11.9 },
          { label: "Aug", bar: 78, line: 12.5 },
        ],
      },
    },
  ],
};

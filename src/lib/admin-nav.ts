/**
 * Single source of truth for the admin console menu. Both the admin sidebar
 * (AdminShell) and the "Admin" dropdown in the top navigation (AppShell)
 * render from this list, so the two can never drift apart again.
 */
export type AdminNavItem = { to: string; label: string; exact?: boolean };
export type AdminNavGroup = { label: string; items: ReadonlyArray<AdminNavItem> };

export const ADMIN_NAV_GROUPS: ReadonlyArray<AdminNavGroup> = [
  {
    label: "Overview",
    items: [
      { to: "/admin", label: "Command center", exact: true },
      { to: "/atlas", label: "Atlas" },
      { to: "/looks", label: "Template Studio" },
      { to: "/templates", label: "Team templates" },
      { to: "/library/print", label: "Print Studio" },
      { to: "/admin/print-library", label: "Print library" },
      { to: "/admin/campaigns", label: "Campaigns" },
      { to: "/admin/audit", label: "Audit log" },
      { to: "/admin/export-audit", label: "Export audit" },
    ],
  },
  {
    label: "Analytics & QA",
    items: [
      { to: "/admin/analytics", label: "Master analytics" },
      { to: "/analytics", label: "Deck engagement" },
      { to: "/admin/ai", label: "AI usage & cost" },
      { to: "/admin/imagery-analytics", label: "Imagery analytics" },
      { to: "/admin/qr-downloads", label: "QR downloads" },
      { to: "/admin/style-learning", label: "Style learning governance" },
      { to: "/admin/viz-lab", label: "Viz Lab" },
      { to: "/admin/industry-scene-qa", label: "Industry scene QA" },
    ],
  },
  {
    label: "Knowledge",
    items: [
      { to: "/knowledge", label: "Knowledge" },
      { to: "/approvals", label: "Approvals" },
    ],
  },
  {
    label: "Brand assets",
    items: [
      { to: "/admin/brand-assets", label: "Brand assets" },
      { to: "/knowledge/brand-guides", label: "Brand guides" },
      { to: "/admin/logohub", label: "LogoHub" },
      { to: "/admin/division-seeds", label: "Division seeds" },
      { to: "/admin/imagery", label: "Imagery" },
      { to: "/admin/icon-studio", label: "Icon Studio" },
      { to: "/admin/pdf-ingest", label: "PDF ingestion" },
      { to: "/admin/print-color", label: "Print colour & preflight" },
    ],
  },
  {
    label: "Studios",
    items: [
      { to: "/admin/canvas", label: "Canvas Studio" },
      { to: "/admin/module-studio", label: "Module Studio" },
      { to: "/admin/modules", label: "Module editor" },
    ],
  },
  {
    label: "Translation",
    items: [
      { to: "/admin/translation", label: "Translation" },
      { to: "/admin/globallink", label: "GlobalLink · Translate" },
      { to: "/admin/globallink-share", label: "GlobalLink · Share" },
    ],
  },
  {
    label: "Governance",
    items: [
      { to: "/admin/users", label: "Users & roles" },
      { to: "/admin/team", label: "Team workspace" },
      { to: "/admin/alerts", label: "Send an alert" },
    ],
  },
];

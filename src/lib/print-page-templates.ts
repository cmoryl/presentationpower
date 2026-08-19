// Client-side types + helpers for print page templates (see
// print-page-templates.functions.ts for persistence).

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  canPublishPageTemplates,
  listPrintPageTemplates,
} from "@/lib/print-page-templates.functions";
import type { PrintAssetContext, PrintAssetKind, PrintSection } from "@/lib/print-assets.types";

export type PrintPageTemplateScope = "private" | "shared";

export type PrintPageTemplateLayout = Pick<
  PrintAssetContext,
  | "pageSize"
  | "density"
  | "editorMode"
  | "accentOverride"
  | "primaryOverride"
  | "contactCard"
  | "printSafeArea"
  | "inkScopeOverrides"
>;

export type PrintPageTemplateRow = {
  id: string;
  owner_id: string;
  scope: string;
  title: string;
  description: string | null;
  kind: string;
  division_id: string | null;
  tags: string[] | null;
  sections: unknown;
  layout: unknown;
  thumbnail_url: string | null;
  source_asset_id: string | null;
  source_library_item_id: string | null;
  hidden: boolean;
  created_at: string;
  updated_at: string;
};

export type PrintPageTemplate = Omit<PrintPageTemplateRow, "sections" | "layout" | "scope"> & {
  scope: PrintPageTemplateScope;
  sections: PrintSection[];
  layout: PrintPageTemplateLayout;
};

export function normalizePageTemplate(row: PrintPageTemplateRow): PrintPageTemplate {
  const sections = Array.isArray(row.sections) ? (row.sections as PrintSection[]) : [];
  const layout =
    row.layout && typeof row.layout === "object" ? (row.layout as PrintPageTemplateLayout) : {};
  return {
    ...row,
    scope: row.scope === "shared" ? "shared" : "private",
    sections,
    layout,
  };
}

/** Snapshot the layout / typography knobs worth carrying into a new asset. */
export function captureTemplateLayout(ctx: PrintAssetContext): PrintPageTemplateLayout {
  return {
    ...(ctx.pageSize ? { pageSize: ctx.pageSize } : {}),
    ...(ctx.density ? { density: ctx.density } : {}),
    ...(ctx.editorMode ? { editorMode: ctx.editorMode } : {}),
    ...(ctx.accentOverride ? { accentOverride: ctx.accentOverride } : {}),
    ...(ctx.primaryOverride ? { primaryOverride: ctx.primaryOverride } : {}),
    ...(ctx.contactCard !== undefined ? { contactCard: ctx.contactCard } : {}),
    ...(ctx.printSafeArea !== undefined ? { printSafeArea: ctx.printSafeArea } : {}),
    ...(ctx.inkScopeOverrides ? { inkScopeOverrides: ctx.inkScopeOverrides } : {}),
  };
}

const rid = () => Math.random().toString(36).slice(2, 10);

/** Clone a template's section stack with fresh ids so it can be inserted. */
export function instantiateTemplateSections(t: PrintPageTemplate): PrintSection[] {
  return t.sections.map((s) => ({ ...(s as PrintSection), id: rid() }) as PrintSection);
}

export function pageTemplateKind(t: PrintPageTemplate): PrintAssetKind {
  return t.kind as PrintAssetKind;
}

export function pageTemplateMatches(t: PrintPageTemplate, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [t.title, t.description ?? "", ...(t.tags ?? [])].join(" ").toLowerCase().includes(q);
}

/** Shared read hook: own private templates + every shared one. */
export function usePrintPageTemplates() {
  const listFn = useServerFn(listPrintPageTemplates);
  const q = useQuery({
    queryKey: ["print-page-templates"],
    queryFn: async () => {
      const rows = (await listFn()) as unknown as PrintPageTemplateRow[];
      return rows.map(normalizePageTemplate);
    },
  });
  return { templates: q.data ?? [], isLoading: q.isLoading, refetch: q.refetch };
}

export function usePageTemplateAdmin() {
  const fn = useServerFn(canPublishPageTemplates);
  const q = useQuery({
    queryKey: ["print-page-templates", "admin"],
    queryFn: async () => (await fn()) as unknown as { admin: boolean },
  });
  return Boolean(q.data?.admin);
}

export const PAGE_TEMPLATE_QUERY_KEY = ["print-page-templates"];

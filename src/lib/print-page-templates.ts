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
  | "inkOverrides"
  | "distribution"
  | "clientLogoUrl"
  | "clientLogoId"
  | "clientLogoName"
  | "subCompany"
> & {
  /** Everything on the piece that is NOT a section: hero copy, heroMedia,
   *  eyebrow, quote, logo color, stats — captured so a template reproduces the
   *  whole page, not just its module stack. */
  contentShell?: Record<string, unknown>;
};

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
    ...(ctx.inkOverrides ? { inkOverrides: ctx.inkOverrides } : {}),
    ...(ctx.distribution ? { distribution: ctx.distribution } : {}),
    ...(ctx.clientLogoUrl ? { clientLogoUrl: ctx.clientLogoUrl } : {}),
    ...(ctx.clientLogoId ? { clientLogoId: ctx.clientLogoId } : {}),
    ...(ctx.clientLogoName ? { clientLogoName: ctx.clientLogoName } : {}),
    ...(ctx.subCompany ? { subCompany: ctx.subCompany } : {}),
  };
}

/** Capture the page shell (hero photography, hero copy, quote, stats, logo
 *  color) — i.e. the piece's content minus its section stack. */
export function captureTemplateContentShell(
  content: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!content || typeof content !== "object") return {};
  const shell: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(content)) {
    if (k === "modules") continue;
    if (v === undefined) continue;
    shell[k] = v;
  }
  return shell;
}

// ---------------------------------------------------------------------------
// Reinterpretation — turn a captured piece into a fresh, fill-in-the-blanks
// starting point the way the curated case studies / spotlights behave: the
// layout, hero art, typography and structure survive; client-specific copy is
// replaced with prompts.
// ---------------------------------------------------------------------------

const KEEP_KEYS = new Set([
  "id",
  "variant",
  "kind",
  "icon",
  "logoColor",
  "heroMedia",
  "src",
  "url",
  "imageUrl",
  "logoUrl",
  "partnerLogoUrl",
  "align",
  "tone",
  "layout",
  "focalX",
  "focalY",
  "overlay",
  "copyOffsetPct",
]);

const PROMPTS: Record<string, string> = {
  title: "Headline goes here",
  headline: "Headline goes here",
  client: "Client name",
  partner: "Partner name",
  productName: "Product name",
  summary: "One or two lines framing the story.",
  intro: "One or two lines framing the story.",
  tagline: "One line that frames the offer.",
  body: "Replace with your copy.",
  text: "Replace with your copy.",
  challenge: "What was the client up against?",
  approach: "How did we solve it?",
  impact: "What changed as a result?",
  quote: "Add a short client quote here.",
  value: "00",
};

function promptFor(key: string, original: string): string {
  const direct = PROMPTS[key];
  if (direct) return direct;
  // Unknown key: keep short structural labels (eyebrows, chips, CTA labels,
  // stat captions, contact details); prompt only on prose.
  return original.length > 60 ? "Replace with your copy." : original;
}

function reinterpretValue(key: string, value: unknown): unknown {
  if (KEEP_KEYS.has(key)) return value;
  if (typeof value === "string") return value.trim() ? promptFor(key, value) : value;
  if (Array.isArray(value)) return value.map((v) => reinterpretValue(key, v));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = reinterpretValue(k, v);
    }
    return out;
  }
  return value;
}

/** Strip client-specific copy while preserving structure, hero art and type. */
export function reinterpretTemplateContent(
  content: Record<string, unknown>,
): Record<string, unknown> {
  return reinterpretValue("root", content) as Record<string, unknown>;
}

const rid = () => Math.random().toString(36).slice(2, 10);

/** Clone a template's section stack with fresh ids so it can be inserted. */
export function instantiateTemplateSections(t: PrintPageTemplate): PrintSection[] {
  return t.sections.map((s) => ({ ...(s as PrintSection), id: rid() }) as PrintSection);
}

/** Full content for a new asset: captured hero/shell + fresh-id sections. */
export function instantiateTemplateContent(
  t: PrintPageTemplate,
  opts?: { reinterpret?: boolean },
): Record<string, unknown> {
  const shell = (t.layout.contentShell ?? {}) as Record<string, unknown>;
  const content: Record<string, unknown> = {
    ...structuredClone(shell),
    modules: instantiateTemplateSections(t),
  };
  return opts?.reinterpret ? reinterpretTemplateContent(content) : content;
}

/** Context knobs only — drop the captured content shell. */
export function instantiateTemplateContext(t: PrintPageTemplate): Record<string, unknown> {
  const { contentShell: _shell, ...rest } = t.layout;
  return { ...rest, pageTemplateId: t.id } as Record<string, unknown>;
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

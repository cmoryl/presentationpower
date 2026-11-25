import { Button } from "@/design-system/element";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { companyOf, productOf, tagCounts } from "@/lib/print-library/item-tags";
import { safeList } from "@/components/print/sections/shared";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowRight,
  ChevronDown,
  Pencil,
  ChevronRight,
  Copy,
  FileText,
  FolderOpen,
  Search,
  X,
} from "lucide-react";

import { PageTemplateCard } from "@/components/print/PageTemplateShelf";
import { usePrintPageTemplates } from "@/lib/print-page-templates";
import { createPrintAsset, findMyPrintAssetForLibraryItem } from "@/lib/print-assets.functions";
import {
  PRINT_TYPES,
  collectionsFor,
  curatedCount,
  curatedMasterFor,
  itemsForDivision,
  itemsForDivisionType,
  matchesQuery,
  printTypeMeta,
  type PrintLibraryItem,
  type PrintTypeId,
} from "@/lib/print-library/catalog";
import {
  HIDDEN_DIVISION_IDS,
  findSubsection,
  matchesSubsection,
  subsectionsFor,
} from "@/lib/print-library/subsections";
import { editableContextFor, toEditableContent } from "@/lib/print-library/editable";
import { useDivisionSeed } from "@/lib/division-seeds";
import { applyDivisionSeedToContent } from "@/lib/print-library/division-seed-apply";
import { approvePrintDemoContent } from "@/lib/print-library/demo-approve";
import { applyLibraryOverrides, useModuleOverrides } from "@/lib/module-overrides";
import { useIsAdmin } from "@/lib/use-is-admin";
import type { BrandMode } from "@/lib/taxonomy";

type RenderPreview = (
  kind: PrintTypeId,
  brand: BrandMode,
  mode: "light" | "dark",
  content?: unknown,
  /** Multi-page documents: render only this page (used for card art). */
  pageIndex?: number,
) => React.ReactElement | null;

/** Multi-page master (Solution Proposal etc.) — card art renders page 1 live. */
function isMultiPageItem(item: PrintLibraryItem): boolean {
  const pages = (item.content as { pages?: unknown[] } | undefined)?.pages;
  return Array.isArray(pages) && pages.length > 1;
}

function pageCountOf(item: PrintLibraryItem): number {
  const pages = (item.content as { pages?: unknown[] } | undefined)?.pages;
  return Array.isArray(pages) ? pages.length : 0;
}

/**
 * Division → print type → collection browser for the print library. Replaces
 * the old flat template grid + per-division shelves with one navigable shelf
 * system and consistent preview cards.
 */
export type PrintBrowserState = {
  typeId: PrintTypeId | null;
  collection: string;
  query: string;
  subId: string | null;
  /** Company / sub-brand filter ("All" = off). */
  company?: string;
  /** Product family filter ("All" = off). */
  product?: string;
};

export function PrintLibraryBrowser({
  brandModes,
  divisionId,
  onDivisionChange,
  renderPreview,
  state,
  onStateChange,
}: {
  brandModes: BrandMode[];
  divisionId: string;
  onDivisionChange: (id: string) => void;
  renderPreview: RenderPreview;
  /** Optional URL-driven state so the shelf is deep-linkable. */
  state?: PrintBrowserState;
  onStateChange?: (patch: Partial<PrintBrowserState>) => void;
}) {
  const [local, setLocal] = useState<PrintBrowserState>({
    typeId: null,
    collection: "All",
    query: "",
    subId: null,
  });
  const st = state ?? local;
  const patch = (p: Partial<PrintBrowserState>) => {
    if (onStateChange) onStateChange(p);
    else setLocal((prev) => ({ ...prev, ...p }));
  };
  const { typeId, collection, query, subId } = st;
  const company = st.company ?? "All";
  const product = st.product ?? "All";
  const setTypeId = (v: PrintTypeId | null) => patch({ typeId: v });
  const setCollection = (v: string) => patch({ collection: v });
  const setQuery = (v: string) => patch({ query: v });
  const setSubId = (v: string | null) => patch({ subId: v });
  const [open, setOpen] = useState<PrintLibraryItem | null>(null);
  const { isAdmin } = useIsAdmin();
  const { overrides } = useModuleOverrides("library");

  const divisions = useMemo(
    () => brandModes.filter((b) => !HIDDEN_DIVISION_IDS.has(b.id)),
    [brandModes],
  );

  const brand = useMemo(
    () => divisions.find((b) => b.id === divisionId) ?? divisions[0],
    [divisions, divisionId],
  );

  const subsections = useMemo(() => subsectionsFor(divisionId), [divisionId]);
  const activeSub = useMemo(() => findSubsection(divisionId, subId), [divisionId, subId]);
  const parentSub = useMemo(
    () =>
      subsections.find((s) => s.id === subId || s.children?.some((c) => c.id === subId)) ?? null,
    [subsections, subId],
  );

  const collections = useMemo(
    () => (typeId ? collectionsFor(divisionId, typeId) : []),
    [divisionId, typeId],
  );

  const pool = useMemo(() => {
    const forDivision = (id: string) =>
      typeId ? itemsForDivisionType(id, typeId) : itemsForDivision(id);
    let base = forDivision(divisionId);
    // Sections may borrow items authored on another division's shelf.
    const pulled = activeSub?.pull ?? [];
    if (pulled.length) {
      const seen = new Set(base.map((i) => i.id));
      for (const id of pulled) {
        for (const i of forDivision(id)) {
          if (!seen.has(i.id) && matchesSubsection(i, activeSub)) {
            seen.add(i.id);
            base = [...base, i];
          }
        }
      }
    }
    // Master-admin library overrides win over the shipped definitions, and
    // hidden entries drop out for everyone but admins.
    return applyLibraryOverrides(base, overrides, { includeHidden: isAdmin })
      .filter((i) => collection === "All" || (i.collection ?? "General") === collection)
      .filter((i) => matchesSubsection(i, activeSub))
      .filter((i) => matchesQuery(i, query));
  }, [divisionId, typeId, collection, query, activeSub, overrides, isAdmin]);
  // Company / product counts are taken before those two filters apply, so
  // every option shows how many it would leave.
  const companies = useMemo(() => tagCounts(pool.filter((i) => product === "All" || productOf(i) === product), companyOf), [pool, product]);
  const products = useMemo(() => tagCounts(pool.filter((i) => company === "All" || companyOf(i) === company), productOf), [pool, company]);
  const items = useMemo(
    () =>
      pool
        .filter((i) => company === "All" || companyOf(i) === company)
        .filter((i) => product === "All" || productOf(i) === product),
    [pool, company, product],
  );

  if (!brand) return null;

  return (
    <section className="mt-6 text-foreground" aria-label="Issued print library">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0"><h2 className="text-xl font-semibold">Issued library</h2><p className="mt-1 text-sm text-muted-foreground">{brand.name}</p></div>
        <Button asChild variant="outline" size="sm"><Link to="/library/print/modules"><FileText size={14} />Section modules</Link></Button>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-5 lg:sticky lg:top-20" aria-label="Library folders">
          <label className="block text-xs font-medium text-muted-foreground">Division
            <select aria-label="Division" value={divisionId} onChange={e => { onDivisionChange(e.target.value); setCollection("All"); setSubId(null); }} className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring">
              {divisions.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <nav aria-label="Print types" className="flex gap-1 overflow-x-auto lg:flex-col">
            <Button variant={typeId === null ? "secondary" : "ghost"} className="shrink-0 justify-between text-sm lg:w-full" aria-pressed={typeId === null} onClick={() => { setTypeId(null); setCollection("All"); }}><span className="flex flex-wrap items-center gap-2"><FolderOpen size={15} />All print types</span><span className="font-mono text-xs text-muted-foreground">{itemsForDivision(divisionId).length}</span></Button>
            {PRINT_TYPES.map(t => <Button key={t.id} variant={typeId === t.id ? "secondary" : "ghost"} className="shrink-0 justify-between text-sm lg:w-full" aria-pressed={typeId === t.id} onClick={() => { setTypeId(t.id); setCollection("All"); }}><span className="flex flex-wrap items-center gap-2"><FileText size={15} />{t.plural}</span><span className="font-mono text-xs text-muted-foreground">{itemsForDivisionType(divisionId,t.id).length}</span></Button>)}
          </nav>
          {subsections.length > 0 && <label className="block text-xs font-medium text-muted-foreground">Section<select aria-label="Section" value={parentSub?.id ?? ""} onChange={e => setSubId(e.target.value || null)} className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"><option value="">All sections</option>{subsections.map(section => <option key={section.id} value={section.id}>{section.label}</option>)}</select></label>}
          {parentSub?.children?.length ? <label className="block text-xs font-medium text-muted-foreground">Product<select aria-label="Product" value={activeSub && activeSub.id !== parentSub.id ? activeSub.id : ""} onChange={e => setSubId(e.target.value || parentSub.id)} className="mt-2 h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"><option value="">All {parentSub.label}</option>{parentSub.children.map(child => <option key={child.id} value={child.id}>{child.label}</option>)}</select></label> : null}
        </aside>
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3"><Search size={15} className="shrink-0 text-muted-foreground" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search issued library" aria-label="Search print library" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" />{query && <Button variant="ghost" size="icon" aria-label="Clear search" title="Clear search" onClick={() => setQuery("")}><X size={14} /></Button>}</label>
            <span role="status" className="text-sm text-muted-foreground">{items.length} {items.length === 1 ? "piece" : "pieces"}</span>
          </div>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {typeId && collections.length > 0 && <select aria-label="Collection" value={collection} onChange={e => setCollection(e.target.value)} className="h-9 max-w-full rounded-md border border-input bg-background px-2 text-sm"><option value="All">All collections</option>{collections.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}</select>}
            {([
              ["Company", company, companies, (v: string) => patch({ company: v })],
              ["Product", product, products, (v: string) => patch({ product: v })],
            ] as const).map(([label,value,opts,set]) => opts.length > 1 || value !== "All" ? <select key={label} aria-label={`${label} filter`} value={value} onChange={e => set(e.target.value)} className="h-9 max-w-full rounded-md border border-input bg-background px-2 text-sm"><option value="All">All {label === "Company" ? "companies" : "products"}</option>{opts.map(([v,n]) => <option key={v} value={v}>{v} ({n})</option>)}</select> : null)}
          </div>
          <DivisionPageTemplates divisionId={divisionId} />
          <div className="grid grid-cols-1 gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3">
            {items.map(item => <PrintItemCard key={item.id} item={item} brand={brand} renderPreview={renderPreview} onPreview={() => setOpen(item)} canEditMaster={isAdmin} />)}
          </div>
          {items.length === 0 && <div className="border-y border-border py-12 text-center"><p className="text-sm text-muted-foreground">No pieces match these filters.</p><Button variant="outline" size="sm" className="mt-4" onClick={() => patch({ typeId: null, collection: "All", query: "", subId: null, company: "All", product: "All" })}>Clear filters</Button></div>}
        </div>
      </div>

      {open ? (
        <ItemPreviewOverlay
          item={open}
          brand={brand}
          renderPreview={renderPreview}
          onClose={() => setOpen(null)}
          canEditMaster={isAdmin}
        />
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page templates captured from real pieces, scoped to the active division.
// Collapsible accordion — closed by default for every division.
// ---------------------------------------------------------------------------
function DivisionPageTemplates({ divisionId }: { divisionId: string }) {
  const { templates } = usePrintPageTemplates();
  const [open, setOpen] = useState(false);
  const rows = templates.filter((t) => !t.division_id || t.division_id === divisionId);
  if (rows.length === 0) return null;
  return (
    <div className="mb-6 border-y border-border py-3">
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        variant="ghost" className="flex h-auto w-full items-center justify-between gap-3 px-0 text-left"
      >
        <div className="flex flex-wrap items-baseline gap-3">
          <h3 className="text-sm font-semibold text-foreground">Page templates</h3>
          <span className="text-[11px] text-muted-foreground">{rows.length} captured from real pieces</span>
        </div>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <ChevronDown size={14} />
        </span>
      </Button>
      {open ? (
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((t) => (
            <PageTemplateCard key={t.id} template={t} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview card
// ---------------------------------------------------------------------------
function PrintItemCard({
  item,
  brand,
  renderPreview,
  onPreview,
  canEditMaster,
}: {
  item: PrintLibraryItem;
  brand: BrandMode;
  renderPreview: RenderPreview;
  onPreview: () => void;
  canEditMaster?: boolean;
}) {
  const isTemplate = item.source === "template";
  // Masters with no hero photo (multi-page Solution Proposals in particular)
  // render their live cover page as card art, so every card previews the real
  // document instead of an empty navy plate.
  const multiPage = !isTemplate && isMultiPageItem(item);
  const docArt = !isTemplate && (multiPage || !item.heroUrl);
  const liveArt = isTemplate || docArt;
  const pageCount = pageCountOf(item);
  return (
    <article className="group flex min-w-0 flex-col">
      <Button
        type="button"
        onClick={onPreview}
        aria-label={`Preview ${item.title}`}
        variant="ghost" className="relative block h-auto w-full overflow-hidden rounded-md border border-border bg-muted p-0 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        style={{ height: 0, paddingBottom: "62.5%" }}
      >
        {isTemplate ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 origin-top">
            {/* Full page render, scaled so the top third of the sheet reads as the card art. */}
            <div className="w-full" style={{ aspectRatio: "8.5 / 11" }}>
              {renderPreview(item.kind, brand, item.kind === "adaptor-brief" ? "dark" : "light")}
            </div>
          </div>
        ) : docArt ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 origin-top">
            <div className="w-full" style={{ aspectRatio: "8.5 / 11" }}>
              {renderPreview(item.kind, brand, "light", item.content, 0)}
            </div>
          </div>
        ) : item.heroUrl ? (
          <img
            src={item.heroUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            style={{ objectPosition: `${item.focal?.x ?? 50}% ${item.focal?.y ?? 50}%` }}
          />
        ) : null}
        <span className="absolute left-3 top-3 z-20 inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-normal text-foreground">
          {isTemplate ? "Blank template" : (item.collection ?? "Ready-made")}
        </span>
        {multiPage ? (
          <span className="absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-md bg-foreground px-2 py-0.5 text-[10px] font-medium uppercase tracking-normal text-white">
            {pageCount} pages
          </span>
        ) : null}
      </Button>

      <div className="flex flex-1 flex-col pt-3">
        <div className="text-[11px] uppercase tracking-normal text-muted-foreground">
          {printTypeMeta(item.kind).label}
        </div>
        <h3 className="mt-1 text-sm font-semibold leading-snug text-foreground">{item.title}</h3>
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{item.blurb}</p>

        {item.stats?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {safeList(item.stats).map((s, i) => (
              <span
                key={`${s.label}-${i}`}
                className="inline-flex items-baseline gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                <strong className="text-[11px] font-semibold text-foreground">
                  {s.value}
                  {s.unit ?? ""}
                </strong>
                {s.label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          <Button
            type="button"
            onClick={onPreview}
            variant="outline" size="sm"
          >
            Preview
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {canEditMaster ? <EditMasterLink itemId={item.id} /> : null}
            {!isTemplate && (item.kind === "ebrochure" || item.kind === "case-study") ? (
              <Button asChild variant="outline" size="sm"><Link
                to="/convert"
                search={{ print: item.id }}
                title="Use this piece in social posts, other print sizes and a slide deck"
              >
                Social &amp; slides
              </Link></Button>
            ) : null}
            {isTemplate ? (
              <UseTemplateAction item={item} brand={brand} />
            ) : (
              <CopyItemButton item={item} />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/** Admin-only jump into the master item editor. */
function EditMasterLink({ itemId }: { itemId: string }) {
  return (
    <Link
      to="/admin/print-library/$itemId"
      params={{ itemId }}
      className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-background px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/[0.06]"
    >
      <Pencil size={12} /> Edit master
    </Link>
  );
}

/**
 * Blank-template action. Kinds that ship a curated master (Solution Proposals,
 * MSA partnerships) start from that master's content so "Use template" always
 * opens a fully populated, editable document instead of an empty page. Other
 * kinds keep the brief wizard, which drafts their copy from division knowledge.
 */
const SEED_FROM_MASTER_KINDS = new Set<PrintLibraryItem["kind"]>([
  "solution-proposal",
  "msa-partnership",
]);

function UseTemplateAction({ item, brand }: { item: PrintLibraryItem; brand: BrandMode }) {
  const master = useMemo(
    () =>
      SEED_FROM_MASTER_KINDS.has(item.kind) ? curatedMasterFor(item.kind, brand.id) : undefined,
    [item.kind, brand.id],
  );

  if (master) {
    const seed: PrintLibraryItem =
      master.divisionId === brand.id
        ? master
        : { ...master, id: `${master.id}--${brand.id}`, divisionId: brand.id };
    return <CopyItemButton item={seed} label="Use template" />;
  }

  return (
    <Link
      to="/asset/new"
      search={{ kind: item.kind, brandModeId: brand.id }}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/85"
    >
      Use template <ArrowRight size={12} />
    </Link>
  );
}

function CopyItemButton({ item, label }: { item: PrintLibraryItem; label?: string }) {
  const createFn = useServerFn(createPrintAsset);
  const findFn = useServerFn(findMyPrintAssetForLibraryItem);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  // Admin-authored division copy (e.g. the "Why <division>" page) is stamped
  // into the new copy so the user edits the current wording, not last year's.
  const seed = useDivisionSeed(item.divisionId);

  const makeCopy = async () => {
    const base = toEditableContent(item);
    const seeded = base ? applyDivisionSeedToContent(base, seed) : base;
    // Curated library pieces are approved examples: normalize the new copy to
    // the page budget so the editor opens a piece that already fits its trim
    // instead of one that overflows until the user manually fits it.
    const content = seeded ? approvePrintDemoContent(item.kind, seeded) : seeded;
    if (!content) {
      toast.error("This item has no editable content yet.");
      return;
    }
    setBusy(true);
    try {
      // Reuse the editable copy already made from this exact library item so
      // "Use this template" continues existing work instead of restarting.
      const existing = await findFn({ data: { libraryItemId: item.id } });
      if (existing?.id) {
        toast.success("Opening your existing copy");
        void navigate({ to: "/asset/$assetId", params: { assetId: existing.id } });
        return;
      }
      const row = await createFn({
        data: {
          kind: item.kind,
          title: item.title,
          brandModeId: item.divisionId ?? undefined,
          content,
          context: editableContextFor(item),
        },
      });
      toast.success("Editable copy created");
      void navigate({ to: "/asset/$assetId", params: { assetId: row.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create a copy");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      disabled={busy}
      onClick={() => void makeCopy()}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/85 disabled:opacity-60"
    >
      <Copy size={12} /> {busy ? "Opening…" : (label ?? "Use this template")}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Preview overlay
// ---------------------------------------------------------------------------
// Rendered into <body>: a transformed/filtered ancestor in the page makes
// `position: fixed` relative to it, which pushed the preview's top under the
// site header with no way to scroll up.
function ItemPreviewOverlay(props: Parameters<typeof ItemPreviewOverlayInner>[0]) {
  if (typeof document === "undefined") return null;
  return createPortal(<ItemPreviewOverlayInner {...props} />, document.body);
}

function ItemPreviewOverlayInner({
  item,
  brand,
  renderPreview,
  onClose,
  canEditMaster,
}: {
  item: PrintLibraryItem;
  brand: BrandMode;
  renderPreview: RenderPreview;
  onClose: () => void;
  canEditMaster?: boolean;
}) {
  const isTemplate = item.source === "template";
  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title} preview`}
      onClick={onClose}
    >
      <div
        className={`relative flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden ${isTemplate ? "max-w-[1600px]" : "max-w-[1100px]"} rounded-md bg-background shadow-2xl sm:max-h-[calc(100vh-3rem)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-border bg-background px-6 pb-4 pt-6">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-normal text-muted-foreground">
              {brand.name} · {printTypeMeta(item.kind).label}
              {item.collection ? ` · ${item.collection}` : ""}
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">{item.title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{item.blurb}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {canEditMaster ? <EditMasterLink itemId={item.id} /> : null}
            {isTemplate ? (
              <UseTemplateAction item={item} brand={brand} />
            ) : (
              <CopyItemButton item={item} />
            )}

            <Button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-full border border-input bg-background p-2 text-icon-muted hover:border-primary/50"
            >
              <X size={14} />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {isTemplate ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <PreviewFrame label="Light">{renderPreview(item.kind, brand, "light")}</PreviewFrame>
              <PreviewFrame label="Dark">{renderPreview(item.kind, brand, "dark")}</PreviewFrame>
            </div>
          ) : (
            <PreviewFrame label="Ready-made">
              {renderPreview(item.kind, brand, "light", item.content)}
            </PreviewFrame>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-normal text-muted-foreground">
        {label}
      </div>
      <div className="overflow-hidden rounded-md border border-border shadow-xl">{children}</div>
    </div>
  );
}

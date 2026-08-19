import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, ChevronRight, Copy, FileText, FolderOpen, Search, X } from "lucide-react";

import { createPrintAsset, findMyPrintAssetForLibraryItem } from "@/lib/print-assets.functions";
import {
  PRINT_TYPES,
  collectionsFor,
  curatedCount,
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
import type { BrandMode } from "@/lib/taxonomy";

type RenderPreview = (
  kind: PrintTypeId,
  brand: BrandMode,
  mode: "light" | "dark",
  content?: unknown,
) => React.ReactElement | null;

/**
 * Division → print type → collection browser for the print library. Replaces
 * the old flat template grid + per-division shelves with one navigable shelf
 * system and consistent preview cards.
 */
export function PrintLibraryBrowser({
  brandModes,
  divisionId,
  onDivisionChange,
  renderPreview,
}: {
  brandModes: BrandMode[];
  divisionId: string;
  onDivisionChange: (id: string) => void;
  renderPreview: RenderPreview;
}) {
  const [typeId, setTypeId] = useState<PrintTypeId | null>(null);
  const [collection, setCollection] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<PrintLibraryItem | null>(null);
  const [subId, setSubId] = useState<string | null>(null);

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

  const items = useMemo(() => {
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
    return base
      .filter((i) => collection === "All" || (i.collection ?? "General") === collection)
      .filter((i) => matchesSubsection(i, activeSub))
      .filter((i) => matchesQuery(i, query));
  }, [divisionId, typeId, collection, query, activeSub]);

  if (!brand) return null;

  return (
    <section className="mt-10">
      {/* Breadcrumb path — sticky so any level is one click away, no scrolling */}
      <nav
        aria-label="Print library path"
        className="sticky top-2 z-30 flex flex-wrap items-center gap-1.5 rounded-full border border-black/10 bg-white/85 px-2 py-1.5 text-xs shadow-sm backdrop-blur"
      >
        <button
          type="button"
          onClick={() => {
            setTypeId(null);
            setCollection("All");
            setSubId(null);
            setQuery("");
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1 font-medium text-[#03002C] hover:border-black/30"
        >
          <FolderOpen size={12} /> Print library
        </button>

        {/* Division crumb — switch division inline */}
        <ChevronRight size={12} className="text-black/30" aria-hidden />
        <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white pl-3 pr-1 py-1 font-medium text-[#03002C]">
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full ring-1 ring-black/10"
            style={{ background: brand.tokens.accent }}
          />
          <select
            aria-label="Division"
            value={divisionId}
            onChange={(e) => {
              onDivisionChange(e.target.value);
              setCollection("All");
              setSubId(null);
            }}
            className="max-w-[13rem] cursor-pointer truncate bg-transparent pr-1 text-xs font-medium text-[#03002C] outline-none"
          >
            {divisions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </span>

        {/* Section crumb (practice / product family) */}
        {subsections.length > 0 ? (
          <>
            <ChevronRight size={12} className="text-black/30" aria-hidden />
            <select
              aria-label="Section"
              value={parentSub?.id ?? ""}
              onChange={(e) => setSubId(e.target.value || null)}
              className={
                "cursor-pointer rounded-full px-3 py-1 text-xs font-medium outline-none " +
                (parentSub
                  ? "bg-[#03002C] text-white"
                  : "border border-black/10 bg-white text-black/60")
              }
            >
              <option value="">All sections</option>
              {subsections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </>
        ) : null}

        {/* Product crumb (nested children, e.g. the GlobalLink suite) */}
        {parentSub?.children?.length ? (
          <>
            <ChevronRight size={12} className="text-black/30" aria-hidden />
            <select
              aria-label="Product"
              value={activeSub && activeSub.id !== parentSub.id ? activeSub.id : ""}
              onChange={(e) => setSubId(e.target.value || parentSub.id)}
              className="cursor-pointer rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-[#03002C] outline-none"
              style={
                activeSub && activeSub.id !== parentSub.id
                  ? { background: `color-mix(in oklab, ${brand.tokens.accent} 26%, white)` }
                  : undefined
              }
            >
              <option value="">All {parentSub.label}</option>
              {parentSub.children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </>
        ) : null}

        {/* Print type crumb */}
        <ChevronRight size={12} className="text-black/30" aria-hidden />
        <select
          aria-label="Print type"
          value={typeId ?? ""}
          onChange={(e) => {
            setTypeId((e.target.value || null) as PrintTypeId | null);
            setCollection("All");
          }}
          className={
            "cursor-pointer rounded-full px-3 py-1 text-xs font-medium outline-none " +
            (typeId ? "bg-[#03002C] text-white" : "border border-black/10 bg-white text-black/60")
          }
        >
          <option value="">All print types</option>
          {PRINT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {printTypeMeta(t.id).plural}
            </option>
          ))}
        </select>

        {/* Collection crumb */}
        {typeId && collections.length > 1 ? (
          <>
            <ChevronRight size={12} className="text-black/30" aria-hidden />
            <select
              aria-label="Collection"
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              className="cursor-pointer rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-black/70 outline-none"
            >
              {collections.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </>
        ) : null}

        <span className="ml-auto flex items-center gap-1.5">
          <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-medium text-black/55">
            {items.length} showing
          </span>
          <Link
            to="/library/print/modules"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1 font-medium text-[#03002C] hover:border-black/40"
          >
            <FileText size={12} /> Section modules
          </Link>
        </span>
      </nav>

      {/* Division nav → division hero → print-type sub-folders, one seamless band */}
      <div
        className="mt-4 overflow-hidden rounded-[28px] border shadow-sm"
        style={{
          borderColor: `color-mix(in oklab, ${brand.tokens.accent} 34%, transparent)`,
          background: `linear-gradient(180deg, color-mix(in oklab, ${brand.tokens.accent} 16%, white) 0%, color-mix(in oklab, ${brand.tokens.accent} 7%, white) 42%, white 100%)`,
        }}
      >
        {/* Division nav — aligned card grid, no ragged tab wrapping */}
        <div
          className="px-4 pb-4 pt-4 sm:px-6"
          style={{
            borderBottom: `1px solid color-mix(in oklab, ${brand.tokens.accent} 26%, transparent)`,
          }}
        >
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
              Choose a division
            </span>
            <span className="text-[11px] text-black/40">{divisions.length} divisions</span>
          </div>
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            role="tablist"
            aria-label="Divisions"
          >
            {divisions.map((b) => {
              const active = b.id === divisionId;
              const n = curatedCount(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    onDivisionChange(b.id);
                    setCollection("All");
                    setSubId(null);
                  }}
                  className={
                    "group relative flex min-w-0 items-center gap-2.5 overflow-hidden rounded-xl border px-3 py-2.5 text-left transition " +
                    (active
                      ? "border-transparent bg-white shadow-md"
                      : "border-black/10 bg-white/70 hover:border-black/25 hover:bg-white")
                  }
                  style={
                    active
                      ? {
                          boxShadow: `0 1px 0 rgba(0,0,0,0.04), 0 0 0 2px color-mix(in oklab, ${b.tokens.accent} 62%, transparent)`,
                        }
                      : undefined
                  }
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1"
                    style={{
                      background: b.tokens.accent,
                      opacity: active ? 1 : 0.35,
                    }}
                  />
                  <span
                    aria-hidden
                    className="ml-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ background: b.tokens.accent }}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={
                        "block truncate text-xs font-semibold " +
                        (active ? "text-[#03002C]" : "text-[#03002C]/75")
                      }
                    >
                      {b.name}
                    </span>
                    <span className="block text-[10px] text-black/45">
                      {n > 0
                        ? `${n} ready-made · ${PRINT_TYPES.length} blank`
                        : `${PRINT_TYPES.length} blank templates`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Division hero */}
        <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-6">
          <div className="min-w-0">
            <div
              className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em]"
              style={{ color: `color-mix(in oklab, ${brand.tokens.accent} 72%, #03002C)` }}
            >
              <span
                aria-hidden
                className="inline-block h-1.5 w-6 rounded-full"
                style={{ background: brand.tokens.accent }}
              />
              Division shelf
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#03002C] sm:text-[28px]">
              {brand.name}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-black/55">
              {curatedCount(divisionId) > 0
                ? `${curatedCount(divisionId)} ready-made assets plus ${PRINT_TYPES.length} blank templates, all branded for ${brand.name}.`
                : `${PRINT_TYPES.length} blank templates ready to brand for ${brand.name}.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {typeId ? (
              <button
                type="button"
                onClick={() => {
                  setTypeId(null);
                  setCollection("All");
                }}
                className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-black/35"
              >
                All print types
              </button>
            ) : null}
            <span
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-white"
              style={{ background: "#03002C" }}
            >
              {items.length} showing
            </span>
          </div>
        </div>

        {/* Division sub-sections (practices / product suite) */}
        {subsections.length > 0 ? (
          <div className="mt-4 px-6">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/45">
                {brand.name} sections
              </span>
              {activeSub ? (
                <button
                  type="button"
                  onClick={() => setSubId(null)}
                  className="text-[11px] font-medium text-black/50 underline-offset-2 hover:underline"
                >
                  Clear section
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Sub-sections">
              {subsections.map((s) => {
                const active = parentSub?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    title={s.blurb}
                    onClick={() => setSubId(active ? null : s.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "border-transparent bg-[#03002C] text-white"
                        : "border-black/15 bg-white text-[#03002C] hover:border-black/40"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: brand.tokens.accent }}
                    />
                    {s.label}
                    {s.children ? (
                      <span className={active ? "text-white/60" : "text-black/40"}>
                        {s.children.length}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Nested products, e.g. the GlobalLink suite */}
            {parentSub?.children ? (
              <div
                className="mt-2 flex flex-wrap gap-1.5 border-l-2 pl-3"
                style={{
                  borderColor: `color-mix(in oklab, ${brand.tokens.accent} 45%, transparent)`,
                }}
              >
                {parentSub.children.map((c) => {
                  const active = subId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={active}
                      title={c.blurb}
                      onClick={() => setSubId(active ? parentSub.id : c.id)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                        active
                          ? "border-transparent text-[#03002C]"
                          : "border-black/12 bg-white/70 text-black/65 hover:border-black/30"
                      }`}
                      style={
                        active
                          ? { background: `color-mix(in oklab, ${brand.tokens.accent} 26%, white)` }
                          : undefined
                      }
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Print-type sub-folders — nested inside the division band */}
        <div className="mt-5 grid grid-cols-1 gap-3 px-6 pb-6 sm:grid-cols-2 xl:grid-cols-4">
          {PRINT_TYPES.map((t) => {
            const all = itemsForDivisionType(divisionId, t.id);
            const curated = all.filter((i) => i.source === "curated").length;
            const active = typeId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setTypeId(active ? null : t.id);
                  setCollection("All");
                }}
                className={
                  "relative overflow-hidden rounded-2xl border bg-white p-4 pt-5 text-left transition " +
                  (active ? "shadow-md" : "border-black/10 hover:-translate-y-0.5 hover:shadow-md")
                }
                style={
                  active
                    ? {
                        borderColor: `color-mix(in oklab, ${brand.tokens.accent} 55%, transparent)`,
                        background: `linear-gradient(180deg, color-mix(in oklab, ${brand.tokens.accent} 10%, white), white 70%)`,
                      }
                    : undefined
                }
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1"
                  style={{
                    background: brand.tokens.accent,
                    opacity: active ? 1 : 0.35,
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-black/50">
                    <FileText size={12} /> {t.plural}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#03002C]"
                    style={{
                      background: `color-mix(in oklab, ${brand.tokens.accent} 18%, white)`,
                    }}
                  >
                    {all.length}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-[#03002C]">{t.label}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-black/55">{t.tagline}</p>
                <p className="mt-2 text-[11px] text-black/45">
                  1 blank template
                  {curated > 0 ? ` · ${curated} ready-made in ${brand.name}` : ""}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Collection sub-folders + search */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {typeId && collections.length > 1
            ? ["All", ...collections].map((c) => {
                const active = c === collection;
                const n =
                  c === "All"
                    ? itemsForDivisionType(divisionId, typeId).length
                    : itemsForDivisionType(divisionId, typeId).filter(
                        (i) => (i.collection ?? "General") === c,
                      ).length;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCollection(c)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-transparent bg-[#03002C] text-white"
                        : "border-black/15 bg-white text-[#03002C] hover:border-black/40"
                    }`}
                  >
                    {c}
                    <span className={active ? "text-white/60" : "text-black/40"}>{n}</span>
                  </button>
                );
              })
            : null}
        </div>
        <label className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-3 py-1.5">
          <Search size={12} className="text-black/40" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search this shelf"
            aria-label="Search print library"
            className="w-48 bg-transparent text-xs text-[#03002C] outline-none placeholder:text-black/35"
          />
        </label>
      </div>

      {/* Saved page templates for this division — reuse a real piece as-is */}
      <DivisionPageTemplates divisionId={divisionId} />

      {/* Preview cards */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <PrintItemCard
            key={item.id}
            item={item}
            brand={brand}
            renderPreview={renderPreview}
            onPreview={() => setOpen(item)}
          />
        ))}
      </div>

      {items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center text-sm text-black/55">
          Nothing in this folder yet — clear the search or pick another print type.
        </div>
      ) : null}

      {open ? (
        <ItemPreviewOverlay
          item={open}
          brand={brand}
          renderPreview={renderPreview}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page templates captured from real pieces, scoped to the active division.
// ---------------------------------------------------------------------------
function DivisionPageTemplates({ divisionId }: { divisionId: string }) {
  const { templates } = usePrintPageTemplates();
  const rows = templates.filter((t) => !t.division_id || t.division_id === divisionId);
  if (rows.length === 0) return null;
  return (
    <div className="mt-6 rounded-2xl border border-[#003FC7]/20 bg-[#003FC7]/[0.03] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#03002C]">Page templates</h3>
        <span className="text-[11px] text-black/45">
          {rows.length} captured from real pieces
        </span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((t) => (
          <PageTemplateCard key={t.id} template={t} />
        ))}
      </div>
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
}: {
  item: PrintLibraryItem;
  brand: BrandMode;
  renderPreview: RenderPreview;
  onPreview: () => void;
}) {
  const isTemplate = item.source === "template";
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:border-[#003FC7]/50 hover:shadow-md">
      <button
        type="button"
        onClick={onPreview}
        aria-label={`Preview ${item.title}`}
        className="relative block w-full overflow-hidden bg-[#0b0a2a] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#003FC7]"
        style={{ height: 0, paddingBottom: "62.5%" }}
      >
        {isTemplate ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 origin-top">
            {/* Full page render, scaled so the top third of the sheet reads as the card art. */}
            <div className="w-full" style={{ aspectRatio: "8.5 / 11" }}>
              {renderPreview(item.kind, brand, item.kind === "adaptor-brief" ? "dark" : "light")}
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
        {/* Accent strip only (like modules) — no gradient wash over template art. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1.5"
          style={{ background: brand.tokens.primary }}
        />
        {!isTemplate ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
            style={{
              background: `linear-gradient(180deg, ${brand.tokens.primary}00 0%, ${brand.tokens.primary}B0 100%)`,
            }}
          />
        ) : null}

        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#03002C]">
          {isTemplate ? "Blank template" : (item.collection ?? "Ready-made")}
        </span>
        {!isTemplate ? (
          <h3 className="absolute inset-x-3 bottom-3 line-clamp-2 text-sm font-semibold leading-tight text-white">
            {item.title}
          </h3>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-black/45">
          {printTypeMeta(item.kind).label}
        </div>
        {isTemplate ? (
          <h3 className="mt-1 text-base font-semibold text-[#03002C]">{item.title}</h3>
        ) : null}
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-black/60">{item.blurb}</p>

        {item.stats?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.stats.map((s, i) => (
              <span
                key={`${s.label}-${i}`}
                className="inline-flex items-baseline gap-1 rounded-full border border-black/10 bg-black/[0.02] px-2 py-0.5 text-[10px] text-black/60"
              >
                <strong className="text-[11px] font-semibold text-[#03002C]">
                  {s.value}
                  {s.unit ?? ""}
                </strong>
                {s.label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <button
            type="button"
            onClick={onPreview}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#03002C] hover:border-black/40"
          >
            Preview
          </button>
          {isTemplate ? (
            <Link
              to="/asset/new"
              search={{ kind: item.kind, brandModeId: brand.id }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#003FC7]/85"
            >
              Use template <ArrowRight size={12} />
            </Link>
          ) : (
            <CopyItemButton item={item} />
          )}
        </div>
      </div>
    </article>
  );
}

function CopyItemButton({ item }: { item: PrintLibraryItem }) {
  const createFn = useServerFn(createPrintAsset);
  const findFn = useServerFn(findMyPrintAssetForLibraryItem);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const makeCopy = async () => {
    const content = toEditableContent(item);
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
    <button
      type="button"
      disabled={busy}
      onClick={() => void makeCopy()}
      className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#003FC7]/85 disabled:opacity-60"
    >
      <Copy size={12} /> {busy ? "Opening…" : "Use this template"}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Preview overlay
// ---------------------------------------------------------------------------
function ItemPreviewOverlay({
  item,
  brand,
  renderPreview,
  onClose,
}: {
  item: PrintLibraryItem;
  brand: BrandMode;
  renderPreview: RenderPreview;
  onClose: () => void;
}) {
  const isTemplate = item.source === "template";
  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title} preview`}
      onClick={onClose}
    >
      <div
        className={`relative w-full ${isTemplate ? "max-w-[1600px]" : "max-w-[1100px]"} rounded-2xl bg-[#f5f5f2] p-6 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-5 flex items-start justify-between gap-6 rounded-t-2xl bg-[#f5f5f2]/95 px-6 pb-4 pt-6 backdrop-blur">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-black/50">
              {brand.name} · {printTypeMeta(item.kind).label}
              {item.collection ? ` · ${item.collection}` : ""}
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-[#03002C]">{item.title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-black/60">{item.blurb}</p>
          </div>
          <div className="flex items-center gap-2">
            {isTemplate ? (
              <Link
                to="/asset/new"
                search={{ kind: item.kind, brandModeId: brand.id }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#003FC7]/85"
              >
                Use this template <ArrowRight size={12} />
              </Link>
            ) : (
              <CopyItemButton item={item} />
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-full border border-black/15 bg-white p-2 text-icon-muted hover:border-black/40"
            >
              <X size={14} />
            </button>
          </div>
        </div>

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
  );
}

function PreviewFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-black/50">
        {label}
      </div>
      <div className="overflow-hidden rounded-2xl border border-black/10 shadow-xl">{children}</div>
    </div>
  );
}

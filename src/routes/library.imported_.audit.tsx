import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ClipboardCheck, AlertTriangle, ArrowLeft, Layers } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  listImportedDecksForDivision,
  getImportedDeckSlides,
  importedDeckSlugForDivision,
} from "@/lib/imported-decks.functions";
import type { SlideImportAudit } from "@/lib/pptx-import";

export const Route = createFileRoute("/library/imported_/audit")({
  head: () => ({
    meta: [
      { title: "Import Audit Report · Imported Decks" },
      {
        name: "description",
        content:
          "Per-slide report of which master layers and object types were recovered from the source PowerPoint versus what the importer produced.",
      },
      { property: "og:title", content: "Import Audit Report · Imported Decks" },
      {
        property: "og:description",
        content:
          "Compare source PPTX object counts with recovered shapes and inherited master/layout layers, slide by slide.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImportAuditReport,
});

const basename = (p?: string) => (p ? (p.split("/").pop() ?? p) : "—");

type Row = {
  index: number;
  title: string;
  masterPath?: string;
  layoutPath?: string;
  backgroundFrom: string;
  audit?: SlideImportAudit;
};

const OBJECT_TYPES = [
  ["sp", "Shapes"],
  ["pic", "Pictures"],
  ["cxnSp", "Connectors"],
  ["graphicFrame", "Frames"],
  ["grpSp", "Groups"],
] as const;

function ImportAuditReport() {
  const [brandModeId, setBrandModeId] = useState<string>("bm-enterprise");
  const [deckId, setDeckId] = useState<string | null>(null);
  const [onlyGaps, setOnlyGaps] = useState(false);

  const divisionSlug = useMemo(() => importedDeckSlugForDivision(brandModeId), [brandModeId]);
  const listFn = useServerFn(listImportedDecksForDivision);
  const getSlidesFn = useServerFn(getImportedDeckSlides);

  const decksQ = useQuery({
    queryKey: ["imported-library-decks", divisionSlug],
    queryFn: () => listFn({ data: { divisionId: divisionSlug } }),
  });
  const decks = decksQ.data ?? [];
  const activeDeckId = deckId ?? decks[0]?.id ?? null;

  const slidesQ = useQuery({
    queryKey: ["imported-library-slides", activeDeckId],
    queryFn: () => getSlidesFn({ data: { id: activeDeckId! } }),
    enabled: !!activeDeckId,
  });

  const rows: Row[] = useMemo(() => {
    const deck = slidesQ.data;
    if (!deck) return [];
    return (deck.slides ?? []).map((s) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const layout = s.layout as any;
      return {
        index: s.index,
        title: s.title,
        masterPath: layout?.source?.masterPath as string | undefined,
        layoutPath: layout?.source?.layoutPath as string | undefined,
        backgroundFrom: (layout?.source?.backgroundFrom as string | undefined) ?? "unknown",
        audit: layout?.audit as SlideImportAudit | undefined,
      };
    });
  }, [slidesQ.data]);

  const audited = rows.filter((r) => r.audit);
  const stale = rows.length > 0 && audited.length === 0;
  const gapRows = audited.filter((r) => (r.audit?.missing ?? 0) > 0);

  const totals = useMemo(() => {
    const t = { source: 0, recovered: 0, missing: 0, masterDecor: 0, layoutDecor: 0 };
    for (const r of audited) {
      const a = r.audit!;
      t.source += a.source.total;
      t.recovered += a.recovered.slide;
      t.missing += a.missing;
      t.masterDecor += a.recovered.masterDecor;
      t.layoutDecor += a.recovered.layoutDecor;
    }
    return t;
  }, [audited]);

  const visible = onlyGaps ? gapRows : rows;

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/library/imported"
              className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" strokeWidth={1.75} /> Imported slides
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <ClipboardCheck className="size-5 text-primary" strokeWidth={1.75} />
              Import audit report
            </h1>
            <p className="text-sm text-muted-foreground">
              Object types found in the source PowerPoint versus what was recovered, plus the
              master/layout layers inherited per slide.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/library/imported_/masters"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm hover:bg-muted"
            >
              <Layers className="size-4" strokeWidth={1.75} /> Master audit
            </Link>
            <select
              value={brandModeId}
              onChange={(e) => {
                setBrandModeId(e.target.value);
                setDeckId(null);
              }}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              aria-label="Division"
            >
              {BRAND_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={activeDeckId ?? ""}
              onChange={(e) => setDeckId(e.target.value || null)}
              className="h-9 max-w-[280px] rounded-md border border-border bg-background px-2 text-sm"
              aria-label="Imported deck"
            >
              {decks.length === 0 && <option value="">No imported decks</option>}
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.original_filename}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(decksQ.isLoading || slidesQ.isLoading) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" strokeWidth={1.75} /> Loading slides…
          </div>
        )}

        {stale && (
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 text-primary" strokeWidth={1.75} />
            <p>
              This deck was imported before the audit was captured. Run{" "}
              <strong>Re-extract layouts</strong> on the deck in Imported slides to generate the
              report.
            </p>
          </div>
        )}

        {audited.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-md border border-border px-3 py-1.5">
              {rows.length} slides
            </span>
            <span className="rounded-md border border-border px-3 py-1.5">
              {totals.recovered}/{totals.source} source objects recovered
            </span>
            <span className="rounded-md border border-border px-3 py-1.5">
              {totals.masterDecor} master + {totals.layoutDecor} layout layers
            </span>
            <span
              className={`rounded-md border px-3 py-1.5 ${
                totals.missing ? "border-destructive text-destructive" : "border-border"
              }`}
            >
              {totals.missing} object{totals.missing === 1 ? "" : "s"} missing on {gapRows.length}{" "}
              slide{gapRows.length === 1 ? "" : "s"}
            </span>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={onlyGaps}
                onChange={(e) => setOnlyGaps(e.target.checked)}
                className="size-4 rounded border-border"
              />
              Only slides with gaps
            </label>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Per-slide source object counts, recovered objects by kind, and inherited master and
              layout layers
            </caption>
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2">
                  #
                </th>
                <th scope="col" className="px-3 py-2">
                  Slide
                </th>
                {OBJECT_TYPES.map(([key, label]) => (
                  <th key={key} scope="col" className="px-3 py-2">
                    {label}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2">
                  Recovered
                </th>
                <th scope="col" className="px-3 py-2">
                  By kind
                </th>
                <th scope="col" className="px-3 py-2">
                  Master layers
                </th>
                <th scope="col" className="px-3 py-2">
                  Layout layers
                </th>
                <th scope="col" className="px-3 py-2">
                  Backdrop
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const a = r.audit;
                const gap = (a?.missing ?? 0) > 0;
                return (
                  <tr
                    key={r.index}
                    className={`border-t border-border align-top ${gap ? "bg-destructive/5" : ""}`}
                  >
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.index + 1}</td>
                    <td className="max-w-[220px] px-3 py-2">
                      <span className="line-clamp-2">{r.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {basename(r.masterPath)} · {basename(r.layoutPath)}
                      </span>
                    </td>
                    {OBJECT_TYPES.map(([key]) => (
                      <td key={key} className="px-3 py-2 tabular-nums">
                        {a ? a.source[key] : "—"}
                      </td>
                    ))}
                    <td
                      className={`px-3 py-2 tabular-nums ${gap ? "font-semibold text-destructive" : ""}`}
                    >
                      {a ? `${a.recovered.slide} / ${a.source.total}` : "—"}
                      {gap && (
                        <span className="block text-xs">
                          {a!.missing} missing
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {a && Object.keys(a.recovered.byKind).length > 0
                        ? Object.entries(a.recovered.byKind)
                            .sort((x, y) => y[1] - x[1])
                            .map(([k, v]) => `${k} ${v}`)
                            .join(" · ")
                        : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{a ? a.recovered.masterDecor : "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{a ? a.recovered.layoutDecor : "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.backgroundFrom}</td>
                  </tr>
                );
              })}
              {visible.length === 0 && !slidesQ.isLoading && (
                <tr>
                  <td className="px-3 py-6 text-center text-muted-foreground" colSpan={11}>
                    {onlyGaps ? "No slides with missing objects." : "No slides to report."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

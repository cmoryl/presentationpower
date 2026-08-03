import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Layers, AlertTriangle, ArrowLeft, ImagePlus, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  listImportedDecksForDivision,
  getImportedDeckSlides,
  importedDeckSlugForDivision,
} from "@/lib/imported-decks.functions";
import { extractImportedBackdrop } from "@/lib/imported-backdrop";
import { backdropBasename, backdropCss, backdropLabel } from "@/lib/backdrop-capture";
import {
  BackdropInspector,
  saveBackdropToDivision,
  type BackdropRow,
} from "@/components/imported/BackdropInspector";
import { uploadDivisionImagery, approveDivisionImagery } from "@/lib/division-imagery.functions";


export const Route = createFileRoute("/library/imported_/masters")({
  head: () => ({
    meta: [
      { title: "Master Background Audit · Imported Decks" },
      {
        name: "description",
        content:
          "Audit which slideMaster each imported slide inherits from and preview the inherited backdrop layer to spot mismatches fast.",
      },
      { property: "og:title", content: "Master Background Audit · Imported Decks" },
      {
        property: "og:description",
        content:
          "Per-slide slideMaster and inherited backdrop preview for imported PowerPoint decks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MasterAudit,
});

const basename = backdropBasename;


function MasterAudit() {
  const [brandModeId, setBrandModeId] = useState<string>("bm-enterprise");
  const [deckId, setDeckId] = useState<string | null>(null);

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

  const rows = useMemo(() => {
    const deck = slidesQ.data;
    if (!deck) return [];
    return (deck.slides ?? []).map((s) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const layout = s.layout as any;
      const backdrop = extractImportedBackdrop(
        layout,
        s.imagePaths,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s as any).imageUrls,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (deck as any).theme ?? undefined,
      );
      return {
        index: s.index,
        title: s.title,
        masterPath: layout?.source?.masterPath as string | undefined,
        layoutPath: layout?.source?.layoutPath as string | undefined,
        backgroundFrom: (layout?.source?.backgroundFrom as string | undefined) ?? "unknown",
        backdrop,
      };
    });
  }, [slidesQ.data]);

  // Dominant master → anything else is a mismatch candidate.
  const dominantMaster = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = r.masterPath ?? "";
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let best: string | undefined;
    let n = 0;
    for (const [k, v] of counts) if (v > n) ((best = k), (n = v));
    return best;
  }, [rows]);

  const mismatches = rows.filter(
    (r) => !r.masterPath || (dominantMaster && r.masterPath !== dominantMaster),
  ).length;
  const stale = rows.length > 0 && rows.every((r) => !r.masterPath);

  // ---- Backdrop selection → division imagery -----------------------------
  const [selected, setSelected] = useState<number[]>([]);
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [targetDivision, setTargetDivision] = useState(brandModeId);
  const [saving, setSaving] = useState(false);
  const uploadFn = useServerFn(uploadDivisionImagery);
  const approveFn = useServerFn(approveDivisionImagery);

  const deckName =
    decks.find((d) => d.id === activeDeckId)?.original_filename ?? "Imported deck";
  const inspected = rows.find((r) => r.index === openRow) ?? null;
  const selectable = rows.filter((r) => !!r.backdrop);

  const toggle = (i: number) =>
    setSelected((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));

  const saveSelected = async () => {
    const batch = rows.filter((r) => selected.includes(r.index) && r.backdrop);
    if (!batch.length) return;
    setSaving(true);
    let ok = 0;
    let approved = 0;
    let failed = 0;
    for (const row of batch) {
      try {
        const res = await saveBackdropToDivision({
          row: row as BackdropRow,
          divisionId: targetDivision,
          deckName,
          upload: uploadFn as never,
          approve: approveFn as never,
        });
        ok++;
        if (res.approved) approved++;
      } catch {
        failed++;
      }
    }
    setSaving(false);
    setSelected([]);
    if (ok)
      toast.success(
        `${ok} backdrop${ok === 1 ? "" : "s"} added to ${
          BRAND_MODES.find((m) => m.id === targetDivision)?.name ?? "division"
        } imagery${approved ? ` · ${approved} approved` : " · pending admin approval"}.`,
      );
    if (failed) toast.error(`${failed} backdrop${failed === 1 ? "" : "s"} could not be saved.`);
  };


  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/library/imported"
              className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" strokeWidth={1.75} /> Imported slides
            </Link>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Layers className="size-5 text-primary" strokeWidth={1.75} />
              Master background audit
            </h1>
            <p className="text-sm text-muted-foreground">
              Which slideMaster each slide inherits, and the backdrop layer it resolves to.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
              This deck was imported before master provenance was captured. Run{" "}
              <strong>Re-extract layouts</strong> on the deck in Imported slides to populate the
              slideMaster column.
            </p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="rounded-md border border-border px-3 py-1.5">
              {rows.length} slides
            </span>
            <span className="rounded-md border border-border px-3 py-1.5">
              Dominant master: <strong>{basename(dominantMaster)}</strong>
            </span>
            <span
              className={`rounded-md border px-3 py-1.5 ${
                mismatches ? "border-destructive text-destructive" : "border-border"
              }`}
            >
              {mismatches} mismatch{mismatches === 1 ? "" : "es"}
            </span>
          </div>
        )}

        {selectable.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              {selected.length} backdrop{selected.length === 1 ? "" : "s"} selected
            </span>
            <button
              type="button"
              className="text-xs text-primary underline-offset-2 hover:underline"
              onClick={() =>
                setSelected(
                  selected.length === selectable.length ? [] : selectable.map((r) => r.index),
                )
              }
            >
              {selected.length === selectable.length ? "Clear all" : "Select all"}
            </button>
            <select
              value={targetDivision}
              onChange={(e) => setTargetDivision(e.target.value)}
              className="ml-auto h-9 rounded-md border border-border bg-background px-2 text-sm"
              aria-label="Target division imagery library"
            >
              {BRAND_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              className="gap-1.5"
              disabled={!selected.length || saving}
              onClick={saveSelected}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <ImagePlus className="size-4" strokeWidth={1.75} />
              )}
              Add to division imagery
            </Button>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Per-slide slideMaster, slideLayout and inherited backdrop
            </caption>
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="w-8 px-3 py-2">
                  <span className="sr-only">Select</span>
                </th>
                <th scope="col" className="px-3 py-2">
                  #
                </th>
                <th scope="col" className="px-3 py-2">
                  Backdrop
                </th>
                <th scope="col" className="px-3 py-2">
                  Slide
                </th>
                <th scope="col" className="px-3 py-2">
                  slideMaster
                </th>
                <th scope="col" className="px-3 py-2">
                  slideLayout
                </th>
                <th scope="col" className="px-3 py-2">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const mismatch =
                  !r.masterPath || (dominantMaster && r.masterPath !== dominantMaster);
                return (
                  <tr
                    key={r.index}
                    className={`border-t border-border ${mismatch ? "bg-destructive/5" : ""}`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-[hsl(var(--primary))]"
                        checked={selected.includes(r.index)}
                        disabled={!r.backdrop}
                        onChange={() => toggle(r.index)}
                        aria-label={`Select backdrop from slide ${r.index + 1}`}
                      />
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{r.index + 1}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setOpenRow(r.index)}
                        disabled={!r.backdrop}
                        className="group relative block h-12 w-[85px] overflow-hidden rounded border border-border transition hover:ring-2 hover:ring-primary disabled:cursor-not-allowed"
                        style={backdropCss(r.backdrop)}
                        aria-label={`View larger: slide ${r.index + 1} inherited backdrop — ${backdropLabel(r.backdrop)}`}
                        title={`${backdropLabel(r.backdrop)} — click to view larger`}
                      >
                        {r.backdrop && (
                          <span className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 transition group-hover:opacity-100">
                            <Maximize2 className="size-4" strokeWidth={1.75} />
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="max-w-[280px] truncate px-3 py-2">{r.title || "Untitled"}</td>
                    <td className="px-3 py-2 font-mono text-xs" title={r.masterPath}>
                      {mismatch && r.masterPath && (
                        <AlertTriangle
                          className="mr-1 inline size-3.5 text-destructive"
                          strokeWidth={1.75}
                        />
                      )}
                      {basename(r.masterPath)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs" title={r.layoutPath}>
                      {basename(r.layoutPath)}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.backgroundFrom}</td>
                  </tr>
                );
              })}
              {!slidesQ.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    No slides to audit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {inspected && (
          <BackdropInspector
            row={inspected as BackdropRow}
            deckName={deckName}
            defaultDivisionId={targetDivision}
            onClose={() => setOpenRow(null)}
          />
        )}

      </div>
    </AppShell>
  );
}

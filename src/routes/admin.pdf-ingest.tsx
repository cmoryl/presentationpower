import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  fetchPdfIndex,
  ingestPdfBatch,
  listPdfExtractions,
  getPdfExtractionText,
  type PdfExtractionRow,
} from "@/lib/pdf-ingest.functions";

export const Route = createFileRoute("/admin/pdf-ingest")({
  head: () => ({
    meta: [{ title: "PDF Ingestion · Admin · TransPerfect" }],
  }),
  component: PdfIngestPage,
});

function PdfIngestPage() {
  const fetchIndex = useServerFn(fetchPdfIndex);
  const ingest = useServerFn(ingestPdfBatch);
  const listRows = useServerFn(listPdfExtractions);
  const getText = useServerFn(getPdfExtractionText);

  const indexQ = useQuery({ queryKey: ["pdf-index"], queryFn: () => fetchIndex() });
  const rowsQ = useQuery({ queryKey: ["pdf-extractions"], queryFn: () => listRows() });

  const [entityFilter, setEntityFilter] = useState<string>("");
  const [limit, setLimit] = useState<number>(15);
  const [skipExisting, setSkipExisting] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [runLog, setRunLog] = useState<string>("");

  const ingestMut = useMutation({
    mutationFn: async () => {
      const [entityType, entitySlug] = entityFilter.split(":");
      return ingest({
        data: {
          entityType: entityType || undefined,
          entitySlug: entitySlug || undefined,
          limit,
          skipExisting,
          maxBytes: 15_000_000,
        },
      });
    },
    onSuccess: (res) => {
      setRunLog(
        `Considered ${res.considered} · Queued ${res.queued} · OK ${res.ok} · Failed ${res.failed} · Skipped ${res.skipped}`,
      );
      rowsQ.refetch();
    },
    onError: (e: Error) => setRunLog(`Error: ${e.message}`),
  });

  const openTextQ = useQuery({
    queryKey: ["pdf-extraction-text", openId],
    queryFn: () => (openId ? getText({ data: { id: openId } }) : Promise.resolve(null)),
    enabled: !!openId,
  });

  const stats = useMemo(() => {
    const rows = rowsQ.data ?? [];
    return {
      total: rows.length,
      ok: rows.filter((r) => r.status === "ok").length,
      failed: rows.filter((r) => r.status === "failed").length,
      skipped: rows.filter((r) => r.status === "skipped").length,
    };
  }, [rowsQ.data]);

  const rowsByEntity = useMemo(() => {
    const map = new Map<string, PdfExtractionRow[]>();
    for (const r of rowsQ.data ?? []) {
      const key = `${r.entity_type}:${r.entity_slug}`;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rowsQ.data]);

  return (
    <div className="mt-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-black">PDF Ingestion Pipeline</h2>
        <p className="mt-1 text-sm text-black/60">
          Extract text from BrandHub source PDFs via Gemini and store in a queryable table.
          Idempotent by source URL — reruns skip successfully-extracted docs.
        </p>
      </div>

      {/* Index summary */}
      <section className="rounded-2xl border border-black/10 bg-white/70 p-5">
        <div className="mb-3 text-[10px] uppercase tracking-widest text-black/50">Live index</div>
        {indexQ.isLoading ? (
          <div className="text-sm text-black/50">Loading index…</div>
        ) : indexQ.error ? (
          <div className="text-sm text-red-600">Index error: {(indexQ.error as Error).message}</div>
        ) : indexQ.data ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Assets" value={indexQ.data.total_assets} />
              <Stat label="PDFs" value={indexQ.data.total_pdfs} />
              <Stat label="Non-PDF" value={indexQ.data.total_non_pdfs} />
              <Stat label="Entities" value={indexQ.data.entities.length} />
            </div>
            <div className="mt-4 max-h-56 overflow-y-auto rounded-lg border border-black/[0.06] bg-white text-xs">
              <table className="w-full">
                <thead className="bg-black/[0.03] text-[10px] uppercase tracking-widest text-black/50">
                  <tr>
                    <th className="p-2 text-left">Entity</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-right">PDFs</th>
                    <th className="p-2 text-right">Non-PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {indexQ.data.entities.map((e) => (
                    <tr key={e.key} className="border-t border-black/[0.06]">
                      <td className="p-2">{e.name}</td>
                      <td className="p-2 text-black/60">{e.type}</td>
                      <td className="p-2 text-right font-mono">{e.pdfs}</td>
                      <td className="p-2 text-right font-mono text-black/50">{e.images}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      {/* Run controls */}
      <section className="rounded-2xl border border-black/10 bg-white/70 p-5">
        <div className="mb-3 text-[10px] uppercase tracking-widest text-black/50">Run ingestion</div>
        <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto_auto]">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
          >
            <option value="">All entities</option>
            {(indexQ.data?.entities ?? []).map((e) => (
              <option key={e.key} value={e.key}>
                {e.name} ({e.pdfs} PDFs)
              </option>
            ))}
          </select>
          <input
            type="number"
            value={limit}
            min={1}
            max={300}
            onChange={(e) => setLimit(Number(e.target.value) || 15)}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
            placeholder="Limit"
          />
          <label className="flex items-center gap-2 text-xs text-black/70">
            <input type="checkbox" checked={skipExisting} onChange={(e) => setSkipExisting(e.target.checked)} />
            Skip existing OK
          </label>
          <button
            type="button"
            disabled={ingestMut.isPending}
            onClick={() => ingestMut.mutate()}
            className="rounded-lg bg-[#03002C] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {ingestMut.isPending ? "Running…" : "Run batch"}
          </button>
        </div>
        {runLog && <div className="mt-3 rounded-lg bg-black/[0.04] p-3 font-mono text-xs text-black/80">{runLog}</div>}
        <p className="mt-3 text-[11px] text-black/50">
          Tip: to process all 262 PDFs, pick each entity in turn or leave "All entities" selected and rerun until Queued = 0.
          Reruns are safe.
        </p>
      </section>

      {/* Extractions table */}
      <section className="rounded-2xl border border-black/10 bg-white/70 p-5">
        <div className="flex items-baseline justify-between">
          <div className="text-[10px] uppercase tracking-widest text-black/50">Extractions</div>
          <div className="flex gap-3 text-xs text-black/60">
            <span>Total: <b className="text-black">{stats.total}</b></span>
            <span className="text-emerald-700">OK: <b>{stats.ok}</b></span>
            <span className="text-amber-700">Skipped: <b>{stats.skipped}</b></span>
            <span className="text-red-700">Failed: <b>{stats.failed}</b></span>
          </div>
        </div>
        {rowsQ.isLoading ? (
          <div className="mt-4 text-sm text-black/50">Loading…</div>
        ) : rowsByEntity.length === 0 ? (
          <div className="mt-4 text-sm text-black/50">No extractions yet. Run a batch above.</div>
        ) : (
          <div className="mt-4 space-y-4">
            {rowsByEntity.map(([key, rows]) => (
              <details key={key} className="rounded-lg border border-black/[0.06] bg-white p-3" open>
                <summary className="cursor-pointer text-sm font-medium text-black">
                  {rows[0].entity_name ?? key}{" "}
                  <span className="ml-2 text-[10px] uppercase tracking-widest text-black/40">
                    {rows[0].entity_type} · {rows.length} docs
                  </span>
                </summary>
                <ul className="mt-3 divide-y divide-black/[0.06]">
                  {rows.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-4 py-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-black">{r.title}</div>
                        <div className="mt-0.5 truncate text-[10px] text-black/40">{r.source_url}</div>
                        {r.error && <div className="text-[10px] text-red-600">{r.error}</div>}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest ${
                          r.status === "ok"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {r.status}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-black/50">{r.char_count.toLocaleString()} ch</span>
                      {r.status === "ok" && (
                        <button
                          type="button"
                          onClick={() => setOpenId(r.id)}
                          className="shrink-0 rounded-full border border-black/15 px-2 py-0.5 text-[10px] text-black/70 hover:border-black/40"
                        >
                          View text
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}
      </section>

      {/* Text drawer */}
      {openId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4" onClick={() => setOpenId(null)}>
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{openTextQ.data?.title ?? "…"}</div>
                <div className="truncate text-[10px] text-black/50">{openTextQ.data?.source_url}</div>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="rounded-full border border-black/15 px-3 py-1 text-xs text-black/70"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              {openTextQ.isLoading ? (
                <div className="text-sm text-black/50">Loading…</div>
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-black/80">
                  {openTextQ.data?.extracted_text ?? "(no text)"}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white p-3">
      <div className="text-[10px] uppercase tracking-widest text-black/50">{label}</div>
      <div className="mt-1 font-mono text-2xl text-black">{value.toLocaleString()}</div>
    </div>
  );
}

// Document viewer for Oracle citations: opens the real source behind a [n]
// marker — the original PDF/image where one exists, otherwise the full record.

import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Download, FileText, X } from "lucide-react";
import { getOracleSource } from "@/lib/oracle-source.functions";

const SOURCE_LABEL: Record<string, string> = {
  asset: "Brand document",
  oracle: "Knowledge store",
  kb: "Knowledge entry",
  event: "Event knowledge",
  glossary: "Translation glossary",
  "brand-intel": "Brand intelligence",
};

export function OracleSourceViewer({
  sourceId,
  label,
  onClose,
}: {
  sourceId: string;
  label?: string;
  onClose: () => void;
}) {
  const fetchSource = useServerFn(getOracleSource);
  const q = useQuery({
    queryKey: ["oracle-source", sourceId],
    queryFn: () => fetchSource({ data: { id: sourceId } }),
    retry: false,
    staleTime: 5 * 60_000,
  });
  const doc = q.data && q.data.ok ? q.data : null;
  const file = doc?.file;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close source"
        onClick={onClose}
        className="absolute inset-0 bg-[#03002C]/45 backdrop-blur-sm dark:bg-primary dark:text-primary-foreground"
      />
      <aside className="relative flex h-full w-full max-w-3xl flex-col border-l border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#07061F]">
        <header className="flex items-start justify-between gap-3 border-b border-black/10 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] text-black/50 dark:text-white/50">
              {doc ? (SOURCE_LABEL[doc.source] ?? "Source") : "Source"}
            </div>
            <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-[#03002C] dark:text-white">
              {doc?.title ?? label ?? "Opening source…"}
            </h2>
            {doc?.subtitle && (
              <p className="mt-1 line-clamp-2 text-xs text-black/60 dark:text-white/60">
                {doc.subtitle}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {file && (
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-[11px] text-black/70 hover:border-[#003FC7] hover:text-[#003FC7] dark:border-white/15 dark:text-white/70 dark:hover:border-[#A1FBF9] dark:hover:text-[#A1FBF9]"
              >
                <Download size={12} /> Open file
              </a>
            )}
            {doc?.href && (
              <a
                href={doc.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-[11px] text-black/70 hover:border-[#003FC7] hover:text-[#003FC7] dark:border-white/15 dark:text-white/70"
              >
                Manage <ArrowUpRight size={12} />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-black/15 p-1.5 text-black/60 hover:border-[#003FC7] hover:text-[#003FC7] dark:border-white/15 dark:text-white/60"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {q.isLoading && (
            <div className="text-xs text-black/50 dark:text-white/50">Opening the source…</div>
          )}
          {q.error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {(q.error as Error).message}
            </div>
          )}
          {q.data && !q.data.ok && (
            <div className="rounded-md border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
              {q.data.error}
            </div>
          )}

          {doc && (
            <div className="space-y-4">
              {doc.meta.length > 0 && (
                <dl className="flex flex-wrap gap-x-5 gap-y-1.5">
                  {doc.meta.map((m) => (
                    <div key={`${m.label}-${m.value}`} className="text-[11px]">
                      <dt className="uppercase tracking-widest text-black/40 dark:text-white/40">
                        {m.label}
                      </dt>
                      <dd className="text-black/75 dark:text-white/75">{m.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {doc.excerpt && (
                <div className="rounded-xl border-l-2 border-[#003FC7] bg-[#EEF1F7] px-4 py-3 dark:border-[#A1FBF9] dark:bg-white/[0.06]">
                  <div className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                    Cited passage
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#03002C] dark:text-white">
                    {doc.excerpt}
                  </p>
                </div>
              )}

              {file && file.kind === "pdf" && (
                <iframe
                  title={file.filename}
                  src={`${file.url}#view=FitH`}
                  className="h-[70vh] w-full rounded-xl border border-black/10 bg-white dark:border-white/10"
                />
              )}
              {file && file.kind === "image" && (
                <img
                  src={file.url}
                  alt={file.filename}
                  className="w-full rounded-xl border border-black/10 dark:border-white/10"
                />
              )}
              {file && file.kind === "other" && (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-4 py-3 text-sm text-black/75 hover:border-[#003FC7] hover:text-[#003FC7] dark:border-white/10 dark:text-white/75"
                >
                  <FileText size={14} /> {file.filename} — open in a new tab
                </a>
              )}
              {!file && doc.fileNote && (
                <div className="rounded-md border border-black/10 bg-black/[0.03] px-3 py-2 text-[11px] text-black/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60">
                  {doc.fileNote}
                </div>
              )}

              {doc.body && (
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">
                    {doc.source === "asset" ? "Full document text" : "Full record"}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-black/75 dark:text-white/75">
                    {doc.body}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

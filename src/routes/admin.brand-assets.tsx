import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  listBrandAssets,
  createBrandAsset,
  ingestBrandAsset,
  deleteBrandAsset,
  getBrandAssetSignedUrl,
  importBrandhubSeed,
} from "@/lib/brand-assets.functions";

export const Route = createFileRoute("/admin/brand-assets")({
  component: BrandAssetsAdminView,
});

function BrandAssetsAdminView() {
  const listFn = useServerFn(listBrandAssets);
  const createFn = useServerFn(createBrandAsset);
  const ingestFn = useServerFn(ingestBrandAsset);
  const deleteFn = useServerFn(deleteBrandAsset);
  const signFn = useServerFn(getBrandAssetSignedUrl);
  const importFn = useServerFn(importBrandhubSeed);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["admin", "brand-assets"], queryFn: () => listFn(), retry: false });

  const [division, setDivision] = useState<string>("master");
  const [kind, setKind] = useState<"pdf" | "brochure" | "guide" | "logo" | "image" | "other">("pdf");
  const [title, setTitle] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [seedText, setSeedText] = useState("");
  const [replaceOnImport, setReplaceOnImport] = useState(false);

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "brand-assets"] }),
  });

  const importSeed = useMutation({
    mutationFn: async () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(seedText);
      } catch {
        throw new Error("Seed JSON is not valid JSON.");
      }
      const seed = parsed as {
        oracle_intelligence?: unknown[];
        oracle_knowledge_base?: unknown[];
        brand_intelligence?: unknown[];
      };
      return importFn({
        data: {
          seed: {
            oracle_intelligence: (seed.oracle_intelligence ?? []) as any,
            oracle_knowledge_base: (seed.oracle_knowledge_base ?? []) as any,
            brand_intelligence: (seed.brand_intelligence ?? []) as any,
          },
          replace: replaceOnImport,
        },
      });
    },
    onSuccess: (res) => {
      setStatus(`Imported: ${res.counts.oracle} oracle synthesis, ${res.counts.oracleKb} knowledge rows, ${res.counts.brandIntel} brand intelligence rows.`);
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (e) => setStatus(`Import failed: ${(e as Error).message}`),
  });

  async function handleUpload(file: File) {
    if (!title.trim()) {
      setStatus("Enter a title before uploading.");
      return;
    }
    setBusy("uploading");
    setStatus(null);
    try {
      const path = `${division}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("brand-assets").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/pdf",
      });
      if (upErr) throw upErr;
      const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
      const created = await createFn({
        data: {
          divisionId: division,
          kind,
          title: title.trim(),
          sourceFilename: file.name,
          storagePath: path,
          tags,
        },
      });
      setStatus("Uploaded. Extracting text and embedding…");
      setBusy("ingesting");
      // For PDFs, send as base64 for server-side extraction. For other kinds,
      // skip auto-ingest (upload only).
      if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
        const base64 = await fileToBase64(file);
        const res = await ingestFn({
          data: {
            assetId: created.id,
            fileBase64: base64,
            mimeType: file.type || "application/pdf",
          },
        });
        if (res.ok) {
          setStatus(`Ingested ${res.chunkCount} chunks. Ready for retrieval.`);
        } else {
          setStatus(`Uploaded but ingest failed: ${res.error ?? "unknown"}`);
        }
      } else {
        setStatus("Uploaded (non-PDF; skipped auto text extraction).");
      }
      setTitle("");
      setTagsStr("");
      qc.invalidateQueries({ queryKey: ["admin", "brand-assets"] });
    } catch (e) {
      setStatus(`Upload failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleOpen(id: string) {
    try {
      const { url } = await signFn({ data: { id } });
      if (url) window.open(url, "_blank", "noopener");
    } catch (e) {
      setStatus(`Cannot open: ${(e as Error).message}`);
    }
  }

  const groups = useMemo(() => {
    const list = q.data ?? [];
    const map = new Map<string, typeof list>();
    for (const r of list) {
      const key = r.division_id ?? "unassigned";
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [q.data]);

  if (q.error && isForbidden(q.error)) return <AdminForbidden />;

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold">Import BrandHUB seed</h2>
        <p className="mt-1 text-sm text-black/60">
          Paste the contents of <code>public/knowledge-export/database-seed.json</code> from the BrandHUB project.
          This upserts Oracle synthesis, Oracle knowledge base entries, and per-division brand intelligence rows.
        </p>
        <textarea
          value={seedText}
          onChange={(e) => setSeedText(e.target.value)}
          placeholder='{ "oracle_intelligence": [...], "oracle_knowledge_base": [...], "brand_intelligence": [...] }'
          rows={6}
          className="mt-3 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-xs font-mono"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-black/70">
            <input type="checkbox" checked={replaceOnImport} onChange={(e) => setReplaceOnImport(e.target.checked)} />
            Replace existing rows first
          </label>
          <button
            onClick={() => importSeed.mutate()}
            disabled={!seedText.trim() || importSeed.isPending}
            className="rounded-full bg-[#003FC7] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {importSeed.isPending ? "Importing…" : "Import seed"}
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Upload a brand PDF or brochure</h2>
        <p className="mt-1 text-sm text-black/60">
          PDFs are stored privately, text is extracted with Gemini, chunked, and embedded for retrieval.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="text-xs text-black/70">
            <div className="mb-1 font-medium">Division</div>
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            >
              <option value="master">TransPerfect (master)</option>
              {BRAND_MODES.filter((b) => b.id !== "master").map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-black/70">
            <div className="mb-1 font-medium">Kind</div>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as any)}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            >
              <option value="pdf">PDF</option>
              <option value="brochure">Brochure</option>
              <option value="guide">Guide</option>
              <option value="logo">Logo</option>
              <option value="image">Image</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="text-xs text-black/70 md:col-span-2">
            <div className="mb-1 font-medium">Title</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. GlobalLink 2026 Enterprise Brochure"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-black/70 md:col-span-3">
            <div className="mb-1 font-medium">Tags (comma-separated)</div>
            <input
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="brochure, enterprise, 2026"
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-black/70">
            <div className="mb-1 font-medium">File</div>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
              }}
              disabled={busy !== null}
              className="w-full text-xs"
            />
          </label>
        </div>
        {status && (
          <div className="mt-3 rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 text-xs text-black/70">
            {status}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Uploaded brand assets</h2>
          <div className="text-xs text-black/50">
            {(q.data ?? []).length} assets · {(q.data ?? []).reduce((a: number, r: any) => a + (r.chunkCount ?? 0), 0)} chunks
          </div>
        </div>
        {q.isLoading ? (
          <div className="mt-6 text-sm text-black/50">Loading…</div>
        ) : (q.data ?? []).length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-black/15 bg-black/[0.02] p-8 text-center text-sm text-black/50">
            No assets yet. Upload PDFs above to feed personalization and RAG.
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            {groups.map(([divId, items]) => (
              <div key={divId}>
                <div className="text-xs uppercase tracking-[0.25em] text-black/50">
                  {BRAND_MODES.find((b) => b.id === divId)?.name ?? divId}
                </div>
                <div className="mt-2 grid gap-2">
                  {items.map((r: any) => (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-white p-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{r.title}</div>
                        <div className="mt-0.5 text-xs text-black/50">
                          {r.kind} · {r.source_filename} · {r.chunkCount} chunks
                          {r.tags?.length ? ` · ${r.tags.join(", ")}` : ""}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpen(r.id)}
                          className="rounded-lg border border-black/10 px-3 py-1 text-xs hover:border-black/30"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${r.title}?`)) del.mutate(r.id);
                          }}
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result ?? "");
      const idx = s.indexOf(",");
      resolve(idx >= 0 ? s.slice(idx + 1) : s);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

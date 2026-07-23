import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  listDivisionImagery,
  uploadDivisionImagery,
  updateDivisionImagery,
  deleteDivisionImagery,
  approveDivisionImagery,
  type DivisionImageryEntry,
} from "@/lib/division-imagery.functions";
import { getDivisionImageryStats } from "@/lib/admin.functions";
import { UploadCloud, Trash2, CheckCircle2, Circle, Tag, Loader2, Star, Layers, BarChart3 } from "lucide-react";
import { generateImageVariants } from "@/lib/image-variants";

const TEMPLATE_KINDS = ["spotlight", "ebrochure", "case-study", "adaptor-brief"] as const;
type TemplateKind = (typeof TEMPLATE_KINDS)[number];
const TEMPLATE_LABEL: Record<TemplateKind, string> = {
  spotlight: "Spotlight",
  ebrochure: "eBrochure",
  "case-study": "Case Study",
  "adaptor-brief": "Adaptor Brief",
};

export const Route = createFileRoute("/admin/imagery")({
  head: () => ({ meta: [{ title: "Division imagery · Admin" }] }),
  component: AdminImageryPage,
});

const KINDS = ["photo", "abstract", "generated", "upload"] as const;
type Kind = (typeof KINDS)[number];

function AdminImageryPage() {
  const listFn = useServerFn(listDivisionImagery);
  const uploadFn = useServerFn(uploadDivisionImagery);
  const updateFn = useServerFn(updateDivisionImagery);
  const approveFn = useServerFn(approveDivisionImagery);
  const deleteFn = useServerFn(deleteDivisionImagery);
  const qc = useQueryClient();

  const [divisionId, setDivisionId] = useState<string>(BRAND_MODES[0]?.id ?? "bm-enterprise");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending">("all");
  const [tagQuery, setTagQuery] = useState("");
  const [templateFilter, setTemplateFilter] = useState<TemplateKind | "all">("all");
  const [collectionFilter, setCollectionFilter] = useState<string>("all");

  const q = useQuery({
    queryKey: ["admin-division-imagery", divisionId],
    queryFn: () => listFn({ data: { divisionId } }),
  });

  const statsFn = useServerFn(getDivisionImageryStats);
  const statsQ = useQuery({
    queryKey: ["admin-division-imagery-stats", divisionId],
    queryFn: () => statsFn({ data: { divisionId, days: 90 } }),
    staleTime: 60_000,
  });
  const statsByImage = statsQ.data?.byImage ?? {};
  const statsTotals = statsQ.data?.totals;

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin-division-imagery", divisionId] });

  type UploadInput = {
    divisionId: string;
    filename: string;
    contentType: string;
    data: string;
    kind: Kind;
    tags: string[];
  };
  const uploadMut = useMutation({
    mutationFn: (input: UploadInput) => uploadFn({ data: input }),
    onSuccess: () => {
      toast.success("Uploaded");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const approveMut = useMutation({
    mutationFn: (input: { id: string; approved: boolean }) => approveFn({ data: input }),
    onSuccess: (_, v) => {
      toast.success(v.approved ? "Approved" : "Unapproved");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const tagsMut = useMutation({
    mutationFn: (input: { id: string; tags: string[] }) => updateFn({ data: input }),
    onSuccess: () => {
      toast.success("Tags saved");
      invalidate();
    },
  });

  const kindMut = useMutation({
    mutationFn: (input: { id: string; kind: Kind }) => updateFn({ data: input }),
    onSuccess: () => invalidate(),
  });

  const targetingMut = useMutation({
    mutationFn: (input: {
      id: string;
      collection?: string | null;
      template_kinds?: TemplateKind[];
      is_default_for?: TemplateKind[];
    }) => updateFn({ data: input }),
    onSuccess: () => invalidate(),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      invalidate();
    },
  });

  const rows = q.data ?? [];
  const collections = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.collection) set.add(r.collection);
    });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const tag = tagQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "approved" && !r.approved) return false;
      if (statusFilter === "pending" && r.approved) return false;
      if (tag && !r.tags.some((t) => t.toLowerCase().includes(tag))) return false;
      if (templateFilter !== "all") {
        const t = r.template_kinds ?? [];
        const d = r.is_default_for ?? [];
        const universal = t.length === 0;
        if (!universal && !t.includes(templateFilter) && !d.includes(templateFilter)) return false;
      }
      if (collectionFilter !== "all") {
        if (collectionFilter === "__none" && r.collection) return false;
        if (collectionFilter !== "__none" && r.collection !== collectionFilter) return false;
      }
      return true;
    });
  }, [rows, statusFilter, tagQuery, templateFilter, collectionFilter]);

  if (q.error && isForbidden(q.error)) return <AdminForbidden />;

  const approvedCount = rows.filter((r) => r.approved).length;

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/50">Admin · Imagery</div>
        <h1 className="mt-2 text-3xl font-semibold text-[#03002C] dark:text-white">Division imagery library.</h1>
        <p className="mt-2 max-w-2xl text-sm text-black/60 dark:text-white/60">
          Upload, tag, and approve hero imagery per division. Approved assets surface in the print template picker,
          slide hero picker, and library shelves.
        </p>
      </header>

      {/* Toolbar */}
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <label className="text-xs">
          <div className="mb-1 uppercase tracking-wider text-black/50">Division</div>
          <select
            value={divisionId}
            onChange={(e) => setDivisionId(e.target.value)}
            className="rounded-md border border-black/15 bg-white p-2 text-sm"
          >
            {BRAND_MODES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <div className="mb-1 uppercase tracking-wider text-black/50">Status</div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-md border border-black/15 bg-white p-2 text-sm"
          >
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>
        </label>
        <label className="text-xs">
          <div className="mb-1 uppercase tracking-wider text-black/50">Template</div>
          <select
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value as TemplateKind | "all")}
            className="rounded-md border border-black/15 bg-white p-2 text-sm"
          >
            <option value="all">Any</option>
            {TEMPLATE_KINDS.map((t) => (
              <option key={t} value={t}>{TEMPLATE_LABEL[t]}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <div className="mb-1 uppercase tracking-wider text-black/50">Collection</div>
          <select
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
            className="rounded-md border border-black/15 bg-white p-2 text-sm"
          >
            <option value="all">All</option>
            <option value="__none">Uncategorized</option>
            {collections.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <div className="mb-1 uppercase tracking-wider text-black/50">Filter by tag</div>
          <input
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
            placeholder="e.g. hero, portrait"
            className="rounded-md border border-black/15 bg-white p-2 text-sm"
          />
        </label>
        <div className="ml-auto text-xs text-black/50">
          {rows.length} total · <span className="text-emerald-700">{approvedCount} approved</span>
        </div>
      </section>

      {/* Uploader */}
      <Uploader
        divisionId={divisionId}
        onDone={invalidate}
      />

      {/* Bulk approve of currently-filtered pending rows */}
      {filtered.some((r) => !r.approved) ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-[#003FC7]/5 px-4 py-3 text-xs text-black/70">
          <CheckCircle2 size={14} className="text-[#003FC7]" />
          <span>
            {filtered.filter((r) => !r.approved).length} pending in the current view
          </span>
          <button
            type="button"
            onClick={async () => {
              const pending = filtered.filter((r) => !r.approved);
              if (pending.length === 0) return;
              if (
                !window.confirm(
                  `Approve ${pending.length} image${pending.length === 1 ? "" : "s"}?`,
                )
              )
                return;
              // Sequential to keep RLS + toast noise sane; small batches expected.
              for (const r of pending) {
                await approveMut.mutateAsync({ id: r.id, approved: true }).catch(() => {});
              }
            }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-3 py-1.5 text-white hover:bg-[#003FC7]/85"
          >
            <CheckCircle2 size={12} /> Approve all pending
          </button>
        </div>
      ) : null}

      {/* Analytics totals for the selected division (last 90 days) */}
      {statsTotals ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-xs text-black/70">
          <BarChart3 size={13} className="text-[#003FC7]" />
          <span className="font-medium uppercase tracking-wider text-black/50">
            Last 90d ·
          </span>
          <span>{statsTotals.view} views</span>
          <span className="text-black/25">·</span>
          <span>{statsTotals.select} selects</span>
          <span className="text-black/25">·</span>
          <span>{statsTotals.download} downloads</span>
        </div>
      ) : null}

      {/* Grid */}
      {q.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-black/50">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center text-sm text-black/60">
          No imagery matches these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <ImageCard
              key={r.id}
              row={r}
              stats={statsByImage[r.id]}
              onApprove={(next) => approveMut.mutate({ id: r.id, approved: next })}
              onTags={(tags) => tagsMut.mutate({ id: r.id, tags })}
              onKind={(kind) => kindMut.mutate({ id: r.id, kind })}
              onTargeting={(patch) => targetingMut.mutate({ id: r.id, ...patch })}
              onDelete={() => {
                if (window.confirm("Delete this image permanently?")) delMut.mutate(r.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bulk Uploader
// - Queues N files, uploads with limited concurrency
// - Optional CSV tagging: per-filename tags / kind / approve
// - Optional auto-approve after upload
// - Owns its own uploadFn/approveFn so it can chain reliably
// ---------------------------------------------------------------------------
type CsvRule = { tags?: string[]; kind?: Kind; approve?: boolean };
type CsvMap = Record<string, CsvRule>; // key = normalized filename (lowercased)

type QueueItem = {
  id: string;
  file: File;
  status: "queued" | "reading" | "uploading" | "approving" | "done" | "error";
  message?: string;
  rowId?: string;
};

function normalizeName(s: string): string {
  return s.trim().toLowerCase();
}

// Very small CSV parser tolerant of quoted fields and Windows line endings.
// Header row required. Recognized columns: filename, tags, kind, approve.
function parseCsvTagging(text: string): { map: CsvMap; rowCount: number } {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell.length === 0) {
      quoted = true;
    } else if (ch === ",") {
      cur.push(cell);
      cell = "";
    } else if (ch === "\n") {
      cur.push(cell);
      rows.push(cur);
      cur = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || cur.length > 0) {
    cur.push(cell);
    rows.push(cur);
  }
  if (rows.length === 0) return { map: {}, rowCount: 0 };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = {
    filename: header.indexOf("filename"),
    tags: header.indexOf("tags"),
    kind: header.indexOf("kind"),
    approve: header.indexOf("approve"),
  };
  if (idx.filename < 0) throw new Error('CSV needs a "filename" column');
  const map: CsvMap = {};
  let count = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const fn = (row[idx.filename] ?? "").trim();
    if (!fn) continue;
    const rule: CsvRule = {};
    if (idx.tags >= 0) {
      const raw = row[idx.tags] ?? "";
      rule.tags = raw
        .split(/[|;,]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 24);
    }
    if (idx.kind >= 0) {
      const k = (row[idx.kind] ?? "").trim().toLowerCase();
      if ((KINDS as readonly string[]).includes(k)) rule.kind = k as Kind;
    }
    if (idx.approve >= 0) {
      const v = (row[idx.approve] ?? "").trim().toLowerCase();
      rule.approve = ["1", "true", "yes", "y", "approve", "approved"].includes(v);
    }
    map[normalizeName(fn)] = rule;
    count++;
  }
  return { map, rowCount: count };
}

function Uploader({
  divisionId,
  onDone,
}: {
  divisionId: string;
  onDone: () => void;
}) {
  const uploadFn = useServerFn(uploadDivisionImagery);
  const approveFn = useServerFn(approveDivisionImagery);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const [kind, setKind] = useState<Kind>("photo");
  const [tagsRaw, setTagsRaw] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [csv, setCsv] = useState<{ name: string; map: CsvMap; count: number } | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);

  const defaultTags = () =>
    tagsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 24);

  const readCsv = async (file: File) => {
    try {
      const text = await file.text();
      const { map, rowCount } = parseCsvTagging(text);
      setCsv({ name: file.name, map, count: rowCount });
      toast.success(`Loaded ${rowCount} CSV rule${rowCount === 1 ? "" : "s"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read CSV");
    }
  };

  const enqueue = (files: FileList | File[]) => {
    const list = Array.from(files);
    const additions: QueueItem[] = [];
    for (const file of list) {
      if (!file.type.startsWith("image/")) {
        toast.error(`Skipped ${file.name}: not an image`);
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`Skipped ${file.name}: exceeds 20MB`);
        continue;
      }
      additions.push({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        status: "queued",
      });
    }
    if (additions.length) setQueue((q) => [...q, ...additions]);
  };

  const patch = (id: string, next: Partial<QueueItem>) =>
    setQueue((q) => q.map((it) => (it.id === id ? { ...it, ...next } : it)));

  const uploadOne = async (item: QueueItem) => {
    const rule = csv?.map[normalizeName(item.file.name)] ?? {};
    const finalKind: Kind = rule.kind ?? kind;
    const finalTags = rule.tags ?? defaultTags();

    try {
      patch(item.id, { status: "reading" });
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(item.file);
      });

      let variants: Awaited<ReturnType<typeof generateImageVariants>> = [];
      try {
        variants = await generateImageVariants(item.file);
      } catch {
        // fallback: original only
      }

      patch(item.id, { status: "uploading" });
      const row = await uploadFn({
        data: {
          divisionId,
          filename: item.file.name,
          contentType: item.file.type || "image/png",
          data: dataUrl,
          kind: finalKind,
          tags: finalTags,
          variants: variants.map((v) => ({
            preset: v.preset,
            filename: v.filename,
            contentType: v.contentType,
            data: v.data,
            width: v.width,
            height: v.height,
          })),
        },
      });

      const shouldApprove = rule.approve ?? autoApprove;
      if (shouldApprove && row?.id) {
        patch(item.id, { status: "approving", rowId: row.id });
        await approveFn({ data: { id: row.id, approved: true } });
      }
      patch(item.id, { status: "done", rowId: row?.id });
    } catch (err) {
      patch(item.id, {
        status: "error",
        message: err instanceof Error ? err.message : "Failed",
      });
    }
  };

  const runQueue = async () => {
    if (running) return;
    setRunning(true);
    const CONCURRENCY = 3;
    // Snapshot current queued items; re-reads state each pass so late adds pick up too.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const snapshot = await new Promise<QueueItem[]>((r) => {
        setQueue((q) => {
          r(q);
          return q;
        });
      });
      const pending = snapshot.filter((it) => it.status === "queued");
      if (pending.length === 0) break;
      const batch = pending.slice(0, CONCURRENCY);
      await Promise.all(batch.map(uploadOne));
    }
    setRunning(false);
    onDone();
  };

  const clearFinished = () =>
    setQueue((q) => q.filter((it) => it.status !== "done" && it.status !== "error"));

  const stats = useMemo(() => {
    const s = { queued: 0, active: 0, done: 0, error: 0 };
    for (const it of queue) {
      if (it.status === "queued") s.queued++;
      else if (it.status === "done") s.done++;
      else if (it.status === "error") s.error++;
      else s.active++;
    }
    return s;
  }, [queue]);

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) enqueue(e.dataTransfer.files);
      }}
      className={
        "space-y-4 rounded-2xl border-2 border-dashed p-6 transition " +
        (dragging ? "border-[#003FC7] bg-[#003FC7]/5" : "border-black/15 bg-white")
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#03002C]">
            <UploadCloud size={16} /> Bulk upload imagery
          </div>
          <p className="mt-1 text-xs text-black/55">
            Drop or pick many images. Max 20MB each. Optionally load a CSV to tag / approve per filename.
          </p>
        </div>
        <label className="text-xs">
          <div className="mb-1 uppercase tracking-wider text-black/50">Default kind</div>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
            className="rounded-md border border-black/15 bg-white p-2 text-sm"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <div className="mb-1 uppercase tracking-wider text-black/50">Default tags</div>
          <input
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="hero, portrait, life-sciences"
            className="w-64 rounded-md border border-black/15 bg-white p-2 text-sm"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-xs text-black/70">
          <input
            type="checkbox"
            checked={autoApprove}
            onChange={(e) => setAutoApprove(e.target.checked)}
            className="h-4 w-4 accent-[#003FC7]"
          />
          Auto-approve after upload
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-4 py-2 text-xs font-medium text-white hover:bg-[#003FC7]/85"
        >
          <UploadCloud size={12} /> Add files
        </button>
        <button
          type="button"
          onClick={() => csvInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-3 py-2 text-xs text-black/70 hover:border-[#003FC7] hover:text-[#003FC7]"
        >
          <Tag size={12} /> {csv ? `CSV: ${csv.name} (${csv.count})` : "Load tagging CSV"}
        </button>
        {csv ? (
          <button
            type="button"
            onClick={() => setCsv(null)}
            className="text-[11px] text-black/50 underline underline-offset-2 hover:text-black/70"
          >
            clear
          </button>
        ) : null}
        <div className="ml-auto flex items-center gap-2 text-[11px] text-black/55">
          <span>{stats.queued} queued</span>
          <span>·</span>
          <span>{stats.active} in-flight</span>
          <span>·</span>
          <span className="text-emerald-700">{stats.done} done</span>
          {stats.error ? (
            <>
              <span>·</span>
              <span className="text-rose-700">{stats.error} failed</span>
            </>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void runQueue()}
          disabled={running || stats.queued === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#03002C] px-4 py-2 text-xs font-medium text-white disabled:opacity-60"
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
          {running ? "Uploading…" : `Start (${stats.queued})`}
        </button>
        {queue.length > 0 ? (
          <button
            type="button"
            onClick={clearFinished}
            disabled={running}
            className="rounded-full border border-black/15 bg-white px-3 py-2 text-[11px] text-black/60 hover:text-black/85 disabled:opacity-50"
          >
            Clear done
          </button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) enqueue(e.target.files);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void readCsv(f);
            if (csvInputRef.current) csvInputRef.current.value = "";
          }}
        />
      </div>

      {csv ? (
        <p className="text-[11px] text-black/55">
          CSV columns supported: <code>filename</code>, <code>tags</code> (use{" "}
          <code>|</code> to separate), <code>kind</code>, <code>approve</code>. Matched by exact
          filename (case-insensitive). Unmatched files use the defaults above.
        </p>
      ) : null}

      {queue.length > 0 ? (
        <ul className="max-h-72 divide-y divide-black/5 overflow-auto rounded-xl border border-black/10 bg-white">
          {queue.map((it) => {
            const rule = csv?.map[normalizeName(it.file.name)];
            return (
              <li key={it.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                <span
                  className={
                    "inline-flex h-2 w-2 shrink-0 rounded-full " +
                    (it.status === "done"
                      ? "bg-emerald-500"
                      : it.status === "error"
                        ? "bg-rose-500"
                        : it.status === "queued"
                          ? "bg-black/20"
                          : "bg-[#003FC7] animate-pulse")
                  }
                />
                <span className="line-clamp-1 flex-1 font-medium text-[#03002C]">
                  {it.file.name}
                </span>
                <span className="text-[10px] text-black/45">
                  {(it.file.size / 1024).toFixed(0)} KB
                </span>
                {rule ? (
                  <span className="rounded-full bg-[#003FC7]/10 px-2 py-0.5 text-[10px] text-[#003FC7]">
                    CSV
                  </span>
                ) : null}
                <span className="w-24 text-right text-[10px] uppercase tracking-wider text-black/50">
                  {it.status === "error" && it.message ? it.message : it.status}
                </span>
                {it.status === "queued" && !running ? (
                  <button
                    type="button"
                    onClick={() => setQueue((q) => q.filter((x) => x.id !== it.id))}
                    className="rounded-full p-1 text-black/40 hover:bg-black/5 hover:text-rose-600"
                    aria-label="Remove from queue"
                  >
                    <Trash2 size={11} />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Image card — inline tag editor + approve toggle + kind switch + delete
// ---------------------------------------------------------------------------
function ImageCard({
  row,
  stats,
  onApprove,
  onTags,
  onKind,
  onTargeting,
  onDelete,
}: {
  row: DivisionImageryEntry;
  stats?: { view: number; select: number; download: number; total: number; last: string | null };
  onApprove: (next: boolean) => void;
  onTags: (tags: string[]) => void;
  onKind: (k: Kind) => void;
  onTargeting: (patch: {
    collection?: string | null;
    template_kinds?: TemplateKind[];
    is_default_for?: TemplateKind[];
  }) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.tags.join(", "));

  const save = () => {
    const parsed = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 24);
    onTags(parsed);
    setEditing(false);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="relative aspect-[4/3] w-full bg-black/5">
        {row.signedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.signedUrl}
            alt={row.filename}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-black/40">No preview</div>
        )}
        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#03002C]">
          {row.kind}
        </div>
        <button
          type="button"
          onClick={() => onApprove(!row.approved)}
          className={
            "absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium " +
            (row.approved
              ? "bg-emerald-600 text-white"
              : "bg-white/85 text-black/60 hover:bg-white")
          }
        >
          {row.approved ? <CheckCircle2 size={11} /> : <Circle size={11} />}
          {row.approved ? "Approved" : "Approve"}
        </button>
      </div>
      <div className="p-3">
        <div className="line-clamp-1 text-sm font-medium text-[#03002C]">{row.filename}</div>
        <div className="mt-1 text-[11px] text-black/45">
          {(row.size_bytes / 1024).toFixed(0)} KB · {new Date(row.created_at).toLocaleDateString()}
        </div>

        <div
          className="mt-2 flex items-center gap-2 rounded-md bg-black/[0.04] px-2 py-1.5 text-[10px] font-medium text-black/70"
          title="Last 90 days of user activity"
        >
          <BarChart3 size={11} className="text-[#003FC7]" />
          <span>{stats?.view ?? 0} views</span>
          <span className="text-black/25">·</span>
          <span>{stats?.select ?? 0} selects</span>
          <span className="text-black/25">·</span>
          <span>{stats?.download ?? 0} downloads</span>
          {stats?.last ? (
            <span className="ml-auto text-black/40">
              {new Date(stats.last).toLocaleDateString()}
            </span>
          ) : null}
        </div>

        {editing ? (
          <div className="mt-2 flex items-center gap-1">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 rounded-md border border-black/15 bg-white p-1.5 text-xs"
              placeholder="hero, portrait, …"
              autoFocus
            />
            <button
              onClick={save}
              className="rounded-md bg-[#003FC7] px-2 py-1 text-[11px] text-white"
            >
              Save
            </button>
            <button
              onClick={() => {
                setDraft(row.tags.join(", "));
                setEditing(false);
              }}
              className="rounded-md border border-black/15 px-2 py-1 text-[11px] text-black/60"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-2 flex w-full flex-wrap items-center gap-1 rounded-md border border-dashed border-black/15 p-2 text-left text-[11px] hover:border-[#003FC7]"
          >
            <Tag size={10} className="text-black/40" />
            {row.tags.length === 0 ? (
              <span className="text-black/40">Add tags…</span>
            ) : (
              row.tags.map((t) => (
                <span key={t} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-black/70">
                  {t}
                </span>
              ))
            )}
          </button>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <select
            value={row.kind}
            onChange={(e) => onKind(e.target.value as Kind)}
            className="rounded-md border border-black/15 bg-white p-1 text-[11px]"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-md border border-black/15 px-2 py-1 text-[11px] text-red-600 hover:border-red-300"
          >
            <Trash2 size={11} />
          </button>
        </div>

        <TargetingPanel row={row} onTargeting={onTargeting} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Targeting panel — collection label, allow-listed templates, default picks.
// Empty allow-list = universal fallback (any template can use this image).
// ---------------------------------------------------------------------------
function TargetingPanel({
  row,
  onTargeting,
}: {
  row: DivisionImageryEntry;
  onTargeting: (patch: {
    collection?: string | null;
    template_kinds?: TemplateKind[];
    is_default_for?: TemplateKind[];
  }) => void;
}) {
  const [collectionDraft, setCollectionDraft] = useState(row.collection ?? "");
  const allowed = new Set<TemplateKind>((row.template_kinds ?? []) as TemplateKind[]);
  const defaults = new Set<TemplateKind>((row.is_default_for ?? []) as TemplateKind[]);

  const toggleAllowed = (t: TemplateKind) => {
    const next = new Set(allowed);
    if (next.has(t)) {
      next.delete(t);
      // clearing the allow-list also clears default-for that template
      const nextDefaults = new Set(defaults);
      nextDefaults.delete(t);
      onTargeting({
        template_kinds: Array.from(next),
        is_default_for: Array.from(nextDefaults),
      });
    } else {
      next.add(t);
      onTargeting({ template_kinds: Array.from(next) });
    }
  };

  const toggleDefault = (t: TemplateKind) => {
    const next = new Set(defaults);
    if (next.has(t)) {
      next.delete(t);
    } else {
      next.add(t);
      // being a default implies allow-listed
      if (!allowed.has(t)) {
        const nextAllowed = new Set(allowed);
        nextAllowed.add(t);
        onTargeting({
          is_default_for: Array.from(next),
          template_kinds: Array.from(nextAllowed),
        });
        return;
      }
    }
    onTargeting({ is_default_for: Array.from(next) });
  };

  const saveCollection = () => {
    const trimmed = collectionDraft.trim();
    onTargeting({ collection: trimmed ? trimmed : null });
  };

  return (
    <div className="mt-3 rounded-lg border border-black/10 bg-black/[0.02] p-2">
      <div className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-black/50">
        <Layers size={10} /> Template targeting
      </div>
      <div className="mb-2 flex items-center gap-1">
        <input
          value={collectionDraft}
          onChange={(e) => setCollectionDraft(e.target.value)}
          onBlur={saveCollection}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          placeholder="Collection (e.g. spring-2026)"
          className="flex-1 rounded-md border border-black/15 bg-white p-1 text-[11px]"
        />
      </div>
      <div className="space-y-1">
        {TEMPLATE_KINDS.map((t) => {
          const isAllowed = allowed.has(t);
          const isDefault = defaults.has(t);
          const universal = allowed.size === 0;
          return (
            <div
              key={t}
              className="flex items-center justify-between gap-1 rounded-md px-1 py-0.5 hover:bg-black/[0.03]"
            >
              <label className="flex flex-1 items-center gap-1.5 text-[11px] text-black/70">
                <input
                  type="checkbox"
                  checked={isAllowed || universal}
                  disabled={universal && !isAllowed}
                  onChange={() => toggleAllowed(t)}
                  className="h-3 w-3"
                />
                {TEMPLATE_LABEL[t]}
                {universal && (
                  <span className="text-[9px] uppercase tracking-wide text-black/35">any</span>
                )}
              </label>
              <button
                type="button"
                onClick={() => toggleDefault(t)}
                title={isDefault ? "Auto-picked default" : "Set as default"}
                className={
                  "inline-flex items-center rounded p-0.5 " +
                  (isDefault ? "text-amber-500" : "text-black/25 hover:text-amber-400")
                }
              >
                <Star size={12} fill={isDefault ? "currentColor" : "none"} />
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-[10px] leading-snug text-black/40">
        No boxes checked = universal fallback. Star marks the auto-pick for that template.
      </p>
    </div>
  );
}

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
import { UploadCloud, Trash2, CheckCircle2, Circle, Tag, Loader2, Star, Layers } from "lucide-react";

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

  const q = useQuery({
    queryKey: ["admin-division-imagery", divisionId],
    queryFn: () => listFn({ data: { divisionId } }),
  });

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

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      invalidate();
    },
  });

  const rows = q.data ?? [];
  const filtered = useMemo(() => {
    const tag = tagQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "approved" && !r.approved) return false;
      if (statusFilter === "pending" && r.approved) return false;
      if (tag && !r.tags.some((t) => t.toLowerCase().includes(tag))) return false;
      return true;
    });
  }, [rows, statusFilter, tagQuery]);

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
        onUpload={(input) => uploadMut.mutate(input)}
        isUploading={uploadMut.isPending}
      />

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
              onApprove={(next) => approveMut.mutate({ id: r.id, approved: next })}
              onTags={(tags) => tagsMut.mutate({ id: r.id, tags })}
              onKind={(kind) => kindMut.mutate({ id: r.id, kind })}
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
// Uploader (drag-drop + file picker) — encodes to base64 and posts to server
// ---------------------------------------------------------------------------
function Uploader({
  divisionId,
  onUpload,
  isUploading,
}: {
  divisionId: string;
  onUpload: (input: {
    divisionId: string;
    filename: string;
    contentType: string;
    data: string;
    kind: Kind;
    tags: string[];
  }) => void;
  isUploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [kind, setKind] = useState<Kind>("photo");
  const [tagsRaw, setTagsRaw] = useState("");
  const [dragging, setDragging] = useState(false);

  const parseTags = () =>
    tagsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 24);

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    for (const file of list) {
      if (!file.type.startsWith("image/")) {
        toast.error(`Skipped ${file.name}: not an image`);
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`Skipped ${file.name}: exceeds 20MB`);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(fr.error);
        fr.readAsDataURL(file);
      });
      onUpload({
        divisionId,
        filename: file.name,
        contentType: file.type || "image/png",
        data: dataUrl,
        kind,
        tags: parseTags(),
      });
    }
  };

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
        if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
      }}
      className={
        "rounded-2xl border-2 border-dashed p-6 transition " +
        (dragging ? "border-[#003FC7] bg-[#003FC7]/5" : "border-black/15 bg-white")
      }
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#03002C]">
            <UploadCloud size={16} /> Upload imagery
          </div>
          <p className="mt-1 text-xs text-black/55">Drop images here or click to pick. Max 20MB each.</p>
        </div>
        <label className="text-xs">
          <div className="mb-1 uppercase tracking-wider text-black/50">Kind</div>
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
          <div className="mb-1 uppercase tracking-wider text-black/50">Tags (comma-separated)</div>
          <input
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="hero, portrait, life-sciences"
            className="w-64 rounded-md border border-black/15 bg-white p-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#003FC7] px-4 py-2 text-xs font-medium text-white disabled:opacity-60"
        >
          {isUploading ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
          {isUploading ? "Uploading…" : "Choose files"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Image card — inline tag editor + approve toggle + kind switch + delete
// ---------------------------------------------------------------------------
function ImageCard({
  row,
  onApprove,
  onTags,
  onKind,
  onDelete,
}: {
  row: DivisionImageryEntry;
  onApprove: (next: boolean) => void;
  onTags: (tags: string[]) => void;
  onKind: (k: Kind) => void;
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
      </div>
    </div>
  );
}

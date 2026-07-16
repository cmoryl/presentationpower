import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listOracleKnowledge,
  updateOracleKnowledge,
  deleteOracleKnowledge,
  syncOracleToKnowledge,
} from "@/lib/admin.functions";
import { AdminForbidden, isForbidden } from "@/components/AdminShell";

export const Route = createFileRoute("/admin/oracle")({
  component: OracleAdminView,
});

type Row = Awaited<ReturnType<typeof listOracleKnowledge>>[number];

function OracleAdminView() {
  const listFn = useServerFn(listOracleKnowledge);
  const updateFn = useServerFn(updateOracleKnowledge);
  const deleteFn = useServerFn(deleteOracleKnowledge);
  const syncFn = useServerFn(syncOracleToKnowledge);
  const qc = useQueryClient();

  const q = useQuery({ queryKey: ["admin", "oracle-kb"], queryFn: () => listFn(), retry: false });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);

  const update = useMutation({
    mutationFn: (input: { id: string; title?: string; content?: string; category?: string | null; tags?: string[]; is_active?: boolean }) =>
      updateFn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "oracle-kb"] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "oracle-kb"] }),
  });
  const sync = useMutation({
    mutationFn: (id: string) => syncFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "oracle-kb"] }),
  });

  if (q.error && isForbidden(q.error)) return <AdminForbidden />;
  if (q.isLoading) return <div className="text-sm text-black/50">Loading Oracle knowledge…</div>;
  if (!q.data) return <div className="text-sm text-red-600">Failed to load.</div>;

  const filtered = q.data.filter((r) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (
      r.title.toLowerCase().includes(s) ||
      r.content.toLowerCase().includes(s) ||
      (r.tags ?? []).some((t) => t.toLowerCase().includes(s))
    );
  });
  const mirroredCount = q.data.filter((r) => r.mirrored_in_kb).length;
  const activeCount = q.data.filter((r) => r.is_active).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Oracle knowledge base</h2>
          <p className="mt-1 text-sm text-black/60">
            {q.data.length} imported entries · {activeCount} active · {mirroredCount} mirrored into main knowledge_entries.
          </p>
        </div>
        <input
          type="search"
          placeholder="Search title, content, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40"
        />
      </header>

      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.03] text-xs uppercase tracking-wider text-black/50">
            <tr>
              <th className="px-4 py-2 text-left">Title</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Tags</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Mirrored</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-black/5 align-top">
                <td className="max-w-md px-4 py-3">
                  <div className="font-medium text-black/90">{r.title}</div>
                  <div className="mt-1 line-clamp-2 text-xs text-black/50">{r.content}</div>
                </td>
                <td className="px-4 py-3 text-xs text-black/60">{r.content_type}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(r.tags ?? []).slice(0, 4).map((t) => (
                      <span key={t} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-black/60">
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => update.mutate({ id: r.id, is_active: !r.is_active })}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      r.is_active ? "bg-emerald-100 text-emerald-800" : "bg-black/10 text-black/50"
                    }`}
                  >
                    {r.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.mirrored_in_kb ? (
                    <span className="text-emerald-700">✓ synced</span>
                  ) : (
                    <span className="text-black/40">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => setEditing(r)}
                      className="rounded-lg border border-black/10 px-2 py-1 text-xs hover:border-[#003FC7]/40 hover:text-[#003FC7]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => sync.mutate(r.id)}
                      disabled={sync.isPending}
                      className="rounded-lg border border-black/10 px-2 py-1 text-xs hover:border-emerald-600/40 hover:text-emerald-700 disabled:opacity-50"
                      title="Copy/refresh into knowledge_entries (main KB)"
                    >
                      {r.mirrored_in_kb ? "Re-sync" : "Sync to KB"}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${r.title}"? This also removes any mirrored entry.`)) del.mutate(r.id);
                      }}
                      disabled={del.isPending}
                      className="rounded-lg border border-black/10 px-2 py-1 text-xs hover:border-red-500/40 hover:text-red-700 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-black/40">
                  No entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal
          row={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            update.mutate({ id: editing.id, ...patch });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditModal({
  row,
  onClose,
  onSave,
}: {
  row: Row;
  onClose: () => void;
  onSave: (patch: { title: string; content: string; tags: string[]; category: string | null }) => void;
}) {
  const [title, setTitle] = useState(row.title);
  const [content, setContent] = useState(row.content);
  const [tagsStr, setTagsStr] = useState((row.tags ?? []).join(", "));
  const [category, setCategory] = useState(row.category ?? "");
  const tags = useMemo(
    () => tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
    [tagsStr],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">Edit Oracle entry</h3>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-black/50">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-black/50">Category</span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-black/50">Tags (comma-separated)</span>
            <input
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-black/50">Content</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 font-mono text-xs"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-black/15 px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={() => onSave({ title, content, tags, category: category || null })}
            className="rounded-lg bg-[#03002C] px-4 py-2 text-sm font-semibold text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

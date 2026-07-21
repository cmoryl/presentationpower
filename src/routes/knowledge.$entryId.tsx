import { createFileRoute, useNavigate, notFound, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  getKnowledgeEntry,
  upsertKnowledgeEntry,
  deleteKnowledgeEntry,
  KNOWLEDGE_KIND_META,
  type EditableKnowledgeKind,
  type KnowledgeVisibility,
} from "@/lib/knowledge.functions";

export const Route = createFileRoute("/knowledge/$entryId")({
  head: () => ({ meta: [{ title: "Knowledge entry · TransPerfect Modular" }] }),
  component: EntryView,
});

function EntryView() {
  const { entryId } = Route.useParams();
  const navigate = useNavigate();
  const getFn = useServerFn(getKnowledgeEntry);
  const upsert = useServerFn(upsertKnowledgeEntry);
  const del = useServerFn(deleteKnowledgeEntry);

  const entry = useQuery({
    queryKey: ["knowledge", entryId],
    queryFn: () => getFn({ data: { id: entryId } }),
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<EditableKnowledgeKind>("fact");
  const [tags, setTags] = useState("");
  const [sources, setSources] = useState("");
  const [visibility, setVisibility] = useState<KnowledgeVisibility>("private");
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [owner, setOwner] = useState<string>("");

  useEffect(() => {
    const e = entry.data;
    if (!e) return;
    setTitle(e.title);
    setBody(e.body);
    setKind(e.kind === "source_deck" || e.kind === "source_pdf" ? "note" : e.kind);
    setTags(e.tags.join(", "));
    setSources(e.sources.join("\n"));
    setVisibility(e.visibility);
    setSharedWith(e.shared_with_division_ids);
    setExpiresAt(e.expires_at ? e.expires_at.slice(0, 10) : "");
    setOwner(e.owner_division_id);
  }, [entry.data]);

  const save = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          id: entryId,
          owner_division_id: owner,
          title,
          body,
          kind,
          tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
          sources: sources.split("\n").map((s) => s.trim()).filter(Boolean),
          visibility,
          shared_with_division_ids: sharedWith,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        },
      }),
    onSuccess: () => entry.refetch(),
  });

  const remove = useMutation({
    mutationFn: () => del({ data: { id: entryId } }),
    onSuccess: () => navigate({ to: "/knowledge" as never }),
  });

  if (entry.isLoading) return <AppShell><div className="text-sm text-black/60">Loading…</div></AppShell>;
  if (!entry.data) throw notFound();

  const ownerName = BRAND_MODES.find((b) => b.id === owner)?.name ?? owner;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Link to={"/knowledge" as never} className="text-xs uppercase tracking-widest text-black/50 hover:text-black">
          ← Back to knowledge
        </Link>
        <div className="mt-3 flex items-baseline justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-black/50">{KNOWLEDGE_KIND_META[kind].label} · {ownerName}</div>
            <h1 className="mt-2 text-3xl font-semibold">{title || "Untitled"}</h1>
          </div>
          <button
            onClick={() => { if (confirm("Delete this entry?")) remove.mutate(); }}
            className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        </div>

        <div className="mt-8 space-y-6 rounded-2xl border border-black/10 bg-white p-8">
          <Field label="Owner division">
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className={inputCls}>
              {BRAND_MODES.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-6">
            <Field label="Kind">
              <select value={kind} onChange={(e) => setKind(e.target.value as KnowledgeKind)} className={inputCls}>
                {Object.entries(KNOWLEDGE_KIND_META).map(([k, m]) => (
                  <option key={k} value={k}>{m.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Expires">
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Body">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-6">
            <Field label="Tags"><input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} /></Field>
            <Field label="Sources"><textarea value={sources} onChange={(e) => setSources(e.target.value)} rows={2} className={inputCls} /></Field>
          </div>
          <Field label="Visibility">
            <div className="flex flex-wrap gap-2">
              {(["private", "shared", "global"] as KnowledgeVisibility[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${visibility === v ? "border-[#0B2A4A] bg-[#0B2A4A] text-white" : "border-black/15 bg-white text-black/70"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </Field>
          {visibility === "shared" && (
            <Field label="Share with divisions">
              <div className="grid grid-cols-2 gap-2">
                {BRAND_MODES.filter((b) => b.id !== owner).map((b) => {
                  const on = sharedWith.includes(b.id);
                  return (
                    <label key={b.id} className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => setSharedWith((prev) => e.target.checked ? [...prev, b.id] : prev.filter((x) => x !== b.id))}
                      />
                      <span>{b.name}</span>
                    </label>
                  );
                })}
              </div>
            </Field>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="rounded-full bg-[#0B2A4A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0B2A4A]/90 disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>

        {(save.error || remove.error) && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            {((save.error || remove.error) as Error).message}
          </div>
        )}
      </div>
    </AppShell>
  );
}

const inputCls = "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs uppercase tracking-widest text-black/60">{label}</div>
      {children}
    </label>
  );
}

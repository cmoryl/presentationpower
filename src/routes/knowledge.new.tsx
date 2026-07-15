import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  upsertKnowledgeEntry,
  KNOWLEDGE_KIND_META,
  type KnowledgeKind,
  type KnowledgeVisibility,
} from "@/lib/knowledge.functions";

export const Route = createFileRoute("/knowledge/new")({
  head: () => ({ meta: [{ title: "New knowledge entry · TransPerfect Modular" }] }),
  component: NewEntryView,
});

function NewEntryView() {
  const navigate = useNavigate();
  const upsert = useServerFn(upsertKnowledgeEntry);
  const [owner, setOwner] = useState<string>(BRAND_MODES[0]?.id ?? "bm-enterprise");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<KnowledgeKind>("fact");
  const [tags, setTags] = useState("");
  const [sources, setSources] = useState("");
  const [visibility, setVisibility] = useState<KnowledgeVisibility>("private");
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");

  const create = useMutation({
    mutationFn: () =>
      upsert({
        data: {
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
    onSuccess: () => navigate({ to: "/knowledge" as never }),
  });

  const canSave = title.trim().length > 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="text-xs uppercase tracking-[0.3em] text-black/50">Knowledge</div>
        <h1 className="mt-3 text-4xl font-semibold">New entry</h1>
        <p className="mt-3 text-black/60">
          Owned by one division. Share it with siblings or publish globally to make it discoverable across
          TransPerfect.
        </p>

        <div className="mt-10 space-y-6 rounded-2xl border border-black/10 bg-white p-8">
          <Field label="Owner division">
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className={inputCls}>
              {BRAND_MODES.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-6">
            <Field label="Kind">
              <select value={kind} onChange={(e) => setKind(e.target.value as KnowledgeKind)} className={inputCls}>
                {Object.entries(KNOWLEDGE_KIND_META).map(([k, m]) => (
                  <option key={k} value={k}>{m.label} — {m.description}</option>
                ))}
              </select>
            </Field>
            <Field label="Expires (optional)">
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. FDA eCTD submission SLAs" />
          </Field>

          <Field label="Body">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className={inputCls}
              placeholder="The knowledge itself. Markdown okay."
            />
          </Field>

          <div className="grid grid-cols-2 gap-6">
            <Field label="Tags (comma separated)">
              <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} placeholder="pharma, fda, ectd" />
            </Field>
            <Field label="Sources (one per line)">
              <textarea value={sources} onChange={(e) => setSources(e.target.value)} rows={2} className={inputCls} placeholder="https://…" />
            </Field>
          </div>

          <Field label="Visibility">
            <div className="flex flex-wrap gap-2">
              {(["private", "shared", "global"] as KnowledgeVisibility[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${
                    visibility === v ? "border-[#0B2A4A] bg-[#0B2A4A] text-white" : "border-black/15 bg-white text-black/70"
                  }`}
                >
                  {v === "private" ? "Private to owner" : v === "shared" ? "Shared with selected divisions" : "Global (all divisions)"}
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
                        onChange={(e) =>
                          setSharedWith((prev) =>
                            e.target.checked ? [...prev, b.id] : prev.filter((x) => x !== b.id),
                          )
                        }
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
            onClick={() => navigate({ to: "/knowledge" as never })}
            className="rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm text-black hover:border-black/30"
          >
            Cancel
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={!canSave || create.isPending}
            className="rounded-full bg-[#0B2A4A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0B2A4A]/90 disabled:opacity-50"
          >
            {create.isPending ? "Saving…" : "Save entry"}
          </button>
        </div>

        {create.error && (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            {(create.error as Error).message}
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

import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { decideSuggestion, distillLearning, listLearning, logOutcome } from "@/lib/learning.functions";

const KIND_LABEL: Record<string, string> = {
  rule: "Rule for future work",
  lesson: "Event / print lesson",
  knowledge: "New knowledge",
  template_idea: "Template idea",
};

type Suggestion = {
  id: string;
  kind: string;
  title: string;
  body: string;
  division_id: string | null;
  status: string;
  evidence_signal_ids: string[];
  decision_note: string | null;
  created_at: string;
};

export function LearningQueue() {
  const qc = useQueryClient();
  const listFn = useServerFn(listLearning);
  const distillFn = useServerFn(distillLearning);
  const decideFn = useServerFn(decideSuggestion);
  const [view, setView] = useState<"pending" | "approved" | "rejected">("pending");
  const q = useQuery({ queryKey: ["learning"], queryFn: () => listFn(), retry: false });

  const distill = useMutation({
    mutationFn: () => distillFn(),
    onSuccess: (r) => {
      toast.success(r.read ? `Read ${r.read} new signals, proposed ${r.created} suggestions.` : "Nothing new to learn from yet.");
      qc.invalidateQueries({ queryKey: ["learning"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const decide = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected"; title?: string; body?: string; note?: string }) => decideFn({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.status === "approved" ? "Approved — now part of the knowledge every assistant uses." : "Rejected.");
      qc.invalidateQueries({ queryKey: ["learning"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (q.isError) return <p className="text-sm text-muted-foreground">Only admins can review learning. {(q.error as Error).message}</p>;
  const all = (q.data?.suggestions ?? []) as Suggestion[];
  const rows = all.filter((s) => s.status === view);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-border p-4">
        <div className="text-sm">
          <p className="font-medium">{q.data?.waitingSignals ?? 0} new signals waiting</p>
          <p className="text-muted-foreground">
            {q.data?.totalSignals ?? 0} collected so far from deck edits, approval decisions and reported outcomes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => distill.mutate()}
          disabled={distill.isPending || !q.data?.waitingSignals}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {distill.isPending ? "Learning…" : "Learn from new signals"}
        </button>
      </section>

      <div className="flex gap-2" role="tablist">
        {(["pending", "approved", "rejected"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`rounded-md px-3 py-1.5 text-sm ${view === v ? "bg-secondary font-medium" : "text-muted-foreground"}`}
          >
            {v === "pending" ? "Waiting for approval" : v === "approved" ? "Approved" : "Rejected"} ({all.filter((s) => s.status === v).length})
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((s) => (
            <SuggestionCard key={s.id} s={s} busy={decide.isPending} onDecide={(v) => decide.mutate({ id: s.id, ...v })} />
          ))}
        </ul>
      )}

      <OutcomeForm />
    </div>
  );
}

function SuggestionCard({ s, busy, onDecide }: { s: Suggestion; busy: boolean; onDecide: (v: { status: "approved" | "rejected"; title?: string; body?: string; note?: string }) => void }) {
  const [title, setTitle] = useState(s.title);
  const [body, setBody] = useState(s.body);
  const pending = s.status === "pending";
  return (
    <li className="rounded-md border border-border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {KIND_LABEL[s.kind] ?? s.kind}
        {s.division_id ? ` · ${s.division_id}` : ""} · based on {s.evidence_signal_ids.length} signal{s.evidence_signal_ids.length === 1 ? "" : "s"}
      </p>
      {pending ? (
        <>
          <label className="mt-2 block text-sm">
            <span className="sr-only">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-input bg-background px-2 py-1 font-medium" />
          </label>
          <label className="mt-2 block text-sm">
            <span className="sr-only">Details</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="w-full rounded-md border border-input bg-background px-2 py-1" />
          </label>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busy} onClick={() => onDecide({ status: "approved", title, body })} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
              Approve
            </button>
            <button type="button" disabled={busy} onClick={() => onDecide({ status: "rejected" })} className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50">
              Reject
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 font-medium">{s.title}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{s.body}</p>
        </>
      )}
    </li>
  );
}

function OutcomeForm() {
  const fn = useServerFn(logOutcome);
  const qc = useQueryClient();
  const [subjectType, setSubjectType] = useState<"event" | "print" | "deck" | "social" | "other">("event");
  const [worked, setWorked] = useState("");
  const [wrong, setWrong] = useState("");
  const m = useMutation({
    mutationFn: () => fn({ data: { subjectType, whatWorked: worked || undefined, whatWentWrong: wrong || undefined } }),
    onSuccess: () => {
      toast.success("Thanks — saved for the next learning run.");
      setWorked("");
      setWrong("");
      qc.invalidateQueries({ queryKey: ["learning"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <section className="space-y-3 border-t border-border pt-6">
      <h2 className="text-lg font-semibold">Report how a job went</h2>
      <p className="text-sm text-muted-foreground">After an event, print run or pitch, note what worked and what didn't. It feeds the next learning run.</p>
      <label className="block text-sm">
        What was it?
        <select value={subjectType} onChange={(e) => setSubjectType(e.target.value as typeof subjectType)} className="mt-1 block rounded-md border border-input bg-background px-2 py-1">
          <option value="event">Event</option>
          <option value="print">Print job</option>
          <option value="deck">Deck / pitch</option>
          <option value="social">Social</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="block text-sm">
        What worked
        <textarea value={worked} onChange={(e) => setWorked(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1" />
      </label>
      <label className="block text-sm">
        What went wrong
        <textarea value={wrong} onChange={(e) => setWrong(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1" />
      </label>
      <button type="button" disabled={m.isPending || (!worked.trim() && !wrong.trim())} onClick={() => m.mutate()} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
        Save report
      </button>
    </section>
  );
}

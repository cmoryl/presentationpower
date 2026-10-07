import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listEventLessons, logOutcome } from "@/lib/learning.functions";

export interface EventLearningPanelProps {
  eventId: string;
  city?: string;
}

const PHASES = [
  ["planning", "Planning / venue intake"],
  ["design", "Design"],
  ["print", "Print & production"],
  ["onsite", "On site"],
  ["post-event", "After the event"],
] as const;

/** Lessons from past events + a quick debrief that feeds the learning loop. */
export function EventLearningPanel({ eventId, city }: EventLearningPanelProps) {
  const qc = useQueryClient();
  const listFn = useServerFn(listEventLessons);
  const logFn = useServerFn(logOutcome);
  const q = useQuery({
    queryKey: ["event-lessons", eventId, city ?? ""],
    queryFn: () => listFn({ data: { eventId, city } }),
    retry: false,
  });
  const [showAll, setShowAll] = useState(false);
  const [phase, setPhase] = useState<(typeof PHASES)[number][0]>("post-event");
  const [worked, setWorked] = useState("");
  const [wrong, setWrong] = useState("");
  const m = useMutation({
    mutationFn: () =>
      logFn({ data: { subjectType: "event", eventId, city, phase, whatWorked: worked || undefined, whatWentWrong: wrong || undefined } }),
    onSuccess: () => {
      toast.success("Saved. An admin will turn it into a lesson for future events.");
      setWorked("");
      setWrong("");
      qc.invalidateQueries({ queryKey: ["learning"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const lessons = q.data ?? [];
  const shown = showAll ? lessons : lessons.slice(0, 6);

  return (
    <section aria-labelledby="event-learning-h" className="grid gap-6 rounded-md border border-border p-5 md:grid-cols-2">
      <div>
        <h2 id="event-learning-h" className="text-lg font-semibold">Lessons from past events</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What earlier events taught us. The events assistant applies these too.
        </p>
        {q.isError ? (
          <p className="mt-3 text-sm text-muted-foreground">Sign in to see lessons.</p>
        ) : q.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : lessons.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No lessons recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {shown.map((l) => (
              <li key={l.id} className="text-sm">
                <p className="font-medium">{l.title}</p>
                <p className="text-muted-foreground">
                  {l.body.length > 220 ? `${l.body.slice(0, 220)}…` : l.body}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {l.event_id === eventId ? "This event" : l.city}
                  {l.source === "learned" ? " · learned from use" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        {lessons.length > 6 && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm font-medium underline">
            {showAll ? "Show fewer" : `Show all ${lessons.length}`}
          </button>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Tell the system how it went</h2>
        <p className="text-sm text-muted-foreground">
          A sentence or two at any stage is enough. Each note helps the next event go better.
        </p>
        <label className="block text-sm">
          Stage
          <select value={phase} onChange={(e) => setPhase(e.target.value as typeof phase)} className="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5">
            {PHASES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          What worked
          <textarea value={worked} onChange={(e) => setWorked(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1" />
        </label>
        <label className="block text-sm">
          What went wrong or should change
          <textarea value={wrong} onChange={(e) => setWrong(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1" />
        </label>
        <button
          type="button"
          disabled={m.isPending || (!worked.trim() && !wrong.trim())}
          onClick={() => m.mutate()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {m.isPending ? "Saving…" : "Save note"}
        </button>
      </div>
    </section>
  );
}

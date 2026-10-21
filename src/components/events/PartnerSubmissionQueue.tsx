// Reviewer queue for designs uploaded by outside designers.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge, Button, Textarea } from "@/design-system/element";

type Row = {
  id: string;
  designer_name: string;
  designer_email: string | null;
  title: string;
  note: string | null;
  pack_version: string | null;
  file_path: string;
  file_name: string;
  status: string;
  review_note: string | null;
  created_at: string;
};

export function PartnerSubmissionQueue() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load() {
    const { data, error } = await supabase.from("partner_submissions").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
  }
  useEffect(() => {
    void load();
  }, []);

  async function open(r: Row) {
    const w = window.open("", "_blank");
    const { data, error } = await supabase.storage.from("partner-submissions").createSignedUrl(r.file_path, 300, { download: r.file_name });
    if (error || !data) {
      w?.close();
      return toast.error(error?.message ?? "Couldn't open the file.");
    }
    if (w) w.location.href = data.signedUrl;
  }

  async function decide(r: Row, status: "approved" | "changes") {
    const { error } = await supabase.from("partner_submissions").update({ status, review_note: notes[r.id] ?? r.review_note }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Approved." : "Changes requested.");
    void load();
  }

  if (!rows) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!rows.length) return <p className="text-sm text-muted-foreground">No partner designs yet.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className="rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{r.title}</p>
              <p className="text-sm text-muted-foreground">
                {r.designer_name}
                {r.designer_email ? ` · ${r.designer_email}` : ""} · pack v{r.pack_version ?? "?"} · {new Date(r.created_at).toLocaleDateString()}
              </p>
              {r.note ? <p className="mt-1 text-sm">{r.note}</p> : null}
            </div>
            <Badge variant={r.status === "approved" ? "default" : "outline"}>
              {r.status === "approved" ? "Approved" : r.status === "changes" ? "Changes requested" : "Waiting"}
            </Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <Button size="sm" variant="outline" onClick={() => open(r)}>
              Open {r.file_name}
            </Button>
            <Textarea
              aria-label={`Review note for ${r.title}`}
              placeholder="Note to the designer (optional)"
              rows={1}
              className="min-w-64 flex-1"
              value={notes[r.id] ?? r.review_note ?? ""}
              onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
            />
            <Button size="sm" onClick={() => decide(r, "approved")}>Approve</Button>
            <Button size="sm" variant="outline" onClick={() => decide(r, "changes")}>Request changes</Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

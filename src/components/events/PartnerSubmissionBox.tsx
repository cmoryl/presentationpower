// "Upload your design for review" — outside designers hand finished work back
// through their kit link. Files land in a private store; reviewers decide on
// /approvals?tab=partners. The link itself is the only credential.
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button, Input, Textarea } from "@/design-system/element";
import { DESIGNER_PACK_VERSION } from "@/lib/next-designer-pack";

const MAX_BYTES = 200 * 1024 * 1024;
const ACCEPT = ".pdf,.ai,.eps,.svg,.png,.jpg,.jpeg,.pptx,.zip,.indd,.psd";

export function PartnerSubmissionBox({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !name.trim() || !title.trim()) return toast.error("Add your name, a title and a file.");
    if (file.size > MAX_BYTES) return toast.error("Files must be 200 MB or smaller.");
    setBusy(true);
    try {
      const safeName = file.name.replace(/[^\w.-]+/g, "-").slice(-120);
      const path = `${token}/${crypto.randomUUID()}-${safeName}`;
      const up = await supabase.storage.from("partner-submissions").upload(path, file, { contentType: file.type || undefined });
      if (up.error) throw up.error;
      const { error } = await supabase.rpc("submit_partner_design", {
        _token: token,
        _designer_name: name.trim(),
        _designer_email: email.trim(),
        _title: title.trim(),
        _note: note.trim(),
        _pack_version: DESIGNER_PACK_VERSION,
        _file_path: path,
        _file_name: file.name,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Sent for review. TransPerfect will get back to you.");
    } catch (err) {
      toast.error(`Upload failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="partner-upload" className="mt-6 rounded-lg border border-border p-5">
      <h2 id="partner-upload" className="text-lg font-semibold">Upload your design for review</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Made something with this pack? Send it back here. Nothing is printed or published until TransPerfect approves it.
      </p>
      {sent ? (
        <p className="mt-4 text-sm font-medium">
          Thanks. Your file is with the brand team.{" "}
          <button type="button" className="underline" onClick={() => { setSent(false); setFile(null); setTitle(""); setNote(""); }}>
            Send another
          </button>
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Your name
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
          </label>
          <label className="grid gap-1 text-sm">
            Email
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            What is it?
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Finance NEXT pillar, Boston" required />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Notes (optional)
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={2} />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            File (PDF, AI, EPS, SVG, PNG, JPG, PPTX, ZIP — up to 200 MB)
            <input type="file" accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
              Send for review
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

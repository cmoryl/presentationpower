import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Sends the last checked .pptx from this export page to the shared TransPerfect Canva account. */
export function SendToCanvaButton({
  getFile,
  disabled,
}: {
  getFile: () => { blob: Blob; fileName: string } | null;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    const f = getFile();
    if (!f) {
      toast.info("Click Download .pptx first", {
        description: "Canva receives the same checked file you download.",
      });
      return;
    }
    // Open the tab now, before any await, so the popup blocker allows it.
    const tab = window.open("", "_blank");
    setBusy(true);
    const id = toast.loading("Sending to Canva…", { description: "Canva usually takes 10–30 seconds." });
    try {
      const { data } = await supabase.auth.getSession();
      const form = new FormData();
      form.append("file", f.blob, f.fileName);
      form.append("title", f.fileName.replace(/\.pptx$/i, ""));
      const res = await fetch("/api/canva-import", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: form,
      });
      const body = (await res.json()) as { editUrl?: string | null; error?: string };
      if (!res.ok) throw new Error(body.error ?? `Canva send failed (${res.status})`);
      toast.success("Deck is in the shared Canva account", { id, description: "Opened in a new tab." });
      if (body.editUrl && tab) tab.location.href = body.editUrl;
      else tab?.close();
    } catch (e) {
      tab?.close();
      toast.error("Could not send to Canva", { id, description: (e as Error).message, duration: 12000 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:border-black/30 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? "Sending…" : "Send to Canva"}
    </button>
  );
}

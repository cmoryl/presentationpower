import { useState } from "react";
import { toast } from "sonner";

/** Downloads the TransPerfect Element PowerPoint master template. */
export function BrandTemplateButton() {
  const [busy, setBusy] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);

  const save = (b: Blob) => {
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url;
    a.download = "TransPerfect-Element-template.pptx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const onClick = async () => {
    if (blob) return save(blob);
    setBusy(true);
    try {
      const { buildBrandTemplatePptx } = await import("@/lib/pptx-brand-master");
      const b = await buildBrandTemplatePptx();
      setBlob(b);
      toast.success("Template ready — click again if the download didn't start.");
      save(b);
    } catch (e) {
      toast.error(`Template could not be built: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex min-h-10 items-center rounded-md border border-black/20 px-4 text-sm font-semibold text-foreground hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
    >
      {busy ? "Building template…" : "Brand template"}
    </button>
  );
}

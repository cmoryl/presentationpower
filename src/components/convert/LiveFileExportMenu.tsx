// -----------------------------------------------------------------------------
// LiveFileExportMenu — editable ("live") files for the adaptor's print formats.
//
// Uses the same layered exporter as the print studio and deck exports: each
// page becomes one PowerPoint slide at the true trim size, with boxes, rules,
// pictures and text as separate native, editable objects over a design plate
// that carries only paint PowerPoint cannot describe (glass washes, grounds).
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { assetFileSlug } from "@/lib/asset-export";

export type LiveFileTarget = {
  node: HTMLElement;
  trimIn: { width: number; height: number };
  label: string;
};

export type LiveFileExportMenuProps = {
  resolveTarget: () => LiveFileTarget | null;
  /** Used for the file name (e.g. the headline). */
  title?: string;
  className?: string;
};

export function LiveFileExportMenu({ resolveTarget, title, className }: LiveFileExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function run(fidelity: "editable" | "flat") {
    const t = resolveTarget();
    if (!t?.node || !(t.trimIn.width > 0 && t.trimIn.height > 0)) {
      toast.error("Nothing to export — the page has not finished rendering.");
      return;
    }
    setBusy(true);
    setOpen(false);
    const id = toast.loading("Building the PowerPoint file…");
    try {
      const { exportPrintPagesAsPptx } = await import("@/lib/print-pptx-export");
      const slug = `${assetFileSlug(title, "page")}-${assetFileSlug(t.label, "print")}${fidelity === "flat" ? "-picture" : ""}`;
      await exportPrintPagesAsPptx(t.node, {
        custom: { widthIn: t.trimIn.width, heightIn: t.trimIn.height },
        fidelity,
        dpi: 200,
        title: title ?? t.label,
        filename: `${slug}.pptx`,
        onProgress: (p) => {
          const pct = Math.round(((p as { progress?: number }).progress ?? 0) * 100);
          toast.loading(`Building the PowerPoint file… ${pct}%`, { id });
        },
      });
      toast.success(
        fidelity === "editable"
          ? "PowerPoint saved — text, boxes and pictures are separate, editable objects."
          : "PowerPoint saved as a picture page (not editable).",
        { id },
      );
    } catch (e) {
      toast.error(`PowerPoint export failed: ${e instanceof Error ? e.message : String(e)}`, { id });
    } finally {
      setBusy(false);
    }
  }

  const item =
    "block w-full min-h-11 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring";

  return (
    <div ref={wrapRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
      >
        {busy ? "Exporting…" : "Live file"} <span aria-hidden>▾</span>
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-72 rounded-md border border-border bg-background p-1 shadow-lg">
          <button type="button" role="menuitem" className={item} onClick={() => run("editable")}>
            <span className="font-semibold">PowerPoint · editable</span>
            <span className="block text-xs text-muted-foreground">
              Page at its true size. Text, boxes and pictures stay editable.
            </span>
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => run("flat")}>
            <span className="font-semibold">PowerPoint · picture page</span>
            <span className="block text-xs text-muted-foreground">
              One exact picture per page. Looks identical, not editable.
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

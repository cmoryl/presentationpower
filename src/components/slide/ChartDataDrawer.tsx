// Right-side sheet that reveals the tabular data behind an InfographicSpec.
// Ships with CSV download + copy-as-markdown-table. Rendered client-side
// only (uses window/URL/clipboard) — callers gate with <ClientOnly> or
// mount it inside interactive slide chrome.

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Database, Download, ClipboardCopy } from "lucide-react";
import type { InfographicSpec } from "@/lib/infographics/spec";
import { columnsOf, specToCsv, specToMarkdown, downloadSpecAsCsv } from "@/lib/infographics/csv";

type Props = {
  spec: InfographicSpec;
  /** Optional trigger label. Falls back to a compact icon pill. */
  triggerLabel?: string;
  className?: string;
};

export function ChartDataDrawer({ spec, triggerLabel, className }: Props) {
  const cols = React.useMemo(() => columnsOf(spec.data.rows), [spec.data.rows]);
  const [copied, setCopied] = React.useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(specToMarkdown(spec));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked — silent */
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="View chart data"
          className={
            className ??
            "inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md transition hover:bg-white/20"
          }
        >
          <Database size={12} aria-hidden />
          <span>{triggerLabel ?? "Data"}</span>
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{spec.title || "Chart data"}</SheetTitle>
          <SheetDescription>{spec.accessibility.longDesc}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => downloadSpecAsCsv(spec)}>
            <Download size={14} className="mr-1" aria-hidden /> Download CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={onCopy}>
            <ClipboardCopy size={14} className="mr-1" aria-hidden />
            {copied ? "Copied" : "Copy as markdown"}
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-left">
              <tr>
                {cols.map((k) => (
                  <th key={k} className="px-3 py-2 font-medium text-foreground">
                    {spec.data.columns?.[k] ?? k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spec.data.rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  {cols.map((k) => (
                    <td key={k} className="px-3 py-2 tabular-nums">
                      {String(row[k] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {spec.data.source ? (
          <p className="mt-3 text-[11px] text-muted-foreground">Source: {spec.data.source}</p>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

// "Reuse first" cards: the print agent's suggested existing starting points —
// curated library pieces and the user's own saved pieces — each rendered as a
// live page thumbnail with a one-click "use this" reply.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookmarkCheck, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PRINT_LIBRARY_ITEMS } from "@/lib/print-library/catalog";
import { toEditableContent } from "@/lib/print-library/editable";
import type { PrintAssetKind } from "@/lib/print-assets.types";
import { PrintPagePreview } from "./PrintPagePreview";

export type PrintSuggestions = {
  library: {
    id: string;
    kind: string;
    title: string;
    blurb?: string | null;
    divisionId?: string | null;
    editable?: boolean;
    why?: string;
  }[];
  mine: {
    assetId: string;
    kind: string;
    title: string;
    divisionId: string | null;
    why?: string;
  }[];
  note?: string;
};

export function printSuggestionsFromTool(part: unknown): PrintSuggestions | null {
  const out = (part as { output?: unknown } | null)?.output as
    | (Partial<PrintSuggestions> & { ok?: boolean })
    | undefined;
  if (!out || typeof out !== "object") return null;
  const library = Array.isArray(out.library) ? out.library : [];
  const mine = Array.isArray(out.mine) ? out.mine : [];
  if (library.length === 0 && mine.length === 0) return null;
  return { library, mine, note: out.note };
}

function MyPiecePreview({
  assetId,
  kind,
  divisionId,
}: {
  assetId: string;
  kind: string;
  divisionId: string | null;
}) {
  const [content, setContent] = useState<unknown>(null);
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    let alive = true;
    void supabase
      .from("print_assets")
      .select("content, context")
      .eq("id", assetId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive || !data) return;
        const row = data as { content: unknown; context: { editorMode?: string } | null };
        setContent(row.content);
        if (row.context?.editorMode === "dark") setMode("dark");
      });
    return () => {
      alive = false;
    };
  }, [assetId]);

  if (!content)
    return <div className="aspect-[8.5/11] rounded-lg border border-border bg-muted/40" />;
  return (
    <PrintPagePreview
      kind={kind as PrintAssetKind}
      content={content}
      divisionId={divisionId}
      mode={mode}
      pageIndex={0}
    />
  );
}

export function PrintSuggestionCards({
  suggestions,
  onPick,
}: {
  suggestions: PrintSuggestions;
  onPick?: (text: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <BookmarkCheck className="size-4 text-primary" aria-hidden />
        <p className="text-sm font-semibold">Start from something that already exists</p>
      </div>
      {suggestions.note ? (
        <p className="mt-1 text-xs text-muted-foreground">{suggestions.note}</p>
      ) : null}

      {suggestions.mine.length > 0 ? (
        <>
          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Your pieces
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {suggestions.mine.map((m) => (
              <div key={m.assetId} className="rounded-lg border border-border p-2">
                <MyPiecePreview assetId={m.assetId} kind={m.kind} divisionId={m.divisionId} />
                <p className="mt-2 truncate text-xs font-medium">{m.title}</p>
                <p className="text-[11px] text-muted-foreground">{m.why ?? m.kind}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-[11px]"
                    onClick={() => onPick?.(`Keep working on my existing piece ${m.assetId}.`)}
                  >
                    Continue this
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" asChild>
                    <Link to="/asset/$assetId" params={{ assetId: m.assetId }}>
                      <FolderOpen className="mr-1 size-3" aria-hidden /> Open
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {suggestions.library.length > 0 ? (
        <>
          <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Approved library
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {suggestions.library.map((s) => {
              const item = PRINT_LIBRARY_ITEMS.find((i) => i.id === s.id);
              const content = item ? (toEditableContent(item) ?? item.content) : null;
              return (
                <div key={s.id} className="rounded-lg border border-border p-2">
                  {item ? (
                    <PrintPagePreview
                      kind={item.kind}
                      content={content}
                      divisionId={item.divisionId ?? s.divisionId ?? null}
                      mode={item.kind === "adaptor-brief" ? "dark" : "light"}
                      pageIndex={0}
                      approved
                    />
                  ) : (
                    <div className="aspect-[8.5/11] rounded-lg border border-border bg-muted/40" />
                  )}
                  <p className="mt-2 truncate text-xs font-medium">{s.title}</p>
                  <p className="line-clamp-2 text-[11px] text-muted-foreground">
                    {s.why ?? s.blurb ?? s.kind}
                  </p>
                  <Button
                    size="sm"
                    className="mt-2 h-7 text-[11px]"
                    onClick={() =>
                      onPick?.(
                        `Use the library piece "${s.title}" (${s.id}) as the starting point.`,
                      )
                    }
                  >
                    Use this
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

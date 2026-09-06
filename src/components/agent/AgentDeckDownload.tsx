// Download card for a finished PowerPoint the agent built in-chat.
// The export tool returns a private, time-limited link to the real .pptx.
import { Download, FileDown } from "lucide-react";

export const EXPORT_DECK_TOOL_NAME = "export_deck";

export type DeckDownload = {
  deck: string;
  fileName: string;
  slides: number;
  url: string;
  nativeSlides?: number;
  warnings?: string[];
};

/** Parse the export tool result (JSON text, or an MCP content array). */
export function deckDownloadFromToolOutput(output: unknown): DeckDownload | null {
  const texts: string[] = [];
  if (typeof output === "string") texts.push(output);
  else if (output && typeof output === "object") {
    const o = output as { content?: Array<{ text?: unknown }> };
    if (Array.isArray(o.content)) {
      for (const c of o.content) if (typeof c?.text === "string") texts.push(c.text);
    } else {
      texts.push(JSON.stringify(output));
    }
  }
  for (const text of texts) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const url = parsed["download_url"];
      if (typeof url !== "string" || !url) continue;
      return {
        deck: typeof parsed["deck"] === "string" ? parsed["deck"] : "Presentation",
        fileName: typeof parsed["file_name"] === "string" ? parsed["file_name"] : "deck.pptx",
        slides: typeof parsed["slides"] === "number" ? parsed["slides"] : 0,
        url,
        nativeSlides:
          typeof parsed["native_slides"] === "number" ? parsed["native_slides"] : undefined,
        warnings: Array.isArray(parsed["warnings"])
          ? (parsed["warnings"] as unknown[]).filter((w): w is string => typeof w === "string")
          : undefined,
      };
    } catch {
      /* not the JSON payload */
    }
  }
  return null;
}

export function AgentDeckDownload({ download }: { download: DeckDownload }) {
  return (
    <div className="rounded-xl border border-[#003FC7]/25 bg-[#003FC7]/[0.04] p-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#003FC7] text-white"
        >
          <FileDown className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">{download.deck}</p>
          <p className="mt-0.5 text-[11px] text-foreground/60">
            {download.slides > 0 ? `${download.slides} slides · ` : ""}PowerPoint, fully editable
            {download.warnings?.length ? ` · ${download.warnings.length} note(s)` : ""}
          </p>
          <a
            href={download.url}
            download={download.fileName}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#003FC7] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#03002C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003FC7]"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Download {download.fileName}
          </a>
          <p className="mt-1.5 text-[10px] text-foreground/45">
            Private link — expires an hour after it was created.
          </p>
        </div>
      </div>
    </div>
  );
}

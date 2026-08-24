// Attach documents (Word, PDF, text, Office) to an agent thread. Extracted text
// rides along with the next message so the agent can interpret the source.
import { useCallback, useRef, useState } from "react";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import {
  DOC_ACCEPT,
  MAX_DOCS,
  MAX_FILE_BYTES,
  clampDocText,
  isPlainTextDoc,
  isSupportedDoc,
  type AgentDocument,
} from "@/lib/agent/doc-intake";
import { extractAgentDocument } from "@/lib/agent/doc-intake.functions";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

export function useAgentDocuments() {
  const [docs, setDocs] = useState<AgentDocument[]>([]);
  const clear = useCallback(() => setDocs([]), []);
  return { docs, setDocs, clear };
}

export function AgentDocumentUpload({
  docs,
  onChange,
  disabled,
  label = "Attach a brief, RFP or Word doc — the agent reads it before it builds.",
}: {
  docs: AgentDocument[];
  onChange: (next: AgentDocument[]) => void;
  disabled?: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const ingest = useCallback(
    async (files: File[]) => {
      const room = MAX_DOCS - docs.length;
      if (room <= 0) {
        toast.error(`You can attach up to ${MAX_DOCS} documents per thread.`);
        return;
      }
      setBusy(true);
      const added: AgentDocument[] = [];
      for (const file of files.slice(0, room)) {
        try {
          if (!isSupportedDoc(file.name, file.type)) {
            toast.error(`${file.name}: unsupported file type.`);
            continue;
          }
          if (file.size > MAX_FILE_BYTES) {
            toast.error(`${file.name} is larger than 20MB.`);
            continue;
          }
          let raw = "";
          if (isPlainTextDoc(file.name, file.type)) {
            raw = await file.text();
          } else {
            const bytes = new Uint8Array(await file.arrayBuffer());
            const res = await extractAgentDocument({
              data: {
                filename: file.name,
                mime: file.type || undefined,
                base64: toBase64(bytes),
              },
            });
            raw = res.text;
          }
          const { text, truncated } = clampDocText(raw);
          if (!text) {
            toast.error(`${file.name}: no readable text found.`);
            continue;
          }
          added.push({
            id: `${file.name}-${Date.now()}-${added.length}`,
            name: file.name,
            text,
            chars: text.length,
            truncated,
          });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : `Could not read ${file.name}.`);
        }
      }
      setBusy(false);
      if (added.length) {
        onChange([...docs, ...added]);
        toast.success(
          added.length === 1
            ? `${added[0].name} attached — the agent will use it.`
            : `${added.length} documents attached.`,
        );
      }
    },
    [docs, onChange],
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-primary hover:text-foreground disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Paperclip className="size-3.5" aria-hidden />
          )}
          {busy ? "Reading…" : "Attach document"}
        </button>
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={DOC_ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) void ingest(files);
          }}
        />
      </div>

      {docs.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2 py-1 text-[11px] text-foreground/80"
            >
              <FileText className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{doc.name}</span>
              <span className="shrink-0 text-muted-foreground">
                {Math.round(doc.chars / 100) / 10}k chars{doc.truncated ? " · excerpt" : ""}
              </span>
              <button
                type="button"
                aria-label={`Remove ${doc.name}`}
                onClick={() => onChange(docs.filter((d) => d.id !== doc.id))}
                className="shrink-0 rounded p-0.5 text-muted-foreground transition hover:text-foreground"
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

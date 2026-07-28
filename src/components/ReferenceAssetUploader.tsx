import { useId, useRef, useState, useMemo } from "react";
import {
  ImagePlus,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export type ReferenceAsset = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  size: number;
  pages?: number;
};

const MAX_FILES = 4;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PDF_PAGES = 20;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];

export type RejectionReason =
  | "unsupported"
  | "too-large"
  | "too-many-pages"
  | "too-many-files"
  | "read-failed";

export type FileRejection = {
  fileName: string;
  reason: RejectionReason;
  detail?: string;
};

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function isAccepted(file: File): boolean {
  // Accept explicit type, or infer from extension when type is empty/ambiguous.
  if (ACCEPTED.includes(file.type)) return true;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return true;
  if (lower.endsWith(".png")) return true;
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return true;
  if (lower.endsWith(".webp")) return true;
  if (lower.endsWith(".gif")) return true;
  return false;
}

function resolvedMimeType(file: File): string {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

/** Best-effort PDF page count from a base64 data URL. Counts /Type /Page occurrences. */
function countPdfPages(dataUrl: string): number | null {
  const b64 = dataUrl.split("base64,")[1];
  if (!b64) return null;
  try {
    const decoded = atob(b64);
    // Common PDF patterns: "/Type /Page " and "/Type/Page".
    const matches = decoded.match(/\/Type\s*\/Page\b/g);
    return matches ? matches.length : null;
  } catch {
    return null;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error(`Could not read ${file.name}`));
    fr.readAsDataURL(file);
  });
}

function reasonMessage(r: FileRejection): string {
  switch (r.reason) {
    case "unsupported":
      return `${r.fileName}: unsupported format. PNG, JPG, WEBP, GIF, or PDF only.`;
    case "too-large":
      return `${r.fileName}: over ${formatBytes(MAX_BYTES)}.`;
    case "too-many-pages":
      return `${r.fileName}: PDF has too many pages (limit ${MAX_PDF_PAGES}).`;
    case "too-many-files":
      return `${r.fileName}: max ${MAX_FILES} reference assets allowed.`;
    case "read-failed":
      return `${r.fileName}: could not read file. ${r.detail ?? ""}`;
  }
}

/**
 * Attach brand examples / reference assets to an asset request. Files stay in
 * memory (base64) and are sent to the analysis pass at generation time.
 */
export function ReferenceAssetUploader({
  assets,
  onChange,
  disabled,
}: {
  assets: ReferenceAsset[];
  onChange: (next: ReferenceAsset[]) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejections, setRejections] = useState<FileRejection[]>([]);
  const [lastUploadSummary, setLastUploadSummary] = useState<string | null>(null);

  const canAdd = assets.length < MAX_FILES;

  const summary = useMemo(() => {
    if (!assets.length) return null;
    const images = assets.filter((a) => a.mimeType !== "application/pdf").length;
    const pdfs = assets.filter((a) => a.mimeType === "application/pdf").length;
    const parts: string[] = [];
    if (images) parts.push(`${images} image${images > 1 ? "s" : ""}`);
    if (pdfs) parts.push(`${pdfs} PDF${pdfs > 1 ? "s" : ""}`);
    return `${parts.join(" + ")} will be analysed during generation`;
  }, [assets]);

  async function ingest(fileList: FileList | File[]) {
    setLastUploadSummary(null);
    const files = Array.from(fileList);
    const room = MAX_FILES - assets.length;

    if (room <= 0) {
      toast.error(`Up to ${MAX_FILES} reference assets.`);
      setRejections((prev) => [
        ...prev,
        ...files.map((f) => ({ fileName: f.name, reason: "too-many-files" as const })),
      ]);
      return;
    }

    const next: ReferenceAsset[] = [];
    const newRejections: FileRejection[] = [];
    let acceptedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      if (!isAccepted(file)) {
        newRejections.push({ fileName: file.name, reason: "unsupported" });
        skippedCount++;
        continue;
      }
      if (file.size > MAX_BYTES) {
        newRejections.push({ fileName: file.name, reason: "too-large" });
        skippedCount++;
        continue;
      }

      if (next.length >= room) {
        newRejections.push({ fileName: file.name, reason: "too-many-files" });
        skippedCount++;
        continue;
      }

      try {
        const dataUrl = await readAsDataUrl(file);
        const mimeType = resolvedMimeType(file);
        let pages: number | undefined;
        if (mimeType === "application/pdf") {
          const pageCount = countPdfPages(dataUrl);
          if (pageCount !== null && pageCount > MAX_PDF_PAGES) {
            newRejections.push({
              fileName: file.name,
              reason: "too-many-pages",
              detail: `detected ${pageCount} pages`,
            });
            skippedCount++;
            continue;
          }
          if (pageCount !== null) pages = pageCount;
        }
        next.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          mimeType,
          dataUrl,
          size: file.size,
          pages,
        });
        acceptedCount++;
      } catch (e) {
        const detail = (e as Error).message;
        newRejections.push({ fileName: file.name, reason: "read-failed", detail });
        skippedCount++;
      }
    }

    if (newRejections.length) {
      setRejections((prev) => [...prev, ...newRejections]);
      newRejections.forEach((r) => toast.error(reasonMessage(r)));
    }
    if (next.length) {
      onChange([...assets, ...next]);
      toast.success(
        `${acceptedCount} reference${acceptedCount > 1 ? "s" : ""} attached${
          skippedCount ? ` · ${skippedCount} skipped` : ""
        }`,
      );
      setLastUploadSummary(
        `${acceptedCount} added${skippedCount ? `, ${skippedCount} skipped` : ""}`,
      );
    }
  }

  function remove(asset: ReferenceAsset) {
    onChange(assets.filter((x) => x.id !== asset.id));
    setRejections((prev) => prev.filter((r) => r.fileName !== asset.name));
  }

  return (
    <div className="mt-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/45">
        Reference assets (optional)
      </div>
      <p className="mt-1 text-xs text-black/50">
        Attach brand examples, prior collateral or inspiration. We read them before generating and
        match layout, palette and tone.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled && e.dataTransfer.files.length) void ingest(e.dataTransfer.files);
        }}
        className={`mt-2 rounded-xl border border-dashed px-3 py-3 transition ${
          dragging ? "border-[#003FC7] bg-[#003FC7]/[0.06]" : "border-black/15 bg-white"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {assets.map((a) => (
            <div
              key={a.id}
              className="group relative flex items-center gap-2 rounded-lg border border-black/10 bg-white p-1 pr-7"
              title={`${a.name} · ${formatBytes(a.size)}${a.pages ? ` · ${a.pages} pages` : ""}`}
            >
              {a.mimeType === "application/pdf" ? (
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-black/[0.04]">
                  <FileText className="h-4 w-4 text-icon-muted" aria-hidden />
                </span>
              ) : (
                <img
                  src={a.dataUrl}
                  alt={`Reference: ${a.name}`}
                  className="h-10 w-10 rounded-md object-cover"
                />
              )}
              <span className="max-w-[9rem] truncate text-[11px] text-black/60">{a.name}</span>
              <button
                type="button"
                onClick={() => remove(a)}
                aria-label={`Remove reference ${a.name}`}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1 text-icon-muted transition hover:bg-black/5 hover:text-icon"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))}

          <label
            htmlFor={inputId}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-black/15 px-3 py-2 text-[11px] font-medium text-black/65 transition hover:border-black/30 hover:text-black ${
              disabled || !canAdd ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <ImagePlus className="h-3.5 w-3.5 text-icon-muted" aria-hidden />
            {assets.length ? "Add another" : "Upload or drop files"}
          </label>
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED.join(",")}
            className="sr-only"
            disabled={disabled || !canAdd}
            onChange={(e) => {
              if (e.target.files?.length) void ingest(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-black/40">
          <span>PNG, JPG, WEBP, GIF or PDF · max {MAX_FILES} files · {formatBytes(MAX_BYTES)} each · PDFs ≤ {MAX_PDF_PAGES} pages</span>
          {lastUploadSummary && (
            <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-black/60">
              {lastUploadSummary}
            </span>
          )}
        </div>
      </div>

      {summary && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          <span>{summary}</span>
        </div>
      )}

      {rejections.length > 0 && (
        <div
          className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
            {rejections.length === 1 ? "1 file could not be used" : `${rejections.length} files could not be used`}
          </div>
          <ul className="mt-1 space-y-0.5">
            {rejections.map((r, idx) => (
              <li key={`${r.fileName}-${r.reason}-${idx}`} className="text-[11px] text-rose-700/90">
                {reasonMessage(r)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

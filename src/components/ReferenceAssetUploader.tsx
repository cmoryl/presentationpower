import { useId, useRef, useState } from "react";
import { ImagePlus, X, FileText } from "lucide-react";
import { toast } from "sonner";

export type ReferenceAsset = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  size: number;
};

const MAX_FILES = 4;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error(`Could not read ${file.name}`));
    fr.readAsDataURL(file);
  });
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

  async function ingest(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const room = MAX_FILES - assets.length;
    if (room <= 0) {
      toast.error(`Up to ${MAX_FILES} reference assets.`);
      return;
    }
    const next: ReferenceAsset[] = [];
    for (const file of files.slice(0, room)) {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(`${file.name}: PNG, JPG, WEBP, GIF or PDF only.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is over 5 MB.`);
        continue;
      }
      try {
        const dataUrl = await readAsDataUrl(file);
        next.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          mimeType: file.type,
          dataUrl,
          size: file.size,
        });
      } catch (e) {
        toast.error((e as Error).message);
      }
    }
    if (next.length) {
      onChange([...assets, ...next]);
      toast.success(`${next.length} reference${next.length > 1 ? "s" : ""} attached`);
    }
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
                onClick={() => onChange(assets.filter((x) => x.id !== a.id))}
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
              disabled || assets.length >= MAX_FILES ? "pointer-events-none opacity-40" : ""
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
            disabled={disabled || assets.length >= MAX_FILES}
            onChange={(e) => {
              if (e.target.files?.length) void ingest(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        <div className="mt-2 text-[10px] text-black/40">
          PNG, JPG, WEBP, GIF or PDF · max {MAX_FILES} files · 5 MB each
        </div>
      </div>
    </div>
  );
}

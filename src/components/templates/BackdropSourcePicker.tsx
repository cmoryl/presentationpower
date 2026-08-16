// -----------------------------------------------------------------------------
// BACKDROP SOURCE PICKER — choose the backdrop image behind a look's CSS layers.
//
// Two sources, one output: a stable public URL
// (`/api/public/division-image?path=…`) written into the background override.
//   • Upload — pushes the file into the division imagery library (tagged
//     `backdrop`) so it becomes shared brand knowledge, then selects it.
//   • Library — browse any division's existing imagery and pick one.
// -----------------------------------------------------------------------------

import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listDivisionImagery,
  uploadDivisionImagery,
  type DivisionImageryEntry,
} from "@/lib/division-imagery.functions";
import { NEXT_DIVISIONS } from "@/lib/next-event";
import { inputCls } from "./fields";

export function divisionImageUrl(storagePath: string): string {
  return `/api/public/division-image?path=${encodeURIComponent(storagePath)}`;
}

function pathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /division-image\?path=([^&]+)/.exec(url);
  return m ? decodeURIComponent(m[1]!) : null;
}

export function BackdropSourcePicker({
  value,
  onPick,
}: {
  value: string | null | undefined;
  onPick: (url: string | null) => void;
}) {
  const divisions = useMemo(
    () => NEXT_DIVISIONS.map((d) => ({ id: d.id, name: d.name })),
    [],
  );
  const [divisionId, setDivisionId] = useState(divisions[0]?.id ?? "transperfect");
  const [tab, setTab] = useState<"library" | "upload">("library");
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const listFn = useServerFn(listDivisionImagery);
  const uploadFn = useServerFn(uploadDivisionImagery);

  const q = useQuery({
    queryKey: ["backdrop-picker-imagery", divisionId, refreshKey],
    queryFn: () => listFn({ data: { divisionId } }),
    retry: false,
  });

  const selectedPath = pathFromUrl(value);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image exceeds 20MB.");
      return;
    }
    setBusy(true);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      const row = (await uploadFn({
        data: {
          divisionId,
          filename: file.name,
          contentType: file.type || "image/png",
          data: b64,
          kind: "abstract",
          tags: ["backdrop", "template"],
          note: "Uploaded from Template Studio backgrounds",
        },
      })) as { storage_path?: string };
      if (!row?.storage_path) throw new Error("Upload returned no path.");
      onPick(divisionImageUrl(row.storage_path));
      setRefreshKey((k) => k + 1);
      setTab("library");
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Backdrop uploaded and selected.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const entries: DivisionImageryEntry[] = q.data ?? [];

  return (
    <div className="rounded-xl border border-black/10 p-3 dark:border-white/15">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-black/12 p-0.5 text-[11px] dark:border-white/15">
          {(["library", "upload"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`rounded-full px-2.5 py-1 transition ${
                tab === t ? "bg-[#003FC7] text-white" : "hover:opacity-70"
              }`}
            >
              {t === "library" ? "Division library" : "Upload"}
            </button>
          ))}
        </div>
        <select
          className={`${inputCls} h-8 w-auto flex-1 text-xs`}
          value={divisionId}
          onChange={(e) => setDivisionId(e.target.value)}
        >
          {divisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {value && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="text-[11px] underline underline-offset-2 opacity-70"
          >
            Clear
          </button>
        )}
      </div>

      {tab === "upload" ? (
        <div className="mt-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
            className="w-full text-xs"
          />
          <p className="mt-1.5 text-[11px] opacity-60">
            Saved into the {divisions.find((d) => d.id === divisionId)?.name} imagery library
            (tagged “backdrop”) so other looks can reuse it. Max 20MB.
          </p>
          {busy && <p className="mt-1 text-[11px] opacity-70">Uploading…</p>}
        </div>
      ) : (
        <div className="mt-3">
          {q.isLoading && <p className="text-[11px] opacity-60">Loading library…</p>}
          {q.isError && (
            <p className="text-[11px] text-red-600">
              {(q.error as Error)?.message ?? "Could not load imagery."}
            </p>
          )}
          {!q.isLoading && !q.isError && entries.length === 0 && (
            <p className="text-[11px] opacity-60">
              No imagery for this division yet — upload one on the Upload tab.
            </p>
          )}
          {entries.length > 0 && (
            <ul className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1">
              {entries.map((e) => {
                const active = selectedPath === e.storage_path;
                const thumb = e.variantUrls?.thumb ?? e.signedUrl;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onPick(divisionImageUrl(e.storage_path))}
                      title={e.filename}
                      aria-pressed={active}
                      className={`block w-full overflow-hidden rounded-lg border transition ${
                        active
                          ? "border-[#003FC7] ring-2 ring-[#003FC7]/40"
                          : "border-black/10 hover:border-[#003FC7]/50 dark:border-white/15"
                      }`}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={e.filename}
                          loading="lazy"
                          className="aspect-[16/9] w-full object-cover"
                        />
                      ) : (
                        <span className="flex aspect-[16/9] w-full items-center justify-center text-[10px] opacity-50">
                          no preview
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

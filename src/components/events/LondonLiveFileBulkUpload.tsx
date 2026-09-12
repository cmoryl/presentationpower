// London signage — REPLACE THE ARTWORK ON MANY SIGNS AT ONCE.
//
// The per-sign panel handles one file at a time. When a whole set of finished
// files comes back from the design team, this is where the lot goes in: drop the
// files, the names are matched to signs, anything ambiguous is picked by hand,
// and each match is stored and made the version in force. From that moment the
// cards, previews, renders and vendor downloads all show the supplied file.
//
// Pairing rule: a print/vector file (.ai .pdf .eps .svg) is the file that is
// printed; a picture (.jpg .png .webp) with the same name is what the cards
// show. A picture on its own is accepted too, so a sign can be corrected
// visually before the Illustrator file exists.

import { useMemo, useState } from "react";
import { CheckCircle2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import {
  listLondonLiveFiles,
  publishLondonLiveFile,
} from "@/lib/london-live-files.functions";
import { setLondonLiveFiles, useLondonLiveFiles } from "@/lib/next-london-live-files";
import type { LondonPanel } from "@/lib/next-london-signage";

const BUCKET = "london-live-files";
const MASTER_EXT = [".ai", ".pdf", ".eps", ".svg"];
const PROOF_EXT = [".jpg", ".jpeg", ".png", ".webp"];

function ext(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i).toLowerCase();
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Strip the bits a proof file carries but a sign name never does. */
function stem(name: string): string {
  return slug(name)
    .replace(/-(proof|preview|flat|render|jpg|png|rgb|cmyk|final|v\d+|r\d{1,3})$/g, "")
    .replace(/^r\d{1,3}-/, "");
}

export type BulkMatch = {
  key: string;
  master: File | null;
  proof: File | null;
  /** Sign this set is going to; empty means the person has not chosen yet. */
  panelId: string;
  /** True when the name matched a sign on its own. */
  auto: boolean;
};

/** Match dropped files to signs by name, pairing print file with its picture. */
export function matchLondonUploads(files: readonly File[], panels: readonly LondonPanel[]): BulkMatch[] {
  const byId = new Map(panels.map((p) => [p.id, p] as const));
  const byName = new Map<string, LondonPanel>();
  for (const panel of panels) {
    byName.set(slug(panel.name), panel);
    byName.set(slug(`${panel.room} ${panel.name}`), panel);
  }

  const groups = new Map<string, BulkMatch>();
  for (const file of files) {
    const e = ext(file.name);
    const kind = MASTER_EXT.includes(e) ? "master" : PROOF_EXT.includes(e) ? "proof" : null;
    if (!kind) continue;
    const key = stem(file.name);
    let row = groups.get(key);
    if (!row) {
      const direct = byId.get(key) ?? byName.get(key) ?? null;
      const loose =
        direct ??
        panels.find((p) => key.includes(p.id) || key.includes(slug(p.name))) ??
        null;
      row = { key, master: null, proof: null, panelId: loose?.id ?? "", auto: !!loose };
      groups.set(key, row);
    }
    if (kind === "master") row.master = file;
    else row.proof = file;
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export interface LondonLiveFileBulkUploadProps {
  panels: readonly LondonPanel[];
  canEdit: boolean;
  onChanged?: () => void;
}

export function LondonLiveFileBulkUpload({
  panels,
  canEdit,
  onChanged,
}: LondonLiveFileBulkUploadProps) {
  const liveFiles = useLondonLiveFiles();
  const publish = useServerFn(publishLondonLiveFile);
  const refetch = useServerFn(listLondonLiveFiles);
  const [rows, setRows] = useState<BulkMatch[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string[]>([]);

  const ready = useMemo(
    () => rows.filter((r) => r.panelId && (r.master || r.proof)),
    [rows],
  );
  const unmatched = rows.length - ready.length;

  const pick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setDone([]);
    setRows(matchLondonUploads([...files], panels));
  };

  const store = async (file: File, panelId: string, kind: "master" | "proof", version: number) => {
    const path = `${panelId}/v${version}-${kind}${ext(file.name) || ".ai"}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (error) throw new Error(error.message);
    return path;
  };

  const run = async () => {
    if (ready.length === 0) return;
    setBusy(true);
    const saved: string[] = [];
    const failed: string[] = [];
    try {
      for (const row of ready) {
        const panel = panels.find((p) => p.id === row.panelId);
        if (!panel) continue;
        try {
          const version = (liveFiles[panel.id]?.version ?? 0) + 1;
          // A picture on its own still becomes the file in force: it is what
          // the cards show, and it is also what the vendor downloads until an
          // Illustrator file replaces it.
          const source = row.master ?? row.proof!;
          const masterPath = await store(source, panel.id, "master", version);
          const proofPath = row.proof ? await store(row.proof, panel.id, "proof", version) : null;
          await publish({
            data: {
              panelId: panel.id,
              masterPath,
              masterFilename: source.name,
              masterContentType: source.type || null,
              proofPath,
              trimW: panel.trimW,
              trimH: panel.trimH,
              note: note.trim() || null,
            },
          });
          saved.push(panel.name);
        } catch {
          failed.push(panel.name);
        }
      }
      try {
        setLondonLiveFiles(await refetch());
      } catch {
        /* a reload still picks the new versions up */
      }
      onChanged?.();
      setDone(saved);
      setRows((prev) => prev.filter((r) => !saved.includes(panels.find((p) => p.id === r.panelId)?.name ?? "")));
      if (saved.length > 0) {
        toast.success(`${saved.length} sign${saved.length === 1 ? "" : "s"} switched to your files`, {
          description: "Every card, preview and render for them shows your artwork now.",
        });
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} could not be stored: ${failed.join(", ")}`);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit) return null;

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/60">
        Put your own artwork on the signs
      </p>
      <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-[#03002C]/70">
        Choose as many finished files as you like. Print files (.ai, .pdf, .eps, .svg) and pictures
        (.jpg, .png, .webp) are paired by name and matched to a sign. Anything that cannot be matched
        is left for you to point at the right sign.
      </p>

      <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-xs font-semibold text-[#03002C] hover:bg-[#F2F2F2]">
        <Upload className="h-3.5 w-3.5" />
        Choose files
        <input
          type="file"
          multiple
          accept=".ai,.pdf,.eps,.svg,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => pick(e.target.files)}
        />
      </label>

      {rows.length > 0 ? (
        <>
          <div className="mt-4 overflow-hidden rounded-xl border border-black/10">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[#F2F2F2] font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#03002C]/60">
                <tr>
                  <th className="px-3 py-2">Your file</th>
                  <th className="px-3 py-2">Goes on this sign</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-t border-black/8">
                    <td className="px-3 py-2 align-top text-[#03002C]">
                      <span className="font-semibold">{row.master?.name ?? row.proof?.name}</span>
                      {row.master && row.proof ? (
                        <span className="block text-[#03002C]/55">+ picture {row.proof.name}</span>
                      ) : null}
                      {!row.master ? (
                        <span className="block text-[#03002C]/55">picture only</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.panelId}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key ? { ...r, panelId: e.target.value, auto: false } : r,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-black/15 bg-white px-2 py-1.5 text-[12px]"
                      >
                        <option value="">Not matched — choose a sign</option>
                        {panels.map((panel) => (
                          <option key={panel.id} value={panel.id}>
                            {panel.floor} · {panel.room} · {panel.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="mt-3 block text-[12px] font-semibold text-[#03002C]">
            What changed (kept with every file)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={240}
              placeholder="Finished artwork from the design team — print these files."
              className="mt-1 block w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[12px] font-normal"
            />
          </label>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || ready.length === 0}
              onClick={() => void run()}
              className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-45"
            >
              <Upload className="h-3.5 w-3.5" />
              {busy
                ? "Storing…"
                : `Use my artwork on ${ready.length} sign${ready.length === 1 ? "" : "s"}`}
            </button>
            {unmatched > 0 ? (
              <span className="text-[12px] text-[#03002C]/65">
                {unmatched} still need a sign chosen.
              </span>
            ) : null}
          </div>
        </>
      ) : null}

      {done.length > 0 ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-[#A6FA87]/50 bg-[#A6FA87]/20 p-3 text-[12.5px] text-[#03002C]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Now showing your artwork: {done.join(", ")}. Open any of them to move the logo, headline
            or code on top, or download the file the vendor prints.
          </span>
        </p>
      ) : null}
    </div>
  );
}

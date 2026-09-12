// London signage — LIVE FILE for one sign.
//
// When Illustrator hands back a finished file for a sign, this is where it goes
// in. The file is stored once, registered as the version in force, and from that
// moment every preview card, editor ground and venue render in the kit shows it
// — no rebuild, no code change. The previous version is retired but kept.
//
// Only the brand team sees this; everyone else sees which version is in force.

import { useState } from "react";
import { FileUp, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import {
  listLondonLiveFiles,
  publishLondonLiveFile,
  retireLondonLiveFile,
} from "@/lib/london-live-files.functions";
import { setLondonLiveFiles, useLondonLiveFiles } from "@/lib/next-london-live-files";
import type { LondonPanel } from "@/lib/next-london-signage";

const BUCKET = "london-live-files";

export interface LondonLiveFilePanelProps {
  panel: LondonPanel;
  /** Only the brand team can replace a file; others just see the version. */
  canEdit: boolean;
  /** Ask the page to re-read the versions in force. */
  onChanged?: () => void;
}

export function LondonLiveFilePanel({ panel, canEdit, onChanged }: LondonLiveFilePanelProps) {
  const liveFiles = useLondonLiveFiles();
  const inForce = liveFiles[panel.id] ?? null;
  const publish = useServerFn(publishLondonLiveFile);
  const retire = useServerFn(retireLondonLiveFile);
  const refetch = useServerFn(listLondonLiveFiles);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [master, setMaster] = useState<File | null>(null);
  const [proof, setProof] = useState<File | null>(null);

  const refresh = async () => {
    try {
      setLondonLiveFiles(await refetch());
    } catch {
      /* the page reload path still picks it up */
    }
    onChanged?.();
  };

  const upload = async (file: File, kind: "master" | "proof", version: number) => {
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase() || ".ai";
    const path = `${panel.id}/v${version}-${kind}${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (error) throw new Error(error.message);
    return path;
  };

  const save = async () => {
    if (!master) {
      toast.error("Choose the finished Illustrator file first.");
      return;
    }
    setBusy(true);
    try {
      const version = (inForce?.version ?? 0) + 1;
      const masterPath = await upload(master, "master", version);
      const proofPath = proof ? await upload(proof, "proof", version) : null;
      await publish({
        data: {
          panelId: panel.id,
          masterPath,
          masterFilename: master.name,
          masterContentType: master.type || null,
          proofPath,
          trimW: panel.trimW,
          trimH: panel.trimH,
          note: note.trim() || null,
        },
      });
      setMaster(null);
      setProof(null);
      setNote("");
      await refresh();
      toast.success(`Version ${version} is now the file in force`, {
        description: "Every preview card and render for this sign has switched to it.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That file could not be stored.");
    } finally {
      setBusy(false);
    }
  };

  const rollBack = async () => {
    if (!window.confirm("Go back to the artwork that ships with the build for this sign?")) return;
    setBusy(true);
    try {
      await retire({ data: { panelId: panel.id } });
      await refresh();
      toast.success("Back to the built-in artwork for this sign.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That could not be changed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-black/10 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#03002C]/60">
          Live file for this sign
        </p>
        {inForce ? (
          <span className="rounded-full bg-[#A6FA87]/35 px-2.5 py-1 text-[11px] font-semibold text-[#03002C]">
            Version {inForce.version} · issued {inForce.issued}
          </span>
        ) : (
          <span className="rounded-full bg-[#F2F2F2] px-2.5 py-1 text-[11px] font-semibold text-[#03002C]/70">
            Built-in artwork
          </span>
        )}
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-[#03002C]/70">
        {inForce
          ? `${inForce.filename}${inForce.note ? ` — ${inForce.note}` : ""} This is the file the cards, previews and renders show, and the one the vendor downloads.`
          : "This sign is shown from the artwork built into the kit. Put a finished file in here and every card, preview and render for it switches over straight away."}
      </p>

      {canEdit ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-[12px] font-semibold text-[#03002C]">
            Finished Illustrator file
            <input
              type="file"
              accept=".ai,.pdf,.eps,.svg,application/pdf,application/postscript,image/svg+xml"
              onChange={(e) => setMaster(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[12px] font-normal"
            />
          </label>
          <label className="text-[12px] font-semibold text-[#03002C]">
            Flat picture of it (shown on the cards)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setProof(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[12px] font-normal"
            />
          </label>
          <label className="text-[12px] font-semibold text-[#03002C] sm:col-span-2">
            What changed
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={240}
              placeholder="Finished live file — new headline, corrected trim. Print this file."
              className="mt-1 block w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-[12px] font-normal"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button
              type="button"
              disabled={busy || !master}
              onClick={() => void save()}
              className="inline-flex items-center gap-2 rounded-full bg-[#003FC7] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-45"
            >
              <Upload className="h-3.5 w-3.5" />
              {busy ? "Storing…" : inForce ? "Replace the live file" : "Make this the live file"}
            </button>
            {inForce ? (
              <>
                <a
                  href={inForce.masterUrl ?? undefined}
                  download={inForce.filename}
                  className="inline-flex items-center gap-2 rounded-full border border-black/15 px-4 py-2 text-xs font-semibold text-[#03002C] hover:bg-[#F2F2F2]"
                >
                  <FileUp className="h-3.5 w-3.5" />
                  Download version {inForce.version}
                </a>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void rollBack()}
                  className="inline-flex items-center gap-2 rounded-full border border-[#E53D2E]/40 px-4 py-2 text-xs font-semibold text-[#E53D2E] hover:bg-white disabled:opacity-45"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Back to built-in artwork
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

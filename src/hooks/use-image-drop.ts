// Shared drag-and-drop image ingestion for slides.
//
// One drop does two things:
//  1. uploads the file to the private `slide-media` bucket and hands the
//     signed URL + storage path back to the caller (so it can be applied to
//     the active slide), and
//  2. optionally files the same image into the division-scoped shared
//     imagery library (`division_imagery`) so the whole team can reuse it.
//
// Used by the deck editor stage (drop straight onto the slide) and by
// SlideImageryPanel's dropzone.

import type * as React from "react";
import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { uploadSlideMedia } from "@/lib/slide-media";
import { uploadDivisionImagery } from "@/lib/division-imagery.functions";
import { logImageryEvent } from "@/lib/admin.functions";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const PASSTHROUGH = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];
const RASTERIZE = ["image/avif"];
export const DROP_ACCEPT = [...PASSTHROUGH, ...RASTERIZE];

async function rasterizeToPng(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not decode image for conversion."));
      el.crossOrigin = "anonymous";
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 1600;
    canvas.height = img.naturalHeight || 900;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable for conversion.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG conversion failed."))),
        "image/png",
        0.95,
      );
    });
    const base = file.name.replace(/\.(avif)$/i, "") || "image";
    return new File([blob], `${base}.png`, { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result ?? "");
      resolve(res.includes(",") ? res.split(",", 2)[1] ?? "" : res);
    };
    reader.onerror = () => reject(new Error("Could not read the dropped file."));
    reader.readAsDataURL(file);
  });
}

export type ImageDropResult = { url: string; path: string | null };

/** Coarse-grained upload progress. Supabase Storage's JS client doesn't
 *  surface byte-level progress, so we report deterministic phase steps per
 *  file (prepare → upload → file to library → done), which is enough to
 *  drive an honest, always-moving progress bar. */
export type ImageDropProgress = {
  total: number;
  completed: number;
  /** 0-100 across the whole batch, including in-flight phases. */
  pct: number;
  fileName: string;
  phase: "preparing" | "uploading" | "filing" | "done";
};

const PHASE_LABEL: Record<ImageDropProgress["phase"], string> = {
  preparing: "Preparing",
  uploading: "Uploading",
  filing: "Adding to library",
  done: "Finishing up",
};

export function describeProgress(p: ImageDropProgress): string {
  const scope = p.total > 1 ? ` (${Math.min(p.completed + 1, p.total)}/${p.total})` : "";
  return `${PHASE_LABEL[p.phase]}${scope} — ${p.fileName}`;
}

export function useImageDrop({
  divisionId,
  onApply,
  defaultAddToLibrary = true,
  enabled = true,
}: {
  divisionId?: string;
  /** Called once per accepted file with the uploaded slide-media URL/path. */
  onApply: (result: ImageDropResult, index: number) => void;
  defaultAddToLibrary?: boolean;
  enabled?: boolean;
}) {
  const qc = useQueryClient();
  const uploadToLibrary = useServerFn(uploadDivisionImagery);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOver, setIsOver] = useState(false);
  const [addToLibrary, setAddToLibrary] = useState(defaultAddToLibrary);
  const [progress, setProgress] = useState<ImageDropProgress | null>(null);
  const depth = useRef(0);

  const ingest = useCallback(
    async (files: File[]) => {
      if (!enabled) return;
      const images = files.filter((f) => DROP_ACCEPT.includes(f.type));
      const rejected = files.length - images.length;
      if (images.length === 0) {
        const msg = "Drop an image file (JPEG, PNG, WebP, GIF, SVG, AVIF).";
        setError(msg);
        toast.error("Unsupported file type", { description: msg });
        return;
      }
      if (rejected > 0) {
        toast.error(
          rejected === 1 ? "1 file skipped" : `${rejected} files skipped`,
          { description: "Only JPEG, PNG, WebP, GIF, SVG and AVIF images can be uploaded." },
        );
      }
      setError(null);
      setBusy(true);

      const total = images.length;
      const PHASES = 3; // prepare, upload, file/finish
      const step = (completed: number, phaseIdx: number, fileName: string, phase: ImageDropProgress["phase"]) =>
        setProgress({
          total,
          completed,
          pct: Math.min(99, Math.round(((completed * PHASES + phaseIdx) / (total * PHASES)) * 100)),
          fileName,
          phase,
        });

      let filed = 0;
      let applied = 0;
      const failures: string[] = [];

      try {
        for (let i = 0; i < images.length; i++) {
          const file = images[i];
          if (file.size > MAX_BYTES) {
            const msg = `"${file.name}" is too large. Max ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`;
            setError(msg);
            failures.push(msg);
            continue;
          }
          try {
            step(i, 0, file.name, "preparing");
            const prepared = RASTERIZE.includes(file.type) ? await rasterizeToPng(file) : file;

            step(i, 1, file.name, "uploading");
            const uploaded = await uploadSlideMedia(prepared);
            onApply({ url: uploaded.signedUrl, path: uploaded.path ?? null }, i);
            applied++;
            void logImageryEvent({
              data: {
                imageId: `upload:${uploaded.path ?? uploaded.signedUrl}`,
                brandId: divisionId ?? null,
                eventType: "use",
              },
            }).catch(() => {});

            if (addToLibrary && divisionId) {
              step(i, 2, file.name, "filing");
              try {
                await uploadToLibrary({
                  data: {
                    divisionId,
                    filename: prepared.name || "dropped-image.png",
                    contentType: prepared.type || "image/png",
                    data: await toBase64(prepared),
                    kind: "upload",
                    tags: ["dropped", "slide"],
                    note: "Added by drag-and-drop from the slide editor.",
                  },
                });
                filed++;
              } catch (e) {
                // Applying the image to the slide already succeeded — filing it
                // is best-effort (e.g. signed-out or RLS denial).
                console.warn("Division library filing failed", e);
                toast.error(`Couldn't add "${file.name}" to the division library`, {
                  description:
                    e instanceof Error ? e.message : "The image is on the slide, but wasn't saved to the library.",
                });
              }
            }
            step(i + 1, 0, file.name, "done");
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Upload failed.";
            failures.push(`"${file.name}": ${msg}`);
            setError(msg);
            toast.error(`Upload failed — ${file.name}`, { description: msg });
          }
        }

        if (filed > 0) {
          void qc.invalidateQueries({ queryKey: ["division-imagery", divisionId] });
          void qc.invalidateQueries({ queryKey: ["admin-division-imagery", divisionId] });
        }

        if (applied > 0) {
          const suffix = filed > 0 ? " and added to the division library" : "";
          toast.success(
            applied === 1 ? `Image applied${suffix}` : `${applied} images applied${suffix}`,
            { id: "image-drop", duration: 2200 },
          );
        } else if (failures.length > 0) {
          toast.error("No images were uploaded", {
            description: failures[0],
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed.";
        setError(msg);
        toast.error("Upload failed", { description: msg });
      } finally {
        setBusy(false);
        setProgress(null);
      }
    },
    [addToLibrary, divisionId, enabled, onApply, qc, uploadToLibrary],
  );


  const dropProps = {
    onDragEnter: (e: React.DragEvent) => {
      if (!enabled) return;
      if (!Array.from(e.dataTransfer?.types ?? []).includes("Files")) return;
      e.preventDefault();
      depth.current += 1;
      setIsOver(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!enabled) return;
      if (!Array.from(e.dataTransfer?.types ?? []).includes("Files")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!enabled) return;
      e.preventDefault();
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setIsOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!enabled) return;
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      depth.current = 0;
      setIsOver(false);
      void ingest(files);
    },
  };

  return { dropProps, isOver, busy, progress, error, setError, addToLibrary, setAddToLibrary, ingest };
}

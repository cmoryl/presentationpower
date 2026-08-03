// One-click "save this asset into a division imagery library" control, shared
// by the Asset Inspector tabs. Handles the upload + best-effort approval and
// reports the outcome through toasts.

import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadDivisionImagery, approveDivisionImagery } from "@/lib/division-imagery.functions";

export type DivisionSavePayload = {
  dataUrl: string;
  filename: string;
  note?: string;
  tags?: string[];
  kind?: "photo" | "abstract" | "generated" | "upload";
};

export function useDivisionAssetSaver(divisionId: string) {
  const uploadFn = useServerFn(uploadDivisionImagery);
  const approveFn = useServerFn(approveDivisionImagery);

  const save = useCallback(
    async (payload: DivisionSavePayload) => {
      const row = (await (uploadFn as never as (a: unknown) => Promise<{ id: string }>)({
        data: {
          divisionId,
          filename: payload.filename,
          contentType: "image/png",
          data: payload.dataUrl,
          kind: payload.kind ?? "upload",
          tags: payload.tags ?? ["imported_deck"],
          note: payload.note,
        },
      })) as { id: string };
      let approved = false;
      try {
        await (approveFn as never as (a: unknown) => Promise<unknown>)({
          data: { id: row.id, approved: true },
        });
        approved = true;
      } catch {
        approved = false;
      }
      return { id: row.id, approved };
    },
    [divisionId, uploadFn, approveFn],
  );

  return save;
}

export function SaveAssetButton({
  label = "Save to division",
  build,
  divisionId,
  className,
}: {
  label?: string;
  /** Produces the PNG payload lazily so rasterisation only happens on click. */
  build: () => Promise<DivisionSavePayload> | DivisionSavePayload;
  divisionId: string;
  className?: string;
}) {
  const save = useDivisionAssetSaver(divisionId);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  const onClick = async () => {
    setState("busy");
    try {
      const res = await save(await build());
      setState("done");
      toast.success(
        res.approved
          ? "Saved to the division imagery library (approved)."
          : "Saved to the division imagery library — pending admin approval.",
      );
    } catch (e) {
      setState("idle");
      toast.error((e as Error).message || "Could not save this asset.");
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state !== "idle"}
      className={
        className ??
        "inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-0.5 text-[10px] text-black/65 transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-60"
      }
    >
      {state === "busy" ? (
        <Loader2 size={11} className="animate-spin" />
      ) : state === "done" ? (
        <Check size={11} />
      ) : (
        <ImagePlus size={11} />
      )}
      {state === "done" ? "Saved" : label}
    </button>
  );
}

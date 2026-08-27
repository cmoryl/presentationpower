// -----------------------------------------------------------------------------
// BACKGROUND SET EDITOR
//
// Click any approved background system in the directory and edit it here: for a
// chosen scene × take you can upload a replacement image, re-render it with AI
// art direction, or clear it back to the authored `ground()` composition.
//
// Everything writes to the same `skin_backdrops` record the slide stage, the
// template editor and the PPTX/PDF/PNG exporters already read, so a replacement
// shows up on the templates you edit with no extra step.
// -----------------------------------------------------------------------------

import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RotateCcw, Trash2, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteSkinBackdrop,
  generateSkinBackdrop,
  listSkinBackdrops,
  uploadSkinBackdrop,
  type SkinBackdropRow,
} from "@/lib/skin-backdrop.functions";
import { ApprovedStyleThumb } from "@/components/skins/ApprovedStyleThumb";
import { SKIN_BG_TAKES, SKIN_SCENES, TAKE_LABEL, type SkinScene } from "@/lib/skin-backgrounds";
import type { IndustryBackgroundSet } from "@/lib/industry-backgrounds";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { announceSkinBackdropChange } from "@/components/slide/SkinBackdropContext";

const ACCEPT = "image/png,image/jpeg,image/webp,image/avif";
const TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);

function keyOf(code: string, scene: string, take: number) {
  return `${code}:${scene}:${take}`;
}

async function readBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) {
    bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

const chip = (on: boolean) =>
  `rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
    on
      ? "border-[#003FC7] bg-[#003FC7] text-white"
      : "border-black/12 text-black/60 hover:border-[#003FC7]/40 hover:text-[#003FC7] dark:border-white/15 dark:text-white/60"
  }`;

export function BackgroundSetEditor({
  set,
  open,
  onClose,
  onChanged,
  canEdit,
}: {
  set: IndustryBackgroundSet;
  open: boolean;
  onClose: () => void;
  /** Fired after any save/clear so the directory can repaint its tiles. */
  onChanged: (rows: SkinBackdropRow[]) => void;
  canEdit: boolean;
}) {
  const code = set.recipeId.toUpperCase();
  const list = useServerFn(listSkinBackdrops);
  const upload = useServerFn(uploadSkinBackdrop);
  const generate = useServerFn(generateSkinBackdrop);
  const remove = useServerFn(deleteSkinBackdrop);

  const [rows, setRows] = React.useState<SkinBackdropRow[]>([]);
  const [scene, setScene] = React.useState<SkinScene>("cover");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const fileFor = React.useRef<number>(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const refresh = React.useCallback(() => {
    list()
      .then((all) => {
        setRows(all.filter((r) => r.skinCode.toUpperCase() === code));
        onChanged(all);
        announceSkinBackdropChange();
      })
      .catch(() => setRows([]));
  }, [list, code, onChanged]);

  React.useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const byKey = React.useMemo(() => {
    const map = new Map<string, SkinBackdropRow>();
    for (const r of rows) map.set(keyOf(r.skinCode.toUpperCase(), r.scene, r.take), r);
    return map;
  }, [rows]);

  function apply(row: SkinBackdropRow) {
    setRows((prev) => {
      const k = keyOf(row.skinCode.toUpperCase(), row.scene, row.take);
      const next = [row, ...prev.filter((r) => keyOf(r.skinCode.toUpperCase(), r.scene, r.take) !== k)];
      return next;
    });
  }

  async function onPick(file: File | undefined) {
    const take = fileFor.current;
    if (!file) return;
    if (!TYPES.has(file.type)) {
      toast.error("Upload a PNG, JPG, WebP or AVIF image.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Image is larger than 12 MB.");
      return;
    }
    const k = keyOf(code, scene, take);
    setBusy(k);
    try {
      const base64 = await readBase64(file);
      const row = await upload({
        data: {
          skinCode: code,
          scene,
          take,
          base64,
          contentType: file.type as "image/png",
          filename: file.name,
        },
      });
      apply(row);
      refresh();
      toast.success(`${code} · ${scene} · ${TAKE_LABEL[take] ?? `Take ${take + 1}`} replaced`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uploading the background failed");
    } finally {
      setBusy(null);
    }
  }

  async function render(take: number) {
    const k = keyOf(code, scene, take);
    setBusy(k);
    try {
      const row = await generate({
        data: { skinCode: code, scene, take, note: note.trim() || null },
      });
      apply(row);
      refresh();
      toast.success("Background re-rendered");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rendering the background failed");
    } finally {
      setBusy(null);
    }
  }

  async function clear(take: number) {
    const k = keyOf(code, scene, take);
    setBusy(k);
    try {
      await remove({ data: { skinCode: code, scene, take } });
      setRows((prev) => prev.filter((r) => keyOf(r.skinCode.toUpperCase(), r.scene, r.take) !== k));
      refresh();
      toast.success("Reverted to the authored composition");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reverting failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[15px]">
            <span className="text-[#003FC7]">{set.recipeId}</span> · {set.name} — background set
          </DialogTitle>
        </DialogHeader>

        <p className="text-[12px] leading-relaxed text-black/55 dark:text-white/55">
          Replace any scene × take with your own artwork, or re-render it. Saved replacements paint
          straight into the slide stage, the templates you edit and every export. Clearing one falls
          back to the authored {set.motifLabel} composition.
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">
            Scene
          </span>
          {SKIN_SCENES.map((s) => {
            const has = Array.from({ length: SKIN_BG_TAKES }, (_, t) => t).some((t) =>
              byKey.has(keyOf(code, s, t)),
            );
            return (
              <button key={s} type="button" className={chip(s === scene)} onClick={() => setScene(s)}>
                {s}
                {has && <span className="ml-1 text-[#A6FA87]">•</span>}
              </button>
            );
          })}
        </div>

        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">
            Extra art direction for AI re-renders (optional)
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. colder light, more negative space at the top"
            className="w-full rounded-lg border border-black/12 bg-transparent px-3 py-2 text-[12px] outline-none focus:border-[#003FC7] dark:border-white/15"
          />
        </label>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            void onPick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: SKIN_BG_TAKES }, (_, take) => {
            const k = keyOf(code, scene, take);
            const row = byKey.get(k);
            const isBusy = busy === k;
            return (
              <figure key={take} className="min-w-0">
                <div className="relative">
                  <ApprovedStyleThumb
                    pack={set.pack}
                    scene={scene}
                    take={take}
                    radius={8}
                    overrideUrl={row?.imageUrl ?? null}
                  />
                  {isBusy && (
                    <div className="absolute inset-0 grid place-items-center rounded-lg bg-black/55">
                      <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
                    </div>
                  )}
                </div>
                <figcaption className="mt-1.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
                      {TAKE_LABEL[take] ?? `Take ${take + 1}`}
                    </span>
                    <span
                      className={`text-[10px] font-semibold ${
                        row ? "text-[#003FC7]" : "text-black/35 dark:text-white/35"
                      }`}
                    >
                      {row ? "Replaced" : "Authored"}
                    </span>
                  </div>
                  {canEdit && (
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => {
                          fileFor.current = take;
                          inputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-black/12 px-2 py-1 text-[10px] font-semibold text-[#03002C]/70 transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-50 dark:border-white/15 dark:text-white/70"
                      >
                        <Upload className="h-3 w-3" aria-hidden />
                        Upload
                      </button>
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => void render(take)}
                        className="inline-flex items-center gap-1 rounded-md border border-black/12 px-2 py-1 text-[10px] font-semibold text-[#03002C]/70 transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-50 dark:border-white/15 dark:text-white/70"
                      >
                        <Wand2 className="h-3 w-3" aria-hidden />
                        {row ? "Redo" : "AI"}
                      </button>
                      {row && (
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => void clear(take)}
                          aria-label="Revert to authored composition"
                          className="inline-flex items-center gap-1 rounded-md border border-black/12 px-2 py-1 text-[10px] font-semibold text-black/55 transition hover:border-[#E53D2E] hover:text-[#E53D2E] disabled:opacity-50 dark:border-white/15 dark:text-white/55"
                        >
                          <RotateCcw className="h-3 w-3" aria-hidden />
                          Revert
                        </button>
                      )}
                    </div>
                  )}
                </figcaption>
              </figure>
            );
          })}
        </div>

        {!canEdit && (
          <p className="rounded-xl border border-black/10 p-3 text-[12px] text-black/55 dark:border-white/10 dark:text-white/55">
            Sign in with an admin or brand role to replace approved backgrounds. You can still review
            every composition here.
          </p>
        )}

        {rows.length > 0 && canEdit && (
          <button
            type="button"
            disabled={!!busy}
            onClick={async () => {
              setBusy("all");
              try {
                for (const r of rows) {
                  await remove({ data: { skinCode: code, scene: r.scene, take: r.take } });
                }
                setRows([]);
                refresh();
                toast.success(`${set.recipeId} reverted to its authored set`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Reverting the set failed");
              } finally {
                setBusy(null);
              }
            }}
            className="inline-flex items-center gap-1.5 self-start rounded-full border border-black/12 px-3 py-1.5 text-[11px] font-semibold text-black/60 transition hover:border-[#E53D2E] hover:text-[#E53D2E] disabled:opacity-50 dark:border-white/15 dark:text-white/60"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Revert all {rows.length} replacements in this set
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}

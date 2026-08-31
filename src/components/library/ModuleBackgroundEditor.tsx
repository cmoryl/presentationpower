// -----------------------------------------------------------------------------
// MODULE BACKGROUND EDITOR
//
// Scoped background replacement for ONE module inside one look. An admin
// reviewing e.g. "Spatial Clarity → Bento 5" can upload (or AI re-render) a
// background that applies to that module only — every other module in the look
// keeps the authored scene.
//
// Storage is the same `skin_backdrops` record the skin-wide set editor uses,
// keyed by the synthetic scene `mod:<VARIANT-ID>`, so the module card, the
// module view and every PPTX/PDF/PNG export pick it up through the shared
// ground engine with no extra wiring.
// -----------------------------------------------------------------------------

import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, ImageOff, Images, Loader2, RotateCcw, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  adoptSkinBackdrop,
  deleteSkinBackdrop,
  generateSkinBackdrop,
  listSkinBackdrops,
  uploadSkinBackdrop,
  type SkinBackdropRow,
} from "@/lib/skin-backdrop.functions";
import { moduleScene } from "@/lib/skin-backdrop-overrides";
import { backgroundCodeForPackId } from "@/lib/style-packs";
import { announceSkinBackdropChange } from "@/components/slide/SkinBackdropContext";
import { SKIN_BG_TAKES, TAKE_LABEL } from "@/lib/skin-backgrounds";

const ACCEPT = "image/png,image/jpeg,image/webp,image/avif";
const TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);

async function readBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

/**
 * Background code behind a look id — the SAME resolver the ground engine uses
 * (`skin-s01` → `S01`, `tpl-c01` → `C01`, legacy/brand packs → their own id).
 *
 * It used to be a strict `^skin-[sr]\d\d$` regex, so a composed look
 * (`skin-s01` + a recipe), a published custom look or a brand-mode look
 * silently returned null and the editor rendered nothing — the module simply
 * had no way to replace its background. Delegating keeps screen, export and
 * this editor on one key space.
 */
export function skinCodeForPackId(packId: string | null | undefined): string | null {
  if (!packId) return null;
  const id = String(packId).split("+")[0]!.trim();
  return backgroundCodeForPackId(id);
}

/** Human label for a stored backdrop: authored scene name, or the module it belongs to. */
function sceneLabel(r: { skinCode: string; scene: string; take: number }): string {
  const base = r.scene.startsWith("mod:") ? `Module ${r.scene.slice(4)}` : r.scene;
  const take = r.take > 0 ? ` · ${TAKE_LABEL[r.take] ?? `Take ${r.take + 1}`}` : "";
  return `${r.skinCode} · ${base}${take}`;
}

const btn =
  "inline-flex items-center gap-1 rounded-md border border-black/12 px-2 py-1 text-[10px] font-semibold text-[#03002C]/70 transition hover:border-[#003FC7] hover:text-[#003FC7] disabled:opacity-50 dark:border-white/15 dark:text-white/70";

export function ModuleBackgroundEditor({
  packId,
  packName,
  variantId,
  variantName,
  canEdit,
  take = 0,
}: {
  /** Active look, e.g. `skin-s01`. Only approved skins support replacement. */
  packId: string | null | undefined;
  packName?: string | null;
  variantId: string;
  variantName?: string | null;
  canEdit: boolean;
  /** Composition take this module renders (usually 0). */
  take?: number;
}) {
  const code = skinCodeForPackId(packId);
  const scene = React.useMemo(() => moduleScene(variantId), [variantId]);

  const list = useServerFn(listSkinBackdrops);
  const upload = useServerFn(uploadSkinBackdrop);
  const generate = useServerFn(generateSkinBackdrop);
  const remove = useServerFn(deleteSkinBackdrop);
  const adopt = useServerFn(adoptSkinBackdrop);

  const [row, setRow] = React.useState<SkinBackdropRow | null>(null);
  // Everything already stored for this look (and, on request, every look) so an
  // admin can point this module at artwork that exists instead of re-uploading.
  const [library, setLibrary] = React.useState<SkinBackdropRow[]>([]);
  const [scope, setScope] = React.useState<"look" | "all">("look");
  const [picking, setPicking] = React.useState(false);
  const [busy, setBusy] = React.useState<null | "upload" | "ai" | "clear" | "reuse">(null);
  const [note, setNote] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const refresh = React.useCallback(() => {
    if (!code) return;
    list()
      .then((all) => {
        // The library excludes THIS module's own record — reusing itself is a no-op.
        setLibrary(all.filter((r) => !(r.scene === scene && r.skinCode.toUpperCase() === code)));
        setRow(
          all.find(
            (r) => r.skinCode.toUpperCase() === code && r.scene === scene && r.take === take,
          ) ?? null,
        );
        announceSkinBackdropChange();
      })
      .catch(() => undefined);
  }, [list, code, scene, take]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Same look first: reusing artwork from a DIFFERENT skin is legal but rarely
  // right, so it lives behind the "Every look" scope.
  const choices = React.useMemo(() => {
    const mine = library.filter((r) => r.skinCode.toUpperCase() === code);
    const rows = scope === "look" ? mine : [...mine, ...library.filter((r) => r.skinCode.toUpperCase() !== code)];
    return rows.slice(0, 60);
  }, [library, scope, code]);

  if (!code) return null;

  async function onPick(file: File | undefined) {
    if (!file) return;
    if (!TYPES.has(file.type)) return toast.error("Upload a PNG, JPG, WebP or AVIF image.");
    if (file.size > 12 * 1024 * 1024) return toast.error("Image is larger than 12 MB.");
    setBusy("upload");
    try {
      const base64 = await readBase64(file);
      const saved = await upload({
        data: {
          skinCode: code!,
          scene,
          take,
          base64,
          contentType: file.type as "image/png",
          filename: file.name,
        },
      });
      setRow(saved);
      refresh();
      toast.success(`Background replaced for ${variantId} in ${packName ?? code}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uploading the background failed");
    } finally {
      setBusy(null);
    }
  }

  async function render() {
    setBusy("ai");
    try {
      const saved = await generate({
        data: { skinCode: code!, scene, take, note: note.trim() || null, basisScene: "cover" },
      });
      setRow(saved);
      refresh();
      toast.success("Module background re-rendered");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rendering the background failed");
    } finally {
      setBusy(null);
    }
  }

  async function reuse(src: SkinBackdropRow) {
    setBusy("reuse");
    try {
      const saved = await adopt({
        data: {
          skinCode: code!,
          scene,
          take,
          fromSkinCode: src.skinCode,
          fromScene: src.scene,
          fromTake: src.take,
        },
      });
      setRow(saved);
      setPicking(false);
      refresh();
      toast.success(`Now using the ${sceneLabel(src)} background for ${variantId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reusing that background failed");
    } finally {
      setBusy(null);
    }
  }

  async function clear() {
    setBusy("clear");
    try {
      await remove({ data: { skinCode: code!, scene, take } });
      setRow(null);
      refresh();
      toast.success("Reverted to the look's authored background");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reverting failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      data-module-background-editor={variantId}
      className="rounded-xl border border-black/10 p-3 dark:border-white/10"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-widest text-black/45 dark:text-white/45">
          Background · this module only
        </h4>
        <span
          className={`text-[10px] font-semibold ${
            row ? "text-[#003FC7]" : "text-black/35 dark:text-white/35"
          }`}
        >
          {row ? "Replaced" : "Look default"}
        </span>
      </header>

      <p className="mt-1.5 text-[11px] leading-relaxed text-black/55 dark:text-white/55">
        Applies to <strong>{variantName ?? variantId}</strong> in{" "}
        <strong>{packName ?? code}</strong> only — the card, this view and every export. Other
        modules in the look keep their authored scene.
      </p>

      {row && (
        <div className="mt-2 overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
          <img
            src={row.imageUrl}
            alt={`Replacement background for ${variantId}`}
            className="block aspect-video w-full object-cover"
          />
        </div>
      )}

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

      {canEdit ? (
        <>
          <label className="mt-2.5 block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">
              Art direction for the AI render (optional)
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. quieter, more negative space on the right"
              className="w-full rounded-lg border border-black/12 bg-transparent px-3 py-2 text-[12px] outline-none focus:border-[#003FC7] dark:border-white/15"
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => inputRef.current?.click()}
              className={btn}
            >
              {busy === "upload" ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-3 w-3" aria-hidden />
              )}
              Upload &amp; save
            </button>
            <button type="button" disabled={!!busy} onClick={() => void render()} className={btn}>
              {busy === "ai" ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Wand2 className="h-3 w-3" aria-hidden />
              )}
              {row ? "Re-render" : "AI background"}
            </button>
            {row && (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void clear()}
                className={`${btn} hover:border-[#E53D2E] hover:text-[#E53D2E]`}
              >
                {busy === "clear" ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                ) : (
                  <RotateCcw className="h-3 w-3" aria-hidden />
                )}
                Revert
              </button>
            )}
            <button
              type="button"
              disabled={!!busy}
              onClick={() => setPicking((v) => !v)}
              className={btn}
              aria-expanded={picking}
            >
              {busy === "reuse" ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Images className="h-3 w-3" aria-hidden />
              )}
              Use existing
            </button>
            <span className="ml-1 text-[10px] text-black/35 dark:text-white/35">
              {TAKE_LABEL[take] ?? `Take ${take + 1}`} of {SKIN_BG_TAKES}
            </span>
          </div>

          {picking && (
            <div className="mt-3 rounded-lg border border-black/10 p-2.5 dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-black/40 dark:text-white/40">
                  Backgrounds already in the library
                </span>
                <div className="flex items-center gap-1">
                  {(["look", "all"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScope(s)}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        scope === s
                          ? "bg-[#003FC7] text-white"
                          : "text-black/50 hover:text-[#003FC7] dark:text-white/50"
                      }`}
                    >
                      {s === "look" ? `${packName ?? code} only` : "Every look"}
                    </button>
                  ))}
                </div>
              </div>

              {choices.length === 0 ? (
                <p className="mt-2 text-[11px] text-black/50 dark:text-white/50">
                  Nothing saved{scope === "look" ? ` for ${packName ?? code}` : ""} yet — upload or
                  render one and it becomes reusable here.
                </p>
              ) : (
                <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {choices.map((c) => {
                    const active = row?.imageUrl === c.imageUrl;
                    return (
                      <li key={`${c.skinCode}-${c.scene}-${c.take}`}>
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => void reuse(c)}
                          title={c.prompt}
                          className="group block w-full overflow-hidden rounded-lg border border-black/10 text-left transition hover:border-[#003FC7] disabled:opacity-50 dark:border-white/10"
                        >
                          <img
                            src={c.imageUrl}
                            alt={`${c.skinCode} ${c.scene} take ${c.take + 1}`}
                            loading="lazy"
                            className="block aspect-video w-full object-cover"
                          />
                          <span className="flex items-center justify-between gap-1 px-1.5 py-1 text-[10px] text-black/60 dark:text-white/60">
                            <span className="truncate">{sceneLabel(c)}</span>
                            {active && <Check className="h-3 w-3 shrink-0 text-[#003FC7]" aria-hidden />}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-black/50 dark:text-white/50">
          <ImageOff className="h-3.5 w-3.5" aria-hidden />
          Sign in as an admin to replace this module&rsquo;s background.
        </p>
      )}
    </section>
  );
}

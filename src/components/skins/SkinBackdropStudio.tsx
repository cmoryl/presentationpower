// -----------------------------------------------------------------------------
// SKIN BACKDROP STUDIO
//
// Curation surface for the AI-generated backdrop library. For one skin it shows
// every scene (cover, section, data, process, …), what's already rendered, and
// the exact art direction that will be sent to the image model. You can render
// a scene, render alternate takes, or clear one and fall back to the CSS scene.
//
// Everything is additive: a scene with no generated image simply keeps its
// composed CSS backdrop, so nothing here can break a deck.
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  generateSkinBackdrop,
  listSkinBackdrops,
  deleteSkinBackdrop,
  type SkinBackdropRow,
} from "@/lib/skin-backdrop.functions";
import { SKIN_SCENES, type SkinScene } from "@/lib/skin-backgrounds";
import { backdropPrompt } from "@/lib/skin-backdrop-prompt";
import type { DesignSkin } from "@/lib/design-skins";

const SCENE_LABEL: Record<string, string> = {
  cover: "Cover",
  section: "Section break",
  statement: "Statement",
  data: "Data",
  process: "Process",
  grid: "Grid / bento",
  quote: "Quote",
  roster: "Roster",
  appendix: "Appendix",
  close: "Close",
};

const TAKES = [0, 1, 2, 3] as const;
const TAKE_LABEL = ["Take A", "Take B", "Take C", "Take D"];

function keyOf(code: string, scene: string, take: number) {
  return `${code}:${scene}:${take}`;
}

export function SkinBackdropStudio({ skin }: { skin: DesignSkin }) {
  const code = skin.code.toUpperCase();
  const generate = useServerFn(generateSkinBackdrop);
  const list = useServerFn(listSkinBackdrops);
  const remove = useServerFn(deleteSkinBackdrop);

  const [rows, setRows] = useState<SkinBackdropRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [scene, setScene] = useState<SkinScene>("cover");
  const [note, setNote] = useState("");

  const refresh = useCallback(() => {
    list()
      .then((all) => setRows(all.filter((r) => r.skinCode.toUpperCase() === code)))
      .catch(() => setRows([]));
  }, [list, code]);

  useEffect(refresh, [refresh]);

  const byKey = useMemo(() => {
    const map = new Map<string, SkinBackdropRow>();
    for (const r of rows) map.set(keyOf(r.skinCode.toUpperCase(), r.scene, r.take), r);
    return map;
  }, [rows]);

  const spec = useMemo(() => backdropPrompt(skin, scene), [skin, scene]);

  async function render(take: number) {
    const k = keyOf(code, scene, take);
    setBusy(k);
    try {
      const row = await generate({
        data: { skinCode: code, scene, take, note: note.trim() || null },
      });
      setRows((prev) => [
        row,
        ...prev.filter((r) => keyOf(r.skinCode.toUpperCase(), r.scene, r.take) !== k),
      ]);
      toast.success(`${skin.name} · ${SCENE_LABEL[scene] ?? scene} · ${TAKE_LABEL[take]} rendered`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rendering the backdrop failed");
    } finally {
      setBusy(null);
    }
  }

  async function clear(take: number) {
    const k = keyOf(code, scene, take);
    setBusy(k);
    try {
      await remove({ data: { skinCode: code, scene, take } });
      setRows((prev) =>
        prev.filter((r) => keyOf(r.skinCode.toUpperCase(), r.scene, r.take) !== k),
      );
      toast.success("Backdrop cleared — this scene falls back to its composed design");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Clearing the backdrop failed");
    } finally {
      setBusy(null);
    }
  }

  const renderedCount = rows.length;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
            <Sparkles className="h-4 w-4 text-[#A1FBF9]" aria-hidden />
            Backdrop studio
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            Art-directed imagery generated for this look and its sector. Scenes without a
            rendered backdrop keep their composed design.
          </p>
        </div>
        <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-wider text-white/70">
          {renderedCount} rendered
        </span>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {SKIN_SCENES.map((s) => {
          const has = TAKES.some((t) => byKey.has(keyOf(code, s, t)));
          const on = s === scene;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setScene(s)}
              aria-pressed={on}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                on
                  ? "border-[#A1FBF9]/60 bg-[#A1FBF9]/15 text-white"
                  : "border-white/12 text-white/70 hover:border-white/30 hover:text-white"
              }`}
            >
              {SCENE_LABEL[s] ?? s}
              {has && <span className="ml-1.5 text-[#A6FA87]">•</span>}
            </button>
          );
        })}
      </div>

      <label className="mb-4 block">
        <span className="mb-1.5 block text-[11px] uppercase tracking-wider text-white/50">
          Extra art direction (optional)
        </span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. colder light, deeper horizon, more negative space at the top"
          className="w-full rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#A1FBF9]/60 focus:outline-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TAKES.map((take) => {
          const k = keyOf(code, scene, take);
          const row = byKey.get(k);
          const isBusy = busy === k;
          return (
            <figure key={take} className="min-w-0">
              <div
                className="relative overflow-hidden rounded-xl border border-white/12"
                style={{ aspectRatio: "16 / 9", backgroundColor: skin.palette[0] }}
              >
                {row ? (
                  <img
                    src={row.imageUrl}
                    alt={`${skin.name} ${SCENE_LABEL[scene] ?? scene} backdrop, ${TAKE_LABEL[take]}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] text-white/45">
                    Not rendered
                  </div>
                )}
                {isBusy && (
                  <div className="absolute inset-0 grid place-items-center bg-black/55">
                    <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden />
                  </div>
                )}
              </div>
              <figcaption className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wider text-white/55">
                  {TAKE_LABEL[take]}
                </span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => render(take)}
                    disabled={!!busy}
                    className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-[11px] text-white/80 transition-colors hover:border-[#A1FBF9]/60 hover:text-white disabled:opacity-50"
                  >
                    <Wand2 className="h-3 w-3" aria-hidden />
                    {row ? "Redo" : "Render"}
                  </button>
                  {row && (
                    <button
                      type="button"
                      onClick={() => clear(take)}
                      disabled={!!busy}
                      aria-label={`Clear ${TAKE_LABEL[take]}`}
                      className="rounded-md border border-white/15 p-1 text-white/60 transition-colors hover:border-[#E53D2E]/60 hover:text-white disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                    </button>
                  )}
                </span>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <details className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
        <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-white/55">
          Art direction sent to the model
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-white/70">{spec.prompt}</p>
      </details>
    </section>
  );
}

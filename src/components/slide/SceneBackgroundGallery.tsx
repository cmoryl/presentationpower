// Curated scene background gallery — browse the art-directed backdrop library
// (every catalog visual language × every deck section) and drop one onto the
// current slide. Selection commits as a standard `library` background, so the
// pick renders on screen and exports natively to PowerPoint.
import { useMemo, useState } from "react";
import { Check, Columns2, Search, X } from "lucide-react";
import type { SkinScene } from "@/lib/skin-backgrounds";
import type { MotifFamily } from "@/lib/skin-backgrounds";
import { TAKE_LABEL } from "@/lib/skin-backgrounds";

import {
  GALLERY_FAMILIES,
  GALLERY_SCENES,
  SCENE_BACKGROUNDS,
  SCENE_LABEL,
  filterSceneBackgrounds,
  sceneTakes,
} from "@/lib/scene-background-gallery";


type Mode = "all" | "light" | "dark";

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-widest transition ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function SceneBackgroundGallery({
  selectedId,
  onPick,
}: {
  selectedId?: string | null;
  onPick: (presetId: string) => void;
}) {
  const [scene, setScene] = useState<SkinScene | "all">("cover");
  const [family, setFamily] = useState<MotifFamily | "all">("all");
  const [mode, setMode] = useState<Mode>("all");
  const [take, setTake] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  /** Skin × scene currently opened in the A–D side-by-side comparison. */
  const [compare, setCompare] = useState<{ code: string; scene: SkinScene } | null>(null);

  const results = useMemo(
    () => filterSceneBackgrounds({ scene, family, mode, take, query }),
    [scene, family, mode, take, query],
  );

  const compareTakes = useMemo(
    () => (compare ? sceneTakes(compare.code, compare.scene) : []),
    [compare],
  );




  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a look, reference or industry…"
            className="w-full rounded-full border border-border bg-background py-1.5 pl-7 pr-3 text-xs outline-none focus:border-foreground/40"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "light", "dark"] as Mode[]).map((m) => (
            <Chip key={m} active={mode === m} onClick={() => setMode(m)}>
              {m}
            </Chip>
          ))}
        </div>
      </div>

      {/* Scene = the deck section the backdrop was art-directed for. */}
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        <Chip active={scene === "all"} onClick={() => setScene("all")}>
          All scenes
        </Chip>
        {GALLERY_SCENES.map((s) => (
          <Chip key={s} active={scene === s} onClick={() => setScene(s)}>
            {SCENE_LABEL[s]}
          </Chip>
        ))}
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        <Chip active={family === "all"} onClick={() => setFamily("all")}>
          All motifs
        </Chip>
        {GALLERY_FAMILIES.map((f) => (
          <Chip key={f.id} active={family === f.id} onClick={() => setFamily(f.id)}>
            {f.label}
          </Chip>
        ))}
      </div>

      {/* Takes = alternate compositions of the same visual language. */}
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        <Chip active={take === "all"} onClick={() => setTake("all")}>
          All takes
        </Chip>
        {TAKE_LABEL.map((label, i) => (
          <Chip key={label} active={take === i} onClick={() => setTake(i)}>
            {label}
          </Chip>
        ))}
      </div>


      {/* Side-by-side comparison of every take of one skin × scene. */}
      {compare && compareTakes.length > 0 && (
        <div className="rounded-xl border border-foreground/30 bg-muted/30 p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="line-clamp-1 text-[11px] font-medium">
                {compareTakes[0]!.skinCode} · {compareTakes[0]!.skinName}
              </div>
              <div className="line-clamp-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                {SCENE_LABEL[compare.scene]} · compare takes side by side
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCompare(null)}
              aria-label="Close comparison"
              className="grid h-6 w-6 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {compareTakes.map((t) => {
              const selected = selectedId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onPick(t.id)}
                  title={`Apply ${t.takeLabel}`}
                  className={`relative aspect-[16/9] overflow-hidden rounded-lg border text-left transition ${
                    selected
                      ? "border-foreground ring-2 ring-foreground/70"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  <div className="absolute inset-0" style={{ background: t.css }} />
                  {selected && (
                    <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[9px] uppercase tracking-widest text-white">
                    {t.takeLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>
          {results.length} of {SCENE_BACKGROUNDS.length} scenes
        </span>
        <span>Curated · art-directed</span>
      </div>

      <div className="grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto pr-1">
        {results.map((p) => {
          const selected = selectedId === p.id;
          return (
            <div
              key={p.id}
              className={`group relative aspect-[16/9] overflow-hidden rounded-xl border transition ${
                selected
                  ? "border-foreground ring-2 ring-foreground/70"
                  : "border-border hover:border-foreground/40"
              }`}
            >
              <button
                type="button"
                onClick={() => onPick(p.id)}
                title={`${p.skinCode} · ${p.skinName} — ${SCENE_LABEL[p.scene]} · ${p.familyLabel}`}
                className="absolute inset-0 text-left"
              >
                <div className="absolute inset-0" style={{ background: p.css }} />
                {selected && (
                  <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-1.5">
                  <div className="line-clamp-1 text-[9px] font-medium text-white">
                    {p.skinCode} · {p.skinName}
                  </div>
                  <div className="line-clamp-1 text-[8px] uppercase tracking-widest text-white/70">
                    {SCENE_LABEL[p.scene]} · {p.familyLabel} · {p.takeLabel}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setCompare({ code: p.skinCode, scene: p.scene })}
                title="Compare takes A–D"
                aria-label={`Compare takes for ${p.skinName} ${SCENE_LABEL[p.scene]}`}
                className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[8px] uppercase tracking-widest text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Columns2 className="h-2.5 w-2.5" /> A–D
              </button>
            </div>
          );
        })}

        {results.length === 0 && (
          <div className="col-span-2 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No scenes match those filters.
          </div>
        )}
      </div>
    </div>
  );
}

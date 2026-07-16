import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef } from "react";
import { AppShell } from "@/components/AppShell";
import { BRAND_MODES } from "@/lib/taxonomy";
import {
  useBrandLibrary,
  getBrandContext,
  aggregateMemory,
  type ImageEntry,
} from "@/lib/imagery-library";
import { generateBrandImage } from "@/lib/imagery.functions";

export const Route = createFileRoute("/imagery")({
  head: () => ({
    meta: [
      { title: "Master Imagery · TransPerfect" },
      {
        name: "description",
        content:
          "Curate, upload, and generate brand-cohesive imagery per division. Tied to brand guidelines and evolving memory.",
      },
    ],
  }),
  component: ImageryPage,
});

function ImageryPage() {
  const [brandId, setBrandId] = useState<string>(BRAND_MODES[0].id);
  const brand = BRAND_MODES.find((b) => b.id === brandId)!;
  const ctx = useMemo(() => getBrandContext(brandId), [brandId]);
  const lib = useBrandLibrary(brandId);

  const [kind, setKind] = useState<"photo" | "abstract">("photo");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleGenerate() {
    setError(null);
    setBusy(true);
    try {
      const memory = aggregateMemory(brandId);
      const { url, prompt: fullPrompt } = await generateBrandImage({
        data: {
          brandId,
          brandName: ctx.name,
          brandDescription: ctx.description,
          tagline: ctx.tagline,
          primaryColors: ctx.primaryColors,
          photographyNote: ctx.photography,
          memoryTags: memory.tags,
          memoryNotes: memory.notes,
          kind,
          userPrompt: prompt || (kind === "photo" ? "hero scene for this brand" : "atmospheric backdrop"),
        },
      });
      lib.add({
        url,
        kind: "generated",
        source: "ai",
        tags: [kind, "generated", ...memory.tags.slice(0, 3)],
        prompt: fullPrompt,
      });
      setPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(f);
      });
      lib.add({
        url: dataUrl,
        kind: "upload",
        source: "upload",
        tags: ["upload"],
      });
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  const activeEntry = lib.all.find((e) => e.id === selected) ?? null;
  const primary = brand.tokens.primary;
  const accent = brand.tokens.accent;

  return (
    <AppShell>
      <div className="flex items-baseline justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-black/50">Master Imagery</div>
          <h1 className="mt-3 text-4xl font-semibold text-[#03002C]">Brand imagery repository</h1>
          <p className="mt-3 max-w-2xl text-black/60">
            Curate the imagery pool each division draws from. Toggle images on/off, upload your own,
            and generate new visuals that stay cohesive with brand guidelines and library memory.
          </p>
        </div>
      </div>

      {/* Brand selector */}
      <div className="mt-8 flex flex-wrap gap-2">
        {BRAND_MODES.map((b) => {
          const active = b.id === brandId;
          return (
            <button
              key={b.id}
              onClick={() => {
                setBrandId(b.id);
                setSelected(null);
              }}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                active
                  ? "border-transparent text-white shadow-lg"
                  : "border-black/15 bg-white text-black/70 hover:border-black/40"
              }`}
              style={active ? { background: b.tokens.primary } : undefined}
            >
              <span
                className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                style={{ background: active ? b.tokens.accent : b.tokens.primary }}
              />
              {b.name}
            </button>
          );
        })}
      </div>

      {/* Brand context strip */}
      <div
        className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border p-6 md:grid-cols-[1.4fr_1fr_1fr]"
        style={{ borderColor: `${primary}22`, background: `${primary}05` }}
      >
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em]" style={{ color: primary }}>
            {ctx.name} · Guideline context
          </div>
          <div className="mt-2 text-lg font-semibold text-[#03002C]">
            {ctx.tagline ?? brand.description}
          </div>
          {ctx.intro && (
            <p className="mt-2 line-clamp-3 text-sm text-black/60">{ctx.intro}</p>
          )}
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-black/50">Palette</div>
          <div className="mt-2 flex gap-1.5">
            {(ctx.primaryColors.length ? ctx.primaryColors : [primary, accent]).slice(0, 6).map((c, i) => (
              <div key={i} className="h-8 w-8 rounded-md border border-black/10" style={{ background: c }} />
            ))}
          </div>
          {ctx.photography && (
            <p className="mt-3 line-clamp-2 text-xs text-black/60">
              <span className="font-medium text-black/70">Photography: </span>
              {ctx.photography}
            </p>
          )}
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-black/50">Library memory</div>
          <MemoryChips tags={aggregateMemory(brandId).tags} />
          <div className="mt-2 text-xs text-black/50">
            {lib.active.length} active · {lib.all.length - lib.active.length} muted · {lib.all.length} total
          </div>
        </div>
      </div>

      {/* Generation + Upload */}
      <div className="mt-6 grid gap-4 md:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-[#03002C]">Generate with brand memory</div>
            <div className="flex rounded-full border border-black/10 p-0.5 text-xs">
              {(["photo", "abstract"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`rounded-full px-3 py-1 capitalize transition ${
                    kind === k ? "bg-[#03002C] text-white" : "text-black/60"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe the ${kind} you want for ${ctx.name}… (e.g. "translator working alongside a surgical team")`}
            rows={2}
            className="mt-3 w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-[#003FC7]"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-black/50">
              Uses this brand's palette, tagline, photography guideline, and active library memory tags.
            </div>
            <button
              onClick={handleGenerate}
              disabled={busy}
              className="rounded-full px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
              style={{ background: primary }}
            >
              {busy ? "Generating…" : "Generate image"}
            </button>
          </div>
          {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
        </div>

        <div className="rounded-2xl border border-dashed border-black/20 bg-white p-5">
          <div className="text-sm font-semibold text-[#03002C]">Upload imagery</div>
          <p className="mt-1 text-xs text-black/50">
            Drop or select images to add to the {ctx.name} pool. Kept local to your workspace.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
            className="mt-3 block w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-[#03002C] file:px-3 file:py-1.5 file:text-white"
          />
        </div>
      </div>

      {/* Analytics */}
      <AnalyticsPanel brandName={ctx.name} primary={primary} accent={accent} analytics={lib.analytics} onSelect={(id) => setSelected(id)} />

      {/* Imagery grid */}
      <div className="mt-8 grid gap-4 md:grid-cols-[2fr_1fr]">
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <div className="text-sm font-semibold text-[#03002C]">Library</div>
            <div className="text-xs text-black/50">Click to inspect · toggle to include/exclude</div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {lib.all.map((e) => {
              const disabled = lib.isDisabled(e.id);
              const isSelected = selected === e.id;
              return (
                <div
                  key={e.id}
                  className={`group relative overflow-hidden rounded-xl border transition ${
                    isSelected ? "ring-2 ring-offset-2" : ""
                  } ${disabled ? "opacity-40" : ""}`}
                  style={{
                    borderColor: isSelected ? primary : "rgba(0,0,0,0.08)",
                    // @ts-expect-error css var
                    "--tw-ring-color": primary,
                  }}
                >
                  <button
                    onClick={() => {
                      setSelected(e.id);
                      lib.recordUsage(e.id);
                    }}
                    className="block aspect-[16/10] w-full"
                  >
                    <img src={e.url} alt="" className="h-full w-full object-cover" />
                  </button>
                  <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">
                    {e.source === "ai" ? "AI" : e.source === "upload" ? "Upload" : e.kind}
                  </div>
                  <div className="absolute right-2 top-2 flex gap-1">
                    <button
                      onClick={() => lib.toggle(e.id)}
                      className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-[#03002C] hover:bg-white"
                    >
                      {disabled ? "Include" : "Exclude"}
                    </button>
                    {e.source !== "builtin" && (
                      <button
                        onClick={() => {
                          lib.remove(e.id);
                          if (selected === e.id) setSelected(null);
                        }}
                        className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-red-600 hover:bg-white"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Memory panel */}
        <MemoryPanel
          entry={activeEntry}
          onSave={(tags, note) => {
            if (!activeEntry) return;
            lib.updateMemory(activeEntry.id, { tags, note });
          }}
        />
      </div>
    </AppShell>
  );
}

function MemoryChips({ tags }: { tags: string[] }) {
  if (!tags.length) return <div className="mt-2 text-xs text-black/40">No tags yet</div>;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {tags.slice(0, 12).map((t) => (
        <span key={t} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-black/70">
          {t}
        </span>
      ))}
    </div>
  );
}

function MemoryPanel({
  entry,
  onSave,
}: {
  entry: ImageEntry | null;
  onSave: (tags: string[], note: string) => void;
}) {
  const [tagInput, setTagInput] = useState("");
  const [note, setNote] = useState("");
  const [localTags, setLocalTags] = useState<string[]>([]);

  useMemo(() => {
    setLocalTags(entry?.tags ?? []);
    setNote(entry?.note ?? "");
  }, [entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!entry) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-5">
        <div className="text-sm font-semibold text-[#03002C]">Memory</div>
        <p className="mt-2 text-xs text-black/50">
          Select an image to view or edit its memory tags and direction notes. Memory feeds every
          AI generation and search for this brand.
        </p>
      </div>
    );
  }

  const editable = entry.source !== "builtin";

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-[#03002C]">Memory · {entry.source}</div>
        <div className="text-[10px] uppercase tracking-wider text-black/40">{entry.kind}</div>
      </div>
      <img src={entry.url} alt="" className="mt-3 aspect-[16/10] w-full rounded-lg object-cover" />
      {entry.prompt && (
        <p className="mt-3 line-clamp-4 rounded-md bg-black/5 p-2 text-[11px] text-black/70">
          {entry.prompt}
        </p>
      )}
      <div className="mt-3 text-[11px] uppercase tracking-wider text-black/50">Tags</div>
      <div className="mt-1 flex flex-wrap gap-1">
        {localTags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[10px]">
            {t}
            {editable && (
              <button
                onClick={() => setLocalTags(localTags.filter((x) => x !== t))}
                className="text-black/40 hover:text-red-600"
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {editable && (
        <>
          <div className="mt-2 flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagInput.trim()) {
                  setLocalTags([...new Set([...localTags, tagInput.trim()])]);
                  setTagInput("");
                }
              }}
              placeholder="Add tag…"
              className="flex-1 rounded border border-black/10 px-2 py-1 text-xs outline-none focus:border-[#003FC7]"
            />
          </div>
          <div className="mt-3 text-[11px] uppercase tracking-wider text-black/50">Note</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Direction note that flows into future generations for this brand…"
            className="mt-1 w-full resize-none rounded border border-black/10 px-2 py-1 text-xs outline-none focus:border-[#003FC7]"
          />
          <button
            onClick={() => onSave(localTags, note)}
            className="mt-3 rounded-full bg-[#03002C] px-3 py-1.5 text-xs text-white"
          >
            Save memory
          </button>
        </>
      )}
      {!editable && (
        <p className="mt-3 text-[11px] text-black/40">Built-in imagery memory is read-only.</p>
      )}
    </div>
  );
}

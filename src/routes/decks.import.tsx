import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useDeckStore } from "@/lib/deck-store";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";
import { importPowerpoint, type ParsedDeck } from "@/lib/pptx-import.functions";
import { mapParsedSlide, type MappedSlide } from "@/lib/pptx-mapping";
import {
  MODULE_VARIANTS,
  SECTION_FRAMEWORKS,
  variantsForSection,
  byId,
} from "@/lib/taxonomy";

export const Route = createFileRoute("/decks/import")({
  head: () => ({
    meta: [
      { title: "Import PowerPoint · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Upload an existing PowerPoint and reformat it into governed TransPerfect module variants.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: ImportView,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-red-600">Import failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

type Stage = "upload" | "parsing" | "review" | "creating" | "error";

function ImportView() {
  const navigate = useNavigate();
  const createImported = useDeckStore((s) => s.createImportedDeck);
  const parse = useServerFn(importPowerpoint);
  const { brandModes, narrativeArchetypes } = useTaxonomy();

  const [stage, setStage] = useState<Stage>("upload");
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedDeck | null>(null);
  const [mapping, setMapping] = useState<MappedSlide[]>([]);
  const [meta, setMeta] = useState({
    title: "",
    prospect: "",
    industry: "",
    brandModeId: brandModes[0]?.id ?? "bm-enterprise",
    archetypeId: narrativeArchetypes[0]?.id ?? "arch-problem-solution",
  });

  async function onFile(file: File) {
    setError(null);
    setStage("parsing");
    try {
      if (!/\.pptx$/i.test(file.name)) {
        throw new Error("Please upload a .pptx file (not .ppt or another format).");
      }
      if (file.size > 25 * 1024 * 1024) {
        throw new Error("File is larger than 25MB. Please slim it down or split it.");
      }
      const buf = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(buf);
      const result = await parse({ data: { filename: file.name, data: base64 } });
      const mapped = result.slides.map((s) => mapParsedSlide(s, result.slides.length));
      setParsed(result);
      setMapping(mapped);
      setMeta((m) => ({
        ...m,
        title: m.title || file.name.replace(/\.pptx$/i, ""),
        prospect: m.prospect || file.name.replace(/\.pptx$/i, "").split(/[-_ ]/)[0] || "Imported deck",
      }));
      setStage("review");
    } catch (e) {
      setError((e as Error).message);
      setStage("error");
    }
  }

  function updateSlideVariant(idx: number, variantId: string) {
    setMapping((m) =>
      m.map((row, i) => {
        if (i !== idx) return row;
        const v = byId(MODULE_VARIANTS, variantId);
        if (!v) return row;
        return { ...row, variantId: v.id, layoutId: v.permittedLayoutIds[0] };
      }),
    );
  }

  function createDeck() {
    if (!parsed || mapping.length === 0) return;
    setStage("creating");
    try {
      const { deckId } = createImported({
        title: meta.title || parsed.filename.replace(/\.pptx$/i, ""),
        brief: {
          prospect: meta.prospect || "Imported",
          industry: meta.industry || "—",
          meetingObjective: `Reformatted from ${parsed.filename}`,
          audience: "—",
          brandModeId: meta.brandModeId,
          archetypeId: meta.archetypeId,
          lengthTarget: mapping.length,
          clientFacts: `Imported from PowerPoint (${parsed.slideCount} slides).`,
        },
        slides: mapping.map((m) => ({
          sectionId: m.sectionId,
          variantId: m.variantId,
          layoutId: m.layoutId,
          content: m.content,
        })),
      });
      navigate({ to: "/decks/$deckId", params: { deckId } });
    } catch (e) {
      setError((e as Error).message);
      setStage("error");
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-black/50">Import</div>
            <h1 className="mt-3 text-4xl font-semibold">Reformat an existing PowerPoint.</h1>
            <p className="mt-3 max-w-2xl text-black/60">
              We extract titles, bullets, and speaker notes and re-author each slide onto the
              closest TransPerfect module variant. Original layout, fonts, and images are
              discarded — content only.
            </p>
          </div>
          <Link
            to="/"
            className="rounded-full border border-black/15 px-4 py-2 text-sm text-black/70 hover:bg-black/5"
          >
            ← Home
          </Link>
        </div>

        {stage === "upload" && <UploadCard onFile={onFile} />}

        {stage === "parsing" && (
          <div className="mt-10 rounded-2xl border border-black/10 bg-white p-10 text-center text-sm text-black/60">
            Parsing your deck…
          </div>
        )}

        {stage === "error" && (
          <div className="mt-10 rounded-2xl border border-red-300 bg-red-50 p-8">
            <div className="text-sm font-semibold text-red-900">Import failed</div>
            <div className="mt-2 text-sm text-red-900/80">{error}</div>
            <button
              onClick={() => {
                setStage("upload");
                setError(null);
              }}
              className="mt-4 rounded-full border border-red-400 bg-white px-4 py-2 text-sm text-red-900 hover:bg-red-100"
            >
              Try another file
            </button>
          </div>
        )}

        {stage === "review" && parsed && (
          <ReviewPanel
            parsed={parsed}
            mapping={mapping}
            meta={meta}
            setMeta={setMeta}
            onVariantChange={updateSlideVariant}
            onConfirm={createDeck}
            onReupload={() => {
              setStage("upload");
              setParsed(null);
              setMapping([]);
            }}
            brandModes={brandModes}
            archetypes={narrativeArchetypes}
          />
        )}

        {stage === "creating" && (
          <div className="mt-10 rounded-2xl border border-black/10 bg-white p-10 text-center text-sm text-black/60">
            Creating your deck…
          </div>
        )}
      </div>
    </AppShell>
  );
}

function UploadCard({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`mt-10 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 text-center transition ${
        dragging
          ? "border-[#003FC7] bg-[#003FC7]/5"
          : "border-black/15 bg-white hover:border-black/30"
      }`}
    >
      <div className="text-lg font-medium">Drop a .pptx here</div>
      <div className="mt-2 text-sm text-black/55">
        or click to select. Max 25MB. Content is parsed on our server; the original file is not
        stored.
      </div>
      <input
        type="file"
        accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <span className="mt-6 rounded-full bg-[#0B2A4A] px-6 py-2.5 text-sm font-medium text-white">
        Select file
      </span>
    </label>
  );
}

function ReviewPanel({
  parsed,
  mapping,
  meta,
  setMeta,
  onVariantChange,
  onConfirm,
  onReupload,
  brandModes,
  archetypes,
}: {
  parsed: ParsedDeck;
  mapping: MappedSlide[];
  meta: {
    title: string;
    prospect: string;
    industry: string;
    brandModeId: string;
    archetypeId: string;
  };
  setMeta: React.Dispatch<React.SetStateAction<typeof meta>>;
  onVariantChange: (idx: number, variantId: string) => void;
  onConfirm: () => void;
  onReupload: () => void;
  brandModes: ReturnType<typeof useTaxonomy>["brandModes"];
  archetypes: ReturnType<typeof useTaxonomy>["narrativeArchetypes"];
}) {
  return (
    <div className="mt-10 space-y-8">
      <div className="rounded-2xl border border-black/10 bg-white p-6">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-black/50">
              Source · {parsed.filename}
            </div>
            <div className="mt-1 text-lg font-semibold">
              {parsed.slideCount} slide{parsed.slideCount === 1 ? "" : "s"} extracted
            </div>
          </div>
          <button
            onClick={onReupload}
            className="text-sm text-black/60 hover:text-black"
          >
            Replace file
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextField
            label="Deck title"
            value={meta.title}
            onChange={(v) => setMeta((m) => ({ ...m, title: v }))}
          />
          <TextField
            label="Prospect / client"
            value={meta.prospect}
            onChange={(v) => setMeta((m) => ({ ...m, prospect: v }))}
          />
          <TextField
            label="Industry"
            value={meta.industry}
            onChange={(v) => setMeta((m) => ({ ...m, industry: v }))}
          />
          <SelectField
            label="Brand mode"
            value={meta.brandModeId}
            onChange={(v) => setMeta((m) => ({ ...m, brandModeId: v }))}
            options={brandModes.map((b) => ({ value: b.id, label: b.name }))}
          />
          <SelectField
            label="Narrative archetype"
            value={meta.archetypeId}
            onChange={(v) => setMeta((m) => ({ ...m, archetypeId: v }))}
            options={archetypes.map((a) => ({ value: a.id, label: a.name }))}
          />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Review the mapping</h2>
          <div className="text-xs text-black/50">
            Auto-mapped by our heuristics — override any row.
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="grid grid-cols-[3rem_1fr_1fr_14rem] gap-4 border-b border-black/10 bg-black/[0.02] px-4 py-3 text-[10px] uppercase tracking-widest text-black/50">
            <div>#</div>
            <div>Source content</div>
            <div>Section</div>
            <div>Variant</div>
          </div>
          {mapping.map((row, i) => {
            const section = byId(SECTION_FRAMEWORKS, row.sectionId);
            const options = variantsForSection(row.sectionId);
            const pool =
              options.some((o) => o.id === row.variantId) ? options : MODULE_VARIANTS;
            return (
              <div
                key={i}
                className="grid grid-cols-[3rem_1fr_1fr_14rem] items-start gap-4 border-b border-black/5 px-4 py-4 text-sm last:border-0"
              >
                <div className="pt-0.5 font-mono text-xs text-black/45">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div className="font-medium">{row.source.title || "(untitled)"}</div>
                  {row.source.bullets.length > 0 && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-black/60">
                      {row.source.bullets.slice(0, 4).map((b, k) => (
                        <li key={k}>{b}</li>
                      ))}
                      {row.source.bullets.length > 4 && (
                        <li className="list-none text-black/40">
                          + {row.source.bullets.length - 4} more…
                        </li>
                      )}
                    </ul>
                  )}
                  {row.source.notes && (
                    <div className="mt-1 text-[11px] italic text-black/45">
                      Notes: {row.source.notes.slice(0, 120)}
                      {row.source.notes.length > 120 ? "…" : ""}
                    </div>
                  )}
                </div>
                <div className="text-xs text-black/60">
                  <div className="font-medium text-black/80">{section?.name ?? row.sectionId}</div>
                  <div className="mt-1 text-[11px] text-black/45">{row.rationale}</div>
                </div>
                <select
                  value={row.variantId}
                  onChange={(e) => onVariantChange(i, e.target.value)}
                  className="w-full rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-xs focus:border-[#0B2A4A] focus:outline-none"
                >
                  {pool.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onReupload}
          className="rounded-full border border-black/15 px-5 py-2.5 text-sm text-black/70 hover:bg-black/5"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="rounded-full bg-[#003FC7] px-6 py-3 text-sm font-medium text-white hover:opacity-90"
        >
          Create deck →
        </button>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-black/55">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:border-[#0B2A4A] focus:outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-black/55">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm focus:border-[#0B2A4A] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as unknown as number[],
    );
  }
  return btoa(binary);
}

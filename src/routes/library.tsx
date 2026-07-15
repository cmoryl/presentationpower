import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ScaledSlide } from "@/components/slide/ScaledSlide";
import { VariantRenderer } from "@/components/slide/VariantRenderer";
import { seedContent, type Brief } from "@/lib/deck-store";
import { byId, type ModuleVariant } from "@/lib/taxonomy";
import { taxonomyQueryOptions, useTaxonomy } from "@/hooks/use-taxonomy";

const SAMPLE_BRIEF: Brief = {
  id: "preview",
  createdAt: new Date().toISOString(),
  prospect: "Acme Corp",
  industry: "Life sciences",
  meetingObjective: "Strategic partnership review",
  audience: "Executive team",
  brandModeId: "bm-corporate",
  archetypeId: "arch-problem-solution",
  lengthTarget: 12,
  clientFacts: "",
};

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library · TransPerfect Modular" },
      { name: "description", content: "Approved module variants ready to drop into a deck." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(taxonomyQueryOptions),
  component: Library,
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-red-600">Library failed to load: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
});

function Library() {
  const { brandModes, moduleFamilies, moduleVariants, sectionFrameworks } = useTaxonomy();
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<string>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return moduleVariants.filter((v) => {
      if (family !== "all" && v.familyId !== family) return false;
      if (!needle) return true;
      return (
        v.id.toLowerCase().includes(needle) ||
        v.name.toLowerCase().includes(needle) ||
        v.description.toLowerCase().includes(needle)
      );
    });
  }, [q, family, moduleVariants]);

  return (
    <AppShell>
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-black/50">Library</div>
        <h1 className="mt-3 text-4xl font-semibold">Approved module variants.</h1>
        <p className="mt-3 max-w-2xl text-black/60">
          Search and preview the modules the assembler pulls from. Now loaded live from the Cloud taxonomy.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search modules…"
          className="w-72 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
        />
        <select
          value={family}
          onChange={(e) => setFamily(e.target.value)}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All families</option>
          {moduleFamilies.map((mf) => (
            <option key={mf.id} value={mf.id}>{mf.id} · {mf.name}</option>
          ))}
        </select>
        <div className="ml-auto text-sm text-black/50">{filtered.length} of {moduleVariants.length}</div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6 xl:grid-cols-3">
        {filtered.map((v) => (
          <VariantCard
            key={v.id}
            variant={v}
            familyName={byId(moduleFamilies, v.familyId)?.name}
            brand={brandModes[0]}
            sectionId={sectionFrameworks.find((s) => s.permittedFamilyIds.includes(v.familyId))?.id ?? ""}
          />
        ))}
      </div>

      <div className="mt-10">
        <Link to="/brief/new" className="rounded-full bg-[#0B2A4A] px-5 py-2.5 text-sm text-white">
          Start a brief →
        </Link>
      </div>
    </AppShell>
  );
}

function VariantCard({
  variant,
  familyName,
  brand,
  sectionId,
}: {
  variant: ModuleVariant;
  familyName?: string;
  brand: ReturnType<typeof useTaxonomy>["brandModes"][number];
  sectionId: string;
}) {
  const previewSlide = {
    id: variant.id,
    position: 0,
    sectionId,
    variantId: variant.id,
    layoutId: variant.permittedLayoutIds[0],
    content: seedContent(variant.id, SAMPLE_BRIEF, "Preview section") as Record<string, unknown>,
    changes: [],
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="aspect-[16/9] bg-white">
        <ScaledSlide>
          <VariantRenderer slide={previewSlide} variant={variant} brand={brand} pageNumber={1} />
        </ScaledSlide>
      </div>
      <div className="border-t border-black/10 p-4">
        <div className="flex items-baseline justify-between">
          <div className="font-mono text-xs text-black/50">{variant.id}</div>
          <span className="rounded-full bg-[#0B2A4A]/10 px-2 py-0.5 font-mono text-[10px] text-[#0B2A4A]">
            {variant.familyId}
          </span>
        </div>
        <div className="mt-1 font-medium">{variant.name}</div>
        <div className="mt-1 text-sm text-black/60">{variant.description}</div>
        <div className="mt-3 text-xs text-black/50">
          <div>Family: {familyName}</div>
          <div>Layouts: {variant.permittedLayoutIds.join(", ")}</div>
          {variant.capacity.items && (
            <div>Items: {variant.capacity.items.min}–{variant.capacity.items.max}</div>
          )}
        </div>
      </div>
    </div>
  );
}

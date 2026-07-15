import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  const { brandModes, moduleFamilies, moduleVariants, layoutFrameworks, sectionFrameworks } = useTaxonomy();
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<string>("all");
  const [scopeBrandId, setScopeBrandId] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [brandIdx, setBrandIdx] = useState(0);

  const scopeBrand = scopeBrandId === "all" ? undefined : brandModes.find((b) => b.id === scopeBrandId);
  // Master TransPerfect brand is the default lockup for library previews.
  const tpMaster = brandModes.find((b) => b.id === "bm-enterprise") ?? brandModes[0];
  const restricted = new Set(scopeBrand?.contentScope?.restrictedFamilyIds ?? []);
  const preferred = new Set(scopeBrand?.contentScope?.preferredVariantIds ?? []);


  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matched = moduleVariants.filter((v) => {
      if (family !== "all" && v.familyId !== family) return false;
      if (scopeBrand && restricted.has(v.familyId)) return false;
      if (!needle) return true;
      return (
        v.id.toLowerCase().includes(needle) ||
        v.name.toLowerCase().includes(needle) ||
        v.description.toLowerCase().includes(needle)
      );
    });
    // Rank preferred variants first when a brand scope is chosen.
    if (!scopeBrand) return matched;
    return [...matched].sort((a, b) => {
      const ap = preferred.has(a.id) ? 0 : 1;
      const bp = preferred.has(b.id) ? 0 : 1;
      return ap - bp;
    });
  }, [q, family, moduleVariants, scopeBrand, restricted, preferred]);

  const active = openId ? moduleVariants.find((v) => v.id === openId) : null;

  return (
    <AppShell>
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-black/50">Library</div>
        <h1 className="mt-3 text-4xl font-semibold">Approved module variants.</h1>
        <p className="mt-3 max-w-2xl text-black/60">
          Search and preview the modules the assembler pulls from. Scope by brand to hide off-limits families and float the preferred variants for that identity.
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
        <select
          value={scopeBrandId}
          onChange={(e) => setScopeBrandId(e.target.value)}
          className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
          title="Filter to what's in-scope for a brand"
        >
          <option value="all">Any brand scope</option>
          {brandModes.map((b) => (
            <option key={b.id} value={b.id}>Scope: {b.name}</option>
          ))}
        </select>
        {scopeBrand && (
          <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/70">
            {preferred.size} preferred · {restricted.size} family restrictions
          </span>
        )}
        <div className="ml-auto text-sm text-black/50">{filtered.length} of {moduleVariants.length}</div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6 xl:grid-cols-3">
        {filtered.map((v) => (
          <VariantCard
            key={v.id}
            variant={v}
            familyName={byId(moduleFamilies, v.familyId)?.name}
            brand={scopeBrand ?? tpMaster}
            sectionId={sectionFrameworks.find((s) => s.permittedFamilyIds.includes(v.familyId))?.id ?? ""}
            preferred={preferred.has(v.id)}
            onOpen={() => setOpenId(v.id)}
          />
        ))}
      </div>

      <div className="mt-10">
        <Link to="/brief/new" className="rounded-full bg-[#0B2A4A] px-5 py-2.5 text-sm text-white">
          Start a brief →
        </Link>
      </div>

      {active && (
        <VariantDetailModal
          variant={active}
          brand={brandModes[Math.min(brandIdx, brandModes.length - 1)]}
          brands={brandModes}
          brandIdx={brandIdx}
          setBrandIdx={setBrandIdx}
          family={byId(moduleFamilies, active.familyId)}
          fallback={active.fallbackVariantId ? byId(moduleVariants, active.fallbackVariantId) : undefined}
          layouts={active.permittedLayoutIds
            .map((id) => byId(layoutFrameworks, id))
            .filter(Boolean) as ReturnType<typeof useTaxonomy>["layoutFrameworks"]}
          sections={sectionFrameworks.filter((s) => s.permittedFamilyIds.includes(active.familyId))}
          onClose={() => setOpenId(null)}
        />
      )}
    </AppShell>
  );
}

function VariantCard({
  variant,
  familyName,
  brand,
  sectionId,
  preferred,
  onOpen,
}: {
  variant: ModuleVariant;
  familyName?: string;
  brand: ReturnType<typeof useTaxonomy>["brandModes"][number];
  sectionId: string;
  preferred?: boolean;
  onOpen: () => void;
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
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full overflow-hidden rounded-2xl border border-black/10 bg-white text-left transition hover:border-[#0B2A4A]/40 hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] bg-white">
        <ScaledSlide>
          <VariantRenderer slide={previewSlide} variant={variant} brand={brand} pageNumber={1} />
        </ScaledSlide>
        <div className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
          View details ↗
        </div>
        {preferred && (
          <div className="absolute left-3 top-3 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white shadow">
            In scope
          </div>
        )}
      </div>
      <div className="border-t border-black/10 p-4">
        <div className="flex items-baseline justify-between">
          <div className="font-mono text-xs text-black/50">{variant.id}</div>
          <span className="rounded-full bg-[#0B2A4A]/10 px-2 py-0.5 font-mono text-[10px] text-[#0B2A4A]">
            {variant.familyId}
          </span>
        </div>
        <div className="mt-1 font-medium">{variant.name}</div>
        <div className="mt-1 line-clamp-2 text-sm text-black/60">{variant.description}</div>
        <div className="mt-3 text-xs text-black/50">
          <div>Family: {familyName}</div>
          <div>Layouts: {variant.permittedLayoutIds.join(", ")}</div>
          {variant.capacity.items && (
            <div>Items: {variant.capacity.items.min}–{variant.capacity.items.max}</div>
          )}
        </div>
      </div>
    </button>
  );
}

function VariantDetailModal({
  variant,
  brand,
  brands,
  brandIdx,
  setBrandIdx,
  family,
  fallback,
  layouts,
  sections,
  onClose,
}: {
  variant: ModuleVariant;
  brand: ReturnType<typeof useTaxonomy>["brandModes"][number];
  brands: ReturnType<typeof useTaxonomy>["brandModes"];
  brandIdx: number;
  setBrandIdx: (i: number) => void;
  family: ReturnType<typeof useTaxonomy>["moduleFamilies"][number] | undefined;
  fallback: ModuleVariant | undefined;
  layouts: ReturnType<typeof useTaxonomy>["layoutFrameworks"];
  sections: ReturnType<typeof useTaxonomy>["sectionFrameworks"];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const previewSlide = {
    id: variant.id,
    position: 0,
    sectionId: sections[0]?.id ?? "",
    variantId: variant.id,
    layoutId: variant.permittedLayoutIds[0],
    content: seedContent(variant.id, SAMPLE_BRIEF, sections[0]?.name ?? "Preview section") as Record<string, unknown>,
    changes: [],
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-6 w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-black/10 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-xs text-black/50">
              <span>{variant.id}</span>
              <span className="rounded-full bg-[#0B2A4A]/10 px-2 py-0.5 text-[10px] text-[#0B2A4A]">{variant.familyId}</span>
              {family && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                  family.reviewLevel === "strict" ? "bg-red-100 text-red-800" :
                  family.reviewLevel === "standard" ? "bg-amber-100 text-amber-800" :
                  "bg-emerald-100 text-emerald-800"
                }`}>
                  {family.reviewLevel} review
                </span>
              )}
            </div>
            <div className="mt-1 truncate text-xl font-semibold">{variant.name}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5"
          >
            Close ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* Large preview */}
          <div className="border-b border-black/10 bg-neutral-50 p-6 lg:border-b-0 lg:border-r">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-black/50">Preview</div>
              <select
                value={brandIdx}
                onChange={(e) => setBrandIdx(Number(e.target.value))}
                className="rounded-lg border border-black/15 bg-white px-2 py-1 text-xs"
              >
                {brands.map((b, i) => (
                  <option key={b.id} value={i}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
              <div className="aspect-[16/9]">
                <ScaledSlide>
                  <VariantRenderer slide={previewSlide} variant={variant} brand={brand} pageNumber={1} />
                </ScaledSlide>
              </div>
            </div>
            <p className="mt-4 text-sm text-black/60">{variant.description}</p>
          </div>

          {/* Specifics */}
          <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6 text-sm">
            <Spec label="Module family">
              <div className="font-mono text-xs text-black/50">{variant.familyId}</div>
              <div>{family?.name ?? "—"}</div>
              {family?.description && <div className="mt-1 text-black/60">{family.description}</div>}
            </Spec>

            <Spec label="Capacity">
              {variant.capacity.items && (
                <Row k="Items" v={`${variant.capacity.items.min}–${variant.capacity.items.max}`} />
              )}
              {variant.capacity.titleChars != null && (
                <Row k="Title max chars" v={String(variant.capacity.titleChars)} />
              )}
              {variant.capacity.bodyChars != null && (
                <Row k="Body max chars" v={String(variant.capacity.bodyChars)} />
              )}
              {!variant.capacity.items && variant.capacity.titleChars == null && variant.capacity.bodyChars == null && (
                <div className="text-black/50">No capacity rules.</div>
              )}
            </Spec>

            <Spec label={`Permitted layouts (${layouts.length})`}>
              <ul className="space-y-1.5">
                {layouts.map((lf) => (
                  <li key={lf.id} className="rounded-lg border border-black/10 bg-white px-3 py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-mono text-xs text-black/50">{lf.id}</div>
                      <div className="font-medium">{lf.name}</div>
                    </div>
                    <div className="mt-0.5 text-xs text-black/60">{lf.description}</div>
                    {lf.zones.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {lf.zones.map((z) => (
                          <span key={z} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-black/70">{z}</span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Spec>

            <Spec label={`Editable fields (${variant.editableFields.length})`}>
              <FieldChips fields={variant.editableFields} tone="emerald" />
            </Spec>

            <Spec label={`Locked fields (${variant.lockedFields.length})`}>
              {variant.lockedFields.length > 0 ? (
                <FieldChips fields={variant.lockedFields} tone="red" />
              ) : (
                <div className="text-black/50">None locked.</div>
              )}
            </Spec>

            <Spec label={`Used in section frameworks (${sections.length})`}>
              {sections.length > 0 ? (
                <ul className="space-y-1">
                  {sections.map((sf) => (
                    <li key={sf.id} className="flex items-baseline gap-2 text-xs">
                      <span className="font-mono text-black/50">{sf.id}</span>
                      <span>{sf.name}</span>
                    </li>
                  ))}
                </ul>
              ) : <div className="text-black/50">—</div>}
            </Spec>

            <Spec label="Smart fallback">
              {fallback ? (
                <div className="rounded-lg border border-black/10 bg-white px-3 py-2">
                  <div className="font-mono text-xs text-black/50">{fallback.id}</div>
                  <div className="font-medium">{fallback.name}</div>
                  <div className="mt-0.5 text-xs text-black/60">
                    Used when content exceeds capacity of {variant.id}.
                  </div>
                </div>
              ) : (
                <div className="text-black/50">No fallback declared.</div>
              )}
            </Spec>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-black/50">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-black/5 py-1 text-xs last:border-0">
      <span className="text-black/60">{k}</span>
      <span className="font-mono">{v}</span>
    </div>
  );
}

function FieldChips({ fields, tone }: { fields: string[]; tone: "emerald" | "red" }) {
  const cls = tone === "emerald"
    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : "bg-red-50 text-red-800 border-red-200";
  return (
    <div className="flex flex-wrap gap-1.5">
      {fields.map((f) => (
        <span key={f} className={`rounded border px-2 py-0.5 font-mono text-[10px] ${cls}`}>{f}</span>
      ))}
    </div>
  );
}


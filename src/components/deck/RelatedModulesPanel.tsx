import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  MODULE_FAMILIES,
  MODULE_VARIANTS,
  byId,
  relatedVariants,
  variantsForSection,
  type ModuleVariant,
} from "@/lib/taxonomy";

/**
 * Related-modules swap list with search + family (category) filtering.
 * With no query and no category it shows the ranked same-family list, exactly
 * as before. A query searches every module variant by name, description and
 * id; the category dropdown narrows to one module family. Search results
 * prefer variants permitted in the slide's section, then same family.
 */
export function RelatedModulesPanel({
  variant,
  sectionId,
  onSwap,
}: {
  variant: ModuleVariant;
  sectionId?: string;
  onSwap: (variantId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [familyId, setFamilyId] = useState<string>("all");

  const families = useMemo(
    () =>
      MODULE_FAMILIES.map((f) => ({
        ...f,
        count: MODULE_VARIANTS.filter((v) => v.familyId === f.id).length,
      })).filter((f) => f.count > 0),
    [],
  );

  const filtering = query.trim().length > 0 || familyId !== "all";

  const results = useMemo((): ModuleVariant[] => {
    if (!filtering) return relatedVariants(variant.id, sectionId, 5);

    const q = query.trim().toLowerCase();
    const sectionPool = sectionId
      ? new Set(variantsForSection(sectionId).map((v) => v.id))
      : null;

    return MODULE_VARIANTS.filter((v) => v.id !== variant.id)
      .filter((v) => (familyId === "all" ? true : v.familyId === familyId))
      .filter((v) =>
        q
          ? v.name.toLowerCase().includes(q) ||
            v.description.toLowerCase().includes(q) ||
            v.id.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => {
        const secA = sectionPool?.has(a.id) ? 1 : 0;
        const secB = sectionPool?.has(b.id) ? 1 : 0;
        if (secA !== secB) return secB - secA;
        const famA = a.familyId === variant.familyId ? 1 : 0;
        const famB = b.familyId === variant.familyId ? 1 : 0;
        if (famA !== famB) return famB - famA;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 25);
  }, [filtering, query, familyId, variant.id, variant.familyId, sectionId]);

  return (
    <div>
      <div className="mb-2 text-xs text-black/50">
        {filtering
          ? "Searching all modules — section-fit and same-family matches rank first."
          : "Same family — ranked by shared layouts, section fit, and fallback links."}
      </div>

      <div className="mb-2 flex gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/35" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules…"
            aria-label="Search modules"
            className="w-full rounded-lg border border-black/15 bg-white py-1.5 pl-7 pr-2 text-sm placeholder:text-black/35 focus:border-black/40 focus:outline-none"
          />
        </div>
        <select
          value={familyId}
          onChange={(e) => setFamilyId(e.target.value)}
          aria-label="Filter by module category"
          className="max-w-[45%] shrink-0 rounded-lg border border-black/15 bg-white px-2 py-1.5 text-xs text-black/70 focus:border-black/40 focus:outline-none"
        >
          <option value="all">All categories</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.count})
            </option>
          ))}
        </select>
      </div>

      <ul className="max-h-[320px] space-y-1.5 overflow-y-auto">
        {results.map((rv) => {
          const fam = byId(MODULE_FAMILIES, rv.familyId);
          return (
            <li key={rv.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate">{rv.name}</span>
                {filtering && fam && (
                  <span className="block truncate text-[10px] uppercase tracking-widest text-black/40">
                    {fam.name}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => onSwap(rv.id)}
                className="shrink-0 rounded-full border border-black/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-black/60 hover:border-black/40 hover:text-black"
                title={`Swap to ${rv.id}`}
              >
                Swap
              </button>
            </li>
          );
        })}
        {results.length === 0 && (
          <li className="text-sm text-black/50">
            {filtering
              ? "No modules match — try a different search or category."
              : "No sibling variants in this family."}
          </li>
        )}
      </ul>
      {filtering && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setFamilyId("all");
          }}
          className="mt-2 text-[11px] text-black/50 underline-offset-2 hover:text-black hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

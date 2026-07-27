import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BRAND_GUIDES, type BrandGuide, type BrandGuideCategory } from "@/lib/brand-guides";
import { BRAND_MODES } from "@/lib/taxonomy";

export const Route = createFileRoute("/knowledge/brand-guides/")({
  head: () => ({
    meta: [
      { title: "Brand Guides · Knowledge · TransPerfect" },
      {
        name: "description",
        content:
          "Digital brand guides for TransPerfect, its divisions, product lines and portfolio brands.",
      },
    ],
  }),
  component: BrandGuidesIndex,
});

type Bucket = "all" | BrandGuideCategory;

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "all", label: "All" },
  { id: "master", label: "Master" },
  { id: "division", label: "Divisions" },
  { id: "product", label: "Products & Technologies" },
  { id: "portfolio", label: "Portfolio" },
  { id: "cobrand", label: "Co-brand" },
];

function matchesQuery(g: BrandGuide, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (g.title.toLowerCase().includes(needle)) return true;
  if (g.subtitle.toLowerCase().includes(needle)) return true;
  if (g.tagline?.toLowerCase().includes(needle)) return true;
  for (const grp of g.subBrands ?? []) {
    if (grp.group.toLowerCase().includes(needle)) return true;
    if (grp.items.some((i) => i.toLowerCase().includes(needle))) return true;
  }
  return false;
}

function BrandGuidesIndex() {
  const [bucket, setBucket] = useState<Bucket>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<Bucket, number> = {
      all: BRAND_GUIDES.length,
      master: 0,
      division: 0,
      product: 0,
      portfolio: 0,
      cobrand: 0,
    };
    for (const g of BRAND_GUIDES) c[g.category]++;
    return c;
  }, []);

  const filtered = useMemo(
    () =>
      BRAND_GUIDES.filter((g) => (bucket === "all" ? true : g.category === bucket)).filter((g) =>
        matchesQuery(g, query.trim()),
      ),
    [bucket, query],
  );

  return (
    <AppShell>
      <div className="flex items-baseline justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/50">
            Knowledge · Brand Guides
          </div>
          <h1 className="mt-3 text-4xl font-semibold">Brand guides library</h1>
          <p className="mt-3 max-w-2xl text-black/60 dark:text-white/60">
            The master TransPerfect brand system, plus division, product and portfolio guides —
            sourced from BrandHUB intelligence and the master brand system.
          </p>
        </div>
        <Link
          to="/knowledge"
          className="rounded-full border border-black/15 px-4 py-2 text-sm text-black/70 hover:border-black/40 dark:border-white/15 dark:text-white/70 dark:hover:border-white/40"
        >
          ← All knowledge
        </Link>
      </div>

      {/* Filter row */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        {BUCKETS.map((b) => {
          const active = b.id === bucket;
          const n = counts[b.id];
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setBucket(b.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                active
                  ? "border-transparent bg-[#05041A] text-white dark:bg-white dark:text-[#03002C]"
                  : "border-black/15 text-black/70 hover:border-black/40 dark:border-white/15 dark:text-white/70 dark:hover:border-white/40"
              }`}
            >
              {b.label}
              <span
                className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                  active
                    ? "bg-white/20 text-white dark:bg-black/20 dark:text-[#03002C]"
                    : "bg-black/5 dark:bg-white/10"
                }`}
              >
                {n}
              </span>
            </button>
          );
        })}
        <div className="ml-auto">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guides, sub-brands…"
            className="w-64 rounded-full border border-black/15 bg-white px-4 py-1.5 text-xs outline-none placeholder:text-black/40 focus:border-black/40 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40 dark:focus:border-white/40"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((g) => {
          const division = BRAND_MODES.find((b) => b.id === g.divisionId);
          const swatch = g.primaryColors[0]?.hex ?? "#03002C";
          const eyebrow =
            g.category === "master"
              ? "Master brand"
              : g.category === "cobrand"
                ? "Co-brand"
                : g.category === "portfolio"
                  ? "Portfolio"
                  : g.category === "product"
                    ? "Product"
                    : (division?.name ?? "Division");
          return (
            <Link
              key={g.slug}
              to={"/knowledge/brand-guides/$slug" as never}
              params={{ slug: g.slug } as never}
              className="group relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6 transition hover:border-black/30 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/30"
            >
              <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: swatch }} />
              <div className="text-[11px] uppercase tracking-[0.25em]" style={{ color: swatch }}>
                {eyebrow}
              </div>
              <div className="mt-3 text-2xl font-semibold">{g.title}</div>
              <div className="text-sm text-black/60 dark:text-white/60">
                {g.subtitle} · v{g.version}
              </div>
              {g.tagline && (
                <div className="mt-4 italic text-black/70 dark:text-white/70">"{g.tagline}"</div>
              )}
              <div className="mt-5 flex items-center gap-2">
                {g.primaryColors
                  .slice(0, 2)
                  .concat(g.secondaryColors.slice(0, 2))
                  .map((c, i) => (
                    <span
                      key={`${c.hex}-${i}`}
                      className="h-6 w-6 rounded-full border border-black/10 dark:border-white/20"
                      style={{ background: c.hex }}
                      title={`${c.name} ${c.hex}`}
                    />
                  ))}
              </div>
              <div className="mt-6 text-xs text-black/40 group-hover:text-black/70 dark:text-white/40 dark:group-hover:text-white/70">
                Open guide →
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-black/20 p-8 text-sm text-black/50 dark:border-white/20 dark:text-white/50 md:col-span-2 xl:col-span-3">
            No guides match "{query}" in the {BUCKETS.find((b) => b.id === bucket)?.label} bucket.
          </div>
        )}

        {bucket === "all" && !query && (
          <div className="rounded-2xl border border-dashed border-black/20 bg-black/[0.02] p-6 text-sm text-black/50 dark:border-white/20 dark:bg-white/[0.02] dark:text-white/60">
            <div className="text-[11px] uppercase tracking-[0.25em]">Extend the system</div>
            <div className="mt-3 text-lg font-medium text-black/70 dark:text-white/80">
              Add a new guide
            </div>
            <p className="mt-2">
              Regional divisions and additional portfolio brands can each get a dedicated guide. Add
              an entry to <code>DIVISION_SEEDS</code> in <code>src/lib/brand-guides.ts</code> and it
              appears here.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
